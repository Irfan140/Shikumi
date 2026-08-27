import { filesystemTools } from "./filesystem/tools.js";
import { gitTools } from "./git/tools.js";
import { shellTool } from "./shell/tool.js";
import { timeTool } from "./time/tool.js";
import { webSearchTool } from "./websearch/tool.js";
import type { ToolRegistry } from "../agent/tools/tool-registry.js";

export function registerBuiltInTools(registry: ToolRegistry) {
  for (const t of [...filesystemTools(), shellTool(), ...gitTools(), timeTool(), webSearchTool()]) registry.register(t);
}
