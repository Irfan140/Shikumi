import { createApp } from "../application/bootstrap/create-app.js";

export async function runPrompt(prompt: string, sessionId?: string) {
  const app = await createApp();
  let sid = sessionId;
  if (!sid) {
    const s = await app.sessionManager.create(
      app.workspaceRoot,
      app.workspaceRoot,
    );
    sid = s.id;
    console.log(`Session: ${sid}`);
  } else {
    await app.preloadSession(sid);
  }
  if (Object.keys(app.config.mcpServers).length)
    await app.mcpManager.connectAll();
  for await (const ev of app.agentLoop.run(sid, prompt)) {
    if (ev.type === "model.text.delta") process.stdout.write(ev.delta);
    else if (ev.type === "tool.started") console.log(`\n● ${ev.toolName}`);
    else if (ev.type === "tool.completed") console.log(`\n✓ ${ev.toolName}`);
    else if (ev.type === "tool.failed")
      console.log(`\n✗ ${ev.toolName}: ${ev.error}`);
    else if (ev.type === "run.completed") console.log("\n— done");
    else if (ev.type === "run.failed") console.log(`\n✗ failed: ${ev.error}`);
  }
  await app.shutdown();
}

export async function listSessions() {
  const app = await createApp();
  const sessions = await app.sessionManager.list(20);
  if (!sessions.length) console.log("No sessions");
  else
    for (const s of sessions)
      console.log(`${s.id}  ${s.updatedAt}  ${s.workspaceRoot}`);
  await app.shutdown();
}
