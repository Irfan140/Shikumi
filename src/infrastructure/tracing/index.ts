export function isTracingEnabled(): boolean {
  const v = process.env.LANGSMITH_TRACING ?? process.env.LANGCHAIN_TRACING_V2 ?? process.env.LANGSMITH_TRACING_V2;
  return v === "true" || v === "True" || v === "1";
}

export function getTracingProject(): string {
  const raw = process.env.LANGSMITH_PROJECT ?? process.env.LANGCHAIN_PROJECT ?? "Shikumi";
  return raw.replace(/^["']|["']$/g, "");
}

export function getTracingEndpoint(): string | undefined {
  const raw = process.env.LANGSMITH_ENDPOINT ?? process.env.LANGCHAIN_ENDPOINT;
  return raw?.replace(/^["']|["']$/g, "");
}

export async function wrapOpenAIClient<T>(client: T): Promise<T> {
  if (!isTracingEnabled()) return client;
  try {
    const mod = await import("langsmith/wrappers/openai");
    const wrap = (mod as unknown as { wrapOpenAI: (c: T) => T }).wrapOpenAI;
    if (typeof wrap === "function") return wrap(client);
  } catch {}
  return client;
}

export async function getTraceable() {
  if (!isTracingEnabled()) return null;
  try {
    const mod = await import("langsmith/traceable");
    return (mod as unknown as { traceable: (...a: unknown[]) => unknown }).traceable ?? null;
  } catch {
    return null;
  }
}
