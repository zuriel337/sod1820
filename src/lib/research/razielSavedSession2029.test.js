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
import {
  createRazielNavigationTurnSucceededAction,
  prepareRazielSessionSubmission,
} from "./razielSessionRequest2029.js";
import { razielNavigationButton } from "../../components/experience2029/razielSessionSeam2029.js";

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

test("save and restore preserve the bounded ELS search proposal without promoting it to evidence", () => {
  const state = completedState();
  state.thread[0] = {
    role: "user",
    text: 'חפש לי שני מילים "צוריאל פולייס" בתורה',
    turnId: "els-plan-turn",
  };
  state.thread[1] = {
    role: "raziel",
    text: "הכנתי הצלבה מוצעת. מנוע ELS עדיין צריך לאמת אותה.",
    question: state.thread[0].text,
    turnId: "els-plan-turn",
    level: "fast",
    grounding: "interpretation",
    elsSearchPlan: {
      contract: "els_search_plan_v1",
      status: "READY",
      scope: "torah",
      mode: "crossed_pair",
      axes: [
        { term: "צוריאל", role: "primary", source: "locked_quote" },
        { term: "פולייס", role: "secondary", source: "locked_quote" },
      ],
      context_terms: [],
      authority: "PROPOSED_UNTIL_CANONICAL_ELS_MATCH",
      model_calls: 1,
    },
  };
  const built = buildRazielSavedSessionEntity(state, { now: () => "2026-10-27T12:00:00Z" });
  assert.equal(built.ok, true);
  const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
  assert.deepEqual(restored.thread[1].elsSearchPlan, state.thread[1].elsSearchPlan);
  assert.equal(restored.thread[1].elsSearchPlan.authority, "PROPOSED_UNTIL_CANONICAL_ELS_MATCH");
  assert.equal(restored.thread[1].evidenceSummary, undefined);
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

function navigationState(question) {
  const initial = { ...createInitialRazielSessionState(), viewMode: "exploratory" };
  const prepared = prepareRazielSessionSubmission({ question, state: initial, researchContext: null,
    startedAt: "2026-10-26T12:00:00Z", createTurnId: () => "navigation-turn" });
  assert.ok(prepared.navigation);
  assert.equal(prepared.request, null);
  const started = razielSessionReducer(initial, { type: "turn_started", turn: prepared.turn, contextSnapshot: prepared.contextSnapshot });
  return razielSessionReducer(started, createRazielNavigationTurnSucceededAction({ state: started,
    navigation: prepared.navigation, completedAt: "2026-10-26T12:00:01Z" }));
}

test("explicit save and restore retain every canonical navigation action without changing the conversation mode", () => {
  for (const question of ["פתח את דף המספר 73", "קח אותי לביטויים של המספר 337", "פתח את מפת המחקר", "פתח את העולם"]) {
    const state = navigationState(question);
    const built = buildRazielSavedSessionEntity(state, { now: () => "2026-10-26T12:00:02Z" });
    assert.equal(built.ok, true, question);
    const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
    assert.deepEqual(restored.thread.at(-1).navigationAction, state.thread.at(-1).navigationAction, question);
    assert.deepEqual(razielNavigationButton(restored.thread.at(-1)), razielNavigationButton(state.thread.at(-1)), question);
    assert.equal(restored.viewMode, "exploratory");
    assert.equal(restored.thread.length, 2);
    assert.equal(restored.thread.at(-1).level, "deterministic");
  }
});

test("a saved pending navigation clarification resumes through the existing deterministic follow-up", () => {
  const state = navigationState("פתח את דף המספר");
  const built = buildRazielSavedSessionEntity(state, { now: () => "2026-10-26T12:00:02Z" });
  const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
  assert.deepEqual(restored.thread.at(-1).navigationClarify, { intent: "number_page", reason: "missing_number" });
  const prepared = prepareRazielSessionSubmission({ question: "337", state: restored, researchContext: null,
    startedAt: "2026-10-26T12:01:00Z", createTurnId: () => "navigation-follow-up" });
  assert.equal(prepared.request, null);
  assert.equal(prepared.navigation.href, "/2029/number/337");
  assert.equal(prepared.navigation.model_calls, 0);
  assert.equal(restored.thread.length, 2);
});

test("restored navigation is a bounded exact projection and rejects forged versions, routes, numbers and pending intents", () => {
  const built = buildRazielSavedSessionEntity(navigationState("פתח את דף המספר 73"), { now: () => "2026-10-26T12:00:02Z" }).entity;
  const valid = built.thread.at(-1).navigationAction;
  const restoredAnswer = (patch) => razielSavedSessionState({ ...built,
    thread: [built.thread[0], { ...built.thread[1], ...patch }] }).thread.at(-1);
  const projected = restoredAnswer({ navigationAction: { ...valid, label: "<b>פתח את 73</b>", token: "never-save-this" } });
  assert.equal(projected.navigationAction.label, "פתח את 73");
  assert.deepEqual(Object.keys(projected.navigationAction).sort(), ["href", "intent", "label", "number", "version"]);
  assert.doesNotMatch(JSON.stringify(projected), /never-save-this/);
  for (const action of [
    { ...valid, version: "future" }, { ...valid, version: undefined }, { ...valid, intent: "admin" },
    { ...valid, href: "https://evil.invalid/2029/number/73" }, { ...valid, href: "/2029/number/0", number: 0 },
    { ...valid, href: "/2029/number/073" }, { ...valid, href: "/2029/number/73?source=private" },
    { ...valid, href: "/2029/number/1000000", number: 1000000 }, { ...valid, number: 337 },
    { ...valid, number: "73" }, { ...valid, href: "/world", number: null },
    { ...valid, intent: "world" }, { ...valid, intent: "world", href: "/world", number: 73 },
    { ...valid, intent: "world", href: "/world?private=1", number: null },
    { ...valid, label: { href: "https://evil.invalid" } }, { ...valid, label: " " },
  ]) assert.equal(restoredAnswer({ navigationAction: action }).navigationAction, undefined, JSON.stringify(action));
  for (const clarification of [{ intent: "admin", reason: "missing_number" }, { intent: "number_page", reason: "private-payload" }]) {
    assert.equal(restoredAnswer({ navigationAction: null, navigationClarify: clarification }).navigationClarify, undefined);
  }
  const conflicting = restoredAnswer({ navigationClarify: { intent: "number_page", reason: "missing_number" } });
  assert.equal(conflicting.navigationAction, undefined);
  assert.equal(conflicting.navigationClarify, undefined);
  const injectedUser = razielSavedSessionState({ ...built, thread: [{ ...built.thread[0], navigationAction: valid,
    navigationClarify: { intent: "number_page", reason: "missing_number" } }, built.thread[1]] }).thread[0];
  assert.equal(injectedUser.navigationAction, undefined);
  assert.equal(injectedUser.navigationClarify, undefined);
});
