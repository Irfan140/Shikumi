import { ToolError } from "../../errors/errors.js";
import type { Tool } from "./tool.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name))
      throw new ToolError(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  definitions() {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.jsonSchema,
    }));
  }

  definitionsForMode(mode: string, allowSet?: Set<string>) {
    if (mode === "agent") return this.definitions();
    const allowed =
      allowSet ??
      new Set([
        "read_file",
        "list_directory",
        "search_files",
        "git_status",
        "git_diff",
        "git_log",
        "get_current_time",
        "web_search",
      ]);
    return this.list()
      .filter((t) => allowed.has(t.name))
      .map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.jsonSchema,
      }));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}
