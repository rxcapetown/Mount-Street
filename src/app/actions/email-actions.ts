"use server";

import { emailAgent } from "@/lib/agents/email-agent";
import type { EmailInput, EmailDraft } from "@/lib/agents/email-agent";
import { approveAction, rejectAction } from "@/lib/agents/runner";
import { store, makeCtx, LOCAL_USER_ID } from "@/lib/store-singleton";
import type { PendingAction } from "@/lib/actions/pending-action";

export async function generateEmailDraft(
  input: EmailInput
): Promise<{ draft: EmailDraft; summary: string }> {
  const ctx = makeCtx();
  const draft = await emailAgent.plan(input, ctx);
  const review = emailAgent.review(draft);
  return { draft, summary: review.summary };
}

export async function queueEmailAction(
  draft: EmailDraft
): Promise<{ actionId: string }> {
  const review = emailAgent.review(draft);
  const action = await store.create({
    userId: LOCAL_USER_ID,
    agentId: emailAgent.id,
    riskTier: emailAgent.riskTier,
    draft,
    summary: review.summary,
  });
  return { actionId: action.id };
}

export async function approveEmailAction(
  actionId: string
): Promise<{ ok: boolean; detail?: string }> {
  const ctx = makeCtx();
  const result = await approveAction(emailAgent, actionId, ctx, store);
  return { ok: result.ok, detail: result.detail };
}

export async function rejectEmailAction(actionId: string): Promise<void> {
  await rejectAction(actionId, store);
}

export async function listAllPendingActions(): Promise<PendingAction[]> {
  return store.list(LOCAL_USER_ID);
}
