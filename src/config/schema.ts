import { z } from "zod";

export const McpServerConfigSchema = z.discriminatedUnion("transport", [
  z.object({
    transport: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    transport: z.literal("streamable-http"),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type ModelProviderName = "openai" | "groq" | "mock";

export const ConfigSchema = z.object({
  model: z
    .object({
      provider: z.enum(["openai", "groq", "mock"]).default("openai"),
      name: z.string().default(DEFAULT_OPENAI_MODEL),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
    })
    .default({ provider: "openai", name: DEFAULT_OPENAI_MODEL }),
  workspace: z
    .object({
      root: z.string().default(process.cwd()),
    })
    .default({ root: process.cwd() }),
  mcpServers: z.record(z.string(), McpServerConfigSchema).default({}),
  ui: z.object({ theme: z.string().optional() }).default({}),
  logging: z
    .object({ level: z.string().default("info") })
    .default({ level: "info" }),
  persistence: z
    .object({ sqlitePath: z.string().default(".shikumi/shikumi.db") })
    .default({ sqlitePath: ".shikumi/shikumi.db" }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
