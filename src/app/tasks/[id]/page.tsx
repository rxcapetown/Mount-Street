"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Copy, Check } from "lucide-react";
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
import { generateProposalDraft } from "@/app/actions/proposal-actions";
import {
  generateInvoiceDraft,
  queueInvoiceAction,
} from "@/app/actions/invoice-actions";
import type { EmailDraft } from "@/lib/agents/email-agent";
import type { ProposalDraft } from "@/lib/agents/proposal-agent";
import type { InvoiceDraft } from "@/lib/agents/invoice-agent";
import { CURRENCIES, currencySymbol } from "@/lib/services/stripe-service";

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
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (id === "email-sender") return <EmailSenderFlow />;
  if (id === "proposal") return <ProposalFlow />;
  if (id === "invoice") return <InvoiceFlow />;
  return <GenericTaskFlow id={id} />;
}

// ─── Shared: generating spinner ───────────────────────────────────────────────

function GeneratingScreen({ label }: { label: string }) {
  return (
    <div className="px-8 py-10 max-w-lg flex flex-col items-center gap-4 pt-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Shared: queued-for-approval done screen (Tier 1) ─────────────────────────

function ApprovalDoneScreen({
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
          <Button size="sm" onClick={onGoToApprovals}>Go to Approvals</Button>
          <Button variant="outline" size="sm" onClick={onRunAgain}>Run again</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice flow (Tier 1) ────────────────────────────────────────────────────

type InvoiceStep = "form" | "generating" | "review" | "done";

function InvoiceFlow() {
  const router = useRouter();
  const [step, setStep] = useState<InvoiceStep>("form");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [dueDate, setDueDate] = useState("");
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("generating");
    try {
      const result = await generateInvoiceDraft({
        client,
        clientEmail,
        description,
        amountTotal: parseFloat(amount),
        currency,
        dueDate: dueDate || undefined,
      });
      setDraft(result.draft);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invoice");
      setStep("form");
    }
  }

  async function handleQueue() {
    if (!draft) return;
    setQueuing(true);
    setError(null);
    try {
      await queueInvoiceAction(draft);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue action");
    } finally {
      setQueuing(false);
    }
  }

  if (step === "done") {
    return (
      <ApprovalDoneScreen
        onGoToApprovals={() => router.push("/approvals")}
        onRunAgain={() => {
          setClient(""); setClientEmail(""); setDescription("");
          setAmount(""); setCurrency("usd"); setDueDate("");
          setDraft(null); setStep("form");
        }}
      />
    );
  }

  if (step === "generating") return <GeneratingScreen label="Drafting your invoice…" />;

  if (step === "review" && draft) {
    const total = draft.lineItems.reduce((s, li) => s + li.amountPence, 0);
    const sym = currencySymbol(draft.currency);
    return (
      <div className="px-8 py-10 max-w-lg">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit brief
        </button>

        <h1 className="text-xl font-semibold">Review invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          Confirm the details, then queue for approval.
        </p>

        <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-1">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{draft.client}</span>
            <span className="text-muted-foreground">Send to</span>
            <span className="font-medium">{draft.clientEmail}</span>
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{draft.currency.toUpperCase()}</span>
            {draft.dueDate && (
              <>
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium">{draft.dueDate}</span>
              </>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            {draft.lineItems.map((li, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{li.description}</span>
                <span className="font-medium shrink-0">
                  {sym}{(li.amountPence / 100).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between gap-4 font-semibold border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span>{sym}{(total / 100).toFixed(2)}</span>
            </div>
          </div>

          {draft.notes && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground italic">{draft.notes}</p>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant="warning">Tier 1 — Needs approval</Badge>
          <span className="text-xs text-muted-foreground">Goes to Approvals inbox</span>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={handleQueue} disabled={queuing}>
            {queuing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</>
            ) : (
              "Queue for approval"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("form")}>
            Back to brief
          </Button>
        </div>
      </div>
    );
  }

  // form
  const sym = currencySymbol(currency);
  return (
    <div className="px-8 py-10 max-w-lg">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tasks
      </button>

      <h1 className="text-xl font-semibold">Send Invoice</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">
        Describe what to bill for and the AI will structure a professional invoice.
      </p>

      <form className="space-y-5" onSubmit={handleGenerate}>
        <div className="space-y-1.5">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            placeholder="Acme Corp"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientEmail">Client email</Label>
          <Input
            id="clientEmail"
            type="email"
            placeholder="billing@acme.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">What to bill for</Label>
          <Textarea
            id="description"
            placeholder="e.g. Brand strategy retainer — May 2026, 3 stakeholder workshops, final presentation"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ({sym.trim()})</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">
            Due date{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full mt-2">
          Generate invoice
        </Button>
      </form>
    </div>
  );
}

// ─── Proposal flow (Tier 0 — generate only) ───────────────────────────────────

type ProposalStep = "form" | "generating" | "review";

function ProposalFlow() {
  const router = useRouter();
  const [step, setStep] = useState<ProposalStep>("form");
  const [client, setClient] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scope, setScope] = useState("");
  const [roughPrice, setRoughPrice] = useState("");
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("generating");
    try {
      const result = await generateProposalDraft({
        client,
        projectName,
        scope,
        roughPrice: roughPrice || undefined,
      });
      setDraft(result.draft);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proposal");
      setStep("form");
    }
  }

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "generating") return <GeneratingScreen label="Drafting your proposal…" />;

  if (step === "review" && draft) {
    return (
      <div className="px-8 py-10 max-w-2xl">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit brief
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold">
            {draft.projectName} — {draft.client}
          </h1>
          <Badge variant="muted">Generate only</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Edit the proposal below, then copy it to use anywhere.
        </p>

        <Textarea
          rows={28}
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          className="font-mono text-sm leading-relaxed"
        />

        <div className="mt-4 flex gap-2">
          <Button onClick={handleCopy} className="flex-1">
            {copied ? (
              <><Check className="h-4 w-4" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy to clipboard</>
            )}
          </Button>
          <Button variant="outline" onClick={() => setStep("form")}>
            Start over
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

      <h1 className="text-xl font-semibold">Proposal / SOW</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">
        Give a brief and the AI will draft a client-ready proposal for you to review and copy.
      </p>

      <form className="space-y-5" onSubmit={handleGenerate}>
        <div className="space-y-1.5">
          <Label htmlFor="client">Client name</Label>
          <Input id="client" placeholder="Acme Corp" value={client}
            onChange={(e) => setClient(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="projectName">Project name</Label>
          <Input id="projectName" placeholder="Brand strategy refresh" value={projectName}
            onChange={(e) => setProjectName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scope">Scope / what you&apos;ll deliver</Label>
          <Textarea id="scope"
            placeholder="e.g. Audit current brand, run 3 stakeholder workshops, deliver new positioning framework and messaging guide"
            rows={4} value={scope} onChange={(e) => setScope(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="roughPrice">
            Investment{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input id="roughPrice" placeholder="e.g. £8,500 or £3,000/month for 3 months"
            value={roughPrice} onChange={(e) => setRoughPrice(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full mt-2">Generate proposal</Button>
      </form>
    </div>
  );
}

// ─── Email flow (Tier 1) ───────────────────────────────────────────────────────

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
      <ApprovalDoneScreen
        onGoToApprovals={() => router.push("/approvals")}
        onRunAgain={() => {
          setTo(""); setRecipientName(""); setIntent(""); setDraft(null); setStep("form");
        }}
      />
    );
  }

  if (step === "generating") return <GeneratingScreen label="Drafting your email…" />;

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
            <Input id="subject" value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={10} value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant="warning">Tier 1 — Needs approval</Badge>
          <span className="text-xs text-muted-foreground">Goes to Approvals inbox</span>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={handleQueue} disabled={queuing}>
            {queuing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</>
            ) : (
              "Queue for approval"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("form")}>
            Back to brief
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

      <h1 className="text-xl font-semibold">Send Email</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">
        Give a brief and the AI will draft the email for you to review.
      </p>

      <form className="space-y-5" onSubmit={handleGenerate}>
        <div className="space-y-1.5">
          <Label htmlFor="to">To (email)</Label>
          <Input id="to" type="email" placeholder="recipient@example.com" value={to}
            onChange={(e) => setTo(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipientName">
            Recipient name{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input id="recipientName" placeholder="Sarah" value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intent">What do you want to say?</Label>
          <Textarea id="intent"
            placeholder="e.g. Follow up on the proposal I sent last week — ask if they have questions and suggest a 30-min call"
            rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full mt-2">Generate draft</Button>
      </form>
    </div>
  );
}

// ─── Mock flow for reply-thread only ──────────────────────────────────────────

type MockStep = "form" | "review" | "done";

interface ReplyDraft { kind: "reply-thread"; threadUrl: string; reply: string }

function GenericTaskFlow({ id }: { id: string }) {
  const router = useRouter();
  const taskType = MOCK_TASK_TYPES.find((t) => t.id === id)!;
  const [step, setStep] = useState<MockStep>("form");
  const [draft, setDraft] = useState<ReplyDraft>({ kind: "reply-thread", threadUrl: "", reply: "" });

  if (step === "done") {
    return (
      <ApprovalDoneScreen
        onGoToApprovals={() => router.push("/approvals")}
        onRunAgain={() => { setDraft({ kind: "reply-thread", threadUrl: "", reply: "" }); setStep("form"); }}
      />
    );
  }

  if (step === "review") {
    return (
      <div className="px-8 py-10 max-w-lg">
        <button onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to form
        </button>

        <h1 className="text-xl font-semibold">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          Check the draft before saving.
        </p>

        <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Reply to</p>
            <p className="text-sm font-medium truncate">{draft.threadUrl || "—"}</p>
          </div>
          {draft.reply && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Content</p>
                <p className="text-sm whitespace-pre-wrap">{draft.reply}</p>
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk tier</p>
            <Badge variant="muted">Generate only</Badge>
          </div>
        </div>

        <div className="mt-6">
          <Button className="w-full" onClick={() => setStep("done")}>Save draft</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-lg">
      <button onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        All tasks
      </button>

      <h1 className="text-xl font-semibold">{taskType.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground mb-6">{taskType.description}</p>

      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep("review"); }}>
        <div className="space-y-1.5">
          <Label htmlFor="threadUrl">Thread URL or ID</Label>
          <Input id="threadUrl" placeholder="https://…" value={draft.threadUrl}
            onChange={(e) => setDraft({ ...draft, threadUrl: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply">Your reply</Label>
          <Textarea id="reply" placeholder="Draft your reply…" rows={5} value={draft.reply}
            onChange={(e) => setDraft({ ...draft, reply: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full mt-2">Preview</Button>
      </form>
    </div>
  );
}
