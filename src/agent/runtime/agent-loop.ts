import type { ContextManager } from "../context/context-manager.js";
import type { ModelProvider } from "../models/model-provider.js";
import type { ModelMessage } from "../models/model-types.js";
import { ToolExecutor } from "../tools/tool-executor.js";
import type { ToolContext } from "../tools/tool.js";
import type { ToolRegistry } from "../tools/tool-registry.js";
import type { MessageRepository } from "../../sessions/repository.js";
import { needsPermission } from "../permissions/permissions.js";
import { isTracingEnabled } from "../../infrastructure/tracing/index.js";
import type { AgentEvent } from "./events.js";
import type { RunManager } from "./run-manager.js";

export type PermissionHandler = (toolName: string, toolCallId: string, input: unknown, mode: string) => Promise<"allow" | "deny" | "always">;

export type AgentLoopOpts = {
  modelProvider: ModelProvider;
  contextManager: ContextManager;
  toolRegistry: ToolRegistry;
  messageRepo?: MessageRepository;
  runManager: RunManager;
  workspaceRoot: string;
  workingDirectory: string;
  maxIterations?: number;
  modelName: string;
  getMode?: () => string;
  requestPermission?: PermissionHandler;
};

export class AgentLoop {
  private toolExecutor: ToolExecutor;
  constructor(private opts: AgentLoopOpts) {
    this.toolExecutor = new ToolExecutor(opts.toolRegistry);
  }

  async *run(sessionId: string, userInput: string, runOpts?: { mode?: string }): AsyncIterable<AgentEvent> {
    if (isTracingEnabled()) {
      try {
        const { traceable } = await import("langsmith/traceable");
        const traced = (traceable as unknown as (fn: typeof this._run, cfg: unknown) => typeof this._run)(
          this._run.bind(this) as unknown as typeof this._run,
          { name: "shikumi.run", run_type: "chain", metadata: { sessionId, mode: runOpts?.mode ?? this.opts.getMode?.() ?? "agent" } },
        );
        yield* (traced as unknown as typeof this._run)(sessionId, userInput, runOpts);
        return;
      } catch {}
    }
    yield* this._run(sessionId, userInput, runOpts);
  }

