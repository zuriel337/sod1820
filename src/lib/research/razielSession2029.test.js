import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { askRaziel, supabase } from "../supabase.js";
import {
  buildRazielSessionRequest,
  createRazielContinuationSnapshot,
  createRazielProvenance,
  createRazielRequestContextSnapshot as createRazielContextSnapshot,
  createRazielTurnSucceededAction,
  normalizeRazielResponse,
  selectRazielContinuation,
} from "./razielSessionRequest2029.js";
import {
  createInitialRazielSessionState,
  razielSessionReducer,
  selectRazielDeepeningCandidate,
  selectRazielResearchPreview,
} from "./razielSession2029.js";

const providerSource = readFileSync(new URL("./RazielSessionProvider2029.jsx", import.meta.url), "utf8");
const sessionSource = readFileSync(new URL("./razielSession2029.js", import.meta.url), "utf8");
const requestSource = readFileSync(new URL("./razielSessionRequest2029.js", import.meta.url), "utf8");
const loaderSource = readFileSync(new URL("./razielSessionRequestLoader2029.js", import.meta.url), "utf8");

test("continuity: desktop and mobile turns share one temporary thread", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "post", id: "5107", label: "בחירות 631" } });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "t1", question: "מה חשוב כאן?", intelligenceLevel: "fast", again: false, projection: "desktop", startedAt: "2026-10-21T12:00:00Z" },
  });
  state = razielSessionReducer(state, createRazielTurnSucceededAction({
    state,
    completedAt: "2026-10-21T12:00:01Z",
    response: { answer: "זהו ההסבר הראשון.", intelligenceLevel: "fast", deterministic: false, sourceNames: [] },
    provenance: { turnId: "t1" },
  }));
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "t2", question: "ומה הצעד הבא?", intelligenceLevel: "fast", again: false, projection: "mobile", startedAt: "2026-10-21T12:01:00Z" },
  });

  assert.deepEqual(state.thread.map((message) => message.role), ["user", "raziel", "user"]);
  assert.equal(state.thread[1].text, "זהו ההסבר הראשון.");
  assert.equal(state.currentTurn.projection, "mobile");
  assert.equal(state.busy, true);
});

test("continuity request carries the canonical opt-in and bounded resolved identities", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "a", question: "מה זה 776?", intelligenceLevel: "fast", again: false, projection: "desktop", startedAt: "t0" },
  });
  state = razielSessionReducer(state, createRazielTurnSucceededAction({
    state,
    completedAt: "t1",
    response: { answer: "תשובה", intelligenceLevel: "fast", deterministic: false, sourceNames: [] },
    provenance: { turnId: "a" },
  }));

  const request = buildRazielSessionRequest({ question: "ומה הקשר ל־1820?", state, contextSnapshot: snapshot });
  assert.equal(request.researchContract, "public-number-research-run-v1");
  assert.match(request.context, /משתמש: מה זה 776\?\nרזיאל: תשובה/);
  assert.equal(request.conversationResolution?.referential_follow_up, true);
  assert.deepEqual(request.conversationResolution?.pair, [776, 1820]);
  assert.equal(request.conversationResolution?.guards?.server_must_reauthorize, true);
});

