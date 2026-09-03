# Shikumi

**From Intelligence to Action.**

Shikumi is an extensible AI agent harness that provides models with the tools, context, and execution environment required to perform real-world tasks.

## Features

- **Terminal TUI** — Ink + React streaming interface with PLAN (read-only) / AGENT (full) modes and permission prompts
- **Tool System** — `ToolRegistry` + `ToolExecutor` with Zod validation, safe-path, and MCP auto-adaptation
- **MCP Integration** — stdio & HTTP transports for external tool servers
- **Sessions** — SQLite WAL persistence, `shikumi resume <id>` restores context
- **BYOK** — `shikumi setup` / `.shikumi/config.json` / env, never baked into builds. OpenAI **and** Groq supported (`provider: "openai" | "groq"`, `OPENAI_API_KEY` / `GROQ_API_KEY`)
- **Observability** — LangSmith tracing for LLM and tool calls

## Architecture

```
              CLI (shikumi)
                    │
                    ▼
             Agent Runtime
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
     Model        Tools         MCP
       │            │            │
       └────────────┼────────────┘
                    ▼
                Execution → Real World
```

Runtime depends on ports (`ModelProvider`, `ToolRegistry`, `ContextManager`) via explicit `createApp()` composition — no DI framework.

## Installation

Requires **Bun** ≥1.0.

```bash
git clone https://github.com/your-org/shikumi.git && cd shikumi
bun install
cp .env.example .env.development # add OPENAI_API_KEY and/or GROQ_API_KEY
bun run dev
```

## Model Providers (BYOK)

| Provider | Key env | Default model | Default base URL |
|----------|---------|---------------|------------------|
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | `https://api.openai.com/v1` |
| `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | `https://api.groq.com/openai/v1` |

Groq is OpenAI-compatible, so it works with the same chat-completions + tool-calling path. Pick it three ways:

```bash
shikumi setup                      # choose groq, paste a gsk_... key
shikumi config set model.provider groq
shikumi config set model.apiKey gsk-...
# or via env:
SHIKUMI_PROVIDER=groq GROQ_API_KEY=gsk_... GROQ_MODEL=llama-3.3-70b-versatile shikumi
# or .shikumi/config.json:
# { "model": { "provider": "groq", "name": "llama-3.3-70b-versatile", "apiKey": "gsk-..." } }
```

## Quick Start

```bash
shikumi                 # interactive TUI
shikumi run "list files and summarize"
shikumi resume <id> "continue"
shikumi config          # redacted
shikumi setup           # BYOK wizard
```

## Example

```bash
▶ You
list files

● shikumi
◐ list_directory running…
✓ list_directory done
```

## Documentation

Full docs: run locally with `bun run docs:dev` → http://localhost:5173 or see `apps/docs`.

- What is Shikumi, Why Shikumi, Architecture, Agent Runtime, Tools, MCP, Configuration, Installation, CLI, Roadmap

## Contributing

PRs welcome. Keep changes focused, run `bun run typecheck && bun run lint && bun run build`.

## License

MIT — see [LICENSE](./LICENSE)
