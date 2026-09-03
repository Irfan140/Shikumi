import OpenAI from "openai";
import { ModelError } from "../../../errors/errors.js";
import { isTracingEnabled } from "../../../infrastructure/tracing/index.js";
import type { ModelProvider } from "../model-provider.js";
import type {
  ModelRequest,
  ModelResponse,
  ModelStreamEvent,
} from "../model-types.js";

export const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

function missingKeyHint(provider?: string): string {
  if (provider === "groq")
    return "Set GROQ_API_KEY (env, .shikumi/config.json, or `shikumi setup`) to enable real model calls.";
  if (provider === "openai")
    return "Set OPENAI_API_KEY (env, .shikumi/config.json, or `shikumi setup`) to enable real model calls.";
  return "Set OPENAI_API_KEY or GROQ_API_KEY (env, .shikumi/config.json, or `shikumi setup`) to enable real model calls.";
}

export class OpenAIProvider implements ModelProvider {
  readonly name: string = "openai";
  private client: OpenAI | null = null;
  private wrapPromise: Promise<void> | null = null;
  constructor(
    private opts: {
      apiKey?: string;
      baseUrl?: string;
      model: string;
      providerHint?: string;
    },
  ) {
    if (opts.apiKey) {
      const raw = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseUrl });
      this.client = raw;
      if (isTracingEnabled()) {
        this.wrapPromise = import("langsmith/wrappers/openai")
          .then((m) => {
            const wrap = (m as unknown as { wrapOpenAI: (c: OpenAI) => OpenAI })
              .wrapOpenAI;
            if (typeof wrap === "function") this.client = wrap(raw);
          })
          .catch(() => {});
      }
    }
  }

  private async ensureWrapped() {
    if (this.wrapPromise) await this.wrapPromise;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    await this.ensureWrapped();
    if (!this.client) return mockGenerate(request, this.opts.providerHint);
    try {
      const res = await this.client.chat.completions.create({
        model: request.model || this.opts.model,
        messages: toOpenAIMessages(request),
        tools: request.tools.length
          ? request.tools.map(toOpenAITool)
          : undefined,
      });
      const choice = res.choices[0];
      return {
        content: choice.message.content ?? "",
        toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
          id: tc.id,
          name: (tc as { function: { name: string } }).function.name,
          arguments: (tc as { function: { arguments: string } }).function
            .arguments,
        })),
        finishReason:
          choice.finish_reason === "tool_calls" ? "tool_calls" : "stop",
        usage: res.usage
          ? {
              promptTokens: res.usage.prompt_tokens,
              completionTokens: res.usage.completion_tokens,
              totalTokens: res.usage.total_tokens,
            }
          : undefined,
      };
    } catch (e) {
      throw new ModelError((e as Error).message, e);
    }
  }

  async *stream(request: ModelRequest): AsyncIterable<ModelStreamEvent> {
    await this.ensureWrapped();
    if (!this.client) {
      const r = await mockGenerate(request, this.opts.providerHint);
      if (r.content) yield { type: "text.delta", delta: r.content };
      for (const tc of r.toolCalls) {
        yield {
          type: "tool_call.delta",
          toolCallId: tc.id,
          nameDelta: tc.name,
          argsDelta: tc.arguments,
        };
      }
      yield { type: "done", response: r };
      return;
    }
    try {
      const stream = await this.client.chat.completions.create({
        model: request.model || this.opts.model,
        messages: toOpenAIMessages(request),
        tools: request.tools.length
          ? request.tools.map(toOpenAITool)
          : undefined,
        stream: true,
      });
      let content = "";
      const toolCalls: Map<string, { name: string; args: string }> = new Map();
      const toolOrder: string[] = [];
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          yield { type: "text.delta", delta: delta.content };
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            const key = String(idx);
            if (!toolCalls.has(key)) {
              toolCalls.set(key, { name: "", args: "" });
              toolOrder.push(key);
            }
            const cur = toolCalls.get(key);
            if (!cur) continue;
            if (tc.function?.name) cur.name += tc.function.name;
            if (tc.function?.arguments) cur.args += tc.function.arguments;
            yield {
              type: "tool_call.delta",
              toolCallId: key,
              nameDelta: tc.function?.name,
              argsDelta: tc.function?.arguments,
            };
          }
        }
      }
      const calls = toolOrder
        .map((k, i) => {
          const v = toolCalls.get(k);
          if (!v?.name) return null;
          return { id: `call_${i}_${k}`, name: v.name, arguments: v.args };
        })
        .filter(Boolean) as ModelResponse["toolCalls"];
      yield {
        type: "done",
        response: {
          content,
          toolCalls: calls,
          finishReason: calls.length ? "tool_calls" : "stop",
        },
      };
    } catch (e) {
      throw new ModelError((e as Error).message, e);
    }
  }
}

