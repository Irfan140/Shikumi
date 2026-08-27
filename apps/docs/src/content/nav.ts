export type NavItem = { title: string; path: string; file: string };
export type NavSection = { title: string; items: NavItem[] };

export const nav: NavSection[] = [
  { title: "Introduction", items: [
    { title: "What is Shikumi?", path: "what-is-shikumi", file: "introduction/what-is-shikumi.md" },
    { title: "Why Shikumi?", path: "why-shikumi", file: "introduction/why-shikumi.md" },
  ]},
  { title: "Getting Started", items: [
    { title: "Installation", path: "installation", file: "getting-started/installation.md" },
    { title: "Quick Start", path: "quick-start", file: "getting-started/quick-start.md" },
    { title: "Configuration", path: "configuration", file: "getting-started/configuration.md" },
  ]},
  { title: "Concepts", items: [
    { title: "Architecture", path: "architecture", file: "concepts/architecture.md" },
    { title: "Agent Runtime", path: "agent-runtime", file: "concepts/agent-runtime.md" },
    { title: "Tool System", path: "tools", file: "concepts/tools.md" },
    { title: "Context & Sessions", path: "context", file: "concepts/context.md" },
    { title: "MCP Integration", path: "mcp", file: "concepts/mcp.md" },
    { title: "Sessions", path: "sessions", file: "concepts/sessions.md" },
  ]},
  { title: "Guides", items: [
    { title: "Creating Tools", path: "creating-tools", file: "guides/creating-tools.md" },
    { title: "Using MCP", path: "using-mcp", file: "guides/using-mcp.md" },
  ]},
  { title: "Reference", items: [
    { title: "CLI", path: "cli", file: "reference/cli.md" },
    { title: "Config Reference", path: "config-reference", file: "reference/configuration.md" },
    { title: "Roadmap", path: "roadmap", file: "reference/roadmap.md" },
  ]},
];

export const allPaths = nav.flatMap(s => s.items.map(i => i.path));
export function findByPath(p: string) { return nav.flatMap(s => s.items).find(i => i.path === p); }
export function prevNext(path: string) {
  const flat = nav.flatMap(s => s.items);
  const idx = flat.findIndex(i => i.path === path);
  return { prev: flat[idx-1] ?? null, next: flat[idx+1] ?? null };
}
