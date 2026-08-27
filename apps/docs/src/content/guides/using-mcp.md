# Using MCP

```json
// .shikumi/config.json
{
  "mcpServers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/allowed/path"]
    }
  }
}
```

```bash
shikumi
# → MCP servers connected: filesystem
```

Tools from the server are listed via `client.listTools()` and appear as normal tools. Use `Tab` to stay in PLAN if you want to review before allowing writes.

HTTP transport is scaffolded for future `streamable-http` servers.
