import type { PendingAction } from "./actions/pending-action";
import type { AutonomyMode, RiskTier } from "./agents/types";

export interface MockTaskType {
  id: string;
  title: string;
  description: string;
  riskTier: RiskTier;
  iconName: "Mail" | "ClipboardList" | "FileText" | "MessageSquare";
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
    id: "proposal",
    title: "Proposal / SOW",
    description: "Turn a call or brief into a client-ready proposal or statement of work.",
    riskTier: 0,
    iconName: "ClipboardList",
  },
  {
    id: "invoice",
    title: "Send Invoice",
    description: "Generate and send a payment invoice directly to a client.",
    riskTier: 1,
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

export const MOCK_PENDING_ACTIONS: PendingAction[] = [];

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
    agentId: "proposal",
    title: "Proposal / SOW",
    riskTier: 0,
    autonomy: "draft_only",
    caps: { maxAmount: 0 },
  },
  {
    agentId: "invoice",
    title: "Send Invoice",
    riskTier: 1,
    autonomy: "ask_every_time",
    caps: { maxAmount: 0 },
  },
  {
    agentId: "reply-thread",
    title: "Reply to Thread",
    riskTier: 0,
    autonomy: "auto_within_limits",
    caps: { maxAmount: 0 },
  },
];
