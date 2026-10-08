import React from "react";

// Navigation glyph inspired by the crown/sapphire palette, not a replacement
// for the canonical full Brand Core lockup. State belongs to SystemFrame2029.
export default function DiscoveryGateMark2029({ open = false }) {
  return (
    <svg className="sod29-discovery-gate" data-open={open} viewBox="0 0 40 40" width="32" height="32" fill="none" aria-hidden="true" focusable="false">
      <path className="sod29-gate-halo" d="M20 4 35 20 20 36 5 20Z" />
      <g className="sod29-gate-wing is-left">
        <path d="M18 10 13 17 6 12 9 28 18 28" />
        <path d="M10 32H18" />
        <circle cx="6" cy="10" r="1.3" />
      </g>
      <g className="sod29-gate-wing is-right">
        <path d="M22 10 27 17 34 12 31 28 22 28" />
        <path d="M22 32H30" />
        <circle cx="34" cy="10" r="1.3" />
      </g>
      <path className="sod29-gate-light" d="M20 6V34" />
      <path className="sod29-gate-jewel" d="m20 14 4 6-4 6-4-6Z" />
      <path className="sod29-gate-facet" d="m20 14 0 12m-4-6h8" />
    </svg>
  );
}
