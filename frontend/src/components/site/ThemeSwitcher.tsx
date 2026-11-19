"use client";

import { useEffect, useRef, useState } from "react";

export const SITE_THEMES = [
  { id: "journal", name: "Journal", note: "Warm paper, rust, classic serif", swatch: ["#F6F4F1", "#B84C3D", "#1C1819"] },
  { id: "alpine", name: "Alpine", note: "Cool mist, pine green, crisp", swatch: ["#EEF2EE", "#2E6A56", "#7FA8C9"] },
  { id: "night", name: "Night Drive", note: "Dark, amber headlights", swatch: ["#131211", "#F0A64A", "#E0604C"] },
  { id: "postcard", name: "Postcard", note: "Sunny paper, cobalt, bold", swatch: ["#FBF4E6", "#2747B5", "#E5533D"] },
] as const;

const KEY = "ttg-site-theme";

/** Floating theme picker, bottom right. Remembers the choice in this browser. */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("journal");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-site-theme") || "journal");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setTheme(id);
    if (id === "journal") document.documentElement.removeAttribute("data-site-theme");
    else document.documentElement.setAttribute("data-site-theme", id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  };

  const current = SITE_THEMES.find((t) => t.id === theme) ?? SITE_THEMES[0];

  return (
    <div className="ts" ref={box}>
      {open && (
        <div className="ts-panel" role="radiogroup" aria-label="Site theme">
          <p className="ts-h">Theme</p>
          {SITE_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === theme}
              className="ts-opt"
              onClick={() => pick(t.id)}
            >
              <span className="ts-sw" aria-hidden="true">
                {t.swatch.map((c) => <i key={c} style={{ background: c }} />)}
              </span>
              <span className="ts-txt">
                <b>{t.name}</b>
                <small>{t.note}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="ts-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ts-sw" aria-hidden="true">
          {current.swatch.map((c) => <i key={c} style={{ background: c }} />)}
        </span>
        {current.name}
      </button>
    </div>
  );
}
