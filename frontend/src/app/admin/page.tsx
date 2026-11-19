"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { toComposerInput, type ComposerInput } from "@/components/composer/convert";
import Chat from "@/components/Chat";
import BlogPreview from "@/components/BlogPreview";
import type { BlogSection } from "@/components/BlogRenderer";

const Composer = dynamic(() => import("@/components/composer/Composer"), { ssr: false });

type View = "loading" | "landing" | "chat" | "blog" | "edit";

/** What the editor is open on: the draft, or a published blog (saved straight back to it). */
interface EditTarget {
  saveUrl?: string;
  blogId: string;
  title: string;
  subtitle: string;
  banner: string;
  input: ComposerInput;
}

interface SessionData {
  exists: boolean;
  state?: string;
  current_day?: number;
  total_days?: number;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
  blog_output?: string | null;
}

export default function AdminPage() {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [blogContent, setBlogContent] = useState<string>("");
  const [blogContentFormat, setBlogContentFormat] = useState<"markdown" | "html" | "structured" | "rich">("markdown");
  const [blogSections, setBlogSections] = useState<BlogSection[] | null>(null);
  const [blogSubtitle, setBlogSubtitle] = useState<string>("");
  const [blogTitle, setBlogTitle] = useState<string>("");
  const [blogBannerUrl, setBlogBannerUrl] = useState<string>("");
  const [blogTheme, setBlogTheme] = useState<"warm" | "editorial" | "golden" | "night">("warm");
  const [blogId, setBlogId] = useState<string>("");
  const [startingTrip, setStartingTrip] = useState(false);
  const [blogUpdatedAt, setBlogUpdatedAt] = useState<string>("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [notice, setNotice] = useState("");

  const loadSession = () => {
    return fetch("/api/voice-agent/session")
      .then((r) => r.json())
      .then((data: SessionData) => {
        setSession(data);
        return data;
      });
  };

  useEffect(() => {
    // Check both session and persistent blog.json in parallel
    Promise.all([
      fetch("/api/voice-agent/session").then((r) => r.json()).catch(() => ({ exists: false })),
      fetch("/api/voice-agent/blog").then((r) => r.json()).catch(() => ({ exists: false })),
    ]).then(([sessionData, blogData]: [SessionData, { exists: boolean; content?: string; content_format?: string; title?: string; subtitle?: string; banner_url?: string; theme?: string; id?: string; sections?: BlogSection[]; updated_at?: string }]) => {
      setSession(sessionData);

      // Store blog data if available
      if (blogData.exists && (blogData.content || blogData.sections)) {
        setBlogContent(blogData.content ?? "");
        setBlogSections(blogData.sections ?? null);
        setBlogSubtitle(blogData.subtitle ?? "");
        setBlogContentFormat((blogData.content_format as "markdown" | "html" | "structured" | "rich") ?? "markdown");
        setBlogTitle(blogData.title ?? "");
        setBlogBannerUrl(blogData.banner_url ?? "");
        setBlogTheme((blogData.theme as "warm" | "editorial" | "golden" | "night") ?? "warm");
        setBlogId(blogData.id ?? "general");
        setBlogUpdatedAt(blogData.updated_at ?? "");
      } else if (sessionData.exists && sessionData.state === "done" && sessionData.blog_output) {
        setBlogContent(sessionData.blog_output);
        setBlogContentFormat("markdown");
      }

      // Always start on Landing — user picks what to do next
      if (sessionData.exists && sessionData.state !== "done") {
        // Chat in progress: drop straight into chat (don't interrupt active session)
        setView("chat");
      } else {
        setView("landing");
      }
    }).catch(() => setView("landing"));
  }, []);

  const handleStartTrip = async () => {
    setStartingTrip(true);
    try {
      const res = await fetch("/api/voice-agent/session/new", { method: "POST" });
      const data: SessionData = await res.json();
      setSession(data);
      setView("chat");
    } finally {
      setStartingTrip(false);
    }
  };

  const handleContinue = () => {
    setView("chat");
  };

  const handleHome = () => {
    setView("landing");
  };

  const handleNewTrip = async () => {
    // Delete the existing blog and session before starting fresh
    await fetch("/api/voice-agent/blog", { method: "DELETE" }).catch(() => {});
    const res = await fetch("/api/voice-agent/session/new", { method: "POST" });
    const data: SessionData = await res.json();
    setSession(data);
    setBlogContent("");
    setBlogContentFormat("markdown");
    setBlogSections(null);
    setBlogSubtitle("");
    setBlogBannerUrl("");
    setBlogTheme("warm");
    setBlogId("");
    setView("chat");
  };

  const handleBlogReady = (blog: string) => {
    setBlogContent(blog);
    // Extract title from markdown h1
    const titleLine = blog.split("\n").find((l) => l.startsWith("# "));
    setBlogTitle(titleLine ? titleLine.slice(2).trim() : "");
    setView("blog"); // Immediately show after generation
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-[#FEFCF9] flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-100 text-3xl">
          ✈️
        </div>
        <div className="text-center">
          <p className="font-serif font-bold text-teal-800 text-base">TheTravelGram</p>
          <p className="text-slate-400 text-sm mt-1">Loading your story…</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal-300" style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  const editDraft = () => {
    setEditing({
      blogId: blogId || "general",
      title: blogTitle,
      subtitle: blogSubtitle,
      banner: blogBannerUrl,
      input: toComposerInput(blogContent, blogContentFormat, blogSections, blogTitle),
    });
    setView("edit");
  };

  const editPublished = async (slug: string) => {
    setNotice("");
    try {
      const res = await fetch(`/api/blogs/published/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error();
      const b = await res.json();
      setEditing({
        saveUrl: `/api/blogs/published/${encodeURIComponent(slug)}`,
        blogId: slug,
        title: b.title ?? "",
        subtitle: b.subtitle ?? "",
        banner: b.banner_url ?? "",
        input: toComposerInput(b.content ?? "", "rich", b.sections ?? [], b.title ?? ""),
      });
      setView("edit");
    } catch {
      setNotice("Couldn't open that blog. Check that the backend is running.");
    }
  };

  if (view === "edit" && editing) {
    return (
      <Composer
        blogId={editing.blogId}
        saveUrl={editing.saveUrl}
        initialTitle={editing.title}
        initialSubtitle={editing.subtitle}
        initialBanner={editing.banner}
        initialHtml={editing.input.html}
        initialSections={editing.input.endSections}
        onExit={() => {
          setEditing(null);
          setView("landing");
        }}
        onSaved={(d) => {
          // Keep the dashboard's copy of the draft in sync after a save.
          if (!editing.saveUrl) {
            setBlogContent(d.html);
            setBlogContentFormat("rich");
            setBlogSections(d.sections);
            setBlogTitle(d.title);
            setBlogSubtitle(d.subtitle);
            setBlogBannerUrl(d.bannerUrl);
            setBlogUpdatedAt(new Date().toISOString());
          }
        }}
      />
    );
  }

  if (view === "landing") {
    const interviewing = !!(session?.exists && session.state !== "done");
    return (
      <>
        <AdminDashboard
          draft={blogContent ? { title: blogTitle, subtitle: blogSubtitle, bannerUrl: blogBannerUrl, updatedAt: blogUpdatedAt } : null}
          interview={interviewing ? { day: session?.current_day ?? 1, totalDays: session?.total_days ?? 0 } : null}
          starting={startingTrip}
          onNewTrip={() => {
            // There is one draft slot: a new trip replaces the current draft.
            if (blogContent && !window.confirm(`Start a new trip? This replaces your current draft "${blogTitle || "Untitled draft"}". Published blogs are not affected.`)) return;
            if (blogContent) handleNewTrip();
            else handleStartTrip();
          }}
          onContinueInterview={handleContinue}
          onViewDraft={() => setView("blog")}
          onEditDraft={editDraft}
          onEditPublished={editPublished}
        />
        {notice && (
          <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", background: "#1F1B1A", color: "#EFEAE5", padding: "10px 16px", borderRadius: 999, fontSize: 13, maxWidth: "calc(100vw - 32px)" }}>
            {notice}
          </div>
        )}
      </>
    );
  }

  if (view === "blog") {
    return (
      <BlogPreview
        content={blogContent}
        contentFormat={blogContentFormat}
        sections={blogSections}
        blogSubtitle={blogSubtitle}
        title={blogTitle}
        bannerUrl={blogBannerUrl}
        theme={blogTheme}
        blogId={blogId}
        onNewTrip={handleNewTrip}
        onHome={handleHome}
      />
    );
  }

  return (
    <Chat
      initialMessages={session?.conversation ?? []}
      sessionState={session?.state ?? "overview"}
      currentDay={session?.current_day ?? 1}
      totalDays={session?.total_days ?? 0}
      onBlogReady={handleBlogReady}
      onNewTrip={handleNewTrip}
      onHome={handleHome}
    />
  );
}
