import Link from "next/link";
import type { Photo, SiteHighlight } from "@/lib/publishedBlogs";
import { BRAND } from "@/lib/brand";
import Highlights from "./Highlights";
import SocialIcon from "./SocialIcon";

export interface StoryCard {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  banner_url?: string;
  published_at?: string;
  minutes_to_read?: number | null;
}

function cardDate(s: StoryCard) {
  const parts: string[] = [];
  if (s.published_at) {
    const d = new Date(s.published_at);
    if (!isNaN(d.getTime())) parts.push(d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }));
  }
  if (s.minutes_to_read) parts.push(`${s.minutes_to_read} min read`);
  return parts.join(" · ");
}

interface Props {
  stories: StoryCard[];
  highlights: SiteHighlight[];
  photos: Photo[];
  stats: { stories: number; photos: number; places: number };
}

export default function HomePage({ stories, highlights, photos, stats }: Props) {
  const [featured, ...rest] = stories;
  const covers = stories.filter((s) => s.banner_url).slice(0, 3);
  // A varied strip: alternate trips, prefer bigger photos, then loop it twice for a seamless marquee.
  const strip = photos.filter((p) => (p.width ?? 600) >= 480).slice(0, 18);

  return (
    <main>
      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-wrap hp-hero-grid">
          <div className="hp-hero-copy">
            <p className="hp-kicker">Welcome to {BRAND.name}</p>
            <h1 className="hp-h1">
              Memories that do not <em>fade away.</em>
            </h1>
            <p className="hp-lede">
              Travel stories by {BRAND.author.name}: developer by profession, traveller and writer by passion. I travel
              to find solace and write it down to cherish whenever I read it.
            </p>
            <div className="hp-ctas">
              {featured && <Link href={`/blog/${featured.slug}`} className="hp-btn is-primary">Read the latest story</Link>}
              <Link href="/gallery" className="hp-btn">Browse the gallery</Link>
            </div>
            <dl className="hp-stats">
              <div><dd>{stats.stories}</dd><dt>stories</dt></div>
              <div><dd>{stats.places}</dd><dt>places</dt></div>
              <div><dd>{stats.photos}</dd><dt>photos</dt></div>
            </dl>
          </div>
          <div className="hp-stack" aria-label="Latest stories">
            {covers.map((s, i) => (
              <Link key={s.slug} href={`/blog/${s.slug}`} className={`hp-post is-${i}`}>
                <img src={s.banner_url} alt="" />
                <span>{s.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Animated highlights ── */}
      {highlights.length > 0 && (
        <div className="hp-wrap">
          <Highlights items={highlights} />
        </div>
      )}

      {/* ── Stories ── */}
      <section className="hp-wrap hp-stories" id="stories">
        <div className="hp-sec-head">
          <h2 className="hp-h2">Stories</h2>
          <span className="hp-sec-note">{stories.length} {stories.length === 1 ? "trip" : "trips"}</span>
        </div>
        {featured ? (
          <>
            <Link href={`/blog/${featured.slug}`} className="hp-feature">
              <div className="hp-feature-img">{featured.banner_url && <img src={featured.banner_url} alt="" />}</div>
              <div className="hp-feature-body">
                <span className="hp-tag">Latest</span>
                <h3>{featured.title}</h3>
                {(featured.subtitle || featured.excerpt) && <p>{featured.subtitle || featured.excerpt}</p>}
                <span className="hp-meta">{cardDate(featured)}</span>
                <span className="hp-read">Read the story →</span>
              </div>
            </Link>
            <div className="hp-grid">
              {rest.map((s) => (
                <Link key={s.slug} href={`/blog/${s.slug}`} className="hp-card">
                  <div className="hp-card-img">{s.banner_url && <img src={s.banner_url} alt="" loading="lazy" />}</div>
                  <div className="hp-card-body">
                    <span className="hp-meta">{cardDate(s)}</span>
                    <h3>{s.title}</h3>
                    {(s.subtitle || s.excerpt) && <p>{s.subtitle || s.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="hp-empty">New stories are on their way.</p>
        )}
      </section>

      {/* ── Photo strip ── */}
      {strip.length > 3 && (
        <section className="hp-photos" aria-label="Photos from the road">
          <div className="hp-wrap hp-sec-head">
            <h2 className="hp-h2">Photos from the road</h2>
            <Link href="/gallery" className="hp-sec-link">Open the gallery →</Link>
          </div>
          <div className="hp-marquee">
            <div className="hp-marquee-track">
              {[...strip, ...strip].map((p, i) => (
                <Link key={i} href="/gallery" className="hp-shot" tabIndex={i < strip.length ? 0 : -1} aria-hidden={i >= strip.length}>
                  <img src={p.src} alt={i < strip.length ? p.caption : ""} loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About (from the original site) ── */}
      <section className="hp-wrap hp-about" id="about">
        <figure className="hp-about-photo">
          <img src={BRAND.author.photo} alt={BRAND.author.name} width={804} height={1252} loading="lazy" />
        </figure>
        <div className="hp-about-body">
          <p className="hp-kicker">About</p>
          <h2 className="hp-h2">{BRAND.author.name}</h2>
          <p className="hp-about-role">{BRAND.author.role}</p>
          <p className="hp-about-book">
            Author of the Amazon bestselling fictional romance <cite>{BRAND.author.book}</cite>
          </p>
          {BRAND.author.about.map((para) => <p key={para.slice(0, 20)}>{para}</p>)}
          <p className="hp-about-sign">{BRAND.author.signoff}</p>
          <div className="hp-about-links">
            <a href={`mailto:${BRAND.email}`} className="hp-btn is-primary">Get in touch</a>
            {BRAND.socials.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="hp-btn hp-social">
                <SocialIcon id={s.id} size={16} />
                {"handle" in s ? s.handle : s.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
