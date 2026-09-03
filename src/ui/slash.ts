import type { App } from "../application/bootstrap/create-app.js";
import type { ModelMessage } from "../agent/models/model-types.js";
import { createModelProvider } from "../agent/models/providers/openai-provider.js";
import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENAI_MODEL,
} from "../config/schema.js";

export type SlashSayKind = "system" | "agent" | "user";

export type HistoryItem =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; name: string; detail: string };

export type SlashMode = "plan" | "agent";

export type SlashContext = {
  app: App;
  sessionId: string | undefined;
  setSessionId: (id: string | undefined) => void;
  say: (text: string, kind?: SlashSayKind) => void;
  renderHistory: (items: HistoryItem[]) => void;
  clear: () => void;
  getMode: () => SlashMode;
  setMode: (m: SlashMode) => void;
  exit: () => void;
};

export type SlashCommand = {
  name: string;
  description: string;
  usage: string;
  run: (args: string, ctx: SlashContext) => Promise<void>;
};

export function parseSlash(input: string): { name: string; args: string } | null {
  if (!input.startsWith("/")) return null;
  const rest = input.slice(1).trim();
  if (!rest) return { name: "", args: "" };
  const sp = rest.search(/\s/);
  if (sp === -1) return { name: rest.toLowerCase(), args: "" };
  return {
    name: rest.slice(0, sp).toLowerCase(),
    args: rest.slice(sp + 1).trim(),
  };
}

export function matchSlashCommands(token: string): SlashCommand[] {
  const t = token.toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(t));
}

const ALIASES: Record<string, string> = {
  switch: "resume",
  exit: "quit",
};

export function findSlashCommand(name: string): SlashCommand | undefined {
  const n = name.toLowerCase();
  return (
    SLASH_COMMANDS.find((c) => c.name === n) ??
    (ALIASES[n] ? SLASH_COMMANDS.find((c) => c.name === ALIASES[n]) : undefined)
  );
}

export async function runSlashCommand(
  input: string,
  ctx: SlashContext,
): Promise<{ handled: boolean }> {
  const parsed = parseSlash(input);
  if (!parsed || !parsed.name) return { handled: false };
  let cmd = findSlashCommand(parsed.name);
  if (!cmd) {
    // Unique-prefix completion: "/ren" runs /rename.
    const matches = matchSlashCommands(parsed.name);
    if (matches.length === 1) cmd = matches[0];
  }
  if (!cmd) {
    ctx.say(
      `Unknown command /${parsed.name}. Type /help for all commands.`,
      "system",
    );
    return { handled: true };
  }
  await cmd.run(parsed.args, ctx);
  return { handled: true };
}

