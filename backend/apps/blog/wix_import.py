"""
Wix blog post (Ricos richContent JSON) → our rich blog format.

Mapping:
  PARAGRAPH        → <p>
  HEADING          → <h2> (level 1–2) / <h3> (level 3+)
  BLOCKQUOTE       → one <p class="is-convo"> per line   (Wix posts use quotes for dialogue)
  CODE_BLOCK       → <p class="is-fact">                 (Wix posts use code blocks as callouts)
  IMAGE / GALLERY  → <figure><img></figure>, re-hosted to S3 under media/<slug>/
  VIDEO (YouTube)  → a "Watch on YouTube" link paragraph
  DIVIDER          → <hr>
  BULLETED/ORDERED → <ul>/<ol>
  HTML embeds      → dropped (Instagram etc.), reported in warnings
Bold, italic, underline and links are kept; colours and font sizes are dropped so the theme applies.
"""
import html
import logging
import mimetypes
import re
import urllib.request
from datetime import datetime, timezone

import anthropic

from apps.blog.published_store import put_media
from apps.voice_agent.blog_schema import STRUCTURED_BLOG_TOOL
from main.settings import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

WIX_MEDIA = "https://static.wixstatic.com/media/"
WIX_VIDEO = "https://video.wixstatic.com/"
SECTIONS_MODEL = "claude-opus-5"
END_SECTION_TYPES = ("itinerary", "must_visit", "tips", "travellers", "thanks")

# Wix posts end with the author's own lists after the story ("Itinerary", "Must Visit", "Special Thanks"…).
# These labels start that appendix; it's cut from the story and becomes the end sections.
APPENDIX_LABEL = re.compile(
    r"^(crisp\s+)?(itinerary|route\s*map|must\s*visit|special\s*thanks|tips|travell?ers)\b", re.I
)


