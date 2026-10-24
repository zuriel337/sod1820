import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createRazielRequestContextSnapshot,
  createRazielTurnSucceededAction,
} from "./razielSessionRequest2029.js";
import {
  createInitialRazielSessionState,
  razielSessionReducer,
} from "./razielSession2029.js";
import {
  RAZIEL_RESEARCH_SESSION_SCHEMA,
  createRazielResearchSessionRecord2029,
  normalizeRazielResearchSessionRecord2029,
} from "./razielResearchSessionRecord2029.js";

const source = readFileSync(new URL("./razielResearchSessionRecord2029.js", import.meta.url), "utf8");

function completeTurn(state, {
  id,
  question,
  answer,
  startedAt,
  completedAt,
  contextSnapshot,
  provenance = {},
}) {
  let next = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot,
    turn: {
      id,
      question,
      intelligenceLevel: "fast",
      again: false,
      startedAt,
      continuation: { contextSnapshot, facts: "PRIVATE-FACT-PACK", viewMode: "general" },
    },
  });
  next = razielSessionReducer(next, createRazielTurnSucceededAction({
    state: next,
    response: {
      answer,
      intelligenceLevel: "fast",
      deterministic: false,
      sourceNames: ["ספר יצירה"],
    },
    provenance: {
      turnId: id,
      transport: "askRaziel",
      requestedAt: startedAt,
      completedAt,
      intelligenceLevel: "fast",
      traceId: `trace-${id}`,
      sourceNames: ["ספר יצירה"],
      privatePrompt: "MUST-NOT-SURVIVE",
      ...provenance,
    },
    completedAt,
  }));
  return next;
}

test("projects one active Raziel thread into one private Research Workspace representation", () => {
  const context = createRazielRequestContextSnapshot({
    lens: "number",
    subject: { type: "number", id: "776", label: "776", href: "/2029/number/776" },
    journey: { kind: "research_path", id: "12345678-1234-4123-8123-123456789012", position: 2, revisionNo: 4 },
  }, { numberFocus: { expression: "ביאת המשיח", method: "רגיל", result: 776 } }, "2026-10-25T08:00:00Z");
  let state = createInitialRazielSessionState({
    sessionId: "session-776",
    createdAt: "2026-10-25T08:00:00Z",
  });
  state = completeTurn(state, {
    id: "t1",
    question: "מה זה 776?",
    answer: "776 הוא מוקד מחקר.",
    startedAt: "2026-10-25T08:00:00Z",
    completedAt: "2026-10-25T08:00:02Z",
    contextSnapshot: context,
  });
  state = completeTurn(state, {
    id: "t2",
    question: "מה הקשר ל־1820?",
    answer: "נבדוק את נקודות המפגש.",
    startedAt: "2026-10-25T08:01:00Z",
    completedAt: "2026-10-25T08:01:03Z",
    contextSnapshot: context,
  });

  const record = createRazielResearchSessionRecord2029(state, { savedAt: "2026-10-25T08:02:00Z" });
  assert.equal(record.schema, RAZIEL_RESEARCH_SESSION_SCHEMA);
  assert.equal(record.kind, "research_session_representation");
  assert.equal(record.accessScope, "private");
  assert.equal(record.authorization, "server_resolved_on_save");
  assert.deepEqual(record.session, {
    id: "session-776",
    title: "מה זה 776?",
    createdAt: "2026-10-25T08:00:00Z",
    updatedAt: "2026-10-25T08:01:03Z",
    savedAt: "2026-10-25T08:02:00Z",
    status: "ready",
    viewMode: "general",
  });
  assert.equal(record.turns.length, 2);
  assert.deepEqual(record.turns.map((turn) => turn.id), ["t1", "t2"]);
  assert.equal(record.turns[0].startedAt, "2026-10-25T08:00:00Z");
  assert.equal(record.turns[1].completedAt, "2026-10-25T08:01:03Z");
  assert.equal(record.turns[1].context.subject.id, "776");
  assert.equal(record.turns[1].context.focus.number.result, 776);
  assert.equal(record.context.journey.kind, "research_path");
  assert.deepEqual(record.researchPath, {
    id: "12345678-1234-4123-8123-123456789012",
    revisionNo: 4,
    position: 2,
  });
  assert.equal(record.counts.turns, 2);
});

