import DOMPurify from "dompurify";
import { SPEAKER_RE } from "./inlineHtml";

const MAP_RE = /^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"<>\s]+$/;
const IG_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?/;

/**
 * Prepare stored story HTML for the published view (browser only):
 * sanitize, turn "Rinku:" at the start of conversation lines into a label,
 * show Instagram links as embedded posts, and open links in a new tab.
 */
export function prepareStoryHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["controls", "playsinline"] });
  const root = document.createElement("div");
  root.innerHTML = clean;

  root.querySelectorAll("p.is-convo").forEach((p) => {
    const first = p.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) return;
    const t = first as Text;
    const m = t.data.match(SPEAKER_RE);
    if (!m) return;
    const rest = t.splitText(m[1].length);
    const label = document.createElement("span");
    label.className = "spk";
    label.textContent = m[1].trim();
    t.replaceWith(label);
    rest.data = rest.data.replace(/^\s+/, "");
  });

  // A paragraph that is just an Instagram post/reel link → the embedded post (click opens Instagram).
  root.querySelectorAll("p").forEach((p) => {
    const a = p.querySelector("a[href]");
    if (!a || p.children.length !== 1 || (p.textContent ?? "").trim() !== (a.textContent ?? "").trim()) return;
    const m = (a.getAttribute("href") ?? "").match(IG_RE);
    if (!m) return;
    const [, kind, code] = m;
    const permalink = `https://www.instagram.com/${kind}/${code}/`;
    const fig = document.createElement("figure");
    fig.className = "ig-embed";
    const frame = document.createElement("iframe");
    frame.src = `${permalink}embed/captioned/`;
    frame.title = kind === "reel" ? "Instagram reel" : "Instagram post";
    frame.loading = "lazy";
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("allowtransparency", "true");
    frame.setAttribute("allow", "encrypted-media; picture-in-picture");
    const link = document.createElement("a");
    link.href = permalink;
    link.className = "ig-link";
    link.textContent = "View on Instagram ↗";
    fig.append(frame, link);
    p.replaceWith(fig);
  });

  // Gallery blocks → adaptive grid (≤ 6 photos), or a carousel of 3×2 pages with arrows and dots.
  root.querySelectorAll("div[data-gallery]").forEach((g) => {
    const items = Array.from(g.querySelectorAll("figure"))
      .map((f) => ({ img: f.querySelector("img"), cap: f.querySelector("figcaption")?.textContent?.trim() ?? "" }))
      .filter((x): x is { img: HTMLImageElement; cap: string } => !!x.img?.getAttribute("src"));
    if (!items.length) return g.remove();
    const pages: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += 6) pages.push(items.slice(i, i + 6));

    const wrap = document.createElement("div");
    wrap.className = `tg-gal ${pages.length > 1 ? "is-carousel" : ""}`;
    const track = document.createElement("div");
    track.className = "tg-gal-track";
    pages.forEach((page) => {
      const pg = document.createElement("div");
      pg.className = `tg-gal-page is-${page.length}`;
      page.forEach(({ img, cap }) => {
        const fig = document.createElement("figure");
        fig.className = "tg-gal-item";
        const im = document.createElement("img");
        im.src = img.getAttribute("src")!;
        im.alt = cap;
        im.loading = "lazy";
        fig.append(im);
        if (cap) {
          const fc = document.createElement("figcaption");
          fc.textContent = cap;
          fig.append(fc);
        }
        pg.append(fig);
      });
      track.append(pg);
    });
    wrap.append(track);
    if (pages.length > 1) {
      const nav = (dir: "prev" | "next", label: string, text: string) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `tg-gal-nav is-${dir}`;
        b.setAttribute("aria-label", label);
        b.textContent = text;
        return b;
      };
      const dots = document.createElement("div");
      dots.className = "tg-gal-dots";
      pages.forEach((_, i) => {
        const d = document.createElement("button");
        d.type = "button";
        d.className = `tg-gal-dot ${i === 0 ? "is-on" : ""}`;
        d.setAttribute("aria-label", `Page ${i + 1} of ${pages.length}`);
        d.dataset.page = String(i);
        dots.append(d);
      });
      const count = document.createElement("span");
      count.className = "tg-gal-count";
      count.textContent = `${items.length} photos`;
      dots.append(count);
      wrap.append(nav("prev", "Previous photos", "‹"), nav("next", "Next photos", "›"), dots);
    }
    g.replaceWith(wrap);
  });

  // A paragraph that is just a Google Maps embed link → the map itself.
  root.querySelectorAll("p").forEach((p) => {
    const a = p.querySelector("a[href]");
    const href = a?.getAttribute("href") ?? "";
    if (!a || p.children.length !== 1 || !MAP_RE.test(href)) return;
    const fig = document.createElement("figure");
    fig.className = "map-embed";
    const frame = document.createElement("iframe");
    frame.src = href;
    frame.title = "Route map";
    frame.loading = "lazy";
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.setAttribute("allowfullscreen", "true");
    fig.append(frame);
    p.replaceWith(fig);
  });

  // Every photo opens the full-screen preview (index = reading order). Baked into the HTML so re-renders keep it.
  root.querySelectorAll("img").forEach((im, i) => {
    im.setAttribute("data-photo", String(i));
    im.setAttribute("tabindex", "0");
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", im.getAttribute("alt") ? `Open photo: ${im.getAttribute("alt")}` : "Open photo");
  });

  root.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
  return root.innerHTML;
}
