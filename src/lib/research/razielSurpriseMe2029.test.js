import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  RAZIEL_DEFAULT_VIEW_MODE,
  RAZIEL_SURPRISE_LABEL,
  RAZIEL_SURPRISE_LEVEL,
  RAZIEL_SURPRISE_MODE,
} from "./razielViewMode2029.js";
import { RAZIEL_SURPRISE_EXPLANATION, RAZIEL_SURPRISE_NO_MATERIAL } from "./razielSurpriseCopy2029.js";
import {
  createRazielProvenance,
  createRazielRequestContextSnapshot,
  createRazielTurnSucceededAction,
  prepareRazielSessionSubmission,
} from "./razielSessionRequest2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "./razielSession2029.js";
import { selectRazielSurprise } from "./razielSurpriseGate2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const provider = read("./RazielSessionProvider2029.jsx");
const sessionSource = read("./razielSession2029.js");
const gateSource = read("./razielSurpriseGate2029.js");
const requestSource = read("./razielSessionRequest2029.js");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const action = read("../../components/experience2029/RazielSurpriseAction2029.jsx");
const offer = read("../../components/experience2029/RazielSurpriseOffer2029.jsx");

const ready = { plan_meta: { canonical_result_bundle: { contract: "public-number-research-run-v1", status: "ready", numbers: [271] } } };
const snapshot = createRazielRequestContextSnapshot({ subject: { type: "number", id: "271", label: "271" } });

// Builds a real completed turn through the real reducer so the thread/continuation shapes are the production ones.
function answered({ response = ready, level = "fast", viewMode = null } = {}) {
  let state = createInitialRazielSessionState();
  const turn = { id: "t1", question: "מה זה 271?", intelligenceLevel: level, again: false, projection: "desktop", startedAt: "2026-10-25T00:00:00Z", continuation: { contextSnapshot: snapshot, facts: "שורש עמוד: 271", viewMode: viewMode || "general" } };
  state = razielSessionReducer(state, { type: "turn_started", turn, contextSnapshot: snapshot });
  const provenance = createRazielProvenance({ response: { answer: "תשובה", ...response }, turn, completedAt: "2026-10-25T00:00:01Z" });
  return razielSessionReducer(state, createRazielTurnSucceededAction({ state, response: { answer: "תשובה", intelligenceLevel: level, deterministic: false, sourceNames: [] }, provenance, completedAt: "z" }));
}

test("the texts and constants are exactly the requested ones", () => {
  assert.equal(RAZIEL_SURPRISE_LABEL, "✨ הפתע אותי");
  assert.equal(RAZIEL_SURPRISE_EXPLANATION, "רזיאל יחפש קשר לא צפוי בתוך העובדות המאומתות, ויפריד בין עובדה, פרשנות והשערה.");
  assert.equal(RAZIEL_SURPRISE_NO_MATERIAL, "אין עדיין מספיק חומר להפתעה.");
  assert.equal(RAZIEL_SURPRISE_MODE, "exploratory");
  assert.equal(RAZIEL_SURPRISE_LEVEL, "deep");
  assert.equal(RAZIEL_DEFAULT_VIEW_MODE, "general");
});

