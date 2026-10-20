import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSiteFlags } from "../../lib/supabase.js";
import { resolveFeatureState } from "../MaintenanceLock.jsx";
import { useAuth } from "../AuthProvider.jsx";
import { HEICHAL_DOMAIN_GATES, projectDomainGate } from "../../lib/research/heichalEntryExamples.js";
import "./heichalEntry.css";

const kingdomPreview = import.meta.env.VITE_KINGDOM_PREVIEW === "true";

// Visual doors into EXISTING surfaces. Availability is the real site_flags state resolved by the existing
// resolveFeatureState (one flags read for all gates); a closed gate shows the truth and does not link.
export default function HeichalDomainGates() {
  const { user, isAdmin } = useAuth();
  const [flags, setFlags] = useState({ loading: true, map: {} });

  useEffect(() => {
    let alive = true;
    getSiteFlags().then((map) => { if (alive) setFlags({ loading: false, map: map || {} }); }).catch(() => { if (alive) setFlags({ loading: false, map: {} }); });
    return () => { alive = false; };
  }, []);

  const gates = useMemo(() => HEICHAL_DOMAIN_GATES.map((gate) => projectDomainGate(gate, {
    loading: flags.loading,
    kingdomPreview,
    resolved: gate.flag ? resolveFeatureState(flags.map[gate.flag] || null, { user, isAdmin, requireFlag: gate.requireFlag }) : null,
  })), [flags, user, isAdmin]);

  return (
    <section className="sod29-section heichal-gates" data-experience-capability="heichal-domain-gates" aria-label="שערים לתחומים">
      <div className="sod29-kicker">או התחל מתחום</div>
      <ul className="heichal-gates-grid">
        {gates.map((gate) => {
          const inner = <>
            <strong>{gate.label}</strong>
            <small>{gate.detail}</small>
            <span className="sod29-chip" data-gate-state={gate.state}>{gate.stateLabel}</span>
          </>;
          return (
            <li key={gate.key} data-gate={gate.key}>
              {gate.href
                ? <Link className="heichal-gate is-open" to={gate.href}>{inner}</Link>
                : <div className="heichal-gate is-closed" aria-disabled="true">{inner}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
