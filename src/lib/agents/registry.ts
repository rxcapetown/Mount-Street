import type { Agent } from "./types";

// Simple registry so the app can list/look up agents by id.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAgent = Agent<any, any>;

const registry = new Map<string, AnyAgent>();

export function registerAgent(agent: AnyAgent): void {
  registry.set(agent.id, agent);
}
export function getAgent(id: string): AnyAgent | undefined {
  return registry.get(id);
}
export function listAgents(): AnyAgent[] {
  return [...registry.values()];
}
