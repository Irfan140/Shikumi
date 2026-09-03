# Configuration Reference

All keys also support env overrides.

```ts
{
  model: { provider: "openai"|"groq"|"mock", name: "gpt-4o-mini", apiKey: string, baseUrl: string },
  workspace: { root: string },
  mcpServers: Record<string, { transport: "stdio"|"streamable-http", command?: string, args?: string[], env?: Record<string,string>, url?: string }>,
  ui: { theme?: string },
  logging: { level: "info" },
  persistence: { sqlitePath: ".shikumi/shikumi.db" }
}
```

Defaults: OpenAI → `gpt-4o-mini`; Groq → `llama-3.3-70b-versatile` (`https://api.groq.com/openai/v1`).

Env: `OPENAI_API_KEY`, `GROQ_API_KEY`, `SHIKUMI_PROVIDER`, `SHIKUMI_MODEL`, `OPENAI_MODEL`, `GROQ_MODEL`, `OPENAI_BASE_URL`, `GROQ_BASE_URL`, `LOG_LEVEL`, `LANGSMITH_*`.
