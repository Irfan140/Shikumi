# Sessions

Sessions give continuity. Each run is tied to a `sessionId`.

## Lifecycle

```ts
create → append user → loop → persist assistant/tool messages → complete/fail
```

Storage is SQLite WAL at `.shikumi/shikumi.db` (`sessions` + `messages` tables, `bun:sqlite`). If DB unavailable, falls back to in-memory.

## Commands

```bash
shikumi sessions              # list 20 recent
shikumi resume abc123         # TUI resumed
shikumi resume abc123 "fix"   # non-interactive continuation
```

Preload merges DB messages into the in-memory store before the next model call.
