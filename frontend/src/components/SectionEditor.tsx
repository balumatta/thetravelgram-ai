"use client";

import { useState } from "react";
import type { BlogSection } from "./BlogRenderer";

interface SectionEditorProps {
  sections: BlogSection[];
  onChange: (sections: BlogSection[]) => void;
}

// ── Content preview renderers (document-style, not card badges) ──

function SectionPreview({ section }: { section: BlogSection }) {
  switch (section.type) {
    case "paragraph":
      return <p className="sep-para">{section.text || <span className="sep-empty">Empty paragraph…</span>}</p>;

    case "fact":
      return (
        <div className="sep-fact">
          <span className="sep-fact-mark">"</span>
          <p className="sep-fact-text">{section.text || <span className="sep-empty">Empty fact…</span>}</p>
        </div>
      );

    case "day_header":
      return (
        <div className="sep-day">
          <span className="sep-day-label">Day {section.day_number ?? "?"}{section.date ? ` · ${section.date}` : ""}</span>
          <p className="sep-day-title">{section.title || <span className="sep-empty">Untitled day…</span>}</p>
        </div>
      );

    case "conversation":
      return (
        <div className="sep-convo">
          {(section.lines ?? []).map((l, i) => (
            <div key={i} className="sep-convo-line">
              <span className="sep-convo-speaker">{l.speaker}</span>
              <span className="sep-convo-text">"{l.text}"</span>
            </div>
          ))}
          {!section.lines?.length && <span className="sep-empty">No lines yet…</span>}
        </div>
      );

    case "itinerary":
      return (
        <div className="sep-itin">
          <span className="sep-section-label">🗺 Route</span>
          <div className="sep-itin-stops">
            {(section.stops ?? []).filter(Boolean).map((s, i) => (
              <span key={i} className="sep-itin-stop">{s}{i < (section.stops?.length ?? 1) - 1 && <span className="sep-itin-arrow">→</span>}</span>
            ))}
            {!section.stops?.length && <span className="sep-empty">No stops yet…</span>}
          </div>
        </div>
      );

    case "must_visit":
      return (
        <div className="sep-mv">
          <span className="sep-section-label">📍 Must Visit</span>
          <div className="sep-mv-pills">
            {(section.places ?? []).map((p, i) => (
              <span key={i} className="sep-mv-pill">{p.emoji} {p.name}</span>
            ))}
            {!section.places?.length && <span className="sep-empty">No places yet…</span>}
          </div>
        </div>
      );

    case "tips":
      return (
        <div className="sep-tips">
          <span className="sep-section-label">💡 Tips</span>
          {(section.items ?? []).map((tip, i) => (
            <p key={i} className="sep-tip-line"><span className="sep-tip-num">{i + 1}.</span> {tip}</p>
          ))}
          {!section.items?.length && <span className="sep-empty">No tips yet…</span>}
        </div>
      );

    case "thanks":
      return (
        <div className="sep-thanks">
          <span className="sep-section-label">🙏 Thanks</span>
          <div className="sep-thanks-pills">
            {(section.people ?? []).map((p, i) => (
              <span key={i} className="sep-thanks-pill">{p.name}</span>
            ))}
            {!section.people?.length && <span className="sep-empty">No people yet…</span>}
          </div>
        </div>
      );

    case "closing":
      return <p className="sep-closing">{section.text || <span className="sep-empty">Empty closing…</span>}</p>;

    default:
      return null;
  }
}

// ── Per-type edit forms ──────────────────────────────────────

function EditForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  switch (section.type) {
    case "paragraph": return <ParagraphForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "fact":      return <FactForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "closing":   return <ClosingForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "day_header":return <DayHeaderForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "conversation": return <ConversationForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "itinerary": return <ItineraryForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "must_visit":return <MustVisitForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "tips":      return <TipsForm section={section} onSave={onSave} onCancel={onCancel} />;
    case "thanks":    return <ThanksForm section={section} onSave={onSave} onCancel={onCancel} />;
    default: return null;
  }
}

function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="sep-form-actions">
      <button className="sep-cancel" onClick={onCancel}>Cancel</button>
      <button className="sep-save" onClick={onSave}>Save</button>
    </div>
  );
}

function ParagraphForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [text, setText] = useState(section.text ?? "");
  return (
    <div className="sep-form">
      <textarea className="sep-textarea sep-ta-body" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your paragraph…" autoFocus />
      <FormActions onSave={() => onSave({ ...section, text })} onCancel={onCancel} />
    </div>
  );
}

function FactForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [text, setText] = useState(section.text ?? "");
  return (
    <div className="sep-form">
      <label className="sep-label">Fact or interesting aside</label>
      <textarea className="sep-textarea sep-ta-italic" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Milford Sound is actually a fjord, not a sound…" autoFocus />
      <FormActions onSave={() => onSave({ ...section, text })} onCancel={onCancel} />
    </div>
  );
}

function ClosingForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [text, setText] = useState(section.text ?? "");
  return (
    <div className="sep-form">
      <label className="sep-label">Sign-off paragraph</label>
      <textarea className="sep-textarea sep-ta-italic" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mā te wā, New Zealand…" autoFocus />
      <FormActions onSave={() => onSave({ ...section, text })} onCancel={onCancel} />
    </div>
  );
}

function DayHeaderForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [dayNum, setDayNum] = useState(String(section.day_number ?? ""));
  const [title, setTitle] = useState(section.title ?? "");
  const [date, setDate] = useState(section.date ?? "");
  return (
    <div className="sep-form">
      <div className="sep-row">
        <div className="sep-field sep-field-xs">
          <label className="sep-label">Day #</label>
          <input className="sep-input" type="number" min="1" value={dayNum} onChange={(e) => setDayNum(e.target.value)} placeholder="1" autoFocus />
        </div>
        <div className="sep-field">
          <label className="sep-label">Date (optional)</label>
          <input className="sep-input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 01/03/2026" />
        </div>
      </div>
      <div className="sep-field">
        <label className="sep-label">Title</label>
        <input className="sep-input sep-input-lg" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Christchurch → Fairlie" />
      </div>
      <FormActions onSave={() => onSave({ ...section, day_number: dayNum ? parseInt(dayNum) : null, title, date })} onCancel={onCancel} />
    </div>
  );
}

function ConversationForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [lines, setLines] = useState(section.lines?.length ? section.lines : [{ speaker: "", text: "" }]);
  const update = (i: number, f: "speaker" | "text", v: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  return (
    <div className="sep-form">
      <label className="sep-label">Dialogue lines</label>
      {lines.map((line, i) => (
        <div key={i} className="sep-convo-row">
          <input className="sep-input sep-input-speaker" value={line.speaker} onChange={(e) => update(i, "speaker", e.target.value)} placeholder="Speaker" />
          <input className="sep-input sep-input-flex" value={line.text} onChange={(e) => update(i, "text", e.target.value)} placeholder="What they said…" />
          <button className="sep-icon-btn sep-del-btn" onClick={() => setLines(lines.filter((_, j) => j !== i))} title="Remove">✕</button>
        </div>
      ))}
      <button className="sep-ghost-btn" onClick={() => setLines([...lines, { speaker: "", text: "" }])}>+ Add line</button>
      <FormActions onSave={() => onSave({ ...section, lines })} onCancel={onCancel} />
    </div>
  );
}

function ItineraryForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [stops, setStops] = useState(section.stops?.length ? section.stops : [""]);
  const update = (i: number, v: string) => setStops(stops.map((s, idx) => idx === i ? v : s));
  return (
    <div className="sep-form">
      <label className="sep-label">Route stops — city / town names only</label>
      {stops.map((stop, i) => (
        <div key={i} className="sep-convo-row">
          <span className="sep-stop-num">{i + 1}</span>
          <input className="sep-input sep-input-flex" value={stop} onChange={(e) => update(i, e.target.value)} placeholder="e.g. Queenstown" />
          <button className="sep-icon-btn sep-del-btn" onClick={() => setStops(stops.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="sep-ghost-btn" onClick={() => setStops([...stops, ""])}>+ Add stop</button>
      <FormActions onSave={() => onSave({ ...section, stops: stops.filter(Boolean) })} onCancel={onCancel} />
    </div>
  );
}

function MustVisitForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [places, setPlaces] = useState(section.places?.length ? section.places : [{ name: "", why: "", emoji: "📍" }]);
  const update = (i: number, f: keyof (typeof places)[0], v: string) => setPlaces(places.map((p, idx) => idx === i ? { ...p, [f]: v } : p));
  return (
    <div className="sep-form">
      {places.map((p, i) => (
        <div key={i} className="sep-mv-row">
          <input className="sep-input sep-input-emoji" value={p.emoji} onChange={(e) => update(i, "emoji", e.target.value)} />
          <div className="sep-mv-fields">
            <input className="sep-input" value={p.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Place name" />
            <input className="sep-input" value={p.why} onChange={(e) => update(i, "why", e.target.value)} placeholder="Why go — one sentence" />
          </div>
          <button className="sep-icon-btn sep-del-btn" onClick={() => setPlaces(places.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="sep-ghost-btn" onClick={() => setPlaces([...places, { name: "", why: "", emoji: "📍" }])}>+ Add place</button>
      <FormActions onSave={() => onSave({ ...section, places })} onCancel={onCancel} />
    </div>
  );
}

function TipsForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [items, setItems] = useState(section.items?.length ? section.items : [""]);
  const update = (i: number, v: string) => setItems(items.map((s, idx) => idx === i ? v : s));
  return (
    <div className="sep-form">
      <label className="sep-label">One sentence per tip</label>
      {items.map((tip, i) => (
        <div key={i} className="sep-convo-row">
          <span className="sep-stop-num">{i + 1}</span>
          <input className="sep-input sep-input-flex" value={tip} onChange={(e) => update(i, e.target.value)} placeholder="Quick tip…" />
          <button className="sep-icon-btn sep-del-btn" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="sep-ghost-btn" onClick={() => setItems([...items, ""])}>+ Add tip</button>
      <FormActions onSave={() => onSave({ ...section, items: items.filter(Boolean) })} onCancel={onCancel} />
    </div>
  );
}

function ThanksForm({ section, onSave, onCancel }: { section: BlogSection; onSave: (s: BlogSection) => void; onCancel: () => void }) {
  const [people, setPeople] = useState(section.people?.length ? section.people : [{ name: "", role: "", note: "", image_url: "" }]);
  const update = (i: number, f: keyof (typeof people)[0], v: string) => setPeople(people.map((p, idx) => idx === i ? { ...p, [f]: v } : p));
  return (
    <div className="sep-form">
      {people.map((p, i) => (
        <div key={i} className="sep-thanks-row">
          <div className="sep-thanks-fields">
            <input className="sep-input" value={p.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Full name" />
            <input className="sep-input" value={p.role} onChange={(e) => update(i, "role", e.target.value)} placeholder="Role e.g. Wife & co-traveler" />
            <input className="sep-input" value={p.note} onChange={(e) => update(i, "note", e.target.value)} placeholder="One warm line about them" />
          </div>
          <button className="sep-icon-btn sep-del-btn" onClick={() => setPeople(people.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="sep-ghost-btn" onClick={() => setPeople([...people, { name: "", role: "", note: "", image_url: "" }])}>+ Add person</button>
      <FormActions onSave={() => onSave({ ...section, people })} onCancel={onCancel} />
    </div>
  );
}

// ── Main SectionEditor ──────────────────────────────────────

const ADD_TYPES: BlogSection["type"][] = [
  "paragraph", "conversation", "fact", "day_header",
  "itinerary", "must_visit", "tips", "thanks", "closing",
];

const TYPE_LABELS: Record<string, string> = {
  paragraph: "Paragraph", conversation: "Conversation", fact: "Fact",
  day_header: "Day", itinerary: "Itinerary", must_visit: "Must Visit",
  tips: "Tips", thanks: "Thanks", closing: "Closing",
};

function emptySection(type: BlogSection["type"]): BlogSection {
  switch (type) {
    case "paragraph": return { type, text: "" };
    case "fact":      return { type, text: "" };
    case "closing":   return { type, text: "" };
    case "day_header":return { type, day_number: null, title: "", date: "" };
    case "conversation": return { type, lines: [{ speaker: "", text: "" }] };
    case "itinerary": return { type, stops: [""] };
    case "must_visit":return { type, places: [{ name: "", why: "", emoji: "📍" }] };
    case "tips":      return { type, items: [""] };
    case "thanks":    return { type, people: [{ name: "", role: "", note: "", image_url: "" }] };
    default:          return { type };
  }
}

export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showAddAt, setShowAddAt] = useState<number | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const save = (i: number, updated: BlogSection) => {
    onChange(sections.map((s, idx) => idx === i ? updated : s));
    setEditingIdx(null);
  };

  const del = (i: number) => {
    onChange(sections.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const n = [...sections]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n);
  };
  const moveDown = (i: number) => {
    if (i === sections.length - 1) return;
    const n = [...sections]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; onChange(n);
  };

  const addAt = (type: BlogSection["type"], afterIdx: number) => {
    const n = [...sections];
    n.splice(afterIdx + 1, 0, emptySection(type));
    onChange(n);
    setEditingIdx(afterIdx + 1);
    setShowAddAt(null);
    setShowTypeMenu(false);
  };

  return (
    <div className="sep-root">
      <style>{`
        /* ── Document editor styles ──────────────────── */
        .sep-root {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Section block — looks like document content, not a card */
        .sep-block {
          position: relative;
          padding: 12px 0;
          border-bottom: 1px solid #EDE9E4;
          transition: background 0.1s;
        }
        .sep-block:hover { background: #FDFCFA; }
        .sep-block-editing {
          background: #FDFCFA;
          border-bottom-color: #B84C3D;
        }

        /* Hover toolbar — floats top-right of the block */
        .sep-toolbar {
          position: absolute;
          top: 8px;
          right: 0;
          display: flex;
          align-items: center;
          gap: 2px;
          background: #fff;
          border: 1px solid #E5E0DB;
          border-radius: 8px;
          padding: 3px 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 10;
        }
        .sep-block:hover .sep-toolbar,
        .sep-block-editing .sep-toolbar { opacity: 1; }

        .sep-tb-btn {
          width: 26px; height: 26px;
          border: none; background: transparent;
          border-radius: 5px; cursor: pointer;
          font-size: 0.75rem; color: #9CA3AF;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.1s, color 0.1s;
        }
        .sep-tb-btn:hover { background: #F3F4F6; color: #374151; }
        .sep-tb-edit { font-size: 0.8rem; }
        .sep-tb-del:hover { background: #FEF2F2; color: #EF4444; }
        .sep-tb-edit.active { background: #FEF3F2; color: #B84C3D; }

        /* Content preview styles */
        .sep-para {
          font-size: 1rem;
          line-height: 1.85;
          color: #1A1718;
          margin: 0;
          padding-right: 90px;
        }

        .sep-fact {
          position: relative;
          padding: 12px 16px 10px 44px;
          background: #FBF8F4;
          border-left: 3px solid #D4766A;
          border-radius: 0 8px 8px 0;
          margin-right: 90px;
        }
        .sep-fact-mark {
          position: absolute; left: 10px; top: 4px;
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 2.5rem; color: #D4766A; line-height: 1;
        }
        .sep-fact-text {
          font-style: italic; font-size: 0.9rem;
          line-height: 1.7; color: #1A1718; margin: 0;
        }

        .sep-day {
          padding: 4px 90px 4px 0;
        }
        .sep-day-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: #B84C3D; display: block; margin-bottom: 3px;
        }
        .sep-day-title {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1.6rem; font-weight: 600; font-style: italic;
          line-height: 1.1; color: #1A1718; margin: 0;
        }

        .sep-convo {
          padding: 12px 90px 8px 16px;
          background: #FBF8F4;
          border-left: 3px solid #D4766A;
          border-radius: 0 8px 8px 0;
        }
        .sep-convo-line { margin-bottom: 10px; }
        .sep-convo-line:last-child { margin-bottom: 0; }
        .sep-convo-speaker {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #B84C3D; display: block; margin-bottom: 1px;
        }
        .sep-convo-text {
          font-size: 0.9rem; font-style: italic;
          line-height: 1.6; color: #1A1718;
        }

        .sep-itin { padding-right: 90px; }
        .sep-mv  { padding-right: 90px; }
        .sep-tips { padding-right: 90px; }
        .sep-thanks { padding-right: 90px; }
        .sep-closing {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1.1rem; font-style: italic;
          line-height: 1.7; color: #1A1718; margin: 0;
          padding-right: 90px;
        }

        .sep-section-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #B84C3D; display: block; margin-bottom: 6px;
        }

        .sep-itin-stops { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
        .sep-itin-stop { font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #374151; font-weight: 500; }
        .sep-itin-arrow { color: #B84C3D; margin: 0 2px; font-weight: 700; }

        .sep-mv-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .sep-mv-pill {
          font-family: 'Inter', sans-serif; font-size: 0.75rem;
          background: #F5EDE9; color: #B84C3D; border-radius: 100px;
          padding: 3px 10px; font-weight: 500;
        }
        .sep-tip-line {
          font-size: 0.875rem; line-height: 1.6; color: #374151; margin: 0 0 4px;
        }
        .sep-tip-num {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1rem; font-weight: 700; color: #B84C3D; margin-right: 4px;
        }
        .sep-thanks-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .sep-thanks-pill {
          font-family: 'Inter', sans-serif; font-size: 0.75rem;
          background: #F7F5F2; color: #374151; border-radius: 100px;
          padding: 3px 10px; border: 1px solid #E5E0DB;
        }

        .sep-empty { color: #C4BDB8; font-style: italic; }

        /* Edit form */
        .sep-form {
          margin-top: 10px;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid #E5E0DB;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sep-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #9CA3AF; display: block; margin-bottom: -2px;
        }

        .sep-textarea {
          width: 100%; border: 1px solid #E5E0DB; border-radius: 8px;
          padding: 10px 12px; font-size: 0.9rem; line-height: 1.7;
          color: #1A1718; resize: vertical; outline: none;
          font-family: var(--font-lora, Georgia, serif);
          box-sizing: border-box; background: #FDFCFA;
        }
        .sep-textarea:focus { border-color: #B84C3D; box-shadow: 0 0 0 2px rgba(184,76,61,0.1); }
        .sep-ta-italic { font-style: italic; }
        .sep-ta-body { font-size: 0.95rem; }

        .sep-input {
          width: 100%; border: 1px solid #E5E0DB; border-radius: 8px;
          padding: 7px 10px; font-size: 0.82rem; color: #1A1718;
          font-family: 'Inter', system-ui, sans-serif;
          outline: none; box-sizing: border-box; background: #FDFCFA;
        }
        .sep-input:focus { border-color: #B84C3D; box-shadow: 0 0 0 2px rgba(184,76,61,0.1); }
        .sep-input-lg { font-size: 1rem; padding: 8px 12px; }
        .sep-input-flex { flex: 1; min-width: 0; width: auto; }
        .sep-input-speaker { width: 100px; flex-shrink: 0; }
        .sep-input-emoji { width: 50px; flex-shrink: 0; text-align: center; }

        .sep-row { display: flex; gap: 8px; }
        .sep-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .sep-field-xs { flex: 0 0 80px; }

        .sep-convo-row, .sep-mv-row { display: flex; gap: 8px; align-items: center; }
        .sep-mv-fields { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .sep-mv-row { align-items: flex-start; }
        .sep-thanks-row { display: flex; gap: 8px; align-items: flex-start; }
        .sep-thanks-fields { flex: 1; display: flex; flex-direction: column; gap: 5px; }

        .sep-stop-num {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1rem; font-weight: 700; color: #B84C3D;
          width: 18px; text-align: right; flex-shrink: 0;
        }

        .sep-icon-btn {
          width: 26px; height: 26px; border: none; border-radius: 6px;
          cursor: pointer; font-size: 0.7rem; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sep-del-btn { background: #FEF2F2; color: #EF4444; }
        .sep-del-btn:hover { background: #FEE2E2; }

        .sep-ghost-btn {
          font-family: 'Inter', system-ui, sans-serif; font-size: 0.75rem;
          font-weight: 600; color: #B84C3D; background: none;
          border: 1.5px dashed #E5D0CB; border-radius: 8px;
          padding: 6px 12px; cursor: pointer; text-align: left;
          transition: border-color 0.1s;
        }
        .sep-ghost-btn:hover { border-color: #B84C3D; background: #FBF0EE; }

        .sep-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
        .sep-cancel {
          font-family: 'Inter', sans-serif; font-size: 0.75rem;
          color: #6B6460; background: none;
          border: 1px solid #E5E0DB; border-radius: 8px; padding: 6px 14px; cursor: pointer;
        }
        .sep-cancel:hover { background: #F7F5F2; }
        .sep-save {
          font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700;
          color: #fff; background: #B84C3D; border: none;
          border-radius: 8px; padding: 6px 18px; cursor: pointer;
        }
        .sep-save:hover { background: #A03F32; }

        /* Add section between blocks */
        .sep-add-row {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 0; opacity: 0; transition: opacity 0.15s;
          position: relative;
        }
        .sep-add-row:hover, .sep-add-row.sep-add-open { opacity: 1; }
        .sep-add-line { flex: 1; height: 1px; background: #E5E0DB; }
        .sep-add-btn {
          font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #B84C3D; background: #fff; border: 1px solid #E5D0CB;
          border-radius: 100px; padding: 3px 10px; cursor: pointer; white-space: nowrap;
        }
        .sep-add-btn:hover { background: #FBF0EE; }
        .sep-type-menu {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          margin-top: 4px; background: #fff; border: 1px solid #E5E0DB;
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 3px; padding: 6px; z-index: 20; min-width: 240px;
        }
        .sep-type-btn {
          font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 500;
          color: #374151; background: #F7F5F2; border: none;
          border-radius: 6px; padding: 6px 4px; cursor: pointer; text-align: center;
        }
        .sep-type-btn:hover { background: #F5EDE9; color: #B84C3D; }

        /* End add button */
        .sep-end-add {
          margin-top: 12px; width: 100%;
          font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600;
          color: #6B6460; background: #F7F5F2;
          border: 1.5px dashed #DDD9D3; border-radius: 10px;
          padding: 11px; cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .sep-end-add:hover { border-color: #B84C3D; color: #B84C3D; }
      `}</style>

      {sections.map((section, i) => (
        <div key={i}>
          {/* Section block */}
          <div
            className={`sep-block${editingIdx === i ? " sep-block-editing" : ""}`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Floating toolbar */}
            <div className="sep-toolbar">
              <button className={`sep-tb-btn sep-tb-edit${editingIdx === i ? " active" : ""}`} onClick={() => setEditingIdx(editingIdx === i ? null : i)} title="Edit">✏️</button>
              <button className="sep-tb-btn" onClick={() => moveUp(i)} disabled={i === 0} title="Move up" style={{ opacity: i === 0 ? 0.3 : 1 }}>↑</button>
              <button className="sep-tb-btn" onClick={() => moveDown(i)} disabled={i === sections.length - 1} title="Move down" style={{ opacity: i === sections.length - 1 ? 0.3 : 1 }}>↓</button>
              <button className="sep-tb-btn sep-tb-del" onClick={() => del(i)} title="Delete">🗑</button>
            </div>

            {/* Content preview */}
            <SectionPreview section={section} />

            {/* Inline edit form */}
            {editingIdx === i && (
              <EditForm section={section} onSave={(u) => save(i, u)} onCancel={() => setEditingIdx(null)} />
            )}
          </div>

          {/* Add section between blocks */}
          <div className={`sep-add-row${showAddAt === i ? " sep-add-open" : ""}`}>
            <div className="sep-add-line" />
            <button className="sep-add-btn" onClick={() => { setShowAddAt(showAddAt === i ? null : i); setShowTypeMenu(true); }}>
              + Insert
            </button>
            <div className="sep-add-line" />
            {showAddAt === i && showTypeMenu && (
              <div className="sep-type-menu">
                {ADD_TYPES.map((type) => (
                  <button key={type} className="sep-type-btn" onClick={() => addAt(type, i)}>
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add at end */}
      <div className="sep-add-row sep-add-open" style={{ opacity: 1 }}>
        <div className="sep-add-line" />
        <button className="sep-add-btn" onClick={() => { setShowAddAt(-1); setShowTypeMenu(true); }}>
          + Add section
        </button>
        <div className="sep-add-line" />
        {showAddAt === -1 && showTypeMenu && (
          <div className="sep-type-menu">
            {ADD_TYPES.map((type) => (
              <button key={type} className="sep-type-btn" onClick={() => addAt(type, sections.length - 1)}>
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
