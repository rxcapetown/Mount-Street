import { InMemoryPendingActionStore } from "./actions/memory-store";
import { FakeEmailSender } from "./services/email-sender";

// Module-level singletons — persist for the server process lifetime.
// Replace InMemoryPendingActionStore with Supabase in Phase 2.
export const store = new InMemoryPendingActionStore();
export const fakeEmailSender = new FakeEmailSender();

export const LOCAL_USER_ID = "local";

export function makeCtx() {
  return {
    userId: LOCAL_USER_ID,
    services: { emailSender: fakeEmailSender },
  };
}
