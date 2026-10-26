import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { RAZIEL_DEFAULT_VIEW_MODE, RAZIEL_ONE_SHOT_LABEL, razielViewModeLabel } from "./razielViewMode2029.js";
import { RAZIEL_ONE_SHOT_COPY } from "./razielOneShotCopy2029.js";
import {
  createRazielProvenance,
  createRazielRequestContextSnapshot,
  createRazielTurnSucceededAction,
  normalizeRazielResponse,
  prepareRazielSessionSubmission,
} from "./razielSessionRequest2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "./razielSession2029.js";
import { RAZIEL_ONE_SHOT_SPEC, selectRazielOneShot } from "./razielOneShotGate2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const provider = read("./RazielSessionProvider2029.jsx");
const sessionSource = read("./razielSession2029.js");
const requestSource = read("./razielSessionRequest2029.js");
const gateSource = read("./razielOneShotGate2029.js");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const actions = read("../../components/experience2029/RazielOneShotActions2029.jsx");
const offer = read("../../components/experience2029/RazielOneShotOffer2029.jsx");

const ready = { plan_meta: { canonical_result_bundle: { contract: "public-number-research-run-v1", status: "ready", numbers: [337] } } };
const snapshot = createRazielRequestContextSnapshot({ subject: { type: "expression", id: "שאול", label: "שאול" } });

// A real completed turn through the real reducer, so thread/continuation shapes are the production ones.
function answered({ response = ready, level = "fast", viewMode = null, question = "מה זה 337?" } = {}) {
  let state = createInitialRazielSessionState();
  const turn = { id: "t1", question, intelligenceLevel: level, again: false, projection: "desktop", startedAt: "2026-10-25T00:00:00Z", continuation: { contextSnapshot: snapshot, facts: "שורש עמוד: 337", viewMode: viewMode || "general" } };
  state = razielSessionReducer(state, { type: "turn_started", turn, contextSnapshot: snapshot });
  const provenance = createRazielProvenance({ response: { answer: "תשובה", ...response }, turn, completedAt: "2026-10-25T00:00:01Z" });
  return razielSessionReducer(state, createRazielTurnSucceededAction({ state, response: { answer: "תשובה", intelligenceLevel: level, deterministic: false, sourceNames: [] }, provenance, completedAt: "z" }));
}
const submission = (extra) => prepareRazielSessionSubmission({ question: "מה זה 337?", state: answered(), researchContext: null, facts: "", view: {}, projection: "desktop", startedAt: "s", createTurnId: () => "t2", ...extra });

test("labels, spec and copy: two one-shot actions, spec lazy, copy lazy", () => {
  assert.deepEqual({ ...RAZIEL_ONE_SHOT_LABEL }, { surprise: "✨ הפתע אותי", map: "🗺️ פתח מפת מחקר" });
  assert.deepEqual(JSON.parse(JSON.stringify(RAZIEL_ONE_SHOT_SPEC)), { surprise: { mode: "surprise", level: "deep" }, map: { mode: "landscape", level: "fast" } });
  assert.equal(RAZIEL_ONE_SHOT_COPY.surprise.explanation, "רזיאל יחפש קשר לא צפוי בתוך העובדות המאומתות, ויפריד בין עובדה, פרשנות והשערה.");
  assert.equal(RAZIEL_ONE_SHOT_COPY.surprise.noMaterial, "אין עדיין מספיק חומר להפתעה.");
  assert.match(RAZIEL_ONE_SHOT_COPY.map.noMaterial, /אין עדיין מספיק חומר/);
  assert.equal(RAZIEL_DEFAULT_VIEW_MODE, "general");
  assert.equal(razielViewModeLabel("landscape"), "מפת מחקר");
});

