# Tool System

Tools are the agent's hands. They are unified via `ToolRegistry`.

## Interface

```ts
createTool({
  name: "write_file",
  description: "Write content to a file...",
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  execute: async ({path, content}, ctx) => {
    const abs = resolveSafePath(ctx.workspaceRoot, path);
    writeFileSync(abs, content)
    return { success: true, content: `Wrote ${content.length} bytes` }
  }
})
```

- **Tool** — `name`, `description`, `inputSchema` (Zod), `jsonSchema`, `execute`.
- **ToolRegistry** — `register`, `get`, `definitions()` / `definitionsForMode()`.
- **ToolExecutor** — validates via Zod, then executes, wrapped with LangSmith tracing when enabled.
- **ToolContext** — `workspaceRoot`, `workingDirectory`, `sessionId`, `runId`.

## Built-in Tools

`read_file`, `write_file`, `list_directory`, `search_files`, `run_command`, `git_status`, `git_diff`, `git_log`, `get_current_time`, `web_search` — all workspace-relative via `safe-path` and `execa`.

## Modes

`PLAN_ALLOWED = read_file, list_directory, search_files, git_*, get_current_time, web_search`. In PLAN, others need approval. `CRITICAL = write_file, run_command` always need `y/n/a` in AGENT.
