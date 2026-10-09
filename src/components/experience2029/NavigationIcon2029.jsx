import React from "react";
import "./navigationIcons2029.css";

const GLYPH_NAMES = { "⌂":"home", "◌":"world", "◇":"tools", "↟":"posts", "↝":"journey", "◎":"community", "123":"number", "▤":"books", "✦":"els" };
// Compatibility names route to this single approved menu family. No second SVG set.
export const RESEARCH_ICON_ALIASES = Object.freeze({
  research: "search", graph: "world", journey: "journey", spatial: "world",
  scan: "search", time: "now", layers: "tools", source: "posts", gallery: "posts",
  dna: "journey", cipher: "els", globe: "world", signal: "now", raziel: "personal",
  portal: "heichal", spark: "action", door: "heichal", book: "books", cosmos: "world",
  gematria: "number", els: "els",
});
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
};

/** Decorative SVG: the enclosing control owns its live accessible name. */
export default function NavigationIcon2029({ name, glyph, label, size }) {
  const requested = name || (label === "היכל" ? "heichal" : GLYPH_NAMES[glyph]) || "tools";
  const resolved = RESEARCH_ICON_ALIASES[requested] || requested;
  const shape = SHAPES[resolved] || SHAPES.tools;
  return <svg className={`sod29-ui-icon sod29-ui-icon--${resolved}`} width={size || 24} height={size || 24} style={size ? { width: size, height: size } : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {resolved === "els" ? Array.from({length:9},(_,i)=><rect key={i} className={i%4===0?`sod29-icon-diagonal is-${i/4}`:undefined} x={3+(i%3)*7} y={3+Math.floor(i/3)*7} width="4" height="4" rx=".8" fill={i%4===0?"currentColor":"none"}/>) : shape}
  </svg>;
}
