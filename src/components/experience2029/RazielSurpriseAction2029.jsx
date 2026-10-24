import React, { useState } from "react";
import {
  RAZIEL_SURPRISE_EXPLANATION,
  RAZIEL_SURPRISE_LABEL,
  RAZIEL_SURPRISE_NO_MATERIAL,
  razielSurpriseEligibility,
} from "../../lib/research/razielViewMode2029.js";

// "✨ הפתע אותי" — sits next to "בדוק לעומק…" with the same weight (same pill class), and is a ONE-SHOT request:
// the last question is sent again as a continuation in view_mode exploratory over the same session/Result Bundle.
// It owns only its own open/closed state; the session's mode is never changed and nothing is persisted.
// Clicking explains first; the request is only sent from the explicit "הפעל הפתעה" button. Without a valid Bundle
// for the last answer nothing can be activated — the panel says there is not enough material yet.
export default function RazielSurpriseAction2029({ lastAnswer = null, provenance = null, busy = false, onRun }) {
  const [open, setOpen] = useState(false);
  const eligibility = razielSurpriseEligibility({ lastAnswer, provenance });
  const run = async () => {
    setOpen(false);
    if (busy || !eligibility.ok) return;
    await onRun?.(eligibility);
  };
  return (
    <>
      <button
        className="sod29-raziel-deepen sod29-raziel-surprise"
        type="button"
        disabled={busy}
        aria-expanded={open}
        data-raziel-surprise-preview="true"
        onClick={() => setOpen((value) => !value)}
      >{RAZIEL_SURPRISE_LABEL}</button>
      {open ? (
        <div className="sod29-raziel-deep-offer sod29-raziel-surprise-offer" role="group" aria-label="הפתע אותי" data-raziel-surprise-offer={eligibility.ok ? "ready" : "no_material"}>
          {eligibility.ok ? (
            <>
              <p>{RAZIEL_SURPRISE_EXPLANATION}</p>
              <div className="sod29-raziel-deep-actions">
                <button className="sod29-action primary" type="button" disabled={busy} data-raziel-surprise="true" onClick={run}>הפעל הפתעה</button>
                <button className="sod29-raziel-saved-link" type="button" onClick={() => setOpen(false)}>לא עכשיו</button>
              </div>
            </>
          ) : (
            <>
              <p role="status" data-raziel-surprise-unavailable="true">{RAZIEL_SURPRISE_NO_MATERIAL}</p>
              <div className="sod29-raziel-deep-actions">
                <button className="sod29-raziel-saved-link" type="button" onClick={() => setOpen(false)}>סגור</button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
