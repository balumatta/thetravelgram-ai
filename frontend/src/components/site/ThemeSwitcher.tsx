"use client";

import { useEffect, useState } from "react";

/** The two site moods. "daytrip" is the default (no attribute on <html>). */
export const SITE_THEMES = [
  { id: "daytrip", name: "Day Trip", attr: null },
  { id: "night", name: "Night Drive", attr: "night" },
] as const;

const KEY = "ttg-site-theme";

function DayIcon() {
  // Sun on the horizon.
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3 17h18M12 6.5V9M5.6 9.6l1.6 1.6M18.4 9.6l-1.6 1.6" />
    </svg>
  );
}

function NightIcon() {
  // Headlight throwing beams down the road.
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 7.5c-2.8 0-5 2-5 4.5s2.2 4.5 5 4.5c1 0 1.6-2 1.6-4.5S10 7.5 9 7.5Z" />
      <path d="M14 8.5l6-1.5M14 12h6.5M14 15.5l6 1.5" />
    </svg>
  );
}

/** Header toggle, top right: Day Trip ↔ Night Drive. Remembers the choice in this browser. */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("daytrip");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-site-theme") === "night" ? "night" : "daytrip");
  }, []);

  const pick = (id: string) => {
    setTheme(id);
    if (id === "night") document.documentElement.setAttribute("data-site-theme", "night");
    else document.documentElement.removeAttribute("data-site-theme");
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  };

  return (
    <div className="ts" role="radiogroup" aria-label="Site mood">
      <span className="ts-thumb" data-on={theme} aria-hidden="true" />
      {SITE_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          className="ts-opt"
          title={t.name}
          onClick={() => pick(t.id)}
        >
          {t.id === "night" ? <NightIcon /> : <DayIcon />}
          <span className="ts-name">{t.name}</span>
        </button>
      ))}
    </div>
  );
}
