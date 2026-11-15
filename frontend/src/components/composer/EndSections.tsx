"use client";

import { useEffect, useState } from "react";
import AutoTextarea from "./AutoTextarea";
import { newSectionId, SECTION_TYPES, type EndSection, type SectionKind } from "./convert";

interface Props {
  sections: EndSection[];
  onChange: (fn: (prev: EndSection[]) => EndSection[]) => void;
  upload: (file: File) => Promise<string>;
  onError: (msg: string) => void;
}

/** Itinerary, Must Visit, Tips, Special Thanks — simple lists after the story. */
export default function EndSections({ sections, onChange, upload, onError }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pickPhoto = (done: (url: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        done(await upload(file));
      } catch {
        onError("Couldn't upload the photo. Check that the backend is running.");
      }
    };
    input.click();
  };
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const update = (si: number, fn: (s: EndSection) => EndSection) => onChange((prev) => prev.map((s, i) => (i === si ? fn(s) : s)));
  const addRow = (si: number, at?: number) => {
    const s = sections[si];
    const index = at ?? s.rows.length;
    update(si, (x) => ({ ...x, rows: [...x.rows.slice(0, index), {}, ...x.rows.slice(index)] }));
    setFocusKey(`es-${s.id}-${index}-${SECTION_TYPES[s.kind].fields[0].key}`);
  };
  const free = (Object.keys(SECTION_TYPES) as SectionKind[]).filter((k) => !sections.some((s) => s.kind === k));

  return (
    <div className="cmp-sections">
      <div className="cmp-sections-head"><span>Sections</span></div>

      <div className="cmp-sec-list">
        {sections.map((s, si) => {
          const t = SECTION_TYPES[s.kind];
          return (
            <section key={s.id} className="cmp-sec">
              <div className="cmp-sec-top">
                <h2 className="cmp-sec-title">{t.title}</h2>
                <button type="button" className="cmp-icon" aria-label="Move section up" onClick={() => onChange((p) => swap(p, si, si - 1))}>↑</button>
                <button type="button" className="cmp-icon" aria-label="Move section down" onClick={() => onChange((p) => swap(p, si, si + 1))}>↓</button>
                <button type="button" className="cmp-icon" aria-label={`Remove ${t.title}`} onClick={() => onChange((p) => p.filter((_, i) => i !== si))}>✕</button>
              </div>
              <div className="cmp-rows">
                {s.rows.map((row, ri) => {
                  const setKey = (key: string, v: string) =>
                    update(si, (x) => ({ ...x, rows: x.rows.map((r, j) => (j === ri ? { ...r, [key]: v } : r)) }));
                  const onEnter = () => addRow(si, ri + 1);
                  return (
                    <div key={ri} className={`cmp-row ${t.photo ? "has-photo" : ""}`}>
                      {t.photo && (
                        <button
                          type="button"
                          className="cmp-photo"
                          aria-label={row.image_url ? "Change photo" : "Add photo"}
                          onClick={() => pickPhoto((url) => setKey("image_url", url))}
                        >
                          {row.image_url ? <img src={row.image_url} alt="" /> : <span>+ Photo</span>}
                        </button>
                      )}
                      <div className="cmp-row-fields" style={{ "--cols": t.cols } as React.CSSProperties}>
                        {t.fields.map((f, fi) => {
                          const id = `es-${s.id}-${ri}-${f.key}`;
                          return f.multiline ? (
                            <AutoTextarea
                              key={f.key}
                              id={id}
                              className="cmp-field is-wide"
                              value={row[f.key] ?? ""}
                              onChange={(v) => setKey(f.key, v)}
                              placeholder={f.label}
                              onEnter={t.fields.length === 1 ? onEnter : undefined}
                            />
                          ) : (
                            <input
                              key={f.key}
                              id={id}
                              className={`cmp-field ${fi === 0 ? "is-lead" : ""}`}
                              value={row[f.key] ?? ""}
                              onChange={(e) => setKey(f.key, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && fi === t.fields.length - 1) {
                                  e.preventDefault();
                                  onEnter();
                                }
                              }}
                              placeholder={f.label}
                            />
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="cmp-icon cmp-row-remove"
                        aria-label="Remove row"
                        onClick={() => update(si, (x) => ({ ...x, rows: x.rows.filter((_, j) => j !== ri) }))}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="cmp-add-row" onClick={() => addRow(si)}>+ Add {t.add}</button>
            </section>
          );
        })}
      </div>

      <div className="cmp-add-sec-wrap">
        <button type="button" className="cmp-add-sec" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          + Add section
        </button>
        {menuOpen && (
          <div className="cmp-sec-menu" role="menu">
            {free.length ? (
              free.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const id = newSectionId();
                    onChange((p) => [...p, { id, kind: k, rows: [{}] }]);
                    setMenuOpen(false);
                    setFocusKey(`es-${id}-0-${SECTION_TYPES[k].fields[0].key}`);
                  }}
                >
                  <b>{SECTION_TYPES[k].title}</b>
                  <small>{SECTION_TYPES[k].hint}</small>
                </button>
              ))
            ) : (
              <p className="cmp-sec-menu-none">All sections are already added.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