class WixConverter:
    def __init__(self, post: dict, slug: str):
        self.post = post
        self.slug = slug
        self.warnings: list[str] = []
        self.media_count = 0

    # ── media ──
    def rehost(self, src: str) -> str:
        """Copy a Wix-hosted file into S3. Keys are deterministic, so re-running overwrites instead of duplicating."""
        if src.startswith("http"):
            url = src
        elif src.startswith("video/"):
            url = WIX_VIDEO + src
        else:
            url = WIX_MEDIA + src
        # Wix videos are all named file.mp4, so name them by their id instead.
        tail = src.split("/")[1] + ".mp4" if src.startswith("video/") else url.rsplit("/", 1)[-1]
        name = re.sub(r"[^A-Za-z0-9._-]", "_", tail)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
            ctype = r.headers.get_content_type() or mimetypes.guess_type(name)[0] or "application/octet-stream"
        self.media_count += 1
        return put_media(data, f"{self.slug}/{name}", ctype)

    # ── inline text ──
    def inline(self, nodes: list, drop_italic=False) -> str:
        out = []
        for n in nodes:
            if n.get("type") != "TEXT":
                out.append(self.inline(n.get("nodes", []), drop_italic))
                continue
            td = n.get("textData", {})
            t = html.escape(td.get("text", "")).replace("\n", "<br>")
            if not t:
                continue
            href = None
            for d in td.get("decorations", []):
                kind = d.get("type")
                if kind == "BOLD" and d.get("fontWeightValue", 700) >= 600:
                    t = f"<strong>{t}</strong>"
                elif kind == "ITALIC" and not drop_italic:
                    t = f"<em>{t}</em>"
                elif kind == "UNDERLINE":
                    t = f"<u>{t}</u>"
                elif kind == "LINK":
                    href = (d.get("linkData", {}).get("link") or {}).get("url")
            if href:
                t = f'<a href="{html.escape(href, quote=True)}">{t}</a>'
            out.append(t)
        s = "".join(out)
        s = re.sub(r"(<br>\s*)+$", "", s)  # Wix ends most paragraphs with a stray newline
        return s.strip()

    @staticmethod
    def _lines(nodes: list) -> list[list]:
        """Split a paragraph's TEXT runs on '\n' into separate lines of runs."""
        lines, cur = [], []
        for n in nodes:
            text = n.get("textData", {}).get("text", "")
            parts = text.split("\n")
            for i, part in enumerate(parts):
                if part:
                    cur.append({**n, "textData": {**n["textData"], "text": part}})
                if i < len(parts) - 1:
                    lines.append(cur)
                    cur = []
        lines.append(cur)
        return [l for l in lines if l]

    @staticmethod
    def figure(src: str, container: dict, width, height, caption: str, kind: str = "image") -> str:
        """Keep Wix's placement: size (content/small/full/original), alignment, and the photo's real dimensions."""
        w = container.get("width") or {}
        size = {"SMALL": "small", "FULL_WIDTH": "full", "ORIGINAL": "original"}.get(w.get("size"), "content")
        if w.get("custom"):
            size = "custom"
        align = (container.get("alignment") or "CENTER").lower()
        attrs = f' data-size="{size}" data-align="{align}"'
        if size == "custom":
            attrs += f' data-custom-width="{int(float(w["custom"]))}"'
        dims = f' width="{int(width)}" height="{int(height)}"' if width and height else ""
        media = f'<video src="{src}"{dims} controls playsinline preload="metadata"></video>' if kind == "video" else f'<img src="{src}"{dims}>'
        return f'<figure data-kind="{kind}"{attrs}>{media}<figcaption>{caption}</figcaption></figure>'

    def child_caption(self, n: dict) -> str:
        """Caption text from a CAPTION child node (newer Wix format; videos always use this)."""
        for c in n.get("nodes", []):
            if c.get("type") == "CAPTION":
                return html.escape(self.plain(c).strip())
        return ""

    # ── blocks ──
    def block(self, n: dict) -> list[str]:
        t = n.get("type")
        kids = n.get("nodes", [])
        if t == "PARAGRAPH":
            body = self.inline(kids)
            return [f"<p>{body}</p>"] if re.sub(r"<[^>]+>|&nbsp;", "", body).strip() else []
        if t == "HEADING":
            level = n.get("headingData", {}).get("level", 2)
            tag = "h2" if level <= 2 else "h3"
            body = self.inline(kids)
            return [f"<{tag}>{body}</{tag}>"] if body else []
        if t == "BLOCKQUOTE":
            out = []
            for p in kids:
                for line in self._lines(p.get("nodes", [])):
                    body = self.inline(line, drop_italic=True)
                    if body:
                        out.append(f'<p class="is-convo">{body}</p>')
            return out
        if t == "CODE_BLOCK":
            body = self.inline(kids, drop_italic=True)
            return [f'<p class="is-fact">{body}</p>'] if body else []
        if t == "IMAGE":
            img = n.get("imageData", {})
            src = (img.get("image", {}).get("src") or {})
            ref = src.get("id") or src.get("url")
            if not ref:
                return []
            caption = html.escape(img.get("caption") or "") or self.child_caption(n)
            dims = img.get("image", {})
            return [self.figure(self.rehost(ref), img.get("containerData", {}), dims.get("width"), dims.get("height"), caption)]
        if t == "GALLERY":
            # One gallery block (grid, or carousel when > 6 photos) instead of loose photos.
            figs = []
            for item in n.get("galleryData", {}).get("items", []):
                media = item.get("image", {}).get("media", {})
                src = media.get("src") or {}
                ref = src.get("id") or src.get("url")
                if not ref:
                    continue
                w, h = media.get("width"), media.get("height")
                dims = f' width="{int(w)}" height="{int(h)}"' if w and h else ""
                cap = html.escape(item.get("title") or "")
                figs.append(f'<figure data-kind="image"><img src="{self.rehost(ref)}"{dims} alt="{cap}"><figcaption>{cap}</figcaption></figure>')
            return [f'<div data-gallery="">{"".join(figs)}</div>'] if figs else []
        if t == "VIDEO":
            v = n.get("videoData", {})
            vsrc = v.get("video", {}).get("src") or {}
            url = vsrc.get("url")
            title = html.escape(v.get("title") or "this video")
            if url:
                site = "YouTube" if "youtu" in url else "Vimeo" if "vimeo" in url else "the web"
                return [f'<p><a href="{html.escape(url, quote=True)}">▶ Watch {title} on {site}</a></p>']
            if vsrc.get("id"):
                # Wix-hosted video: copy it into S3 and play it inline.
                thumb = v.get("thumbnail", {})
                src = self.rehost(vsrc["id"])
                return [self.figure(src, v.get("containerData", {}), thumb.get("width"), thumb.get("height"), self.child_caption(n), kind="video")]
            self.warnings.append("Dropped a video with no source")
            return []
        if t == "DIVIDER":
            return ["<hr>"]
        if t in ("BULLETED_LIST", "ORDERED_LIST"):
            tag = "ul" if t == "BULLETED_LIST" else "ol"
            items = []
            for li in kids:
                body = "".join(self.inline(p.get("nodes", [])) for p in li.get("nodes", []))
                if body:
                    items.append(f"<li><p>{body}</p></li>")
            return [f"<{tag}>{''.join(items)}</{tag}>"] if items else []
        if t == "HTML":
            # Third-party embeds can't run in the story; keep them as links.
            h = n.get("htmlData", {}).get("html", "") or ""
            link = (re.findall(r'data-instgrm-permalink="([^"]+)"', h) or re.findall(r'<iframe[^>]+src="([^"]+)"', h)
                    or [n.get("htmlData", {}).get("url", "")])[0]
            link = html.unescape(link).split("?utm_source")[0]
            if not link:
                self.warnings.append("Dropped an HTML embed with no link")
                return []
            label = "View this post on Instagram" if "instagram.com" in link else "Open the map" if "google." in link and "map" in link else "Open the embedded content"
            return [f'<p><a href="{html.escape(link, quote=True)}">↗ {label}</a></p>']
        if t == "CAPTION":
            body = self.inline(kids)
            return [f"<p><em>{body}</em></p>"] if body else []
        self.warnings.append(f"Unknown Wix node {t}")
        return []

    @staticmethod
    def plain(n: dict) -> str:
        out = []
        for c in n.get("nodes", []):
            out.append(c.get("textData", {}).get("text", "") if c.get("type") == "TEXT" else WixConverter.plain(c))
            if c.get("type") in ("PARAGRAPH", "LIST_ITEM", "HEADING"):
                out.append("\n")
        return "".join(out)

    def split_appendix(self, nodes: list) -> tuple[list, list[tuple[str, list]]]:
        """Story nodes, and the author's end lists as [(label, nodes)]. Only labels in the back half count."""
        start = None
        for i, n in enumerate(nodes):
            if i < len(nodes) // 2 or n.get("type") not in ("PARAGRAPH", "HEADING"):
                continue
            t = self.plain(n).strip().rstrip(":").strip()
            if len(t) <= 60 and APPENDIX_LABEL.match(t):
                start = i
                break
        if start is None:
            return nodes, []
        groups: list[tuple[str, list]] = []
        for n in nodes[start:]:
            t = self.plain(n).strip().rstrip(":").strip()
            if n.get("type") in ("PARAGRAPH", "HEADING") and len(t) <= 60 and APPENDIX_LABEL.match(t):
                groups.append((t, []))
            else:
                groups[-1][1].append(n)
        return nodes[:start], groups

    def convert(self) -> dict:
        story, appendix = self.split_appendix(self.post["richContent"]["nodes"])
        parts = []
        for n in story:
            parts.extend(self.block(n))
        notes = []
        for label, group in appendix:
            lines = [self.plain(n).strip() for n in group if n.get("type") not in ("IMAGE", "GALLERY", "HTML", "VIDEO")]
            notes.append(f"## {label}\n" + "\n".join(l for l in lines if l))
            # Photos, videos and embeds in the appendix (e.g. a route map) stay with the story.
            media = [h for n in group if n.get("type") in ("IMAGE", "GALLERY", "VIDEO", "HTML") for h in self.block(n)]
            if media:
                parts.append(f"<h3>{html.escape(label)}</h3>")
                parts.extend(media)
        cover = (self.post.get("media", {}).get("wixMedia", {}).get("image") or {})
        banner = self.rehost(cover.get("url") or cover["id"]) if (cover.get("url") or cover.get("id")) else ""
        return {"html": "\n".join(parts), "banner_url": banner, "author_notes": "\n\n".join(notes)}