test("expression continuation keeps the last canonical subject across action and view-mode wording", () => {
  const baseThread = [{
    role: "user",
    text: "חשב את צוריאל ומצא הצלבות",
    identity_resolution: {
      identities: [{ type: "phrase", label: "צוריאל", identity_key: "phrase:צוריאל" }],
      explicit_text_computation: false,
    },
  }, { role: "raziel", text: "צוריאל = 337" }];
  const first = buildRazielSessionRequest({
    question: "תחשב את זה בכל השיטות ומצא הצלבות",
    state: { ...createInitialRazielSessionState(), thread: baseThread },
    contextSnapshot: null,
  });
  assert.equal(first.conversationResolution?.referential_follow_up, true);
  assert.equal(first.conversationResolution?.referent_source, "prior_user_turn");
  assert.equal(first.conversationResolution?.requested_action, "connect");
  assert.deepEqual(first.conversationResolution?.identities, [
    { type: "phrase", label: "צוריאל", identity_key: "phrase:צוריאל" },
  ]);

  const second = buildRazielSessionRequest({
    question: "תחשב במצב רגיל",
    state: { ...createInitialRazielSessionState(), thread: baseThread },
    contextSnapshot: null,
  });
  assert.equal(second.conversationResolution?.referential_follow_up, true);
  assert.equal(second.conversationResolution?.referent_source, "prior_user_turn");
  assert.deepEqual(second.conversationResolution?.identities, [
    { type: "phrase", label: "צוריאל", identity_key: "phrase:צוריאל" },
  ]);
  assert.doesNotMatch(JSON.stringify(second.conversationResolution), /phrase:במצב רגיל/);
});

test("deep continuation keeps the original bounded context, facts and view mode after navigation", () => {
  const originalContext = createRazielContextSnapshot({
    lens: "post",
    subject: { type: "post", id: "5107", label: "בחירות 631", href: "/2029/post/5107" },
  }, { readingFocus: { primary: "הפסקה המקורית", sourceLabel: "ספר יצירה" } }, "2026-10-24T10:00:00Z");
  const continuation = createRazielContinuationSnapshot({
    contextSnapshot: originalContext,
    facts: `עובדה מקורית\n${"א".repeat(1500)}`,
    viewMode: "landscape",
  });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: originalContext,
    turn: {
      id: "original-turn",
      question: "מה חשוב כאן?",
      intelligenceLevel: "fast",
      again: false,
      continuation,
    },
  });
  state = razielSessionReducer(state, createRazielTurnSucceededAction({
    state,
    completedAt: "2026-10-24T10:00:01Z",
    response: { answer: "תשובה ראשונה", intelligenceLevel: "fast", deterministic: false, sourceNames: ["ספר יצירה"] },
    provenance: { turnId: "original-turn" },
  }));
  state = razielSessionReducer(state, { type: "view_mode_set", viewMode: "exploratory" });

  const restored = selectRazielContinuation(state.thread, { question: "מה חשוב כאן?" });
  const navigatedContext = createRazielContextSnapshot({ subject: { type: "world", id: "new", label: "עולם אחר", href: "/world/new" } });
  const deepRequest = buildRazielSessionRequest({
    question: "מה חשוב כאן?",
    state,
    contextSnapshot: restored.contextSnapshot || navigatedContext,
    facts: restored.facts,
    intelligenceLevel: "deep",
    again: true,
    viewMode: restored.viewMode,
  });

  assert.equal(restored.contextSnapshot.subject.id, "5107");
  assert.equal(restored.contextSnapshot.focus.reading.primary, "הפסקה המקורית");
  assert.equal(restored.facts.length, 1200);
  assert.equal(restored.viewMode, "landscape");
  assert.equal(deepRequest.surfaceSemantic.subject.id, "5107");
  assert.equal(deepRequest.surfaceSemantic.context.subjectHref, "/2029/post/5107");
  assert.match(deepRequest.context, /מוקד המחקר: בחירות 631/);
  assert.doesNotMatch(deepRequest.context, /עולם אחר/);
  assert.doesNotMatch(JSON.stringify(deepRequest), /\/world\/new/);
  assert.equal(deepRequest.facts, restored.facts);
  assert.equal(deepRequest.viewMode, "landscape");
  assert.equal(deepRequest.intelligenceLevel, "deep");
  assert.match(requestSource, /const continuation = again \? selectRazielContinuation/);
  assert.match(requestSource, /const contextSnapshot = continuation\?\.contextSnapshot/);
  assert.match(requestSource, /const selectedFacts = continuation \? continuation\.facts : facts/);
  assert.match(requestSource, /const selectedViewMode = continuation\?\.viewMode/);
});

