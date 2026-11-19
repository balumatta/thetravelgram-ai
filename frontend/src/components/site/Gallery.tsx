"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/publishedBlogs";

/**
 * Photo wall for every blog: filter by trip, masonry grid that settles in as you scroll,
 * and a full-screen viewer with swipe, keyboard, a filmstrip and a link back to the story.
 */
export default function Gallery({ photos }: { photos: Photo[] }) {
  const trips = useMemo(() => {
    const m = new Map<string, { slug: string; title: string; n: number }>();
    photos.forEach((p) => {
      const t = m.get(p.slug) ?? { slug: p.slug, title: p.blogTitle, n: 0 };
      t.n++;
      m.set(p.slug, t);
    });
    return [...m.values()];
  }, [photos]);

  const [trip, setTrip] = useState<string>("all");
  const list = useMemo(() => (trip === "all" ? photos : photos.filter((p) => p.slug === trip)), [photos, trip]);
  const [open, setOpen] = useState<number | null>(null);

  // Tiles fade/settle in as they scroll into view (they start visible if JS or observers are unavailable).
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = grid.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".gl-tile"));
    tiles.forEach((t) => t.classList.add("is-waiting"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove("is-waiting");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    tiles.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [list]);

  return (
    <div className="gl">
      <div className="gl-head">
        <div>
          <p className="gl-kicker">{photos.length} photos · {trips.length} trips</p>
          <h1 className="gl-h1">Gallery</h1>
        </div>
        <div className="gl-chips" role="tablist" aria-label="Filter by trip">
          <button type="button" role="tab" aria-selected={trip === "all"} className="gl-chip" onClick={() => setTrip("all")}>
            All <span>{photos.length}</span>
          </button>
          {trips.map((t) => (
            <button key={t.slug} type="button" role="tab" aria-selected={trip === t.slug} className="gl-chip" onClick={() => setTrip(t.slug)}>
              {t.title} <span>{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="gl-grid" ref={grid} key={trip}>
        {list.map((p, i) => (
          <button
            key={p.src + i}
            type="button"
            className="gl-tile"
            style={{ "--d": `${(i % 8) * 45}ms` } as React.CSSProperties}
            onClick={() => setOpen(i)}
            aria-label={`Open photo${p.caption ? `: ${p.caption}` : ""} from ${p.blogTitle}`}
          >
            <img
              src={p.src}
              alt={p.caption}
              loading="lazy"
              width={p.width}
              height={p.height}
              style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
            />
            <span className="gl-over">
              {p.caption && <b>{p.caption}</b>}
              <small>{p.blogTitle}</small>
            </span>
          </button>
        ))}
      </div>

      {open != null && list[open] && <Viewer photos={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Viewer({ photos, index, onIndex, onClose }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const p = photos[index];
  const step = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  const strip = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState(0);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setDir(1); step(1); }
      if (e.key === "ArrowLeft") { setDir(-1); step(-1); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [step, onClose]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    const t = strip.current?.children[index] as HTMLElement | undefined;
    t?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  return (
    <div
      className="gv"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) { setDir(dx < 0 ? 1 : -1); step(dx < 0 ? 1 : -1); }
      }}
    >
      <div className="gv-top">
        <span className="gv-count">{index + 1} / {photos.length}</span>
        <button type="button" className="gv-btn" aria-label="Close viewer" autoFocus onClick={onClose}>✕</button>
      </div>

      <div className="gv-stage" onClick={onClose}>
        <img
          key={p.src}
          src={p.src}
          alt={p.caption}
          className={`gv-img ${dir > 0 ? "from-right" : dir < 0 ? "from-left" : ""}`}
          onClick={(e) => e.stopPropagation()}
        />
        <button type="button" className="gv-nav is-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setDir(-1); step(-1); }}>‹</button>
        <button type="button" className="gv-nav is-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setDir(1); step(1); }}>›</button>
      </div>

      <div className="gv-info">
        <div className="gv-cap">
          {p.caption && <b>{p.caption}</b>}
          <Link href={`/blog/${p.slug}`} className="gv-link">{p.blogTitle} · read the story →</Link>
        </div>
      </div>

      <div className="gv-strip" ref={strip}>
        {photos.map((t, i) => (
          <button
            key={t.src + i}
            type="button"
            className={`gv-thumb ${i === index ? "is-on" : ""}`}
            aria-label={`Photo ${i + 1}`}
            aria-current={i === index}
            onClick={() => { setDir(i > index ? 1 : -1); onIndex(i); }}
          >
            <img src={t.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
