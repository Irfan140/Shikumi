import { z } from "zod";
import { createTool } from "../../agent/tools/tool.js";
import { execCommand } from "../../infrastructure/process/exec.js";

export function gitTools() {
  return [gitStatusTool(), gitDiffTool(), gitLogTool()];
}

function gitStatusTool() {
  return createTool({
    name: "git_status",
    description: "Show git status (porcelain)",
    inputSchema: z.object({}),
    execute: async (_, ctx) => {
      const r = await execCommand("git", ["status", "--porcelain", "-b"], {
        cwd: ctx.workspaceRoot,
      });
      return { success: true, content: r.stdout || r.stderr || "(clean)" };
    },
  });
}
function gitDiffTool() {
  return createTool({
    name: "git_diff",
    description: "Show git diff",
    inputSchema: z.object({ staged: z.boolean().optional().default(false) }),
    execute: async ({ staged }, ctx) => {
      const args = staged ? ["diff", "--staged"] : ["diff"];
      const r = await execCommand("git", args, { cwd: ctx.workspaceRoot });
      return {
        success: true,
        content: r.stdout.slice(0, 40000) || "(no diff)",
      };
    },
  });
}
function gitLogTool() {
  return createTool({
    name: "git_log",
    description: "Show recent git log",
    inputSchema: z.object({
      count: z.number().int().min(1).max(50).default(10),
    }),
    execute: async ({ count }, ctx) => {
      const r = await execCommand(
        "git",
        ["log", `--max-count=${count}`, "--oneline"],
        { cwd: ctx.workspaceRoot },
      );
      return { success: true, content: r.stdout || "(no commits)" };
    },
  });
}
