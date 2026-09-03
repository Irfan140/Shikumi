import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigurationError } from "../errors/errors.js";
import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENAI_MODEL,
  type AppConfig,
  ConfigSchema,
  type ModelProviderName,
} from "./schema.js";

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
  const fileModel = (raw as { model?: Record<string, unknown> }).model ?? {};
  const fileProvider =
    fileModel.provider === "openai" ||
    fileModel.provider === "groq" ||
    fileModel.provider === "mock"
      ? (fileModel.provider as ModelProviderName)
      : undefined;
  const fileModelName =
    typeof fileModel.name === "string" && fileModel.name.length > 0
      ? fileModel.name
      : undefined;

  const openaiKey = process.env.OPENAI_API_KEY || undefined;
  const groqKey = process.env.GROQ_API_KEY || undefined;

  const envProviderRaw = (
    process.env.SHIKUMI_PROVIDER ??
    process.env.HARNESS_PROVIDER ??
    ""
  ).toLowerCase();
  const envProvider: ModelProviderName | undefined =
    envProviderRaw === "openai" ||
    envProviderRaw === "groq" ||
    envProviderRaw === "mock"
      ? envProviderRaw
      : undefined;

  // Explicit provider wins; otherwise auto-detect from available keys so a
  // GROQ-only user doesn't silently land on the OpenAI path.
  const provider: ModelProviderName =
    envProvider ??
    fileProvider ??
    (groqKey && !openaiKey ? "groq" : "openai");

  const envModelName =
    process.env.SHIKUMI_MODEL ||
    process.env.HARNESS_MODEL ||
    (provider === "groq" ? process.env.GROQ_MODEL : undefined) ||
    (provider === "openai" ? process.env.OPENAI_MODEL : undefined) ||
    undefined;

  const modelName =
    envModelName ??
    fileModelName ??
    (provider === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL);

  const envApiKey =
    provider === "groq" ? groqKey : provider === "openai" ? openaiKey : undefined;
  const envBaseUrl =
    (provider === "groq"
      ? process.env.GROQ_BASE_URL
      : process.env.OPENAI_BASE_URL) || undefined;

  const envOverrides: Record<string, unknown> = {
    model: {
      provider,
      name: modelName,
      ...(envApiKey ? { apiKey: envApiKey } : {}),
      ...(envBaseUrl ? { baseUrl: envBaseUrl } : {}),
    },
  };
  if (process.env.LOG_LEVEL) {
    envOverrides.logging = { level: process.env.LOG_LEVEL };
  }
  const merged = deepMerge(
    raw as Record<string, unknown>,
    envOverrides as Record<string, unknown>,
  );
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success)
    throw new ConfigurationError(parsed.error.message, parsed.error);
  const cfg = parsed.data;
  // Env-derived values are already merged above; this keeps backwards compat
  // with files that stored a key directly plus env fallbacks.
  if (!cfg.model.apiKey) {
    const fallback =
      cfg.model.provider === "groq"
        ? process.env.GROQ_API_KEY
        : cfg.model.provider === "openai"
          ? process.env.OPENAI_API_KEY
          : undefined;
    if (fallback) cfg.model.apiKey = fallback;
  }
  if (!cfg.workspace.root) cfg.workspace.root = workspaceRoot;
  return cfg;
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null
    ) {
      out[k] = deepMerge(
        out[k] as Record<string, unknown>,
        v as Record<string, unknown>,
      );
    } else out[k] = v;
  }
  return out;
}
