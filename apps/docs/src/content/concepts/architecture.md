# Architecture

```
              CLI (shikumi) — Ink + React, Bun
                        │
                        ▼
                 Application Layer
                 createApp() composition root
                        │
                        ▼
                  Agent Runtime
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
         Model        Context       Tools
        Provider      Manager      Registry
           │            │             │
           └────────────┼─────────────┘
                        ▼
                     Execution
                        │
                        ▼
                    Real World
                   (fs, shell, git, web, MCP)
```

## Principles

- Ports depend on `ModelProvider`, `ToolRegistry`, `SessionRepository` — not concrete OpenAI/MCP/SQLite.
- Events (`AgentEvent`) decouple runtime from UI.
- Explicit `createApp()` — no DI framework.
- Workspace-relative `safe-path` + `execa` for isolation.

## Stack

TypeScript · Bun · Zod · Ink · MCP SDK · SQLite · Pino · Biome · OpenAI · LangSmith (opt-in)
