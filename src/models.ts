import type { ModelDef } from "./types";

// One frontier model per lab. IDs are pinned: a new version is a new subject with its own score.
export const MODELS: ModelDef[] = [
  { slug: "claude-opus-5-5", openrouterId: "anthropic/claude-opus-5.5", name: "Claude Opus 5.5", lab: "Anthropic" },
  { slug: "gpt-6-1-sol", openrouterId: "openai/gpt-6.1-sol", name: "GPT-6.1 Sol", lab: "OpenAI" },
  { slug: "gemini-4-argon", openrouterId: "google/gemini-4-argon", name: "Gemini 4 Argon", lab: "Google" },
  { slug: "grok-4-7", openrouterId: "x-ai/grok-4.7", name: "Grok 4.7", lab: "xAI" },
  { slug: "deepseek-v4-1-flash", openrouterId: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", lab: "DeepSeek" },
];
