"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { NodeSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlogSection } from "../BlogRenderer";
import AutoTextarea from "./AutoTextarea";
import { fromEndSections, type EndSection } from "./convert";
import EndSections from "./EndSections";
import { Figure, StyledParagraph } from "./extensions";
import { Gallery, pickImages, uploadImages } from "./gallery";
import RichBlogView from "./RichBlogView";
import "./story.css";
import "./composer.css";

export interface ComposerSaved {
  title: string;
  subtitle: string;
  bannerUrl: string;
  html: string;
  sections: BlogSection[];
}

interface Props {
  blogId?: string;
  /** Where Save sends the blog (PUT). Defaults to the draft. */
  saveUrl?: string;
  initialTitle: string;
  initialSubtitle: string;
  initialBanner: string;
  initialHtml: string;
  initialSections: EndSection[];
  onExit: () => void;
  onSaved: (data: ComposerSaved) => void;
}

type Style = "p" | "h2" | "h3" | "convo" | "fact" | "quote";
type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

// Colours are stored as CSS variables (see story.css) so each site theme can tune them.
const TEXT_COLORS: Array<[string, string | null]> = [
  ["Default", null],
  ["Accent", "var(--s-accent)"],
  ["Muted", "var(--s-muted)"],
  ["Red", "var(--ink-red)"],
  ["Orange", "var(--ink-orange)"],
  ["Green", "var(--ink-green)"],
  ["Blue", "var(--ink-blue)"],
  ["Purple", "var(--ink-purple)"],
];
const HIGHLIGHTS: Array<[string, string | null]> = [
  ["None", null],
  ["Yellow", "var(--mark-yellow)"],
  ["Green", "var(--mark-green)"],
  ["Blue", "var(--mark-blue)"],
  ["Pink", "var(--mark-pink)"],
];
const FONT_SIZES: Array<[string, string | null]> = [
  ["Small", "0.875em"],
  ["Normal", null],
  ["Large", "1.25em"],
  ["Huge", "1.6em"],
];

const STYLE_LABELS: Array<[Style, string]> = [
  ["p", "Paragraph"],
  ["h2", "Heading"],
  ["h3", "Small heading"],
  ["convo", "Conversation"],
  ["fact", "Fact"],
  ["quote", "Quote"],
];

// ── Block styles ─────────────────────────────────────────────

function currentStyle(e: Editor): Style {
  if (e.isActive("heading", { level: 2 })) return "h2";
  if (e.isActive("heading", { level: 3 })) return "h3";
  if (e.isActive("blockquote")) return "quote";
  if (e.isActive("paragraph", { variant: "convo" })) return "convo";
  if (e.isActive("paragraph", { variant: "fact" })) return "fact";
  return "p";
}

function selectionHasFigure(e: Editor) {
  let found = false;
  const { from, to } = e.state.selection;
  e.state.doc.nodesBetween(from, to, (n) => {
    if (n.type.name === "figure") found = true;
  });
  return found;
}

/** Apply a style to every line in the selection. Lines stay in the story; only their look changes. */
function applyStyle(e: Editor, style: Style) {
  let chain = e.chain().focus();
  // Lift lines out of lists/quotes first (skipped when a photo is selected, so captions keep their photo).
  if (!selectionHasFigure(e)) chain = chain.clearNodes();
  chain
    .command(({ tr, state }) => {
      const { paragraph, heading } = state.schema.nodes;
      const { from, to } = tr.selection;
      tr.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isTextblock || node.type.name === "figure") return true;
        if (style === "h2" || style === "h3") tr.setNodeMarkup(pos, heading, { level: style === "h2" ? 2 : 3 });
        else tr.setNodeMarkup(pos, paragraph, { variant: style === "convo" || style === "fact" ? style : null });
        return false;
      });
      return true;
    })
    .run();
  if (style === "quote") e.chain().focus().setBlockquote().run();
}

// ── Icons ────────────────────────────────────────────────────

