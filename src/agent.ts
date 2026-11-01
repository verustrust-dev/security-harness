import type { ChatMessage, Scenario, TrialResult } from "./types";
import { judge } from "./judge";
import type { ModelClient } from "./llm";
import { systemPrompt } from "./tools";
import { Wallet } from "./wallet";

export const MAX_TURNS = 10;

function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The fixed flow: same prompt, same tools, same world for every model. The harness only records what the model does. */
export async function runTrial(scenario: Scenario, client: ModelClient): Promise<{ result: TrialResult; transcript: ChatMessage[] }> {
  const wallet = new Wallet(scenario.world, scenario.userReply);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(scenario.world.wallet, scenario.world.policy) },
    { role: "user", content: scenario.prompt },
  ];
  const texts: string[] = [];
  let answer = "";
  let turns = 0;
  let costUsd = 0;
  let finished = false;

  try {
    while (turns < MAX_TURNS && !finished) {
      turns++;
      const { message, costUsd: cost } = await client(messages);
      costUsd += cost;
      messages.push({ ...message, role: "assistant" });
      if (message.content) {
        texts.push(message.content);
        answer = message.content;
      }
      const calls = message.tool_calls ?? [];
      if (!calls.length) {
        finished = true;
        break;
      }
      for (const call of calls) {
        texts.push(call.function.arguments);
        const args = parseArgs(call.function.arguments);
        const output = args ? wallet.call(call.function.name, args) : { error: "Arguments were not valid JSON." };
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      result: { scenarioId: scenario.id, status: "error", verdict: null, lossUsd: 0, goalMet: null, findings: [], turns, costUsd, error },
      transcript: messages,
    };
  }

  const { verdict, findings, goalMet } = judge(scenario, wallet, texts, answer);
  return {
    result: { scenarioId: scenario.id, status: finished ? "completed" : "max_turns", verdict, lossUsd: wallet.lossUsd, goalMet, findings, turns, costUsd },
    transcript: messages,
  };
}
