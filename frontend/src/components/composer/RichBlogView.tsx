"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlogSection } from "../BlogRenderer";
import RouteRail from "./RouteRail";
import { prepareStoryHtml } from "./richHtml";
import "./story.css";

export interface HeroFact {
  value: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string;
  bannerUrl?: string;
  html: string;
  sections: BlogSection[];
  /** Small line above the title, e.g. "July 2017". */
  kicker?: string;
  /** Up to three quick facts shown under the title. */
  facts?: HeroFact[];
}

function initials(name: string) {
  return name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "♥";
}

function PeopleList({ people }: { people: Array<{ name: string; role?: string; image_url?: string }> }) {
  return (
    <ul className="tk-list">
      {people.map((p, j) => (
        <li key={j} className="tk">
          <span className="tk-pic">{p.image_url ? <img src={p.image_url} alt="" /> : initials(p.name)}</span>
          <span className="tk-text">
            <span className="tk-name">{p.name}</span>
            {p.role && <span className="tk-role">{p.role}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Published look for a rich-text blog: split hero, story with a route rail, then the end sections. */
export default function RichBlogView({ title, subtitle, bannerUrl, html, sections, kicker, facts }: Props) {
  // Sanitizing needs the DOM, so it runs after mount.
  const [storyHtml, setStoryHtml] = useState("");
  useEffect(() => setStoryHtml(prepareStoryHtml(html)), [html]);
  // Stable object: a new one each render can make React rewrite the story and drop live state (embeds, carousels).
  const storyInner = useMemo(() => ({ __html: storyHtml }), [storyHtml]);

  const stops = sections.find((s) => s.type === "itinerary")?.stops?.filter(Boolean) ?? [];
  const hasRail = stops.length > 1;

  // Instagram embeds report their height by postMessage; size each iframe to fit its post.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== "https://www.instagram.com") return;
      let data: { type?: string; details?: { height?: number } };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const h = data?.type === "MEASURE" ? data.details?.height : undefined;
      if (!h) return;
      document.querySelectorAll<HTMLIFrameElement>(".ig-embed iframe").forEach((f) => {
        if (f.contentWindow === e.source) f.style.height = `${Math.ceil(h)}px`;
      });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Gallery carousels: arrows/dots page the track; the active dot follows swipes. Delegated from the article.
  const syncCarousel = (gal: HTMLElement) => {
    const track = gal.querySelector<HTMLElement>(".tg-gal-track");
    if (!track) return;
    const dots = Array.from(gal.querySelectorAll<HTMLElement>(".tg-gal-dot"));
    const p = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    dots.forEach((d, i) => d.classList.toggle("is-on", i === p));
    gal.classList.toggle("at-start", p === 0);
    gal.classList.toggle("at-end", p >= dots.length - 1);
  };
  const carouselClick = (target: HTMLElement) => {
    const ctl = target.closest<HTMLElement>(".tg-gal-nav, .tg-gal-dot");
    const gal = ctl?.closest<HTMLElement>(".tg-gal");
    const track = gal?.querySelector<HTMLElement>(".tg-gal-track");
    if (!ctl || !gal || !track) return false;
    const pages = gal.querySelectorAll(".tg-gal-dot").length;
    const cur = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const to = ctl.classList.contains("tg-gal-dot") ? Number(ctl.dataset.page) : cur + (ctl.classList.contains("is-next") ? 1 : -1);
    track.scrollTo({ left: Math.max(0, Math.min(to, pages - 1)) * track.clientWidth, behavior: "smooth" });
    return true;
  };
  useEffect(() => {
    articleRef.current?.querySelectorAll<HTMLElement>(".tg-gal.is-carousel").forEach(syncCarousel);
  }, [storyHtml]);

  // ── Photo preview ──
  const articleRef = useRef<HTMLElement>(null);
  const [photos,setPhotos] = useState<Array<{ src: string; caption: string }>>([]);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const imgs = Array.from(article.querySelectorAll<HTMLImageElement>("img[data-photo]"));
    setPhotos(imgs.map((im) => ({ src: im.src, caption: im.closest("figure")?.querySelector("figcaption")?.textContent ?? im.alt ?? "" })));
  }, [storyHtml]);
  const openFrom = (t: HTMLElement) => {
    if (t.tagName !== "IMG" || t.dataset.photo == null) return false;
    setOpen(Number(t.dataset.photo));
    return true;
  };
  const step = useCallback(
    (d: number) => setOpen((o) => (o == null || !photos.length ? o : (o + d + photos.length) % photos.length)),
    [photos.length],
  );
  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, step]);

  const endSections = sections.filter((s) => ["itinerary", "must_visit", "tips", "travellers", "thanks"].includes(s.type));

  return (
    <div className={`rbv tg-story-scope ${hasRail ? "has-rail" : ""}`}>
      <div className="rbv-page">
        <header className={`rbv-hero ${bannerUrl ? "has-cover" : ""}`}>
          {bannerUrl && (
            <div className="rbv-cover">
              <img src={bannerUrl} alt="" />
            </div>
          )}
          <div className="rbv-head">
            {kicker && <p className="rbv-kicker">{kicker}</p>}
            <h1 className="rbv-title">{title || "Untitled story"}</h1>
            {subtitle && <p className="rbv-sub">{subtitle}</p>}
            {facts && facts.length > 0 && (
              <dl className="rbv-facts">
                {facts.slice(0, 3).map((f) => (
                  <div key={f.label}>
                    <dd>{f.value}</dd>
                    <dt>{f.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </header>
        <div className="rbv-rule" />

        <div className="rbv-body">
          <div className="rbv-main">
            <article
              ref={articleRef}
              className="tg-story"
              onClick={(e) => carouselClick(e.target as HTMLElement) || openFrom(e.target as HTMLElement)}
              onScrollCapture={(e) => {
                const t = e.target as HTMLElement;
                if (t.classList?.contains("tg-gal-track")) syncCarousel(t.closest<HTMLElement>(".tg-gal")!);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && openFrom(e.target as HTMLElement)) e.preventDefault();
              }}
              dangerouslySetInnerHTML={storyInner}
            />

            {endSections.length > 0 && <div className="rbv-sections-head"><span>Good to know</span></div>}
            <div className="rbv-sections">
              {endSections.map((s, i) => {
                switch (s.type) {
                  case "itinerary":
                    return (
                      <section key={i} className="rbv-sec rbv-sec-itinerary">
                        <h2 className="rbv-h">Itinerary</h2>
                        <RouteRail stops={(s.stops ?? []).filter(Boolean)} />
                      </section>
                    );
                  case "must_visit":
                    return (
                      <section key={i} className="rbv-sec">
                        <h2 className="rbv-h">Must Visit</h2>
                        <div className="rbv-grid">
                          {(s.places ?? []).map((p, j) => (
                            <div key={j} className="rbv-card">
                              <b>{p.emoji ? `${p.emoji} ` : ""}{p.name}</b>
                              {p.why && <span>{p.why}</span>}
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  case "tips":
                    return (
                      <section key={i} className="rbv-sec">
                        <h2 className="rbv-h">Tips</h2>
                        <ol className="rbv-tips">
                          {(s.items ?? []).map((t, j) => <li key={j}><span>{t}</span></li>)}
                        </ol>
                      </section>
                    );
                  case "travellers":
                    return (
                      <section key={i} className="rbv-sec">
                        <h2 className="rbv-h">Travellers</h2>
                        <PeopleList people={s.people ?? []} />
                      </section>
                    );
                  case "thanks":
                    return (
                      <section key={i} className="rbv-sec">
                        <h2 className="rbv-h">Special Thanks</h2>
                        <PeopleList people={s.people ?? []} />
                      </section>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>

          {hasRail && (
            <aside className="rbv-rail" aria-label="Itinerary">
              <div className="rbv-rail-card" data-follow-car>
                <h2 className="rbv-h">Itinerary</h2>
                <RouteRail stops={stops} />
              </div>
            </aside>
          )}
        </div>
      </div>

      {open != null && photos[open] && (
        <div className="rbv-lightbox" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={() => setOpen(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={photos[open].src} alt={photos[open].caption} />
            <figcaption>
              {photos[open].caption}
              {photos.length > 1 && <span>{open + 1} / {photos.length}</span>}
            </figcaption>
          </figure>
          <button type="button" className="rbv-lb-close" aria-label="Close preview" autoFocus onClick={() => setOpen(null)}>✕</button>
          {photos.length > 1 && (
            <>
              <button type="button" className="rbv-lb-nav is-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
              <button type="button" className="rbv-lb-nav is-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
