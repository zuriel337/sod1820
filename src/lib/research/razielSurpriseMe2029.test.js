import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  RAZIEL_DEFAULT_VIEW_MODE,
  RAZIEL_SURPRISE_EXPLANATION,
  RAZIEL_SURPRISE_LABEL,
  RAZIEL_SURPRISE_MODE,
  RAZIEL_SURPRISE_NO_MATERIAL,
  razielSurpriseEligibility,
} from "./razielViewMode2029.js";
import {
  buildRazielSessionRequest,
  createInitialRazielSessionState,
  createRazielProvenance,
  normalizeRazielResponse,
  razielSessionReducer,
} from "./razielSession2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const provider = read("./RazielSessionProvider2029.jsx");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const action = read("../../components/experience2029/RazielSurpriseAction2029.jsx");

const ready = { plan_meta: { canonical_result_bundle: { contract: "public-number-research-run-v1", status: "ready", numbers: [271] } } };
const answer = (overrides = {}) => ({ role: "raziel", text: "תשובה", level: "fast", question: "מה זה 271?", turnId: "t1", ...overrides });
const provenanceFor = (response, id = "t1") => createRazielProvenance({ response: { answer: "תשובה", ...response }, turn: { id, intelligenceLevel: "fast", startedAt: "2026-10-24T00:00:00Z" }, completedAt: "2026-10-24T00:00:01Z" });

test("the texts are exactly the requested ones", () => {
  assert.equal(RAZIEL_SURPRISE_LABEL, "✨ הפתע אותי");
  assert.equal(RAZIEL_SURPRISE_EXPLANATION, "רזיאל יחפש קשר לא צפוי בתוך העובדות המאומתות, ויפריד בין עובדה, פרשנות והשערה.");
  assert.equal(RAZIEL_SURPRISE_NO_MATERIAL, "אין עדיין מספיק חומר להפתעה.");
  assert.equal(RAZIEL_SURPRISE_MODE, "exploratory");
});

test("provenance reports the Bundle status of THAT answer; absent plan_meta means no Bundle", () => {
  assert.equal(provenanceFor(ready).bundleStatus, "ready");
  assert.equal(provenanceFor({ plan_meta: { canonical_result_bundle: { status: "fallback" } } }).bundleStatus, "fallback");
  assert.equal("bundleStatus" in provenanceFor({}), false);
  assert.equal("bundleStatus" in provenanceFor({ plan_meta: { canonical_result_bundle: "ready" } }), false, "only an object status counts");
});

test("eligibility: a valid Bundle for exactly the last answer, with its question — nothing else qualifies", () => {
  const ok = razielSurpriseEligibility({ lastAnswer: answer(), provenance: provenanceFor(ready) });
  assert.deepEqual({ ...ok }, { ok: true, question: "מה זה 271?" });
  const cases = [
    [{ lastAnswer: null, provenance: provenanceFor(ready) }, "no_answer"],
    [{ lastAnswer: answer({ question: "  " }), provenance: provenanceFor(ready) }, "no_answer"],
    [{ lastAnswer: answer({ role: "user" }), provenance: provenanceFor(ready) }, "no_answer"],
    [{ lastAnswer: answer(), provenance: null }, "no_valid_bundle"],
    [{ lastAnswer: answer(), provenance: provenanceFor({}) }, "no_valid_bundle"],
    [{ lastAnswer: answer(), provenance: provenanceFor({ plan_meta: { canonical_result_bundle: { status: "fallback" } } }) }, "no_valid_bundle"],
    [{ lastAnswer: answer({ turnId: "t2" }), provenance: provenanceFor(ready, "t1") }, "no_valid_bundle"],
    [{ lastAnswer: answer({ turnId: null }), provenance: provenanceFor(ready, null) }, "no_valid_bundle"],
    [{}, "no_answer"],
  ];
  for (const [input, reason] of cases) assert.deepEqual({ ...razielSurpriseEligibility(input) }, { ok: false, reason }, JSON.stringify(input));
});

test("the one-shot request: same question, continuation, exploratory, fast — and only viewMode differs from the same turn in general", () => {
  const state = { ...createInitialRazielSessionState(), thread: [{ role: "user", text: "מה זה 271?", turnId: "t1" }, answer()] };
  const general = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "fast", again: true });
  const surprise = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "fast", again: true, viewMode: RAZIEL_SURPRISE_MODE });
  assert.equal(surprise.viewMode, "exploratory");
  assert.equal(surprise.again, true);
  assert.equal(surprise.intelligenceLevel, "fast");
  assert.equal(surprise.researchContract, "public-number-research-run-v1");
  assert.deepEqual({ ...surprise, viewMode: undefined }, { ...general, viewMode: undefined });
  assert.match(surprise.context, /רזיאל: תשובה/, "the previous answer is carried as the continuation context");
});

