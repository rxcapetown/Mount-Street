export interface StripeLineItem {
  description: string;
  amount: number; // in pence / cents
}

export interface StripeInvoicePayload {
  client: string;
  clientEmail: string;
  lineItems: StripeLineItem[];
  currency: string; // e.g. "gbp"
  dueDate?: string; // ISO date string
  notes?: string;
}

export interface StripeInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
  amountTotal: number; // in pence / cents
}

export interface StripeService {
  createAndSendInvoice(payload: StripeInvoicePayload): Promise<StripeInvoiceResult>;
}

export class FakeStripeService implements StripeService {
  private sent: Array<{ sentAt: string; invoiceId: string; payload: StripeInvoicePayload }> = [];

  async createAndSendInvoice(
    payload: StripeInvoicePayload
  ): Promise<StripeInvoiceResult> {
    const invoiceId = `inv_fake_${Date.now()}`;
    const amountTotal = payload.lineItems.reduce((s, i) => s + i.amount, 0);
    this.sent.push({ sentAt: new Date().toISOString(), invoiceId, payload });
    console.log(
      `[FakeStripeService] ✉ Invoice ${invoiceId} → ${payload.client} <${payload.clientEmail}> | Total: ${(amountTotal / 100).toFixed(2)} ${payload.currency.toUpperCase()}`
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
