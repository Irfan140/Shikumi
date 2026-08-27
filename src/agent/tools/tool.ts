import { z } from "zod";

export type ToolContext = {
  workspaceRoot: string;
  workingDirectory: string;
  sessionId: string;
  runId: string;
};

export type ToolResult = {
  success: boolean;
  content: string;
  data?: unknown;
  isError?: boolean;
};

export interface Tool<TInput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<TInput>;
  readonly jsonSchema: Record<string, unknown>;
  execute(input: TInput, context: ToolContext): Promise<ToolResult>;
}

export function createTool<T extends z.ZodTypeAny>(opts: {
  name: string;
  description: string;
  inputSchema: T;
  execute: (input: z.infer<T>, ctx: ToolContext) => Promise<ToolResult>;
}): Tool<z.infer<T>> {
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema as unknown as z.ZodType<z.infer<T>>,
    jsonSchema: zodToJsonSchema(opts.inputSchema),
    execute: opts.execute as (
      input: unknown,
      ctx: ToolContext,
    ) => Promise<ToolResult>,
  } as unknown as Tool<z.infer<T>>;
}

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  try {
    const maybe = (
      z as unknown as { toJSONSchema?: (s: unknown) => Record<string, unknown> }
    ).toJSONSchema;
    if (maybe) {
      const out = maybe(schema) as Record<string, unknown>;
      const { $schema: _omit, ...cleaned } = out;
      return cleaned as Record<string, unknown>;
    }
  } catch {}
  try {
    const json = (schema as unknown as { toJSON?: () => unknown })?.toJSON?.();
    if (json) return json as Record<string, unknown>;
  } catch {}
  return { type: "object", additionalProperties: true };
}
