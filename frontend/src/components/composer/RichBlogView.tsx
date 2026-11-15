"use client";

import { useEffect, useState } from "react";
import type { BlogSection } from "../BlogRenderer";
import ItineraryFlow from "./ItineraryFlow";
import { prepareStoryHtml } from "./richHtml";
import "./story.css";

interface Props {
  title: string;
  subtitle?: string;
  bannerUrl?: string;
  html: string;
  sections: BlogSection[];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "♥";
}

/** Published look for a rich-text blog: the story, then the end sections. */
export default function RichBlogView({ title, subtitle, bannerUrl, html, sections }: Props) {
  // Sanitizing needs the DOM, so it runs after mount.
  const [storyHtml, setStoryHtml] = useState("");
  useEffect(() => setStoryHtml(prepareStoryHtml(html)), [html]);

  const titles = (
    <div className="rbv-titles">
      <h1 className="rbv-title">{title || "Untitled story"}</h1>
      {subtitle && <p className="rbv-sub">{subtitle}</p>}
    </div>
  );

  return (
    <div className={`rbv tg-story-scope ${bannerUrl ? "" : "rbv-plain"}`}>
      {bannerUrl ? (
        <div className="rbv-cover">
          <img src={bannerUrl} alt="" />
          {titles}
        </div>
      ) : (
        titles
      )}

      <div className="rbv-body">
        <article className="tg-story" dangerouslySetInnerHTML={{ __html: storyHtml }} />

        <div className="rbv-sections">
          {sections.map((s, i) => {
            switch (s.type) {
              case "itinerary":
                return (
                  <section key={i}>
                    <h2 className="rbv-h">Itinerary</h2>
                    <ItineraryFlow stops={s.stops ?? []} />
                  </section>
                );
              case "must_visit":
                return (
                  <section key={i}>
                    <h2 className="rbv-h">Must Visit</h2>
                    <div className="rbv-grid">
                      {(s.places ?? []).map((p, j) => (
                        <div key={j} className="rbv-card">
                          <b>{p.emoji ? `${p.emoji} ` : ""}{p.name}</b>
                          <span>{p.why}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              case "tips":
                return (
                  <section key={i}>
                    <h2 className="rbv-h">Tips</h2>
                    <ol className="rbv-tips">
                      {(s.items ?? []).map((t, j) => <li key={j}><span>{t}</span></li>)}
                    </ol>
                  </section>
                );
              case "thanks":
                return (
                  <section key={i}>
                    <h2 className="rbv-h">Special Thanks</h2>
                    <div className="pc-stack">
                      {(s.people ?? []).map((p, j) => (
                        <article key={j} className="pc">
                          <p className="pc-note">{p.note}</p>
                          <span className="pc-divider" aria-hidden="true" />
                          <div className="pc-right">
                            <div className="pc-stampbox">
                              <span className="pc-stamp">
                                <span className="pc-stamp-inner">
                                  {p.image_url ? <img src={p.image_url} alt="" /> : initials(p.name)}
                                </span>
                              </span>
                              <span className="pc-postmark" aria-hidden="true">Thank<br />you</span>
                            </div>
                            <div className="pc-address">
                              <span className="pc-line pc-name">{p.name}</span>
                              {p.role ? <span className="pc-line pc-role">{p.role}</span> : <span className="pc-line is-blank" />}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    {(s.people?.length ?? 0) > 1 && <p className="pc-swipe">Swipe for more →</p>}
                  </section>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