test("bundleStatus lives in the request module's provenance and reflects only an object status on THAT answer", () => {
  assert.match(requestSource, /bundleStatus: cleanInline\(isObject\(plan\.canonical_result_bundle\)/);
  assert.doesNotMatch(sessionSource, /bundleStatus: cleanInline/, "the session module never builds provenance");
  const turn = { id: "t1", intelligenceLevel: "fast", startedAt: "x" };
  const prov = (response) => createRazielProvenance({ response: { answer: "תשובה", ...response }, turn, completedAt: "y" });
  assert.equal(prov(ready).bundleStatus, "ready");
  assert.equal(prov({ plan_meta: { canonical_result_bundle: { status: "fallback" } } }).bundleStatus, "fallback");
  assert.equal("bundleStatus" in prov({}), false);
  assert.equal("bundleStatus" in prov({ plan_meta: { canonical_result_bundle: "ready" } }), false);
});

test("selectRazielOneShot: visible on the latest completed answer of any level; ok only with a valid Bundle for exactly that answer", () => {
  assert.deepEqual({ ...selectRazielOneShot(answered()) }, { visible: true, ok: true, question: "מה זה 337?", turnId: "t1" });
  for (const level of ["deep", "deterministic"]) assert.equal(selectRazielOneShot(answered({ level })).ok, true);
  for (const response of [{}, { plan_meta: { canonical_result_bundle: { status: "fallback" } } }]) {
    assert.deepEqual({ ...selectRazielOneShot(answered({ response })) }, { visible: true, ok: false, question: "מה זה 337?", turnId: "t1" });
  }
  assert.equal(selectRazielOneShot({ ...answered(), provenance: { turnId: "other", bundleStatus: "ready" } }).ok, false);
  assert.equal(selectRazielOneShot({ ...answered(), busy: true }).visible, false);
  assert.equal(selectRazielOneShot({ ...answered(), status: "error" }).visible, false);
  assert.equal(selectRazielOneShot(createInitialRazielSessionState()).visible, false);
  assert.equal(selectRazielOneShot(null).visible, false);
});

test("one-shot requests: continuation of the same turn with an explicit per-request mode; the session mode is not an input they change", () => {
  const surprise = submission({ intelligenceLevel: "deep", again: true, continuationTurnId: "t1", viewModeOverride: "exploratory" });
  assert.deepEqual([surprise.request.viewMode, surprise.request.again, surprise.request.intelligenceLevel], ["exploratory", true, "deep"]);
  const map = submission({ intelligenceLevel: "fast", again: true, continuationTurnId: "t1", viewModeOverride: "landscape" });
  assert.deepEqual([map.request.viewMode, map.request.again, map.request.intelligenceLevel], ["landscape", true, "fast"]);
  for (const one of [surprise, map]) {
    assert.equal(one.request.subject, "מה זה 337?");
    assert.equal(one.request.researchContract, "public-number-research-run-v1");
    assert.equal(one.request.facts, "שורש עמוד: 337", "the continuation reuses the original facts and context — the same Bundle inputs");
    assert.equal(one.contextSnapshot.subject.id, "שאול");
  }
  // the session's own mode (default general) is untouched by either one
  assert.equal(answered().viewMode, "general");
  // a plain deepen keeps the mode of the answer it extends, exactly as before
  assert.equal("viewMode" in submission({ intelligenceLevel: "deep", again: true, continuationTurnId: "t1" }).request, false);
  assert.equal(submission({ state: answered({ viewMode: "exploratory" }), intelligenceLevel: "deep", again: true, continuationTurnId: "t1" }).request.viewMode, "exploratory");
});

test("מתפרע is an explicit deep request from the user's choice; general and landscape keep the level they were asked with", () => {
  const exploratorySession = { ...createInitialRazielSessionState(), viewMode: "exploratory" };
  const fromMode = prepareRazielSessionSubmission({ question: "מה זה 337?", state: exploratorySession, researchContext: null, intelligenceLevel: "fast", startedAt: "s", createTurnId: () => "t" });
  assert.deepEqual([fromMode.request.viewMode, fromMode.request.intelligenceLevel], ["exploratory", "deep"]);
  assert.equal(fromMode.turn.intelligenceLevel, "deep");
  const general = prepareRazielSessionSubmission({ question: "מה זה 337?", state: createInitialRazielSessionState(), researchContext: null, intelligenceLevel: "fast", startedAt: "s", createTurnId: () => "t" });
  assert.deepEqual([("viewMode" in general.request), general.request.intelligenceLevel], [false, "fast"]);
  const landscapeContract = prepareRazielSessionSubmission({ question: "מה זה 337?", state: { ...createInitialRazielSessionState(), viewMode: "landscape" }, researchContext: null, intelligenceLevel: "fast", startedAt: "s", createTurnId: () => "t" });
  assert.deepEqual([landscapeContract.request.viewMode, landscapeContract.request.intelligenceLevel], ["landscape", "fast"], "landscape is still accepted by the contract and does not force deep");
  assert.match(requestSource, /normalizeRazielViewMode\(selectedViewMode\) === "exploratory" \? "deep" : intelligenceLevel/);
});

test("reducer: a one-shot turn adds no second user message, leaves the session mode alone, and a map answer is labelled as such", () => {
  let state = answered();
  const turn = { id: "t2", question: "מה זה 337?", intelligenceLevel: "fast", again: true, startedAt: "s", continuation: { contextSnapshot: snapshot, facts: "", viewMode: "landscape" } };
  state = razielSessionReducer(state, { type: "turn_started", turn, contextSnapshot: snapshot });
  assert.equal(state.thread.filter((m) => m.role === "user").length, 1);
  const response = normalizeRazielResponse({ answer: "עוגן: …", plan_meta: { view_mode: { requested: "landscape", applied: true } } }, "fast");
  state = razielSessionReducer(state, createRazielTurnSucceededAction({ state, response, provenance: { turnId: "t2" }, completedAt: "z" }));
  assert.equal(state.viewMode, "general");
  assert.deepEqual([state.thread.at(-1).viewMode, state.thread.at(-1).viewModeApplied], ["landscape", true]);
});

test("provider: submitOneShot is a gate in front of the single AI boundary; the lazy builder and its imports are untouched", () => {
  const body = provider.slice(provider.indexOf("const submitOneShot"), provider.indexOf("const setViewMode"));
  assert.match(body, /await import\("\.\/razielOneShotGate2029\.js"\)/, "gate and spec are a lazy module");
  assert.match(body, /selectRazielOneShot\(stateRef\.current\)/);
  assert.match(body, /if \(!spec \|\| !shot\.ok\) return \{ ok: false, error: "no_material_for_one_shot" \}/);
  assert.ok(body.indexOf("shot.ok") < body.indexOf("return submit("), "refusal happens before submit() — no state change, no request");
  assert.match(body, /intelligenceLevel: spec\.level, again: true, continuationTurnId: shot\.turnId, viewModeOverride: spec\.mode/);
  assert.doesNotMatch(body, /transport|askRaziel|view_mode_set|dispatch|localStorage|sessionStorage|indexedDB|fetch\(/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1, "still exactly one AI call site");
  assert.match(provider, /await loadRequestBuilder\(\)/);
  const imports = provider.split("\n").filter((line) => /^import /.test(line)).join("\n");
  assert.doesNotMatch(imports, /razielSessionRequest2029|razielConversationResolver|researchPlan|gematria\.js|triage|razielOneShot/, "no heavy or lazy-only import came back into the Provider");
  assert.match(provider, /submit,\n\s+setViewMode,\n\s+submitOneShot,/);
  assert.match(requestSource, /const selectedViewMode = continuation\?\.viewMode/, "the pinned continuation precedence line is untouched");
  assert.doesNotMatch(provider, /submitSurprise/);
});

test("weight: gate, spec, copy and panel are lazy-only; the report normaliser moved out of the eager view-mode module", () => {
  for (const [name, source] of [["frame", frame], ["actions", actions], ["provider", provider], ["session", sessionSource]]) {
    const imports = source.split("\n").filter((line) => /^import /.test(line)).join("\n");
    assert.doesNotMatch(imports, /razielOneShot(Gate|Copy|Offer)/, `${name} must not statically import the lazy one-shot modules`);
  }
  assert.doesNotMatch(offer, /RazielSessionProvider2029|ResearchProvider/, "the lazy panel must not pull the Provider graph into a shared chunk");
  assert.match(gateSource, /^import \{ normalizeRazielQuestion \} from "\.\/razielSession2029\.js";/m);
  assert.match(actions, /import\("\.\/RazielOneShotOffer2029\.jsx"\)/);
  assert.doesNotMatch(read("./razielViewMode2029.js"), /normalizeRazielViewModeReport/);
  assert.match(requestSource, /export function normalizeRazielViewModeReport/);
});

test("UI: both actions sit beside 'בדוק לעומק…' on the latest answer, never in the composer; the map is a native collapsible; no mode switch", () => {
  assert.match(frame, /import RazielOneShotActions2029 from "\.\/RazielOneShotActions2029\.jsx"/);
  assert.match(frame, /\{m === lastRaziel && status === "ready" \? <RazielOneShotActions2029 session=\{session\} onRun=\{\(kind\) => session\.submitOneShot\(kind, \{ projection \}\)\} \/> : null\}/);
  assert.ok(frame.indexOf("data-raziel-deepen-preview") < frame.indexOf("<RazielOneShotActions2029"), "next to the deepen action");
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  const composer = chat.slice(chat.indexOf('<form className="sod29-raziel-composer"'));
  assert.doesNotMatch(composer, /OneShot|submitOneShot/);
  assert.doesNotMatch(chat, /setViewMode/);
  assert.match(chat, /m\.viewMode === "landscape" && m\.viewModeApplied \? <details open><summary>מפת מחקר<\/summary><span dir="auto">\{m\.text\}<\/span><\/details>/, "closing the map is a native collapse — the standing mode is untouched");
});

test("component: same action class as deepen, explains first (lazy panel), activates only from the explicit button, blocks without a valid Bundle", () => {
  assert.match(actions, /className="sod29-action" type="button" disabled=\{session\.busy\} aria-expanded=\{open === kind\}/);
  assert.match(actions, /onClick=\{\(\) => toggle\(kind\)\}/, "the first click only opens the explanation");
  assert.equal((actions.match(/onRun\(open\)/g) || []).length, 1);
  assert.match(actions, /\{open && Offer \? <Offer kind=\{open\} session=\{session\} busy=\{session\.busy\} onRun=\{\(\) => \{ close\(\); onRun\(open\); \}\} onClose=\{close\} \/> : null\}/);
  assert.match(offer, /selectRazielOneShot\(session\)\.ok/);
  const noMaterial = offer.slice(offer.indexOf(") : ("), offer.indexOf("</div>\n  );"));
  assert.match(noMaterial, /copy\.noMaterial/);
  assert.doesNotMatch(noMaterial, /data-raziel-oneshot-run|onRun/, "no activation control without a valid Bundle");
  for (const source of [actions, offer, gateSource]) assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(|askRaziel|transport/);
  for (const source of [actions, offer]) assert.doesNotMatch(source, /useEffect|useLayoutEffect/, "opening the chat runs no effect, so no model or network call");
});
