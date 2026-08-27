import { z } from "zod";
import { createTool } from "../../agent/tools/tool.js";
import { execCommand } from "../../infrastructure/process/exec.js";

export function shellTool() {
  return createTool({
    name: "run_command",
    description: "Run a shell command in the workspace. Use args array. Example: command=bash args=['-lc','ls -la'] or command=npm args=['test']",
    inputSchema: z.object({
      command: z.string().min(1),
      args: z.array(z.string()).default([]),
      timeout: z.number().optional().default(30000),
    }),
    execute: async ({ command, args, timeout }, ctx) => {
      const result = await execCommand(command, args, { cwd: ctx.workspaceRoot, timeout });
      const out = `exit: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\nduration: ${result.durationMs}ms`;
      return { success: !result.failed && result.exitCode === 0, content: out, data: result, isError: result.failed || result.exitCode !== 0 };
    },
  });
}
