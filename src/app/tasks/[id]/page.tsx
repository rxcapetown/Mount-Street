"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MOCK_TASK_TYPES } from "@/lib/mock-data";

type Step = "form" | "review" | "done";

interface EmailDraft {
  kind: "email-sender";
  to: string;
  subject: string;
  body: string;
}
interface SocialDraft {
  kind: "social-post";
  platform: string;
  message: string;
}
interface InvoiceDraft {
  kind: "invoice";
  client: string;
  amount: string;
  description: string;
}
interface ReplyDraft {
  kind: "reply-thread";
  threadUrl: string;
  reply: string;
}
type Draft = EmailDraft | SocialDraft | InvoiceDraft | ReplyDraft;

function buildInitialDraft(id: string): Draft {
  switch (id) {
    case "email-sender":
      return { kind: "email-sender", to: "", subject: "", body: "" };
    case "social-post":
      return { kind: "social-post", platform: "LinkedIn", message: "" };
    case "invoice":
      return { kind: "invoice", client: "", amount: "", description: "" };
    default:
      return { kind: "reply-thread", threadUrl: "", reply: "" };
  }
}

function buildSummary(draft: Draft): string {
  switch (draft.kind) {
    case "email-sender":
      return `Send email to ${draft.to || "—"} — "${draft.subject || "no subject"}"`;
    case "social-post":
      return `Post to ${draft.platform}`;
    case "invoice":
      return `Send invoice to ${draft.client || "—"} — £${draft.amount || "0"}`;
    case "reply-thread":
      return `Reply to thread`;
  }
}

function buildBody(draft: Draft): string {
  switch (draft.kind) {
    case "email-sender":
      return draft.body;
    case "social-post":
      return draft.message;
    case "invoice":
      return `Client: ${draft.client}\nAmount: £${draft.amount}\nDescription: ${draft.description}`;
    case "reply-thread":
      return draft.reply;
  }
}

export default function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const taskType = MOCK_TASK_TYPES.find((t) => t.id === id);
  const [step, setStep] = useState<Step>("form");
  const [draft, setDraft] = useState<Draft>(() => buildInitialDraft(id));

  if (!taskType) {
    return (
      <div className="px-8 py-10">
        <p className="text-muted-foreground">Task not found.</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="px-8 py-10 max-w-lg">
        <div className="flex flex-col items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Queued for review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your action has been saved and is waiting in the Approvals inbox.
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => router.push("/approvals")}>
              Go to Approvals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(buildInitialDraft(id));
                setStep("form");
              }}
            >
              Run again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="px-8 py-10 max-w-lg">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to form
        </button>

        <h1 className="text-xl font-semibold">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          Check the draft before it goes to your Approvals inbox.
        </p>

        <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Action
            </p>
            <p className="text-sm font-medium">{buildSummary(draft)}</p>
          </div>

          {buildBody(draft) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Content
                </p>
                <p className="text-sm whitespace-pre-wrap">{buildBody(draft)}</p>
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk tier
            </p>
            {taskType.riskTier === 0 ? (
              <Badge variant="muted">Generate only</Badge>
            ) : taskType.riskTier === 1 ? (
              <Badge variant="warning">Tier 1 — Needs approval</Badge>
            ) : (
              <Badge variant="destructive">Tier 2 — Always review</Badge>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => setStep("done")}
          >
            Approve &amp; Send
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep("done")}
          >
            Save draft
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-lg">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tasks
      </button>

      <h1 className="text-xl font-semibold">{taskType.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">
        {taskType.description}
      </p>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setStep("review");
        }}
      >
        <FormFields draft={draft} onChange={setDraft} />

        <Button type="submit" className="w-full mt-2">
          Preview
        </Button>
      </form>
    </div>
  );
}

function FormFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  if (draft.kind === "email-sender") {
    return (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            placeholder="recipient@example.com"
            value={draft.to}
            onChange={(e) => onChange({ ...draft, to: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Email subject"
            value={draft.subject}
            onChange={(e) => onChange({ ...draft, subject: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            placeholder="Write your message here…"
            rows={6}
            value={draft.body}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            required
          />
        </div>
      </>
    );
  }

  if (draft.kind === "social-post") {
    return (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            value={draft.platform}
            onChange={(e) => onChange({ ...draft, platform: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option>LinkedIn</option>
            <option>X / Twitter</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="What do you want to share?"
            rows={5}
            value={draft.message}
            onChange={(e) => onChange({ ...draft, message: e.target.value })}
            required
          />
        </div>
      </>
    );
  }

  if (draft.kind === "invoice") {
    return (
      <>
        <div className="space-y-1.5">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            placeholder="Acme Corp"
            value={draft.client}
            onChange={(e) => onChange({ ...draft, client: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (£)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={draft.amount}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Services rendered — May 2026"
            value={draft.description}
            onChange={(e) =>
              onChange({ ...draft, description: e.target.value })
            }
            required
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="threadUrl">Thread URL or ID</Label>
        <Input
          id="threadUrl"
          placeholder="https://…"
          value={draft.threadUrl}
          onChange={(e) => onChange({ ...draft, threadUrl: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reply">Your reply</Label>
        <Textarea
          id="reply"
          placeholder="Draft your reply…"
          rows={5}
          value={draft.reply}
          onChange={(e) => onChange({ ...draft, reply: e.target.value })}
          required
        />
      </div>
    </>
  );
}
