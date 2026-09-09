import React from "react";
import ResearchIcon from "./ResearchIcon.jsx";

// W0.5 Signature projection: same capability glyphs as ResearchIcon, richer material.
// This is not a second icon registry. Use only for hero/feature/journey/spatial moments.
export default function SignatureResearchIcon({ name, tone = "research", label }) {
  return <div className={`sig-icon sig-icon--${tone}`} aria-label={label || name}>
    <span className="sig-icon__halo" aria-hidden="true" />
    <span className="sig-icon__orbit sig-icon__orbit--a" aria-hidden="true" />
    <span className="sig-icon__orbit sig-icon__orbit--b" aria-hidden="true" />
    <span className="sig-icon__core"><ResearchIcon name={name} tone={tone} size={42} /></span>
    <span className="sig-icon__spark" aria-hidden="true" />
  </div>;
}