function toOpenAIMessages(
  req: ModelRequest,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (req.systemPrompt)
    msgs.push({ role: "system", content: req.systemPrompt });
  for (const m of req.messages) {
    if (m.role === "tool") {
      msgs.push({
        role: "tool",
        tool_call_id: m.toolCallId ?? "",
        content: m.content,
      });
    } else if (m.role === "assistant" && m.toolCalls?.length) {
      msgs.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });
    } else {
      msgs.push({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      });
    }
  }
  return msgs;
}

function toOpenAITool(t: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}) {
  return {
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  };
}

async function mockGenerate(
  request: ModelRequest,
  providerHint?: string,
): Promise<ModelResponse> {
  const last = [...request.messages].reverse()[0];
  if (last?.role === "tool") {
    return {
      content: `Mock: saw tool result "${last.content.slice(0, 200)}". ${missingKeyHint(providerHint)}`,
      toolCalls: [],
      finishReason: "stop",
    };
  }
  const lastUser =
    [...request.messages].reverse().find((m) => m.role === "user")?.content ??
    "";
  const hasTools = request.tools.length > 0;
  if (
    hasTools &&
    /list|files|directory/i.test(lastUser) &&
    request.tools.find((t) => t.name === "list_directory")
  ) {
    return {
      content: "",
      toolCalls: [
        {
          id: "mock_1",
          name: "list_directory",
          arguments: JSON.stringify({ path: "." }),
        },
      ],
      finishReason: "tool_calls",
    };
  }
  return {
    content: `Mock response (no API key set). You said: "${lastUser.slice(0, 200)}". ${missingKeyHint(providerHint)}`,
    toolCalls: [],
    finishReason: "stop",
  };
}

export class GroqProvider extends OpenAIProvider {
  override readonly name: string = "groq";
  constructor(opts: { apiKey?: string; baseUrl?: string; model?: string }) {
    super({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl ?? GROQ_DEFAULT_BASE_URL,
      model: opts.model ?? GROQ_DEFAULT_MODEL,
      providerHint: "groq",
    });
  }
}

export function createModelProvider(opts: {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}): ModelProvider {
  if (opts.provider === "groq" && opts.apiKey) {
    return new GroqProvider({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      model: opts.model,
    });
  }
  if (opts.provider === "openai" && opts.apiKey) {
    return new OpenAIProvider({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      model: opts.model,
      providerHint: "openai",
    });
  }
  return new MockProvider(opts.model, opts.provider);
}

export class MockProvider implements ModelProvider {
  readonly name = "mock";
  constructor(
    private model = "mock",
    private providerHint?: string,
  ) {}
  async generate(req: ModelRequest): Promise<ModelResponse> {
    return mockGenerate(req, this.providerHint);
  }
  async *stream(req: ModelRequest): AsyncIterable<ModelStreamEvent> {
    const r = await mockGenerate(req, this.providerHint);
    if (r.content) yield { type: "text.delta", delta: r.content };
    for (const tc of r.toolCalls)
      yield {
        type: "tool_call.delta",
        toolCallId: tc.id,
        nameDelta: tc.name,
        argsDelta: tc.arguments,
      };
    yield { type: "done", response: r };
  }
}
