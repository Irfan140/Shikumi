import { z } from "zod";
import { createTool } from "../../agent/tools/tool.js";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function detectStack(html: string): string[] {
  const h = html.toLowerCase();
  const hits: string[] = [];
  if (h.includes("next")) hits.push("Next.js");
  if (h.includes("react")) hits.push("React");
  if (h.includes("tailwind")) hits.push("Tailwind CSS");
  if (h.includes("vercel")) hits.push("Vercel");
  if (h.includes("astro")) hits.push("Astro");
  if (h.includes("framer")) hits.push("Framer Motion");
  if (h.includes("vite")) hits.push("Vite");
  return [...new Set(hits)];
}

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Shikumi/0.1 (compatible; fetch)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const text = stripHtml(html);
  const stack = detectStack(html);
  const stackLine = stack.length
    ? `\nDetected tech hints: ${stack.join(", ")}`
    : "";
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  return `URL: ${url}\nTitle: ${title}\n${text}${stackLine}`;
}

async function searchDuckDuckGo(
  query: string,
  count: number,
): Promise<string | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { "user-agent": "Shikumi/0.1 (compatible; fetch)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };
  const lines: string[] = [];
  if (data.AbstractText) {
    lines.push(
      `Summary: ${data.AbstractText}${data.AbstractURL ? ` (${data.AbstractURL})` : ""}`,
    );
  }
  for (const t of (data.RelatedTopics ?? []).slice(0, count)) {
    if (t?.Text)
      lines.push(`- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`);
  }
  if (!lines.length) return null;
  return `DuckDuckGo results for "${query}":\n${lines.join("\n").slice(0, 8000)}`;
}

export function webSearchTool() {
  return createTool({
    name: "web_search",
    description:
      "Search the web or fetch a URL. If the query contains an https:// URL, fetches and extracts page text + tech hints. If it mentions a bare domain, tries fetching that site. Otherwise falls back to DuckDuckGo instant answers.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "URL or search query, e.g. 'https://example.com' or 'latest bun release notes'",
        ),
      count: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ query, count }) => {
      const trimmed = query.trim();
      const urlMatch = trimmed.match(/https?:\/\/[^\s"']+/);
      if (urlMatch) {
        try {
          const content = await fetchUrl(urlMatch[0]);
          return { success: true, content };
        } catch (e) {
          return {
            success: false,
            content: `Failed to fetch ${urlMatch[0]}: ${(e as Error).message}`,
            isError: true,
          };
        }
      }
      const domainMatch = trimmed.match(
        /([a-z0-9-]+\.[a-z]{2,})(?:\/[^\s]*)?/i,
      );
      if (domainMatch) {
        const candidate = `https://${domainMatch[0].replace(/^https?:\/\//, "")}`;
        try {
          const content = await fetchUrl(candidate);
          return {
            success: true,
            content: `Query: "${trimmed}"\nFetched ${candidate}:\n${content}`,
          };
        } catch {}
      }
      try {
        const answer = await searchDuckDuckGo(trimmed, count);
        if (answer) return { success: true, content: answer };
      } catch {}
      return {
        success: true,
        content: `Web search for "${trimmed}" returned no instant answer. Tip: provide a full https:// URL to fetch page content directly.`,
      };
    },
  });
}
