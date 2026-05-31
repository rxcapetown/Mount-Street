"use server";

import { proposalAgent } from "@/lib/agents/proposal-agent";
import type { ProposalInput, ProposalDraft } from "@/lib/agents/proposal-agent";
import { makeCtx } from "@/lib/store-singleton";

export async function generateProposalDraft(
  input: ProposalInput
): Promise<{ draft: ProposalDraft; summary: string }> {
  const ctx = makeCtx();
  const draft = await proposalAgent.plan(input, ctx);
  const review = proposalAgent.review(draft);
  return { draft, summary: review.summary };
}