test("a sourced answer keeps per-message sources and grounding after the next turn fails", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } });
  const continuation = createRazielContinuationSnapshot({ contextSnapshot: snapshot, facts: "מקור", viewMode: "general" });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "sourced", question: "מה זה 776?", intelligenceLevel: "fast", again: false, continuation },
  });
  state = razielSessionReducer(state, createRazielTurnSucceededAction({
    state,
    completedAt: "t1",
    response: { answer: "תשובה מבוססת", intelligenceLevel: "fast", deterministic: false, sourceNames: ["ספר יצירה"] },
    provenance: { turnId: "sourced", sourceNames: ["ספר יצירה"] },
  }));
  assert.equal(selectRazielDeepeningCandidate(state)?.turnId, "sourced");
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: createRazielContextSnapshot({ subject: { type: "world", id: "w", label: "עולם" } }),
    turn: { id: "failed", question: "שאלה חדשה", intelligenceLevel: "fast", again: false },
  });
  state = razielSessionReducer(state, { type: "turn_failed", completedAt: "t2", error: "transport_failed" });

  const sourcedAnswer = state.thread.find((message) => message.role === "raziel");
  assert.deepEqual(sourcedAnswer.sourceNames, ["ספר יצירה"]);
  assert.equal(sourcedAnswer.grounding, "sourced");
  assert.equal(sourcedAnswer.continuation.viewMode, "general");
  assert.equal(state.provenance, null);
  assert.equal(state.status, "error");
  assert.equal(selectRazielDeepeningCandidate(state), null, "a failed newer turn suppresses deepening of the older answer");
});

test("privacy: snapshot is bounded and excludes access, raw page data and private metadata", () => {
  const snapshot = createRazielContextSnapshot({
    subject: { type: "post", id: "5107", label: "<b>בחירות</b>" },
    lens: "post",
    access: { token: "DO-NOT-COPY", scope: "private" },
    privateNotes: "PRIVATE-NOTE",
    dimensions: {
      readingFocus: { label: "פרק א", primary: "הפסקה הפעילה", sourceLabel: "Sefer Yetzirah", rawHtml: "<script>secret()</script>" },
      surfaceFindings: [{ label: "א", sourceLabel: "ספר יצירה", payload: "SECRET-PAYLOAD" }],
    },
  }, { sources: [{ original_name: "Kitab al-Khazari" }] }, "2026-10-21T12:00:00Z");
  const serialized = JSON.stringify(snapshot);

  assert.match(snapshot.description, /מוקד המחקר: בחירות/);
  assert.deepEqual(snapshot.sourceNames, ["Kitab al-Khazari", "Sefer Yetzirah", "ספר יצירה"]);
  assert.doesNotMatch(serialized, /DO-NOT-COPY|PRIVATE-NOTE|SECRET-PAYLOAD|rawHtml|<script>|<b>/);
  assert.ok(serialized.length < 1800);
});

test("privacy: absent numeric values do not become invented zeroes", () => {
  const snapshot = createRazielContextSnapshot({
    subject: { type: "number", id: "631", label: "631" },
  }, { numberFocus: { root: "631", resultValue: null } });
  const provenance = createRazielProvenance({
    response: { v: 1, answer: "תשובה", usage: {} },
    turn: { id: "turn-1", intelligenceLevel: "fast" },
    completedAt: null,
  });

  assert.equal("result" in snapshot.focus.number, false);
  assert.equal("usage" in provenance, false);
});

