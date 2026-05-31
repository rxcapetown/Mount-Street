"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MOCK_TASK_TYPES } from "@/lib/mock-data";
import {
  generateEmailDraft,
  queueEmailAction,
} from "@/app/actions/email-actions";
import type { EmailDraft } from "@/lib/agents/email-agent";

export default function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const taskType = MOCK_TASK_TYPES.find((t) => t.id === id);

  const router = useRouter();

  if (!taskType) {
    return (
      <div className="px-8 py-10">
        <p className="text-muted-foreground">Task not found.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (id === "email-sender") {
    return <EmailSenderFlow />;
  }

  return <GenericTaskFlow id={id} />;
}

// ─── Real email flow ───────────────────────────────────────────────────────────

type EmailStep = "form" | "generating" | "review" | "done";

function EmailSenderFlow() {
  const router = useRouter();
  const [step, setStep] = useState<EmailStep>("form");
  const [to, setTo] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [intent, setIntent] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("generating");
    try {
      const result = await generateEmailDraft({
        to,
        recipientName: recipientName || undefined,
        intent,
      });
      setDraft(result.draft);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
      setStep("form");
    }
  }

  async function handleQueue() {
    if (!draft) return;
    setQueuing(true);
    setError(null);
    try {
      await queueEmailAction(draft);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue action");
    } finally {
      setQueuing(false);
    }
  }

  if (step === "done") {
    return (
      <DoneScreen
        onGoToApprovals={() => router.push("/approvals")}
        onRunAgain={() => {
          setTo("");
          setRecipientName("");
          setIntent("");
          setDraft(null);
          setStep("form");
        }}
      />
    );
  }

  if (step === "generating") {
    return (
      <div className="px-8 py-10 max-w-lg flex flex-col items-center gap-4 pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drafting your email…</p>
      </div>
    );
  }

  if (step === "review" && draft) {
    return (
      <div className="px-8 py-10 max-w-lg">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit brief
        </button>

        <h1 className="text-xl font-semibold">Review draft</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          Edit if you like, then queue for approval.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input value={draft.to} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              rows={10}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant="warning">Tier 1 — Needs approval</Badge>
          <span className="text-xs text-muted-foreground">
            Goes to Approvals inbox
          </span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={handleQueue} disabled={queuing}>
            {queuing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</>
            ) : (
              "Queue for approval"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep("form")}
          >
            Back to brief
          </Button>
        </div>
      </div>
    );
  }

  // form step
  return (
    <div className="px-8 py-10 max-w-lg">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tasks
      </button>

      <h1 className="text-xl font-semibold">Send Email</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">
        Give a brief and the AI will draft the email for you to review.
      </p>

      <form className="space-y-5" onSubmit={handleGenerate}>
        <div className="space-y-1.5">
          <Label htmlFor="to">To (email)</Label>
          <Input
            id="to"
            type="email"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipientName">
            Recipient name{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="recipientName"
            placeholder="Sarah"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intent">What do you want to say?</Label>
          <Textarea
            id="intent"
            placeholder="e.g. Follow up on the proposal I sent last week — ask if they have questions and suggest a 30-min call"
            rows={4}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full mt-2">
          Generate draft
        </Button>
      </form>
    </div>
  );
}

// ─── Shared done screen ────────────────────────────────────────────────────────

function DoneScreen({
  onGoToApprovals,
  onRunAgain,
}: {
  onGoToApprovals: () => void;
  onRunAgain: () => void;
}) {
  return (
    <div className="px-8 py-10 max-w-lg">
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Queued for review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your action is waiting in the Approvals inbox.
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={onGoToApprovals}>
            Go to Approvals
          </Button>
          <Button variant="outline" size="sm" onClick={onRunAgain}>
            Run again
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Mock flow for all other tasks ────────────────────────────────────────────

type MockStep = "form" | "review" | "done";

interface SocialDraft { kind: "social-post"; platform: string; message: string }
interface InvoiceDraft { kind: "invoice"; client: string; amount: string; description: string }
interface ReplyDraft { kind: "reply-thread"; threadUrl: string; reply: string }
type MockDraft = SocialDraft | InvoiceDraft | ReplyDraft;

function buildMockInitial(id: string): MockDraft {
  if (id === "social-post") return { kind: "social-post", platform: "LinkedIn", message: "" };
  if (id === "invoice") return { kind: "invoice", client: "", amount: "", description: "" };
  return { kind: "reply-thread", threadUrl: "", reply: "" };
}

function mockSummary(d: MockDraft): string {
  if (d.kind === "social-post") return `Post to ${d.platform}`;
  if (d.kind === "invoice") return `Send invoice to ${d.client || "—"} — £${d.amount || "0"}`;
  return "Reply to thread";
}

function mockBody(d: MockDraft): string {
  if (d.kind === "social-post") return d.message;
  if (d.kind === "invoice") return `Client: ${d.client}\nAmount: £${d.amount}\nDescription: ${d.description}`;
  return d.reply;
}

function GenericTaskFlow({ id }: { id: string }) {
  const router = useRouter();
  const taskType = MOCK_TASK_TYPES.find((t) => t.id === id)!;
  const [step, setStep] = useState<MockStep>("form");
  const [draft, setDraft] = useState<MockDraft>(() => buildMockInitial(id));

  if (step === "done") {
    return (
      <DoneScreen
        onGoToApprovals={() => router.push("/approvals")}
        onRunAgain={() => { setDraft(buildMockInitial(id)); setStep("form"); }}
      />
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Action</p>
            <p className="text-sm font-medium">{mockSummary(draft)}</p>
          </div>
          {mockBody(draft) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Content</p>
                <p className="text-sm whitespace-pre-wrap">{mockBody(draft)}</p>
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk tier</p>
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
          <Button className="w-full" onClick={() => setStep("done")}>
            Approve &amp; Send
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("done")}>
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
      <p className="mt-1 text-sm text-muted-foreground mb-6">{taskType.description}</p>

      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep("review"); }}>
        <MockFormFields draft={draft} onChange={setDraft} />
        <Button type="submit" className="w-full mt-2">Preview</Button>
      </form>
    </div>
  );
}

function MockFormFields({ draft, onChange }: { draft: MockDraft; onChange: (d: MockDraft) => void }) {
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
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
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
