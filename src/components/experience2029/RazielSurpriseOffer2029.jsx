import React from "react";
import { selectRazielSurprise } from "../../lib/research/razielSurpriseGate2029.js";
import { RAZIEL_SURPRISE_EXPLANATION, RAZIEL_SURPRISE_NO_MATERIAL } from "../../lib/research/razielSurpriseCopy2029.js";

// The explanation shown BEFORE activation (lazy chunk, loaded on the first click of "✨ הפתע אותי").
// It receives the one Raziel session (read-only) and checks it with the lazy gate. When the last answer has no valid Result Bundle only the "not enough material yet"
// note is shown and there is no control that could send a request.
export default function RazielSurpriseOffer2029({ session, busy = false, onRun, onClose }) {
  const ready = selectRazielSurprise(session).ok;
  return (
    <div className="sod29-raziel-deep-offer sod29-raziel-surprise-offer" role="group" aria-label="הפתע אותי" data-raziel-surprise-offer={ready ? "ready" : "no_material"}>
      {ready ? (
        <>
          <p>{RAZIEL_SURPRISE_EXPLANATION}</p>
          <button className="sod29-action primary" type="button" disabled={busy} data-raziel-surprise="true" onClick={onRun}>הפעל הפתעה</button>
          <button className="sod29-action" type="button" onClick={onClose}>לא עכשיו</button>
        </>
      ) : (
        <>
          <p role="status" data-raziel-surprise-unavailable="true">{RAZIEL_SURPRISE_NO_MATERIAL}</p>
          <button className="sod29-action" type="button" onClick={onClose}>סגור</button>
        </>
      )}
    </div>
  );
}
