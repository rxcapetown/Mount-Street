import Anthropic from "@anthropic-ai/sdk";
import type { Agent, AgentContext } from "./types";
import type { EmailSender } from "../services/email-sender";

export interface EmailInput {
  to: string;
  recipientName?: string;
  intent: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export const emailAgent: Agent<EmailInput, EmailDraft> = {
  id: "email-sender",
  title: "Send Email",
  riskTier: 1,

  async plan(input: EmailInput, ctx: AgentContext): Promise<EmailDraft> {
    const client = new Anthropic();

    const voiceInstruction = ctx.brandProfile?.voice
      ? `Write in this voice and style: ${ctx.brandProfile.voice}`
      : "Write in a professional, warm, and concise tone.";

    const companyLine = ctx.brandProfile?.company
      ? `The sender works for: ${ctx.brandProfile.company}.`
      : "";

    const recipientLine = input.recipientName
      ? `${input.recipientName} (${input.to})`
      : input.to;

    const prompt = `You are an email drafting assistant for a solo professional.

${voiceInstruction}
${companyLine}

Draft a professional email:
- Recipient: ${recipientLine}
- What to communicate: ${input.intent}

Reply with EXACTLY this format and nothing else:
SUBJECT: <subject line>
---
<email body>

Write the body as a complete, ready-to-send email. Use the recipient's name if provided. No placeholders. No signature block needed.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    const subjectMatch = text.match(/^SUBJECT:\s*(.+)$/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : "Following up";

    const sep = text.indexOf("\n---\n");
    const body = sep !== -1 ? text.slice(sep + 5).trim() : text;

    return { to: input.to, subject, body };
  },

  review(draft: EmailDraft) {
    return {
      title: "Send Email",
      summary: `Send email to ${draft.to} — "${draft.subject}"`,
      body: draft.body,
      editableFields: { to: draft.to, subject: draft.subject, body: draft.body },
    };
  },

  async execute(draft: EmailDraft, ctx: AgentContext) {
    const sender = ctx.services.emailSender as EmailSender | undefined;
    if (!sender) throw new Error("EmailSender service not injected");

    const { messageId } = await sender.send({
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
    });

    return {
      ok: true,
      detail: `Email sent to ${draft.to}`,
      externalRef: messageId,
    };
  },
};
