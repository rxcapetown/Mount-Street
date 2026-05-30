"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MOCK_AGENT_CONFIGS, type AgentConfig } from "@/lib/mock-data";
import type { AutonomyMode } from "@/lib/agents/types";

const AUTONOMY_OPTIONS: { value: AutonomyMode; label: string; description: string }[] = [
  {
    value: "draft_only",
    label: "Draft only",
    description: "Agent produces a draft — never sends or executes anything.",
  },
  {
    value: "ask_every_time",
    label: "Ask every time",
    description: "Each action waits in the Approvals inbox for your sign-off.",
  },
  {
    value: "auto_within_limits",
    label: "Auto within limits",
    description:
      "Tier-1 actions execute automatically if they're within your caps. Tier 2 always requires approval.",
  },
];

function riskBadge(tier: AgentConfig["riskTier"]) {
  if (tier === 0) return <Badge variant="muted">Tier 0</Badge>;
  if (tier === 1) return <Badge variant="warning">Tier 1</Badge>;
  return <Badge variant="destructive">Tier 2</Badge>;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>(MOCK_AGENT_CONFIGS);
  const [saved, setSaved] = useState(false);

  function update(agentId: string, patch: Partial<AgentConfig>) {
    setConfigs((prev) =>
      prev.map((c) => (c.agentId === agentId ? { ...c, ...patch } : c))
    );
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="px-8 py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how much autonomy each agent has.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex gap-2.5 mb-8 text-sm">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="text-muted-foreground">
          <strong className="text-foreground">Tier 2 agents</strong> (money /
          irreversible) never run automatically, regardless of mode. This is
          enforced in code, not just config.
        </div>
      </div>

      <div className="space-y-6">
        {configs.map((config, i) => (
          <div key={config.agentId}>
            {i > 0 && <Separator className="mb-6" />}
            <AgentConfigRow config={config} onChange={(patch) => update(config.agentId, patch)} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Button onClick={handleSave}>
          {saved ? "Saved" : "Save changes"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">
            Settings saved locally (Supabase coming in Phase 2).
          </span>
        )}
      </div>
    </div>
  );
}

function AgentConfigRow({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}) {
  const autonomyOption = AUTONOMY_OPTIONS.find((o) => o.value === config.autonomy);
  const showCaps =
    config.autonomy === "auto_within_limits" && config.riskTier === 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.title}</span>
          {riskBadge(config.riskTier)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`autonomy-${config.agentId}`}>Autonomy mode</Label>
          <Select
            value={config.autonomy}
            onValueChange={(v) => onChange({ autonomy: v as AutonomyMode })}
          >
            <SelectTrigger id={`autonomy-${config.agentId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTONOMY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {autonomyOption && (
            <p className="text-xs text-muted-foreground mt-1">
              {autonomyOption.description}
            </p>
          )}
        </div>

        {showCaps && (
          <div className="space-y-1.5">
            <Label htmlFor={`cap-${config.agentId}`}>Max auto amount (£)</Label>
            <Input
              id={`cap-${config.agentId}`}
              type="number"
              min="0"
              step="1"
              value={config.caps.maxAmount}
              onChange={(e) =>
                onChange({
                  caps: { maxAmount: Number(e.target.value) },
                })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Actions above this amount pause for approval.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
