import { randomUUID } from "node:crypto";
import type {
  PendingAction,
  PendingActionStore,
  ActionStatus,
} from "./pending-action";

// In-memory store for development and tests. Replace with Supabase in Phase 2.
export class InMemoryPendingActionStore implements PendingActionStore {
  private map = new Map<string, PendingAction>();

  async create(
    a: Omit<PendingAction, "id" | "status" | "createdAt">
  ): Promise<PendingAction> {
    const action: PendingAction = {
      ...a,
      id: randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.map.set(action.id, action);
    return action;
  }

  async get(id: string): Promise<PendingAction | null> {
    return this.map.get(id) ?? null;
  }

  async update(id: string, patch: Partial<PendingAction>): Promise<PendingAction> {
    const cur = this.map.get(id);
    if (!cur) throw new Error(`PendingAction ${id} not found`);
    const next = { ...cur, ...patch };
    this.map.set(id, next);
    return next;
  }

  async list(userId: string, status?: ActionStatus): Promise<PendingAction[]> {
    return [...this.map.values()].filter(
      (a) => a.userId === userId && (!status || a.status === status)
    );
  }
}