test("cost: request is bounded and the provider has one explicit transport boundary only", () => {
  const state = {
    ...createInitialRazielSessionState(),
    thread: [
      { role: "user", text: "א".repeat(400) },
      { role: "raziel", text: "ב".repeat(400) },
      { role: "user", text: "ג".repeat(400) },
    ],
  };
  const contextSnapshot = createRazielContextSnapshot({ subject: { type: "number", id: "631", label: "631" } });
  const request = buildRazielSessionRequest({ question: "ד".repeat(500), state, contextSnapshot, facts: "ה".repeat(2000) });

  assert.equal(request.subject.length, 300);
  assert.ok(request.context.length <= 600);
  assert.ok(request.facts.length <= 1200);
  assert.equal((providerSource.match(/await transport\(request\)/g) || []).length, 1);
  assert.doesNotMatch(providerSource, /localStorage|sessionStorage|saveItem|addToResearch|saveCurrentResearchPath/);
  const beforeSubmit = providerSource.slice(0, providerSource.indexOf("const submit"));
  assert.doesNotMatch(beforeSubmit, /transport\s*\(/);
  assert.match(providerSource, /if \(!mountedRef\.current\) return \{ ok: false, error: "session_unmounted" \}/);
});

test("performance: conversation resolution loads only after an explicit, synchronously captured submit", () => {
  assert.doesNotMatch(sessionSource, /razielConversationResolver/);
  assert.doesNotMatch(providerSource, /razielConversationResolver/);
  assert.match(requestSource, /from "\.\/razielConversationResolver\.js"/);
  assert.match(loaderSource, /\(\) => import\("\.\/razielSessionRequest2029\.js"\)/);

  const submit = providerSource.slice(
    providerSource.indexOf("const submit = useCallback"),
    providerSource.indexOf("const setViewMode = useCallback"),
  );
  const captureState = submit.indexOf("const capturedState = stateRef.current");
  const claimFlight = submit.indexOf("inFlightRef.current = true");
  const loadBuilder = submit.indexOf("await loadRequestBuilder()");
  const prepareSubmission = submit.indexOf("prepareSubmission({");
  const startTurn = submit.indexOf('dispatch({ type: "turn_started"');
  const callTransport = submit.indexOf("await transport(request)");

  assert.ok(captureState >= 0 && captureState < claimFlight);
  assert.ok(claimFlight < loadBuilder && loadBuilder < prepareSubmission);
  assert.ok(prepareSubmission < startTurn && startTurn < callTransport);
  assert.ok(requestSource.indexOf("const continuation = again ? selectRazielContinuation")
    < requestSource.indexOf("const contextSnapshot = continuation?.contextSnapshot"));
  assert.match(submit, /dispatch\(\{ type: "turn_preparing"/);
  assert.match(submit, /let failure = "request_builder_unavailable"/);
  assert.equal((submit.match(/await transport\(request\)/g) || []).length, 1);
});

test("preparing state locks the shared session without appending a partial user turn", () => {
  const initial = {
    ...createInitialRazielSessionState(),
    thread: [{ role: "raziel", text: "תשובה קודמת" }],
  };
  const prepared = razielSessionReducer(initial, {
    type: "turn_preparing",
    contextSnapshot: { surface: "post" },
    turn: { id: "pending", question: "שאלה", intelligenceLevel: "fast", again: false },
  });

  assert.equal(prepared.busy, true);
  assert.equal(prepared.currentTurn.status, "preparing");
  assert.strictEqual(prepared.thread, initial.thread);
  assert.equal(prepared.announcement, "רזיאל מכין את המחקר…");

  const failed = razielSessionReducer(prepared, {
    type: "turn_failed",
    completedAt: "later",
    error: "request_builder_unavailable",
  });
  assert.strictEqual(failed.thread, initial.thread);
  assert.equal(failed.currentTurn.error, "request_builder_unavailable");
  assert.equal(failed.busy, false);
});

test("headless accessibility contract exposes Hebrew status announcements and human context", () => {
  const snapshot = createRazielContextSnapshot({
    subject: { type: "book", id: "yesod", label: "יסוד החכמה" },
    dimensions: { readingFocus: { primary: "שער א", sourceLabel: "Sha'arei Orah" } },
  });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "t1", question: "הסבר", intelligenceLevel: "fast", again: false, startedAt: "now" },
  });
  assert.equal(state.announcement, "רזיאל חושב…");
  assert.match(state.contextSnapshot.description, /מוקד המחקר: יסוד החכמה/);
  assert.match(state.contextSnapshot.description, /מקורות: Sha'arei Orah/);
  state = razielSessionReducer(state, { type: "turn_failed", completedAt: "later", error: "transport_failed" });
  assert.match(state.announcement, /לא הצליח לענות/);
});

test("provenance is explicit, bounded and preserves source names in their original language", () => {
  const raw = {
    v: 1,
    answer: "תשובה",
    intelligence_level: "fast",
    trace_id: "trace-1",
    engine: "raziel",
    model: "fast-model",
    sources: [{ original_name: "The Zohar" }, { source_name: "ספר הזוהר" }],
    plan_meta: { capability_class: "general_synthesis", private_prompt: "DO-NOT-COPY" },
    usage: { input_tokens: 120, output_tokens: 40 },
  };
  const turn = { id: "turn-1", intelligenceLevel: "fast", startedAt: "start" };
  const response = normalizeRazielResponse(raw, "fast");
  const provenance = createRazielProvenance({ response: raw, turn, completedAt: "end" });

  assert.deepEqual(response.sourceNames, ["The Zohar", "ספר הזוהר"]);
  assert.equal(provenance.transport, "askRaziel");
  assert.equal(provenance.traceId, "trace-1");
  assert.deepEqual(provenance.usage, { inputTokens: 120, outputTokens: 40 });
  assert.doesNotMatch(JSON.stringify(provenance), /private_prompt|DO-NOT-COPY/);
});

test("askRaziel transports only allowlisted top-level provenance through contract and fallback responses", async () => {
  const calls = [];
  const replies = [
    {
      data: {
        raziel: { answer: "תשובת חוזה" },
        trace_id: "trace-contract",
        engine: "claude",
        model: "model-contract",
        usage: { input_tokens: 21, output_tokens: 8, secret_cost: 999 },
        private_payload: { prompt: "DO-NOT-COPY" },
      },
      error: null,
    },
    {
      data: {
        analysis: "תשובת fallback",
        trace_id: "trace-fallback",
        engine: "claude-fallback",
        model: "model-fallback",
        usage: { inputTokens: 13, outputTokens: 5, raw: "DO-NOT-COPY" },
        internal_debug: "DO-NOT-COPY",
      },
      error: null,
    },
    {
      data: {
        raziel: {
          answer: "חוזה בעל metadata",
          trace_id: "trace-owned",
          engine: "engine-owned",
          model: "model-owned",
          usage: { input_tokens: 1, output_tokens: 2 },
        },
        trace_id: "trace-envelope-authority",
        engine: "engine-envelope-authority",
        model: "model-envelope-authority",
        usage: { input_tokens: 100, output_tokens: 200 },
      },
      error: null,
    },
    {
      data: {
        raziel: {
          answer: "חוזה ללא מעטפת provenance",
          trace_id: "trace-model-spoof",
          engine: "engine-model-spoof",
          model: "model-model-spoof",
          usage: { input_tokens: 300, output_tokens: 400 },
        },
      },
      error: null,
    },
  ];
  const ownFunctions = Object.getOwnPropertyDescriptor(supabase, "functions");
  const originalRpc = supabase.rpc;
  Object.defineProperty(supabase, "functions", {
    configurable: true,
    value: {
      invoke: async (name, options) => {
        calls.push({ name, body: options.body });
        return replies.shift();
      },
    },
  });
  supabase.rpc = async () => ({ data: null, error: null });

  try {
    const contractRaw = await askRaziel({
      subject: "שאלת חוזה",
      facts: "עובדות",
      intelligenceLevel: "fast",
      researchContract: "public-number-research-run-v1",
    });
    const contractResponse = normalizeRazielResponse(contractRaw, "fast");
    const contractProvenance = createRazielProvenance({
      response: contractRaw,
      turn: { id: "contract-turn", intelligenceLevel: "fast", startedAt: "start" },
      completedAt: "end",
    });
    assert.equal(contractResponse.answer, "תשובת חוזה");
    assert.equal(contractProvenance.traceId, "trace-contract");
    assert.equal(contractProvenance.engine, "claude");
    assert.equal(contractProvenance.model, "model-contract");
    assert.deepEqual(contractProvenance.usage, { inputTokens: 21, outputTokens: 8 });
    assert.deepEqual(Object.keys(contractRaw).sort(), ["answer", "engine", "model", "trace_id", "usage", "v"]);
    assert.doesNotMatch(JSON.stringify(contractRaw.usage), /secret_cost|DO-NOT-COPY/);
    assert.equal("private_payload" in contractRaw, false);

    const fallbackRaw = await askRaziel({ subject: "שאלת Legacy", facts: "עובדות Legacy" });
    const fallbackResponse = normalizeRazielResponse(fallbackRaw, "fast");
    const fallbackProvenance = createRazielProvenance({
      response: fallbackRaw,
      turn: { id: "fallback-turn", intelligenceLevel: "fast", startedAt: "start" },
      completedAt: "end",
    });
    assert.equal(fallbackResponse.answer, "תשובת fallback");
    assert.equal(fallbackProvenance.traceId, "trace-fallback");
    assert.equal(fallbackProvenance.engine, "claude-fallback");
    assert.equal(fallbackProvenance.model, "model-fallback");
    assert.deepEqual(fallbackProvenance.usage, { inputTokens: 13, outputTokens: 5 });
    assert.deepEqual(Object.keys(fallbackRaw).sort(), ["answer", "engine", "model", "trace_id", "usage", "v"]);
    assert.equal("internal_debug" in fallbackRaw, false);

    const collision = await askRaziel({ subject: "שאלת override", facts: "עובדות" });
    assert.equal(collision.trace_id, "trace-envelope-authority");
    assert.equal(collision.engine, "engine-envelope-authority");
    assert.equal(collision.model, "model-envelope-authority");
    assert.deepEqual(collision.usage, { input_tokens: 100, output_tokens: 200 });

    const noEnvelope = await askRaziel({ subject: "שאלת provenance חסר", facts: "עובדות" });
    assert.equal(noEnvelope.answer, "חוזה ללא מעטפת provenance");
    assert.equal("trace_id" in noEnvelope, false);
    assert.equal("engine" in noEnvelope, false);
    assert.equal("model" in noEnvelope, false);
    assert.equal("usage" in noEnvelope, false);

    assert.equal(calls.every((call) => call.name === "ai-analyze"), true);
    assert.deepEqual(calls[1].body, {
      kind: "research",
      persona: "raziel",
      subject: "שאלת Legacy",
      facts: "עובדות Legacy",
      context: null,
      path: null,
      again: false,
      metatron: false,
      visitor_id: null,
    });
  } finally {
    supabase.rpc = originalRpc;
    if (ownFunctions) Object.defineProperty(supabase, "functions", ownFunctions);
    else delete supabase.functions;
  }
});

test("ResearchProvider preview is read-only and compact; it does not copy research actions", () => {
  const research = {
    saved: [
      { id: "1", type: "post", title: "א", sourceLabel: "Source A" },
      { id: "2", type: "number", title: "ב" },
      { id: "3", type: "book", title: "ג" },
      { id: "4", type: "topic", title: "ד" },
    ],
    cart: [{ id: "c1", type: "post" }],
    collections: [{ id: "k1" }],
    syncStatus: "synced",
    saveItem: () => { throw new Error("must not be copied"); },
  };
  const preview = selectRazielResearchPreview(research);

  assert.equal(preview.source, "ResearchProvider");
  assert.equal(preview.savedCount, 4);
  assert.equal(preview.saved.length, 3);
  assert.equal(preview.cartCount, 1);
  assert.equal(preview.collectionsCount, 1);
  assert.equal("saveItem" in preview, false);
});