  private async *_run(sessionId: string, userInput: string, runOpts?: { mode?: string }): AsyncIterable<AgentEvent> {
    const run = this.opts.runManager.create(sessionId);
    const runId = run.id;
    const baseCtx: ToolContext = {
      workspaceRoot: this.opts.workspaceRoot,
      workingDirectory: this.opts.workingDirectory,
      sessionId,
      runId,
    };

    yield { type: "run.started", runId, sessionId };

    await this.persist(sessionId, runId, { role: "user", content: userInput });
    await this.opts.contextManager.append(sessionId, runId, { role: "user", content: userInput });

    let iterations = 0;
    const maxIter = this.opts.maxIterations ?? 10;
    let finalContent = "";

    try {
      while (iterations < maxIter) {
        iterations++;
        yield { type: "model.started", runId };
        const messages = await this.opts.contextManager.buildContext(sessionId);
        const mode = runOpts?.mode ?? this.opts.getMode?.() ?? "agent";
        const tools = mode === "plan" ? (this.opts.toolRegistry as unknown as { definitionsForMode: (m: string) => unknown[] }).definitionsForMode?.(mode) ?? this.opts.toolRegistry.definitions() : this.opts.toolRegistry.definitions();
        const stream = this.opts.modelProvider.stream({
          messages,
          tools: tools as never,
          model: this.opts.modelName,
          systemPrompt: this.opts.contextManager.getSystemPrompt() + (mode === "plan" ? "\n[MODE: PLAN - read-only. Do not call write_file or run_command. Propose a plan instead.]" : "\n[MODE: AGENT]"),
        });

        let content = "";
        let toolCalls: { id: string; name: string; arguments: string }[] = [];
        const accTools = new Map<string, { name: string; args: string }>();

        for await (const ev of stream) {
          if (ev.type === "text.delta") {
            content += ev.delta;
            yield { type: "model.text.delta", runId, delta: ev.delta };
          } else if (ev.type === "tool_call.delta") {
            const cur = accTools.get(ev.toolCallId) ?? { name: "", args: "" };
            if (ev.nameDelta) cur.name += ev.nameDelta;
            if (ev.argsDelta) cur.args += ev.argsDelta;
            accTools.set(ev.toolCallId, cur);
          } else if (ev.type === "done") {
            content = ev.response.content || content;
            if (ev.response.toolCalls.length) {
              toolCalls = ev.response.toolCalls;
            } else if (accTools.size) {
              toolCalls = [...accTools.entries()]
                .filter(([, v]) => v.name)
                .map(([k, v], i) => ({ id: `call_${i}_${k}`, name: v.name, arguments: v.args }));
            }
            break;
          }
        }

        if (toolCalls.length === 0 && accTools.size) {
          toolCalls = [...accTools.entries()]
            .filter(([, v]) => v.name)
            .map(([k, v], i) => ({ id: `call_${i}_${k}`, name: v.name, arguments: v.args }));
        }

        if (toolCalls.length === 0) {
          finalContent = content;
          const assistantMsg: ModelMessage = { role: "assistant", content };
          await this.persist(sessionId, runId, assistantMsg);
          await this.opts.contextManager.append(sessionId, runId, assistantMsg);
          yield { type: "model.completed", runId, content, toolCalls: [] };
          break;
        }

        const assistantMsg: ModelMessage = { role: "assistant", content, toolCalls };
        await this.persist(sessionId, runId, assistantMsg);
        await this.opts.contextManager.append(sessionId, runId, assistantMsg);
        yield { type: "model.completed", runId, content, toolCalls: toolCalls.map((t) => ({ name: t.name, id: t.id })) };

        for (const tc of toolCalls) {
          const modeForTool = runOpts?.mode ?? this.opts.getMode?.() ?? "agent";
          if (needsPermission(tc.name, modeForTool as never)) {
            yield { type: "permission.requested", runId, toolName: tc.name, toolCallId: tc.id, input: tc.arguments, mode: modeForTool };
            const handler = this.opts.requestPermission;
            let decision: "allow" | "deny" | "always" = "deny";
            if (handler) decision = await handler(tc.name, tc.id, tc.arguments, modeForTool);
            else decision = modeForTool === "plan" ? "deny" : "allow";
            yield { type: "permission.decided", runId, toolName: tc.name, toolCallId: tc.id, decision };
            if (decision === "deny") {
              const msg = `Permission denied for ${tc.name} in ${modeForTool} mode`;
              const toolMsg: ModelMessage = { role: "tool", content: msg, toolCallId: tc.id };
              await this.persist(sessionId, runId, toolMsg);
              await this.opts.contextManager.append(sessionId, runId, toolMsg);
              yield { type: "tool.failed", runId, toolName: tc.name, toolCallId: tc.id, error: msg };
              continue;
            }
          }
          yield { type: "tool.started", runId, toolName: tc.name, toolCallId: tc.id, input: tc.arguments };
          try {
            const result = await this.toolExecutor.execute(tc.name, tc.arguments, baseCtx);
            const toolResultContent = result.content;
            const toolMsg: ModelMessage = { role: "tool", content: toolResultContent, toolCallId: tc.id };
            await this.persist(sessionId, runId, toolMsg);
            await this.opts.contextManager.append(sessionId, runId, toolMsg);
            yield { type: "tool.completed", runId, toolName: tc.name, toolCallId: tc.id, result: toolResultContent };
          } catch (e) {
            const msg = (e as Error).message;
            const toolMsg: ModelMessage = { role: "tool", content: `Error: ${msg}`, toolCallId: tc.id };
            await this.persist(sessionId, runId, toolMsg);
            await this.opts.contextManager.append(sessionId, runId, toolMsg);
            yield { type: "tool.failed", runId, toolName: tc.name, toolCallId: tc.id, error: msg };
          }
        }

        if (iterations >= maxIter) {
          finalContent = content;
        }
      }

      this.opts.runManager.complete(runId);
      yield { type: "run.completed", runId, sessionId, result: finalContent };
    } catch (e) {
      this.opts.runManager.fail(runId);
      yield { type: "run.failed", runId, sessionId, error: (e as Error).message };
    }
  }

  private async persist(sessionId: string, runId: string, msg: ModelMessage) {
    if (this.opts.messageRepo) await this.opts.messageRepo.append(sessionId, runId, msg);
  }
}
