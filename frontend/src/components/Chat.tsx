"use client";

import { useEffect, useRef, useState } from "react";

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
  const steps = totalDays + 2; // overview + N days + wrapup
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    try {
      const res = await fetch("/api/voice-agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

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
          } else if (event.type === "blog_start") {
            setState("generate");
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: "✍️ Writing your blog post now. This will take a minute…",
                isStreaming: false,
              };
              return updated;
            });
          } else if (event.type === "blog_token") {
            blogContent += event.content;
          } else if (event.type === "blog_done") {
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
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Something went wrong. Try again.",
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Clickable logo → home */}
          <button
            onClick={onHome}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md group-hover:shadow-teal-200 transition-shadow">
              <span className="text-lg">✈️</span>
            </div>
            <div className="text-left">
              <p className="font-serif font-bold text-teal-800 text-sm leading-none group-hover:text-teal-600 transition-colors">
                TheTravelGram
              </p>
              <p className="text-xs text-slate-400 mt-0.5">AI Blog Writer</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 animate-slide-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Agent avatar */}
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

              {/* User avatar */}
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

      {/* Input area */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? "Waiting…" : "Type your answer… (Enter to send)"}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ minHeight: "28px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={sendMessage}
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
          <p className="text-center text-xs text-slate-400 mt-1.5">Shift + Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
