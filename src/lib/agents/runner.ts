import type {
  Agent,
  AgentContext,
  AutonomyMode,
  ExecuteResult,
  ReviewView,
} from "./types";
import type { PendingAction, PendingActionStore } from "../actions/pending-action";

export interface AutonomyConfig {
  mode: AutonomyMode;
  // Hard caps for auto_within_limits, interpreted per-agent (e.g. { maxAmount: 500 }).
  caps?: Record<string, number>;
}

export type RunResult<Draft> =
  | { kind: "artifact"; draft: Draft; review: ReviewView }
  | { kind: "pending"; action: PendingAction; review: ReviewView }
  | { kind: "executed"; action: PendingAction; result: ExecuteResult };

/**
 * STEP 1 — plan, then decide what happens next.
 *  - Tier 0 (or draft_only mode): return the draft. Nothing to approve, nothing sent.
 *  - Tier >= 1: create a PendingAction. Auto-execute ONLY if mode is auto_within_limits
 *    AND tier < 2 AND within caps. Otherwise it waits for human approval.
 */
export async function runAgent<Input, Draft>(
  agent: Agent<Input, Draft>,
  input: Input,
  ctx: AgentContext,
  store: PendingActionStore,
  autonomy: AutonomyConfig
): Promise<RunResult<Draft>> {
  const draft = await agent.plan(input, ctx);
  const review = agent.review(draft);

  // Pure generation, or an agent the user has set to never send.
  if (agent.riskTier === 0 || autonomy.mode === "draft_only") {
    return { kind: "artifact", draft, review };
  }

  const action = await store.create({
    userId: ctx.userId,
    agentId: agent.id,
    riskTier: agent.riskTier,
    draft,
    summary: review.summary,
  });

  const canAuto =
    autonomy.mode === "auto_within_limits" &&
    agent.riskTier < 2 && // Tier 2 is NEVER eligible for auto.
    withinCaps(draft, autonomy.caps);

  if (canAuto) {
    const result = await executeApproved(agent, action.id, ctx, store, true);
    const executed = await store.get(action.id);
    return { kind: "executed", action: executed ?? action, result };
  }

  return { kind: "pending", action, review };
}

/**
 * STEP 2 — the ONLY path to side effects.
 * Refuses to run unless the action is 'approved' (set by an explicit human decision),
 * except the auto path (system=true), which the caller restricts to tier < 2.
 */
export async function executeApproved<Input, Draft>(
  agent: Agent<Input, Draft>,
  actionId: string,
  ctx: AgentContext,
  store: PendingActionStore,
  system = false
): Promise<ExecuteResult> {
  const action = await store.get(actionId);
  if (!action) throw new Error(`PendingAction ${actionId} not found`);

  if (!system && action.status !== "approved") {
    throw new Error(
      `Refusing to execute: action ${actionId} is '${action.status}', not 'approved'.`
    );
  }
  if (system && agent.riskTier >= 2) {
    throw new Error("Tier 2 actions can never run automatically.");
  }

  try {
    const result = await agent.execute(action.draft as Draft, ctx);
    await store.update(actionId, {
      status: result.ok ? "executed" : "failed",
      executedAt: new Date().toISOString(),
      result: result.detail,
    });
    return result;
  } catch (e) {
    await store.update(actionId, { status: "failed", result: String(e) });
    throw e;
  }
}

/** Human presses Approve -> mark approved (audit timestamp), then execute. */
export async function approveAction<Input, Draft>(
  agent: Agent<Input, Draft>,
  actionId: string,
  ctx: AgentContext,
  store: PendingActionStore
): Promise<ExecuteResult> {
  await store.update(actionId, {
    status: "approved",
    decidedAt: new Date().toISOString(),
  });
  return executeApproved(agent, actionId, ctx, store);
}

/** Human presses Reject -> record it, never executes. */
export async function rejectAction(
  actionId: string,
  store: PendingActionStore
): Promise<void> {
  await store.update(actionId, {
    status: "rejected",
    decidedAt: new Date().toISOString(),
  });
}

function withinCaps(draft: unknown, caps?: Record<string, number>): boolean {
  if (!caps) return false; // No caps configured = not allowed to auto. Conservative by design.
  const amount = (draft as { amount?: number })?.amount;
  if (typeof caps.maxAmount === "number") {
    if (typeof amount !== "number") return false;
    return amount <= caps.maxAmount;
  }
  return false;
}
