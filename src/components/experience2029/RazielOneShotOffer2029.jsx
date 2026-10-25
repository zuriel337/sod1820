import React from "react";
import { selectRazielOneShot } from "../../lib/research/razielOneShotGate2029.js";
import { RAZIEL_ONE_SHOT_COPY } from "../../lib/research/razielOneShotCopy2029.js";

// The explanation shown BEFORE activation (lazy chunk, loaded on the first click of a one-shot action).
// It receives the one Raziel session (read-only) and checks it with the lazy gate. When the last answer has no valid Result
// Bundle only the "not enough material yet" note is shown and there is no control that could send a request.
export default function RazielOneShotOffer2029({ kind, session, busy = false, onRun, onClose }) {
  const copy = RAZIEL_ONE_SHOT_COPY[kind];
  const ready = selectRazielOneShot(session).ok;
  return (
    <div className="sod29-raziel-deep-offer sod29-raziel-oneshot-offer" role="group" aria-label={copy.aria} data-raziel-oneshot-offer={ready ? `${kind}:ready` : `${kind}:no_material`}>
      {ready ? (
        <>
          <p>{copy.explanation}</p>
          <button className="sod29-action primary" type="button" disabled={busy} data-raziel-oneshot-run={kind} onClick={onRun}>{copy.run}</button>
          <button className="sod29-action" type="button" onClick={onClose}>לא עכשיו</button>
        </>
      ) : (
        <>
          <p role="status" data-raziel-oneshot-unavailable="true">{copy.noMaterial}</p>
          <button className="sod29-action" type="button" onClick={onClose}>סגור</button>
        </>
      )}
    </div>
  );
}
