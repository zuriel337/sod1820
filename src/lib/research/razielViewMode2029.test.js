import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  RAZIEL_DEFAULT_VIEW_MODE,
  RAZIEL_VIEW_MODES,
  RAZIEL_VIEW_MODE_META,
  normalizeRazielViewMode,
  normalizeRazielViewModeReport,
  razielViewModeLabel,
} from "./razielViewMode2029.js";
import {
  createInitialRazielSessionState,
  createRazielProvenance,
  normalizeRazielResponse,
  razielSessionReducer,
} from "./razielSession2029.js";
import { buildRazielSessionRequest } from "./razielSessionRequest2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const provider = read("./RazielSessionProvider2029.jsx");
const supabase = read("../supabase.js");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const selector = read("../../components/experience2029/RazielViewModeSelector2029.jsx");
const css = read("../../components/experience2029/razielViewMode2029.css");

const turn = (overrides = {}) => ({ id: "t1", question: "מה זה 271?", intelligenceLevel: "fast", again: false, startedAt: "2026-10-23T00:00:00Z", ...overrides });

test("closed set of modes, Hebrew labels and honest experiment flags", () => {
  assert.deepEqual([...RAZIEL_VIEW_MODES], ["general", "landscape", "exploratory"]);
  assert.equal(RAZIEL_DEFAULT_VIEW_MODE, "general");
  assert.deepEqual(
    RAZIEL_VIEW_MODES.map((mode) => [mode, RAZIEL_VIEW_MODE_META[mode].label, RAZIEL_VIEW_MODE_META[mode].experimental]),
    [["general", "כללי", false], ["landscape", "נוף", true], ["exploratory", "מתפרע", true]],
  );
  assert.equal(razielViewModeLabel("landscape"), "נוף");
  assert.equal(razielViewModeLabel("nonsense"), "כללי");
});

test("unknown or malformed values normalise to general and never throw", () => {
  for (const value of [undefined, null, "", "  ", 0, 5, {}, [], ["landscape"], "loud", "landscape;x", true]) {
    assert.equal(normalizeRazielViewMode(value), "general", JSON.stringify(value));
  }
  assert.equal(normalizeRazielViewMode(" Landscape "), "landscape");
  assert.equal(normalizeRazielViewMode("exploratory"), "exploratory");
});

test("request: general is byte-identical to the pre-view-mode request; non-general adds only viewMode; axes stay independent", () => {
  const state = createInitialRazielSessionState();
  const base = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "fast" });
  for (const viewMode of [undefined, null, "general", "loud", 7]) {
    const same = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "fast", viewMode });
    assert.deepEqual(same, base);
    assert.equal("viewMode" in same, false);
  }
  const landscape = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "fast", viewMode: "landscape" });
  assert.deepEqual({ ...landscape, viewMode: undefined }, { ...base, viewMode: undefined });
  assert.equal(landscape.viewMode, "landscape");
  assert.equal(landscape.intelligenceLevel, "fast");
  const deepExploratory = buildRazielSessionRequest({ question: "מה זה 271?", state, contextSnapshot: null, intelligenceLevel: "deep", viewMode: "exploratory" });
  assert.equal(deepExploratory.intelligenceLevel, "deep");
  assert.equal(deepExploratory.viewMode, "exploratory");
});

test("session reducer: the mode belongs to the one session — set, normalised, and kept through turns and context changes", () => {
  let state = createInitialRazielSessionState();
  assert.equal(state.viewMode, "general");
  state = razielSessionReducer(state, { type: "view_mode_set", viewMode: "exploratory" });
  assert.equal(state.viewMode, "exploratory");
  assert.strictEqual(razielSessionReducer(state, { type: "view_mode_set", viewMode: "exploratory" }), state, "no-op keeps identity");
  state = razielSessionReducer(state, { type: "view_mode_set", viewMode: "nonsense" });
  assert.equal(state.viewMode, "general");

  state = razielSessionReducer(state, { type: "view_mode_set", viewMode: "landscape" });
  // a full turn on a different surface / context snapshot does not reset the choice
  state = razielSessionReducer(state, { type: "turn_started", turn: turn(), contextSnapshot: { surface: "number" } });
  assert.equal(state.viewMode, "landscape");
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "2026-10-23T00:00:01Z",
    response: { answer: "עוגן: …", intelligenceLevel: "fast", sourceNames: [], viewMode: { requested: "landscape", applied: true, reason: null } },
    provenance: null,
  });
  assert.equal(state.viewMode, "landscape");
  const message = state.thread.at(-1);
  assert.equal(message.viewMode, "landscape");
  assert.equal(message.viewModeApplied, true);
  state = razielSessionReducer(state, { type: "turn_started", turn: turn({ id: "t2" }), contextSnapshot: { surface: "world" } });
  assert.equal(state.viewMode, "landscape");

  // a different person / explicit reset starts a clean general session
  assert.equal(razielSessionReducer(state, { type: "session_reset" }).viewMode, "general");
});

