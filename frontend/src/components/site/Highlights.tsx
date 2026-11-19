"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteHighlight } from "@/lib/publishedBlogs";

const TYPING_MS = 420; // typing dots before each line
const LINE_GAP_MS = 140;
const HOLD_CONVO_MS = 2600; // after the last line, time to finish reading
const HOLD_FACT_MS = 4200;

const isMe = (s?: string) => !!s && /^(me|i|myself|author)$/i.test(s.trim());

/** Plays the blogs' best conversations as a chat, and their facts as stamped cards. */
export default function Highlights({ items }: { items: SiteHighlight[] }) {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(0); // lines revealed
  const [typing, setTyping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);

  const h = items[idx];
  const total = h?.kind === "fact" ? 1 : h?.lines.length ?? 0;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback(
    (d: number) => {
      setIdx((i) => (i + d + items.length) % items.length);
      setShown(0);
      setTyping(false);
    },
    [items.length],
  );

  // Reveal lines, then hold, then move on.
  useEffect(() => {
    if (!h) return;
    if (reduced) {
      setShown(total);
      return;
    }
    if (paused || !visible) return;
    let t: ReturnType<typeof setTimeout>;
    if (shown < total) {
      if (h.kind === "fact") {
        t = setTimeout(() => setShown(1), 120);
      } else if (!typing) {
        t = setTimeout(() => setTyping(true), shown === 0 ? 150 : LINE_GAP_MS);
      } else {
        t = setTimeout(() => {
          setTyping(false);
          setShown((n) => n + 1);
        }, TYPING_MS);
      }
    } else {
      t = setTimeout(() => go(1), h.kind === "fact" ? HOLD_FACT_MS : HOLD_CONVO_MS);
    }
    return () => clearTimeout(t);
  }, [h, shown, total, typing, paused, visible, reduced, go]);

  if (!items.length) return null;
  const nextSpeaker = h.lines[shown]?.speaker;

  return (
    <section
      ref={root}
      className="hl"
      aria-label="From the road"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hl-intro">
        <p className="hl-kicker">From the road</p>
        <h2 className="hl-h">Overheard, mid-trip</h2>
        <p className="hl-lede">Real lines from the stories: the arguments, the jokes and the things nobody tells you before you go.</p>
        <div className="hl-controls">
          <button type="button" className="hl-ctl" aria-label="Previous moment" onClick={() => go(-1)}>←</button>
          <span className="hl-count" aria-live="polite">{idx + 1} / {items.length}</span>
          <button type="button" className="hl-ctl" aria-label="Next moment" onClick={() => go(1)}>→</button>
        </div>
      </div>

      <div className="hl-stage">
        <div className={`hl-card is-${h.kind}`} key={idx}>
          <div className="hl-top">
            <span className="hl-scene">{h.scene || h.blogTitle}</span>
            <span className={`hl-kind is-${h.kind}`}>{h.kind === "fact" ? "Fact" : "Conversation"}</span>
          </div>

          {h.kind === "fact" ? (
            <div className="hl-fact-wrap">
              {shown > 0 && (
                <blockquote className="hl-fact">
                  <span className="hl-mark" aria-hidden="true">“</span>
                  {h.lines[0].text}
                  <span className="hl-stamp" aria-hidden="true">True story</span>
                </blockquote>
              )}
            </div>
          ) : (
            <ol className="hl-chat">
              {h.lines.slice(0, shown).map((l, i) => {
                const me = isMe(l.speaker);
                const showName = l.speaker && h.lines[i - 1]?.speaker !== l.speaker;
                return (
                  <li key={i} className={`hl-line ${me ? "is-me" : ""}`}>
                    {showName && <span className="hl-who">{me ? "Me" : l.speaker}</span>}
                    <span className="hl-bubble">{l.text}</span>
                  </li>
                );
              })}
              {typing && (
                <li className={`hl-line ${isMe(nextSpeaker) ? "is-me" : ""}`} aria-hidden="true">
                  <span className="hl-bubble hl-typing"><i /><i /><i /></span>
                </li>
              )}
            </ol>
          )}

          <Link href={`/blog/${h.slug}`} className="hl-from">
            From <b>{h.blogTitle}</b> →
          </Link>
          <span className="hl-progress" aria-hidden="true">
            <span style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
          </span>
        </div>
      </div>
    </section>
  );
}
