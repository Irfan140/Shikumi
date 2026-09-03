import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import type { ModelMessage } from "../agent/models/model-types.js";
import type { Session, StoredMessage } from "./models.js";

export interface SessionRepository {
  create(data: {
    workspaceRoot: string;
    workingDirectory: string;
    title?: string;
  }): Promise<Session>;
  getById(id: string): Promise<Session | null>;
  update(id: string, patch: Partial<Session>): Promise<void>;
  list(limit?: number): Promise<Session[]>;
}

export interface MessageRepository {
  append(
    sessionId: string,
    runId: string,
    message: ModelMessage,
  ): Promise<void>;
  getBySession(sessionId: string): Promise<ModelMessage[]>;
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private db: Database) {}
  async create(data: {
    workspaceRoot: string;
    workingDirectory: string;
    title?: string;
  }): Promise<Session> {
    const now = new Date().toISOString();
    const s: Session = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      workspaceRoot: data.workspaceRoot,
      workingDirectory: data.workingDirectory,
      title: data.title,
    };
    this.db
      .prepare(
        "INSERT INTO sessions (id, created_at, updated_at, workspace_root, working_directory, title) VALUES (?,?,?,?,?,?)",
      )
      .run(
        s.id,
        s.createdAt,
        s.updatedAt,
        s.workspaceRoot,
        s.workingDirectory,
        s.title ?? null,
      );
    return s;
  }
  async getById(id: string): Promise<Session | null> {
    const row = this.db
      .prepare("SELECT * FROM sessions WHERE id=?")
      .get(id) as Record<string, string> | null;
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      workspaceRoot: row.workspace_root,
      workingDirectory: row.working_directory,
      title: row.title ?? undefined,
    };
  }
  async update(id: string, patch: Partial<Session>): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        "UPDATE sessions SET updated_at=?, title=COALESCE(?, title) WHERE id=?",
      )
      .run(now, patch.title ?? null, id);
  }
  async list(limit = 20): Promise<Session[]> {
    const rows = this.db
      .prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?")
      .all(limit) as Record<string, string>[];
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      workspaceRoot: r.workspace_root,
      workingDirectory: r.working_directory,
      title: r.title ?? undefined,
    }));
  }
}

export class SqliteMessageRepository implements MessageRepository {
  constructor(private db: Database) {}
  async append(
    sessionId: string,
    runId: string,
    message: ModelMessage,
  ): Promise<void> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO messages (id, session_id, run_id, role, content, tool_calls, tool_call_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        sessionId,
        runId,
        message.role,
        message.content,
        message.toolCalls ? JSON.stringify(message.toolCalls) : null,
        message.toolCallId ?? null,
        now,
      );
    this.db
      .prepare("UPDATE sessions SET updated_at=? WHERE id=?")
      .run(now, sessionId);
  }
  async getBySession(sessionId: string): Promise<ModelMessage[]> {
    // Order by rowid (insertion order): several messages can share the same
    // created_at millisecond, which made ORDER BY created_at nondeterministic.
    const rows = this.db
      .prepare("SELECT * FROM messages WHERE session_id=? ORDER BY rowid ASC")
      .all(sessionId) as Record<string, string>[];
    return rows.map((r) => ({
      role: r.role as ModelMessage["role"],
      content: r.content,
      toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
      toolCallId: r.tool_call_id ?? undefined,
    }));
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private map = new Map<string, Session>();
  async create(data: {
    workspaceRoot: string;
    workingDirectory: string;
    title?: string;
  }): Promise<Session> {
    const now = new Date().toISOString();
    const s: Session = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      workspaceRoot: data.workspaceRoot,
      workingDirectory: data.workingDirectory,
      title: data.title,
    };
    this.map.set(s.id, s);
    return s;
  }
  async getById(id: string): Promise<Session | null> {
    return this.map.get(id) ?? null;
  }
  async update(id: string, patch: Partial<Session>): Promise<void> {
    const s = this.map.get(id);
    if (s)
      this.map.set(id, { ...s, ...patch, updatedAt: new Date().toISOString() });
  }
  async list(): Promise<Session[]> {
    return [...this.map.values()];
  }
}
