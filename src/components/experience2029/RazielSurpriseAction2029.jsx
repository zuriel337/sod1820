import React, { useState } from "react";
import { RAZIEL_SURPRISE_LABEL } from "../../lib/research/razielViewMode2029.js";

// "✨ הפתע אותי" — sits next to "בדוק לעומק…" with the same weight (same action class), and is a ONE-SHOT request:
// the last question is sent again as a deep continuation in view_mode exploratory over the same session/Result Bundle.
// It owns only its own open/closed state; the session's mode is never changed and nothing is persisted.
// The first click loads and shows the explanation (lazy chunk); the request is sent only from "הפעל הפתעה", and the
// Provider refuses it again if the last answer has no valid Bundle. Without one the panel only says there is not enough
// material yet and has no control that could send anything. The caller renders it only on the latest answer when the
// session is ready; the Bundle check itself lives in the lazy gate (razielSurpriseGate2029.js).
export default function RazielSurpriseAction2029({ session, onRun }) {
  const [open, setOpen] = useState(false);
  const [Offer, setOffer] = useState(null);
  const close = () => setOpen(false);
  const toggle = () => {
    setOpen(!open);
    if (!open && !Offer) import("./RazielSurpriseOffer2029.jsx").then((module) => setOffer(() => module.default), close);
  };
  return (
    <>
      <button className="sod29-action" type="button" disabled={session.busy} aria-expanded={open} onClick={toggle}>{RAZIEL_SURPRISE_LABEL}</button>
      {open && Offer ? <Offer session={session} busy={session.busy} onRun={() => { close(); onRun(); }} onClose={close} /> : null}
    </>
  );
}
