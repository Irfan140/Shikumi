type Tone = "plain" | "core" | "ghost";

type Node = {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  tone?: Tone;
};

const INK = "#e9eaec";
const MUTED = "#9aa1a9";
const LINE = "#3a4048";
const SURFACE = "#15171b";
const CORE_BG = "#e9eaec";
const CORE_TX = "#101214";
const MONO =
  'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace';

function NodeBox({ n }: { n: Node }) {
  const tone = n.tone ?? "plain";
  const fill = tone === "core" ? CORE_BG : tone === "ghost" ? "none" : SURFACE;
  const titleFill = tone === "core" ? CORE_TX : INK;
  const lineFill = tone === "core" ? "#3c4046" : MUTED;
  return (
    <g>
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={8}
        fill={fill}
        stroke={tone === "ghost" ? MUTED : LINE}
        strokeWidth={1}
        strokeDasharray={tone === "ghost" ? "5 4" : undefined}
      />
      <text
        x={n.x + n.w / 2}
        y={n.y + 24}
        textAnchor="middle"
        fill={titleFill}
        fontSize={13}
        fontWeight={600}
        fontFamily="inherit"
      >
        {n.title}
      </text>
      {(n.lines ?? []).map((l, i) => (
        <text
          key={l}
          x={n.x + n.w / 2}
          y={n.y + 42 + i * 17}
          textAnchor="middle"
          fill={lineFill}
          fontSize={11}
          fontFamily={MONO}
        >
          {l}
        </text>
      ))}
    </g>
  );
}

