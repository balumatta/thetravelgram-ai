import fs from "node:fs";
import path from "node:path";
import type { BlogSection } from "@/components/BlogRenderer";

/**
 * Published blogs are bundled with the frontend (content/blogs/<slug>.json) so the site
 * can be hosted on its own (e.g. Amplify) without the backend. S3 `published/` holds the
 * same documents; the backend's publish/import step writes both.
 */
export interface Highlight {
  kind: "conversation" | "fact";
  scene?: string;
  lines: Array<{ speaker?: string; text: string }>;
}

export interface PublishedBlog {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  banner_url?: string;
  content: string;
  sections?: BlogSection[];
  minutes_to_read?: number | null;
  published_at?: string;
  highlights?: Highlight[];
}

const DIR = path.join(process.cwd(), "content", "blogs");

export function listPublishedSlugs(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

/** Card data for every published blog, newest trip first. */
export function listPublishedBlogs() {
  return listPublishedSlugs()
    .map((slug) => getPublishedBlog(slug))
    .filter((b): b is PublishedBlog => !!b)
    .map(({ slug, title, subtitle, excerpt, banner_url, published_at, minutes_to_read }) => ({
      slug, title, subtitle, excerpt, banner_url, published_at, minutes_to_read,
    }))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

export function getPublishedBlog(slug: string): PublishedBlog | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

/** Hero kicker and quick facts, derived from whatever the blog has (all optional). */
export function heroInfo(b: PublishedBlog): { kicker: string; facts: Array<{ value: string; label: string }> } {
  let kicker = "";
  if (b.published_at) {
    const d = new Date(b.published_at);
    if (!isNaN(d.getTime())) kicker = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  const facts: Array<{ value: string; label: string }> = [];
  const stops = b.sections?.find((s) => s.type === "itinerary")?.stops?.filter(Boolean) ?? [];
  const places = new Set(stops.map((s) => s.trim().toLowerCase())).size;
  if (places) facts.push({ value: String(places), label: places === 1 ? "place" : "places" });
  const photos = (b.content.match(/<img\b/g) ?? []).length;
  if (photos) facts.push({ value: String(photos), label: photos === 1 ? "photo" : "photos" });
  if (b.minutes_to_read) facts.push({ value: `${b.minutes_to_read} min`, label: "read" });
  return { kicker, facts };
}

// ── Site-wide collections (built from content/blogs at build time) ──

export interface Photo {
  src: string;
  width?: number;
  height?: number;
  caption: string;
  slug: string;
  blogTitle: string;
}

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

/** Every photo in a blog's story, in reading order, with its real size and caption. */
export function photosOf(b: PublishedBlog): Photo[] {
  const out: Photo[] = [];
  const figRe = /<figure\b[^>]*>([\s\S]*?)<\/figure>|<img\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = figRe.exec(b.content))) {
    const block = m[0];
    const img = block.match(/<img\b[^>]*>/)?.[0];
    if (!img) continue; // videos
    const attr = (n: string) => img.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    const src = attr("src");
    if (!src) continue;
    const cap = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1] ?? attr("alt") ?? "";
    const w = Number(attr("width")) || undefined;
    const h = Number(attr("height")) || undefined;
    out.push({ src, width: w, height: h, caption: decode(cap), slug: b.slug, blogTitle: b.title });
  }
  return out;
}

export function allPublished(): PublishedBlog[] {
  return listPublishedSlugs()
    .map((s) => getPublishedBlog(s))
    .filter((b): b is PublishedBlog => !!b)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

export function listPhotos(): Photo[] {
  return allPublished().flatMap(photosOf);
}

export interface SiteHighlight extends Highlight {
  slug: string;
  blogTitle: string;
}

/** Highlights from every blog, interleaved so consecutive ones come from different trips. */
export function listHighlights(): SiteHighlight[] {
  const per = allPublished().map((b) => (b.highlights ?? []).map((h) => ({ ...h, slug: b.slug, blogTitle: b.title })));
  const out: SiteHighlight[] = [];
  for (let i = 0; per.some((l) => i < l.length); i++) per.forEach((l) => l[i] && out.push(l[i]));
  return out;
}

export function siteStats() {
  const blogs = allPublished();
  const places = new Set(
    blogs.flatMap((b) => b.sections?.find((s) => s.type === "itinerary")?.stops ?? []).map((s) => s.trim().toLowerCase()),
  );
  return { stories: blogs.length, photos: blogs.reduce((n, b) => n + photosOf(b).length, 0), places: places.size };
}
