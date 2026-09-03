# AGENTS.md — working in the Shikumi repo

Shikumi is a terminal-first AI agent harness (TypeScript + Bun + Ink + React).
The model streams, calls tools, and persists sessions to SQLite. This file tells
an agent (human or otherwise) how to change the repo without breaking it.

## 1. Toolchain and commands

- Runtime and package manager is **Bun ≥ 1.0** (`bun install`). Do not use npm/node for the harness itself.
- From the repo root:
  - `bun run dev` / `bun run start` — run the TUI from source
  - `bun run build` — bundle `src/cli/index.ts` → `dist/` (must stay green)
  - `bun run typecheck` — `tsc --noEmit` over `src/` (must stay green)
  - `bun run lint` — `biome check src` (must stay green; line endings are CRLF)
  - `bun run format` — `biome format src --write`
- Docs app (`apps/docs`, Vite + React 19): `bun run docs:dev`, `bun run docs:build`
  (`tsc -b && vite build`), `bun --filter docs lint` (oxlint).
- CI (`.github/workflows/publish.yml`, on release) runs install → typecheck → lint → build.
- Commits follow conventional style: `fix: …`, `feat: …` (see `git log`).
  Keep PRs focused; run typecheck + lint + build before asking for review.
  Line endings are mixed across the repo (older files CRLF, newer LF) —
  match the file you are editing; do not mass-convert.

## 2. Layout

```
src/
  cli/            entry: index.ts (commands), cli.ts (one-shot), setup.ts (BYOK wizard)
  ui/             app.tsx (TUI view), slash.ts (/commands), viewport.ts (render window),
                  items.ts (shared Item type)
  application/bootstrap/create-app.ts   composition root — wire everything here
  agent/
    runtime/      agent-loop.ts, run-manager.ts, events.ts
    models/       model-provider.ts, model-types.ts, providers/openai-provider.ts
    tools/        tool.ts, tool-registry.ts, tool-executor.ts
    context/      context-manager.ts, message-store.ts
    permissions/  permissions.ts
  tools/          built-ins: filesystem, shell, git, time, websearch (+ index.ts registrar)
  mcp/            manager/mcp-manager.ts, adapter/mcp-tool-adapter.ts, config/schema.ts
  sessions/       session-manager.ts, repository.ts (SQLite + in-memory), models.ts
  config/         config.ts (load + env merge), schema.ts (zod source of truth)
  infrastructure/ database/sqlite.ts, filesystem/safe-path.ts, process/exec.ts,
                  logging/logger.ts, tracing/index.ts
  errors/errors.ts  ShikumiError taxonomy (codes: MODEL_ERROR, TOOL_ERROR, …)
apps/docs/        standalone Vite docs site (NOT part of the agent runtime)
```

## 3. Architecture in 30 seconds

`createApp()` composes config → sessions → tools → MCP → model → context → loop.
`AgentLoop` repeats: build context → `modelProvider.stream()` → permission gate →
`ToolExecutor` → persist to SQLite **and** the in-memory store. Every step emits an
`AgentEvent`; the TUI and headless `shikumi run` consume the same stream.
The docs site is static and takes no part in the loop.

## 4. TypeScript conventions

- ESM with **`.js` import suffixes** in `src/` (`from "./tool.js"`), `moduleResolution: bundler`.
- Zod schemas are the contract: `src/config/schema.ts` for config, per-tool
  `inputSchema` for tools. Prefer `z` defaults/coercion at the boundary, not in `execute`.
- Errors: throw `ShikumiError` subclasses with codes, never raw `Error` across module
  boundaries. Tool failures that the model should see come back as
  `{ success: false, content, isError: true }`, not exceptions.
- No DI framework. New collaborators are constructed in `createApp()` and passed
  explicitly (ports: `ModelProvider`, `ToolRegistry`, `ContextManager`).

## 5. Config and model providers (BYOK)

- Secrets are **never** committed: `.shikumi/`, `.env*` (except `.env.example`) are
  gitignored. `shikumi config` redacts keys; keep it that way.
- Precedence: explicit `SHIKUMI_PROVIDER`/`HARNESS_PROVIDER` env → `model.provider`
  in config file → auto-detect from present keys → `openai`. Model name:
  `SHIKUMI_MODEL`/`HARNESS_MODEL` → `GROQ_MODEL`/`OPENAI_MODEL` → file → per-provider default.
- Providers live in `src/agent/models/providers/openai-provider.ts` and are chosen by
  `createModelProvider()`. Groq works because it is OpenAI-compatible (chat completions
  + tool calls over a different `baseURL`).
- Adding a provider means touching **all** of: `ConfigSchema` enum + defaults
  (`config/schema.ts`), env resolution (`config/config.ts`), provider class + factory,
  `cli/setup.ts` wizard, TUI header/`/model` (`ui/app.tsx`, `ui/slash.ts`),
  `.env.example`, README, and `apps/docs` config pages. Miss one and BYOK breaks.

