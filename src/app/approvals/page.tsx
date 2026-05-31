"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  listAllPendingActions,
  approveAnyAction,
  rejectAnyAction,
} from "@/app/actions/shared-actions";
import type { PendingAction, ActionStatus } from "@/lib/actions/pending-action";
import type { InvoiceLineItem } from "@/lib/agents/invoice-agent";
import { currencySymbol } from "@/lib/services/stripe-service";

const AGENT_LABELS: Record<string, string> = {
  "email-sender": "Send Email",
  proposal: "Proposal / SOW",
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
  if (status === "executed") return <Badge variant="success">Executed</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await listAllPendingActions();
    data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setActions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleApprove(action: PendingAction) {
    setDeciding(action.id);
    try {
      await approveAnyAction(action.id);
    } finally {
      setDeciding(null);
      await refresh();
    }
  }

  async function handleReject(action: PendingAction) {
    setDeciding(action.id);
    try {
      await rejectAnyAction(action.id);
    } finally {
      setDeciding(null);
      await refresh();
    }
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

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
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
                deciding={deciding === action.id}
                onApprove={() => handleApprove(action)}
                onReject={() => handleReject(action)}
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
        </>
      )}
    </div>
  );
}

function DraftPreview({ agentId, draft }: { agentId: string; draft: Record<string, unknown> }) {
  if (agentId === "email-sender") {
    return (
      <div className="rounded-md bg-muted px-4 py-3 space-y-2">
        {draft.to != null && (
          <p className="text-xs font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">To:</span>{" "}
            {String(draft.to)}
          </p>
        )}
        {draft.subject != null && (
          <p className="text-xs font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">Subject:</span>{" "}
            {String(draft.subject)}
          </p>
        )}
        {draft.body != null && (
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground mt-2 border-t border-border pt-2">
            {String(draft.body)}
          </pre>
        )}
      </div>
    );
  }

  if (agentId === "invoice") {
    const lineItems = draft.lineItems as InvoiceLineItem[] | undefined;
    const total = lineItems?.reduce((s, li) => s + li.amountPence, 0) ?? 0;
    const sym = currencySymbol(draft.currency != null ? String(draft.currency) : "gbp");
    return (
      <div className="rounded-md bg-muted px-4 py-3 space-y-2 text-xs font-mono">
        {draft.clientEmail != null && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">To:</span>{" "}
            {String(draft.clientEmail)}
          </p>
        )}
        {lineItems && lineItems.length > 0 && (
          <div className="border-t border-border pt-2 space-y-1">
            {lineItems.map((li, i) => (
              <div key={i} className="flex justify-between gap-4 text-foreground">
                <span className="truncate">{li.description}</span>
                <span className="shrink-0">{sym}{(li.amountPence / 100).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 font-semibold border-t border-border pt-1 mt-1">
              <span>Total</span>
              <span>{sym}{(total / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
        {draft.dueDate != null && (
          <p className="text-muted-foreground pt-1">
            <span className="font-semibold text-foreground">Due:</span>{" "}
            {String(draft.dueDate)}
          </p>
        )}
        {draft.notes != null && (
          <p className="text-muted-foreground italic">{String(draft.notes)}</p>
        )}
      </div>
    );
  }

  // Fallback: generic key-value dump
  return (
    <pre className="rounded-md bg-muted px-4 py-3 text-xs whitespace-pre-wrap font-mono text-foreground">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function ActionCard({
  action,
  onApprove,
  onReject,
  decided = false,
  deciding = false,
}: {
  action: PendingAction;
  onApprove?: () => void;
  onReject?: () => void;
  decided?: boolean;
  deciding?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const draft = action.draft as Record<string, unknown> | null;

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

      {expanded && draft && (
        <DraftPreview agentId={action.agentId} draft={draft} />
      )}

      {action.status === "executed" && action.result && (
        <p className="text-xs text-emerald-600 font-medium">✓ {action.result}</p>
      )}
      {action.status === "failed" && action.result && (
        <p className="text-xs text-destructive">{action.result}</p>
      )}

      {!decided && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={deciding}
            className="flex-1"
          >
            {deciding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={deciding}
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
