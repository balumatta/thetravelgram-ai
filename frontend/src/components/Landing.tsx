"use client";

interface LandingProps {
  onStart: () => void;
  onContinue?: () => void;
  hasSession: boolean;
  loading: boolean;
}

export default function Landing({ onStart, onContinue, hasSession, loading }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex flex-col items-center justify-center px-6 py-16">

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-200">
          <span className="text-4xl">✈️</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-teal-800 tracking-tight">
          TheTravelGram
        </h1>
        <span className="text-xs font-semibold text-teal-500 tracking-widest uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
          AI Blog Writer
        </span>
      </div>

      {/* Hero */}
      <div className="max-w-md text-center mb-10">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-slate-700 mb-3 leading-snug">
          Your trips deserve better than a photo dump.
        </h2>
        <p className="text-slate-500 text-base leading-relaxed">
          Tell me about your trip day by day. I'll ask the right questions and write a blog post that actually sounds like you.
        </p>
      </div>

      {/* Trip tags */}
      <div className="flex flex-wrap gap-2 justify-center mb-10 max-w-xs">
        {["Leh Ladakh 🏔️", "Bhutan Biking 🏍️", "Turkey Road Trip 🚗", "Coorg Weekend 🌿"].map((tag) => (
          <span
            key={tag}
            className="px-3 py-1.5 bg-white/80 border border-slate-200 text-slate-500 text-xs rounded-full shadow-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {hasSession && onContinue && (
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-teal-400 text-teal-700 font-semibold px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-md hover:bg-teal-50 transition-all text-sm"
          >
            ↩ Continue my trip
          </button>
        )}
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full group flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-60 text-white font-semibold px-8 py-3.5 rounded-2xl shadow-lg shadow-teal-200 hover:shadow-xl transition-all text-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting…
            </>
          ) : (
            <>
              <span>📝</span>
              {hasSession ? "Start a new trip" : "Start my travel story"}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-8 text-xs text-slate-400 text-center max-w-xs">
        Takes 10–15 min. Reload anytime and pick up where you left off.
      </p>
    </div>
  );
}
