import { z } from "zod";
import { createTool } from "../../agent/tools/tool.js";

export function timeTool() {
  return createTool({
    name: "get_current_time",
    description:
      "Get current date/time in ISO and local format. Use for 'what time is it', 'today's date', scheduling.",
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      return {
        success: true,
        content: `Current time: ${now.toISOString()} (local: ${now.toString()})`,
        data: { iso: now.toISOString(), ms: now.getTime() },
      };
    },
  });
}
