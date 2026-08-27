#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { AppUI } from "../ui/app.js";
import { createApp } from "../application/bootstrap/create-app.js";
import { runPrompt, listSessions } from "./cli.js";

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  if (cmd === "run") {
    const prompt = args.slice(1).join(" ");
    if (!prompt) {
      console.error("Usage: shikumi run \"<prompt>\"");
      process.exit(1);
    }
    await runPrompt(prompt);
    return;
  }
  if (cmd === "resume") {
    const sid = args[1];
    const prompt = args.slice(2).join(" ");
    if (!sid) {
      console.error("Usage: shikumi resume <session-id> \"<prompt>\"");
      process.exit(1);
    }
    if (prompt) await runPrompt(prompt, sid);
    else {
      const app = await createApp();
      await app.preloadSession(sid);
      await app.mcpManager.connectAll().catch(() => {});
      const inst = render(React.createElement(AppUI, { app, initialSessionId: sid }));
      setupShutdown(app, inst);
      await inst.waitUntilExit();
    }
    return;
  }
  if (cmd === "sessions" || cmd === "list") {
    await listSessions();
    return;
  }
  if (cmd === "setup") {
    const { runSetup } = await import("./setup.js");
    await runSetup();
    return;
  }
  if (cmd === "config") {
    const sub = args[1];
    if (sub === "set" && args[2]) {
      const { setConfigValue } = await import("./setup.js");
      const key = args[2];
      const value = args.slice(3).join(" ");
      await setConfigValue(key, value);
      return;
    }
    const { loadConfig } = await import("../config/config.js");
    const cfg = loadConfig();
    const redacted = { ...cfg, model: { ...cfg.model, apiKey: cfg.model.apiKey ? `${cfg.model.apiKey.slice(0, 7)}…${cfg.model.apiKey.slice(-4)}` : undefined } };
    console.log(JSON.stringify(redacted, null, 2));
    console.log("\nBYOK: set via `shikumi setup`, `shikumi config set model.apiKey <sk-...>`, env OPENAI_API_KEY, or .shikumi/config.json");
    return;
  }
  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }

  const app = await createApp();
  await app.mcpManager.connectAll().catch(() => {});
  const inst = render(React.createElement(AppUI, { app }));
  setupShutdown(app, inst);
  await inst.waitUntilExit();
}

function setupShutdown(app: Awaited<ReturnType<typeof createApp>>, inst: { unmount: () => void }) {
  const shutdown = async () => {
    try {
      await app.shutdown();
    } finally {
      inst.unmount();
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function printHelp() {
  console.log(`shikumi - scalable CLI AI agent (BYOK)

Usage:
  shikumi                    Start interactive TUI (uses Mock if no key)
  shikumi setup              Interactive BYOK setup — writes .shikumi/config.json
  shikumi config             Show config (keys redacted)
  shikumi config set <key> <value>  Set config e.g. model.apiKey sk-... / model.name gpt-4o-mini
  shikumi run "<prompt>"     Run a single prompt
  shikumi resume <id> [prompt]  Resume session
  shikumi sessions           List sessions

BYOK: bring your own keys — never baked into build. Set via:
  1) shikumi setup (interactive)
  2) .shikumi/config.json  { "model": { "apiKey": "sk-..." } }
  3) env  OPENAI_API_KEY / SHIKUMI_MODEL / OPENAI_BASE_URL
  4) .env.development (local only, gitignored)

Aliases: harness, agent (for backwards compat)
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
