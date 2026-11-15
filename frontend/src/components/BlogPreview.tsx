"use client";

import { useState, useRef } from "react";
import MagazineView, { type BlogTheme } from "./MagazineView";
import BlogRenderer, { type StructuredBlog, type BlogSection } from "./BlogRenderer";
import dynamic from "next/dynamic";
import { toComposerInput, type ComposerInput } from "./composer/convert";
import RichBlogView from "./composer/RichBlogView";

const Composer = dynamic(() => import("./composer/Composer"), { ssr: false });

type ContentFormat = "markdown" | "html" | "structured" | "rich";

interface BlogPreviewProps {
  content: string;
  contentFormat?: ContentFormat;
  sections?: BlogSection[] | null;
  blogSubtitle?: string;
  title?: string;
  bannerUrl?: string;
  theme?: BlogTheme;
  blogId?: string;
  onNewTrip: () => void;
  onHome: () => void;
}

type AdminMode = "preview" | "edit";

const THEMES: { key: BlogTheme; label: string; swatch: string }[] = [
  { key: "warm", label: "Warm Teal", swatch: "#0d9488" },
  { key: "editorial", label: "Editorial", swatch: "#111111" },
  { key: "golden", label: "Golden", swatch: "#d97706" },
  { key: "night", label: "Night", swatch: "#0284c7" },
];

