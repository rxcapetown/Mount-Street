import Stripe from "stripe";

// ─── Currency catalogue ────────────────────────────────────────────────────────

export const CURRENCIES = [
  { code: "usd", label: "USD — US Dollar",      symbol: "$"    },
  { code: "eur", label: "EUR — Euro",            symbol: "€"    },
  { code: "gbp", label: "GBP — British Pound",   symbol: "£"    },
  { code: "sar", label: "SAR — Saudi Riyal",     symbol: "SAR " },
  { code: "aed", label: "AED — UAE Dirham",      symbol: "AED " },
  { code: "qar", label: "QAR — Qatari Riyal",    symbol: "QAR " },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function currencySymbol(currency: string): string {
  return (
    CURRENCIES.find((c) => c.code === currency.toLowerCase())?.symbol ??
    currency.toUpperCase() + " "
  );
}

// ─── Service interface ─────────────────────────────────────────────────────────

export interface StripeLineItem {
  description: string;
  amount: number; // smallest currency unit (pence / cents)
}

export interface StripeInvoicePayload {
  client: string;
  clientEmail: string;
  lineItems: StripeLineItem[];
  currency: string; // lowercase ISO code, e.g. "usd"
  dueDate?: string; // ISO date string
  notes?: string;
}

export interface StripeInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
  amountTotal: number; // smallest currency unit
}

export interface StripeService {
  createAndSendInvoice(payload: StripeInvoicePayload): Promise<StripeInvoiceResult>;
}

// ─── Real implementation ───────────────────────────────────────────────────────

export class RealStripeService implements StripeService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createAndSendInvoice(
    payload: StripeInvoicePayload
  ): Promise<StripeInvoiceResult> {
    // 1. Create a one-off customer for this invoice.
    const customer = await this.stripe.customers.create({
      name: payload.client,
      email: payload.clientEmail,
    });

    // 2. Add each line item to the upcoming invoice.
    for (const item of payload.lineItems) {
      await this.stripe.invoiceItems.create({
        customer: customer.id,
        description: item.description,
        amount: item.amount,
        currency: payload.currency,
      });
    }

    // 3. Compute days until due (Stripe requires a positive integer).
    let daysUntilDue = 30;
    if (payload.dueDate) {
      const days = Math.ceil(
        (new Date(payload.dueDate).getTime() - Date.now()) / 86_400_000
      );
      daysUntilDue = Math.max(1, days);
    }

    // 4. Create the invoice in draft state.
    const draft = await this.stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: daysUntilDue,
      ...(payload.notes ? { footer: payload.notes } : {}),
    });

    // 5. Finalize (locks amounts) then send the email.
    const finalized = await this.stripe.invoices.finalizeInvoice(draft.id);
    await this.stripe.invoices.sendInvoice(finalized.id);

    return {
      invoiceId: finalized.id,
      invoiceUrl:
        finalized.hosted_invoice_url ??
        `https://dashboard.stripe.com/invoices/${finalized.id}`,
      amountTotal: finalized.amount_due,
    };
  }
}

// ─── Fake implementation (no Stripe key required) ─────────────────────────────

export class FakeStripeService implements StripeService {
  private sent: Array<{
    sentAt: string;
    invoiceId: string;
    payload: StripeInvoicePayload;
  }> = [];

  async createAndSendInvoice(
    payload: StripeInvoicePayload
  ): Promise<StripeInvoiceResult> {
    const invoiceId = `inv_fake_${Date.now()}`;
    const amountTotal = payload.lineItems.reduce((s, i) => s + i.amount, 0);
    this.sent.push({ sentAt: new Date().toISOString(), invoiceId, payload });
    const sym = currencySymbol(payload.currency);
    console.log(
      `[FakeStripeService] ✉ Invoice ${invoiceId} → ${payload.client} <${payload.clientEmail}> | Total: ${sym}${(amountTotal / 100).toFixed(2)}`
    );
    return {
      invoiceId,
      invoiceUrl: `https://fake-stripe.example/i/${invoiceId}`,
      amountTotal,
    };
  }

  getSent() {
    return [...this.sent];
  }
}
