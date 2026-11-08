// The bell glyph of the inert series bell on Home (no emoji: the same outline in every theme).
import React from "react";

export default function BellGlyph({ size = 20, filled = false }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /><path d="M12 3.2V5" />
  </svg>;
}
