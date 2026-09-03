import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

function prompt(q: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(q, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
}

type ProviderName = "openai" | "groq";

const PROVIDER_DEFAULTS: Record<
  ProviderName,
  { model: string; baseUrl: string; keyLabel: string; keyPrefix: string }
> = {
  openai: {
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    keyLabel: "OPENAI_API_KEY",
    keyPrefix: "sk-",
  },
  groq: {
    model: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    keyLabel: "GROQ_API_KEY",
    keyPrefix: "gsk_",
  },
};

export async function runSetup() {
  console.log("Shikumi BYOK setup — keys stay local, never published.\n");
  const providerRaw = (
    await prompt("Provider [openai/groq] (default: openai): ")
  ).toLowerCase();
  const provider: ProviderName =
    providerRaw === "groq" ? "groq" : "openai";
  const defaults = PROVIDER_DEFAULTS[provider];

  const apiKey = await prompt(
    `${defaults.keyLabel} (${defaults.keyPrefix}...), leave empty to keep Mock: `,
  );
  const model = await prompt(`Model [${defaults.model}]: `);
  const baseUrl = await prompt(
    `Base URL [${defaults.baseUrl}] (Enter to use default): `,
  );
  const cfgPath = join(process.cwd(), ".shikumi", "config.json");
  let existing: Record<string, unknown> = {};
  if (existsSync(cfgPath)) {
    try {
      existing = JSON.parse(readFileSync(cfgPath, "utf-8"));
    } catch {}
  }
  const modelCfg: Record<string, unknown> = {
    ...((existing.model as Record<string, unknown>) ?? {}),
  };
  modelCfg.provider = provider;
  if (apiKey) modelCfg.apiKey = apiKey;
  modelCfg.name = model || defaults.model;
  if (baseUrl) modelCfg.baseUrl = baseUrl;
  const next = { ...existing, model: modelCfg };
  mkdirSync(join(process.cwd(), ".shikumi"), { recursive: true });
  writeFileSync(cfgPath, JSON.stringify(next, null, 2), "utf-8");
  console.log(`\n✓ Wrote ${cfgPath} (gitignored, not published)`);
  console.log(`  provider: ${provider} · model: ${modelCfg.name}`);
  if (!apiKey && !(modelCfg.apiKey as string | undefined))
    console.log(
      `No key set — running with MockProvider. Add a key later via \`shikumi setup\` or \`shikumi config set model.apiKey <key>\` (or env ${defaults.keyLabel})`,
    );
}

export async function setConfigValue(key: string, value: string) {
  const cfgPath = join(process.cwd(), ".shikumi", "config.json");
  let cfg: Record<string, unknown> = {};
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
    } catch {}
  }
  const parts = key.split(".");
  let cur: Record<string, unknown> = cfg;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  mkdirSync(join(process.cwd(), ".shikumi"), { recursive: true });
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), "utf-8");
  console.log(`✓ Set ${key} in ${cfgPath}`);
}
