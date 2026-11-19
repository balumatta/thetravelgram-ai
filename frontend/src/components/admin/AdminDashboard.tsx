"use client";

import { useEffect, useMemo, useState } from "react";
import "./admin.css";

export interface DraftSummary {
  title: string;
  subtitle?: string;
  bannerUrl?: string;
  updatedAt?: string;
}

export interface PublishedSummary {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  banner_url?: string;
  published_at?: string;
  updated_at?: string;
}

interface Props {
  draft: DraftSummary | null;
  /** An AI interview that hasn't produced a blog yet. */
  interview: { day: number; totalDays: number } | null;
  starting: boolean;
  onNewTrip: () => void;
  onContinueInterview: () => void;
  onViewDraft: () => void;
  onEditDraft: () => void;
  onPublishDraft: () => void;
  onEditPublished: (slug: string) => void;
}

type Filter = "all" | "draft" | "published";

function when(iso?: string, prefix = "") {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const rel =
    days < 1 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return prefix + rel;
}

function Thumb({ src, title }: { src?: string; title: string }) {
  return (
    <div className="ad-thumb">
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{(title || "?").trim().charAt(0).toUpperCase()}</span>}
    </div>
  );
}

export default function AdminDashboard(p: Props) {
  const [published, setPublished] = useState<PublishedSummary[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = () => {
    setError("");
    fetch("/api/blogs/published")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setPublished((await r.json()).blogs ?? []);
      })
      .catch(() => {
        setPublished([]);
        setError("Couldn't load published blogs. Check that the backend is running, then try again.");
      });
  };
  useEffect(load, []);

  const draftCount = (p.draft ? 1 : 0) + (p.interview ? 1 : 0);
  const pubCount = published?.length ?? 0;
  const showDrafts = filter !== "published";
  const showPublished = filter !== "draft";

  const stats = useMemo(
    () => [
      { k: "all" as Filter, label: "All", n: draftCount + pubCount },
      { k: "draft" as Filter, label: "Drafts", n: draftCount },
      { k: "published" as Filter, label: "Published", n: pubCount },
    ],
    [draftCount, pubCount],
  );

  return (
    <div className="ad">
      <header className="ad-bar">
        <div className="ad-bar-in">
          <span className="ad-brand">The Travel Gram</span>
          <span className="ad-tag">Admin</span>
          <a className="ad-bar-link" href="/" target="_blank" rel="noreferrer">View site ↗</a>
        </div>
      </header>

      <main className="ad-main">
        <div className="ad-head">
          <div>
            <h1 className="ad-h1">My Blogs</h1>
            <p className="ad-lede">Drafts you're working on and the stories that are live on the site.</p>
          </div>
          <button type="button" className="ad-primary" onClick={p.onNewTrip} disabled={p.starting}>
            {p.starting ? "Starting…" : "+ Write a new trip"}
          </button>
        </div>

        <div className="ad-filters" role="tablist" aria-label="Filter blogs">
          {stats.map((s) => (
            <button
              key={s.k}
              type="button"
              role="tab"
              aria-selected={filter === s.k}
              className={`ad-filter is-${s.k}`}
              onClick={() => setFilter(s.k)}
            >
              {s.label}
              <span className="ad-count">{s.k === "published" && published == null ? "…" : s.n}</span>
            </button>
          ))}
        </div>

        {showDrafts && (
          <section className="ad-group" aria-labelledby="ad-drafts">
            <h2 id="ad-drafts" className="ad-group-h">
              <span className="ad-pill is-draft">Draft</span>
              <span className="ad-group-n">{draftCount}</span>
            </h2>
            {draftCount === 0 ? (
              <p className="ad-empty">No drafts. Start a new trip and the AI will write the first draft with you.</p>
            ) : (
              <ul className="ad-list">
                {p.interview && (
                  <li className="ad-row">
                    <div className="ad-thumb is-interview"><span>💬</span></div>
                    <div className="ad-info">
                      <div className="ad-title">Interview in progress</div>
                      <div className="ad-sub">
                        {p.interview.totalDays ? `Day ${p.interview.day} of ${p.interview.totalDays}` : "Getting the trip overview"} · the AI writes the blog when you finish
                      </div>
                    </div>
                    <span className="ad-pill is-draft">Draft</span>
                    <div className="ad-actions">
                      <button type="button" className="ad-btn is-strong" onClick={p.onContinueInterview}>Continue</button>
                    </div>
                  </li>
                )}
                {p.draft && (
                  <li className="ad-row">
                    <Thumb src={p.draft.bannerUrl} title={p.draft.title} />
                    <div className="ad-info">
                      <div className="ad-title">{p.draft.title || "Untitled draft"}</div>
                      {p.draft.subtitle && <div className="ad-sub">{p.draft.subtitle}</div>}
                      <div className="ad-meta">{when(p.draft.updatedAt, "Edited ")}</div>
                    </div>
                    <span className="ad-pill is-draft">Draft</span>
                    <div className="ad-actions">
                      <button type="button" className="ad-btn" onClick={p.onViewDraft}>View</button>
                      <button type="button" className="ad-btn" onClick={p.onEditDraft}>Edit</button>
                      <button type="button" className="ad-btn is-strong" onClick={p.onPublishDraft}>Publish</button>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </section>
        )}

        {showPublished && (
          <section className="ad-group" aria-labelledby="ad-published">
            <h2 id="ad-published" className="ad-group-h">
              <span className="ad-pill is-published">Published</span>
              <span className="ad-group-n">{published == null ? "" : pubCount}</span>
            </h2>
            {error && (
              <p className="ad-error">
                {error} <button type="button" className="ad-link" onClick={load}>Try again</button>
              </p>
            )}
            {published == null ? (
              <ul className="ad-list" aria-busy="true">
                {[0, 1].map((i) => <li key={i} className="ad-row is-skeleton"><div className="ad-thumb" /><div className="ad-info"><div /><div /></div></li>)}
              </ul>
            ) : published.length === 0 && !error ? (
              <p className="ad-empty">Nothing published yet.</p>
            ) : (
              <ul className="ad-list">
                {published.map((b) => (
                  <li key={b.slug} className="ad-row">
                    <Thumb src={b.banner_url} title={b.title} />
                    <div className="ad-info">
                      <div className="ad-title">{b.title}</div>
                      {(b.subtitle || b.excerpt) && <div className="ad-sub">{b.subtitle || b.excerpt}</div>}
                      <div className="ad-meta">
                        {[when(b.published_at, "Published "), b.updated_at && b.updated_at !== b.published_at ? when(b.updated_at, "edited ") : ""]
                          .filter(Boolean)
                          .join(" · ")}
                        <span className="ad-slug">/blog/{b.slug}</span>
                      </div>
                    </div>
                    <span className="ad-pill is-published">Published</span>
                    <div className="ad-actions">
                      <a className="ad-btn" href={`/blog/${b.slug}`} target="_blank" rel="noreferrer">View ↗</a>
                      <button type="button" className="ad-btn is-strong" onClick={() => p.onEditPublished(b.slug)}>Edit</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