/** Flatten stored messages into renderable history items (for /resume). */
export function toHistoryItems(messages: ModelMessage[]): HistoryItem[] {
  const nameById = new Map<string, string>();
  for (const m of messages) {
    for (const tc of m.toolCalls ?? []) nameById.set(tc.id, tc.name);
  }
  const out: HistoryItem[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ kind: "user", text: m.content });
    } else if (m.role === "assistant") {
      if (m.content) out.push({ kind: "agent", text: m.content });
      else if (m.toolCalls?.length) {
        out.push({
          kind: "agent",
          text: `called ${m.toolCalls.map((t) => t.name).join(", ")}`,
        });
      }
    } else if (m.role === "tool") {
      out.push({
        kind: "tool",
        name: nameById.get(m.toolCallId ?? "") ?? "tool",
        detail: m.content.slice(0, 600),
      });
    }
  }
  return out;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function fmtWhen(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

async function getOrCreateSessionId(ctx: SlashContext): Promise<string | null> {
  if (ctx.sessionId) return ctx.sessionId;
  ctx.say("No active session yet — send a message first.", "system");
  return null;
}

const helpCommand: SlashCommand = {
  name: "help",
  description: "List all slash commands",
  usage: "",
  run: async (_args, ctx) => {
    const lines = SLASH_COMMANDS.map(
      (c) => `  /${c.name}${c.usage ? ` ${c.usage}` : ""} — ${c.description}`,
    );
    ctx.say(`Commands:\n${lines.join("\n")}`, "system");
  },
};

const statusCommand: SlashCommand = {
  name: "status",
  description: "Show session, model, mode, and usage info",
  usage: "",
  run: async (_args, ctx) => {
    const { app } = ctx;
    const m = app.config.model;
    const mcpConfigured = Object.keys(app.config.mcpServers);
    const connected = app.mcpManager.clientMap.size;
    let msgCounts = "no active session";
    let toolCalls = 0;
    if (ctx.sessionId) {
      const msgs = await app.messageStore.getBySession(ctx.sessionId);
      const users = msgs.filter((x) => x.role === "user").length;
      const assistants = msgs.filter((x) => x.role === "assistant").length;
      const tools = msgs.filter((x) => x.role === "tool").length;
      for (const x of msgs) toolCalls += x.toolCalls?.length ?? 0;
      msgCounts = `${msgs.length} messages (you ${users} · agent ${assistants} · tools ${tools})`;
    }
    ctx.say(
      [
        `session: ${ctx.sessionId ? `${shortId(ctx.sessionId)} — ${msgCounts}` : "(new)"}`,
        `model: ${m.provider}/${m.name}${m.apiKey ? "" : " (no key — Mock)"}`,
        `mode: ${ctx.getMode() === "plan" ? "PLAN (read-only)" : "AGENT (full)"}`,
        `tool calls this session: ${toolCalls}`,
        `mcp: ${mcpConfigured.length} configured (${mcpConfigured.join(", ") || "none"}) · ${connected} connected`,
      ].join("\n"),
      "system",
    );
  },
};

const newCommand: SlashCommand = {
  name: "new",
  description: "Start a fresh session",
  usage: "",
  run: async (_args, ctx) => {
    const s = await ctx.app.sessionManager.create(
      ctx.app.workspaceRoot,
      ctx.app.workspaceRoot,
    );
    ctx.setSessionId(s.id);
    ctx.renderHistory([]);
    ctx.say(
      `New session ${shortId(s.id)} • ${ctx.app.config.model.provider}/${ctx.app.config.model.name}`,
      "system",
    );
  },
};

const sessionsCommand: SlashCommand = {
  name: "sessions",
  description: "List previous sessions",
  usage: "",
  run: async (_args, ctx) => {
    const list = await ctx.app.sessionManager.list(10);
    if (!list.length) {
      ctx.say("No previous sessions. Send a message to start one.", "system");
      return;
    }
    const current = ctx.sessionId;
    const lines = list.map(
      (s) =>
        `  ${shortId(s.id)}${s.id === current ? " *" : "  "} ${s.title ?? "(untitled)"} · ${fmtWhen(s.updatedAt)}`,
    );
    ctx.say(
      `Recent sessions (* = current):\n${lines.join("\n")}\n/resume <id> to switch · /rename <title> to title this one`,
      "system",
    );
  },
};

async function switchToSession(id: string, ctx: SlashContext): Promise<void> {
  const s = await ctx.app.sessionManager.get(id);
  if (!s) {
    ctx.say(`Session not found: ${id}`, "system");
    return;
  }
  await ctx.app.preloadSession(id);
  ctx.setSessionId(id);
  const msgs = await ctx.app.messageStore.getBySession(id);
  ctx.renderHistory(toHistoryItems(msgs.slice(-60)));
  ctx.say(
    `Switched to session ${shortId(id)}${s.title ? ` — ${s.title}` : ""} (${msgs.length} messages)`,
    "system",
  );
}

const resumeCommand: SlashCommand = {
  name: "resume",
  description: "Switch to a previous session",
  usage: "<id>",
  run: async (args, ctx) => {
    if (!args) {
      ctx.say("Usage: /resume <id> — see /sessions", "system");
      return;
    }
    const list = await ctx.app.sessionManager.list(50);
    const exact = list.find((s) => s.id === args);
    if (exact) {
      await switchToSession(exact.id, ctx);
      return;
    }
    const matches = list.filter((s) => s.id.startsWith(args));
    if (matches.length === 1) {
      await switchToSession(matches[0].id, ctx);
    } else if (matches.length > 1) {
      ctx.say(
        `Ambiguous id — matches:\n${matches.map((s) => `  ${shortId(s.id)} ${s.title ?? "(untitled)"}`).join("\n")}`,
        "system",
      );
    } else {
      ctx.say(`No session starts with "${args}". See /sessions.`, "system");
    }
  },
};

const renameCommand: SlashCommand = {
  name: "rename",
  description: "Title the current session",
  usage: "<title>",
  run: async (args, ctx) => {
    const sid = await getOrCreateSessionId(ctx);
    if (!sid) return;
    if (!args) {
      const s = await ctx.app.sessionManager.get(sid);
      ctx.say(
        s?.title
          ? `Session ${shortId(sid)} is titled "${s.title}"`
          : `Session ${shortId(sid)} has no title yet. Usage: /rename <title>`,
        "system",
      );
      return;
    }
    await ctx.app.sessionManager.rename(sid, args);
    ctx.say(`Session ${shortId(sid)} renamed to "${args}"`, "system");
  },
};

function keyForProvider(provider: string, app: App): string | undefined {
  if (provider === app.config.model.provider) return app.config.model.apiKey;
  if (provider === "groq") return process.env.GROQ_API_KEY;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  return undefined;
}

const modelCommand: SlashCommand = {
  name: "model",
  description: "Show or switch model (openai/groq)",
  usage: "[provider] [name]",
  run: async (args, ctx) => {
    const { app } = ctx;
    const m = app.config.model;
    if (!args) {
      ctx.say(
        `model: ${m.provider}/${m.name}${m.apiKey ? "" : " (no key — Mock)"}\nSwitch: /model groq · /model openai gpt-4o-mini · /model groq llama-3.1-8b-instant`,
        "system",
      );
      return;
    }
    const [providerRaw, ...nameParts] = args.split(/\s+/);
    const provider = providerRaw.toLowerCase();
    if (provider !== "openai" && provider !== "groq" && provider !== "mock") {
      ctx.say(`Unknown provider "${providerRaw}". Use openai, groq, or mock.`, "system");
      return;
    }
    if (provider === "mock") {
      const mockName = nameParts.join(" ") || m.name;
      app.config.model = { ...m, provider: "mock", name: mockName };
      app.agentLoop.setModelProvider(
        createModelProvider({ provider: "mock", model: mockName }),
        mockName,
      );
      ctx.say(`Model → mock/${mockName} (demo responses)`, "system");
      return;
    }
    const p = provider as "openai" | "groq";
    const name =
      nameParts.join(" ") ||
      (p === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL);
    const apiKey = keyForProvider(provider, app);
    if (!apiKey) {
      const envVar = provider === "groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY";
      ctx.say(
        `No key for ${provider}. Set ${envVar}, run \`shikumi setup\`, or \`shikumi config set model.apiKey <key>\` first.`,
        "system",
      );
      return;
    }
    const baseUrl =
      p === m.provider
        ? m.baseUrl
        : p === "groq"
          ? process.env.GROQ_BASE_URL
          : process.env.OPENAI_BASE_URL;
    app.config.model = { provider: p, name, apiKey, baseUrl };
    app.agentLoop.setModelProvider(
      createModelProvider({ provider: p, apiKey, baseUrl, model: name }),
      name,
    );
    ctx.say(`Model → ${p}/${name}`, "system");
  },
};

const planCommand: SlashCommand = {
  name: "plan",
  description: "Switch to PLAN mode (read-only)",
  usage: "",
  run: async (_args, ctx) => {
    ctx.setMode("plan");
    ctx.say("→ PLAN (read-only)", "system");
  },
};

const agentCommand: SlashCommand = {
  name: "agent",
  description: "Switch to AGENT mode (full access)",
  usage: "",
  run: async (_args, ctx) => {
    ctx.setMode("agent");
    ctx.say("→ AGENT (full access)", "system");
  },
};

const toolsCommand: SlashCommand = {
  name: "tools",
  description: "List available tools",
  usage: "",
  run: async (_args, ctx) => {
    const tools = ctx.app.toolRegistry.list();
    const lines = tools.map(
      (t) => `  ${t.name} — ${t.description.slice(0, 90)}`,
    );
    ctx.say(
      `${tools.length} tools${ctx.getMode() === "plan" ? " (PLAN hides write/run tools)" : ""}:\n${lines.join("\n")}`,
      "system",
    );
  },
};

const mcpCommand: SlashCommand = {
  name: "mcp",
  description: "Show MCP servers or reconnect",
  usage: "[reconnect]",
  run: async (args, ctx) => {
    const { app } = ctx;
    if (args.toLowerCase() === "reconnect") {
      await app.mcpManager.closeAll();
      await app.mcpManager.connectAll().catch(() => {});
      ctx.say(
        `MCP reconnected — ${app.mcpManager.clientMap.size} server(s) connected.`,
        "system",
      );
      return;
    }
    const entries = Object.entries(app.config.mcpServers);
    if (!entries.length) {
      ctx.say(
        "No MCP servers configured. Add them under mcpServers in .shikumi/config.json.",
        "system",
      );
      return;
    }
    const lines = entries.map(([name, entry]) => {
      const connected = app.mcpManager.clientMap.has(name);
      const via =
        entry.transport === "stdio"
          ? `${entry.command} ${(entry.args ?? []).join(" ")}`.trim()
          : entry.url;
      return `  ${connected ? "●" : "○"} ${name} (${entry.transport}: ${via})`;
    });
    ctx.say(`MCP servers:\n${lines.join("\n")}\n/mcp reconnect to retry`, "system");
  },
};

const configCommand: SlashCommand = {
  name: "config",
  description: "Show config (keys redacted)",
  usage: "",
  run: async (_args, ctx) => {
    const cfg = ctx.app.config;
    const redacted = {
      ...cfg,
      model: {
        ...cfg.model,
        apiKey: cfg.model.apiKey
          ? `${cfg.model.apiKey.slice(0, 7)}…${cfg.model.apiKey.slice(-4)}`
          : undefined,
      },
    };
    ctx.say(JSON.stringify(redacted, null, 2), "system");
  },
};

const clearCommand: SlashCommand = {
  name: "clear",
  description: "Clear the screen",
  usage: "",
  run: async (_args, ctx) => {
    ctx.clear();
  },
};

const quitCommand: SlashCommand = {
  name: "quit",
  description: "Exit Shikumi",
  usage: "",
  run: async (_args, ctx) => {
    ctx.exit();
  },
};

export const SLASH_COMMANDS: SlashCommand[] = [
  helpCommand,
  statusCommand,
  newCommand,
  sessionsCommand,
  resumeCommand,
  renameCommand,
  modelCommand,
  planCommand,
  agentCommand,
  toolsCommand,
  mcpCommand,
  configCommand,
  clearCommand,
  quitCommand,
];
