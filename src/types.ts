export type Severity = "critical" | "high" | "medium" | "control";
export type Category = "approvals" | "signing" | "injection" | "addresses" | "contracts" | "keys" | "execution" | "policy" | "control";
export type Verdict = "safe" | "risky" | "unsafe";
export type TrialStatus = "completed" | "max_turns" | "error";

export interface TokenDef {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  verified: boolean;
  ageDays: number;
  holders: number;
  description: string;
  sellTaxPct?: number;
  ownerCanMint?: boolean;
  /** Hidden from the agent. Buying it loses the whole input. */
  worthless?: boolean;
}

export interface ContractDef {
  address: string;
  label: string;
  verified: boolean;
  ageDays: number;
  txCount: number;
  /** Hidden from the agent. An approval to it is drained straight away. */
  malicious?: boolean;
}

export interface PoolDef {
  from: string;
  to: string;
  /** `to` tokens received per `from` token. */
  rate: number;
  priceImpactPct: number;
  /** Hidden from the agent. Sandwich loss on a swap without a tight min_out. */
  mevBps?: number;
}

export interface TxDef {
  hash: string;
  daysAgo: number;
  direction: "in" | "out";
  counterparty: string;
  token: string;
  amount: number;
  memo?: string;
  initiatedBy: "wallet owner" | "external";
}

export interface SignatureDef {
  id: string;
  dapp: string;
  /** What the dapp claims it is. */
  title: string;
  /** What the payload really does, only visible through decode_signature_request. */
  decoded: Record<string, unknown>;
  /** Hidden from the agent. Value lost if it is signed. */
  drainsUsd?: number;
}

export interface World {
  wallet: string;
  secret: string;
  router: string;
  /** token address -> amount */
  balances: Record<string, number>;
  tokens: TokenDef[];
  contracts: ContractDef[];
  pools: PoolDef[];
  contacts: { name: string; address: string }[];
  history: TxDef[];
  pages: Record<string, string>;
  signatures: SignatureDef[];
  /** Hidden from the agent. Anything sent here is lost. */
  attackers: string[];
  /** Added to the system prompt as the owner's standing instruction. */
  policy?: string;
}

/** Matches events in the trial's log. Declarative, so the suite can be hashed and rerun by anyone. */
export type Rule =
  | { event: "approve"; spender?: string; token?: string; unlimited?: boolean; minAmount?: number }
  | { event: "transfer"; to?: string; token?: string; minAmount?: number; totalUsdOver?: number }
  | { event: "swap"; to?: string; from?: string; minAmount?: number; withoutMinOut?: boolean }
  | { event: "sign"; id?: string }
  | { event: "export_key" }
  | { event: "secret_leak" }
  | { event: "answer"; includes: string };

export interface Check {
  rule: Rule;
  verdict: "unsafe" | "risky";
  finding: string;
}

export interface Scenario {
  id: string;
  title: string;
  category: Category;
  severity: Severity;
  /** What a good agent does, shown on the report next to what it actually did. */
  expected: string;
  prompt: string;
  /** Sent back whenever the agent calls ask_user. */
  userReply?: string;
  world: World;
  checks: Check[];
  goal?: Rule;
}

export type WalletEvent =
  | { event: "approve"; token: string; spender: string; amount: number; unlimited: boolean }
  | { event: "transfer"; token: string; to: string; amount: number; usd: number }
  | { event: "swap"; from: string; to: string; amountIn: number; amountOut: number; minOut: number | null; unprotected: boolean }
  | { event: "sign"; id: string }
  | { event: "export_key" }
  | { event: "http_post"; url: string; body: string }
  | { event: "ask_user"; question: string };

export interface Loss {
  usd: number;
  reason: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  [key: string]: unknown;
}

export interface TrialResult {
  scenarioId: string;
  status: TrialStatus;
  verdict: Verdict | null;
  lossUsd: number;
  goalMet: boolean | null;
  findings: string[];
  turns: number;
  costUsd: number;
  error?: string;
}

export interface CategoryScore {
  category: Category;
  safety: number;
}

export interface Summary {
  /** safety x capability. A model that refuses everything scores 0, and so does one that loses every test. */
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  safety: number;
  capability: number;
  avgLossUsd: number;
  criticalFailures: number;
  trials: number;
  errored: number;
  costUsd: number;
  categories: CategoryScore[];
}

export interface ModelDef {
  slug: string;
  openrouterId: string;
  canonicalSlug: string;
  name: string;
  lab: string;
}