test("reducer: the surprise turn adds no second user message, keeps the session's own mode, and is labelled only when applied", () => {
  let state = { ...createInitialRazielSessionState(), thread: [{ role: "user", text: "מה זה 271?", turnId: "t1" }, answer()] };
  assert.equal(state.viewMode, RAZIEL_DEFAULT_VIEW_MODE);
  const turn = { id: "t2", question: "מה זה 271?", intelligenceLevel: "fast", again: true, viewMode: "exploratory", startedAt: "x" };
  state = razielSessionReducer(state, { type: "turn_started", turn, contextSnapshot: null });
  assert.equal(state.thread.filter((m) => m.role === "user").length, 1);
  const response = normalizeRazielResponse({ answer: "עובדה: …", plan_meta: { view_mode: { requested: "exploratory", applied: true } } }, "fast");
  state = razielSessionReducer(state, { type: "turn_succeeded", completedAt: "y", response, provenance: null });
  assert.equal(state.viewMode, "general", "the default mode is not changed by the one-shot");
  assert.deepEqual([state.thread.at(-1).viewMode, state.thread.at(-1).viewModeApplied], ["exploratory", true]);
  const refused = normalizeRazielResponse({ answer: "אין Bundle", plan_meta: { view_mode: { requested: "exploratory", applied: false, reason: "no_canonical_bundle" } } }, "fast");
  assert.equal(refused.viewMode.applied, false, "a server refusal is never presented as an exploratory answer");
});

test("provider: submitSurprise is a gate in front of the single AI boundary — no new engine, memory or mode switch", () => {
  const body = provider.slice(provider.indexOf("const submitSurprise"), provider.indexOf("const setViewMode"));
  assert.match(body, /razielSurpriseEligibility\(\{ lastAnswer, provenance: current\.provenance \}\)/);
  assert.match(body, /if \(!eligibility\.ok\) return \{ ok: false, error: "no_material_for_surprise" \}/);
  assert.ok(body.indexOf("eligibility.ok") < body.indexOf("return submit("), "refusal happens before submit()");
  assert.match(body, /submit\(\{ question: eligibility\.question, intelligenceLevel: "fast", again: true, facts, view, projection, viewMode: RAZIEL_SURPRISE_MODE \}\)/);
  assert.doesNotMatch(body, /transport|askRaziel|view_mode_set|dispatch|localStorage|sessionStorage|indexedDB|fetch\(/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1, "still exactly one AI call site");
  assert.match(provider, /submit,\n\s+setViewMode,\n\s+submitSurprise,/);
});

test("UI: the action sits beside 'בדוק לעומק…' on the latest answer, never in the composer, and never changes the default", () => {
  assert.match(frame, /import RazielSurpriseAction2029 from "\.\/RazielSurpriseAction2029\.jsx"/);
  assert.match(frame, /\{m === lastRaziel && !closedNote \? <RazielSurpriseAction2029 lastAnswer=\{lastRaziel\} provenance=\{provenance\} busy=\{busy\} onRun=\{runSurprise\} \/> : null\}/);
  assert.ok(frame.indexOf("data-raziel-deepen-preview") < frame.indexOf("<RazielSurpriseAction2029"), "next to the deepen action");
  assert.match(frame, /const runSurprise = \(\) => session\.submitSurprise\(\{ facts: buildFacts\(\)/);
  const composer = frame.slice(frame.indexOf('<form className="sod29-raziel-composer"'), frame.indexOf("</form>", frame.indexOf('<form className="sod29-raziel-composer"')));
  assert.doesNotMatch(composer, /Surprise|surprise/);
  assert.doesNotMatch(frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection")), /setViewMode/);
});

test("component: same pill class as deepen, explains first, activates only from the explicit button, and blocks without a valid Bundle", () => {
  assert.match(action, /className="sod29-raziel-deepen sod29-raziel-surprise"/);
  assert.match(action, /aria-expanded=\{open\}/);
  assert.match(action, /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/, "the first click only opens the explanation");
  assert.equal((action.match(/onRun\?\.\(/g) || []).length, 1);
  assert.match(action, /if \(busy \|\| !eligibility\.ok\) return;\s+await onRun\?\.\(eligibility\)/);
  const noMaterial = action.slice(action.indexOf(") : ("), action.indexOf("</div>\n      ) : null}"));
  assert.match(noMaterial, /RAZIEL_SURPRISE_NO_MATERIAL/);
  assert.doesNotMatch(noMaterial, /data-raziel-surprise="true"|onRun|run\}/, "no activation control when there is no valid Bundle");
  assert.doesNotMatch(action, /localStorage|sessionStorage|indexedDB|fetch\(|askRaziel|transport/);
});
