# Configuration Reference

All keys also support env overrides.

```ts
{
  model: { provider: "openai"|"mock", name: "gpt-4o-mini", apiKey: string, baseUrl: string },
  workspace: { root: string },
  mcpServers: Record<string, { transport: "stdio"|"streamable-http", command?: string, args?: string[], env?: Record<string,string>, url?: string }>,
  ui: { theme?: string },
  logging: { level: "info" },
  persistence: { sqlitePath: ".shikumi/shikumi.db" }
}
```

Env: `OPENAI_API_KEY`, `SHIKUMI_MODEL`, `OPENAI_BASE_URL`, `LOG_LEVEL`, `LANGSMITH_*`.
