import { keccak256, stringToHex } from "viem";
import { SCENARIOS, SUITE_VERSION } from "./scenarios";
import { systemPrompt, TOOLS } from "./tools";

/** Commits to everything that decides a score, so a result can be tied to the exact tests behind it. */
export const SUITE_HASH = keccak256(stringToHex(JSON.stringify({ version: SUITE_VERSION, scenarios: SCENARIOS, tools: TOOLS, system: systemPrompt("{wallet}", "{policy}") })));
