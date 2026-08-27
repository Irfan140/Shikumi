import React, { useEffect, useRef, useState } from "react";
import { Box, Static, Text, useApp, useInput, useStdout } from "ink";
import type { AgentEvent } from "../agent/runtime/events.js";
import type { App } from "../application/bootstrap/create-app.js";

type Item =
  | { id: string; kind: "system"; text: string }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "agent"; text: string; streaming: boolean }
  | { id: string; kind: "tool"; name: string; status: "running" | "done" | "error"; detail: string };

function Spinner({ active }: { active: boolean }) {
  const [frame, setFrame] = useState(0);
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), 80);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  return <Text color="yellow">{frames[frame]} </Text>;
}

function deleteWord(s: string): string {
  if (!s) return s;
  let end = s.length;
  while (end > 0 && s[end - 1] === " ") end--;
  let start = end;
  while (start > 0 && s[start - 1] !== " " && s[start - 1] !== "/" && s[start - 1] !== "-") start--;
  return s.slice(0, start);
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

type Mode = "plan" | "agent";
type PendingPerm = { toolName: string; toolCallId: string; input: unknown; mode: Mode; resolve: (v: "allow" | "deny" | "always") => void };

export function AppUI({ app, initialSessionId }: { app: App; initialSessionId?: string }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const height = (stdout as unknown as { rows?: number })?.rows ?? 32;
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [input, setInput] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const hasKey = Boolean(app.config.model.apiKey);
  const [items, setItems] = useState<Item[]>(() => {
    const base: Item[] = [{ id: "welcome", kind: "system", text: "Welcome to Shikumi  •  Tab switch plan/agent  •  ↑/↓ scroll  •  Ctrl+C exit" }];
    if (!hasKey) base.push({ id: "byok", kind: "system", text: "BYOK: No API key — using Mock (demo). Run `shikumi setup` or set OPENAI_API_KEY / .shikumi/config.json for real LLM." });
    return base;
  });
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [mode, setMode] = useState<Mode>("plan");
  const [pendingPerm, setPendingPerm] = useState<PendingPerm | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const modeToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowedAlwaysRef = useRef<Set<string>>(new Set());
  const pendingDeltaRef = useRef("");
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);
  const modeRef = useRef<Mode>(mode);
  const itemsRef = useRef<Item[]>(items);
  const viewportRef = useRef<number>(Math.max(8, height - 10));
  const scrollOffsetRef = useRef<number>(scrollOffset);
  const queuedItemsRef = useRef<Item[]>([]);
  const queuedFlushRef = useRef<string>("");
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { scrollOffsetRef.current = scrollOffset; }, [scrollOffset]);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  const flushQueued = () => {
    if (queuedItemsRef.current.length === 0 && !queuedFlushRef.current) return;
    const toAdd = queuedItemsRef.current;
    queuedItemsRef.current = [];
    const extraDelta = queuedFlushRef.current;
    queuedFlushRef.current = "";
    if (toAdd.length) {
      setItems((a) => [...a.slice(-120), ...toAdd.slice(-120)].slice(-120));
    }
    if (extraDelta && activeAgentIdRef.current) {
      const did = activeAgentIdRef.current;
      setItems((a) => a.map((x) => (x.id === did ? { ...x, text: (x as unknown as { text: string }).text + extraDelta } as Item : x)));
    }
  };
  const push = (it: Item) => {
    if (scrollOffsetRef.current > 0) {
      queuedItemsRef.current.push(it);
      return;
    }
    setItems((a) => [...a.slice(-120), it]);
  };
  const update = (id: string, patch: Partial<Item>) => {
    if (scrollOffsetRef.current > 0) {
      const q = queuedItemsRef.current.find((x) => x.id === id);
      if (q) Object.assign(q, patch);
      return;
    }
    setItems((a) => a.map((x) => (x.id === id ? ({ ...x, ...patch } as Item) : x)));
  };

  const viewportSize = Math.max(8, height - 10);
  useEffect(() => { viewportRef.current = viewportSize; }, [viewportSize]);
  useEffect(() => {
    const max = Math.max(0, items.length - 1);
    if (scrollOffset > max) setScrollOffset(max);
  }, [items.length, scrollOffset]);

  const flushPending = () => {
    const delta = pendingDeltaRef.current;
    if (!delta) return;
    pendingDeltaRef.current = "";
    if (scrollOffsetRef.current > 0) {
      queuedFlushRef.current += delta;
      return;
    }
    const did = activeAgentIdRef.current;
    if (!did) return;
    setItems((a) => a.map((x) => (x.id === did ? { ...x, text: (x as unknown as { text: string }).text + delta } as Item : x)));
  };
  const scheduleFlush = () => {
    if (flushTimeoutRef.current) return;
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flushPending();
    }, 32);
  };
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      if (modeToastRef.current) clearTimeout(modeToastRef.current);
    };
  }, []);

  useEffect(() => {
    (app.agentLoop as unknown as { opts: Record<string, unknown> }).opts["getMode"] = () => modeRef.current;
    (app.agentLoop as unknown as { opts: Record<string, unknown> }).opts["requestPermission"] = async (toolName: string, toolCallId: string, toolInput: unknown, m: string) => {
      if (allowedAlwaysRef.current.has(toolName)) return "allow" as const;
      return await new Promise<"allow" | "deny" | "always">((resolve) => {
        setPendingPerm({ toolName, toolCallId, input: toolInput, mode: m as Mode, resolve });
      }).then((v) => {
        if (v === "always") allowedAlwaysRef.current.add(toolName);
        setPendingPerm(null);
        return v === "always" ? "allow" : v;
      });
    };
  }, [app.agentLoop]);

  useInput((inputStr, key) => {
    if (key.ctrl && inputStr === "c") {
      app.shutdown().finally(() => exit());
      return;
    }
    if (pendingPerm) {
      const ch = inputStr.toLowerCase();
      if (ch === "y") { pendingPerm.resolve("allow"); return; }
      if (ch === "n" || key.escape) { pendingPerm.resolve("deny"); return; }
      if (ch === "a") { pendingPerm.resolve("always"); return; }
      if (key.tab) { setMode((m) => { const nm = m === "plan" ? "agent" : "plan"; if (modeToastRef.current) clearTimeout(modeToastRef.current); setModeToast(`↦ ${nm.toUpperCase()} + allow`); modeToastRef.current = setTimeout(() => setModeToast(null), 1500); return nm; }); pendingPerm.resolve("allow"); return; }
      return;
    }
    if (key.tab) {
      setMode((m) => {
        const nm = m === "plan" ? "agent" : "plan";
        if (modeToastRef.current) clearTimeout(modeToastRef.current);
        setModeToast(`↦ ${nm.toUpperCase()}`);
        modeToastRef.current = setTimeout(() => setModeToast(null), 1500);
        return nm;
      });
      return;
    }
    if (key.upArrow) {
      setScrollOffset((s) => {
        const max = Math.max(0, itemsRef.current.length - 1);
        return Math.min(s + 1, max);
      });
      return;
    }
    if (key.downArrow) {
      setScrollOffset((s) => {
        const ns = Math.max(0, s - 1);
        if (ns === 0) setTimeout(flushQueued, 0);
        return ns;
      });
      return;
    }
    if (key.pageUp) {
      setScrollOffset((s) => {
        const max = Math.max(0, itemsRef.current.length - 1);
        return Math.min(s + 5, max);
      });
      return;
    }
    if (key.pageDown) {
      setScrollOffset((s) => {
        const ns = Math.max(0, s - 5);
        if (ns === 0) setTimeout(flushQueued, 0);
        return ns;
      });
      return;
    }
    if (busy) return;

    if (key.return) {
      if (input.trim()) handleSubmit(input);
      return;
    }
    if (key.ctrl && inputStr === "u") {
      setInput("");
      return;
    }
    if ((key.ctrl && inputStr === "w") || (key.ctrl && key.backspace) || (key.meta && key.backspace)) {
      setInput((s) => deleteWord(s));
      return;
    }
    if (key.backspace || key.delete) {
      setInput((s) => s.slice(0, -1));
      return;
    }
    if (key.escape) {
      setInput("");
      return;
    }
    if (key.leftArrow || key.rightArrow) return;
    if (!key.ctrl && !key.meta && inputStr) {
      setInput((s) => s + inputStr);
    }
  });

  async function handleSubmit(value: string) {
    if (!value.trim() || busy) return;
    setInput("");
    push({ id: uid(), kind: "user", text: value });
    setBusy(true);
    let activeAgentId: string | null = null;
    pendingDeltaRef.current = "";
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    try {
      let sid = sessionId;
      if (!sid) {
        const s = await app.sessionManager.create(app.workspaceRoot, app.workspaceRoot);
        sid = s.id;
        setSessionId(sid);
        push({ id: uid(), kind: "system", text: `session ${sid.slice(0, 8)} • ${app.config.model.name}` });
      } else {
        await app.preloadSession(sid);
      }
      const hasMcp = Object.keys(app.config.mcpServers).length > 0;
      if (hasMcp) await app.mcpManager.connectAll().catch(() => {});
      for await (const ev of app.agentLoop.run(sid, value, { mode })) {
        switch (ev.type) {
          case "model.started": {
            const id = uid();
            activeAgentId = id;
            activeAgentIdRef.current = id;
            setStreamingId(id);
            push({ id, kind: "agent", text: "", streaming: true });
            break;
          }
          case "model.text.delta": {
            if (activeAgentId) {
              pendingDeltaRef.current += ev.delta;
              scheduleFlush();
            }
            break;
          }
          case "model.completed": {
            if (flushTimeoutRef.current) {
              clearTimeout(flushTimeoutRef.current);
              flushTimeoutRef.current = null;
            }
            flushPending();
            if (activeAgentId) {
              const finalText = ev.content;
              if (finalText) {
                update(activeAgentId, { text: finalText, streaming: false } as Partial<Item>);
              } else {
                update(activeAgentId, { streaming: false } as Partial<Item>);
              }
              setStreamingId(null);
            } else if (ev.content) {
              push({ id: uid(), kind: "agent", text: ev.content, streaming: false });
            }
            activeAgentId = null;
            activeAgentIdRef.current = null;
            break;
          }
          case "tool.started":
            push({ id: ev.toolCallId, kind: "tool", name: ev.toolName, status: "running", detail: "" });
            break;
          case "tool.completed":
            update(ev.toolCallId, { status: "done", detail: String(ev.result).slice(0, 600) });
            break;
          case "tool.failed":
            update(ev.toolCallId, { status: "error", detail: ev.error.slice(0, 600) });
            break;
          case "permission.requested":
            push({ id: uid(), kind: "system", text: `⚑ permission needed: ${ev.toolName} ${JSON.stringify(ev.input).slice(0, 200)} in ${ev.mode}` });
            break;
          case "permission.decided":
            push({ id: uid(), kind: "system", text: `→ ${ev.toolName}: ${ev.decision}` });
            break;
          case "run.failed":
            if (flushTimeoutRef.current) {
              clearTimeout(flushTimeoutRef.current);
              flushTimeoutRef.current = null;
            }
            flushPending();
            push({ id: uid(), kind: "system", text: `✗ ${ev.error}` });
            if (activeAgentId) update(activeAgentId, { streaming: false } as Partial<Item>);
            setStreamingId(null);
            activeAgentIdRef.current = null;
            break;
          default:
            break;
        }
      }
    } catch (e) {
      push({ id: uid(), kind: "system", text: `Error: ${(e as Error).message}` });
    } finally {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      flushPending();
      setBusy(false);
      setStreamingId(null);
      activeAgentIdRef.current = null;
    }
  }

  const visible = (() => {
    if (scrollOffset === 0) return items.slice(-viewportSize);
    const end = items.length - scrollOffset;
    const start = Math.max(0, end - viewportSize);
    return items.slice(start, end);
  })();

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">⬢ Shikumi</Text>
        <Text color="gray">{app.config.model.name} · {sessionId ? sessionId.slice(0, 8) : "new session"} · {busy ? "working" : "ready"}</Text>
      </Box>

      {modeToast ? (
        <Box marginTop={1}>
          <Text color={mode === "plan" ? "yellow" : "green"} bold> ── {modeToast} ──</Text>
        </Box>
      ) : null}
      {scrollOffset > 0 ? (
        <Box marginTop={1}>
          <Text color="yellow" dimColor> ── ▲ scrolled up {scrollOffset} · ↓/PgDn to bottom · new messages hidden ──</Text>
        </Box>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        {visible.map((it) => {
          if (it.kind === "system") return <Text key={it.id} color="gray" dimColor>─ {it.text}</Text>;
          if (it.kind === "user")
            return (
              <Box key={it.id} flexDirection="column" borderStyle="single" borderColor="cyanBright" paddingX={1}>
                <Text bold color="cyanBright">▶ You</Text>
                <Text color="white">{it.text}</Text>
              </Box>
            );
          if (it.kind === "agent")
            return (
              <Box key={it.id} flexDirection="column" borderStyle="round" borderColor={it.streaming ? "yellow" : "green"} paddingX={1}>
                <Box gap={1}>
                  {it.streaming ? <Spinner active /> : <Text color="green">●</Text>}
                  <Text bold color={it.streaming ? "yellow" : "green"}>{it.streaming ? "Shikumi is thinking…" : "Shikumi"}</Text>
                </Box>
                {it.text ? <Text color="white">{it.text}</Text> : it.streaming ? <Text color="gray" dimColor>streaming…</Text> : null}
              </Box>
            );
          if (it.kind === "tool") {
            const color = it.status === "running" ? "yellow" : it.status === "done" ? "green" : "red";
            const icon = it.status === "running" ? "◐" : it.status === "done" ? "✓" : "✗";
            return (
              <Box key={it.id} flexDirection="column" paddingLeft={2}>
                <Box gap={1}>
                  <Text color={color as never}>{icon} {it.name}</Text>
                  <Text color="gray" dimColor>{it.status}</Text>
                </Box>
                {it.detail ? <Text color="gray">{it.detail.slice(0, 700)}</Text> : null}
              </Box>
            );
          }
          return null;
        })}
        {busy && !streamingId ? (
          <Box paddingLeft={2}>
            <Spinner active />
            <Text color="yellow"> running tools…</Text>
          </Box>
        ) : null}
      </Box>

      {pendingPerm ? (
        <Box marginTop={1} borderStyle="double" borderColor="yellow" paddingX={1} flexDirection="column">
          <Text bold color="yellow">⚑ Permission required ({pendingPerm.mode})</Text>
          <Text color="white">Allow <Text bold color="yellow">{pendingPerm.toolName}</Text> ?</Text>
          <Text color="gray" dimColor>{JSON.stringify(pendingPerm.input).slice(0, 300)}</Text>
          <Text color="yellow"> y = allow once · n/Esc = deny · a = always allow {pendingPerm.toolName} · Tab switch mode & allow</Text>
        </Box>
      ) : null}
      <Box marginTop={1} borderStyle="single" borderColor={pendingPerm ? "yellow" : mode === "plan" ? "yellow" : "green"} paddingX={1} justifyContent="space-between">
        <Box flexGrow={1} gap={1}>
          <Text color={pendingPerm ? "yellow" : busy ? "yellow" : "cyan"} bold>{pendingPerm ? "⚑ " : busy ? "● " : "› "}</Text>
          <Text color={input ? "white" : "gray"}>{pendingPerm ? `Waiting for ${pendingPerm.toolName}… (y/n/a)` : input || (busy ? "working — please wait…" : "Ask something…")}</Text>
          {!busy && !pendingPerm ? <Text color="cyan">{cursorOn ? "▌" : " "}</Text> : null}
        </Box>
        <Box gap={1}>
          <Text color="gray" dimColor>↵ send</Text>
          <Text color={mode === "plan" ? "yellow" : "green"} bold>{mode === "plan" ? "◐ PLAN" : "● AGENT"}</Text>
          <Text color="gray" dimColor>Tab</Text>
        </Box>
      </Box>
      <Text color="gray" dimColor>  Enter send • Ctrl+C exit • PgUp/PgDn scroll{pendingPerm ? " • y/n/a permission" : ""}{sessionId ? ` • resume ${sessionId.slice(0, 8)}` : ""}</Text>
    </Box>
  );
}
