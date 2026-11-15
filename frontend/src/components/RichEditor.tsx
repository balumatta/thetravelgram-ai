"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { marked } from "marked";

interface RichEditorProps {
  initialContent: string;        // markdown or HTML
  contentFormat: "markdown" | "html";
  blogId?: string;
  onChange: (html: string) => void;
}

// ── Toolbar button ────────────────────────────────────────
function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`toolbar-btn ${active ? "toolbar-btn-active" : ""} ${disabled ? "toolbar-btn-disabled" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="toolbar-divider" />;
}

// ── Main component ─────────────────────────────────────────
export default function RichEditor({ initialContent, contentFormat, blogId, onChange }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "editor-image", "data-size": "lg" },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your story…" }),
    ],
    editorProps: {
      attributes: { class: "editor-area" },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Load initial content
  useEffect(() => {
    if (!editor || !initialContent) return;
    const load = async () => {
      let html = initialContent;
      if (contentFormat === "markdown") {
        html = await marked.parse(initialContent);
      }
      editor.commands.setContent(html, { emitUpdate: false });
    };
    load();
  }, [editor, initialContent, contentFormat]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("blog_id", blogId ?? "general");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (e) {
      alert("Image upload failed. Is the backend running?");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setVideoUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("blog_id", blogId ?? "general");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      editor?.chain().focus().insertContent(
        `<div class="video-embed"><video src="${url}" controls style="width:100%;border-radius:12px;"></video></div>`
      ).run();
    } catch {
      alert("Video upload failed. Is the backend running?");
    } finally {
      setVideoUploading(false);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (!url) return;
    const text = editor?.state.selection.empty ? prompt("Link text:", url) ?? url : null;
    if (editor?.state.selection.empty && text) {
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`).run();
    } else {
      editor?.chain().focus().setLink({ href: url, target: "_blank" }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="rich-editor-root">
      <style>{`
        /* Toolbar & structural styles only — content element styles live in globals.css */
        .editor-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 16px 16px 0 0;
          position: sticky;
          top: 56px;
          z-index: 20;
        }
        .toolbar-btn {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          line-height: 1;
        }
        .toolbar-btn:hover { background: #e2e8f0; color: #0f172a; }
        .toolbar-btn-active { background: #0d9488 !important; color: white !important; border-color: #0d9488 !important; }
        .toolbar-btn-active:hover { background: #0f766e !important; }
        .toolbar-btn-disabled { opacity: 0.35; cursor: not-allowed; }
        .toolbar-divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; flex-shrink: 0; }
        .toolbar-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          padding: 0 6px;
          white-space: nowrap;
        }
        .rich-editor-root {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          background: #FEFCF9;
        }
        .editor-upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
          color: #0d9488;
          font-weight: 600;
          z-index: 30;
        }
      `}</style>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); e.target.value = ""; }}
      />

      {/* Toolbar */}
      <div className="editor-toolbar">
        {/* Headings */}
        <span className="toolbar-label">Text</span>
        <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Normal paragraph text">¶ Body</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Blog title (shows as large hero heading)">H1 Title</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Day section header (Day 1, Day 2 etc.) — teal, prominent">H2 Day</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Subsection heading — italic serif">H3 Sub</Btn>

        <Divider />

        {/* Inline */}
        <span className="toolbar-label">Style</span>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold text"><b>B</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic text"><i>I</i></Btn>

        <Divider />

        {/* Special blocks */}
        <span className="toolbar-label">Blocks</span>
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title='Dialogue/quote box — amber background with 💬 icon (use for conversations)'
        >
          💬 Dialogue
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list — good for tips, itinerary items">• List</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1. List</Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Section divider line">— Divider</Btn>

        <Divider />

        {/* Media */}
        <span className="toolbar-label">Media</span>
        <Btn
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload an image"
        >
          {uploading ? "⏳ Uploading…" : "📷 Image"}
        </Btn>
        <Btn
          onClick={() => videoInputRef.current?.click()}
          disabled={videoUploading}
          title="Upload a video file"
        >
          {videoUploading ? "⏳ Uploading…" : "🎬 Video"}
        </Btn>
        <Btn
          onClick={insertLink}
          active={editor.isActive("link")}
          title="Insert or edit hyperlink (select text first, or type a new link)"
        >
          🔗 Link
        </Btn>

        {/* Image resize — only shown when image is selected */}
        {editor.isActive("image") && (
          <>
            <Divider />
            <span className="toolbar-label">Img size</span>
            {(["sm", "md", "lg", "full"] as const).map((s) => (
              <Btn
                key={s}
                onClick={() => editor.chain().focus().updateAttributes("image", { "data-size": s }).run()}
                active={editor.getAttributes("image")["data-size"] === s}
                title={`Image width: ${s === "sm" ? "30%" : s === "md" ? "55%" : s === "lg" ? "80%" : "100%"}`}
              >
                {s === "sm" ? "S" : s === "md" ? "M" : s === "lg" ? "L" : "■ Full"}
              </Btn>
            ))}
          </>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        {uploading && <div className="editor-upload-overlay">Uploading image…</div>}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
