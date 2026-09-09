import React from "react";
import ResearchIcon from "./ResearchIcon";
import "./SeriesSignature.css";

const SIGNATURES = Object.freeze({
  els: { label: "דילוגי אותיות", icon: "els", tone: "research" },
  gematria: { label: "גימטריה", icon: "gematria", tone: "research" },
  journey: { label: "מסע", icon: "door", tone: "gold" },
  raziel: { label: "רזיאל", icon: "raziel", tone: "indigo" },
  strong_hints: { label: "רמזים חזקים", icon: "diamond", tone: "gold" },
  sod_hashmal: { label: "סוד החשמל", icon: "hashmal", tone: "gold" },
  source: { label: "מקור", icon: "book", tone: "research" },
  spatial: { label: "מרחב", icon: "spatial", tone: "research" },
});

export const SERIES_SIGNATURE_NAMES = Object.freeze(Object.keys(SIGNATURES));
export const seriesSignatureDefinition = (name) => SIGNATURES[name] || null;

function CustomGlyph({ name, size = 24 }) {
  if (name === "diamond") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M7 5h10l4 5-9 10L3 10z" />
        <path d="m7 5 5 15L17 5M3 10h18M7 5l-4 5M17 5l4 5" />
      </svg>
    );
  }
  if (name === "hashmal") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="7.5" />
        <path d="m13.2 4.8-4.1 7h3.2l-1.5 7.4 4.1-7h-3.2z" />
        <path d="M4.1 12h2M17.9 12h2M12 4.1v-2M12 21.9v-2" opacity=".75" />
      </svg>
    );
  }
  return <ResearchIcon name={name} size={size} />;
}

/**
 * One semantic series identity, projected at different visual richness levels.
 * variant=compact: chip/navigation.
 * variant=overlay: image/post hero corner signature.
 * variant=hero: larger authored series mark.
 *
 * Signatures classify context/series only. They never imply verification,
 * canonicality, importance, access, or truth rank.
 */
export default function SeriesSignature({
  name,
  variant = "compact",
  showLabel = true,
  className = "",
  title,
}) {
  const def = SIGNATURES[name];
  if (!def) return null;
  const size = variant === "hero" ? 34 : variant === "overlay" ? 26 : 20;

  return (
    <span
      className={`series-signature series-signature--${variant} series-signature--${def.tone} ${className}`.trim()}
      data-series-signature={name}
      title={title || def.label}
      aria-label={showLabel ? undefined : def.label}
    >
      <span className="series-signature__halo" aria-hidden="true" />
      <span className="series-signature__glyph" aria-hidden="true">
        <CustomGlyph name={def.icon} size={size} />
      </span>
      {showLabel && <span className="series-signature__label">{def.label}</span>}
    </span>
  );
}
