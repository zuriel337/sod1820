import React from "react";
import { getHebrewGlyph } from "../../lib/spatial/hebrewGlyphAssets.js";

// Same path-only assets as the M3 WebGL/Blender consumer. Bounded method stages only;
// this is deliberately not a per-character renderer for the full Torah corpus.
const assets = import.meta.glob("../../lib/spatial/hebrewGlyph/v1/*.svg", { eager: true, query: "?url", import: "default" });

export default function HebrewGlyph2029({ text, className = "" }) {
  const value = String(text ?? "");
  return <span className={`sod29-hebrew-glyph-word ${className}`} role="img" aria-label={value}>
    {[...value].map((letter, index) => {
      const glyph = getHebrewGlyph(letter);
      const url = glyph && assets[`../../lib/spatial/hebrewGlyph/v1/${glyph.vector_asset_ref.split("/").pop()}`];
      return url ? <span key={index} aria-hidden="true" className="sod29-hebrew-glyph" data-glyph-id={glyph.glyph_id}
        style={{ maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")`, width: `${glyph.anchor.advance_width / 1000}em` }} />
        : <span key={index} aria-hidden="true">{letter}</span>;
    })}
  </span>;
}
