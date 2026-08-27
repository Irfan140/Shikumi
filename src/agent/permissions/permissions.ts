export type AgentMode = "plan" | "agent";
export type PermissionDecision = "allow" | "deny" | "always";

export const PLAN_ALLOWED = new Set([
  "read_file",
  "list_directory",
  "search_files",
  "git_status",
  "git_diff",
  "git_log",
  "get_current_time",
  "web_search",
]);

export const CRITICAL_TOOLS = new Set(["write_file", "run_command"]);

export function needsPermission(toolName: string, mode: AgentMode): boolean {
  if (mode === "plan") return !PLAN_ALLOWED.has(toolName);
  return CRITICAL_TOOLS.has(toolName);
}

export function describeMode(mode: AgentMode): string {
  return mode === "plan" ? "PLAN (read-only)" : "AGENT (full access)";
}
