import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSiteFlags } from "../../lib/supabase.js";
import { resolveFeatureState } from "../MaintenanceLock.jsx";
import { useAuth } from "../AuthProvider.jsx";
import { HEICHAL_DOMAIN_GATES, projectDomainGate } from "../../lib/research/heichalEntryExamples.js";
import "./heichalEntry.css";

const kingdomPreview = import.meta.env.VITE_KINGDOM_PREVIEW === "true";

const FLAGS_TIMEOUT_MS = 8000;

// Visual doors into EXISTING surfaces. Availability is the real site_flags state resolved by the existing
// resolveFeatureState (one flags read for all gates). A failed, timed-out or empty read is "unknown", never "open";
// a closed or unknown gate shows the truth and does not link.
export default function HeichalDomainGates() {
  const { user, isAdmin } = useAuth();
  const [flags, setFlags] = useState({ status: "loading", map: {} });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFlags({ status: "loading", map: {} });
    const timer = setTimeout(() => { if (alive) { alive = false; setFlags({ status: "unknown", map: {} }); } }, FLAGS_TIMEOUT_MS);
    getSiteFlags()
      .then((map) => { if (alive) { alive = false; clearTimeout(timer); setFlags(map && Object.keys(map).length ? { status: "ready", map } : { status: "unknown", map: {} }); } })
      .catch(() => { if (alive) { alive = false; clearTimeout(timer); setFlags({ status: "unknown", map: {} }); } });
    return () => { alive = false; clearTimeout(timer); };
  }, [attempt]);

  const gates = useMemo(() => HEICHAL_DOMAIN_GATES.map((gate) => {
    const lock = gate.flag ? flags.map[gate.flag] || null : null;
    return projectDomainGate(gate, {
      flagsStatus: flags.status,
      lock,
      kingdomPreview,
      resolved: gate.flag && flags.status === "ready" ? resolveFeatureState(lock, { user, isAdmin, requireFlag: gate.requireFlag }) : null,
    });
  }), [flags, user, isAdmin]);
  const anyUnknown = gates.some((gate) => gate.state === "unknown");

  return (
    <section className="sod29-section heichal-gates" data-experience-capability="heichal-domain-gates" data-flags-status={flags.status} aria-label="שערים לתחומים">
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
      {anyUnknown ? (
        <div className="sod29-state warn" role="status" data-flags-unknown="true">
          לא התקבל מצב זמינות מהשרת, ולכן לא מוצג "פתוח" עבור תחומים שתלויים בו.
          <div className="sod29-actions"><button type="button" className="sod29-action" onClick={() => setAttempt((n) => n + 1)}>בדוק שוב</button></div>
        </div>
      ) : null}
    </section>
  );
}
