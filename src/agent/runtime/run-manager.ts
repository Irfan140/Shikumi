import { randomUUID } from "node:crypto";

export type Run = {
  id: string;
  sessionId: string;
  createdAt: string;
  status: "running" | "completed" | "failed";
};

export class RunManager {
  private runs = new Map<string, Run>();
  create(sessionId: string): Run {
    const r: Run = { id: randomUUID(), sessionId, createdAt: new Date().toISOString(), status: "running" };
    this.runs.set(r.id, r);
    return r;
  }
  complete(runId: string) {
    const r = this.runs.get(runId);
    if (r) r.status = "completed";
  }
  fail(runId: string) {
    const r = this.runs.get(runId);
    if (r) r.status = "failed";
  }
}
