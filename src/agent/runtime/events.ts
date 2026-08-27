export type AgentEvent =
  | { type: "run.started"; runId: string; sessionId: string }
  | { type: "run.completed"; runId: string; sessionId: string; result: string }
  | { type: "run.failed"; runId: string; sessionId: string; error: string }
  | { type: "model.started"; runId: string }
  | { type: "model.text.delta"; runId: string; delta: string }
  | { type: "model.completed"; runId: string; content: string; toolCalls: { name: string; id: string }[] }
  | { type: "tool.started"; runId: string; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool.completed"; runId: string; toolName: string; toolCallId: string; result: unknown }
  | { type: "tool.failed"; runId: string; toolName: string; toolCallId: string; error: string }
  | { type: "permission.requested"; runId: string; toolName: string; toolCallId: string; input: unknown; mode: string }
  | { type: "permission.decided"; runId: string; toolName: string; toolCallId: string; decision: string }
  | { type: "context.updated"; runId: string; messageCount: number };

export type AgentEventHandler = (event: AgentEvent) => void;