## 6. Tools

- Define with `createTool({ name, description, inputSchema, execute })`.
  `execute` receives **already-validated** input plus `ToolContext`
  (`workspaceRoot`, `workingDirectory`, `sessionId`, `runId`).
- Register in `src/tools/index.ts`. `ToolRegistry.register` throws on duplicate names.
- Read-only tools belong in `PLAN_ALLOWED` (`agent/permissions/permissions.ts`);
  destructive ones go in `CRITICAL_TOOLS`. PLAN mode hides non-allowed tools via
  `definitionsForMode()`; unknown MCP tools auto-allow in AGENT mode, so treat
  third-party MCP servers as trusted.
- Filesystem access must go through `resolveSafePath(ctx.workspaceRoot, path)`.
  Shell/git go through `execCommand` with `cwd` set. Report real exit codes:
  `success: false, isError: true` on failure (never `success: true` with an error message).
- `web_search` has no search-API key: fetch direct URLs, DuckDuckGo instant answers
  as fallback, honest message otherwise. No hardcoded personal domains.

## 7. TUI rules (Ink + React)

- The render window is **row-budgeted, not item-counted** (`ui/viewport.ts`):
  estimate wrap-aware rows, reserve chrome (header, input, footer, popups), fill
  newest-first. Rendering more rows than the terminal holds causes scroll jitter
  ("shaking") on every 32 ms flush — never regress this.
- While scrolled up, `push()`/`update()`/`flushQueued()` must keep working on both
  the queued and visible lists; streamed text must not duplicate on scroll-back.
- Shared view types live in `ui/items.ts`. Slash commands live in `ui/slash.ts`
  (registry + `runSlashCommand` + history mapping) — add commands there, wire keys
  and the palette in `ui/app.tsx`.
- `AgentLoop` runtime knobs the TUI needs (`getMode`, `requestPermission`,
  `setModelProvider`) are set through methods/opts, not by reaching into privates.

## 8. Sessions and persistence

- SQLite WAL at `.shikumi/shikumi.db` (`sessions`, `messages`); `bun:sqlite`.
  Order history by `rowid` (insertion), never by `created_at` (same-ms ties).
- `createApp().preloadSession()` loads a session into the store **once per process**
  (loaded-set + non-empty-store guard). Re-preloading duplicates context every turn.
- If the DB can't open, the app falls back to in-memory repos — sessions work for
  the process lifetime but don't persist. `resume <unknown-id>` must error, never
  insert orphan messages (FK constraint).
- `SessionManager` is the only writer of session rows (`create/get/list/rename`).

## 9. MCP

- Only the **stdio** transport is wired (`StdioClientTransport`). `streamable-http`
  entries parse in config but are skipped at connect — say so in docs; do not claim
  otherwise. `adaptMcpTool` converts `inputSchema` → Zod and registers into the
  shared `ToolRegistry`; `closeAll()` unregisters.

## 10. Docs (`apps/docs`)

- Content is raw `.md` imported via `import.meta.glob`; every page needs **both**
  an entry in `content/nav.ts` **and** the `findFile` map in `pages/Docs.tsx`.
- `components/Architecture.tsx` is the visual source of truth: every box must name
  a real module and every edge must follow a real call/data direction. Keep
  `concepts/architecture.md` in sync with it.
- Styling is deliberately neutral (dark zinc, one amber accent, system fonts,
  8 px radii, flat panels). No gradients, glow shadows, pill buttons, hover lifts,
  or emoji. Match the existing tone when adding sections.

## 11. Verification (no test framework — prove it)

- Write throwaway `bun` scripts **outside the repo** (e.g. `%TEMP%/opencode/*.ts`),
  run them with CWD in a `mkdtemp` dir, and `delete process.env[…]` for keys first
  (Bun auto-loads `.env.development`, and this repo's real-looking dev keys must
  never leak into assertions or output).
- Cover: config precedence per provider, factory selection, tool success flags,
  store-vs-DB message counts after runs + preloads, slash-command side effects.
- Never leave stray files, sessions, or `.shikumi/` dirs in the repo; `git status`
  should show only intended edits. Never print or commit secrets.

## 12. Pitfalls (learned the hard way)

- Calling `tool.execute()` directly bypasses Zod defaults — production always goes
  through `ToolExecutor`. Test through the executor or pass full inputs.
- `messageStore` (in-memory context) vs `messageRepo` (SQLite truth) — writes go to
  both, reads for the model come from the store.
- Headless runs have no approval UI: AGENT auto-allows, PLAN auto-denies.
- `AgentEvent` is the UI contract: add variants in `events.ts` and handle them in
  **both** `ui/app.tsx` and `cli/cli.ts`.
- `MockProvider` messages must name the right key env var per provider.
