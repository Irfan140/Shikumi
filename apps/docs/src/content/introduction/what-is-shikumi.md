# What is Shikumi?

**From Intelligence to Action.** *An extensible AI agent harness for the terminal.*

Shikumi is an extensible AI agent harness that provides models with the tools, context, and execution environment required to perform real-world tasks. It is written in TypeScript and runs on **Bun** — fast, modern, and built for the terminal.

Shikumi is not a model. It is the harness that surrounds the model: the CLI that invokes it, the runtime that drives it, the context that grounds it, the tools that empower it, and the protocols that extend it.

```bash
shikumi
# → Interactive TUI with streaming, plan/agent modes, and permission prompts
```

With Shikumi, a language model becomes an agent that can read files, write code, run commands, query git, search the web, and call external tools via the Model Context Protocol (MCP) — all while preserving session state in SQLite and streaming results to your terminal.
