# Configuration

Shikumi loads config in priority order:

1. `.shikumi/config.json`
2. `shikumi.config.json`
3. `.shikumirc.json`
4. Legacy `.harness/*` fallbacks
5. Env overrides

## File Example

```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o-mini",
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1"
  },
  "mcpServers": {
    "my-server": { "transport": "stdio", "command": "node", "args": ["server.js"] }
  }
}
```

## Env Vars

| Var | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Shikumi model key (BYOK) |
| `SHIKUMI_MODEL` / `HARNESS_MODEL` | Model name |
| `OPENAI_BASE_URL` | Azure/OpenRouter proxy |
| `LANGSMITH_TRACING=true` | Enable tracing |
| `LANGSMITH_API_KEY` | LangSmith key |
| `LANGSMITH_PROJECT` | Project name |

Keys are never baked into builds. `shikumi config` redacts them.

## Persistence

```json
{
  "persistence": { "sqlitePath": ".shikumi/shikumi.db" }
}
```

WAL mode SQLite stores `sessions` + `messages`.
