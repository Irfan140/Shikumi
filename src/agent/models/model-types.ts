export type ModelRole = "system" | "user" | "assistant" | "tool";

export type ModelMessage = {
  role: ModelRole;
  content: string;
  toolCalls?: ModelToolCall[];
  toolCallId?: string;
  name?: string;
};

export type ModelToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ModelToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ModelRequest = {
  messages: ModelMessage[];
  tools: ModelToolDefinition[];
  model: string;
  systemPrompt?: string;
};

export type ModelResponse = {
  content: string;
  toolCalls: ModelToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "error";
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

export type ModelStreamEvent =
  | { type: "text.delta"; delta: string }
  | { type: "tool_call.delta"; toolCallId: string; nameDelta?: string; argsDelta?: string }
  | { type: "done"; response: ModelResponse };
