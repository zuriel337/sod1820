import { normalizeRazielQuestion } from "./razielSession2029.js";

// Lazy gate of "✨ הפתע אותי" (loaded on the first click / explicit run, never in the eager 2029 graph).
// The action is offered on the latest completed answer of any level, but it can only RUN when the server reported a valid
// canonical Result Bundle for exactly that answer (provenance.bundleStatus === "ready", built in razielSessionRequest2029.js).
// ok=false ⇒ the panel says there is not enough material yet and nothing is sent.
export function selectRazielSurprise(state) {
  const latest = state?.busy === false && state.status === "ready" ? state.thread?.at(-1) : null;
  const question = latest?.role === "raziel" && latest.turnId ? normalizeRazielQuestion(latest.question) : null;
  if (!question) return { visible: false, ok: false };
  const { provenance } = state;
  return { visible: true, ok: provenance?.turnId === latest.turnId && provenance.bundleStatus === "ready", question, turnId: latest.turnId };
}
