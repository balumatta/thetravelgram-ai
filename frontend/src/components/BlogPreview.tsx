"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogPreviewProps {
  content: string;
  onNewTrip: () => void;
  onHome: () => void;
}

export default function BlogPreview({ content, onNewTrip, onHome }: BlogPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "travel-blog.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Clickable logo → home */}
          <button onClick={onHome} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md group-hover:shadow-teal-200 transition-shadow">
              <span className="text-lg">✈️</span>
            </div>
            <div className="text-left">
              <p className="font-serif font-bold text-teal-800 text-sm leading-none group-hover:text-teal-600 transition-colors">
                TheTravelGram
              </p>
              <p className="text-xs text-orange-500 font-medium mt-0.5">✨ Blog ready!</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-xs text-slate-500 hover:text-teal-700 bg-white border border-slate-200 hover:border-teal-300 px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="text-xs text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 px-3 py-1.5 rounded-xl transition-all shadow-md shadow-teal-200"
            >
              Download .md
            </button>
            <button
              onClick={onNewTrip}
              className="text-xs text-slate-400 hover:text-teal-600 transition-colors px-2 py-1.5 rounded-xl hover:bg-teal-50"
            >
              New trip
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 md:px-8">
        {/* Celebration banner */}
        <div className="mb-8 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl px-6 py-5 text-white shadow-lg shadow-teal-200 animate-fade-in">
          <p className="font-serif text-xl font-bold mb-1">Your blog post is ready! 🎉</p>
          <p className="text-teal-100 text-sm">
            Copy it, download the .md file, or paste it straight into your Wix blog editor.
          </p>
        </div>

        {/* Blog card */}
        <article className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-8 md:px-10 animate-slide-up">
          <div className="blog-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </article>

        {/* Bottom actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-white border-2 border-teal-400 text-teal-700 font-semibold px-6 py-3 rounded-2xl hover:bg-teal-50 transition-all shadow-sm"
          >
            {copied ? "✓ Copied!" : "📋 Copy blog post"}
          </button>
          <button
            onClick={onNewTrip}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold px-6 py-3 rounded-2xl transition-all shadow-md shadow-orange-200"
          >
            ✈️ Write another trip
          </button>
        </div>
      </main>
    </div>
  );
}
