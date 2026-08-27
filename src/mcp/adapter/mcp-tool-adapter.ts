import { z } from "zod";
import { type Tool, createTool } from "../../agent/tools/tool.js";

export function adaptMcpTool(
  def: {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  },
  call: (
    name: string,
    args: unknown,
  ) => Promise<{
    content: { type: string; text?: string }[];
    isError?: boolean;
  }>,
): Tool {
  const schema = jsonSchemaToZod(def.inputSchema);
  return createTool({
    name: def.name,
    description: def.description ?? `MCP tool ${def.name}`,
    inputSchema: schema,
    execute: async (input) => {
      const res = await call(def.name, input);
      const text = res.content
        .map((c) => c.text ?? JSON.stringify(c))
        .join("\n");
      return { success: !res.isError, content: text, isError: res.isError };
    },
  });
}

function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") return z.object({}).passthrough();
  if ((schema as { type?: string }).type === "object") {
    const props =
      (schema as { properties?: Record<string, Record<string, unknown>> })
        .properties ?? {};
    const shape: Record<string, z.ZodTypeAny> = {};
    const required = new Set(
      (schema as { required?: string[] }).required ?? [],
    );
    for (const [k, v] of Object.entries(props)) {
      let field: z.ZodTypeAny = z.unknown();
      if (v.type === "string") field = z.string();
      else if (v.type === "number" || v.type === "integer") field = z.number();
      else if (v.type === "boolean") field = z.boolean();
      else if (v.type === "array") field = z.array(z.unknown());
      else if (v.type === "object") field = z.object({}).passthrough();
      if (!required.has(k)) field = field.optional();
      shape[k] = field;
    }
    return z.object(shape).passthrough();
  }
  return z.object({}).passthrough();
}
