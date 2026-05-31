"use server";

import { invoiceAgent } from "@/lib/agents/invoice-agent";
import type { InvoiceInput, InvoiceDraft } from "@/lib/agents/invoice-agent";
import { store, makeCtx, LOCAL_USER_ID } from "@/lib/store-singleton";

export async function generateInvoiceDraft(
  input: InvoiceInput
): Promise<{ draft: InvoiceDraft; summary: string }> {
  const ctx = makeCtx();
  const draft = await invoiceAgent.plan(input, ctx);
  const review = invoiceAgent.review(draft);
  return { draft, summary: review.summary };
}

export async function queueInvoiceAction(
  draft: InvoiceDraft
): Promise<{ actionId: string }> {
  const review = invoiceAgent.review(draft);
  const action = await store.create({
    userId: LOCAL_USER_ID,
    agentId: invoiceAgent.id,
    riskTier: invoiceAgent.riskTier,
    draft,
    summary: review.summary,
  });
  return { actionId: action.id };
}
