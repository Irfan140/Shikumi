export type Session = {
  id: string;
  createdAt: string;
  updatedAt: string;
  workspaceRoot: string;
  workingDirectory: string;
  title?: string;
};

export type StoredMessage = {
  id: string;
  sessionId: string;
  runId: string;
  role: string;
  content: string;
  toolCalls?: string;
  toolCallId?: string;
  createdAt: string;
};
