import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { FilesystemError } from "../../errors/errors.js";
import { resolveSafePath } from "../../infrastructure/filesystem/safe-path.js";
import { createTool } from "../../agent/tools/tool.js";

export function filesystemTools() {
  return [readFileTool(), writeFileTool(), listDirectoryTool(), searchFilesTool()];
}

function readFileTool() {
  return createTool({
    name: "read_file",
    description: "Read a file from the workspace. Path is relative to workspace root.",
    inputSchema: z.object({ path: z.string().min(1) }),
    execute: async ({ path }, ctx) => {
      const abs = resolveSafePath(ctx.workspaceRoot, path);
      if (!existsSync(abs)) return { success: false, content: `File not found: ${path}`, isError: true };
      try {
        const data = readFileSync(abs, "utf-8");
        return { success: true, content: data.slice(0, 50000) };
      } catch (e) {
        throw new FilesystemError((e as Error).message, e);
      }
    },
  });
}

function writeFileTool() {
  return createTool({
    name: "write_file",
    description: "Write content to a file. Creates parent directories if needed.",
    inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
    execute: async ({ path, content }, ctx) => {
      const abs = resolveSafePath(ctx.workspaceRoot, path);
      try {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, "utf-8");
        return { success: true, content: `Wrote ${content.length} bytes to ${path}` };
      } catch (e) {
        throw new FilesystemError((e as Error).message, e);
      }
    },
  });
}

function listDirectoryTool() {
  return createTool({
    name: "list_directory",
    description: "List files and directories at a path.",
    inputSchema: z.object({ path: z.string().default(".") }),
    execute: async ({ path }, ctx) => {
      const abs = resolveSafePath(ctx.workspaceRoot, path);
      if (!existsSync(abs)) return { success: false, content: `Not found: ${path}`, isError: true };
      try {
        const entries = readdirSync(abs, { withFileTypes: true }) as unknown as { isDirectory(): boolean; name: string }[];
        const lines = entries.map((e) => `${e.isDirectory() ? "dir " : "file"} ${String(e.name)}`);
        return { success: true, content: lines.join("\n") || "(empty)" };
      } catch (e) {
        throw new FilesystemError((e as Error).message, e);
      }
    },
  });
}

function searchFilesTool() {
  return createTool({
    name: "search_files",
    description: "Search for a pattern in files under workspace.",
    inputSchema: z.object({ pattern: z.string().min(1), path: z.string().default(".") }),
    execute: async ({ pattern, path }, ctx) => {
      const abs = resolveSafePath(ctx.workspaceRoot, path);
      const results: string[] = [];
      const walk = (dir: string, depth = 0) => {
        if (depth > 6 || results.length > 50) return;
        let entries: ReturnType<typeof readdirSync>;
        try { entries = readdirSync(dir, { withFileTypes: true }) as unknown as ReturnType<typeof readdirSync>; } catch { return; }
        for (const e of entries) {
          const name = String(e.name);
          if (name.startsWith(".") || name === "node_modules") continue;
          const full = join(dir, name);
          if (e.isDirectory()) walk(full, depth + 1);
          else if (name.includes(pattern)) results.push(full.replace(ctx.workspaceRoot, "."));
          else {
            try {
              const stat = statSync(full);
              if (stat.size > 200000) continue;
              const c = readFileSync(full, "utf-8");
              if (c.includes(pattern)) results.push(full.replace(ctx.workspaceRoot, "."));
            } catch {}
          }
          if (results.length > 50) break;
        }
      };
      walk(abs);
      return { success: true, content: results.join("\n") || "No matches" };
    },
  });
}
