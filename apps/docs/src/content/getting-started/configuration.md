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
    "provider": "groq",
    "name": "llama-3.3-70b-versatile",
    "apiKey": "gsk-...",
    "baseUrl": "https://api.groq.com/openai/v1"
  },
  "mcpServers": {
    "my-server": { "transport": "stdio", "command": "node", "args": ["server.js"] }
  }
}
```

`provider` is `"openai"` (default), `"groq"`, or `"mock"`. Groq speaks the OpenAI chat-completions API, so tool calling works the same way.

## Env Vars

| Var | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | OpenAI key (BYOK) |
| `GROQ_API_KEY` | Groq key (BYOK) |
| `SHIKUMI_PROVIDER` / `HARNESS_PROVIDER` | `openai` \| `groq` \| `mock` (auto-detected from keys if unset) |
| `SHIKUMI_MODEL` / `HARNESS_MODEL` | Model name (any provider) |
| `OPENAI_MODEL` / `GROQ_MODEL` | Model name for that provider |
| `OPENAI_BASE_URL` / `GROQ_BASE_URL` | Custom base URL / proxy |
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
