import { ToolError, ToolValidationError } from "../../errors/errors.js";
import { isTracingEnabled } from "../../infrastructure/tracing/index.js";
import type { ToolRegistry } from "./tool-registry.js";
import type { Tool, ToolContext, ToolResult } from "./tool.js";

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(
    toolName: string,
    rawInput: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    if (isTracingEnabled()) {
      try {
        const { traceable } = await import("langsmith/traceable");
        const traced = (
          traceable as unknown as (
            fn: typeof this._execute,
            cfg: unknown,
          ) => typeof this._execute
        )(this._execute.bind(this), {
          name: `tool:${toolName}`,
          run_type: "tool",
          metadata: {
            toolName,
            sessionId: context.sessionId,
            runId: context.runId,
          },
        });
        return await (
          traced as unknown as (
            a: string,
            b: unknown,
            c: ToolContext,
          ) => Promise<ToolResult>
        )(toolName, rawInput, context);
      } catch {}
    }
    return this._execute(toolName, rawInput, context);
  }

  private async _execute(
    toolName: string,
    rawInput: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolName) as Tool | undefined;
    if (!tool) throw new ToolError(`Unknown tool: ${toolName}`);
    let parsed: unknown = rawInput;
    if (typeof rawInput === "string") {
      try {
        parsed = rawInput ? JSON.parse(rawInput) : {};
      } catch {
        throw new ToolValidationError(
          `Invalid JSON for tool ${toolName}: ${rawInput}`,
        );
      }
    }
    const result = tool.inputSchema.safeParse(parsed);
    if (!result.success)
      throw new ToolValidationError(
        `Validation failed for ${toolName}: ${result.error.message}`,
        result.error,
      );
    try {
      return await tool.execute(result.data, context);
    } catch (e) {
      if (e instanceof ToolError) throw e;
      throw new ToolError((e as Error).message, e);
    }
  }
}
