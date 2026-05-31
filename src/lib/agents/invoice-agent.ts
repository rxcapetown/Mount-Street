import Anthropic from "@anthropic-ai/sdk";
import type { Agent, AgentContext } from "./types";
import type { StripeService } from "../services/stripe-service";

export interface InvoiceInput {
  client: string;
  clientEmail: string;
  description: string; // free-text brief of services rendered
  amountGBP: number;   // total in pounds (we store pence internally)
  dueDate?: string;    // ISO date string e.g. "2026-06-30"
}

export interface InvoiceLineItem {
  description: string;
  amountPence: number;
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

    const dueLine = input.dueDate
      ? `Due date: ${input.dueDate}`
      : "Due date: 30 days from invoice date";

    const totalPence = Math.round(input.amountGBP * 100);

    const prompt = `You are an invoice formatting assistant for a solo professional.

${voiceInstruction}

Structure the following into a professional invoice. The total is fixed — do not change it.

Client: ${input.client}
Services: ${input.description}
Total: £${input.amountGBP.toFixed(2)}
${dueLine}

Return ONLY valid JSON in this exact shape — no markdown, no extra text:
{
  "lineItems": [
    { "description": "...", "amountPence": <integer pence> }
  ],
  "notes": "<one or two sentence payment note>"
}

Rules:
- Split into separate line items only if the description clearly lists multiple distinct services.
- All amountPence values must sum to exactly ${totalPence}.
- Keep descriptions short (under 80 chars each).
- notes should be a polite payment reminder (due date, bank transfer or card).`;

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
        lineItems?: Array<{ description: string; amountPence: number }>;
        notes?: string;
      };
      lineItems = (parsed.lineItems ?? []).map((li) => ({
        description: li.description,
        amountPence: li.amountPence,
      }));
      notes = parsed.notes;
    } catch {
      // Fallback: single line item for the whole amount
      lineItems = [{ description: input.description, amountPence: totalPence }];
      notes = "Payment due within 30 days. Thank you for your business.";
    }

    // Enforce the total is exactly right (guard against model drift)
    const sum = lineItems.reduce((s, li) => s + li.amountPence, 0);
    if (sum !== totalPence && lineItems.length > 0) {
      lineItems[lineItems.length - 1].amountPence += totalPence - sum;
    }

    return {
      client: input.client,
      clientEmail: input.clientEmail,
      lineItems,
      currency: "gbp",
      dueDate: input.dueDate,
      notes,
    };
  },

  review(draft: InvoiceDraft) {
    const totalPence = draft.lineItems.reduce((s, li) => s + li.amountPence, 0);
    const totalGBP = (totalPence / 100).toFixed(2);
    return {
      title: "Send Invoice",
      summary: `Send invoice to ${draft.client} — £${totalGBP}`,
      body: draft.lineItems
        .map((li) => `${li.description}: £${(li.amountPence / 100).toFixed(2)}`)
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

    const totalGBP = (result.amountTotal / 100).toFixed(2);
    return {
      ok: true,
      detail: `Invoice sent to ${draft.client} — £${totalGBP}`,
      externalRef: result.invoiceId,
    };
  },
};