export default function BlogPreview({
  content: initialContent,
  contentFormat: initialFormat = "markdown",
  sections: initialSections,
  blogSubtitle: initialSubtitle,
  title: initialTitle,
  bannerUrl: initialBanner,
  theme: initialTheme = "warm",
  blogId,
  onNewTrip,
  onHome,
}: BlogPreviewProps) {
  const [content, setContent] = useState(initialContent);
  const [contentFormat, setContentFormat] = useState<ContentFormat>(initialFormat);
  const [sections, setSections] = useState<BlogSection[] | null>(initialSections ?? null);
  const [blogTitle, setBlogTitle] = useState(initialTitle ?? "");
  const [blogSubtitle, setBlogSubtitle] = useState(initialSubtitle ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialBanner ?? "");
  const [theme, setTheme] = useState<BlogTheme>(initialTheme);
  const [reformatting, setReformatting] = useState(false);
  const [reformatStatus, setReformatStatus] = useState("");

  const [mode, setMode] = useState<AdminMode>("preview");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [composerInput, setComposerInput] = useState<ComposerInput | null>(null);

  // Open the rich-text composer straight away — any stored format converts on the fly.
  const enterEdit = () => {
    setShowThemePicker(false);
    setSaveMsg("");
    setComposerInput(toComposerInput(content, contentFormat, sections, blogTitle));
    setMode("edit");
  };

  const saveTheme = async (t: BlogTheme) => {
    setTheme(t);
    setShowThemePicker(false);
    try {
      await fetch("/api/voice-agent/blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      });
    } catch {/* silent */ }
  };

  const uploadBanner = async (file: File) => {
    setBannerUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("blog_id", blogId ?? "general");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setBannerUrl(url);
      // Save banner to blog
      await fetch("/api/voice-agent/blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner_url: url }),
      });
    } catch {
      alert("Banner upload failed. Is the backend running?");
    } finally {
      setBannerUploading(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch("/api/voice-agent/blog", { method: "DELETE" });
    if (res.ok) onHome();
  };

  const startRegenerate = async (rMode: "regenerate" | "continue") => {
    setStreaming(true);
    setStreamStatus(rMode === "continue" ? "Continuing from where it stopped…" : "Starting fresh…");
    setMode("preview");
    if (rMode === "regenerate") setContent("");

    try {
      const res = await fetch("/api/voice-agent/session/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: rMode }),
      });
      if (!res.ok) throw new Error("Server error");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newContent = rMode === "continue" ? content : "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event: Record<string, string>;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === "blog_status") setStreamStatus(event.content);
          else if (event.type === "blog_token") { newContent += event.content; setContent(newContent); }
          else if (event.type === "blog_done") { setStreaming(false); setStreamStatus(""); setContentFormat("markdown"); }
          else if (event.type === "error") { setStreamStatus(`⚠️ ${event.content}`); setStreaming(false); }
        }
      }
    } catch {
      setStreamStatus("⚠️ Something went wrong. The server might be offline.");
      setStreaming(false);
    }
  };

  const isStructured = contentFormat !== "rich" && !!(sections && sections.length > 0);

  const startReformat = async () => {
    setReformatting(true);
    setReformatStatus("Sending to LLM…");
    try {
      const res = await fetch("/api/voice-agent/blog/reformat", { method: "POST" });
      if (!res.ok) throw new Error("Server error");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let evt: Record<string, unknown>;
          try { evt = JSON.parse(raw); } catch { continue; }
          if (evt.type === "status") setReformatStatus(evt.content as string);
          else if (evt.type === "done") {
            setSections(evt.sections as BlogSection[]);
            setContentFormat("structured");
            if (evt.title) setBlogTitle(evt.title as string);
            if (evt.subtitle) setBlogSubtitle(evt.subtitle as string);
            setReformatStatus("");
          } else if (evt.type === "error") {
            setReformatStatus(`⚠️ ${evt.content}`);
          }
        }
      }
    } catch {
      setReformatStatus("⚠️ Reformat failed. Is the backend running?");
    } finally {
      setReformatting(false);
    }
  };

  const currentThemeObj = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  // Wix-style full-screen composer.
  if (mode === "edit" && composerInput) {
    return (
      <Composer
        blogId={blogId}
        initialTitle={blogTitle}
        initialSubtitle={blogSubtitle}
        initialBanner={bannerUrl}
        initialHtml={composerInput.html}
        initialSections={composerInput.endSections}
        onExit={() => {
          setComposerInput(null);
          setMode("preview");
        }}
        onSaved={(d) => {
          setContent(d.html);
          setContentFormat("rich");
          setSections(d.sections);
          setBlogTitle(d.title);
          setBlogSubtitle(d.subtitle);
          setBannerUrl(d.bannerUrl);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: isStructured || contentFormat === "rich" ? "#F6F4F1" : (theme === "night" ? "#0f172a" : "#FEFCF9") }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        .admin-font { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      {/* Hidden file inputs */}
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ""; }}
      />

      {/* Admin toolbar */}
      <header className={`admin-font sticky top-0 z-30 backdrop-blur-md border-b shadow-sm ${theme === "night" ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-stone-100"}`}>
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-2 sm:gap-3 sm:flex-wrap">

          {/* Logo */}
          <button onClick={onHome} className="flex items-center gap-2 mr-auto min-w-0 group">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-sm shadow">✈️</div>
            <div className="text-left leading-tight min-w-0">
              <p className="text-teal-600 font-bold text-sm">TheTravelGram</p>
              <p className={`text-xs font-medium max-w-[200px] truncate ${theme === "night" ? "text-slate-400" : "text-slate-600"}`}>
                {streaming ? (
                  <span className="text-teal-500 animate-pulse">{streamStatus}</span>
                ) : mode === "edit" ? (
                  <span className="text-amber-500">Editing</span>
                ) : blogTitle || "Blog ready"}
              </p>
            </div>
          </button>

          {/* Mode toggle */}
          <div className={`flex items-center rounded-xl p-0.5 shrink-0 ${theme === "night" ? "bg-slate-800" : "bg-stone-100"}`}>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "preview"
                  ? "bg-white text-teal-700 shadow-sm"
                  : (theme === "night" ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700")
              }`}
            >
              Preview
            </button>
            <button
              onClick={enterEdit}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "edit"
                  ? "bg-white text-amber-600 shadow-sm"
                  : (theme === "night" ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700")
              }`}
            >
              Edit
            </button>
          </div>

          {/* Phones: all actions live in one "more" menu so the header never overflows */}
          <div className="relative sm:hidden shrink-0">
            <button
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              aria-label="More actions"
              className={`w-9 h-9 rounded-xl border text-lg leading-none ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700" : "text-slate-600 bg-stone-50 border-stone-200"}`}
            >
              ⋯
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                <div className={`absolute right-0 top-full mt-2 z-40 w-60 rounded-2xl shadow-xl border p-1.5 text-sm ${theme === "night" ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-stone-100 text-slate-700"}`}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Theme</p>
                  <div className="flex gap-2 px-3 pb-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => saveTheme(t.key)}
                        aria-label={t.label}
                        className={`w-8 h-8 rounded-full ring-offset-2 ${theme === t.key ? "ring-2 ring-teal-500" : "ring-1 ring-black/10"}`}
                        style={{ background: t.swatch }}
                      />
                    ))}
                  </div>
                  {[
                    { label: bannerUploading ? "Uploading banner…" : "Change banner", run: () => bannerInputRef.current?.click(), off: bannerUploading },
                    { label: "Regenerate blog", run: () => startRegenerate("regenerate"), off: streaming },
                    { label: "Continue writing", run: () => startRegenerate("continue"), off: streaming },
                    { label: "New trip", run: onNewTrip, off: streaming },
                  ].map((a) => (
                    <button
                      key={a.label}
                      disabled={a.off}
                      onClick={() => { setShowMore(false); a.run(); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl disabled:opacity-40 ${theme === "night" ? "hover:bg-slate-800" : "hover:bg-stone-50"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    disabled={streaming}
                    onClick={() => { setShowMore(false); setShowDeleteConfirm(true); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    Delete blog
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Action buttons (tablet & desktop) */}
          {(
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* Theme picker */}
              <div className="relative">
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className={`text-xs flex items-center gap-1.5 border px-3 py-1.5 rounded-xl transition-all ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700 hover:border-slate-500" : "text-slate-600 bg-stone-50 border-stone-200 hover:border-stone-300"}`}
                >
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: currentThemeObj.swatch }} />
                  Theme
                </button>
                {showThemePicker && (
                  <div className={`absolute top-full right-0 mt-1 rounded-xl shadow-xl border p-1.5 z-40 w-44 ${theme === "night" ? "bg-slate-900 border-slate-700" : "bg-white border-stone-100"}`}>
                    {THEMES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => saveTheme(t.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                          theme === t.key
                            ? "bg-teal-50 text-teal-700"
                            : (theme === "night" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-stone-50")
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10" style={{ background: t.swatch }} />
                        {t.label}
                        {theme === t.key && <span className="ml-auto text-teal-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Banner */}
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerUploading}
                className={`text-xs flex items-center gap-1 border px-3 py-1.5 rounded-xl transition-all ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700 hover:border-slate-500" : "text-slate-600 bg-stone-50 border-stone-200 hover:border-stone-300"}`}
              >
                {bannerUploading ? "⏳" : "🖼"} Banner
              </button>

              <button
                onClick={() => startRegenerate("regenerate")}
                disabled={streaming}
                title="Regenerate entire blog from your interview"
                className={`text-xs border disabled:opacity-40 px-3 py-1.5 rounded-xl transition-all ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700 hover:border-teal-600" : "text-slate-600 bg-stone-50 border-stone-200 hover:border-teal-200 hover:text-teal-700 hover:bg-teal-50"}`}
              >
                ↺ Regenerate
              </button>
              <button
                onClick={() => startRegenerate("continue")}
                disabled={streaming}
                title="Continue writing from where the blog stopped"
                className={`text-xs border disabled:opacity-40 px-3 py-1.5 rounded-xl transition-all ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700 hover:border-teal-600" : "text-slate-600 bg-stone-50 border-stone-200 hover:border-teal-200 hover:text-teal-700 hover:bg-teal-50"}`}
              >
                ↓ Continue
              </button>
              <button
                onClick={onNewTrip}
                disabled={streaming}
                className={`text-xs border disabled:opacity-40 px-3 py-1.5 rounded-xl transition-all ${theme === "night" ? "text-slate-300 bg-slate-800 border-slate-700 hover:border-indigo-500" : "text-slate-600 bg-stone-50 border-stone-200 hover:border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50"}`}
              >
                + New trip
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={streaming}
                className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-40 px-2.5 py-1.5 rounded-xl transition-all"
                title="Delete this blog"
              >
                🗑
              </button>
            </div>
          )}
        </div>

        {streaming && (
          <div className="h-0.5 bg-stone-100">
            <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 animate-pulse w-full" />
          </div>
        )}
      </header>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="admin-font font-bold text-slate-800 text-lg mb-2">Delete this blog?</h3>
            <p className="admin-font text-slate-500 text-sm mb-5">This cannot be undone. The blog and your interview session will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="admin-font flex-1 py-2.5 rounded-xl border border-stone-200 text-slate-600 text-sm font-medium hover:bg-stone-50 transition-all">Cancel</button>
              <button onClick={handleDelete} className="admin-font flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {(
        <div className="max-w-5xl mx-auto">
          {/* Streaming status */}
          {streaming && streamStatus && (
            <div className="admin-font max-w-5xl mx-auto px-4 pt-4">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl px-5 py-3.5 text-white flex items-center gap-3 shadow-lg shadow-teal-100">
                <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                <span className="text-sm font-medium">{streamStatus}</span>
              </div>
            </div>
          )}

          {contentFormat === "rich" ? (
            <RichBlogView
              title={blogTitle}
              subtitle={blogSubtitle || undefined}
              bannerUrl={bannerUrl || undefined}
              html={content}
              sections={sections ?? []}
            />
          ) : isStructured ? (
            <BlogRenderer
              blog={{ title: blogTitle || "My Trip", subtitle: blogSubtitle || undefined, sections: sections! }}
              bannerUrl={bannerUrl || undefined}
              streaming={streaming}
            />
          ) : (
            <MagazineView
              content={content}
              streaming={streaming}
              theme={theme}
              contentFormat={contentFormat as "markdown" | "html"}
              bannerUrl={bannerUrl || undefined}
              blogTitle={blogTitle || undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
