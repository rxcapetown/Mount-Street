import Anthropic from "@anthropic-ai/sdk";
import type { Agent, AgentContext } from "./types";

export interface ProposalInput {
  client: string;
  projectName: string;
  scope: string;
  roughPrice?: string;
}

export interface ProposalDraft {
  client: string;
  projectName: string;
  content: string; // full proposal/SOW as markdown
}

export const proposalAgent: Agent<ProposalInput, ProposalDraft> = {
  id: "proposal",
  title: "Proposal / SOW",
  riskTier: 0,

  async plan(input: ProposalInput, ctx: AgentContext): Promise<ProposalDraft> {
    const client = new Anthropic();

    const voiceInstruction = ctx.brandProfile?.voice
      ? `Write in this voice and style: ${ctx.brandProfile.voice}`
      : "Write in a professional, confident, and clear tone.";

    const companyLine = ctx.brandProfile?.company
      ? `Consultant / agency: ${ctx.brandProfile.company}.`
      : "";

    const priceLine = input.roughPrice
      ? `Investment: ${input.roughPrice}`
      : "";

    const prompt = `You are a proposal writing assistant for a solo professional consultant or agency.

${voiceInstruction}
${companyLine}

Draft a professional, client-ready Proposal / Statement of Work:
- Client: ${input.client}
- Project: ${input.projectName}
- Scope / deliverables: ${input.scope}
${priceLine}

Format in clean plain text with these sections, using simple headers (no markdown symbols):

OVERVIEW
One paragraph — context and objective.

SCOPE OF WORK
Bulleted deliverables, clearly defined. No vague language.

TIMELINE
Realistic phase breakdown with approximate durations.

INVESTMENT
Fee summary. Use the figure provided, or write "Fee: [TBD]" if not given.

TERMS
Three concise standard terms: payment schedule, revision rounds, IP transfer on full payment.

NEXT STEPS
One-sentence call to action.

Keep it concise — no filler, no marketing language. Write as if this goes directly to the client today.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return { client: input.client, projectName: input.projectName, content };
  },

  review(draft: ProposalDraft) {
    return {
      title: "Proposal / SOW",
      summary: `Proposal for ${draft.client} — ${draft.projectName}`,
      body: draft.content,
    };
  },

  async execute(_draft: ProposalDraft, _ctx: AgentContext) {
    // Tier 0 — execute is never called.
    return { ok: true, detail: "Tier 0: generate only, no external action." };
  },
};
