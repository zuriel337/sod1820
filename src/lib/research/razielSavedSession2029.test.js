import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRazielSavedSessionEntity,
  normalizeRazielSavedSessionEntity,
  normalizeRazielSavedSessionTitle,
  RAZIEL_SAVED_SESSION_SCHEMA,
  RAZIEL_SAVED_SESSION_TYPE,
  razielSavedSessionState,
  selectRazielSavedSessions,
} from "./razielSavedSession2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "./razielSession2029.js";
import { applyResearchOps, emptyResearchState } from "./researchSyncState.js";

const providerSource = readFileSync(new URL("./RazielSessionProvider2029.jsx", import.meta.url), "utf8");
const frameSource = readFileSync(new URL("../../components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

function completedState() {
  return {
    ...createInitialRazielSessionState(),
    status: "ready",
    viewMode: "exploratory",
    contextSnapshot: { subject: { type: "phrase", id: "שאול", label: "שאול" } },
    thread: [{
      role: "user",
      text: "בדוק לי גימטריה של שאול",
      turnId: "turn-1",
      identity_resolution: {
        identities: [{ type: "phrase", label: "שאול", identity_key: "phrase:שאול" }],
        guards: { server_must_reauthorize: true },
      },
      secretIgnored: "never-save-me",
    }, {
      role: "raziel",
      text: "שאול = 337. זו תשובה מלאה.",
      question: "בדוק לי גימטריה של שאול",
      turnId: "turn-1",
      level: "deep",
      sourceNames: ["מאגר הגימטריה המאומת", "מאגר הגימטריה המאומת"],
      grounding: "sourced",
      viewMode: "exploratory",
      viewModeApplied: true,
      continuation: { facts: "שאול = 337", viewMode: "exploratory" },
      evidenceSummary: { facts: [{ expression: "שאול", value: 337 }] },
      providerSecret: "never-save-me-either",
    }],
  };
}

test("explicit save projects the complete bounded conversation without inventing a second store", () => {
  const result = buildRazielSavedSessionEntity(completedState(), {
    now: () => "2026-10-26T12:00:00.000Z",
    createId: () => "unused",
  });
  assert.equal(result.ok, true);
  assert.equal(result.entity.type, RAZIEL_SAVED_SESSION_TYPE);
  assert.equal(result.entity.schema, RAZIEL_SAVED_SESSION_SCHEMA);
  assert.equal(result.entity.ref, "turn-1");
  assert.equal(result.entity.id, "raziel-session:turn-1");
  assert.equal(result.entity.title, "בדוק לי גימטריה של שאול");
  assert.equal(result.entity.message_count, 2);
  assert.equal(result.entity.turn_count, 1);
  assert.equal(result.entity.view_mode, "exploratory");
  assert.deepEqual(result.entity.thread[1].sourceNames, ["מאגר הגימטריה המאומת"]);
  assert.equal(result.entity.thread[1].continuation.facts, "שאול = 337");
  assert.equal(result.entity.thread[1].evidenceSummary.facts[0].value, 337);
  assert.doesNotMatch(JSON.stringify(result.entity), /never-save-me/);
});

test("saving an already saved conversation updates the same stable library identity", () => {
  const state = { ...completedState(), sessionRef: "stable-session" };
  const first = buildRazielSavedSessionEntity(state, { now: () => "2026-10-26T12:00:00Z" });
  const second = buildRazielSavedSessionEntity({ ...state, thread: [...state.thread, { role: "user", text: "המשך", turnId: "turn-2" }] }, {
    now: () => "2026-10-26T12:05:00Z",
  });
  assert.equal(first.entity.id, "raziel-session:stable-session");
  assert.equal(second.entity.id, first.entity.id);
  assert.equal(second.entity.turn_count, 2);
});

test("renaming keeps the saved conversation identity and payload unchanged", () => {
  const original = buildRazielSavedSessionEntity(completedState(), { now: () => "2026-10-26T12:00:00Z" }).entity;
  const title = normalizeRazielSavedSessionTitle("  <b>השיחה של שאול</b>\u0000  ");
  assert.equal(title, "השיחה של שאול");
  assert.equal(normalizeRazielSavedSessionTitle("   "), null);
  assert.equal(normalizeRazielSavedSessionTitle("א".repeat(120)).length, 96);
  const renamed = { ...original, title };
  const state = applyResearchOps(emptyResearchState(), [
    { kind: "item_upsert", bucket: "library", entity: original },
    { kind: "item_upsert", bucket: "library", entity: renamed },
  ]);
  assert.equal(state.saved.length, 1);
  assert.equal(state.saved[0].id, original.id);
  assert.equal(state.saved[0].type, original.type);
  assert.equal(state.saved[0].ref, original.ref);
  assert.deepEqual(state.saved[0].thread, original.thread);
  assert.equal(state.saved[0].title, "השיחה של שאול");
});

test("invalid, pending and oversized conversations fail closed instead of silently truncating", () => {
  assert.deepEqual(buildRazielSavedSessionEntity({ ...completedState(), busy: true }), { ok: false, error: "session_pending" });
  assert.deepEqual(buildRazielSavedSessionEntity(createInitialRazielSessionState()), { ok: false, error: "session_empty" });
  assert.deepEqual(buildRazielSavedSessionEntity(completedState(), { now: () => "not-a-date" }), { ok: false, error: "session_time_unavailable" });
  const hugeThread = [];
  for (let index = 0; index < 10; index += 1) {
    hugeThread.push({ role: "user", text: `שאלה ${index}`, turnId: `u${index}` });
    hugeThread.push({ role: "raziel", text: "א".repeat(11900), turnId: `u${index}`, level: "deep" });
  }
  assert.equal(buildRazielSavedSessionEntity({ ...completedState(), thread: hugeThread }).error, "session_too_large");
});

test("restore validates the schema and resumes the exact thread and continuation context", () => {
  const built = buildRazielSavedSessionEntity(completedState(), { now: () => "2026-10-26T12:00:00Z" }).entity;
  assert.equal(normalizeRazielSavedSessionEntity({ ...built, type: "post" }), null);
  assert.equal(normalizeRazielSavedSessionEntity({ ...built, schema: "future" }), null);
  assert.equal(normalizeRazielSavedSessionEntity({ ...built, saved_at: "invalid" }).saved_at, null);
  const restored = razielSavedSessionState(built);
  assert.equal(restored.status, "ready");
  assert.equal(restored.viewMode, "exploratory");
  assert.equal(restored.sessionRef, "turn-1");
  assert.deepEqual(restored.contextSnapshot, completedState().contextSnapshot);
  assert.equal(restored.thread[1].continuation.facts, "שאול = 337");
});

test("saved-session selector filters, validates and orders only Raziel sessions", () => {
  const older = buildRazielSavedSessionEntity(completedState(), { now: () => "2026-10-25T12:00:00Z" }).entity;
  const newer = buildRazielSavedSessionEntity({ ...completedState(), sessionRef: "newer" }, { now: () => "2026-10-26T12:00:00Z" }).entity;
  const selected = selectRazielSavedSessions([{ id: "post", type: "post" }, older, newer]);
  assert.deepEqual(selected.map((item) => item.ref), ["newer", "turn-1"]);
});

test("the existing ResearchProvider operation model preserves the resumable payload in its private library", () => {
  const entity = buildRazielSavedSessionEntity(completedState(), { now: () => "2026-10-26T12:00:00Z" }).entity;
  const next = applyResearchOps(emptyResearchState(), [{ kind: "item_upsert", bucket: "library", entity }, {
    kind: "history_add",
    entity: { ...entity, t: 1 },
  }]);
  assert.equal(next.saved.length, 1);
  assert.equal(next.saved[0].thread[1].text, "שאול = 337. זו תשובה מלאה.");
  assert.equal(next.history[0].type, RAZIEL_SAVED_SESSION_TYPE);
  assert.ok(new TextEncoder().encode(JSON.stringify(next.saved[0])).length < 180000);
});

test("session reducer marks save and restores a validated snapshot", () => {
  const saved = razielSessionReducer(completedState(), {
    type: "session_saved",
    sessionRef: "stable",
    savedAt: "2026-10-26T12:00:00Z",
  });
  assert.equal(saved.sessionRef, "stable");
  assert.match(saved.announcement, /נשמרה/);
  const restored = razielSessionReducer(createInitialRazielSessionState(), {
    type: "session_restored",
    state: razielSavedSessionState(buildRazielSavedSessionEntity(completedState(), { now: () => "2026-10-26T12:00:00Z" }).entity),
  });
  assert.equal(restored.thread[0].text, "בדוק לי גימטריה של שאול");
  assert.equal(restored.busy, false);
});

test("provider and chat use the existing ResearchProvider explicitly and keep serialization lazy", () => {
  assert.match(providerSource, /const research = useResearch\(\)/);
  assert.match(providerSource, /await import\("\.\/razielSavedSession2029\.js"\)/);
  assert.match(providerSource, /research\.saveItem\?\.\(built\.entity\)/);
  assert.match(providerSource, /research\.removeSaved\?\.\(selected\.id\)/);
  assert.match(providerSource, /const renameSavedSession = useCallback/);
  assert.match(providerSource, /research\.saveItem\?\.\(entity\)/);
  assert.match(providerSource, /if \(previous\?\.title\) built\.entity\.title = previous\.title/);
  assert.doesNotMatch(providerSource.split("const RazielSessionContext2029")[0], /razielSavedSession2029/);
  assert.doesNotMatch(providerSource, /localStorage|sessionStorage|supabase\.from|fetch\(/);
  assert.match(frameSource, /data-raziel-save-session="true"/);
  assert.match(frameSource, /data-raziel-saved-sessions="true"/);
  assert.match(frameSource, /data-raziel-new-session="true"/);
  assert.match(frameSource, /השיחה השמורה נפתחה ואפשר להמשיך ממנה/);
});
