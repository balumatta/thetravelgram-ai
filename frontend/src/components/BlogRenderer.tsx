"use client";

import React from "react";
import { sanitizeInlineHtml } from "./composer/inlineHtml";

export interface BlogSection {
  type:
    | "paragraph" | "conversation" | "fact" | "day_header" | "itinerary"
    | "must_visit" | "tips" | "thanks" | "closing" | "image" | "video";
  text?: string;
  /** Inline rich text (strong/em/u/s/code/a/br) for paragraph & fact. Falls back to `text`. */
  html?: string;
  lines?: Array<{ speaker: string; text: string }>;
  day_number?: number | null;
  date?: string;
  title?: string;
  stops?: string[];
  places?: Array<{ name: string; why: string; emoji: string }>;
  items?: string[];
  people?: Array<{ name: string; role: string; note: string; image_url?: string }>;
  /** image / video blocks */
  src?: string;
  caption?: string;
  size?: "sm" | "md" | "lg" | "full";
}

export interface StructuredBlog {
  title: string;
  subtitle?: string;
  sections: BlogSection[];
}

interface BlogRendererProps {
  blog: StructuredBlog;
  bannerUrl?: string;
  streaming?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const SPEAKER_COLORS = [
  "#B84C3D", "#2C4A3E", "#4A6741", "#7B5EA7", "#1E6091", "#B56A2F",
];
function speakerColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
}

// ── Section renderers ────────────────────────────────────────

function ParagraphBlock({ text, html }: { text: string; html?: string }) {
  if (html) return <p className="br-para" dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(html) }} />;
  return <p className="br-para">{text}</p>;
}

function MediaBlock({ section }: { section: BlogSection }) {
  if (!section.src) return null;
  const size = section.size ?? "lg";
  return (
    <figure className={`br-media br-media-${size}`}>
      {section.type === "video" ? (
        <video src={section.src} controls playsInline />
      ) : (
        <img src={section.src} alt={section.caption || ""} loading="lazy" />
      )}
      {section.caption && <figcaption>{section.caption}</figcaption>}
    </figure>
  );
}

function ConversationBlock({ lines }: { lines: Array<{ speaker: string; text: string }> }) {
  return (
    <div className="br-convo-wrap">
      {lines.map((line, i) => (
        <div key={i} className="br-convo-line">
          <span className="br-convo-speaker">{line.speaker}</span>
          <p className="br-convo-text">"{line.text}"</p>
        </div>
      ))}
    </div>
  );
}

function FactBlock({ text, html }: { text: string; html?: string }) {
  return (
    <aside className="br-fact">
      <span className="br-fact-mark">"</span>
      {html
        ? <p className="br-fact-text" dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(html) }} />
        : <p className="br-fact-text">{text}</p>}
    </aside>
  );
}

function DayHeaderBlock({ day_number, date, title }: { day_number?: number | null; date?: string; title?: string }) {
  const num = day_number != null ? String(day_number).padStart(2, "0") : null;
  return (
    <div className="br-day-wrap">
      {num && <span className="br-day-num">{num}</span>}
      <div className="br-day-inner">
        <span className="br-day-label">
          {num ? `Day ${day_number}` : ""}
          {date ? (num ? ` · ${date}` : date) : ""}
        </span>
        <h2 className="br-day-title">{title}</h2>
        <div className="br-day-rule" />
      </div>
    </div>
  );
}

