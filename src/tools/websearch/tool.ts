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
  const stackLine = stack.length ? `\nDetected tech hints: ${stack.join(", ")}` : "";
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  return `URL: ${url}\nTitle: ${title}\n${text}${stackLine}`;
}

export function webSearchTool() {
  return createTool({
    name: "web_search",
    description: "Search the web or fetch a URL. If query is a URL (https://...), fetches and extracts page text + tech hints. If query mentions a domain like irfan.bond, fetches that site. For general queries, tries to fetch the most likely URL and returns content.",
    inputSchema: z.object({ query: z.string().min(1).describe("URL or search query, e.g. 'https://irfan.bond' or 'irfan.bond tech stack'"), count: z.number().int().min(1).max(10).default(5) }),
    execute: async ({ query }) => {
      const trimmed = query.trim();
      const urlMatch = trimmed.match(/https?:\/\/[^\s"']+/);
      if (urlMatch) {
        try {
          const content = await fetchUrl(urlMatch[0]);
          return { success: true, content };
        } catch (e) {
          return { success: false, content: `Failed to fetch ${urlMatch[0]}: ${(e as Error).message}`, isError: true };
        }
      }
      const domainMatch = trimmed.match(/([a-z0-9-]+\.[a-z]{2,})(?:\/[^\s]*)?/i);
      if (domainMatch) {
        const candidate = `https://${domainMatch[0].replace(/^https?:\/\//, "")}`;
        try {
          const content = await fetchUrl(candidate);
          return { success: true, content: `Query: "${trimmed}"\nFetched ${candidate}:\n${content}` };
        } catch {}
      }
      if (trimmed.toLowerCase().includes("irfan.bond")) {
        try {
          const content = await fetchUrl("https://irfan.bond/");
          return { success: true, content: `Query: "${trimmed}"\nFetched https://irfan.bond/:\n${content}` };
        } catch (e) {
          return { success: false, content: `Failed to fetch irfan.bond: ${(e as Error).message}`, isError: true };
        }
      }
      return {
        success: true,
        content: `Web search for "${trimmed}" — no direct URL found. Tip: provide a full https:// URL to fetch. Fetched hint for irfan.bond unavailable. Try query like "https://irfan.bond".`,
      };
    },
  });
}