# ── AI: end sections + subtitle ──────────────────────────────

def _end_sections_tool() -> dict:
    variants = STRUCTURED_BLOG_TOOL["input_schema"]["properties"]["sections"]["items"]["anyOf"]
    end = [v for v in variants if v["properties"]["type"]["enum"][0] in END_SECTION_TYPES]
    # Travellers: same shape as thanks.
    import copy
    thanks = next(v for v in end if v["properties"]["type"]["enum"][0] == "thanks")
    travellers = copy.deepcopy(thanks)
    travellers["properties"]["type"]["enum"] = ["travellers"]
    end.append(travellers)
    return {
        "name": "add_end_sections",
        "description": "Add the end-of-blog sections and a subtitle for an existing travel story.",
        "input_schema": {
            "type": "object",
            "required": ["subtitle", "sections"],
            "properties": {
                "subtitle": {"type": "string", "description": "Short evocative one-liner e.g. '14 days, one campervan, four idiots'"},
                "sections": {"type": "array", "items": {"anyOf": end}},
            },
        },
    }


SECTIONS_PROMPT = """You are given a published travel blog and, when present, the AUTHOR'S END NOTES
(lists the author wrote after the story). Do NOT rewrite the story. Produce only the end sections.

The author's notes are the source of truth:
- itinerary: if the author gave one (Itinerary / Route), use exactly their stops in their order, including
  repeated stops and start/end cities. Fix only obvious spelling (e.g. "Benagaluru" -> "Bengaluru").
- must_visit: if the author gave a Must Visit list, use exactly their places. "why" = a short line in the
  author's own words from their note (keep facts like "missed it due to bad weather"). One emoji each.
- travellers / thanks: if the author gave them, one entry per person or line exactly as written. name = the
  name(s) (join a couple with "&"); role = the short descriptor they gave (e.g. "Co-traveller, CA",
  "From Rajasthan", "SUV driver, MakeMyTrip team"). Fix obvious spelling only. Leave image_url empty.
- tips: if the author gave tips, use them (tighten wording lightly).
Only when the author gave NO list for a section:
- itinerary: the places visited, in order, from the story (place names only).
- must_visit: 3-6 places from the story worth recommending.
- tips: 4-8 short practical tips the story actually supports.
- travellers / thanks: never invent people; omit the section.
Also write a short, playful subtitle in the author's voice."""


