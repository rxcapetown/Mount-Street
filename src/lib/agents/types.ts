// Mount Street — core agent contract.
// Every agent implements this ONE interface. Adding an agent = implementing this once.

export type RiskTier = 0 | 1 | 2;
// 0 = generate only (no external effect)
// 1 = reversible send (email, post, invoice) — requires approval
// 2 = money / irreversible (charge, ad spend, signed contract) — always explicit approval, never auto

export type AutonomyMode = "draft_only" | "ask_every_time" | "auto_within_limits";

export interface BrandProfile {
  company?: string;
  voice?: string;
  logoUrl?: string;
  colors?: Record<string, string>;
}

export interface AgentContext {
  userId: string;
  brandProfile?: BrandProfile;
  // Real services (email sender, Stripe client, etc.) are injected here at runtime,
  // behind interfaces, so agents never call external APIs directly.
  services: Record<string, unknown>;
}

// What the human sees on the Review screen before approving.
export interface ReviewView {
  title: string;
  summary: string; // human-readable "what will happen if you approve"
  body: string; // the draft content, editable before approval
  editableFields?: Record<string, string>;
}

export interface ExecuteResult {
  ok: boolean;
  detail?: string;
  externalRef?: string; // e.g. message id, invoice id
}

export interface Agent<Input, Draft> {
  id: string;
  title: string;
  riskTier: RiskTier;
  // Tier 0: produce an artifact/draft. NO side effects allowed here.
  plan(input: Input, ctx: AgentContext): Promise<Draft>;
  // Map a draft to what the human reviews.
  review(draft: Draft): ReviewView;
  // Side effects live ONLY here. Never called unless a PendingAction is approved.
  execute(draft: Draft, ctx: AgentContext): Promise<ExecuteResult>;
}
