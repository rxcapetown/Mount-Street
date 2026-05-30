import type { RiskTier } from "../agents/types";

// The lifecycle of any action that touches the outside world.
export type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export interface PendingAction {
  id: string;
  userId: string;
  agentId: string;
  riskTier: RiskTier;
  draft: unknown; // serialized Draft
  summary: string; // human-readable "what will happen"
  status: ActionStatus;
  createdAt: string; // ISO
  decidedAt?: string; // ISO — doubles as the audit trail
  executedAt?: string;
  result?: string;
}

// Storage is abstracted so the approval gate works BEFORE Supabase is wired.
// Swap InMemoryPendingActionStore for a Supabase-backed one later — nothing else changes.
export interface PendingActionStore {
  create(
    a: Omit<PendingAction, "id" | "status" | "createdAt">
  ): Promise<PendingAction>;
  get(id: string): Promise<PendingAction | null>;
  update(id: string, patch: Partial<PendingAction>): Promise<PendingAction>;
  list(userId: string, status?: ActionStatus): Promise<PendingAction[]>;
}
