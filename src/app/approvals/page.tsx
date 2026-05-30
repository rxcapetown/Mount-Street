"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MOCK_PENDING_ACTIONS } from "@/lib/mock-data";
import type { PendingAction, ActionStatus } from "@/lib/actions/pending-action";

const AGENT_LABELS: Record<string, string> = {
  "email-sender": "Send Email",
  "social-post": "Post to LinkedIn",
  invoice: "Send Invoice",
  "reply-thread": "Reply to Thread",
};

function statusBadge(status: ActionStatus) {
  if (status === "pending")
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="muted" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  if (status === "executed")
    return <Badge variant="success">Executed</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

function formatDraft(draft: unknown): string {
  if (!draft || typeof draft !== "object") return "";
  const d = draft as Record<string, unknown>;
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const [actions, setActions] = useState<PendingAction[]>(MOCK_PENDING_ACTIONS);

  function decide(id: string, status: "approved" | "rejected") {
    setActions((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status, decidedAt: new Date().toISOString() }
          : a
      )
    );
  }

  const pending = actions.filter((a) => a.status === "pending");
  const decided = actions.filter((a) => a.status !== "pending");

  return (
    <div className="px-8 py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve queued actions before they are sent.
        </p>
      </div>

      {pending.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
          No pending actions — you&apos;re all caught up.
        </div>
      )}

      <div className="space-y-4">
        {pending.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onApprove={() => decide(action.id, "approved")}
            onReject={() => decide(action.id, "rejected")}
          />
        ))}
      </div>

      {decided.length > 0 && (
        <>
          <div className="mt-10 mb-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Decided
            </span>
            <Separator className="flex-1" />
          </div>
          <div className="space-y-4 opacity-70">
            {decided.map((action) => (
              <ActionCard key={action.id} action={action} decided />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActionCard({
  action,
  onApprove,
  onReject,
  decided = false,
}: {
  action: PendingAction;
  onApprove?: () => void;
  onReject?: () => void;
  decided?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">
              {AGENT_LABELS[action.agentId] ?? action.agentId}
            </span>
            <span className="text-xs text-muted-foreground">
              · {formatTime(action.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium leading-snug">
            {action.summary}
          </p>
        </div>
        {statusBadge(action.status)}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? "Hide draft ↑" : "Show draft ↓"}
      </button>

      {expanded && (
        <pre className="rounded-md bg-muted px-4 py-3 text-xs whitespace-pre-wrap font-mono text-foreground">
          {formatDraft(action.draft)}
        </pre>
      )}

      {!decided && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onApprove} className="flex-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="flex-1"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
