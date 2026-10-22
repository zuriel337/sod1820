import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRazielTranscript,
  buildRazielSessionRequest,
  createInitialRazielSessionState,
  createRazielContextSnapshot,
  createRazielProvenance,
  normalizeRazielResponse,
  razielSessionReducer,
  selectRazielResearchPreview,
} from "./razielSession2029.js";

const providerSource = readFileSync(new URL("./RazielSessionProvider2029.jsx", import.meta.url), "utf8");

test("continuity: desktop and mobile turns share one temporary thread", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "post", id: "5107", label: "בחירות 631" } });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "t1", question: "מה חשוב כאן?", intelligenceLevel: "fast", again: false, projection: "desktop", startedAt: "2026-10-21T12:00:00Z" },
  });
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "2026-10-21T12:00:01Z",
    response: { answer: "זהו ההסבר הראשון.", intelligenceLevel: "fast", deterministic: false, sourceNames: [] },
    provenance: { turnId: "t1" },
  });
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
  assert.equal((providerSource.match(/await pairTransport\(/g) || []).length, 1);
  assert.doesNotMatch(providerSource, /localStorage|sessionStorage|saveItem|saveCurrentResearchPath/);
  assert.equal((providerSource.match(/current\.addToResearch\?\.\(entity\)/g) || []).length, 1);
  const beforeSubmit = providerSource.slice(0, providerSource.indexOf("const submit"));
  assert.doesNotMatch(beforeSubmit, /transport\s*\(/);
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

test("personal pair draft and result stay in the one session without entering the AI transcript", () => {
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, { type: "personal_pair_draft", field: "left", value: "ירושלים" });
  state = razielSessionReducer(state, { type: "personal_pair_draft", field: "right", value: "שומרים" });
  state = razielSessionReducer(state, {
    type: "personal_pair_started",
    expressions: ["ירושלים", "שומרים"],
    turn: { id: "pair-1", projection: "desktop", startedAt: "start" },
  });
  state = razielSessionReducer(state, {
    type: "personal_pair_succeeded",
    completedAt: "end",
    result: {
      outcome: "positive",
      bundle: { findings: [{ id: "uf:pair", subject: { label: "ירושלים ↔ שומרים" } }] },
      contract: "personal-gematria-pair-run-v1",
      traceId: "trace-pair",
      cost: { ai_calls: 0, rpc_calls: 1, retry_count: 0 },
    },
  });

  assert.deepEqual(state.personalPair.draft, { left: "ירושלים", right: "שומרים" });
  assert.equal(state.personalPair.status, "positive");
  assert.equal(state.personalPair.traceId, "trace-pair");
  assert.equal(state.thread.length, 0, "deterministic personal input is not copied into the AI thread");
  assert.equal(buildRazielTranscript(state.thread), "");

  const reset = razielSessionReducer(state, { type: "session_reset" });
  assert.deepEqual(reset.personalPair.draft, { left: "", right: "" });
  assert.equal(reset.personalPair.bundle, null);
});

test("personal pair negative and failed outcomes remain semantically distinct", () => {
  const started = razielSessionReducer(createInitialRazielSessionState(), {
    type: "personal_pair_started",
    expressions: ["משיח", "מלך ישראל"],
    turn: { id: "pair-2", projection: "mobile", startedAt: "start" },
  });
  const negative = razielSessionReducer(started, {
    type: "personal_pair_succeeded",
    completedAt: "end",
    result: { outcome: "negative", bundle: { findings: [] } },
  });
  assert.equal(negative.personalPair.status, "negative");
  assert.match(negative.announcement, /ללא ראיה/);

  const failed = razielSessionReducer(started, {
    type: "personal_pair_failed",
    completedAt: "end",
    error: "engine_failed",
  });
  assert.equal(failed.personalPair.status, "error");
  assert.equal(failed.personalPair.bundle, null);
  assert.match(failed.announcement, /לא הושלמה/);
});

test("numeric follow-up keeps one bounded referent across desktop and mobile", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } });
  let state = createInitialRazielSessionState();
  const first = buildRazielSessionRequest({ question: "מה זה 776?", state, contextSnapshot: snapshot });
  assert.deepEqual(first.conversationResolution.identities, [
    { type: "number", value: 776, identity_key: "number:776" },
  ]);

  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: {
      id: "n1",
      question: first.subject,
      identityResolution: {
        identities: first.conversationResolution.identities,
        explicit_text_computation: false,
      },
      intelligenceLevel: "fast",
      again: false,
      projection: "desktop",
      startedAt: "t1",
    },
  });
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "t2",
    response: { answer: "תשובה", intelligenceLevel: "fast", sourceNames: [] },
    provenance: { turnId: "n1" },
  });

  const followUp = buildRazielSessionRequest({
    question: "אתה יכול לבדוק?",
    state,
    contextSnapshot: snapshot,
  });
  assert.equal(followUp.subject, "אתה יכול לבדוק?");
  assert.equal(followUp.conversationResolution.referential_follow_up, true);
  assert.deepEqual(followUp.conversationResolution.identities, [
    { type: "number", value: 776, identity_key: "number:776" },
  ]);
  assert.doesNotMatch(JSON.stringify(followUp.conversationResolution), /access|provenance|metadata|token/i);
});

test("a new explicit number replaces the prior number instead of inheriting it", () => {
  const state = {
    ...createInitialRazielSessionState(),
    thread: [{
      role: "user",
      text: "מה זה 776?",
      identity_resolution: {
        identities: [{ type: "number", value: 776, identity_key: "number:776" }],
      },
    }],
  };
  const request = buildRazielSessionRequest({ question: "מה זה 1820?", state });
  assert.deepEqual(request.conversationResolution.identities.map((identity) => identity.value), [1820]);
});

test("explicit deepening includes the immediately preceding fast answer without duplicating the user turn", () => {
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: null,
    turn: { id: "d1", question: "מה זה 776?", intelligenceLevel: "fast", again: false, projection: "mobile", startedAt: "t1" },
  });
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "t2",
    response: { answer: "התשובה המהירה האחרונה", intelligenceLevel: "fast", sourceNames: [] },
    provenance: { turnId: "d1" },
  });
  const before = state.thread.length;
  const deep = buildRazielSessionRequest({ question: "מה זה 776?", state, intelligenceLevel: "deep", again: true });
  assert.match(deep.context, /רזיאל: התשובה המהירה האחרונה/);
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: null,
    turn: { id: "d2", question: deep.subject, intelligenceLevel: "deep", again: true, projection: "desktop", startedAt: "t3" },
  });
  assert.equal(state.thread.length, before);
  assert.equal(state.thread.filter((message) => message.role === "user").length, 1);
});
