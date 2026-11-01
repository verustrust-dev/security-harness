import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { runTrial } from "./agent";
import { openRouterClient, type ModelClient } from "./llm";
import { mockClient } from "./mock";
import { MODELS } from "./models";
import { SCENARIOS, SUITE_VERSION } from "./scenarios";
import { summarize } from "./scoring";
import { SUITE_HASH } from "./suite";
import type { Scenario, TrialResult } from "./types";

const USAGE = `Usage: npm run harness -- [options]

  --model <id>        OpenRouter model id, such as x-ai/grok-4.7. Repeat for several.
  --all               Run every model in src/models.ts
  --mock <kind>       Run a scripted agent: careful, reckless or refuser. Needs no API key.
  --scenario <id>     Run one scenario. Repeat for several. Default: all
  --repeats <n>       Runs per scenario. Default: 3
  --concurrency <n>   Trials at once. Default: 4
  --out <dir>         Where results are written. Default: results
  --list              List the scenarios and exit
  --help              Show this message

Real models need OPENROUTER_API_KEY in the environment, and calls are billed to that key.`;

const { values: opts } = parseArgs({
  options: {
    model: { type: "string", multiple: true },
    all: { type: "boolean" },
    mock: { type: "string" },
    scenario: { type: "string", multiple: true },
    repeats: { type: "string", default: "3" },
    concurrency: { type: "string", default: "4" },
    out: { type: "string", default: "results" },
    list: { type: "boolean" },
    help: { type: "boolean" },
  },
});

function fail(message: string): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

const positive = (value: string, name: string) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) fail(`--${name} must be a whole number above 0.`);
  return n;
};

function chooseScenarios(): Scenario[] {
  if (!opts.scenario) return SCENARIOS;
  const unknown = opts.scenario.filter((id) => !SCENARIOS.some((s) => s.id === id));
  if (unknown.length) fail(`Unknown scenario: ${unknown.join(", ")}. Run with --list to see them.`);
  return SCENARIOS.filter((s) => opts.scenario!.includes(s.id));
}

function chooseModels(): string[] {
  if (opts.mock) {
    if (!["careful", "reckless", "refuser"].includes(opts.mock)) fail(`Unknown mock: ${opts.mock}.`);
    return [`mock/${opts.mock}`];
  }
  const models = opts.all ? MODELS.map((m) => m.openrouterId) : (opts.model ?? []);
  if (!models.length) fail("Choose --model, --all or --mock.");
  if (!process.env.OPENROUTER_API_KEY) fail("OPENROUTER_API_KEY is not set.");
  return models;
}

const clientFor = (model: string, scenario: Scenario): ModelClient => (model.startsWith("mock/") ? mockClient(model, scenario) : openRouterClient(process.env.OPENROUTER_API_KEY!, model));

async function pool<T>(jobs: (() => Promise<T>)[], size: number) {
  const results: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await jobs[i]();
      }
    }),
  );
  return results;
}

async function evaluate(model: string, scenarios: Scenario[], repeats: number, concurrency: number, out: string) {
  const dir = join(out, model.replace(/[^a-z0-9.-]+/gi, "_"));
  mkdirSync(join(dir, "transcripts"), { recursive: true });
  const jobs = scenarios.flatMap((scenario) =>
    Array.from({ length: repeats }, (_, rep) => async () => {
      const { result, transcript } = await runTrial(scenario, clientFor(model, scenario));
      writeFileSync(join(dir, "transcripts", `${scenario.id}-${rep}.json`), JSON.stringify(transcript, null, 2));
      process.stdout.write(result.status === "error" ? "E" : result.verdict === "safe" ? "." : result.verdict === "risky" ? "r" : "X");
      return { ...result, rep };
    }),
  );
  console.log(`\n${model}: ${jobs.length} trials`);
  const trials = await pool(jobs, concurrency);
  const summary = summarize(trials);
  writeFileSync(join(dir, "report.json"), JSON.stringify({ suite: { version: SUITE_VERSION, hash: SUITE_HASH }, model, summary, trials }, null, 2));
  return { model, dir, summary, trials };
}

function print({ model, dir, summary, trials }: Awaited<ReturnType<typeof evaluate>>) {
  console.log(`\n\n${model}`);
  console.log(`  Score ${summary.score}, grade ${summary.grade}`);
  console.log(`  Safety ${summary.safety}%, capability ${summary.capability}%, ${summary.criticalFailures} critical failures`);
  console.log(`  Average loss per test $${summary.avgLossUsd}, cost $${summary.costUsd}`);
  if (summary.errored) console.log(`  ${summary.errored} trials hit provider errors and are left out of the score`);
  const failed = new Map<string, TrialResult[]>();
  for (const t of trials) if (t.verdict && t.verdict !== "safe") failed.set(t.scenarioId, [...(failed.get(t.scenarioId) ?? []), t]);
  for (const [id, runs] of failed) console.log(`  ${runs[0].verdict}: ${id} (${runs.length} of ${trials.filter((t) => t.scenarioId === id).length} runs)`);
  console.log(`  Report: ${join(dir, "report.json")}`);
}

if (opts.help) {
  console.log(USAGE);
} else if (opts.list) {
  for (const s of SCENARIOS) console.log(`${s.id.padEnd(30)} ${s.severity.padEnd(9)} ${s.title}`);
} else {
  const scenarios = chooseScenarios();
  const models = chooseModels();
  const repeats = positive(opts.repeats!, "repeats");
  const concurrency = positive(opts.concurrency!, "concurrency");
  console.log(`Suite ${SUITE_VERSION} (${SUITE_HASH})`);
  for (const model of models) print(await evaluate(model, scenarios, repeats, concurrency, opts.out!));
}
