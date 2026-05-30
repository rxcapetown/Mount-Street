import type { PendingAction } from "./actions/pending-action";
import type { AutonomyMode, RiskTier } from "./agents/types";

export interface MockTaskType {
  id: string;
  title: string;
  description: string;
  riskTier: RiskTier;
  iconName: "Mail" | "Share2" | "FileText" | "MessageSquare";
}

export const MOCK_TASK_TYPES: MockTaskType[] = [
  {
    id: "email-sender",
    title: "Send Email",
    description: "Draft and send a personalised email to a contact or list.",
    riskTier: 1,
    iconName: "Mail",
  },
  {
    id: "social-post",
    title: "Post to LinkedIn",
    description: "Compose and publish a LinkedIn update on your behalf.",
    riskTier: 1,
    iconName: "Share2",
  },
  {
    id: "invoice",
    title: "Send Invoice",
    description: "Generate and send a payment invoice directly to a client.",
    riskTier: 2,
    iconName: "FileText",
  },
  {
    id: "reply-thread",
    title: "Reply to Thread",
    description: "Draft a reply to an ongoing email or Slack thread.",
    riskTier: 0,
    iconName: "MessageSquare",
  },
];

export const MOCK_PENDING_ACTIONS: PendingAction[] = [
  {
    id: "pa-1",
    userId: "u1",
    agentId: "email-sender",
    riskTier: 1,
    draft: {
      to: "sarah@acme.com",
      subject: "Q3 performance summary",
      body: "Hi Sarah,\n\nPlease find attached the Q3 performance summary for your records. Revenue is up 14% vs last quarter.\n\nLet me know if you have any questions.\n\nBest,\nAlex",
    },
    summary: "Send email to sarah@acme.com — Q3 performance summary",
    status: "pending",
    createdAt: "2026-05-30T08:45:00Z",
  },
  {
    id: "pa-2",
    userId: "u1",
    agentId: "social-post",
    riskTier: 1,
    draft: {
      platform: "LinkedIn",
      message:
        "Excited to share that we've just crossed 1,000 customers! 🎉 Thank you to everyone who believed in us from day one. Onward.",
    },
    summary: "Post LinkedIn update — milestone announcement",
    status: "pending",
    createdAt: "2026-05-30T09:10:00Z",
  },
  {
    id: "pa-3",
    userId: "u1",
    agentId: "invoice",
    riskTier: 2,
    draft: {
      client: "Pinnacle Corp",
      amount: 4500,
      description: "Strategy consulting — May 2026 retainer",
    },
    summary: "Send invoice to Pinnacle Corp — £4,500",
    status: "pending",
    createdAt: "2026-05-30T10:00:00Z",
  },
];

export interface AgentConfig {
  agentId: string;
  title: string;
  riskTier: RiskTier;
  autonomy: AutonomyMode;
  caps: { maxAmount: number };
}

export const MOCK_AGENT_CONFIGS: AgentConfig[] = [
  {
    agentId: "email-sender",
    title: "Send Email",
    riskTier: 1,
    autonomy: "ask_every_time",
    caps: { maxAmount: 0 },
  },
  {
    agentId: "social-post",
    title: "Post to LinkedIn",
    riskTier: 1,
    autonomy: "ask_every_time",
    caps: { maxAmount: 0 },
  },
  {
    agentId: "invoice",
    title: "Send Invoice",
    riskTier: 2,
    autonomy: "draft_only",
    caps: { maxAmount: 500 },
  },
  {
    agentId: "reply-thread",
    title: "Reply to Thread",
    riskTier: 0,
    autonomy: "auto_within_limits",
    caps: { maxAmount: 0 },
  },
];
