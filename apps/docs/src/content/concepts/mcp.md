# MCP Integration

Model Context Protocol (MCP) extends Shikumi with external tool servers.

## Manager

`McpManager` (`src/mcp/manager/mcp-manager.ts`) reads `config.mcpServers`:

```json
{
  "my-server": { "transport": "stdio", "command": "node", "args": ["server.js"] },
  "remote": { "transport": "streamable-http", "url": "https://example.com/mcp" }
}
```

For each server it creates `new Client({name: shikumi-<name>})` via `@modelcontextprotocol/client`, connects via `StdioClientTransport`, calls `listTools()`, and adapts each via `adaptMcpTool` into the internal `ToolRegistry`.

## Adapter

`adaptMcpTool` converts MCP `inputSchema` to a `Tool` and proxies `callTool` → `client.callTool`. Tools are registered and unregistered on `connectAll` / `closeAll`.

On `shikumi run`, `AgentLoop` calls `mcpManager.connectAll()` before the loop so MCP tools appear alongside built-ins. In PLAN mode they are filtered unless allowed.

## Future

HTTP streaming transport and authenticated headers are scaffolded.
