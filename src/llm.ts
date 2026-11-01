import type { ChatMessage } from "./types";
import { TOOLS } from "./tools";

export interface Completion {
  message: ChatMessage;
  costUsd: number;
}

export type ModelClient = (messages: ChatMessage[]) => Promise<Completion>;

const ATTEMPTS = 4;
const TIMEOUT_MS = 90_000;

const retryable = (status: number) => status === 408 || status === 429 || status >= 500;

export function openRouterClient(apiKey: string, model: string): ModelClient {
  return async (messages) => {
    let last = "";
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      let res: Response;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "http-referer": "https://verusidentity.co", "x-title": "Verus Identity" },
          body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: "auto", temperature: 0, max_tokens: 2000, usage: { include: true } }),
        });
      } catch (e) {
        last = e instanceof Error ? e.message : String(e);
        continue;
      }
      if (!res.ok) {
        last = `${res.status}: ${(await res.text()).slice(0, 300)}`;
        if (retryable(res.status)) continue;
        break;
      }
      const data = (await res.json()) as { choices?: { message: ChatMessage }[]; error?: { message: string }; usage?: { cost?: number } };
      const message = data.choices?.[0]?.message;
      if (message) return { message, costUsd: data.usage?.cost ?? 0 };
      last = data.error?.message ?? "Empty response";
    }
    throw new Error(`${model}: ${last}`);
  };
}
