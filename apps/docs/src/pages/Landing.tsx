import { Architecture } from "../components/Architecture";

export function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-kicker">仕組み — Shikumi</div>
        <h1>Shikumi</h1>
        <p className="tagline">From Intelligence to Action.</p>
        <p className="sub">An extensible AI agent harness for the terminal.</p>
        <div className="hero-btns">
          <button className="btn primary" onClick={onGetStarted}>Get Started</button>
          <a className="btn" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div className="hero-code">
          <code>npm add @irfan140/shikumi</code>
          <span>or</span>
          <code>bun add @irfan140/shikumi</code>
        </div>
      </section>

      <section className="grid3">
        <div className="card"><h3>What is Shikumi?</h3><p>An AI agent harness that provides models with tools, context, and execution to perform real tasks — TypeScript + Bun, terminal-first.</p></div>
        <div className="card"><h3>Why Shikumi?</h3><p>Minimal, explicit, workspace-isolated. No DI magic — `createApp()` wires Model, Context, Tools, and Sessions.</p></div>
        <div className="card"><h3>What it does</h3><p>Reads files, writes code, runs commands, queries git, searches web, and calls MCP tools — with streaming and SQLite sessions.</p></div>
      </section>

      <section>
        <h2>Core Capabilities</h2>
        <div className="grid2">
          <div className="card"><h4>Plan / Agent Modes</h4><p>Yellow read-only vs green full-access, `Tab` to toggle, `y/n/a` for critical writes.</p></div>
          <div className="card"><h4>Tool System</h4><p>Zod-validated `createTool` → `ToolRegistry` → `ToolExecutor` with permission gating.</p></div>
          <div className="card"><h4>MCP Integration</h4><p>Stdio & HTTP transports, `adaptMcpTool` auto-registers external tools.</p></div>
          <div className="card"><h4>Sessions</h4><p>SQLite WAL persistence, `shikumi resume &lt;id&gt;` restores context.</p></div>
        </div>
      </section>

      <section>
        <h2>Architecture</h2>
        <Architecture />
      </section>

      <section>
        <h2>Tools</h2>
        <p className="muted">Built-in: <code>read_file</code> <code>write_file</code> <code>list_directory</code> <code>search_files</code> <code>run_command</code> <code>git_*</code> <code>web_search</code> + any MCP tools.</p>
        <pre><code>{`shikumi run "list files and summarize"`}</code></pre>
      </section>

      <section>
        <h2>MCP</h2>
        <p>Connect external servers via <code>.shikumi/config.json</code>. Shikumi lists and adapts them transparently.</p>
        <pre><code>{`{
  "mcpServers": {
    "fs": { "transport": "stdio", "command": "npx", "args": ["@mcp/server-fs", "/tmp"] }
  }
}`}</code></pre>
      </section>

      <section>
        <h2>Getting Started</h2>
        <pre><code>{`git clone <repo> && cd shikumi
bun install
cp .env.example .env.development # add OPENAI_API_KEY
bun run dev`}</code></pre>
        <p><a href="#/docs/installation" onClick={e=>{e.preventDefault(); onGetStarted();}}>→ Installation docs</a></p>
      </section>

      <section className="cta">
        <h2>Build with Shikumi</h2>
        <p>From intelligence to action — in your terminal.</p>
        <a className="btn primary" href="#/docs/what-is-shikumi">Read the docs</a>
      </section>
    </div>
  );
}
