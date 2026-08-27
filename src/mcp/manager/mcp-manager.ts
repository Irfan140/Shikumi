import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { AppConfig } from "../../config/schema.js";
import { adaptMcpTool } from "../adapter/mcp-tool-adapter.js";
import type { Tool } from "../../agent/tools/tool.js";
import type { ToolRegistry } from "../../agent/tools/tool-registry.js";

export class McpManager {
  private clients = new Map<string, Client>();
  private tools: Tool[] = [];

  constructor(private config: AppConfig, private registry: ToolRegistry) {}

  async connectAll(): Promise<void> {
    for (const [name, entry] of Object.entries(this.config.mcpServers)) {
      try {
        const client = new Client({ name: `shikumi-${name}`, version: "0.1.0" });
        if (entry.transport === "stdio") {
          const transport = new StdioClientTransport({ command: entry.command, args: entry.args, env: { ...process.env, ...(entry.env ?? {}) } as Record<string, string> });
          await client.connect(transport);
          this.clients.set(name, client);
        } else {
          console.error(`[mcp] transport streamable-http not yet implemented for ${name} — skipping`);
          continue;
        }
        const listed = await client.listTools();
        for (const t of listed.tools) {
          const adapted = adaptMcpTool(
            { name: t.name, description: t.description, inputSchema: t.inputSchema as Record<string, unknown> },
            async (toolName, args) => {
              const res = await client.callTool({ name: toolName, arguments: args as Record<string, unknown> });
              return res as { content: { type: string; text?: string }[]; isError?: boolean };
            },
          );
          try {
            this.registry.register(adapted);
            this.tools.push(adapted);
          } catch {}
        }
      } catch (e) {
        console.error(`[mcp] failed to connect ${name}:`, (e as Error).message);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const [, client] of this.clients) {
      try {
        await client.close();
      } catch {}
    }
    for (const t of this.tools) {
      try { this.registry.unregister(t.name); } catch {}
    }
    this.clients.clear();
    this.tools = [];
  }
  get clientMap() { return this.clients; }
}
