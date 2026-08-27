import type { ModelMessage } from "../models/model-types.js";
import type { MessageStore } from "./message-store.js";

export type ContextOptions = {
  systemPrompt: string;
  maxMessages?: number;
};

export class ContextManager {
  constructor(
    private store: MessageStore,
    private opts: ContextOptions,
  ) {}

  async append(sessionId: string, runId: string, message: ModelMessage): Promise<void> {
    await this.store.append(sessionId, runId, message);
  }

  async buildContext(sessionId: string): Promise<ModelMessage[]> {
    const messages = await this.store.getBySession(sessionId);
    const max = this.opts.maxMessages ?? 100;
    return messages.slice(-max);
  }

  getSystemPrompt(): string {
    return this.opts.systemPrompt;
  }

  async getMessages(sessionId: string): Promise<ModelMessage[]> {
    return this.store.getBySession(sessionId);
  }
}

export function defaultSystemPrompt(workspaceRoot: string, opts?: { mcpServers?: string[] }): string {
  const now = new Date().toISOString();
  const mcpPart =
    opts?.mcpServers?.length
      ? `MCP servers connected: ${opts.mcpServers.join(", ")} (tools from these servers are available).`
      : `No MCP servers currently connected. MCP = Model Context Protocol (tool gateway), NOT Microsoft Certified Professional. To add MCP servers, configure .shikumi/config.json under mcpServers.`;
  return `You are Shikumi — a production CLI AI agent.

Workspace: ${workspaceRoot}
Current time (UTC): ${now}

You have tools: read_file, write_file, list_directory, search_files, run_command, git_status, git_diff, git_log, get_current_time, web_search plus any MCP tools.
Rules:
- Use get_current_time for date/time questions — never hallucinate dates.
- Use tools when they help; you can chain multiple tool calls.
- ${mcpPart}
- Keep answers concise. When you use tools, briefly explain what you are doing.
- Workspace-relative paths only.`;
}
