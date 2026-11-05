import React from "react";
import { use2029Palette, treatmentVars } from "../../lib/palette.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import "./iconTile2029.css";

// Shared decorative icon tile. Geometry comes from NavigationIcon2029 and never decides colour; colour comes from the
// shared treatment resolver for the supplied purpose and state. The enclosing control or text owns the accessible name
// and the visible status text (colour alone never states availability or success).
export default function IconTile2029({ name, purpose = "ordinary", state = "active", size = 22, tile = 34, className = "" }) {
  const palette = use2029Palette();
  return <span className={`sod29-icon-tile ${className}`.trim()} data-purpose={purpose} data-state={state} aria-hidden="true"
    style={{ ...treatmentVars(palette, { purpose, state }), "--tile-size": `${tile}px` }}>
    <NavigationIcon2029 name={name} size={size} />
  </span>;
}