test("the representation is bounded and never copies raw facts, unknown private payload or client authority", () => {
  const context = createRazielRequestContextSnapshot({
    subject: { type: "post", id: "5107", label: "פוסט", href: "https://outside.example/private" },
  }, {}, "now");
  let state = createInitialRazielSessionState({ sessionId: "s-private", createdAt: "start" });
  for (let index = 0; index < 24; index += 1) {
    state = completeTurn(state, {
      id: `t-${index}`,
      question: `שאלה ${index}`,
      answer: `תשובה ${index}`,
      startedAt: `start-${index}`,
      completedAt: `end-${index}`,
      contextSnapshot: { ...context, secret: "PRIVATE-CONTEXT" },
      provenance: { serviceRole: "PRIVATE-SERVICE", rawResponse: "PRIVATE-RAW" },
    });
  }
  state = { ...state, userId: "PRIVATE-USER", tier: "free", entitlement: "blocked" };

  const record = createRazielResearchSessionRecord2029(state, { savedAt: "saved" });
  const serialized = JSON.stringify(record);
  assert.equal(record.turns.length, 20);
  assert.equal(record.session.title, "שאלה 0");
  assert.deepEqual(record.turns.map((turn) => turn.id), Array.from({ length: 20 }, (_, i) => `t-${i + 4}`));
  assert.equal(record.context.subjectHref, undefined);
  assert.doesNotMatch(serialized, /PRIVATE|serviceRole|rawResponse|userId|entitlement|"tier"|FACT-PACK/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|supabase|fetch\(|\.rpc\(|insert\(|upsert\(/i);
});

test("missing numeric focus remains absent and is never normalized into zero", () => {
  const normalized = normalizeRazielResearchSessionRecord2029({
    schema: RAZIEL_RESEARCH_SESSION_SCHEMA,
    session: { id: "session-number" },
    context: {
      subject: { type: "number", id: "73" },
      focus: { number: { expression: "חכמה", result: "" } },
    },
    turns: [{ id: "t", question: "חכמה?", answer: "נבדוק.", context: { subject: { type: "number", id: "73" } } }],
  });
  assert.equal(normalized.context.focus.number.result, undefined);
});

test("normalization rejects foreign schemas and fail-closes authority while retaining safe transcript data", () => {
  assert.equal(normalizeRazielResearchSessionRecord2029(null), null);
  assert.equal(normalizeRazielResearchSessionRecord2029({ schema: "other" }), null);
  assert.equal(normalizeRazielResearchSessionRecord2029({ schema: RAZIEL_RESEARCH_SESSION_SCHEMA, session: { id: "s" }, turns: [] }), null);

  const normalized = normalizeRazielResearchSessionRecord2029({
    schema: RAZIEL_RESEARCH_SESSION_SCHEMA,
    kind: "canonical_fact",
    accessScope: "public",
    authorization: "client_admin",
    session: { id: "session-1", status: "published", viewMode: "landscape" },
    context: {
      subject: { type: "number", id: "73", label: "חכמה", secret: "PRIVATE" },
      subjectHref: "//evil.example/x",
      focus: { number: { expression: "חכמה", result: 73, private: "PRIVATE" } },
      sourceNames: ["מקור", "מקור"],
    },
    turns: [{
      id: "turn-1",
      question: "מה יש על חכמה?",
      answer: "חכמה בגימטריה רגילה היא 73.",
      intelligenceLevel: "fast",
      sourceNames: ["מקור"],
      context: { subject: { type: "number", id: "73", label: "חכמה" } },
      provenance: { traceId: "trace", privatePrompt: "PRIVATE" },
      secret: "PRIVATE",
    }],
  });

  assert.equal(normalized.kind, "research_session_representation");
  assert.equal(normalized.accessScope, "private");
  assert.equal(normalized.authorization, "server_resolved_on_save");
  assert.equal(normalized.session.status, "ready");
  assert.equal(normalized.context.subjectHref, undefined);
  assert.deepEqual(normalized.context.sourceNames, ["מקור"]);
  assert.equal(normalized.turns[0].provenance.traceId, "trace");
  assert.doesNotMatch(JSON.stringify(normalized), /PRIVATE|client_admin|canonical_fact|published/);
});

test("empty and incomplete active sessions are not saveable representations", () => {
  assert.equal(createRazielResearchSessionRecord2029(createInitialRazielSessionState()), null);
  assert.equal(createRazielResearchSessionRecord2029(createInitialRazielSessionState({ sessionId: "empty" })), null);
});
