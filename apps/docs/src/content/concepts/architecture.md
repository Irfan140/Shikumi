# Architecture

```
Terminal user ──▶ Shikumi CLI ──▶ Ink + React TUI ──┐
(run · resume ·      (/commands · approvals ·        │
 sessions · setup)    streaming · PLAN / AGENT)      │
                                                     ▼
Config (BYOK) ──────────────────▶ createApp() composition
.shikumi/config.json · env ·      model · tools · sessions · mcp
setup wizard · never baked in     no DI framework
                                         │
                                         ▼
                                      AgentLoop
                 stream → permission gate → execute → persist, repeat
                                         │
        ┌────────────┬───────────┼───────────┬────────────┐
        ▼            ▼           ▼           ▼            ▼
  Model providers  Context    Sessions   Permissions  Observability
  OpenAI · Groq  MessageStore Session-   PLAN read-   LangSmith
  · Mock         last 100    Manager →   only ·       opt-in ·
                 system      SQLite WAL  y/n/always   pino logs
                 prompt      (mem fallback)

ToolRegistry ──lookup──▶ ToolExecutor ──executes──▶ Built-in tools ──▶ Local workspace
(definitions ·           (Zod-validate                        read · write · list ·   safe-path
 plan filter ·            → execute ·                          search · run_command   confined
 built-ins +              permission-gated)                    git_* · time · web     cwd = root
 adapted MCP tools)                                                  ▲
                                                                     │ registers
MCP Manager (stdio) ──▶ Adapter ──▶ External MCP servers ────────────┘
per-run connectAll      inputSchema → Tool   user-configured
```

The docs site is a separate static Vite app. It is not part of the agent loop.

## Data flow

1. **Compose once** — `createApp()` (`src/application/bootstrap/create-app.ts`) loads config, opens SQLite (or in-memory fallback), and wires `SessionManager`, `ToolRegistry` + built-ins, `McpManager`, the model provider, `ContextManager`, `RunManager`, and `AgentLoop`.
2. **Run loop** — `AgentLoop` persists the user message, builds context (last 100 messages + mode-specific system prompt), and streams the model. Tool calls go through `needsPermission()`; in the TUI an approval prompt (`y` / `n` / `a`, `Tab` to switch mode and allow) resolves via `requestPermission`. Headless `shikumi run` allows in AGENT mode and denies in PLAN mode.
3. **Execute** — `ToolExecutor` parses arguments against the tool's Zod schema, runs it, and appends the result to both the SQLite `messages` table and the in-memory `MessageStore`. The loop repeats until the model answers without tool calls (max 10 iterations).
4. **Events** — every step is emitted as an `AgentEvent` (`run.started`, `model.text.delta`, `tool.completed`, …), which is what the TUI renders. Headless mode prints the same events as text.

## Module map

| Area | Modules |
|------|---------|
| Entry | `src/cli/index.ts` (commands), `src/cli/cli.ts` (one-shot runs), `src/cli/setup.ts` (BYOK wizard) |
| TUI | `src/ui/app.tsx` (view), `src/ui/slash.ts` (`/` commands), `src/ui/viewport.ts` (row-budgeted rendering), `src/ui/items.ts` |
| Composition | `src/application/bootstrap/create-app.ts` |
| Runtime | `src/agent/runtime/agent-loop.ts`, `run-manager.ts`, `events.ts` |
| Models | `src/agent/models/providers/openai-provider.ts` (`OpenAIProvider`, `GroqProvider`, `MockProvider`, `createModelProvider()`) |
| Context | `src/agent/context/context-manager.ts`, `message-store.ts` |
| Permissions | `src/agent/permissions/permissions.ts` (`PLAN_ALLOWED`, `CRITICAL_TOOLS`) |
| Tools | `src/agent/tools/` (registry, executor) + `src/tools/` (filesystem, shell, git, time, websearch) |
| MCP | `src/mcp/manager/mcp-manager.ts`, `src/mcp/adapter/mcp-tool-adapter.ts` |
| Sessions | `src/sessions/` (manager, SQLite + in-memory repositories) |
| Config | `src/config/config.ts`, `schema.ts` |
| Infra | `src/infrastructure/` (SQLite WAL, safe-path, process exec, logging, tracing) |

## Principles

- Runtime depends on ports (`ModelProvider`, `ToolRegistry`, `ContextManager`) — never on concrete OpenAI/MCP/SQLite classes.
- `AgentEvent`s decouple the loop from the UI; the TUI and the headless CLI consume the same stream.
- Explicit `createApp()` composition — no DI framework.
- Workspace confinement via `resolveSafePath`; shell/git via `execa` with cwd set to the workspace.
- Message history orders by insertion (`rowid`), and session preload runs once per process to avoid duplicating context.

## Stack

TypeScript · Bun · Zod · Ink + React · MCP SDK (stdio) · SQLite (`bun:sqlite`, WAL) · Pino · Biome · OpenAI + Groq (OpenAI-compatible) · LangSmith tracing (opt-in)