const Icon = {
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  bullets: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>,
  numbers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 4v4M3 18h3l-3 2h3" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>,
  video: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></svg>,
  gallery: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>,
  marker: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-5 5v3h3l5-5M9 11l6-6 4 4-6 6M9 11l4 4" /></svg>,
  divider: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>,
};

// ── Composer ─────────────────────────────────────────────────

/** Toolbar button that opens a row of colour swatches (text colour or highlight). */
function SwatchMenu({
  title,
  icon,
  options,
  current,
  kind,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  options: Array<[string, string | null]>;
  current: string | null;
  kind: "text" | "mark";
  onPick: (value: string | null) => void;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof PointerEvent && (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setPos(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 248)), top: r.bottom + 6 });
  };

  return (
    <>
      <button ref={btn} type="button" className={`cmp-tb ${current ? "is-on" : ""}`} title={title} aria-label={title} aria-expanded={!!pos} onClick={toggle}>
        {icon}
      </button>
      {pos && (
        <div ref={menu} className="cmp-swatches" role="menu" aria-label={title} style={{ left: pos.left, top: pos.top }}>
          {options.map(([label, value]) => (
            <button
              key={label}
              type="button"
              role="menuitemradio"
              aria-checked={current === value}
              title={label}
              aria-label={label}
              className={`cmp-swatch is-${kind} ${value ? "" : "is-none"}`}
              style={value ? (kind === "text" ? { color: value } : { background: value }) : undefined}
              onClick={() => {
                onPick(value);
                setPos(null);
              }}
            >
              {kind === "text" ? "A" : ""}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function Composer({
  blogId,
  saveUrl = "/api/voice-agent/blog",
  initialTitle,
  initialSubtitle,
  initialBanner,
  initialHtml,
  initialSections,
  onExit,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [banner, setBanner] = useState(initialBanner);
  const [endSections, setEndSections] = useState<EndSection[]>(initialSections);
  const [save, setSave] = useState<SaveState>("clean");
  const [saveError, setSaveError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(0);
  const coverInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const markDirty = useCallback(() => setSave((s) => (s === "saving" ? s : "dirty")), []);
  const dirty = save === "dirty" || save === "error";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("blog_id", blogId ?? "general");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      return url as string;
    },
    [blogId],
  );
  const uploadRef = useRef(upload);
  uploadRef.current = upload;
  const editorRef = useRef<Editor | null>(null);

  /** Upload files and insert each as a photo/video after the block at `pos`. */
  const insertMedia = useCallback(
    async (files: File[], pos?: number) => {
      const ed = editorRef.current;
      if (!ed) return;
      let at = pos ?? (ed.state.selection.$from.depth >= 1 ? ed.state.selection.$from.after(1) : ed.state.doc.content.size);
      for (const file of files) {
        if (!/^(image|video)\//.test(file.type)) continue;
        setUploading((n) => n + 1);
        try {
          const src = await uploadRef.current(file);
          const node = ed.schema.nodes.figure.create({ src, kind: file.type.startsWith("video") ? "video" : "image" });
          const safe = Math.min(at, ed.state.doc.content.size);
          ed.view.dispatch(ed.state.tr.insert(safe, node));
          at = safe + node.nodeSize;
        } catch {
          showToast(`Couldn't upload ${file.name}. Check that the backend is running.`);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [showToast],
  );
  const insertMediaRef = useRef(insertMedia);
  insertMediaRef.current = insertMedia;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  /** Pick several photos, upload them, and insert one gallery block after the current block. */
  const addGallery = useCallback(() => {
    pickImages(async (files) => {
      const ed = editorRef.current;
      if (!ed) return;
      setUploading((n) => n + files.length);
      try {
        const images = await uploadImages(files, (f) => uploadRef.current(f), (m) => showToastRef.current(m));
        if (!images.length) return;
        const { $from } = ed.state.selection;
        const at = Math.min($from.depth >= 1 ? $from.after(1) : ed.state.doc.content.size, ed.state.doc.content.size);
        ed.view.dispatch(ed.state.tr.insert(at, ed.schema.nodes.gallery.create({ images })));
      } finally {
        setUploading((n) => n - files.length);
      }
    });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      StyledParagraph,
      Figure,
      Gallery.configure({
        upload: (f: File) => uploadRef.current(f),
        onError: (m: string) => showToastRef.current(m),
      }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "figure" ? "Add a caption" : "Write your story…"),
        includeChildren: true,
      }),
    ],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: { class: "tg-story cmp-story", spellcheck: "true" },
      handleDrop(view, event, _slice, moved) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (moved || !files.some((f) => /^(image|video)\//.test(f.type))) return false;
        event.preventDefault();
        const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const $pos = view.state.doc.resolve(hit?.pos ?? view.state.doc.content.size);
        insertMediaRef.current(files, $pos.depth >= 1 ? $pos.after(1) : $pos.pos);
        return true;
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.some((f) => /^(image|video)\//.test(f.type))) return false;
        insertMediaRef.current(files);
        return true;
      },
    },
    onUpdate: () => markDirty(),
  });
  editorRef.current = editor;

  const ui = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            style: currentStyle(e),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            link: e.isActive("link"),
            bullets: e.isActive("bulletList"),
            numbers: e.isActive("orderedList"),
            color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
            mark: (e.getAttributes("textStyle").backgroundColor as string | undefined) ?? null,
            size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? null,
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  const sectionsOut = useMemo(() => fromEndSections(endSections), [endSections]);

  const doSave = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    setSave("saving");
    setSaveError("");
    try {
      const res = await fetch(saveUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, banner_url: banner, content: html, content_format: "rich", sections: sectionsOut }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSave("saved");
      onSaved({ title, subtitle, bannerUrl: banner, html, sections: sectionsOut });
    } catch (err) {
      setSave("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  }, [editor, title, subtitle, banner, sectionsOut, onSaved, saveUrl]);

  // ⌘/Ctrl+S saves; the browser warns before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSave();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [doSave, dirty]);

  const exit = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    onExit();
  };

  const setMode = (preview: boolean) => {
    if (preview && editor) setPreviewHtml(editor.getHTML());
    setPreviewing(preview);
    setLinkOpen(false);
    window.scrollTo({ top: 0 });
  };

  const openLink = () => {
    if (!editor) return;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      showToast("Select some text first, then add a link.");
      return;
    }
    setLinkValue((editor.getAttributes("link").href as string) ?? "");
    setLinkOpen(true);
  };
  const applyLink = () => {
    if (!editor) return;
    const href = linkValue.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:\/\/|mailto:)/.test(href) ? href : `https://${href}` }).run();
    setLinkOpen(false);
  };

  const pickMedia = (kind: "image" | "video") => {
    const input = mediaInput.current;
    if (!input) return;
    input.accept = kind === "video" ? "video/*" : "image/*";
    input.click();
  };

  const pickCover = async (file: File) => {
    setUploading((n) => n + 1);
    try {
      setBanner(await upload(file));
      markDirty();
    } catch {
      showToast("Couldn't upload the cover. Check that the backend is running.");
    } finally {
      setUploading((n) => n - 1);
    }
  };

  // Keep the selection when tapping toolbar buttons.
  const keepSelection = (e: React.PointerEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) e.preventDefault();
  };

  const statusText =
    save === "saving" ? "Saving…"
    : save === "saved" ? "Saved"
    : save === "error" ? saveError || "Save failed"
    : save === "dirty" ? "Unsaved changes"
    : "No changes yet";

  const Btn = ({ on, title: t, onClick, children, disabled }: { on?: boolean; title: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button type="button" className={`cmp-tb ${on ? "is-on" : ""}`} title={t} aria-label={t} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );

  return (
    <div className="cmp-root tg-story-scope">
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickCover(f); e.target.value = ""; }} />
      <input ref={mediaInput} type="file" hidden multiple onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) insertMedia(files); }} />

      {/* ── App bar + formatting toolbar ── */}
      <header className="cmp-appbar">
        <div className="cmp-appbar-row">
          <button type="button" className="cmp-back" onClick={exit}>← <span>Back</span></button>
          <div className="cmp-meta">
            <b>{title || "Untitled story"}</b>
            <span className={`is-${save}`}>{statusText}</span>
          </div>
          <div className="cmp-seg" role="group" aria-label="Mode">
            <button type="button" aria-pressed={!previewing} onClick={() => setMode(false)}>Edit</button>
            <button type="button" aria-pressed={previewing} onClick={() => setMode(true)}>Preview</button>
          </div>
          <button type="button" className="cmp-save" onClick={doSave} disabled={save === "saving"}>
            {save === "saving" ? "Saving…" : "Save"}
          </button>
        </div>

        {!previewing && editor && ui && (
          <div className="cmp-toolbar" role="toolbar" aria-label="Formatting" onPointerDown={keepSelection} onMouseDown={keepSelection}>
            <select
              className="cmp-style-select"
              aria-label="Text style"
              value={ui.style}
              onChange={(e) => applyStyle(editor, e.target.value as Style)}
            >
              {STYLE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="cmp-tb-sep" />
            <Btn title="Bold" on={ui.bold} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
            <Btn title="Italic" on={ui.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
            <Btn title="Underline" on={ui.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></Btn>
            <Btn title="Strikethrough" on={ui.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></Btn>
            <Btn title="Link" on={ui.link} onClick={openLink}>{Icon.link}</Btn>
            <span className="cmp-tb-sep" />
            <select
              className="cmp-style-select cmp-size-select"
              aria-label="Font size"
              title="Font size"
              value={ui.size ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const c = editor.chain().focus();
                (v ? c.setFontSize(v) : c.unsetFontSize()).run();
              }}
            >
              {FONT_SIZES.map(([l, v]) => <option key={l} value={v ?? ""}>{l}</option>)}
            </select>
            <SwatchMenu
              title="Text colour"
              icon={<span className="cmp-a">A<i style={{ background: ui.color ?? "currentColor" }} /></span>}
              options={TEXT_COLORS}
              current={ui.color}
              kind="text"
              onPick={(v) => { const c = editor.chain().focus(); (v ? c.setColor(v) : c.unsetColor()).run(); }}
            />
            <SwatchMenu
              title="Highlight"
              icon={<span className="cmp-mark-ic" style={{ background: ui.mark ?? "transparent" }}>{Icon.marker}</span>}
              options={HIGHLIGHTS}
              current={ui.mark}
              kind="mark"
              onPick={(v) => { const c = editor.chain().focus(); (v ? c.setBackgroundColor(v) : c.unsetBackgroundColor()).run(); }}
            />
            <span className="cmp-tb-sep" />
            <button type="button" className={`cmp-tb cmp-chip ${ui.style === "convo" ? "is-on" : ""}`} aria-pressed={ui.style === "convo"} onClick={() => applyStyle(editor, ui.style === "convo" ? "p" : "convo")}>Conversation</button>
            <button type="button" className={`cmp-tb cmp-chip ${ui.style === "fact" ? "is-on" : ""}`} aria-pressed={ui.style === "fact"} onClick={() => applyStyle(editor, ui.style === "fact" ? "p" : "fact")}>Fact</button>
            <span className="cmp-tb-sep" />
            <Btn title="Bulleted list" on={ui.bullets} onClick={() => editor.chain().focus().toggleBulletList().run()}>{Icon.bullets}</Btn>
            <Btn title="Numbered list" on={ui.numbers} onClick={() => editor.chain().focus().toggleOrderedList().run()}>{Icon.numbers}</Btn>
            <Btn title="Add photo" onClick={() => pickMedia("image")}>{Icon.image}</Btn>
            <Btn title="Add gallery (several photos)" onClick={addGallery}>{Icon.gallery}</Btn>
            <Btn title="Add video" onClick={() => pickMedia("video")}>{Icon.video}</Btn>
            <Btn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>{Icon.divider}</Btn>
            <span className="cmp-tb-sep" />
            <Btn title="Undo" disabled={!ui.canUndo} onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
            <Btn title="Redo" disabled={!ui.canRedo} onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
          </div>
        )}
      </header>

      {/* ── Preview ── */}
      {previewing && (
        <RichBlogView title={title} subtitle={subtitle} bannerUrl={banner || undefined} html={previewHtml} sections={sectionsOut} />
      )}

      {/* ── Editor (stays mounted during preview so undo history survives) ── */}
      <main className="cmp-page" hidden={previewing}>
        {banner ? (
          <div className="cmp-cover">
            <img src={banner} alt="Cover" />
            <div className="cmp-cover-actions">
              <button type="button" onClick={() => coverInput.current?.click()}>Change cover</button>
              <button type="button" onClick={() => { setBanner(""); markDirty(); }}>Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" className="cmp-cover-empty" onClick={() => coverInput.current?.click()}>+ Add a cover photo</button>
        )}

        <AutoTextarea
          className="cmp-title"
          value={title}
          onChange={(v) => { setTitle(v.replace(/\n/g, " ")); markDirty(); }}
          placeholder="Give your trip a title"
        />
        <AutoTextarea
          className="cmp-subtitle"
          value={subtitle}
          onChange={(v) => { setSubtitle(v.replace(/\n/g, " ")); markDirty(); }}
          placeholder="A one-line subtitle, e.g. 6 days · 3 islands · one patient tortoise"
        />
        <div className="cmp-title-rule" />

        {editor ? (
          <>
            <BubbleMenu
              editor={editor}
              options={{ placement: "bottom", offset: 10 }}
              shouldShow={({ state }) => !state.selection.empty && !(state.selection instanceof NodeSelection)}
              className="cmp-bubble"
            >
              <div onPointerDown={keepSelection} onMouseDown={keepSelection} className="cmp-bubble-inner">
                {linkOpen ? (
                  <form className="cmp-bubble-link" onSubmit={(e) => { e.preventDefault(); applyLink(); }}>
                    <input autoFocus value={linkValue} onChange={(e) => setLinkValue(e.target.value)} placeholder="Paste a link" aria-label="Link address" />
                    <button type="submit">Apply</button>
                    <button type="button" onClick={() => setLinkOpen(false)} aria-label="Cancel">✕</button>
                  </form>
                ) : (
                  <>
                    <button type="button" className={ui?.style === "convo" ? "is-on" : ""} onClick={() => applyStyle(editor, "convo")}>Conversation</button>
                    <button type="button" className={ui?.style === "fact" ? "is-on" : ""} onClick={() => applyStyle(editor, "fact")}>Fact</button>
                    <button type="button" className={ui?.style === "h2" ? "is-on" : ""} onClick={() => applyStyle(editor, "h2")}>Heading</button>
                    <button type="button" className={ui?.style === "p" ? "is-on" : ""} onClick={() => applyStyle(editor, "p")}>Normal</button>
                    <span className="cmp-bsep" />
                    <button type="button" className={ui?.bold ? "is-on" : ""} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><b>B</b></button>
                    <button type="button" className={ui?.italic ? "is-on" : ""} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><i>I</i></button>
                    <button type="button" className={ui?.link ? "is-on" : ""} onClick={openLink}>Link</button>
                  </>
                )}
              </div>
            </BubbleMenu>
            <EditorContent editor={editor} />
          </>
        ) : (
          <p className="cmp-loading">Loading editor…</p>
        )}

        <EndSections
          upload={upload}
          onError={showToast}
          sections={endSections}
          onChange={(fn) => {
            setEndSections(fn);
            markDirty();
          }}
        />
      </main>

      {(toast || uploading > 0) && (
        <div className="cmp-toast" role="status">
          {uploading > 0 ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…` : toast}
        </div>
      )}
    </div>
  );
}