function Edge({
  x1,
  y1,
  x2,
  y2,
  label,
  lx,
  ly,
  anchor,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  lx?: number;
  ly?: number;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={LINE}
        strokeWidth={1.5}
        markerEnd="url(#shikumi-arr)"
      />
      {label ? (
        <text
          x={lx ?? (x1 + x2) / 2}
          y={ly ?? (y1 + y2) / 2 - 5}
          textAnchor={anchor ?? "middle"}
          fill={MUTED}
          fontSize={10.5}
          fontFamily="inherit"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

// Runtime data flow of the Shikumi harness. Every box names a real module;
// edges follow the actual call/data direction in src/.
export function Architecture() {
  return (
    <div className="arch-scroll">
      <svg
        viewBox="0 0 980 640"
        width="100%"
        role="img"
        aria-label="Shikumi runtime architecture diagram"
        style={{ minWidth: 760, display: "block" }}
      >
        <defs>
          <marker
            id="shikumi-arr"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke={LINE} strokeWidth={1.5} />
          </marker>
        </defs>

        {/* Entry */}
        <NodeBox
          n={{ x: 16, y: 16, w: 150, h: 62, title: "Terminal user", lines: ["operator"] }}
        />
        <NodeBox
          n={{
            x: 190,
            y: 16,
            w: 250,
            h: 62,
            title: "Shikumi CLI",
            lines: ["run · resume · sessions · setup"],
          }}
        />
        <NodeBox
          n={{
            x: 464,
            y: 16,
            w: 250,
            h: 62,
            title: "Ink + React TUI",
            lines: ["/commands · approvals", "streaming · PLAN / AGENT"],
          }}
        />
        <NodeBox
          n={{
            x: 738,
            y: 16,
            w: 226,
            h: 62,
            title: "Docs site",
            lines: ["Vite app — standalone"],
            tone: "ghost",
          }}
        />
        <Edge x1={166} y1={47} x2={190} y2={47} />
        <Edge x1={440} y1={47} x2={464} y2={47} label="default" lx={452} ly={40} />

        {/* Composition */}
        <NodeBox
          n={{
            x: 16,
            y: 102,
            w: 330,
            h: 62,
            title: "Config — BYOK",
            lines: [".shikumi/config.json · env", "setup wizard · never baked in"],
          }}
        />
        <NodeBox
          n={{
            x: 370,
            y: 102,
            w: 344,
            h: 62,
            title: "createApp() composition",
            lines: ["model · tools · sessions · mcp", "no DI framework"],
            tone: "core",
          }}
        />
        <Edge x1={346} y1={133} x2={370} y2={133} label="BYOK" lx={358} ly={126} />
        <Edge x1={589} y1={78} x2={589} y2={102} label="uses" lx={596} ly={96} anchor="start" />

        {/* Runtime core */}
        <NodeBox
          n={{
            x: 120,
            y: 188,
            w: 740,
            h: 64,
            title: "AgentLoop",
            lines: ["stream → permission gate → execute → persist, repeat · emits AgentEvents"],
            tone: "core",
          }}
        />
        <Edge x1={542} y1={164} x2={542} y2={188} />

        {/* Per-iteration collaborators */}
        <Edge x1={490} y1={252} x2={490} y2={266} />
        <line x1={106} y1={266} x2={874} y2={266} stroke={LINE} strokeWidth={1.5} />
        <Edge x1={106} y1={266} x2={106} y2={276} />
        <Edge x1={298} y1={266} x2={298} y2={276} />
        <Edge x1={490} y1={266} x2={490} y2={276} />
        <Edge x1={682} y1={266} x2={682} y2={276} />
        <Edge x1={874} y1={266} x2={874} y2={276} />
        <text x={478} y={262} textAnchor="end" fill={MUTED} fontSize={10.5}>
          per iteration
        </text>
        <NodeBox
          n={{
            x: 18,
            y: 276,
            w: 176,
            h: 104,
            title: "Model providers",
            lines: ["OpenAI", "Groq", "Mock (no key)"],
          }}
        />
        <NodeBox
          n={{
            x: 210,
            y: 276,
            w: 176,
            h: 104,
            title: "Context",
            lines: ["MessageStore", "last 100 messages", "system prompt"],
          }}
        />
        <NodeBox
          n={{
            x: 402,
            y: 276,
            w: 176,
            h: 104,
            title: "Sessions",
            lines: ["SessionManager", "SQLite WAL", "in-memory fallback"],
          }}
        />
        <NodeBox
          n={{
            x: 594,
            y: 276,
            w: 176,
            h: 104,
            title: "Permissions",
            lines: ["PLAN read-only", "y / n / always"],
          }}
        />
        <NodeBox
          n={{
            x: 786,
            y: 276,
            w: 176,
            h: 104,
            title: "Observability",
            lines: ["LangSmith opt-in", "pino logs"],
          }}
        />

        {/* Tools */}
        <NodeBox
          n={{
            x: 18,
            y: 404,
            w: 452,
            h: 96,
            title: "ToolRegistry",
            lines: ["definitions() · plan-mode filter", "built-ins + adapted MCP tools"],
          }}
        />
        <NodeBox
          n={{
            x: 490,
            y: 404,
            w: 452,
            h: 96,
            title: "ToolExecutor",
            lines: ["Zod-validate → execute", "permission-gated"],
          }}
        />
        <Edge x1={200} y1={392} x2={200} y2={404} />
        <Edge x1={560} y1={392} x2={560} y2={404} />
        <text x={380} y={400} textAnchor="middle" fill={MUTED} fontSize={10.5}>
          from AgentLoop
        </text>
        <Edge x1={682} y1={380} x2={682} y2={404} label="gates" lx={689} ly={398} anchor="start" />
        <Edge x1={470} y1={452} x2={490} y2={452} label="lookup" lx={480} ly={445} />

        {/* Execution */}
        <NodeBox
          n={{
            x: 18,
            y: 524,
            w: 320,
            h: 96,
            title: "MCP (stdio)",
            lines: ["Manager → Adapter → servers", "tools register into registry"],
          }}
        />
        <NodeBox
          n={{
            x: 354,
            y: 524,
            w: 300,
            h: 96,
            title: "Built-in tools",
            lines: ["read · write · list · search", "run_command · git_* · time · web"],
          }}
        />
        <NodeBox
          n={{
            x: 670,
            y: 524,
            w: 292,
            h: 96,
            title: "Local workspace",
            lines: ["safe-path confined", "cwd = workspace root"],
          }}
        />
        <Edge x1={178} y1={524} x2={178} y2={500} label="registers" lx={185} ly={516} anchor="start" />
        <Edge x1={600} y1={500} x2={600} y2={524} label="executes" lx={607} ly={516} anchor="start" />
        <Edge x1={654} y1={572} x2={670} y2={572} label="safe-path" lx={662} ly={565} />
      </svg>
    </div>
  );
}
