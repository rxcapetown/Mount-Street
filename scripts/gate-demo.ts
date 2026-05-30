// Proves the approval gate works — run with: npx tsx scripts/gate-demo.ts
// This uses a throwaway demo agent, NOT a real product agent. It exists only to
// show the contract holds: nothing sends without approval, Tier 2 never auto-runs.
import { InMemoryPendingActionStore } from "../src/lib/actions/memory-store";
import {
  runAgent,
  approveAction,
  executeApproved,
} from "../src/lib/agents/runner";
import type { Agent, AgentContext } from "../src/lib/agents/types";

type Input = { to: string; note: string };
type Draft = { to: string; body: string; amount?: number };

const demoAgent: Agent<Input, Draft> = {
  id: "demo.email",
  title: "Demo email",
  riskTier: 1,
  async plan(input) {
    return { to: input.to, body: `Hi — ${input.note}` };
  },
  review(draft) {
    return {
      title: "Send email",
      summary: `Send an email to ${draft.to}`,
      body: draft.body,
    };
  },
  async execute(draft) {
    return { ok: true, detail: `sent to ${draft.to}`, externalRef: "demo-123" };
  },
};

async function main() {
  const store = new InMemoryPendingActionStore();
  const ctx: AgentContext = { userId: "u1", services: {} };

  const res = await runAgent(
    demoAgent,
    { to: "a@b.com", note: "thanks!" },
    ctx,
    store,
    { mode: "ask_every_time" }
  );
  if (res.kind !== "pending") throw new Error("expected a pending action");
  console.log(`1) planned -> pending action ${res.action.id} (status: ${res.action.status})`);

  // Gate test: executing BEFORE approval must throw.
  try {
    await executeApproved(demoAgent, res.action.id, ctx, store);
    console.error("   FAIL: executed without approval!");
    process.exit(1);
  } catch (e) {
    console.log(`2) blocked unapproved execute  OK  -> ${(e as Error).message}`);
  }

  // Approve -> executes.
  const result = await approveAction(demoAgent, res.action.id, ctx, store);
  console.log(`3) approved + executed         OK  -> ${result.detail}`);

  // Tier 2 under auto mode must NEVER execute; it stays pending for a human.
  const tier2: Agent<Input, Draft> = { ...demoAgent, id: "demo.t2", riskTier: 2 };
  const r2 = await runAgent(
    tier2,
    { to: "x@y.com", note: "pay invoice" },
    ctx,
    store,
    { mode: "auto_within_limits", caps: { maxAmount: 1000 } }
  );
  const ok = r2.kind === "pending";
  console.log(`4) tier-2 under auto stayed '${r2.kind}'  ${ok ? "OK" : "FAIL"}  (must be 'pending')`);
  if (!ok) process.exit(1);

  console.log("\nAll gate checks passed. The contract holds.");
}

main();
