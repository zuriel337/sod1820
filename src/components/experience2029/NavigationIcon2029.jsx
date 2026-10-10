import React, { useEffect, useRef } from "react";
import { iconPress2029 } from "./iconPress2029.js";
import "./navigationIcons2029.css";

const GLYPH_NAMES = { "⌂":"home", "◌":"world", "◇":"tools", "↟":"posts", "↝":"journey", "◎":"community", "123":"number", "▤":"books", "✦":"els" };
const SHAPES = {
  home: <><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" /></>,
  world: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></>,
  heichal: <><path d="M3 4h18v3H3ZM5 7v13m4-13v13m6-13v13m4-13v13M3 21h8m2 0h8"/></>,
  posts: <><path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h8"/></>,
  number: <text x="12" y="16" textAnchor="middle" stroke="none" fill="currentColor" fontSize="12" fontWeight="750" fontFamily="Arial, sans-serif">123</text>,
  books: <><path d="M12 5v16M3 4c4-1 6 0 9 1 3-1 5-2 9-1v16c-4-1-6 0-9 1-3-1-5-2-9-1Z"/></>,
  journey: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h7a4 4 0 0 1 0 8h-4a3 3 0 0 0 0 6h7"/></>,
  community: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3ZM17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3h-3"/></>,
  search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
  now: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
  tools: <>{[[3,3],[14,3],[3,14],[14,14]].map(([x,y])=><rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5"/>)}</>,
  personal: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></>,
  action: <path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>,
  back: <><path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 0 12"/></>,
  issue: <><circle cx="12" cy="12" r="9"/><path d="M12 6v7m0 4h.01"/></>,

  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
  save: <path d="M6 3h12v18l-6-4-6 4Z"/>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  add: <path d="M12 4v16M4 12h16"/>,
  video: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
  research: <><circle cx="12" cy="12" r="6.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="12" cy="12" r="2"/></>,
  graph: <><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 10.6 10.2 7.5M13.8 7.5l3.4 3.1M17.2 13.4l-3.4 3.1M10.2 16.5l-3.4-3.1"/></>,
  spatial: <><path d="m12 3 7 4v10l-7 4-7-4V7z"/><path d="m5 7 7 4 7-4M12 11v10"/></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/><circle cx="12" cy="12" r="3"/></>,
  layers: <><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></>,
  gallery: <><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="m5.5 17 4.5-4 3 2 2.5-2 3 4"/></>,
  dna: <><path d="M7 4c8 4 8 12 0 16M17 4c-8 4-8 12 0 16M8 7h8M7 12h10M8 17h8"/></>,
  cipher: <><circle cx="12" cy="12" r="8"/><path d="M8 9h8M8 15h8M9 6l6 12M15 6 9 18"/></>,
  signal: <><path d="M5 17a10 10 0 0 1 14 0M8 14a6 6 0 0 1 8 0M11 11a2 2 0 0 1 2 0"/><circle cx="12" cy="18" r="1.3"/></>,
  raziel: <><path d="M12 3 18 7v7c0 4-2.6 6.2-6 7-3.4-.8-6-3-6-7V7z"/><path d="M9 11.5c1.6-2 4.4-2 6 0-1.6 2-4.4 2-6 0Z"/><circle cx="12" cy="11.5" r="1"/></>,
  portal: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 4v3M20 12h-3M12 20v-3M4 12h3"/></>,
  spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><circle cx="18.5" cy="5.5" r="1.2"/></>,
  door: <><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><path d="M9 21V7h6v14M4 21h16"/><circle cx="13.2" cy="14" r=".7"/></>,
  cosmos: <><ellipse cx="12" cy="12" rx="8" ry="3.6" transform="rotate(-18 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="8" transform="rotate(28 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="6" r="1"/><path d="m5 5 .6 1.8L7.4 7.4l-1.8.6L5 9.8 4.4 8 2.6 7.4l1.8-.6z"/></>,
};

export const NAVIGATION_ICON_NAMES = Object.freeze([...Object.keys(SHAPES), "els"]);
const ALIASES = { time: "now", source: "posts", globe: "world", book: "books", gematria: "number" };

/** Decorative SVG: the enclosing control owns its live accessible name. */
export default function NavigationIcon2029({ name, glyph, label, size = 24, className = "" }) {
  const iconRef = useRef(null);
  useEffect(() => {
    const icon = iconRef.current;
    // Bind to the existing hit area: touch feedback must not depend on hitting
    // a thin SVG stroke, or on a browser's delayed touch :active projection.
    const control = icon?.closest("button,a") || icon;
    if (!control) return undefined;
    const press = (event) => iconPress2029({ currentTarget: icon, isPrimary: event.isPrimary, pointerType: event.pointerType, button: event.button });
    const key = (event) => {
      if (!event.repeat && (event.key === "Enter" || (event.key === " " && control.matches("button")))) press(event);
    };
    control.addEventListener("pointerdown", press, { passive: true });
    control.addEventListener("keydown", key);
    return () => {
      control.removeEventListener("pointerdown", press);
      control.removeEventListener("keydown", key);
    };
  }, []);
  const resolved = name || (label === "היכל" ? "heichal" : GLYPH_NAMES[glyph]) || "tools";
  const canonical = ALIASES[resolved] || (NAVIGATION_ICON_NAMES.includes(resolved) ? resolved : "tools");
  return <svg ref={iconRef} className={`sod29-ui-icon sod29-ui-icon--${canonical} ${className}`} data-icon-shape={canonical} style={{ width: size, height: size }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {canonical === "els" ? Array.from({length:9},(_,i)=><rect key={i} className={i%4===0?`sod29-icon-diagonal is-${i/4}`:undefined} x={3+(i%3)*7} y={3+Math.floor(i/3)*7} width="4" height="4" rx=".8" fill={i%4===0?"currentColor":"none"}/>) : SHAPES[canonical]}
  </svg>;
}
