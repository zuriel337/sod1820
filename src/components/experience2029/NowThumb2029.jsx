// Shared compact artwork for the Now sheet and its three-row Home view.
import React from "react";
import OwnMarkBox2029 from "./OwnMark2029.jsx";

export default function NowThumb2029({ model, className = "sod29-nowpub-thumb", children }) {
  const glyph = model.video ? "▶" : model.unverified ? "✦" : "◈";
  if (model.thumb) return <OwnMarkBox2029 logo={model.logo} size={44}>
    {children || <img className={className} src={model.thumb} alt="" loading="lazy" decoding="async" />}
  </OwnMarkBox2029>;
  if (model.logo) return <img className={className + " is-logo"} src={model.logo.src} alt=""
    width="44" height="44" loading="lazy" decoding="async" title={model.logo.label} />;
  return <span className={className + " is-glyph"} aria-hidden="true">{glyph}</span>;
}
