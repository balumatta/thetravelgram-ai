"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatProps {
  initialMessages: Message[];
  sessionState: string;
  currentDay: number;
  totalDays: number;
  onBlogReady: (blog: string) => void;
  onNewTrip: () => void;
  onHome: () => void;
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center h-5 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-teal-400"
          style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

function DayBadge({ currentDay, totalDays, state }: { currentDay: number; totalDays: number; state: string }) {
  if (state === "overview" || !totalDays) {
    return (
      <span className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-semibold rounded-full border border-sky-200">
        Overview
      </span>
    );
  }
  if (state === "wrapup") {
    return (
      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full border border-orange-200">
        Wrapping up
      </span>
    );
  }
  if (state === "generate" || state === "done") {
    return (
      <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full border border-purple-200 animate-pulse">
        ✍️ Writing blog…
      </span>
    );
  }
  return (
    <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
      Day {currentDay} / {totalDays}
    </span>
  );
}

function ProgressBar({ currentDay, totalDays, state }: { currentDay: number; totalDays: number; state: string }) {
  if (!totalDays) return null;
  const steps = totalDays + 2;
  const current =
    state === "overview" ? 0 :
    state === "wrapup" ? totalDays + 1 :
    state === "generate" || state === "done" ? steps :
    currentDay;
  const pct = Math.min((current / steps) * 100, 100);
  return (
    <div className="h-0.5 w-full bg-slate-100">
      <div
        className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const STARTERS = [
  "I just got back from 5 days in Rajasthan with two friends",
  "We did a 7-day road trip through Coorg and Ooty last week",
  "Just returned from a solo trip to Bhutan for 4 days",
  "Did a trekking trip to Kedarkantha with my college gang",
];

export default function Chat({
  initialMessages,
  sessionState,
  currentDay,
  totalDays,
  onBlogReady,
  onNewTrip,
  onHome,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState(sessionState);
  const [day, setDay] = useState(currentDay);
  const [days, setDays] = useState(totalDays);

  // Blog preview split-pane
  const [blogStream, setBlogStream] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [blogDone, setBlogDone] = useState(false);
  const [blogStatus, setBlogStatus] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const bottomRef = useRef<HTMLDivElement>(null);
  const blogBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showPreview) blogBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blogStream, showPreview]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    setInput("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    try {
      const res = await fetch("/api/voice-agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) throw new Error("Server error");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let blogContent = "";

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

          if (event.type === "token") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + event.content };
              }
              return updated;
            });
          } else if (event.type === "blog_status") {
            setBlogStatus(event.content);
          } else if (event.type === "blog_start") {
            setState("generate");
            setShowPreview(true);
            setMobileTab("preview");
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: "✍️ Writing your blog now — watch the preview on the right!",
                isStreaming: false,
              };
              return updated;
            });
          } else if (event.type === "blog_token") {
            blogContent += event.content;
            setBlogStream((prev) => prev + event.content);
          } else if (event.type === "blog_done") {
            setBlogDone(true);
            onBlogReady(blogContent);
            return;
          } else if (event.type === "message_done") {
            setState(event.state);
            setDay(parseInt(event.current_day));
            setDays(parseInt(event.total_days));
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
              return updated;
            });
          } else if (event.type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: `⚠️ ${event.content}`,
                isStreaming: false,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "⚠️ Something went wrong. The server might be offline — try again.",
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      // Ensure no message is left stuck in streaming state
      setIsLoading(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, isStreaming: false, content: last.content || "⚠️ Something went wrong. The server might be offline — try again." },
          ];
        }
        return prev;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  // ── Chat pane ──────────────────────────────────────────────────────────────
  const chatPane = (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-5 sm:py-6 px-4">
        <div className="max-w-xl mx-auto space-y-4">

          {/* Empty state with prompt starters */}
          {isEmpty && (
            <div className="flex flex-col items-center text-center gap-5 pt-8 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg text-3xl">
                ✈️
              </div>
              <div>
                <p className="font-serif font-bold text-teal-800 text-xl mb-1">Hey, traveller!</p>
                <p className="text-slate-500 text-sm max-w-xs">
                  Tell me about your trip — where you went, for how many days, and who came along. I&apos;ll ask the rest.
                </p>
              </div>
              <div className="w-full grid gap-2 mt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-sm text-slate-600 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 rounded-xl px-4 py-2.5 transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 animate-slide-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-sm shrink-0 mb-0.5 shadow-md shadow-teal-100">
                  ✈
                </div>
              )}
              <div
                className={`max-w-[78%] md:max-w-[68%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-sm shadow-teal-200"
                    : "bg-white text-slate-700 rounded-bl-sm border border-slate-100 shadow-slate-100"
                } ${msg.isStreaming && msg.content ? "typing-cursor" : ""}`}
              >
                {msg.isStreaming && !msg.content ? <TypingDots /> : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center text-sm shrink-0 mb-0.5 shadow-md shadow-orange-100">
                  👤
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-3 sm:px-4 pt-2.5 sm:pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto">
          <div className="flex items-end gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? "Waiting…" : isEmpty ? "Tell me about your trip…" : "Type your answer…"}
              rows={1}
              className="flex-1 resize-none bg-transparent text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ minHeight: "28px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-md shadow-teal-200"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="hidden sm:block text-center text-xs text-slate-400 mt-1.5">Shift + Enter for new line</p>
        </div>
      </div>
    </div>
  );

  // ── Blog preview pane ──────────────────────────────────────────────────────
  const previewPane = (
    <div className="flex flex-col h-full min-h-0 bg-white border-l border-slate-100">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-700 shrink-0">Blog Preview</span>
          {!blogDone && blogStatus && (
            <span className="flex items-center gap-1.5 text-xs text-purple-500 font-medium truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
              {blogStatus}
            </span>
          )}
          {blogDone && (
            <span className="text-xs text-teal-600 font-medium shrink-0">Done ✓</span>
          )}
        </div>
        {blogDone && (
          <button
            onClick={() => onBlogReady(blogStream)}
            className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Full preview →
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
        <div className="blog-content prose prose-sm max-w-none text-slate-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blogStream}</ReactMarkdown>
          {!blogDone && <span className="typing-cursor" />}
        </div>
        <div ref={blogBottomRef} />
      </div>
    </div>
  );

  return (
    // Fixed to the visible screen (dvh accounts for the phone's address bar): header on top,
    // messages scroll in the middle, the message box stays pinned at the bottom.
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex flex-col">

      {/* Header */}
      <header className="shrink-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={onHome} className="flex items-center gap-2.5 group min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md group-hover:shadow-teal-200 transition-shadow">
              <span className="text-lg">✈️</span>
            </div>
            <div className="text-left">
              <p className="font-serif font-bold text-teal-800 text-sm leading-none group-hover:text-teal-600 transition-colors">
                TheTravelGram
              </p>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">AI Blog Writer</p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile tab toggles — only show when preview is available */}
            {showPreview && (
              <div className="flex md:hidden bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                <button
                  onClick={() => setMobileTab("chat")}
                  className={`px-3 py-1 rounded-md transition-all ${mobileTab === "chat" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setMobileTab("preview")}
                  className={`px-3 py-1 rounded-md transition-all ${mobileTab === "preview" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
                >
                  Preview
                </button>
              </div>
            )}
            <DayBadge currentDay={day} totalDays={days} state={state} />
            <button
              onClick={onNewTrip}
              className="text-xs text-slate-400 hover:text-teal-600 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-teal-50"
            >
              New trip
            </button>
          </div>
        </div>
        <ProgressBar currentDay={day} totalDays={days} state={state} />
      </header>

      {/* Body: split on desktop, tabbed on mobile */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Desktop: always show chat; show preview alongside when active */}
        {showPreview ? (
          <>
            {/* Chat — left */}
            <div className="hidden md:flex flex-col w-[45%] border-r border-slate-100 overflow-hidden">
              {chatPane}
            </div>
            {/* Preview — right */}
            <div className="hidden md:flex flex-col flex-1 overflow-hidden">
              {previewPane}
            </div>
            {/* Mobile: show active tab */}
            <div className="flex md:hidden flex-col flex-1 overflow-hidden">
              {mobileTab === "chat" ? chatPane : previewPane}
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {chatPane}
          </div>
        )}

      </div>
    </div>
  );
}