def story_text(story_html: str) -> str:
    text = re.sub(r"<br>", "\n", story_html)
    text = re.sub(r'<p class="is-convo">', "[conversation] ", text)
    text = re.sub(r'<p class="is-fact">', "[fact] ", text)
    text = re.sub(r"</(p|h2|h3|li|figure)>", "\n", text)
    return html.unescape(re.sub(r"<[^>]+>", "", text))


# ── AI: highlights for the home page ─────────────────────────

HIGHLIGHTS_TOOL = {
    "name": "pick_highlights",
    "description": "Pick the most fun, quotable moments from a travel blog, quoted from the story.",
    "input_schema": {
        "type": "object",
        "required": ["highlights"],
        "properties": {
            "highlights": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "required": ["kind", "lines"],
                    "properties": {
                        "kind": {"type": "string", "enum": ["conversation", "fact"]},
                        "scene": {"type": "string", "description": "Where/when, 2-6 words, e.g. 'Khardung La, 18,380 ft'"},
                        "lines": {
                            "type": "array",
                            "description": "conversation: 2-5 lines in order. fact: exactly 1 line.",
                            "items": {
                                "type": "object",
                                "required": ["text"],
                                "properties": {
                                    "speaker": {"type": "string", "description": "Short name ('Mani', 'Me', 'Driver'); empty for facts or when unknown"},
                                    "text": {"type": "string"},
                                },
                            },
                        },
                    },
                },
            }
        },
    },
}

