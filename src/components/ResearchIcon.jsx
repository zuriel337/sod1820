import React from "react";
import NavigationIcon2029, { RESEARCH_ICON_ALIASES } from "./experience2029/NavigationIcon2029.jsx";

// Backward-compatible import for existing surfaces. The menu family is the only
// glyph owner; old artwork, tone skins and page-specific motion are retired.
export const RESEARCH_ICON_NAMES = Object.freeze(Object.keys(RESEARCH_ICON_ALIASES));
export default function ResearchIcon({ name = "research", size = 24, title }) {
  return <span className="sod29-research-icon" data-icon={name} title={title}
    role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <NavigationIcon2029 name={name} size={size} />
  </span>;
}
