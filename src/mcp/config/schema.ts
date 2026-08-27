import { z } from "zod";

export const McpServerEntrySchema = z.discriminatedUnion("transport", [
  z.object({ transport: z.literal("stdio"), command: z.string(), args: z.array(z.string()).default([]), env: z.record(z.string(), z.string()).optional() }),
  z.object({ transport: z.literal("streamable-http"), url: z.string().url(), headers: z.record(z.string(), z.string()).optional() }),
]);

export const McpConfigSchema = z.object({ mcpServers: z.record(z.string(), McpServerEntrySchema).default({}) });
export type McpConfig = z.infer<typeof McpConfigSchema>;
