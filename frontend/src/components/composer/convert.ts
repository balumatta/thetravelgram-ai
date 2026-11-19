import { marked } from "marked";
import type { BlogSection } from "../BlogRenderer";
import { escapeHtml } from "./inlineHtml";

// ── End-of-blog sections ─────────────────────────────────────

export type SectionKind = "itinerary" | "must_visit" | "tips" | "travellers" | "thanks";
export type Row = Record<string, string>;
export interface EndSection {
  id: number;
  kind: SectionKind;
  rows: Row[];
}

export const SECTION_TYPES: Record<
  SectionKind,
  { title: string; hint: string; cols: string; add: string; photo?: boolean; fields: Array<{ key: string; label: string; multiline?: boolean }> }
> = {
  itinerary: {
    title: "Itinerary",
    hint: "The places you went, in order",
    cols: "1fr",
    add: "place",
    fields: [{ key: "place", label: "Place, e.g. Victoria, Mahé" }],
  },
  must_visit: {
    title: "Must Visit",
    hint: "Places you'd tell a friend not to miss",
    cols: "1fr 1.6fr",
    add: "place",
    fields: [{ key: "name", label: "Place" }, { key: "why", label: "Why it's worth it" }],
  },
  tips: {
    title: "Tips",
    hint: "Short, practical advice",
    cols: "1fr",
    add: "tip",
    fields: [{ key: "text", label: "Tip", multiline: true }],
  },
  travellers: {
    title: "Travellers",
    hint: "Who you travelled with: photo, name and title",
    cols: "1fr 1fr",
    add: "traveller",
    photo: true,
    fields: [
      { key: "name", label: "Name" },
      { key: "role", label: "Title, e.g. Wife & co-traveller" },
    ],
  },
  thanks: {
    title: "Special Thanks",
    hint: "The people who made the trip: photo, name and title",
    cols: "1fr 1fr",
    add: "person",
    photo: true,
    fields: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role, e.g. Local guide" },
    ],
  },
};

let nextId = 0;
export const newSectionId = () => ++nextId;

const filled = (r: Row) => Object.entries(r).some(([k, v]) => !k.startsWith("_") && String(v ?? "").trim());

/** Stored sections → editable end sections (story blocks are ignored here). */
export function toEndSections(sections: BlogSection[] | null | undefined): EndSection[] {
  const out: EndSection[] = [];
  for (const s of sections ?? []) {
    let kind: SectionKind | null = null;
    let rows: Row[] = [];
    switch (s.type) {
      case "itinerary":
        kind = "itinerary";
        rows = (s.stops ?? []).map((place) => ({ place }));
        break;
      case "must_visit":
        kind = "must_visit";
        rows = (s.places ?? []).map((p) => ({ name: p.name, why: p.why, _emoji: p.emoji ?? "" }));
        break;
      case "tips":
        kind = "tips";
        rows = (s.items ?? []).map((text) => ({ text }));
        break;
      case "thanks":
      case "travellers":
        kind = s.type;
        rows = (s.people ?? []).map((p) => ({ name: p.name, role: p.role ?? "", image_url: p.image_url ?? "" }));
        break;
    }
    if (kind && !out.some((x) => x.kind === kind)) out.push({ id: newSectionId(), kind, rows: rows.length ? rows : [{}] });
  }
  return out;
}

/** Editable end sections → stored sections, in the order the author arranged them. */
export function fromEndSections(list: EndSection[]): BlogSection[] {
  const out: BlogSection[] = [];
  for (const s of list) {
    const rows = s.rows.filter(filled);
    if (!rows.length) continue;
    switch (s.kind) {
      case "itinerary":
        out.push({ type: "itinerary", stops: rows.map((r) => (r.place ?? "").trim()) });
        break;
      case "must_visit":
        out.push({ type: "must_visit", places: rows.map((r) => ({ name: r.name ?? "", why: r.why ?? "", emoji: r._emoji ?? "" })) });
        break;
      case "tips":
        out.push({ type: "tips", items: rows.map((r) => (r.text ?? "").trim()) });
        break;
      case "thanks":
      case "travellers":
        out.push({
          type: s.kind,
          people: rows.map((r) => ({ name: r.name ?? "", role: r.role ?? "", image_url: r.image_url ?? "" })),
        });
        break;
    }
  }
  return out;
}

// ── Older blog formats → one rich-text story ─────────────────

function text(s?: string, html?: string) {
  return html ?? escapeHtml(s ?? "").replace(/\n/g, "<br>");
}

/** Story blocks from the older structured format → rich HTML. */
function structuredToHtml(sections: BlogSection[]): string {
  const parts: string[] = [];
  for (const s of sections) {
    switch (s.type) {
      case "paragraph":
        parts.push(`<p>${text(s.text, s.html)}</p>`);
        break;
      case "closing":
        parts.push(`<p>${text(s.text)}</p>`);
        break;
      case "fact":
        parts.push(`<p class="is-fact">${text(s.text, s.html)}</p>`);
        break;
      case "conversation":
        for (const l of s.lines ?? []) {
          parts.push(`<p class="is-convo">${l.speaker ? `${escapeHtml(l.speaker)}: ` : ""}${escapeHtml(l.text)}</p>`);
        }
        break;
      case "day_header": {
        const label = [s.day_number != null ? `Day ${s.day_number}` : "", s.date ?? ""].filter(Boolean).join(" · ");
        if (label) parts.push(`<h3>${escapeHtml(label)}</h3>`);
        if (s.title) parts.push(`<h2>${escapeHtml(s.title)}</h2>`);
        break;
      }
      case "image":
      case "video":
        if (s.src) {
          const media = s.type === "video" ? `<video src="${escapeHtml(s.src)}"></video>` : `<img src="${escapeHtml(s.src)}">`;
          parts.push(`<figure>${media}<figcaption>${escapeHtml(s.caption ?? "")}</figcaption></figure>`);
        }
        break;
    }
  }
  return parts.join("");
}

function markdownToHtml(md: string, title: string): string {
  let html = marked.parse(md, { async: false }) as string;
  // The title lives in its own field — drop a leading "# Title" so it isn't duplicated.
  html = html.replace(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/, (m, inner) =>
    inner.replace(/<[^>]+>/g, "").trim().toLowerCase() === title.trim().toLowerCase() || !title ? "" : m,
  );
  return html.replace(/<(\/?)h1\b/g, "<$1h2").replace(/<(\/?)h[4-6]\b/g, "<$1h3");
}

export interface ComposerInput {
  html: string;
  endSections: EndSection[];
}

/** Whatever format the blog is stored in → editor input. */
export function toComposerInput(
  content: string,
  format: "markdown" | "html" | "structured" | "rich",
  sections: BlogSection[] | null | undefined,
  title: string,
): ComposerInput {
  const endSections = toEndSections(sections);
  if (format === "rich") return { html: content, endSections };
  if (format === "structured" && sections?.length) return { html: structuredToHtml(sections), endSections };
  if (format === "html") return { html: content, endSections };
  return { html: markdownToHtml(content ?? "", title), endSections };
}
