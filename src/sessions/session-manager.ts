import type { MessageRepository, SessionRepository } from "./repository.js";
import type { Session } from "./models.js";

export class SessionManager {
  constructor(
    private sessions: SessionRepository,
    private messages: MessageRepository,
  ) {}

  create(workspaceRoot: string, workingDirectory: string): Promise<Session> {
    return this.sessions.create({ workspaceRoot, workingDirectory });
  }
  get(id: string) {
    return this.sessions.getById(id);
  }
  list(limit?: number) {
    return this.sessions.list(limit);
  }
}
