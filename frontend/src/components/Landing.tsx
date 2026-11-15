"use client";

import { useEffect, useState } from "react";

interface LandingProps {
  onStart: () => void;
  onContinue?: () => void;
  onViewBlog?: () => void;
  hasSession: boolean;
  hasBlog?: boolean;
  blogTitle?: string;
  loading: boolean;
}

const SAMPLE_QUOTE =
  '"Cancel my flight tickets bro," Vinay said when we were on the way to Truffles, Residency Road. And just like that — a solo bike trip through Bhutan was born.';

const STEPS = [
  {
    icon: "💬",
    title: "Chat with the AI",
    desc: "Tell your trip day by day. The AI asks the right questions — dialogues, mishaps, food, the stranger you met.",
  },
  {
    icon: "🧠",
    title: "It learns your voice",
    desc: "Trained on all your real blog posts — same puns, same inner-me, same self-deprecating humour.",
  },
  {
    icon: "📖",
    title: "Your blog, instantly",
    desc: "Full post with Itinerary, Must Visit, Tips and Special Thanks. Ready to copy or download.",
  },
];

const DESTINATIONS = [
  "Leh Ladakh 🏔️",
  "Bhutan Biking 🏍️",
  "Seychelles 🏝️",
  "Iceland ❄️",
  "Kedarkantha ⛺",
  "Turkey 🌙",
];

export default function Landing({ onStart, onContinue, onViewBlog, hasSession, hasBlog, blogTitle, loading }: LandingProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFCF9] flex flex-col overflow-x-hidden">

      {/* ── Nav bar ──────────────────────────────────────────────────── */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-screen-lg mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md text-base">
            ✈️
          </div>
          <span className="font-serif font-bold text-teal-800 text-base">TheTravelGram</span>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-teal-500 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
          AI Blog Writer
        </span>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-16 text-center relative overflow-hidden">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-amber-100/60 blur-3xl" />

        {/* Floating destination pills */}
        <div
          className="flex flex-wrap gap-2 justify-center mb-8 max-w-sm"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {DESTINATIONS.map((d) => (
            <span
              key={d}
              className="px-3 py-1 text-xs text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Headline */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.55s ease 0.08s, transform 0.55s ease 0.08s",
          }}
        >
          <h1 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl text-slate-800 leading-[1.15] mb-4 max-w-2xl">
            Your trips deserve<br />
            <span className="text-teal-600">to be stories.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-md mx-auto mb-8">
            Chat with an AI that knows your writing style. Answer its questions, get a full blog post — in your voice, with your puns, your inner-me and all.
          </p>
        </div>

        {/* Blog ready card */}
        {hasBlog && onViewBlog && (
          <div
            className="w-full max-w-sm mb-4 bg-white border border-teal-100 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between gap-4"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.1s" }}
          >
            <div className="text-left min-w-0">
              <p className="text-xs text-teal-600 font-semibold uppercase tracking-widest mb-0.5">Blog ready</p>
              <p className="text-slate-700 font-semibold text-sm truncate">{blogTitle || "Your travel blog"}</p>
            </div>
            <button
              onClick={onViewBlog}
              className="shrink-0 text-xs text-white bg-teal-600 hover:bg-teal-700 font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-teal-200"
            >
              Open →
            </button>
          </div>
        )}

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-sm"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.55s ease 0.16s, transform 0.55s ease 0.16s",
          }}
        >
          {hasBlog && onViewBlog && (
            <button
              onClick={onViewBlog}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-white border-2 border-teal-300 text-teal-700 font-semibold px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-md hover:bg-teal-50 transition-all text-sm"
            >
              📖 View blog
            </button>
          )}
          {!hasBlog && hasSession && onContinue && (
            <button
              onClick={onContinue}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-white border-2 border-teal-300 text-teal-700 font-semibold px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-md hover:bg-teal-50 transition-all text-sm"
            >
              ↩ Continue trip
            </button>
          )}
          <button
            onClick={onStart}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-60 text-white font-semibold px-8 py-3.5 rounded-2xl shadow-lg shadow-teal-200 hover:shadow-xl transition-all text-sm ${hasSession ? "sm:flex-1" : "max-w-xs"}`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting…
              </>
            ) : (
              <>✍️ {hasSession ? "New trip" : "Start my travel story"} →</>
            )}
          </button>
        </div>

        <p
          className="mt-5 text-xs text-slate-400"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.25s" }}
        >
          10–15 min · Reload anytime to continue
        </p>
      </section>

      {/* ── Sample blog quote ─────────────────────────────────────────── */}
      <section className="px-6 pb-12">
        <div className="max-w-screen-lg mx-auto">
          <div className="bg-white border border-slate-100 rounded-3xl px-8 py-7 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 left-6 text-6xl text-teal-100 font-serif leading-none select-none">"</div>
            <p className="font-serif text-slate-600 text-base md:text-lg leading-relaxed italic relative z-10 pl-4">
              {SAMPLE_QUOTE}
            </p>
            <p className="text-xs text-slate-400 mt-3 pl-4">— from Bhutan Biking, written by TheTravelGram AI</p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-screen-lg mx-auto">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-slate-400 mb-8">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="bg-white border border-slate-100 rounded-2xl px-6 py-6 shadow-sm flex flex-col gap-3 relative"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-xl shrink-0">
                  {step.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm mb-1">{step.title}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
                <span className="absolute top-5 right-5 text-2xl font-bold text-slate-100 font-serif select-none">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="text-center pb-8 px-6">
        <p className="text-xs text-slate-300">TheTravelGram · AI Blog Writer · Powered by Claude</p>
      </footer>
    </div>
  );
}
