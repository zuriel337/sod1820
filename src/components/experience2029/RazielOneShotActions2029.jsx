import React, { useState } from "react";
import { RAZIEL_ONE_SHOT_LABEL } from "../../lib/research/razielViewMode2029.js";

// "✨ הפתע אותי" and "🗺️ פתח את התמונה המלאה" sit next to "בדוק לעומק" with the same weight. Each is a ONE-SHOT
// request: the last question is sent again as a continuation in an explicit per-request view mode over the same session and
// Result Bundle. This component owns only which explanation is open; the session's mode is never changed, nothing is persisted.
// The first click loads and shows the explanation (lazy chunk); the request is sent only from its explicit button, and the
// Provider refuses it again if the last answer has no valid Bundle. The caller renders it only on the latest visible answer
// when the session is ready; the Bundle check itself lives in the lazy gate.
export default function RazielOneShotActions2029({ session, onRun, disabled = false }) {
  const [open, setOpen] = useState(null);
  const [Offer, setOffer] = useState(null);
  const close = () => setOpen(null);
  const toggle = (kind) => {
    setOpen(open === kind ? null : kind);
    if (open !== kind && !Offer) import("./RazielOneShotOffer2029.jsx").then((module) => setOffer(() => module.default), close);
  };
  return (
    <>
      {Object.keys(RAZIEL_ONE_SHOT_LABEL).map((kind) => (
        <button key={kind} className="sod29-action" type="button" disabled={session.busy || disabled} aria-expanded={open === kind} data-raziel-oneshot={kind} onClick={() => toggle(kind)}>{RAZIEL_ONE_SHOT_LABEL[kind]}</button>
      ))}
      {open && Offer ? <Offer kind={open} session={session} busy={session.busy || disabled} onRun={() => { close(); onRun(open); }} onClose={close} /> : null}
    </>
  );
}
