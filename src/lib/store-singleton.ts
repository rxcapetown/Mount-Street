import { InMemoryPendingActionStore } from "./actions/memory-store";
import { FakeEmailSender } from "./services/email-sender";
import { FakeStripeService } from "./services/stripe-service";
import { registerAgent } from "./agents/registry";
import { emailAgent } from "./agents/email-agent";
import { invoiceAgent } from "./agents/invoice-agent";

// Module-level singletons — persist for the server process lifetime.
// Replace InMemoryPendingActionStore with Supabase in Phase 2.
export const store = new InMemoryPendingActionStore();
export const fakeEmailSender = new FakeEmailSender();
export const fakeStripeService = new FakeStripeService();

// Register agents so the generic dispatcher (shared-actions) can look them up.
registerAgent(emailAgent);
registerAgent(invoiceAgent);

export const LOCAL_USER_ID = "local";

export function makeCtx() {
  return {
    userId: LOCAL_USER_ID,
    services: {
      emailSender: fakeEmailSender,
      stripeService: fakeStripeService,
    },
  };
}