test("responses: general carries no mode report; a non-applied mode is never labelled as that mode's answer", () => {
  const plain = normalizeRazielResponse({ answer: "תשובה", plan_meta: { capability_class: "x" } }, "fast");
  assert.equal("viewMode" in plain, false);

  const applied = normalizeRazielResponse({ answer: "עוגן: …", plan_meta: { view_mode: { requested: "landscape", applied: true } } }, "fast");
  assert.deepEqual(applied.viewMode, { requested: "landscape", applied: true, reason: null });

  const notApplied = normalizeRazielResponse({ answer: "אין חבילה", deterministic: true, plan_meta: { view_mode: { requested: "exploratory", applied: false, reason: "no_canonical_bundle" } } }, "fast");
  assert.deepEqual(notApplied.viewMode, { requested: "exploratory", applied: false, reason: "no_canonical_bundle" });

  assert.equal(normalizeRazielViewModeReport({ plan_meta: { view_mode: { requested: "general", applied: true } } }), null);
  assert.equal(normalizeRazielViewModeReport({ plan_meta: { view_mode: "landscape" } }), null);

  let state = razielSessionReducer(createInitialRazielSessionState(), { type: "turn_started", turn: turn(), contextSnapshot: null });
  state = razielSessionReducer(state, { type: "turn_succeeded", completedAt: "x", response: notApplied, provenance: null });
  assert.equal(state.thread.at(-1).viewModeApplied, false);

  const provenance = createRazielProvenance({ response: { answer: "תשובה", plan_meta: { view_mode: { requested: "landscape", applied: true } } }, turn: turn(), completedAt: "x" });
  assert.equal(provenance.viewMode, "landscape");
  const provenanceNotApplied = createRazielProvenance({ response: { answer: "תשובה", plan_meta: { view_mode: { requested: "landscape", applied: false, reason: "quota" } } }, turn: turn(), completedAt: "x" });
  assert.equal(provenanceNotApplied.viewMode, "landscape:not_applied");
});

test("provider: one AI boundary, the session-owned mode is read at submit, and nothing is persisted", () => {
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
  assert.match(provider, /const selectedViewMode = continuation\?\.viewMode/);
  assert.match(provider, /viewMode: selectedViewMode/);
  assert.match(provider, /const setViewMode = useCallback/);
  assert.match(provider, /dispatch\(\{ type: "view_mode_set", viewMode \}\)/);
  assert.doesNotMatch(provider, /localStorage|sessionStorage|indexedDB/);
  // the dependency list of the memoised value includes the setter and state (which carries viewMode)
  assert.match(provider, /\.\.\.state,/);
  assert.match(provider, /submit,\n\s+setViewMode,/);
});

test("optional session hook is a direct non-throwing context read; the strict hook remains separate", () => {
  const hooks = provider.slice(provider.indexOf("export function useOptionalRazielSession2029"), provider.indexOf("// Headless provider"));
  assert.match(hooks, /export function useOptionalRazielSession2029\(\) \{\n\s+return useContext\(RazielSessionContext2029\);/);
  assert.match(hooks, /export function useRazielSession2029\(\) \{\n\s+const session = useOptionalRazielSession2029\(\);/);
  assert.doesNotMatch(hooks, /try\s*\{|catch\s*\{/);
});

test("askRaziel: view_mode is additive, sent only under the canonical 2029 contract and only when non-general; intelligence_level untouched", () => {
  assert.match(supabase, /researchContract = null, viewMode = null \}\)/);
  assert.match(supabase, /\.\.\.\(researchContract === 'public-number-research-run-v1' && \(viewMode === 'landscape' \|\| viewMode === 'exploratory'\) \? \{ view_mode: viewMode \} : \{\}\)/);
  assert.match(supabase, /\.\.\.\(level \? \{ intelligence_level: level \} : \{\}\)/);
  // never reuses the legacy `mode` field (reserved for "advanced")
  assert.doesNotMatch(supabase, /\bmode: viewMode|\bmode: ['"]landscape/);
});

test("UI wiring: one shared selector inside the single RazielNativeChat, App2029 and other surfaces untouched", () => {
  assert.equal((frame.match(/<RazielViewModeSelector2029 \/>/g) || []).length, 1);
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.match(chat, /<RazielViewModeSelector2029 \/>/);
  assert.ok(chat.indexOf("<RazielViewModeSelector2029 />") < chat.indexOf('<div className="sod29-raziel-thread"'));
  assert.ok(chat.indexOf("<RazielViewModeSelector2029 />") < chat.indexOf('<form className="sod29-raziel-composer"'));
  // the selector never submits: it only sets the session mode; the send path is unchanged
  assert.match(chat, /send\(text, "fast"\)/);
  assert.equal((chat.match(/"deep"/g) || []).length, 1);
  assert.doesNotMatch(selector, /submit\(|askRaziel|fetch\(|localStorage/);
  assert.match(frame, /data-raziel-view-mode-answer/);
});

test("a11y semantics: group + toggle buttons with aria-pressed, visible focus, 44px targets, RTL-safe logical CSS, narrow-screen rule", () => {
  assert.match(selector, /role="group"/);
  assert.match(selector, /aria-label="מצב התבוננות של רזיאל"/);
  assert.match(selector, /type="button"/);
  assert.match(selector, /aria-pressed=\{pressed\}/);
  assert.match(selector, /role="status"/);
  assert.match(selector, />ניסוי</);
  assert.match(css, /min-block-size: 44px/);
  assert.match(css, /\.sod29-raziel-viewmode-option:focus-visible \{ outline: 2px solid/);
  assert.match(css, /flex-wrap: wrap/);
  assert.match(css, /@media \(max-width: 420px\)/);
  // RTL: only logical properties — no physical left/right/margin-left/padding-right/width in px for layout
  assert.doesNotMatch(css, /\b(?:left|right|margin-left|margin-right|padding-left|padding-right|text-align:\s*(?:left|right))\b/);
  assert.doesNotMatch(css, /position:\s*(?:fixed|absolute|sticky)/, "never overlays the Raziel header, messages or composer");
});
