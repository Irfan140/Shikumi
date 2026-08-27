import {
  ContextManager,
  defaultSystemPrompt,
} from "../../agent/context/context-manager.js";
import { InMemoryMessageStore } from "../../agent/context/message-store.js";
import {
  MockProvider,
  OpenAIProvider,
} from "../../agent/models/providers/openai-provider.js";
import { AgentLoop } from "../../agent/runtime/agent-loop.js";
import { RunManager } from "../../agent/runtime/run-manager.js";
import { ToolRegistry } from "../../agent/tools/tool-registry.js";
import { loadConfig } from "../../config/config.js";
import { openDatabase } from "../../infrastructure/database/sqlite.js";
import { createLogger } from "../../infrastructure/logging/logger.js";
import { McpManager } from "../../mcp/manager/mcp-manager.js";
import {
  InMemorySessionRepository,
  SqliteMessageRepository,
  SqliteSessionRepository,
} from "../../sessions/repository.js";
import { SessionManager } from "../../sessions/session-manager.js";
import { registerBuiltInTools } from "../../tools/index.js";

export type App = Awaited<ReturnType<typeof createApp>>;

export async function createApp(overrides?: { workspaceRoot?: string }) {
  const workspaceRoot = overrides?.workspaceRoot ?? process.cwd();
  const config = loadConfig(workspaceRoot);
  const logger = createLogger(config.logging.level);

  let sessionRepo: SqliteSessionRepository | InMemorySessionRepository;
  let messageRepo: SqliteMessageRepository | null = null;
  let db: ReturnType<typeof openDatabase> | null = null;
  try {
    db = openDatabase(config.persistence.sqlitePath);
    sessionRepo = new SqliteSessionRepository(db);
    messageRepo = new SqliteMessageRepository(db);
  } catch {
    sessionRepo = new InMemorySessionRepository();
  }

  const sessionManager = new SessionManager(sessionRepo, messageRepo as never);
  const toolRegistry = new ToolRegistry();
  registerBuiltInTools(toolRegistry);

  const mcpManager = new McpManager(config, toolRegistry);

  const modelProvider = config.model.apiKey
    ? new OpenAIProvider({
        apiKey: config.model.apiKey,
        baseUrl: config.model.baseUrl,
        model: config.model.name,
      })
    : new MockProvider(config.model.name);

  const messageStore = new InMemoryMessageStore();

  if (messageRepo) {
    const origAppend = messageStore.append.bind(messageStore);
    messageStore.append = async (sid, rid, msg) => {
      await origAppend(sid, rid, msg);
    };
  }

  const mcpNames = Object.keys(config.mcpServers);
  const contextManager = new ContextManager(messageStore, {
    systemPrompt: defaultSystemPrompt(workspaceRoot, { mcpServers: mcpNames }),
  });
  const runManager = new RunManager();

  const agentLoop = new AgentLoop({
    modelProvider,
    contextManager,
    toolRegistry,
    messageRepo: messageRepo ?? undefined,
    runManager,
    workspaceRoot: config.workspace.root,
    workingDirectory: workspaceRoot,
    modelName: config.model.name,
  });

  return {
    config,
    logger,
    db,
    sessionRepo,
    messageRepo,
    messageStore,
    contextManager,
    sessionManager,
    toolRegistry,
    mcpManager,
    modelProvider,
    agentLoop,
    runManager,
    workspaceRoot,
    async preloadSession(sessionId: string) {
      if (!messageRepo) return;
      const msgs = await messageRepo.getBySession(sessionId);
      for (const m of msgs) {
        await messageStore.append(sessionId, "preload", m);
      }
    },
    async shutdown() {
      await mcpManager.closeAll();
      try {
        db?.close();
      } catch {}
    },
  };
}
