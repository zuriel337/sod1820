import React from "react";
import ResearchIcon from "./ResearchIcon.jsx";
import { iconPress2029 } from "./experience2029/iconPress2029.js";
import "./experience2029/signatureResearchIcon2029.css";

// W0.5 Signature projection: same capability glyphs as ResearchIcon, richer material.
// This is not a second icon registry. Use only for hero/feature/journey/spatial moments.
export default function SignatureResearchIcon({ name, tone = "research", label }) {
  return <div className={`sig-icon sig-icon--${tone}`} data-icon-family="navigation" role="img" aria-label={label || name} onPointerDown={iconPress2029}>
    <span className="sig-icon__depth sig-icon__depth--back" aria-hidden="true"><ResearchIcon name={name} tone={tone} size={42} /></span>
    <span className="sig-icon__depth sig-icon__depth--mid" aria-hidden="true"><ResearchIcon name={name} tone={tone} size={42} /></span>
    <span className="sig-icon__core"><ResearchIcon name={name} tone={tone} size={42} /></span>
  </div>;
}