HIGHLIGHTS_PROMPT = """You pick highlights from a personal travel blog for its home page.
Choose 3-6 moments a reader would smile at or remember: funny exchanges, witty lines, surprising facts.
Mix kinds: at least one conversation and at least one fact when the story has them.
Quote the author's words from the story. You may trim a line or drop narration like "he said", and
fix obvious typos, but never invent or reword. Keep each line under ~160 characters.
Lines marked [conversation] are dialogue; lines marked [fact] are the author's callouts.
For conversations, name the speaker only when the story makes it clear ("Me" for the author)."""


def build_highlights(title: str, story_html: str) -> list:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=SECTIONS_MODEL,
        max_tokens=3000,
        system=HIGHLIGHTS_PROMPT,
        tools=[HIGHLIGHTS_TOOL],
        tool_choice={"type": "tool", "name": "pick_highlights"},
        messages=[{"role": "user", "content": f"# {title}\n\n{story_text(story_html)}"}],
    )
    for b in resp.content:
        if b.type == "tool_use":
            return [h for h in b.input.get("highlights", []) if h.get("lines")]
    return []


def build_end_sections(title: str, story_html: str, author_notes: str = "") -> dict:
    text = story_text(story_html)
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=SECTIONS_MODEL,
        max_tokens=4000,
        system=SECTIONS_PROMPT,
        tools=[_end_sections_tool()],
        tool_choice={"type": "tool", "name": "add_end_sections"},
        messages=[{
            "role": "user",
            "content": f"# {title}\n\n{text}\n\n=== AUTHOR'S END NOTES ===\n{author_notes or '(none)'}",
        }],
    )
    for b in resp.content:
        if b.type == "tool_use":
            return b.input
    raise ValueError("Model did not return end sections")


def import_wix_post(post: dict, previous: dict | None = None) -> tuple[dict, list[str]]:
    slug = post.get("slug") or re.sub(r"[^a-z0-9]+", "-", post["title"].lower()).strip("-")
    conv = WixConverter(post, slug)
    converted = conv.convert()
    # Re-imports keep the sections/subtitle already generated (and possibly hand-edited) unless there are none.
    if previous and previous.get("sections"):
        ai = {"subtitle": previous.get("subtitle", ""), "sections": previous["sections"]}
    else:
        ai = build_end_sections(post["title"], converted["html"], converted.get("author_notes", ""))
    order = {k: i for i, k in enumerate(END_SECTION_TYPES)}
    sections = sorted([s for s in ai.get("sections", []) if s.get("type") in order], key=lambda s: order[s["type"]])
    now = datetime.now(timezone.utc).isoformat()
    highlights = (previous or {}).get("highlights") or build_highlights(post["title"], converted["html"])
    blog = {
        "id": post["id"],
        "slug": slug,
        "status": "published",
        "title": post["title"],
        "subtitle": ai.get("subtitle", ""),
        "excerpt": post.get("excerpt", ""),
        "banner_url": converted["banner_url"],
        "theme": "warm",
        "content": converted["html"],
        "content_format": "rich",
        "sections": sections,
        "minutes_to_read": post.get("minutesToRead"),
        "published_at": post.get("firstPublishedDate") or now,
        "highlights": highlights,
        "source": {"type": "wix", "post_id": post["id"]},
        "created_at": (previous or {}).get("created_at", now),
        "updated_at": now,
    }
    conv.warnings.insert(0, f"{conv.media_count} media files copied to S3")
    return blog, conv.warnings