function ItineraryBlock({ stops }: { stops: string[] }) {
  // Duration scales with number of stops so the van doesn't fly
  const duration = Math.max(8, stops.length * 1.4);

  return (
    <div className="br-itin-wrap">
      <h3 className="br-section-heading">Route</h3>
      <div className="br-itin-scroll">
        {/* One container: van + dots are in the same scroll/width context */}
        <div
          className="br-itin-inner"
          style={{ "--itin-dur": `${duration}s` } as React.CSSProperties}
        >
          {/* Van row — position: relative so van can be positioned inside it */}
          <div className="br-itin-van-row">
            <span className="br-itin-van">🚐</span>
          </div>
          {/* Dots + connectors + labels — single flex row */}
          <div className="br-itin-track">
            {stops.map((stop, i) => (
              <React.Fragment key={i}>
                <div className="br-itin-node">
                  <div className={`br-itin-dot${i === 0 || i === stops.length - 1 ? " br-dot-terminal" : ""}`} />
                  <span className="br-itin-label">{stop}</span>
                </div>
                {i < stops.length - 1 && <div className="br-itin-connector" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MustVisitBlock({ places }: { places: Array<{ name: string; why: string; emoji: string }> }) {
  return (
    <div className="br-mustvisit-wrap">
      <h3 className="br-section-heading">Must Visit</h3>
      <div className="br-mv-grid">
        {places.map((place, i) => (
          <div key={i} className="br-mv-card">
            <div className="br-mv-emoji">{place.emoji}</div>
            <p className="br-mv-name">{place.name}</p>
            <p className="br-mv-why">{place.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsBlock({ items }: { items: string[] }) {
  return (
    <div className="br-tips-wrap">
      <h3 className="br-section-heading">Tips</h3>
      <ol className="br-tips-list">
        {items.map((tip, i) => (
          <li key={i} className="br-tip-item">
            <span className="br-tip-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="br-tip-text">{tip}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ThanksBlock({ people }: { people: Array<{ name: string; role: string; note: string; image_url?: string }> }) {
  return (
    <div className="br-thanks-wrap">
      <h3 className="br-section-heading">Special Thanks</h3>
      <div className="br-thanks-grid">
        {people.map((person, i) => {
          const color = speakerColor(person.name);
          return (
            <div key={i} className="br-thanks-card">
              {person.image_url ? (
                <img src={person.image_url} alt={person.name} className="br-thanks-photo" />
              ) : (
                <div className="br-thanks-avatar" style={{ background: color }}>
                  {initials(person.name)}
                </div>
              )}
              <p className="br-thanks-name">{person.name}</p>
              <p className="br-thanks-role">{person.role}</p>
              <p className="br-thanks-note">{person.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClosingBlock({ text }: { text: string }) {
  return (
    <div className="br-closing-wrap">
      <div className="br-closing-rule" />
      <p className="br-closing-text">{text}</p>
      <div className="br-closing-sig">✈ TheTravelGram</div>
    </div>
  );
}

// ── Main BlogRenderer ────────────────────────────────────────

export default function BlogRenderer({ blog, bannerUrl, streaming }: BlogRendererProps) {
  return (
    <>
      <style>{`
        /* ── Expedition Theme ───────────────────────────────────
           Palette: linen bg, terracotta accent, forest green secondary,
           Cormorant Garamond for display, Lora for body, Inter for UI
        ─────────────────────────────────────────────────────── */

        .br-root {
          --br-bg: #F7F5F2;
          --br-bg-alt: #EFEDE8;
          --br-text: #1A1718;
          --br-muted: #6B6460;
          --br-accent: #B84C3D;
          --br-accent-pale: #F5EDE9;
          --br-accent-mid: #D4766A;
          --br-forest: #2C4A3E;
          --br-divider: #DDD9D3;
          --br-convo-bg: #F0EDE8;
          --br-fact-bg: #FBF8F4;
          --br-day-num-color: rgba(184, 76, 61, 0.07);
          background: var(--br-bg);
          color: var(--br-text);
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          -webkit-font-smoothing: antialiased;
        }

        /* Hero banner */
        .br-banner {
          position: relative;
          width: 100%;
          height: clamp(260px, 42vw, 520px);
          overflow: hidden;
        }
        .br-banner img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .br-banner::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.65) 100%);
        }
        .br-banner-title {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          z-index: 2;
          padding: clamp(24px, 5vw, 60px) clamp(20px, 6vw, 80px);
        }
        .br-blog-title {
          font-family: var(--font-cormorant, 'Cormorant Garamond', Georgia, serif);
          font-size: clamp(2.4rem, 7vw, 5.5rem);
          font-weight: 600;
          font-style: italic;
          line-height: 1.0;
          color: #fff;
          margin: 0 0 10px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.3);
          text-wrap: balance;
        }
        .br-blog-subtitle {
          font-family: var(--font-inter, Inter, system-ui, sans-serif);
          font-size: clamp(0.8rem, 1.8vw, 1rem);
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.75);
          margin: 0;
        }

        /* Header without banner */
        .br-title-block {
          padding: clamp(40px, 8vw, 80px) clamp(20px, 6vw, 80px) 24px;
          border-bottom: 1px solid var(--br-divider);
        }
        .br-title-block .br-blog-title {
          color: var(--br-text);
          text-shadow: none;
        }
        .br-title-block .br-blog-subtitle {
          color: var(--br-muted);
        }

        /* Content container */
        .br-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 clamp(16px, 5vw, 48px);
        }

        /* Paragraph */
        .br-para {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          font-size: clamp(1rem, 1.6vw, 1.1rem);
          line-height: 1.95;
          color: var(--br-text);
          margin: 0 0 1.4rem;
        }

        /* Day header */
        .br-day-wrap {
          position: relative;
          margin: clamp(48px, 8vw, 80px) 0 32px;
          overflow: hidden;
        }
        .br-day-num {
          position: absolute;
          top: -20px;
          left: -8px;
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: clamp(7rem, 18vw, 14rem);
          font-weight: 700;
          color: var(--br-day-num-color);
          line-height: 1;
          pointer-events: none;
          user-select: none;
          letter-spacing: -4px;
        }
        .br-day-inner {
          position: relative;
          z-index: 1;
          padding-left: 2px;
        }
        .br-day-label {
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--br-accent);
          display: block;
          margin-bottom: 6px;
        }
        .br-day-title {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: clamp(1.9rem, 4.5vw, 3.2rem);
          font-weight: 600;
          font-style: italic;
          line-height: 1.1;
          color: var(--br-text);
          margin: 0 0 14px;
        }
        .br-day-rule {
          height: 2px;
          width: 48px;
          background: var(--br-accent);
          border-radius: 2px;
        }

        /* Conversation — literary dialogue, not chat bubbles */
        .br-convo-wrap {
          background: #FBF8F4;
          border-left: 3px solid var(--br-accent-mid);
          border-radius: 0 10px 10px 0;
          padding: 18px 24px 14px;
          margin: 20px 0 28px;
        }
        .br-convo-line {
          margin-bottom: 12px;
        }
        .br-convo-line:last-child { margin-bottom: 0; }
        .br-convo-speaker {
          display: block;
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--br-accent);
          margin-bottom: 2px;
        }
        .br-convo-text {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 1rem;
          font-style: italic;
          line-height: 1.7;
          color: var(--br-text);
          margin: 0;
        }

        /* Fact / pull-quote */
        .br-fact {
          position: relative;
          margin: 32px 0;
          padding: 24px 24px 20px 56px;
          background: var(--br-fact-bg);
          border-left: 3px solid var(--br-accent);
          border-radius: 0 12px 12px 0;
        }
        .br-fact-mark {
          position: absolute;
          left: 16px;
          top: 10px;
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 4rem;
          line-height: 1;
          color: var(--br-accent-mid);
          font-style: normal;
          pointer-events: none;
        }
        .br-fact-text {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 1.0rem;
          font-style: italic;
          line-height: 1.8;
          color: var(--br-text);
          margin: 0;
        }

        /* Section headings (Itinerary, Must Visit, Tips, Thanks) */
        .br-section-heading {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: clamp(1.5rem, 3.5vw, 2.2rem);
          font-weight: 600;
          font-style: italic;
          color: var(--br-text);
          margin: 0 0 20px;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--br-divider);
        }

        /* Itinerary */
        .br-itin-wrap { margin: 40px 0 48px; }

        .br-itin-scroll {
          overflow-x: auto;
          overflow-y: visible;
          padding-bottom: 8px;
        }

        /* Single column container: van row on top, track row below — same width */
        .br-itin-inner {
          display: inline-flex;
          flex-direction: column;
          min-width: 100%;
        }

        /* Van row */
        .br-itin-van-row {
          position: relative;
          height: 36px;
          width: 100%;
        }
        .br-itin-van {
          position: absolute;
          font-size: 1.5rem;
          line-height: 1;
          top: 4px;
          left: 0;
          /* drives right, fades out, reappears at left → loops */
          animation: itinVanDrive var(--itin-dur, 10s) linear infinite;
        }
        @keyframes itinVanDrive {
          0%   { left: 0;                        opacity: 1; }
          72%  { left: calc(100% - 2rem);        opacity: 1; }
          80%  { left: calc(100% - 2rem);        opacity: 0; }
          81%  { left: 0;                        opacity: 0; }
          88%  { left: 0;                        opacity: 1; }
          100% { left: 0;                        opacity: 1; }
        }

        /* Track: dots, connectors, labels in a single flex row */
        .br-itin-track {
          display: flex;
          align-items: flex-start;
          flex-wrap: nowrap;
        }

        /* Each city node */
        .br-itin-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 80px;
        }

        .br-itin-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid var(--br-accent-mid);
          flex-shrink: 0;
          margin-top: 3px;
        }
        .br-dot-terminal {
          width: 14px;
          height: 14px;
          background: var(--br-accent);
          border-color: var(--br-accent);
          margin-top: 1px;
        }

        /* Horizontal connector line between dots */
        .br-itin-connector {
          flex-shrink: 0;
          width: 44px;
          height: 2px;
          background: linear-gradient(to right, var(--br-accent), var(--br-accent-mid));
          /* center vertically with dot: dot top = 3px, dot height = 10px, center = 8px; connector height = 2px, center = 1px → margin-top = 7px */
          margin-top: 7px;
          align-self: flex-start;
        }

        .br-itin-label {
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: var(--br-muted);
          text-align: center;
          margin-top: 7px;
          width: 76px;
          line-height: 1.35;
          overflow-wrap: break-word;
        }

        /* Must Visit */
        .br-mustvisit-wrap { margin: 40px 0 48px; }
        .br-mv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .br-mv-card {
          background: #fff;
          border: 1px solid var(--br-divider);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }
        .br-mv-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(184, 76, 61, 0.1);
        }
        .br-mv-emoji {
          font-size: 2.2rem;
          margin-bottom: 10px;
          display: block;
          line-height: 1;
        }
        .br-mv-name {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--br-text);
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .br-mv-why {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 0.8rem;
          font-style: italic;
          color: var(--br-muted);
          margin: 0;
          line-height: 1.5;
        }

        /* Tips */
        .br-tips-wrap { margin: 40px 0 48px; }
        .br-tips-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .br-tip-item {
          display: flex;
          align-items: baseline;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--br-divider);
        }
        .br-tip-num {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--br-accent);
          flex-shrink: 0;
          line-height: 1;
          width: 28px;
          text-align: right;
        }
        .br-tip-text {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--br-text);
        }

        /* Special Thanks */
        .br-thanks-wrap { margin: 40px 0 48px; }
        .br-thanks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .br-thanks-card {
          text-align: center;
          padding: 20px 12px;
          background: #fff;
          border: 1px solid var(--br-divider);
          border-radius: 16px;
        }
        .br-thanks-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .br-thanks-photo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 12px;
          display: block;
        }
        .br-thanks-name {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--br-text);
          margin: 0 0 2px;
        }
        .br-thanks-role {
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--br-accent);
          margin: 0 0 8px;
        }
        .br-thanks-note {
          font-family: var(--font-lora, Georgia, serif);
          font-size: 0.8rem;
          font-style: italic;
          color: var(--br-muted);
          margin: 0;
          line-height: 1.5;
        }

        /* Closing */
        .br-closing-wrap {
          margin: 56px 0 0;
          padding: 48px 0 64px;
          text-align: center;
          border-top: 1px solid var(--br-divider);
        }
        .br-closing-rule {
          width: 40px;
          height: 2px;
          background: var(--br-accent);
          margin: 0 auto 32px;
          border-radius: 2px;
        }
        .br-closing-text {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: clamp(1.3rem, 3vw, 1.9rem);
          font-style: italic;
          line-height: 1.7;
          color: var(--br-text);
          max-width: 580px;
          margin: 0 auto 20px;
        }
        .br-closing-sig {
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--br-muted);
        }

        /* Streaming pulse */
        .br-streaming-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--br-accent);
          background: var(--br-accent-pale);
          padding: 6px 14px;
          border-radius: 100px;
          margin: 16px 0 0;
        }
        .br-streaming-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--br-accent);
          animation: brPulse 1s ease-in-out infinite;
        }
        /* Inline rich text */
        .br-para a, .br-fact-text a { color: var(--br-accent); text-decoration: underline; text-underline-offset: 3px; }
        .br-para code { font-family: ui-monospace, monospace; font-size: 0.9em; background: var(--br-bg-alt); padding: 1px 5px; border-radius: 4px; }

        /* Media */
        .br-media { margin: 32px auto; }
        .br-media img, .br-media video { display: block; width: 100%; border-radius: 12px; }
        .br-media-sm { max-width: 360px; }
        .br-media-md { max-width: 540px; }
        .br-media-lg { max-width: 100%; }
        .br-media-full { width: min(100vw - 32px, 1100px); max-width: none; position: relative; left: 50%; transform: translateX(-50%); }
        .br-media figcaption {
          font-family: var(--font-inter, Inter, sans-serif);
          font-size: 0.8rem; color: var(--br-muted); text-align: center; margin-top: 10px;
        }

        @keyframes brPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>

      <div className="br-root">
        {/* Banner or plain title */}
        {bannerUrl ? (
          <div className="br-banner">
            <img src={bannerUrl} alt={blog.title} />
            <div className="br-banner-title">
              <h1 className="br-blog-title">{blog.title}</h1>
              {blog.subtitle && <p className="br-blog-subtitle">{blog.subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="br-title-block">
            <h1 className="br-blog-title">{blog.title}</h1>
            {blog.subtitle && <p className="br-blog-subtitle">{blog.subtitle}</p>}
          </div>
        )}

        {streaming && (
          <div className="br-content" style={{ marginTop: 20 }}>
            <div className="br-streaming-pill">
              <span className="br-streaming-dot" /> Generating your blog…
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="br-content" style={{ paddingTop: 40, paddingBottom: 80 }}>
          {blog.sections.map((section, i) => {
            switch (section.type) {
              case "paragraph":
                return <ParagraphBlock key={i} text={section.text ?? ""} html={section.html} />;
              case "conversation":
                return <ConversationBlock key={i} lines={section.lines ?? []} />;
              case "fact":
                return <FactBlock key={i} text={section.text ?? ""} html={section.html} />;
              case "day_header":
                return <DayHeaderBlock key={i} day_number={section.day_number} date={section.date} title={section.title} />;
              case "itinerary":
                return <ItineraryBlock key={i} stops={section.stops ?? []} />;
              case "image":
              case "video":
                return <MediaBlock key={i} section={section} />;
              case "must_visit":
                return <MustVisitBlock key={i} places={section.places ?? []} />;
              case "tips":
                return <TipsBlock key={i} items={section.items ?? []} />;
              case "thanks":
                return <ThanksBlock key={i} people={section.people ?? []} />;
              case "closing":
                return <ClosingBlock key={i} text={section.text ?? ""} />;
              default:
                return null;
            }
          })}
        </div>
      </div>
    </>
  );
}
