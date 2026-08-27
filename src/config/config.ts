import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigurationError } from "../errors/errors.js";
import { type AppConfig, ConfigSchema } from "./schema.js";

export function loadConfig(workspaceRoot: string = process.cwd()): AppConfig {
  const candidates = [
    join(workspaceRoot, ".shikumi", "config.json"),
    join(workspaceRoot, "shikumi.config.json"),
    join(workspaceRoot, ".shikumirc.json"),
    join(workspaceRoot, ".harness", "config.json"),
    join(workspaceRoot, "harness.config.json"),
    join(workspaceRoot, ".harnessrc.json"),
  ];
  let raw: unknown = {};
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        raw = JSON.parse(readFileSync(p, "utf-8"));
        break;
      } catch (e) {
        throw new ConfigurationError(`Failed to parse config at ${p}`, e);
      }
    }
  }
  const envOverrides: Record<string, unknown> = {};
  if (process.env.OPENAI_API_KEY) {
    envOverrides.model = { apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.SHIKUMI_MODEL || process.env.HARNESS_MODEL) {
    envOverrides.model = { ...(envOverrides.model as object), name: (process.env.SHIKUMI_MODEL ?? process.env.HARNESS_MODEL) as string };
  }
  if (process.env.OPENAI_BASE_URL) {
    envOverrides.model = { ...(envOverrides.model as object), baseUrl: process.env.OPENAI_BASE_URL };
  }
  if (process.env.LOG_LEVEL) {
    envOverrides.logging = { level: process.env.LOG_LEVEL };
  }
  const merged = deepMerge(raw as Record<string, unknown>, envOverrides as Record<string, unknown>);
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) throw new ConfigurationError(parsed.error.message, parsed.error);
  const cfg = parsed.data;
  if (!cfg.model.apiKey && process.env.OPENAI_API_KEY) cfg.model.apiKey = process.env.OPENAI_API_KEY;
  if (!cfg.workspace.root) cfg.workspace.root = workspaceRoot;
  return cfg;
}

function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] !== null) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else out[k] = v;
  }
  return out;
}
