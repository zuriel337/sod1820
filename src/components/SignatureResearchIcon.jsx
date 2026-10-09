import React from "react";
import ResearchIcon from "./ResearchIcon.jsx";

// Compatibility only: feature moments use the same menu glyph without the old
// orbital frame, glow material or separate signature icon treatment.
export default function SignatureResearchIcon({ name, label }) {
  return <ResearchIcon name={name} size={42} title={label || name} />;
}
