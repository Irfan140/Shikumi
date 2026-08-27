import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ text }: { text: string }) {
  const html = marked.parse(text) as string;
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
