import type { ModelMessage } from "../models/model-types.js";

export interface MessageStore {
  append(
    sessionId: string,
    runId: string,
    message: ModelMessage,
  ): Promise<void>;
  getBySession(sessionId: string): Promise<ModelMessage[]>;
  getByRun(runId: string): Promise<ModelMessage[]>;
}

export class InMemoryMessageStore implements MessageStore {
  private messages: Map<string, { runId: string; message: ModelMessage }[]> =
    new Map();
  async append(
    sessionId: string,
    runId: string,
    message: ModelMessage,
  ): Promise<void> {
    const arr = this.messages.get(sessionId) ?? [];
    arr.push({ runId, message });
    this.messages.set(sessionId, arr);
  }
  async getBySession(sessionId: string): Promise<ModelMessage[]> {
    return (this.messages.get(sessionId) ?? []).map((e) => e.message);
  }
  async getByRun(runId: string): Promise<ModelMessage[]> {
    const all: ModelMessage[] = [];
    for (const entries of this.messages.values()) {
      for (const e of entries) if (e.runId === runId) all.push(e.message);
    }
    return all;
  }
  getAll(sessionId: string): { runId: string; message: ModelMessage }[] {
    return this.messages.get(sessionId) ?? [];
  }
}
