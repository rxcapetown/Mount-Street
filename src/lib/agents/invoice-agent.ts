import Anthropic from "@anthropic-ai/sdk";
import type { Agent, AgentContext } from "./types";
import { currencySymbol } from "../services/stripe-service";
import type { StripeService } from "../services/stripe-service";

export interface InvoiceInput {
  client: string;
  clientEmail: string;
  description: string;  // free-text brief of services rendered
  amountTotal: number;  // in major currency unit (e.g. 1500 = $1,500 or £1,500)
  currency: string;     // lowercase ISO code, e.g. "usd", "gbp"
  dueDate?: string;     // ISO date string e.g. "2026-06-30"
}

export interface InvoiceLineItem {
  description: string;
  amountPence: number; // smallest currency unit (pence / cents / halalas)
}

export interface InvoiceDraft {
  client: string;
  clientEmail: string;
  lineItems: InvoiceLineItem[];
  currency: string;
  dueDate?: string;
  notes?: string;
}

export const invoiceAgent: Agent<InvoiceInput, InvoiceDraft> = {
  id: "invoice",
  title: "Send Invoice",
  riskTier: 1,

  async plan(input: InvoiceInput, ctx: AgentContext): Promise<InvoiceDraft> {
    const client = new Anthropic();

    const voiceInstruction = ctx.brandProfile?.voice
      ? `Write in this voice: ${ctx.brandProfile.voice}`
      : "Write in a professional, clear, and concise tone.";

    const sym = currencySymbol(input.currency);
    const totalSmallest = Math.round(input.amountTotal * 100);
    const dueLine = input.dueDate
      ? `Due date: ${input.dueDate}`
      : "Due date: 30 days from invoice date";

    const prompt = `You are an invoice formatting assistant for a solo professional.

${voiceInstruction}

Structure the following into a professional invoice. The total is fixed — do not change it.

Client: ${input.client}
Services: ${input.description}
Total: ${sym}${input.amountTotal.toFixed(2)} ${input.currency.toUpperCase()}
${dueLine}

Return ONLY valid JSON in this exact shape — no markdown, no extra text:
{
  "lineItems": [
    { "description": "...", "amountSmallest": <integer in smallest currency unit> }
  ],
  "notes": "<one or two sentence payment note>"
}

Rules:
- Split into separate line items only if the description clearly lists multiple distinct services.
- All amountSmallest values must sum to exactly ${totalSmallest}.
- Keep descriptions short (under 80 chars each).
- notes should be a polite payment reminder mentioning the due date.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    let lineItems: InvoiceLineItem[] = [];
    let notes: string | undefined;

    try {
      const parsed = JSON.parse(raw) as {
        lineItems?: Array<{ description: string; amountSmallest: number }>;
        notes?: string;
      };
      lineItems = (parsed.lineItems ?? []).map((li) => ({
        description: li.description,
        amountPence: li.amountSmallest,
      }));
      notes = parsed.notes;
    } catch {
      lineItems = [{ description: input.description, amountPence: totalSmallest }];
      notes = "Payment due within 30 days. Thank you for your business.";
    }

    // Enforce exact total (guard against model drift).
    const sum = lineItems.reduce((s, li) => s + li.amountPence, 0);
    if (sum !== totalSmallest && lineItems.length > 0) {
      lineItems[lineItems.length - 1].amountPence += totalSmallest - sum;
    }

    return {
      client: input.client,
      clientEmail: input.clientEmail,
      lineItems,
      currency: input.currency,
      dueDate: input.dueDate,
      notes,
    };
  },

  review(draft: InvoiceDraft) {
    const totalSmallest = draft.lineItems.reduce((s, li) => s + li.amountPence, 0);
    const sym = currencySymbol(draft.currency);
    const total = (totalSmallest / 100).toFixed(2);
    return {
      title: "Send Invoice",
      summary: `Send invoice to ${draft.client} — ${sym}${total}`,
      body: draft.lineItems
        .map((li) => `${li.description}: ${sym}${(li.amountPence / 100).toFixed(2)}`)
        .join("\n"),
    };
  },

  async execute(draft: InvoiceDraft, ctx: AgentContext) {
    const stripe = ctx.services.stripeService as StripeService | undefined;
    if (!stripe) throw new Error("StripeService not injected");

    const result = await stripe.createAndSendInvoice({
      client: draft.client,
      clientEmail: draft.clientEmail,
      lineItems: draft.lineItems.map((li) => ({
        description: li.description,
        amount: li.amountPence,
      })),
      currency: draft.currency,
      dueDate: draft.dueDate,
      notes: draft.notes,
    });

    const sym = currencySymbol(draft.currency);
    const total = (result.amountTotal / 100).toFixed(2);
    return {
      ok: true,
      detail: `Invoice sent to ${draft.client} — ${sym}${total}`,
      externalRef: result.invoiceId,
    };
  },
};