test("bundleStatus lives in the request module's provenance and reflects only an object status on THAT answer", () => {
  assert.match(requestSource, /bundleStatus: cleanInline\(isObject\(plan\.canonical_result_bundle\)/);
  assert.doesNotMatch(sessionSource, /bundleStatus: cleanInline/, "the session module only READS bundleStatus; provenance is built in the request module");
  const turn = { id: "t1", intelligenceLevel: "fast", startedAt: "x" };
  const prov = (response) => createRazielProvenance({ response: { answer: "תשובה", ...response }, turn, completedAt: "y" });
  assert.equal(prov(ready).bundleStatus, "ready");
  assert.equal(prov({ plan_meta: { canonical_result_bundle: { status: "fallback" } } }).bundleStatus, "fallback");
  assert.equal("bundleStatus" in prov({}), false);
  assert.equal("bundleStatus" in prov({ plan_meta: { canonical_result_bundle: "ready" } }), false);
});

test("selectRazielSurprise: visible on the latest completed answer of any level; ok only with a valid Bundle for exactly that answer", () => {
  const ok = selectRazielSurprise(answered());
  assert.deepEqual({ ...ok }, { visible: true, ok: true, question: "מה זה 271?", turnId: "t1" });
  assert.equal(selectRazielSurprise(answered({ level: "deep" })).ok, true);
  assert.equal(selectRazielSurprise(answered({ level: "deterministic" })).ok, true);
  for (const response of [{}, { plan_meta: { canonical_result_bundle: { status: "fallback" } } }]) {
    const state = answered({ response });
    assert.deepEqual({ ...selectRazielSurprise(state) }, { visible: true, ok: false, question: "מה זה 271?", turnId: "t1" });
  }
  const mismatched = { ...answered(), provenance: { turnId: "other", bundleStatus: "ready" } };
  assert.equal(selectRazielSurprise(mismatched).ok, false, "provenance of another turn never qualifies");
  assert.equal(selectRazielSurprise({ ...answered(), busy: true }).visible, false);
  assert.equal(selectRazielSurprise({ ...answered(), status: "error" }).visible, false);
  assert.equal(selectRazielSurprise(createInitialRazielSessionState()).visible, false, "no answer ⇒ nothing to surprise about");
  assert.equal(selectRazielSurprise(null).visible, false);
});

test("one-shot request: continuation of the same turn, deep, exploratory — the explicit mode wins, the session mode and a plain deepen are untouched", () => {
  const state = answered();
  const common = { question: "מה זה 271?", state, researchContext: null, facts: "", view: {}, projection: "desktop", startedAt: "s", createTurnId: () => "t2" };
  const surprise = prepareRazielSessionSubmission({ ...common, intelligenceLevel: RAZIEL_SURPRISE_LEVEL, again: true, continuationTurnId: "t1", viewModeOverride: RAZIEL_SURPRISE_MODE });
  assert.equal(surprise.request.viewMode, "exploratory");
  assert.equal(surprise.request.again, true);
  assert.equal(surprise.request.intelligenceLevel, "deep");
  assert.equal(surprise.request.subject, "מה זה 271?");
  assert.equal(surprise.request.researchContract, "public-number-research-run-v1");
  assert.equal(surprise.request.facts, "שורש עמוד: 271", "the continuation reuses the original facts and context — same Bundle inputs");
  assert.equal(surprise.contextSnapshot.subject.id, "271");
  // a plain deepen (no explicit mode) keeps the mode of the answer it extends, exactly as before
  const deepen = prepareRazielSessionSubmission({ ...common, intelligenceLevel: "deep", again: true, continuationTurnId: "t1" });
  assert.equal("viewMode" in deepen.request, false);
  const fromExploratory = prepareRazielSessionSubmission({ ...common, state: answered({ viewMode: "exploratory" }), intelligenceLevel: "deep", again: true, continuationTurnId: "t1" });
  assert.equal(fromExploratory.request.viewMode, "exploratory");
  // the session-level mode is not an input the one-shot changes
  assert.equal(state.viewMode, "general");
});

test("reducer: the surprise turn adds no second user message and leaves the session mode alone; refusals are not labelled as exploratory", () => {
  let state = answered();
  const turn = { id: "t2", question: "מה זה 271?", intelligenceLevel: "deep", again: true, startedAt: "s", continuation: { contextSnapshot: snapshot, facts: "", viewMode: "exploratory" } };
  state = razielSessionReducer(state, { type: "turn_started", turn, contextSnapshot: snapshot });
  assert.equal(state.thread.filter((m) => m.role === "user").length, 1);
  state = razielSessionReducer(state, createRazielTurnSucceededAction({ state, response: { answer: "עובדה: …", intelligenceLevel: "deep", deterministic: false, sourceNames: [], viewMode: { requested: "exploratory", applied: true } }, provenance: { turnId: "t2" }, completedAt: "z" }));
  assert.equal(state.viewMode, "general");
  assert.deepEqual([state.thread.at(-1).viewMode, state.thread.at(-1).viewModeApplied], ["exploratory", true]);
});

test("provider: submitSurprise is a gate in front of the single AI boundary; the lazy builder and its imports are untouched", () => {
  const body = provider.slice(provider.indexOf("const submitSurprise"), provider.indexOf("const setViewMode"));
  assert.match(body, /await import\("\.\/razielSurpriseGate2029\.js"\)/, "the gate is a lazy module");
  assert.match(body, /selectRazielSurprise\(stateRef\.current\)/);
  assert.match(body, /if \(!surprise\.ok\) return \{ ok: false, error: "no_material_for_surprise" \}/);
  assert.ok(body.indexOf("surprise.ok") < body.indexOf("return submit("), "refusal happens before submit() — no state change, no request");
  assert.match(body, /intelligenceLevel: RAZIEL_SURPRISE_LEVEL, again: true, continuationTurnId: surprise\.turnId, viewModeOverride: RAZIEL_SURPRISE_MODE/);
  assert.doesNotMatch(body, /transport|askRaziel|view_mode_set|dispatch|localStorage|sessionStorage|indexedDB|fetch\(/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1, "still exactly one AI call site");
  assert.match(provider, /await loadRequestBuilder\(\)/);
  const imports = provider.split("\n").filter((line) => /^import /.test(line)).join("\n");
  assert.doesNotMatch(imports, /razielSessionRequest2029|razielConversationResolver|researchPlan|gematria\.js|triage|razielSurprise(Gate|Copy)/, "no heavy or lazy-only import came back into the Provider");
  assert.match(imports, /from "\.\/razielViewMode2029\.js"/);
  assert.match(provider, /submit,\n\s+setViewMode,\n\s+submitSurprise,/);
  assert.match(requestSource, /const selectedViewMode = continuation\?\.viewMode/, "the pinned continuation precedence line is untouched");
  assert.match(requestSource, /viewModeOverride/);
});

test("weight: the gate, the copy and the panel are lazy-only — nothing of them is imported statically by an eager module", () => {
  for (const [name, source] of [["frame", frame], ["action", action], ["provider", provider], ["session", sessionSource]]) {
    const imports = source.split("\n").filter((line) => /^import /.test(line)).join("\n");
    assert.doesNotMatch(imports, /razielSurprise(Gate|Copy|Offer)/, `${name} must not statically import the lazy surprise modules`);
  }
  assert.doesNotMatch(offer, /RazielSessionProvider2029|ResearchProvider/, "the lazy panel must not pull the Provider graph into a shared chunk");
  assert.match(gateSource, /^import \{ normalizeRazielQuestion \} from "\.\/razielSession2029\.js";/m);
  assert.doesNotMatch(sessionSource, /selectRazielSurprise/, "the selector is not in the eager session module");
});

test("UI: the action sits beside 'בדוק לעומק…' on the latest answer, never in the composer, and never switches the mode", () => {
  assert.match(frame, /import RazielSurpriseAction2029 from "\.\/RazielSurpriseAction2029\.jsx"/);
  assert.match(frame, /\{m === lastRaziel && status === "ready" \? <RazielSurpriseAction2029 session=\{session\} onRun=\{\(\) => session\.submitSurprise\(\{ projection \}\)\} \/> : null\}/);
  assert.ok(frame.indexOf("data-raziel-deepen-preview") < frame.indexOf("<RazielSurpriseAction2029"), "next to the deepen action");
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  const composer = chat.slice(chat.indexOf('<form className="sod29-raziel-composer"'));
  assert.doesNotMatch(composer, /urprise/);
  assert.doesNotMatch(chat, /setViewMode/);
});

test("component: same action class as deepen, explains first (lazy panel), activates only from the explicit button, blocks without a valid Bundle", () => {
  assert.match(action, /className="sod29-action" type="button" disabled=\{session\.busy\} aria-expanded=\{open\}/);
  assert.match(action, /onClick=\{toggle\}/, "the first click only opens the explanation");
  assert.match(action, /import\("\.\/RazielSurpriseOffer2029\.jsx"\)/, "the panel and its copy are a lazy chunk");
  assert.equal((action.match(/onRun\(\)/g) || []).length, 1);
  assert.match(action, /\{open && Offer \? <Offer session=\{session\} busy=\{session\.busy\} onRun=\{\(\) => \{ close\(\); onRun\(\); \}\} onClose=\{close\} \/> : null\}/);
  assert.match(offer, /selectRazielSurprise\(session\)\.ok/);
  const noMaterial = offer.slice(offer.indexOf(") : ("), offer.indexOf("</div>\n  );"));
  assert.match(noMaterial, /RAZIEL_SURPRISE_NO_MATERIAL/);
  assert.doesNotMatch(noMaterial, /data-raziel-surprise="true"|onRun/, "no activation control without a valid Bundle");
  for (const source of [action, offer, gateSource]) assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(|askRaziel|transport/);
});
