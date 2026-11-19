import Link from "next/link";
import { BRAND } from "@/lib/brand";
import SocialIcon from "./SocialIcon";
import ThemeSwitcher from "./ThemeSwitcher";
import "./themes.css";
import "./site.css";

/** Header, footer and theme switcher shared by the public pages (home, gallery, blogs). */
export default function SiteShell({ children, active }: { children: React.ReactNode; active?: "stories" | "gallery" }) {
  return (
    <div className="site">
      <header className="sh">
        <div className="sh-in">
          <Link href="/" className="sh-brand">{BRAND.name}</Link>
          <nav className="sh-nav" aria-label="Main">
            <Link href="/#stories" className={active === "stories" ? "is-on" : ""}>Stories</Link>
            <Link href="/gallery" className={active === "gallery" ? "is-on" : ""}>Gallery</Link>
            <Link href="/#about">About</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="sf">
        <div className="sf-in">
          <div className="sf-brand">
            <span className="sh-brand">{BRAND.name}</span>
            <span>{BRAND.tagline}</span>
          </div>
          <div className="sf-social">
            {BRAND.socials.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
                <SocialIcon id={s.id} />
              </a>
            ))}
            <a href={`mailto:${BRAND.email}`} aria-label="Email" title={BRAND.email}>
              <SocialIcon id="email" />
            </a>
          </div>
          <span className="sf-copy">© {BRAND.since}–{new Date().getFullYear()} {BRAND.name}</span>
        </div>
      </footer>
      <ThemeSwitcher />
    </div>
  );
}
