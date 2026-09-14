"use client";

import { useEffect, useState } from "react";
import Landing from "@/components/Landing";
import Chat from "@/components/Chat";
import BlogPreview from "@/components/BlogPreview";

type View = "loading" | "landing" | "chat" | "blog";

interface SessionData {
  exists: boolean;
  state?: string;
  current_day?: number;
  total_days?: number;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
  blog_output?: string | null;
}

export default function Home() {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [blogContent, setBlogContent] = useState<string>("");
  const [startingTrip, setStartingTrip] = useState(false);

  const loadSession = () => {
    return fetch("/api/voice-agent/session")
      .then((r) => r.json())
      .then((data: SessionData) => {
        setSession(data);
        return data;
      });
  };

  // On mount: check for existing session
  useEffect(() => {
    loadSession()
      .then((data) => {
        if (data.exists) {
          if (data.state === "done" && data.blog_output) {
            setBlogContent(data.blog_output);
            setView("blog");
          } else {
            setView("chat");
          }
        } else {
          setView("landing");
        }
      })
      .catch(() => setView("landing"));
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
    const res = await fetch("/api/voice-agent/session/new", { method: "POST" });
    const data: SessionData = await res.json();
    setSession(data);
    setBlogContent("");
    setView("chat");
  };

  const handleBlogReady = (blog: string) => {
    setBlogContent(blog);
    setView("blog");
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl">✈️</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-teal-400"
                style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <Landing
        onStart={handleStartTrip}
        onContinue={session?.exists && session.state !== "done" ? handleContinue : undefined}
        hasSession={!!(session?.exists && session.state !== "done")}
        loading={startingTrip}
      />
    );
  }

  if (view === "blog") {
    return (
      <BlogPreview
        content={blogContent}
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
