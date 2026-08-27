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

export async function runSetup() {
  console.log("Shikumi BYOK setup — keys stay local, never published.\n");
  const apiKey = await prompt(
    "OPENAI_API_KEY (sk-...), leave empty to keep Mock: ",
  );
  const model = await prompt("Model [gpt-4o-mini]: ");
  const baseUrl = await prompt("OPENAI_BASE_URL (optional, Enter to skip): ");
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
  if (apiKey) modelCfg.apiKey = apiKey;
  if (model) modelCfg.name = model;
  if (baseUrl) modelCfg.baseUrl = baseUrl;
  if (!modelCfg.name) modelCfg.name = "gpt-4o-mini";
  const next = { ...existing, model: modelCfg };
  mkdirSync(join(process.cwd(), ".shikumi"), { recursive: true });
  writeFileSync(cfgPath, JSON.stringify(next, null, 2), "utf-8");
  console.log(`\n✓ Wrote ${cfgPath} (gitignored, not published)`);
  if (!apiKey)
    console.log(
      "No key set — running with MockProvider. Add key later via `shikumi setup` or `shikumi config set model.apiKey <key>`",
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
