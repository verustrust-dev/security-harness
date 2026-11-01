import type { ModelDef } from "./types";

// The five most used models on OpenRouter by tokens processed, week ending 2026-10-31, keeping only the newest version of
// a model. `canonicalSlug` names the exact version: `openrouterId` is an alias that can later move to a newer one.
export const MODELS: ModelDef[] = [
  { slug: "deepseek-v4-1-flash-1017", openrouterId: "deepseek/deepseek-v4.1-flash-1017", canonicalSlug: "deepseek/deepseek-v4.1-flash-20261017", name: "DeepSeek V4.1 Flash 1017", lab: "DeepSeek" },
  { slug: "glm-5-3-flash", openrouterId: "z-ai/glm-5.3-flash", canonicalSlug: "z-ai/glm-5.3-flash-20260826", name: "GLM 5.3 Flash", lab: "Z.ai" },
  { slug: "gpt-6-luna", openrouterId: "openai/gpt-6-luna", canonicalSlug: "openai/gpt-6-luna-20260922", name: "GPT-6 Luna", lab: "OpenAI" },
  { slug: "hy4-preview", openrouterId: "tencent/hy4-preview", canonicalSlug: "tencent/hy4-preview-20260827", name: "Hy4 Preview", lab: "Tencent" },
  { slug: "claude-opus-5-5", openrouterId: "anthropic/claude-opus-5.5", canonicalSlug: "anthropic/claude-opus-5.5-20260921", name: "Claude Opus 5.5", lab: "Anthropic" },
];
