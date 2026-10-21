import React from "react";
import { Link } from "react-router-dom";
import { projectDomainGates } from "../../lib/research/heichalEntryExamples.js";
import "./heichalEntry.css";

const kingdomBuild = import.meta.env.VITE_KINGDOM_PREVIEW === "true";

// Visual doors into EXISTING surfaces (HEICHAL-PREVIEW-ONLY-20261021): navigation only. No availability state, no site-flag
// read, no permission logic here; each destination enforces its own privacy and access.
export default function HeichalDomainGates() {
  const gates = projectDomainGates({ kingdomBuild });
  return (
    <section className="sod29-section heichal-gates" data-experience-capability="heichal-domain-gates" aria-label="שערים לתחומים">
      <div className="sod29-kicker">או התחל מתחום</div>
      <ul className="heichal-gates-grid">
        {gates.map((gate) => (
          <li key={gate.key} data-gate={gate.key}>
            <Link className="heichal-gate" to={gate.href}>
              <strong>{gate.label}</strong>
              <small>{gate.detail}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
