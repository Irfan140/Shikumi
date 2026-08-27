# Creating Tools

Add a file under `src/tools/<name>/tool.ts`:

```ts
import { z } from "zod"
import { createTool } from "../../agent/tools/tool.js"

export function myTool() {
  return createTool({
    name: "my_tool",
    description: "Does X",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({query}, ctx) => {
      // ctx.workspaceRoot, ctx.sessionId
      return { success: true, content: `Result for ${query}` }
    }
  })
}
```

Register in `src/tools/index.ts`:

```ts
import { myTool } from "./my-tool/tool.js"
export function registerBuiltInTools(registry: ToolRegistry) {
  for (const t of [...filesystemTools(), myTool(), ...]) registry.register(t)
}
```

The tool automatically appears in `definitions()` and is exposed to the model. Add `PLAN_ALLOWED` if it should be read-only.
