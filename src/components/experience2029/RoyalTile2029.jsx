import React from "react";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import "./royalTiles2029.css";

// ROYAL TILES 2029 — one shared tile for the 2029 System Frame and, after approval, the rest of the site.
// Three canonical variants on the existing token system (palette2029 + type tokens; brand gold only as a bounded mix):
//   square  — the default grid tile: icon medallion, short title, one-line hint (≥ 104px, square on wide layouts)
//   wide    — a full-row feature tile: medallion or artwork, title + hint, an optional action label at the end
//   compact — a 48px secondary tile: icon + title inline (lists of destinations, secondary actions)
// A tile is a real <button> (or an <a> when href is given) with an accessible name from its title; the hint is part of the
// same name via aria-describedby. Nothing here owns data or permissions: callers pass their existing openers.

export const ROYAL_TILE_VARIANTS = Object.freeze(["square", "wide", "compact"]);

export default function RoyalTile2029({ variant = "square", icon = "tools", art = null, title, hint = "", action = "", onClick, href,
  expanded, controls, disabled = false, testId, className = "" }) {
  const kind = ROYAL_TILE_VARIANTS.includes(variant) ? variant : "square";
  const hintId = hint && testId ? `sod29-royal-hint-${testId}` : undefined;
  const body = <>
    <span className="sod29-royal-tile-medal" aria-hidden="true">{art || <NavigationIcon2029 name={icon} />}</span>
    <span className="sod29-royal-tile-text">
      <strong>{title}</strong>
      {hint ? <small id={hintId}>{hint}</small> : null}
    </span>
    {action ? <span className="sod29-royal-tile-action" aria-hidden="true">{action}</span> : null}
  </>;
  const common = { className: `sod29-royal-tile is-${kind} ${className}`.trim(), "data-royal-variant": kind, "data-royal-tile": testId || undefined,
    "aria-describedby": hintId };
  if (href) return <a {...common} href={href}>{body}</a>;
  return <button {...common} type="button" onClick={onClick} disabled={disabled} aria-expanded={expanded} aria-controls={controls}>{body}</button>;
}

export function RoyalTileGrid2029({ children, label, columns = "auto" }) {
  // The wrapper is the size container, so the grid can choose its columns from the space it really has.
  return <div className="sod29-royal-grid-wrap"><div className="sod29-royal-grid" role="group" aria-label={label} data-royal-columns={columns}>{children}</div></div>;
}
