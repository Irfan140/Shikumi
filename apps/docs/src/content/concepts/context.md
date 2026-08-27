# Context & Sessions

## MessageStore & ContextManager

`InMemoryMessageStore` holds `ModelMessage[]` per session. `ContextManager` appends, builds context (last 100), and exposes `defaultSystemPrompt(workspaceRoot)`.

System prompt includes workspace path, UTC time, available tools, and mode hint (`PLAN` vs `AGENT`).

## Sessions

`SessionManager` + `SqliteMessageRepository` / `SqliteSessionRepository` (or in-memory fallback) persist to `.shikumi/shikumi.db`.

```ts
const s = await sessionManager.create(workspaceRoot, workspaceRoot)
// id, workspaceRoot, createdAt
await messageRepo.append(sessionId, runId, msg)
```

`shikumi resume <id>` preloads messages into the store, then continues the loop. `shikumi sessions` lists recent sessions.

Scrolling in the TUI is frozen while scrolled up (queued items + deltas) to prevent auto-scroll snap.
