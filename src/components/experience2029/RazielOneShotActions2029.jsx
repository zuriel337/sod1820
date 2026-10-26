import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RAZIEL_ONE_SHOT_LABEL } from "../../lib/research/razielViewMode2029.js";

// "✨ הפתע אותי" and "🗺️ פתח מפת מחקר" sit next to "בדוק לעומק" with the same weight. Each is a ONE-SHOT
// request: the last question is sent again as a continuation in an explicit per-request view mode over the same session and
// Result Bundle. This component owns only local action UI; the session's mode is never changed. A server-authorized
// "save conversation" suggestion may call the existing session save action, but only after the person's explicit click.
// The first click loads and shows the explanation (lazy chunk); the request is sent only from its explicit button, and the
// Provider refuses it again if the last answer has no valid Bundle. The caller renders it only on the latest visible answer
// when the session is ready; the Bundle check itself lives in the lazy gate.
export default function RazielOneShotActions2029({ session, onRun, disabled = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);
  const [Offer, setOffer] = useState(null);
  const [actionState, setActionState] = useState(null);
  const latestRaziel = [...(Array.isArray(session.thread) ? session.thread : [])]
    .reverse()
    .find((message) => message?.role === "raziel") || null;
  const suggestedActions = Array.isArray(latestRaziel?.suggestedActions)
    ? latestRaziel.suggestedActions.slice(0, 2)
    : [];
  const close = () => setOpen(null);
  const toggle = (kind) => {
    setOpen(open === kind ? null : kind);
    if (open !== kind && !Offer) import("./RazielOneShotOffer2029.jsx").then((module) => setOffer(() => module.default), close);
  };
  const runSuggestedAction = async (action) => {
    if (!action?.id || session.busy || disabled || actionState?.status === "pending") return;
    if (action.id === "open_number") {
      if (/^\/2029\/number\/[1-9]\d{0,5}$/.test(action.href || "")) navigate(action.href);
      return;
    }
    if (action.id === "save_as_life_journey_hint") {
      if (action.href === "/2029/journey?focus=hints") navigate(action.href);
      return;
    }
    setActionState({ id: action.id, status: "pending" });
    let result = { ok: false };
    if (action.id === "all_methods" && action.subject) {
      result = await session.submit({ question: `בדוק את ${action.subject} בכל השיטות`, intelligenceLevel: "fast" });
    } else if (action.id === "save_conversation") {
      result = await session.saveCurrentSession();
    } else if (action.id === "deepen" && latestRaziel?.question) {
      result = await session.submit({ question: latestRaziel.question, intelligenceLevel: "deep", again: true, continuationTurnId: latestRaziel.turnId });
    }
    setActionState({ id: action.id, status: result?.ok ? "done" : "error" });
  };
  // A deterministic navigation answer is a link/question, not research material: no one-shot offers under it.
  if (latestRaziel?.navigationAction || latestRaziel?.navigationClarify) return null;
  return (
    <>
      {Object.keys(RAZIEL_ONE_SHOT_LABEL).map((kind) => (
        <button key={kind} className="sod29-action" type="button" disabled={session.busy || disabled} aria-expanded={open === kind} data-raziel-oneshot={kind} onClick={() => toggle(kind)}>{RAZIEL_ONE_SHOT_LABEL[kind]}</button>
      ))}
      {suggestedActions.map((action) => (
        <button
          key={action.id}
          className="sod29-action"
          type="button"
          disabled={session.busy || disabled || actionState?.status === "pending"}
          data-raziel-suggested-action={action.id}
          onClick={() => runSuggestedAction(action)}
        >
          {action.label}
        </button>
      ))}
      {actionState?.status === "done" && actionState.id === "save_conversation" ? <span role="status">השיחה נשמרה.</span> : null}
      {actionState?.status === "error" ? <span role="status">הפעולה לא הושלמה. אפשר לנסות שוב.</span> : null}
      {open && Offer ? <Offer kind={open} session={session} busy={session.busy || disabled} onRun={() => { close(); onRun(open); }} onClose={close} /> : null}
    </>
  );
}
