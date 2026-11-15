"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export type BlogTheme = "warm" | "editorial" | "golden" | "night";

interface MagazineViewProps {
  content: string;
  streaming?: boolean;
  theme?: BlogTheme;
  contentFormat?: "markdown" | "html";
  bannerUrl?: string;
  blogTitle?: string;
}

function flatText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(flatText).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    return flatText((children as React.ReactElement).props.children);
  }
  return "";
}

function isDaySection(text: string) {
  return /^day\s+\d+/i.test(text.trim()) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i.test(text.trim());
}
function isItinerary(text: string) {
  return /itinerary|route map/i.test(text);
}
function isTips(text: string) {
  return /^tips|^pro tip|^travel tips/i.test(text.trim());
}
function isThanks(text: string) {
  return /thanks|special thanks|convenience/i.test(text);
}
function isDialoguePara(text: string) {
  const trimmed = text.trim();
  return trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.startsWith('‘');
}

function DayHeader({ children }: { children: React.ReactNode }) {
  const text = flatText(children);
  const dayMatch = text.match(/^(day\s*\d+)[:\s\-–]*(.*)/i);
  const dateMatch = text.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[\-–]\s*(.*)/i);

  if (dayMatch) {
    return (
      <div className="day-block">
        <div className="day-block-label">{dayMatch[1].replace(/day\s*/i, "Day ")}</div>
        {dayMatch[2] && <div className="day-block-title">{dayMatch[2].trim()}</div>}
        <div className="day-block-rule" />
      </div>
    );
  }
  if (dateMatch) {
    return (
      <div className="day-block">
        <div className="day-block-date">{dateMatch[1]}</div>
        {dateMatch[2] && <div className="day-block-title">{dateMatch[2].trim()}</div>}
        <div className="day-block-rule" />
      </div>
    );
  }
  return (
    <div className="day-block">
      <div className="day-block-title">{children}</div>
      <div className="day-block-rule" />
    </div>
  );
}

// ── Theme CSS variables ───────────────────────────────────────────────────────
const THEME_VARS: Record<BlogTheme, string> = {
  warm: `
    --mag-bg: #FEFCF9;
    --mag-fg: #1c1917;
    --mag-hero-from: #0f4c47;
    --mag-hero-to: #134e4a;
    --mag-hero-mid: #0d6e66;
    --mag-accent: #0d9488;
    --mag-accent-light: #ccfbf1;
    --mag-day-pill: #0d9488;
    --mag-h2-color: #0f766e;
    --mag-body-color: #374151;
    --mag-dialogue-bg: #fffbeb;
    --mag-dialogue-border: #fde68a;
    --mag-dialogue-fg: #78350f;
    --mag-tip-bg: #f0fdf4;
    --mag-tip-border: #bbf7d0;
    --mag-tip-check: #16a34a;
    --mag-byline: #5eead4;
    --mag-byline-site: #99f6e4;
    --mag-hr: #e2e8f0;
    --mag-banner-tint: rgba(15,76,71,0.45);
  `,
  editorial: `
    --mag-bg: #ffffff;
    --mag-fg: #111111;
    --mag-hero-from: #111111;
    --mag-hero-to: #1a1a1a;
    --mag-hero-mid: #1a1a1a;
    --mag-accent: #111111;
    --mag-accent-light: #e5e5e5;
    --mag-day-pill: #111111;
    --mag-h2-color: #111111;
    --mag-body-color: #333333;
    --mag-dialogue-bg: #f9f9f9;
    --mag-dialogue-border: #dddddd;
    --mag-dialogue-fg: #333333;
    --mag-tip-bg: #f5f5f5;
    --mag-tip-border: #cccccc;
    --mag-tip-check: #111111;
    --mag-byline: #aaaaaa;
    --mag-byline-site: #888888;
    --mag-hr: #dddddd;
    --mag-banner-tint: rgba(0,0,0,0.5);
  `,
  golden: `
    --mag-bg: #fffdf4;
    --mag-fg: #1c1300;
    --mag-hero-from: #78350f;
    --mag-hero-to: #92400e;
    --mag-hero-mid: #854d0e;
    --mag-accent: #d97706;
    --mag-accent-light: #fef9c3;
    --mag-day-pill: #d97706;
    --mag-h2-color: #92400e;
    --mag-body-color: #3f2800;
    --mag-dialogue-bg: #fffbeb;
    --mag-dialogue-border: #fde68a;
    --mag-dialogue-fg: #78350f;
    --mag-tip-bg: #fffde7;
    --mag-tip-border: #fde68a;
    --mag-tip-check: #b45309;
    --mag-byline: #fde68a;
    --mag-byline-site: #fef9c3;
    --mag-hr: #fde68a;
    --mag-banner-tint: rgba(120,53,15,0.45);
  `,
  night: `
    --mag-bg: #0f172a;
    --mag-fg: #e2e8f0;
    --mag-hero-from: #0a0a1a;
    --mag-hero-to: #0f172a;
    --mag-hero-mid: #0d0d20;
    --mag-accent: #38bdf8;
    --mag-accent-light: #0c4a6e;
    --mag-day-pill: #0284c7;
    --mag-h2-color: #38bdf8;
    --mag-body-color: #cbd5e1;
    --mag-dialogue-bg: #1e293b;
    --mag-dialogue-border: #334155;
    --mag-dialogue-fg: #94a3b8;
    --mag-tip-bg: #0f2744;
    --mag-tip-border: #1e40af;
    --mag-tip-check: #38bdf8;
    --mag-byline: #38bdf8;
    --mag-byline-site: #7dd3fc;
    --mag-hr: #1e293b;
    --mag-banner-tint: rgba(0,0,0,0.6);
  `,
};

