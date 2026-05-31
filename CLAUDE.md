# Mount Street — Product & Build Spec (v2)

This file is the source of truth for the project. Build against it. When context gets long, re-read this file rather than guessing.

## 1. Thesis & positioning

Mount Street is an AI copilot that runs a solo professional's back-office workflow — drafting, sending, billing, researching — where nothing that touches the outside world happens without the user's sign-off. It is the controlled, trustworthy alternative to fully autonomous "AI runs your company" tools (e.g. Polsia), which fail on trust: they take actions users never authorized.

Long-term vision: be good enough at each tool that a solo operator consolidates ~90% of their workflow onto Mount Street instead of paying for ten separate tools. Bundling is the destination, but it is earned — each anchor tool must be good enough that someone would have chosen it on its own. Breadth is a retention mechanic, not an excuse for mediocrity.

## 2. Who it's for (ICP)

Solo professional-services operators: independent consultants, fractional execs (CFO/CMO/COO), boutique 1-3 person agencies, and high-end freelancers — including generalists. They are heterogeneous, so the product stays flexible: users assemble the toolkit that fits their practice. They guard their reputation and client relationships, which is exactly why the human-in-the-loop control model is a requirement for them, not a nicety.

## 3. Tool architecture — two layers

Anchor agents (deep, used daily — these earn the relationship):
- Email / Inbox copilot — triage inbound, draft replies and follow-ups in the user's voice. (Draft = Tier 0; Send = Tier 1)
- Proposal / SOW + deck — turn a call/brief into a sendable proposal, SOW, or deck. (Generate = Tier 0; optional "send to lawyer for review" handoff = Tier 1)
- Invoicing & collections — create, send, and chase invoices; store them; export/share the batch to a CPA at tax time. (Create = Tier 0; Send = Tier 1; charge a card = Tier 2; CPA export/share = Tier 1)

Shelf agents (competent, used occasionally — breadth = retention):
- Research — research a topic, deliver a paper to email or store it in-app. (Generate/store = Tier 0; email delivery = Tier 1). Token-heavy → gated to the top plan.
- SDR / outbound — pull leads (manual CSV first; then Apollo, later Clay), research each, draft personalized sequences. (Research/draft = Tier 0; send = Tier 1)
- Notetaker integration — connect via API to where the user already keeps notes (Notion, Granola, Fireflies, Otter), pull action items, feed the proposal and follow-up agents. (Read/ingest = Tier 0)
- Content — draft LinkedIn/social posts in the user's voice. (Draft = Tier 0; post = Tier 1). Nice-to-have, demoted from anchor.
- Contract storage + lawyer handoff — store agreements, draft simple ones (NDA/SOW), route to a lawyer for review. Never gives legal opinions — drafts, stores, hands off only. (Store/draft = Tier 0; send to lawyer = Tier 1)

## 4. The core mechanism (already built — see src/lib)

Every tool runs through the same flow. This flow is the product.
1. User opens a task — from a Home card, or via the chatbot launcher.
2. Short guided form → the agent generates a draft (plan()). No external effect yet.
3. Lands on a Review screen (review()) showing exactly what happens if approved.
4. The gate decides what's next, by risk tier: Tier 0 = generate only, no external effect (use/save freely); Tier 1 = reversible send like email/post/invoice (queues in Approvals inbox, requires approval); Tier 2 = money/irreversible like charging a card (always explicit approval, never auto).
5. Autonomy dial per agent: draft_only / ask_every_time (default) / auto_within_limits. Auto applies only to Tier 1, inside hard caps the user sets. Tier 2 is never eligible for auto.
6. execute() is the ONLY place side effects happen, and only runs on an approved PendingAction (or the gated auto path). Enforced in src/lib/agents/runner.ts.

## 5. Two reusable patterns (build once, reuse everywhere)

- Approval gate — already built (PendingAction + runner.ts). Every external action flows through it; it doubles as the audit log.
- Outside-professional handoff — route an artifact to a second human (lawyer for contracts, CPA for invoices) for their sign-off before the final version goes out. Build once as a generic "send to {role} for review → wait → release" step; reuse for both lawyer and CPA.

## 6. Chatbot launcher

A pop-up AI chat that (a) answers "how do I use X in Mount Street," and (b) can open/launch a tool directly from the chat. Connective tissue — build it after there are working tools to launch into.

## 7. Integrations

Gmail (email send/draft), Stripe (invoices + payment links), Apollo then Clay (SDR leads), Notion/Granola/Fireflies/Otter (notetaker). Principle: integrate, don't reinvent — sit on top of where data already lives. Every integration should have a manual fallback (e.g. CSV paste for leads) so an agent can be built and tested before the connector exists.

## 8. Pricing & token-gating

- Starter ~$39/mo — 1-2 agents, capped runs.
- Growth ~$99/mo — all anchor agents, higher limits, Gmail + Stripe.
- Pro ~$249/mo — high volume, multiple inboxes/brands, priority, + token-heavy shelf tools (deep research, long-document work).
- Limited free trial, not open-ended freemium.
- Gate the heaviest (token-hungry) tools to the top tier — protects margin and drives the upsell.

## 9. Architecture (the keystone — already implemented)

The whole system rests on one interface and one gate, both already built:
- src/lib/agents/types.ts — Agent<Input, Draft> with plan/review/execute, RiskTier, AutonomyMode, AgentContext, BrandProfile.
- src/lib/agents/runner.ts — runAgent, executeApproved, approveAction, rejectAction. Enforces approval + Tier-2-never-auto.
- src/lib/agents/registry.ts — register/list/get agents.
- src/lib/actions/pending-action.ts — PendingAction, ActionStatus, PendingActionStore interface.
- src/lib/actions/memory-store.ts — InMemoryPendingActionStore (swap for Supabase in Phase 2).
- src/lib/db/schema.sql — Postgres schema (users, brand_profile, agent_configs, runs, pending_actions, integrations).

Adding a new agent = implementing the Agent interface once + registering it. That repeatability is what makes the breadth model affordable. plan() may call the Claude API to generate. Real external services (email sender, Stripe, Apollo) are injected via AgentContext.services behind interfaces — agents never call external APIs directly; only execute() does, through those injected services.

## 10. Build order & current state

Done: Phase 0 (contract, gate, schema, gate-demo verified) and the four UX shells (Home, Task flow + Review, Approvals inbox, Settings), now interactive after a "use client" hydration fix.
Current gap: no agent does real work yet — the Home cards are mock.
Next steps, in order:
1. Make the first agent real end-to-end: the Email/Inbox copilot. plan() drafts a reply via the Claude API; review() shows it; execute() sends it and only runs after approval. Stub the email sender behind an interface so the full draft→approve→send loop runs with a fake sender first.
2. Swap the mock "Post to LinkedIn" anchor for the Proposal/SOW agent; make it real (Tier 0).
3. Make Invoicing real (Stripe) + the CPA export/share handoff.
4. Add Research (token-gated) and SDR (CSV → Apollo).
5. Wire Supabase (persistence + email auth) replacing the in-memory store.
6. Notetaker integration; the lawyer handoff; the chatbot launcher; billing.

## 11. Build discipline (for Claude Code)

- Build one agent fully, then clone the pattern for the next — don't build several at once.
- After each milestone: stop, show the result, commit, then wait.
- execute() is the only place side effects live. Nothing bypasses the gate.
- Keep agents as small typed modules implementing the Agent interface.
- Diagnose runtime bugs from the dev server log / browser console — not by reading framework internals.
