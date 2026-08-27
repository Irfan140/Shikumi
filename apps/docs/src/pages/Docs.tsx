import { useEffect, useState } from "react";
import { Markdown } from "../components/Markdown";
import { prevNext } from "../content/nav";

const rawModules = import.meta.glob("../content/**/*.md", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

export function DocsPage({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const [text, setText] = useState("Loading…");
  useEffect(() => {
    let cancelled = false;
    const file = findFile(path);
    const key = `../content/${file}`;
    const loader = rawModules[key];
    if (loader) {
      (loader() as Promise<string>).then(t => { if (!cancelled) setText(t); }).catch(() => setText(`# Not found\nNo document for \`${path}\``));
    } else {
      setText(`# Not found\nNo document for \`${path}\``);
    }
    return () => { cancelled = true; };
  }, [path]);

  const { prev, next } = prevNext(path);
  return (
    <div className="doc-page">
      <Markdown text={text} />
      <div className="doc-nav">
        {prev ? <a href={`#/docs/${prev.path}`} onClick={e=>{e.preventDefault(); onNavigate(prev.path);}}>← {prev.title}</a> : <span />}
        {next ? <a href={`#/docs/${next.path}`} onClick={e=>{e.preventDefault(); onNavigate(next.path);}}>{next.title} →</a> : <span />}
      </div>
    </div>
  );
}

function findFile(path: string): string {
  const map: Record<string,string> = {
    "what-is-shikumi": "introduction/what-is-shikumi.md",
    "why-shikumi": "introduction/why-shikumi.md",
    "installation": "getting-started/installation.md",
    "quick-start": "getting-started/quick-start.md",
    "configuration": "getting-started/configuration.md",
    "architecture": "concepts/architecture.md",
    "agent-runtime": "concepts/agent-runtime.md",
    "tools": "concepts/tools.md",
    "context": "concepts/context.md",
    "mcp": "concepts/mcp.md",
    "sessions": "concepts/sessions.md",
    "creating-tools": "guides/creating-tools.md",
    "using-mcp": "guides/using-mcp.md",
    "cli": "reference/cli.md",
    "config-reference": "reference/configuration.md",
    "roadmap": "reference/roadmap.md",
  };
  return map[path] ?? "introduction/what-is-shikumi.md";
}
