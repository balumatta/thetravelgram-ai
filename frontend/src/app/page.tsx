"use client";

import { useEffect, useState } from "react";

const TRIPS = [
  {
    slug: "bhutan-2024",
    title: "Bhutan: Land of the Thunder Dragon",
    cover: "🏔️",
    dates: "Oct 2024 · 7 days",
    summary:
      "Monasteries clinging to cliffsides, archery in the valley breeze, and a happiness index you can actually feel.",
    tags: ["Bhutan", "Himalayas", "Culture"],
  },
  {
    slug: "leh-ladakh-2023",
    title: "Leh Ladakh: Roof of the World",
    cover: "🏍️",
    dates: "Jul 2023 · 10 days",
    summary:
      "Khardung La passes, turquoise Pangong Tso, and that breathtaking moment when the altitude hits and time slows down.",
    tags: ["Ladakh", "Road Trip", "Mountains"],
  },
  {
    slug: "seychelles-2023",
    title: "Seychelles: Where Granite Meets Ocean",
    cover: "🏝️",
    dates: "Feb 2023 · 6 days",
    summary:
      "Boulders on beaches, lemurs in the trees, and water so clear you lose track of where the sky ends.",
    tags: ["Seychelles", "Islands", "Beach"],
  },
  {
    slug: "kedarkantha-2022",
    title: "Kedarkantha: Winter Trek",
    cover: "❄️",
    dates: "Dec 2022 · 5 days",
    summary:
      "Summit at sunrise, knee-deep in snow, and a 360° Himalayan panorama that ruins every other view.",
    tags: ["Trekking", "Uttarakhand", "Winter"],
  },
];

const NAV_LINKS = ["Stories", "Destinations", "About"];

export default function PublicLanding() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFCF9] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', Georgia, serif; }
        .font-sans { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.5s; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[#FEFCF9]/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-base shadow-sm shadow-teal-100">
              ✈️
            </div>
            <span className="font-serif font-bold text-teal-800 text-base tracking-tight">
              TheTravelGram
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="text-slate-500 hover:text-teal-700 text-sm font-medium transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-10 overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-16 w-56 h-56 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className={mounted ? "fade-up" : "opacity-0"}>
          <p className="text-teal-600 font-medium text-sm tracking-widest uppercase mb-4">
            Balu Matta · thetravelgram.in
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl leading-[1.1] text-slate-800 mb-6 max-w-xl">
            Every trip<br />
            <em className="text-teal-600 not-italic">deserves a story.</em>
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-lg mb-8">
            I travel to feel alive — mountains, coasts, cities that smell different.
            These are the trips that changed something.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Leh Ladakh", "Bhutan", "Seychelles", "Iceland", "Kedarkantha", "Turkey"].map((d) => (
              <span key={d} className="bg-teal-50 border border-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-medium">
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured quote */}
      <section className={`max-w-5xl mx-auto px-6 pb-14 ${mounted ? "fade-up delay-2" : "opacity-0"}`}>
        <div className="bg-gradient-to-br from-teal-700 to-teal-800 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-40 bg-teal-600/30 rounded-full blur-2xl" />
          <div className="text-5xl font-serif text-teal-400 leading-none mb-3">"</div>
          <p className="font-serif italic text-xl sm:text-2xl leading-relaxed text-teal-50 max-w-2xl mb-5">
            The road to Thimphu smelled of pine and incense. Our driver hadn't spoken for an hour —
            there was nothing that needed saying.
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-sm font-bold">B</div>
            <div>
              <p className="font-semibold text-sm text-teal-100">Balu Matta</p>
              <p className="text-teal-400 text-xs">Bhutan · Oct 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trip cards */}
      <section className={`max-w-5xl mx-auto px-6 pb-20 ${mounted ? "fade-up delay-3" : "opacity-0"}`}>
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-serif text-3xl text-slate-800">Recent Stories</h2>
          <a href="#" className="text-teal-600 text-sm font-medium hover:underline">View all →</a>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {TRIPS.map((trip, i) => (
            <article
              key={trip.slug}
              className="group bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-teal-50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            >
              {/* Cover */}
              <div className="bg-gradient-to-br from-teal-50 to-stone-50 h-28 flex items-center justify-center text-5xl">
                {trip.cover}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">{trip.dates}</span>
                  <span className="text-xs text-teal-600 font-medium group-hover:underline">Read →</span>
                </div>
                <h3 className="font-serif font-bold text-slate-800 text-lg leading-snug mb-2">{trip.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{trip.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {trip.tags.map((t) => (
                    <span key={t} className="bg-stone-100 text-stone-500 text-xs px-2.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* About strip */}
      <section className={`bg-stone-50 border-t border-stone-100 ${mounted ? "fade-up delay-4" : "opacity-0"}`}>
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-4xl shadow-lg shadow-teal-100 shrink-0">
            🧳
          </div>
          <div>
            <h3 className="font-serif text-2xl text-slate-800 mb-2">Hey, I'm Balu.</h3>
            <p className="text-slate-500 leading-relaxed max-w-lg">
              I'm a traveller and storyteller based in India. I've been to 20+ countries,
              each time chasing that feeling you can only get when you're somewhere completely new.
              This blog is my way of never letting those moments go.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-slate-400 text-xs">© 2024 Balu Matta · thetravelgram.in</span>
          <div className="flex gap-4">
            {["Instagram", "Twitter"].map((s) => (
              <a key={s} href="#" className="text-slate-400 hover:text-teal-600 text-xs font-medium transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