export default function MagazineView({
  content,
  streaming,
  theme = "warm",
  contentFormat = "markdown",
  bannerUrl,
  blogTitle,
}: MagazineViewProps) {
  const components: Components = {
    h1({ children }) {
      return (
        <div className="blog-hero">
          <div className="blog-hero-inner">
            <h1 className="blog-hero-title">{children}</h1>
            <div className="blog-hero-byline">
              <span>Balu Matta</span>
              <span className="blog-hero-sep">·</span>
              <span className="blog-hero-site">thetravelgram.in</span>
            </div>
          </div>
        </div>
      );
    },

    h2({ children }) {
      const text = flatText(children);
      if (isDaySection(text)) return <DayHeader>{children}</DayHeader>;
      if (isItinerary(text)) return <h2 className="section-heading section-itinerary">🗺 {text}</h2>;
      if (isTips(text)) return <h2 className="section-heading section-tips">💡 {text}</h2>;
      if (isThanks(text)) return <h2 className="section-heading section-thanks">🙏 {text}</h2>;
      return <h2 className="section-heading">{children}</h2>;
    },

    h3({ children }) {
      const text = flatText(children);
      if (isDaySection(text)) return <DayHeader>{children}</DayHeader>;
      return <h3 className="subsection-heading">{children}</h3>;
    },

    p({ children }) {
      const text = flatText(children);
      if (isDialoguePara(text)) return <p className="para-dialogue">{children}</p>;
      return <p className="para-body">{children}</p>;
    },

    blockquote({ children }) {
      return (
        <div className="dialogue-box">
          <div className="dialogue-icon">💬</div>
          <div className="dialogue-content">{children}</div>
        </div>
      );
    },

    ul({ children }) { return <ul className="mag-ul">{children}</ul>; },
    ol({ children }) { return <ol className="mag-ol">{children}</ol>; },

    li({ children }) {
      const text = flatText(children);
      if (/^[🏔🌊✈🏨🚗💰📱🗺💡🎯🌟⚡🔑📍🧳🍽🌙🎭🏞🌄⛺🛡✅❗🎒🤝💬]/u.test(text.trim())) {
        return <li className="mag-li mag-li-tip">{children}</li>;
      }
      return <li className="mag-li">{children}</li>;
    },

    strong({ children }) { return <strong className="mag-strong">{children}</strong>; },
    em({ children }) { return <em className="mag-em">{children}</em>; },
    hr() { return <hr className="mag-hr" />; },

    code({ children, className }) {
      const isBlock = className?.startsWith("language-");
      if (isBlock) {
        return (
          <div className="callout-box">
            <div className="callout-bar" />
            <pre className="callout-pre"><code>{children}</code></pre>
          </div>
        );
      }
      return <code className="inline-code">{children}</code>;
    },

    pre({ children }) {
      return (
        <div className="callout-box">
          <div className="callout-bar" />
          <pre className="callout-pre">{children}</pre>
        </div>
      );
    },

    img({ src, alt }) {
      return (
        <img
          src={src}
          alt={alt ?? ""}
          className="mag-image"
        />
      );
    },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,500&family=Lora:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap');

        /* ── Theme variables ──────────────────────── */
        .mag-root { ${THEME_VARS[theme]} }

        .mag-root {
          background: var(--mag-bg);
          color: var(--mag-fg);
          min-height: 100vh;
        }

        /* ── Banner image ─────────────────────────── */
        .blog-banner {
          width: 100%;
          height: clamp(240px, 40vw, 480px);
          object-fit: cover;
          display: block;
        }
        .blog-banner-wrap {
          position: relative;
          overflow: hidden;
          max-height: 480px;
        }
        .blog-banner-wrap::after {
          content: "";
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 60%;
          background: linear-gradient(to bottom, transparent, var(--mag-hero-from));
          pointer-events: none;
        }

        /* ── Standalone title hero (when no h1 in content) ── */
        .blog-title-hero {
          background: linear-gradient(135deg, var(--mag-hero-from) 0%, var(--mag-hero-mid) 50%, var(--mag-hero-to) 100%);
          padding: 56px 24px 48px;
        }
        .blog-title-hero-inner { max-width: 760px; margin: 0 auto; }
        .blog-title-hero h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.2rem, 6vw, 3.8rem);
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 16px;
          text-wrap: balance;
        }
        .blog-title-byline {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mag-byline);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .blog-title-byline-site { color: var(--mag-byline-site); }

        /* ── Hero title (from h1 in markdown) ────── */
        .blog-hero {
          background: linear-gradient(135deg, var(--mag-hero-from) 0%, var(--mag-hero-mid) 50%, var(--mag-hero-to) 100%);
          padding: 56px 24px 48px;
          margin-bottom: 0;
        }
        .blog-hero-inner { max-width: 760px; margin: 0 auto; }
        .blog-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.2rem, 6vw, 3.8rem);
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 20px;
          text-wrap: balance;
        }
        .blog-hero-byline {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mag-byline);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .blog-hero-sep { color: var(--mag-h2-color); }
        .blog-hero-site { color: var(--mag-byline-site); }

        /* ── Content wrapper ─────────────────────── */
        .mag-body {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* ── Day section header ──────────────────── */
        .day-block { margin: 48px 0 28px; padding-top: 8px; }
        .day-block-label {
          display: inline-flex;
          align-items: center;
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: var(--mag-day-pill);
          color: #fff;
          padding: 4px 14px;
          border-radius: 100px;
          margin-bottom: 10px;
        }
        .day-block-date {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--mag-accent);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .day-block-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.4rem, 3.5vw, 2rem);
          font-weight: 700;
          color: var(--mag-fg);
          line-height: 1.2;
          margin-bottom: 16px;
        }
        .day-block-rule {
          height: 2px;
          background: linear-gradient(to right, var(--mag-accent-light), transparent);
          border-radius: 2px;
        }

        /* ── Section headings ────────────────────── */
        .section-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.3rem, 3vw, 1.75rem);
          font-weight: 700;
          color: var(--mag-fg);
          margin: 48px 0 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--mag-accent-light);
        }
        .section-itinerary { color: var(--mag-h2-color); }
        .section-tips { color: var(--mag-h2-color); }
        .section-thanks { color: var(--mag-h2-color); }

        .subsection-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          font-style: italic;
          color: var(--mag-body-color);
          margin: 32px 0 10px;
        }

        /* ── Body text ───────────────────────────── */
        .para-body {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.0625rem;
          line-height: 1.9;
          color: var(--mag-body-color);
          margin-bottom: 22px;
        }

        /* ── Dialogue paragraph ──────────────────── */
        .para-dialogue {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.0625rem;
          line-height: 1.85;
          color: var(--mag-body-color);
          margin-bottom: 22px;
          padding: 2px 0 2px 16px;
          border-left: 3px solid #fbbf24;
          font-style: italic;
        }

        /* ── Dialogue box (blockquote) ───────────── */
        .dialogue-box {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          background: var(--mag-dialogue-bg);
          border: 1px solid var(--mag-dialogue-border);
          border-radius: 14px;
          padding: 18px 20px;
          margin: 28px 0;
        }
        .dialogue-icon { font-size: 1.3rem; line-height: 1; margin-top: 2px; flex-shrink: 0; }
        .dialogue-content {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          font-size: 1.03rem;
          line-height: 1.75;
          color: var(--mag-dialogue-fg);
          flex: 1;
        }
        .dialogue-content p { margin: 0 0 8px; font-family: inherit; font-style: inherit; font-size: inherit; color: inherit; line-height: inherit; }
        .dialogue-content p:last-child { margin-bottom: 0; }

        /* ── Lists ───────────────────────────────── */
        .mag-ul, .mag-ol { margin: 16px 0 22px; padding-left: 0; list-style: none; }
        .mag-li {
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.7;
          color: var(--mag-body-color);
          padding: 8px 0 8px 28px;
          position: relative;
          border-bottom: 1px solid var(--mag-accent-light);
        }
        .mag-li::before { content: "→"; position: absolute; left: 0; color: var(--mag-accent); font-family: 'Inter', sans-serif; font-weight: 700; }
        .mag-li-tip {
          background: var(--mag-tip-bg);
          border-radius: 8px;
          padding: 10px 12px 10px 36px;
          margin-bottom: 6px;
          border-bottom: none;
          border: 1px solid var(--mag-tip-border);
        }
        .mag-li-tip::before { left: 10px; top: 10px; content: "✓"; color: var(--mag-tip-check); }

        /* ── Callout box ─────────────────────────── */
        .callout-box { display: flex; gap: 0; background: #1e293b; border-radius: 12px; overflow: hidden; margin: 24px 0; }
        .callout-bar { width: 4px; background: var(--mag-accent); flex-shrink: 0; }
        .callout-pre { font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.65; color: #e2e8f0; padding: 16px 20px; margin: 0; overflow-x: auto; white-space: pre-wrap; word-break: break-word; flex: 1; }

        .inline-code { font-family: 'Inter', monospace; font-size: 0.875em; background: var(--mag-accent-light); color: var(--mag-h2-color); padding: 2px 7px; border-radius: 5px; border: 1px solid var(--mag-accent-light); }
        .mag-strong { font-weight: 700; color: var(--mag-fg); }
        .mag-em { font-style: italic; }
        .mag-hr { border: none; border-top: 1px solid var(--mag-hr); margin: 48px 0; }

        /* ── Images in content ───────────────────── */
        .mag-image { width: 100%; height: auto; border-radius: 12px; margin: 20px 0; display: block; }
        .editor-image { border-radius: 12px; height: auto; display: block; margin: 20px auto; }
        .editor-image[data-size="sm"] { width: 30%; }
        .editor-image[data-size="md"] { width: 55%; }
        .editor-image[data-size="lg"] { width: 80%; }
        .editor-image[data-size="full"] { width: 100%; }

        /* ── Video embed ─────────────────────────── */
        .video-embed {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          border-radius: 12px;
          margin: 24px 0;
          background: #0f172a;
        }
        .video-embed iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }

        /* ── HTML mode: style raw elements ──────── */
        .mag-html-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          font-family: 'Lora', Georgia, serif;
          font-size: 1.0625rem;
          line-height: 1.9;
          color: var(--mag-body-color);
        }
        .mag-html-content h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: var(--mag-fg);
          border-bottom: 3px solid var(--mag-accent);
          padding-bottom: 16px;
          margin: 0 0 20px;
          line-height: 1.1;
        }
        .mag-html-content h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.7rem;
          font-weight: 700;
          color: var(--mag-h2-color);
          margin: 40px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--mag-accent-light);
        }
        .mag-html-content h3 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.2rem;
          font-weight: 700;
          font-style: italic;
          color: var(--mag-body-color);
          margin: 24px 0 10px;
        }
        .mag-html-content p { margin: 0 0 20px; }
        .mag-html-content blockquote {
          background: var(--mag-dialogue-bg);
          border: 1px solid var(--mag-dialogue-border);
          border-radius: 14px;
          padding: 18px 20px 18px 56px;
          margin: 28px 0;
          position: relative;
          font-style: italic;
          color: var(--mag-dialogue-fg);
        }
        .mag-html-content blockquote::before { content: "💬"; position: absolute; left: 16px; top: 18px; font-size: 1.1rem; font-style: normal; }
        .mag-html-content blockquote p { margin: 0 0 8px; }
        .mag-html-content blockquote p:last-child { margin-bottom: 0; }
        .mag-html-content ul { margin: 16px 0 20px; padding-left: 0; list-style: none; }
        .mag-html-content ul li { padding: 8px 0 8px 28px; position: relative; border-bottom: 1px solid var(--mag-accent-light); font-size: 1rem; }
        .mag-html-content ul li::before { content: "→"; position: absolute; left: 0; color: var(--mag-accent); font-family: 'Inter', sans-serif; font-weight: 700; }
        .mag-html-content ol { margin: 16px 0 20px; padding-left: 20px; }
        .mag-html-content ol li { padding: 6px 0; }
        .mag-html-content strong { font-weight: 700; color: var(--mag-fg); }
        .mag-html-content em { font-style: italic; }
        .mag-html-content hr { border: none; border-top: 1px solid var(--mag-hr); margin: 48px 0; }
        .mag-html-content code { font-family: 'Inter', monospace; font-size: 0.875em; background: var(--mag-accent-light); color: var(--mag-h2-color); padding: 2px 7px; border-radius: 5px; }
        .mag-html-content pre { background: #1e293b; color: #e2e8f0; padding: 16px 20px; border-radius: 10px; margin: 24px 0; overflow-x: auto; font-size: 0.875rem; }
        .mag-html-content pre code { background: none; color: inherit; padding: 0; }
        .mag-html-content img { width: 100%; height: auto; border-radius: 12px; margin: 20px 0; display: block; }
        .mag-html-content img[data-size="sm"] { width: 30%; }
        .mag-html-content img[data-size="md"] { width: 55%; }
        .mag-html-content img[data-size="lg"] { width: 80%; }
        .mag-html-content img[data-size="full"] { width: 100%; }

        /* ── Markdown mode layout wrapper ────────── */
        .mag-root > *:not(.blog-hero):not(.blog-banner-wrap):not(.blog-title-hero) {
          max-width: 760px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 24px;
          padding-right: 24px;
        }
        .mag-root > .blog-hero + *, .mag-root > .blog-title-hero + * { padding-top: 40px; }
        .mag-root > *:last-child { padding-bottom: 80px; }

        /* ── Streaming cursor ─────────────────────── */
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: var(--mag-accent);
          margin-left: 3px;
          vertical-align: text-bottom;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      <div className="mag-root">
        {/* Banner image */}
        {bannerUrl && (
          <div className="blog-banner-wrap">
            <img src={bannerUrl} alt="Blog banner" className="blog-banner" />
          </div>
        )}

        {/* Standalone title hero (shown when blogTitle is set and content is HTML format) */}
        {blogTitle && contentFormat === "html" && (
          <div className="blog-title-hero">
            <div className="blog-title-hero-inner">
              <h1>{blogTitle}</h1>
              <div className="blog-title-byline">
                <span>Balu Matta</span>
                <span>·</span>
                <span className="blog-title-byline-site">thetravelgram.in</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {contentFormat === "html" ? (
          <div
            className="mag-html-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        )}

        {streaming && (
          <span
            className="typing-cursor"
            style={{ marginLeft: 24, marginBottom: 80, display: "block", paddingLeft: 24 }}
          />
        )}
      </div>
    </>
  );
}
