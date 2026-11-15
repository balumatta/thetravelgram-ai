// Inline rich-text helpers shared by the composer (write) and BlogRenderer (read).
// The composer only ever emits a tiny tag whitelist, and the sanitizer only lets
// that same whitelist back through, so it works identically on server and client
// (no DOMParser needed).

/** "Rinku:" at the start of a conversation line. */
export const SPEAKER_RE = /^(\s*[^:\n]{1,24}:)/;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

const SIMPLE_TAGS = ["strong", "em", "u", "s", "code"];

/** Escape everything, then re-enable only the whitelisted inline tags. */
export function sanitizeInlineHtml(html: string): string {
  // Pull allowed tags out into placeholder tokens, escape the rest, then restore.
  const kept: string[] = [];
  const keep = (tag: string) => `\u0000${kept.push(tag) - 1}\u0000`;
  let out = html.replace(/\u0000/g, "");
  const simple = new RegExp(`<(/?)(${SIMPLE_TAGS.join("|")})>`, "g");
  out = out.replace(simple, (_m, slash, tag) => keep(`<${slash}${tag}>`));
  out = out.replace(/<br\s*\/?>/g, () => keep("<br>"));
  out = out.replace(/<a href="((?:https?:\/\/|mailto:)[^"<>\s]*)">/g, (_m, href) =>
    keep(`<a href="${href}" target="_blank" rel="noopener noreferrer">`),
  );
  out = out.replace(/<\/a>/g, () => keep("</a>"));
  out = out.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => kept[Number(i)]);
}

// ── TipTap JSON → inline HTML ────────────────────────────────

interface PMMark { type: string; attrs?: Record<string, unknown> }
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
}

const MARK_TAG: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  code: "code",
};

export function inlineToHtml(nodes: PMNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "<br>";
      if (n.type !== "text" || !n.text) return "";
      let html = escapeHtml(n.text);
      let link: string | null = null;
      for (const m of n.marks ?? []) {
        if (m.type === "link") {
          const href = String(m.attrs?.href ?? "");
          if (/^(https?:\/\/|mailto:)/.test(href)) link = href;
          continue;
        }
        const tag = MARK_TAG[m.type];
        if (tag) html = `<${tag}>${html}</${tag}>`;
      }
      if (link) html = `<a href="${escapeAttr(link)}">${html}</a>`;
      return html;
    })
    .join("");
}

export function inlineToText(nodes: PMNode[] | undefined): string {
  if (!nodes) return "";
  return nodes.map((n) => (n.type === "hardBreak" ? "\n" : n.text ?? "")).join("");
}
