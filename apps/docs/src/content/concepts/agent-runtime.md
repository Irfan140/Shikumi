# Agent Runtime

The runtime drives the agent loop: prompt → model → tool → model → final.

```
User Input → ContextManager.buildContext() → ModelProvider.stream()
        → toolCalls? → ToolExecutor → append tool result → loop
        → no tools → persist assistant message → done
```

## Components

- **AgentLoop** (`src/agent/runtime/agent-loop.ts`) — async generator yielding `AgentEvent`s: `run.started`, `model.started`, `model.text.delta`, `model.completed`, `tool.started/completed/failed`, `permission.requested`, `run.completed/failed`.
- **RunManager** — tracks run lifecycle per session.
- **ContextManager** — `MessageStore` append + `buildContext` (last 100 messages) + `getSystemPrompt()`.

## Streaming & Permissions

Deltas are batched 32ms to avoid TUI shake. Critical tools check `needsPermission(tool, mode)` — in PLAN only `read_*`, `git_*`, `web_search` are allowed; otherwise a permission prompt (`y/n/a`, `Tab` to switch) is yielded.

## Tracing

If `LANGSMITH_TRACING=true`, `OpenAIProvider` / `GroqProvider` are wrapped via `langsmith/wrappers/openai` and `AgentLoop`/`ToolExecutor` are wrapped via `traceable` — all LLM and tool calls appear in LangSmith.

## Model Providers

`createModelProvider()` picks the client from `model.provider`: `openai` → `OpenAIProvider`, `groq` → `GroqProvider` (OpenAI-compatible, defaults to `https://api.groq.com/openai/v1` + `llama-3.3-70b-versatile`), anything without a key → `MockProvider`.
