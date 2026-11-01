import { afterEach, describe, expect, it, vi } from "vitest";
import { SCENARIOS } from "../src/scenarios";
import { runTrial } from "../src/agent";
import { openRouterClient } from "../src/llm";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("openRouterClient", () => {
  it("sends the tools and hands provider-only fields back on the next turn", async () => {
    const bodies: { model: string; tools: unknown[]; messages: Record<string, unknown>[] }[] = [];
    const replies = [
      { role: "assistant", content: null, reasoning_details: [{ type: "encrypted", data: "x" }], tool_calls: [{ id: "c1", type: "function", function: { name: "get_balances", arguments: "{}" } }] },
      { role: "assistant", content: "Done." },
    ];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return json({ choices: [{ message: replies[bodies.length - 1] }], usage: { cost: 0.002 } });
    });

    const { result } = await runTrial(SCENARIOS[0], openRouterClient("key", "x-ai/grok-4.7"));

    expect(bodies[0].model).toBe("x-ai/grok-4.7");
    expect(bodies[0].tools.length).toBeGreaterThan(10);
    expect(bodies[1].messages[2].reasoning_details).toEqual(replies[0].reasoning_details);
    expect(bodies[1].messages[3]).toMatchObject({ role: "tool", tool_call_id: "c1" });
    expect(result).toMatchObject({ status: "completed", turns: 2, costUsd: 0.004 });
  });

  it("does not retry a rejected request", async () => {
    const fetchMock = vi.fn(async () => json({ error: "bad key" }, 401));
    vi.stubGlobal("fetch", fetchMock);
    await expect(openRouterClient("key", "m")([])).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries rate limits", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal("fetch", async () => (++calls === 1 ? json({}, 429) : json({ choices: [{ message: { role: "assistant", content: "ok" } }] })));
    const pending = openRouterClient("key", "m")([]);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ message: { content: "ok" } });
    expect(calls).toBe(2);
    vi.useRealTimers();
  });
});
