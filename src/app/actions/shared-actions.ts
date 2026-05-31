"use server";

import { getAgent } from "@/lib/agents/registry";
import { approveAction, rejectAction } from "@/lib/agents/runner";
import { store, makeCtx, LOCAL_USER_ID } from "@/lib/store-singleton";
import type { PendingAction } from "@/lib/actions/pending-action";

export async function approveAnyAction(
  actionId: string
): Promise<{ ok: boolean; detail?: string }> {
  const action = await store.get(actionId);
  if (!action) throw new Error(`Action ${actionId} not found`);
  const agent = getAgent(action.agentId);
  if (!agent) throw new Error(`No agent registered for "${action.agentId}"`);
  const ctx = makeCtx();
  const result = await approveAction(agent, actionId, ctx, store);
  return { ok: result.ok, detail: result.detail };
}

export async function rejectAnyAction(actionId: string): Promise<void> {
  await rejectAction(actionId, store);
}

export async function listAllPendingActions(): Promise<PendingAction[]> {
  return store.list(LOCAL_USER_ID);
}
