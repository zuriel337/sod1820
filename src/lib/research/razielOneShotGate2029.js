import { normalizeRazielQuestion } from "./razielSession2029.js";

// Lazy gate of the one-shot actions (loaded on the first click / explicit run, never in the eager 2029 graph).
// The action is offered on the latest completed answer of any level, but it can only RUN when the server reported a valid
// canonical Result Bundle for exactly that answer (provenance.bundleStatus === "ready", built in razielSessionRequest2029.js).
// ok=false ⇒ the panel says there is not enough material yet and nothing is sent.
// "surprise" = one unexpected-axis reading (its own server contract, separate from מתפרע); "map" = the layered landscape (fast). Both only as a per-request view mode.
export const RAZIEL_ONE_SHOT_SPEC = Object.freeze({
  surprise: Object.freeze({ mode: "surprise", level: "deep" }),
  map: Object.freeze({ mode: "landscape", level: "fast" }),
});

export function selectRazielOneShot(state) {
  const latest = state?.busy === false && state.status === "ready" ? state.thread?.at(-1) : null;
  const question = latest?.role === "raziel" && latest.turnId ? normalizeRazielQuestion(latest.question) : null;
  if (!question) return { visible: false, ok: false };
  const { provenance } = state;
  return { visible: true, ok: provenance?.turnId === latest.turnId && provenance.bundleStatus === "ready", question, turnId: latest.turnId };
}
