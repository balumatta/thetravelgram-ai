"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * Itinerary as stacked stop cards with an arrow between each pair.
 * A car drives down the centre line: it shows in the gaps, passes behind each card,
 * and the card lights up while the car is "at" that stop. Loops after the finish.
 * Inside a scrolling box (the desktop rail), the box follows the car, so long trips still fit.
 */

const SPEED = 70; // px per second
const STOP_PAUSE = 0.9; // seconds at each stop
const END_PAUSE = 1.8; // seconds at the finish before looping

export default function RouteRail({ stops }: { stops: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const car = useRef<HTMLDivElement>(null);
  const [centres, setCentres] = useState<number[]>([]);
  const [at, setAt] = useState(-1); // stop the car is at (lit card)
  const [passed, setPassed] = useState(-1); // last stop the car has left

  // Measure the vertical centre of each card.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".rr-card"));
      setCentres(cards.map((c) => c.offsetTop + c.offsetHeight / 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stops.join("|")]);

  useEffect(() => {
    const el = car.current;
    if (!el || centres.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAt(-1);
      setPassed(centres.length - 1);
      el.style.opacity = "0";
      return;
    }

    // Timeline: pause at stop 0, drive to 1, pause, … pause at the end, restart.
    type Leg = { from: number; to: number; drive: number; pause: number };
    const legs: Leg[] = centres.slice(1).map((y, i) => ({
      from: i,
      to: i + 1,
      drive: (y - centres[i]) / SPEED,
      pause: i + 1 === centres.length - 1 ? END_PAUSE : STOP_PAUSE,
    }));
    const total = STOP_PAUSE + legs.reduce((s, l) => s + l.drive + l.pause, 0);
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

    // Follow the car inside a scrolling parent, unless the reader just scrolled it themselves.
    const box = el.closest<HTMLElement>("[data-follow-car]");
    let userUntil = 0;
    const onUser = () => (userUntil = performance.now() + 4000);
    box?.addEventListener("wheel", onUser, { passive: true });
    box?.addEventListener("touchstart", onUser, { passive: true });
    const listTop = () => (box && wrap.current ? wrap.current.offsetTop : 0);

    let raf = 0;
    const start = performance.now();
    let lastAt = -2;
    let lastPassed = -2;
    const tick = (now: number) => {
      let t = ((now - start) / 1000) % total;
      let y = centres[0];
      let atIdx = 0;
      let passedIdx = -1;
      if (t >= STOP_PAUSE) {
        t -= STOP_PAUSE;
        atIdx = -1;
        for (const l of legs) {
          if (t < l.drive) {
            y = centres[l.from] + (centres[l.to] - centres[l.from]) * ease(t / l.drive);
            passedIdx = l.from;
            break;
          }
          t -= l.drive;
          y = centres[l.to];
          passedIdx = l.from;
          if (t < l.pause) {
            atIdx = l.to;
            break;
          }
          t -= l.pause;
        }
      }
      el.style.transform = `translate(-50%, ${y}px) translateY(-50%)`;
      el.style.opacity = "1";
      if (box && box.scrollHeight > box.clientHeight && now > userUntil) {
        box.scrollTop = Math.max(0, listTop() + y - box.clientHeight / 2);
      }
      if (atIdx !== lastAt) setAt((lastAt = atIdx));
      if (passedIdx !== lastPassed) setPassed((lastPassed = passedIdx));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      box?.removeEventListener("wheel", onUser);
      box?.removeEventListener("touchstart", onUser);
    };
  }, [centres]);

  return (
    <div className="rr" ref={wrap}>
      <div className="rr-car" ref={car} aria-hidden="true">
        <Car />
      </div>
      <ol className="rr-list">
        {stops.map((place, i) => {
          const first = i === 0;
          const state = i === at ? "is-here" : i <= passed ? "is-done" : "";
          return (
            <li key={`${i}-${place}`} className="rr-item">
              {!first && (
                <span className={`rr-link ${passed >= i - 1 ? "is-done" : ""}`} aria-hidden="true">
                  <svg viewBox="0 0 12 8" className="rr-arrow"><path d="M1 1.5 6 6.5 11 1.5" /></svg>
                </span>
              )}
              <div className={`rr-card ${state}`}>
                <span className="rr-place">{place}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Top-down hatchback, nose pointing down (the direction of travel). */
function Car() {
  // Unique per car: the page can hold two itineraries (rail + phone card), and a shared
  // gradient id would resolve to the hidden one and leave this car unpainted.
  const grad = `rr-body-${useId().replace(/:/g, "")}`;
  return (
    <svg width="18" height="30" viewBox="0 0 26 44">
      <defs>
        <linearGradient id={grad} x1="0" x2="1">
          <stop offset="0" stopColor="#9E3D30" />
          <stop offset=".5" stopColor="#C4564A" />
          <stop offset="1" stopColor="#9E3D30" />
        </linearGradient>
      </defs>
      {/* tyres */}
      <rect x="0.5" y="7" width="4" height="8" rx="1.6" fill="#2A2422" />
      <rect x="21.5" y="7" width="4" height="8" rx="1.6" fill="#2A2422" />
      <rect x="0.5" y="29" width="4" height="8" rx="1.6" fill="#2A2422" />
      <rect x="21.5" y="29" width="4" height="8" rx="1.6" fill="#2A2422" />
      {/* body */}
      <path d="M13 1.5c5.2 0 9 1.6 9.6 5.5l.9 7v17.5l-.6 6.3c-.6 3.6-4.6 4.7-9.9 4.7s-9.3-1.1-9.9-4.7L2.5 31.5V14l.9-7C4 3.1 7.8 1.5 13 1.5Z" fill={`url(#${grad})`} />
      {/* rear window (top) */}
      <path d="M6.2 8.3c1.9-1 4.2-1.4 6.8-1.4s4.9.4 6.8 1.4l-.9 4.2H7.1Z" fill="#3B3533" opacity=".85" />
      {/* roof */}
      <rect x="6.6" y="13.4" width="12.8" height="13.4" rx="2.6" fill="#B04A3D" />
      <rect x="6.6" y="13.4" width="12.8" height="13.4" rx="2.6" fill="none" stroke="#000" strokeOpacity=".12" />
      {/* windscreen (bottom = front) */}
      <path d="M7 27.6h12l1.3 6.1c-2.2 1.2-4.6 1.7-7.3 1.7s-5.1-.5-7.3-1.7Z" fill="#3B3533" opacity=".9" />
      <path d="M8.6 28.6h3.4l-1.8 4.6c-.9-.2-1.7-.5-2.4-.8Z" fill="#fff" opacity=".18" />
      {/* mirrors */}
      <rect x="0.8" y="26.2" width="3" height="2.4" rx="1" fill="#9E3D30" />
      <rect x="22.2" y="26.2" width="3" height="2.4" rx="1" fill="#9E3D30" />
      {/* lights */}
      <rect x="5" y="39.6" width="4.6" height="2" rx="1" fill="#FFE7A3" />
      <rect x="16.4" y="39.6" width="4.6" height="2" rx="1" fill="#FFE7A3" />
      <rect x="5.4" y="2.6" width="4" height="1.6" rx=".8" fill="#FF6B5A" />
      <rect x="16.6" y="2.6" width="4" height="1.6" rx=".8" fill="#FF6B5A" />
    </svg>
  );
}
