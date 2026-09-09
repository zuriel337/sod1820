import React from "react";

const PATHS = {
  research: <><circle cx="12" cy="12" r="6.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="12" cy="12" r="2"/></>,
  graph: <><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 10.6 10.2 7.5M13.8 7.5l3.4 3.1M17.2 13.4l-3.4 3.1M10.2 16.5l-3.4-3.1"/></>,
  journey: <><path d="M4 18c3-7 5-11 8-11 3 0 4.2 3.2 8 9"/><path d="m16.5 15.5 3.5.5-1.2 3.2"/><circle cx="5" cy="18" r="1.8"/><circle cx="12" cy="7" r="1.8"/></>,
  spatial: <><path d="m12 3 7 4v10l-7 4-7-4V7z"/><path d="m5 7 7 4 7-4M12 11v10"/></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/><circle cx="12" cy="12" r="3"/></>,
  time: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3.5 2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
  layers: <><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></>,
  source: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
  gallery: <><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="m5.5 17 4.5-4 3 2 2.5-2 3 4"/></>,
  dna: <><path d="M7 4c8 4 8 12 0 16M17 4c-8 4-8 12 0 16M8 7h8M7 12h10M8 17h8"/></>,
  cipher: <><circle cx="12" cy="12" r="8"/><path d="M8 9h8M8 15h8M9 6l6 12M15 6 9 18"/></>,
  globe: <><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></>,
  signal: <><path d="M5 17a10 10 0 0 1 14 0M8 14a6 6 0 0 1 8 0M11 11a2 2 0 0 1 2 0"/><circle cx="12" cy="18" r="1.3"/></>,
  raziel: <><path d="M12 3 18 7v7c0 4-2.6 6.2-6 7-3.4-.8-6-3-6-7V7z"/><path d="M9 11.5c1.6-2 4.4-2 6 0-1.6 2-4.4 2-6 0Z"/><circle cx="12" cy="11.5" r="1"/></>,
  portal: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 4v3M20 12h-3M12 20v-3M4 12h3"/></>,
  spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><circle cx="18.5" cy="5.5" r="1.2"/></>,
  door: <><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><path d="M9 21V7h6v14M4 21h16"/><circle cx="13.2" cy="14" r=".7"/></>,
  book: <><path d="M4 5.5c3.2-1 5.7-.5 8 1.5v12c-2.3-2-4.8-2.5-8-1.5z"/><path d="M20 5.5c-3.2-1-5.7-.5-8 1.5v12c2.3-2 4.8-2.5 8-1.5z"/><path d="M12 7v12"/></>,
  cosmos: <><ellipse cx="12" cy="12" rx="8" ry="3.6" transform="rotate(-18 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="8" transform="rotate(28 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="6" r="1"/><path d="m5 5 .6 1.8L7.4 7.4l-1.8.6L5 9.8 4.4 8 2.6 7.4l1.8-.6z"/></>,
  gematria: <><path d="M5 5h5v5H5zM14 14h5v5h-5z"/><path d="M14 5h5M16.5 3v4M5 16.5h5"/><path d="M8 14v5M11.5 8.5h1M12 12h.01"/></>,
  els: <><path d="M5 5h14M5 9h14M5 13h14M5 17h14"/><path d="M7 4v14M11 4v14M15 4v14M19 4v14" opacity=".55"/><path d="m6.5 17 4-4 4-4 4-4"/><circle cx="6.5" cy="17" r="1"/><circle cx="10.5" cy="13" r="1"/><circle cx="14.5" cy="9" r="1"/><circle cx="18.5" cy="5" r="1"/></>,
};

export const RESEARCH_ICON_NAMES = Object.freeze(Object.keys(PATHS));

export default function ResearchIcon({ name = "research", size = 24, tone = "research", title }) {
  const path = PATHS[name] || PATHS.research;
  return <span className={`rf-icon rf-icon--${tone}`} data-icon={name} aria-hidden={title ? undefined : true} title={title}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">{path}</svg>
  </span>;
}
