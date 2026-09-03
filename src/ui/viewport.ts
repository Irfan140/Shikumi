import type { Item } from "./items.js";

// Rough row estimate for one history item at a given terminal width.
// Deliberately conservative (over-estimates): rendering MORE rows than the
// terminal holds makes Ink scroll on every repaint, which reads as shaking.
export function estimateRows(it: Item, termWidth: number): number {
  const w = Math.max(20, termWidth - 10);
  const textRows = (s: string) => {
    if (!s) return 0;
    return Math.max(1, Math.ceil(s.length / w));
  };
  switch (it.kind) {
    case "system":
      return textRows(it.text);
    case "user":
      return 3 + textRows(it.text); // border + title + text
    case "agent":
      return 3 + Math.max(textRows(it.text), 1); // border + header + text
    case "tool":
      return 1 + textRows(it.detail); // header + detail
  }
}

// Fill a render window from the newest item backwards so total rows stay
// within `budget`. `scrollOffset` counts hidden-newest items (scroll-up mode).
// Always includes at least the newest in-window item, even if it alone
// exceeds the budget.
export function selectVisible<T extends Item>(
  items: readonly T[],
  opts: { termWidth: number; budget: number; scrollOffset: number },
): T[] {
  const end = items.length - Math.max(0, opts.scrollOffset);
  const out: T[] = [];
  let used = 0;
  for (let i = end - 1; i >= 0; i--) {
    const rows = estimateRows(items[i], opts.termWidth);
    if (out.length > 0 && used + rows > opts.budget) break;
    used += rows;
    out.unshift(items[i]);
  }
  return out;
}
