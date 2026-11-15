"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Itinerary as a flow diagram with a car driving the route.
 * - Wide screens: zig-zag flowchart nodes joined by curved, arrowed connectors.
 * - Phones: a metro line — vertical rail on the left, stop cards beside it.
 * The car eases into each stop (the stop lights up), then moves on and loops.
 */

const SPEED = 110; // px per second along the route
const STOP_PAUSE = 0.8; // seconds at each stop
const END_PAUSE = 1.6; // seconds at the finish before looping
const RAIL_BREAKPOINT = 560;
const RAIL_X = 22;
const STATION_GAP = 13; // rail mode: connectors stop short of the station dot

interface Box {
  x: number;
  top: number; // where the incoming connector ends
  bottom: number; // where the outgoing connector starts
  cy: number;
}
interface Geometry {
  width: number;
  height: number;
  rail: boolean;
  boxes: Box[];
  segments: string[];
  route: string;
}

export default function ItineraryFlow({ stops }: { stops: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef<Array<HTMLDivElement | null>>([]);
  const routeRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState(0);
  const rail = size.w > 0 && size.w < RAIL_BREAKPOINT;

  // Track container size (width decides the layout; height catches font/load shifts).
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure stop cards and build connector + route paths.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !size.w) return;
    const base = el.getBoundingClientRect();
    const boxes: Box[] = nodes.current.slice(0, stops.length).map((n) => {
      const r = n!.getBoundingClientRect();
      const top = r.top - base.top;
      const bottom = r.bottom - base.top;
      const cy = (top + bottom) / 2;
      return rail
        ? { x: RAIL_X, top: cy - STATION_GAP, bottom: cy + STATION_GAP, cy }
        : { x: r.left - base.left + r.width / 2, top, bottom, cy };
    });
    const segments: string[] = [];
    let route = boxes.length ? `M ${boxes[0].x} ${boxes[0].bottom}` : "";
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      const dy = (b.top - a.bottom) * 0.6;
      const curve = `C ${a.x} ${a.bottom + dy}, ${b.x} ${b.top - dy}, ${b.x} ${b.top}`;
      segments.push(`M ${a.x} ${a.bottom} ${curve}`);
      // Pass through each middle stop; park at the top of the last one.
      route += ` ${curve}` + (i + 1 < boxes.length - 1 ? ` L ${b.x} ${b.bottom}` : "");
    }
    setGeo({ width: base.width, height: base.height, rail, boxes, segments, route });
  }, [stops, size, rail]);

  // Drive the car.
  useEffect(() => {
    const path = routeRef.current;
    const car = carRef.current;
    if (!geo || !path || !car || stops.length < 2) return;

    const total = path.getTotalLength();
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const marks: Array<{ enter: number; leave: number }> = [{ enter: 0, leave: 0 }];
    for (let i = 0; i < geo.segments.length; i++) {
      probe.setAttribute("d", geo.segments[i]);
      const enter = marks[i].leave + probe.getTotalLength();
      const isLast = i + 1 === geo.segments.length;
      const b = geo.boxes[i + 1];
      marks.push(isLast ? { enter: total, leave: total } : { enter, leave: enter + (b.bottom - b.top) });
    }

    const place = (len: number) => {
      const p = path.getPointAtLength(len);
      const ahead = path.getPointAtLength(Math.min(total, len + 1));
      const behind = path.getPointAtLength(Math.max(0, len - 1));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      car.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place(0);
      setActive(0);
      setVisited(stops.length - 1);
      return;
    }

    type Leg = { from: number; to: number; dur: number; stop: number | null };
    const legs: Leg[] = [];
    for (let i = 1; i < marks.length; i++) {
      legs.push({ from: marks[i - 1].leave, to: marks[i].enter, dur: (marks[i].enter - marks[i - 1].leave) / SPEED, stop: null });
      legs.push({ from: marks[i].enter, to: marks[i].leave, dur: Math.max(STOP_PAUSE, (marks[i].leave - marks[i].enter) / SPEED), stop: i });
    }
    legs.push({ from: total, to: total, dur: END_PAUSE, stop: marks.length - 1 });
    const cycle = legs.reduce((s, l) => s + l.dur, 0);

    let raf = 0;
    let start: number | null = null;
    let lastActive = -2;
    let lastVisited = -1;
    const tick = (now: number) => {
      start ??= now;
      let t = ((now - start) / 1000) % cycle;
      let len = 0;
      let stop = -1;
      let reached = 0;
      for (let i = 0; i < legs.length; i++) {
        const l = legs[i];
        if (t <= l.dur) {
          const k = l.dur ? t / l.dur : 1;
          // Driving legs ease in/out so the car slows into stations.
          const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          len = l.from + (l.to - l.from) * eased;
          stop = l.stop ?? -1;
          reached = l.stop ?? Math.floor(i / 2);
          break;
        }
        t -= l.dur;
      }
      place(len);
      if (stop !== lastActive) setActive((lastActive = stop));
      if (reached !== lastVisited) setVisited((lastVisited = reached));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, stops.length]);

  if (!stops.length) return null;

  return (
    <div className={`itf ${rail ? "is-rail" : "is-flow"}`} ref={wrap}>
      {geo && (
        <svg className="itf-svg" width={geo.width} height={geo.height} viewBox={`0 0 ${geo.width} ${geo.height}`} aria-hidden="true">
          <defs>
            <marker id="itf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="itf-arrowhead" />
            </marker>
            <marker id="itf-arrow-done" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="itf-arrowhead is-done" />
            </marker>
          </defs>
          {geo.segments.map((d, i) => (
            <g key={i} className={i < visited ? "is-done" : ""}>
              <path d={d} className="itf-rail" />
              <path d={d} className="itf-flow" markerEnd={i < visited ? "url(#itf-arrow-done)" : "url(#itf-arrow)"} />
            </g>
          ))}
          {geo.rail &&
            geo.boxes.map((b, i) => (
              <circle
                key={i}
                cx={b.x}
                cy={b.cy}
                r={i === 0 || i === geo.boxes.length - 1 ? 8 : 6.5}
                className={`itf-station ${i <= visited ? "is-visited" : ""} ${active === i ? "is-active" : ""}`}
              />
            ))}
          <path ref={routeRef} d={geo.route} fill="none" stroke="none" />
          {stops.length > 1 && (
            <g ref={carRef} className="itf-car">
              {/* Top-down car pointing along +x */}
              <rect x="-15" y="-9" width="30" height="18" rx="6" className="itf-car-body" />
              <rect x="2" y="-6.5" width="7" height="13" rx="2" className="itf-car-glass" />
              <rect x="-11" y="-6.5" width="5" height="13" rx="1.5" className="itf-car-glass" />
              <rect x="-11" y="-11" width="7" height="3" rx="1.5" className="itf-car-wheel" />
              <rect x="5" y="-11" width="7" height="3" rx="1.5" className="itf-car-wheel" />
              <rect x="-11" y="8" width="7" height="3" rx="1.5" className="itf-car-wheel" />
              <rect x="5" y="8" width="7" height="3" rx="1.5" className="itf-car-wheel" />
              <circle cx="15" cy="-5" r="1.6" className="itf-car-light" />
              <circle cx="15" cy="5" r="1.6" className="itf-car-light" />
            </g>
          )}
        </svg>
      )}

      <ol className="itf-nodes">
        {stops.map((place, i) => {
          const first = i === 0;
          const last = i === stops.length - 1 && stops.length > 1;
          return (
            <li key={`${i}-${place}`} className={`itf-row ${i % 2 ? "is-right" : "is-left"}`}>
              <div
                ref={(n) => {
                  nodes.current[i] = n;
                }}
                className={`itf-node ${active === i ? "is-active" : ""} ${i <= visited ? "is-visited" : ""}`}
              >
                <span className="itf-port itf-port-in" />
                <span className="itf-step">{first ? "Start" : last ? "Finish" : `Stop ${String(i + 1).padStart(2, "0")}`}</span>
                <span className="itf-place">{place}</span>
                <span className="itf-port itf-port-out" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
