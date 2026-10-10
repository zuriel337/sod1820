import React from "react";
import NavigationIcon2029 from "./experience2029/NavigationIcon2029.jsx";
import "../pages/EntityHubMicroMotion.css";

// Compatibility wrapper: small actions and large identities use the menu geometry.
export const RESEARCH_ICON_NAMES = Object.freeze(["research", "graph", "journey", "spatial", "scan", "time", "layers", "source", "gallery", "dna", "cipher", "globe", "signal", "raziel", "portal", "spark", "door", "book", "cosmos", "gematria", "els"]);
export default function ResearchIcon({ name = "research", size = 24, tone = "research", title }) {
  return <span className={`rf-icon rf-icon--${tone}`} data-icon={name} aria-hidden={title ? undefined : true} title={title}>
    <NavigationIcon2029 name={name} size={size} />
  </span>;
}
