import { useState } from "react";
import { Architecture } from "../components/Architecture";

const INSTALL_CMD = "npm add @irfan140/shikumi";

const TOOLS: { name: string; does: string; access: "read-only" | "gated" }[] = [
  { name: "read_file", does: "Read a workspace-relative file", access: "read-only" },
  { name: "write_file", does: "Write a file, creating parent dirs", access: "gated" },
  { name: "list_directory", does: "List files and dirs, sorted", access: "read-only" },
  { name: "search_files", does: "Filename + content search", access: "read-only" },
  { name: "run_command", does: "Shell out with cwd + timeout", access: "gated" },
  { name: "git_status / diff / log", does: "Porcelain status, diffs, history", access: "read-only" },
  { name: "get_current_time", does: "ISO + local timestamp", access: "read-only" },
  { name: "web_search", does: "Fetch URLs, instant-answer fallback", access: "read-only" },
];

export function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">仕組み — Terminal AI agent harness</p>
        <h1>Shikumi</h1>
        <p className="lede">
          From intelligence to action. Shikumi gives a language model tools,
          context, and a workspace — then gets out of the way. TypeScript and
          Bun, terminal-first, yours to inspect.
        </p>
        <div className="hero-actions">
          <button className="btn primary" onClick={onGetStarted}>Get started</button>
          <a className="btn" href="https://github.com/Irfan140/Shikumi" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <button className={`install${copied ? " copied" : ""}`} onClick={() => copy(INSTALL_CMD)} title="Click to copy">
          <code>$ {INSTALL_CMD}</code>
          <span className="copy-state">{copied ? "Copied" : "Copy"}</span>
        </button>
        <a className="npm-link" href="https://www.npmjs.com/package/@irfan140/shikumi" target="_blank" rel="noreferrer">
          @irfan140/shikumi on npm
        </a>
      </section>

      <section>
        <p className="section-label">How it works</p>
        <h2>Three steps, no ceremony</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Bring a key</h3>
            <p><code>shikumi setup</code> stores an OpenAI or Groq key locally. No key, no problem — a mock provider demos the loop.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Ask in the terminal</h3>
            <p>The agent streams, calls tools, and shows its work. <code>/commands</code> manage sessions, models, and tools.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Approve the sharp edges</h3>
            <p>Writes and shell commands ask first — <code>y</code> once, <code>n</code> never, <code>a</code> always. PLAN mode stays read-only.</p>
          </div>
        </div>
      </section>

      <section>
        <p className="section-label">Capabilities</p>
        <h2>What the harness handles</h2>
        <div className="grid2">
          <div className="card">
            <h3>PLAN / AGENT modes</h3>
            <p>Read-only planning or full execution. <code>Tab</code> toggles; critical tools always confirm.</p>
          </div>
          <div className="card">
            <h3>Two model providers</h3>
            <p>OpenAI and Groq over one tool-calling path, switchable mid-session with <code>/model</code>. Keys stay in your env or config file.</p>
          </div>
          <div className="card">
            <h3>Sessions that persist</h3>
            <p>SQLite WAL storage with titles. <code>/sessions</code>, <code>/resume</code>, <code>/rename</code> — context survives restarts.</p>
          </div>
          <div className="card">
            <h3>MCP tool servers</h3>
            <p>External tools over MCP stdio, adapted into the same registry as built-ins. Reconnect with <code>/mcp reconnect</code>.</p>
          </div>
        </div>
      </section>

      <section>
        <p className="section-label">Architecture</p>
        <h2>One loop, explicit wiring</h2>
        <p className="section-lede">
          No framework magic: <code>createApp()</code> composes the model, context,
          tools, and sessions, and <code>AgentLoop</code> drives them. The UI and the
          headless CLI consume the same event stream.
        </p>
        <figure className="figure">
          <Architecture />
          <figcaption>
            Runtime data flow. The docs site is a separate static app and takes
            no part in the loop.
          </figcaption>
        </figure>
        <a className="figure-link" href="#/docs/architecture">Read the architecture notes →</a>
      </section>

      <section>
        <p className="section-label">Tools</p>
        <h2>Built in, Zod-validated</h2>
        <p className="section-lede">
          Every tool declares a schema; arguments are validated before anything
          runs. Anything external arrives through the same registry via MCP.
        </p>
        <table className="tool-table">
          <thead>
            <tr><th>Tool</th><th>Does</th><th>Access</th></tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.name}>
                <td><code>{t.name}</code></td>
                <td>{t.does}</td>
                <td>
                  <span className={`pill${t.access === "gated" ? " gated" : ""}`}>
                    {t.access === "gated" ? "asks first" : "read-only"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <p className="section-label">MCP</p>
        <h2>External tools, same registry</h2>
        <p className="section-lede">
          Point Shikumi at an MCP server over stdio and its tools appear
          alongside built-ins — same permissions, same trace. HTTP transport is
          on the roadmap.
        </p>
        <pre><code>{`{
  "mcpServers": {
    "fs": { "transport": "stdio", "command": "npx", "args": ["@mcp/server-fs", "/tmp"] }
  }
}`}</code></pre>
      </section>

      <section className="getting-started">
        <p className="section-label">Getting started</p>
        <h2>Running in a minute</h2>
        <ol>
          <li><span><code>git clone &lt;repo&gt; &amp;&amp; cd shikumi && bun install</code></span></li>
          <li><span><code>cp .env.example .env.development</code> and add <code>OPENAI_API_KEY</code> or <code>GROQ_API_KEY</code> — or run <code>shikumi setup</code></span></li>
          <li><span><code>bun run dev</code>, then type <code>/help</code> to see what the harness can do</span></li>
        </ol>
      </section>

      <section>
        <div className="next-panel">
          <div>
            <h2>Build with Shikumi</h2>
            <p>Install it, break it, send a focused pull request.</p>
          </div>
          <div className="next-actions">
            <button className="btn primary" onClick={onGetStarted}>Read the docs</button>
            <a className="btn" href="https://github.com/Irfan140/Shikumi" target="_blank" rel="noreferrer">Star on GitHub</a>
          </div>
        </div>
      </section>
    </div>
  );
}
