import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { elsActivityDescriptor, ELS_SEARCH_KINDS } from "../supabase/functions/els-search-bridge/activity.js";
import {
  METRIC_SOURCES, FORBIDDEN_AGGREGATES, assertSingleSource, classifyActor, isHumanActor, ACTOR_CLASSES,
  countComputes, countElsSearches, DECLARED_AGENT_VIAS, ANONYMOUS_BEACON_SOURCE, METRIC_QUALITY, metricQualityLabel,
} from "../src/lib/research/researchActivityContract2029.js";

const read = p => readFileSync(p, "utf8");
const U = n => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;

// ───────────────────────── source of record ─────────────────────────
test("source of record: every metric has exactly one source, none is shared, and no combined research number exists", () => {
  assert.equal(assertSingleSource(), true);
  assert.equal(new Set(Object.values(METRIC_SOURCES)).size, Object.keys(METRIC_SOURCES).length);
  for (const forbidden of FORBIDDEN_AGGREGATES) assert.equal(forbidden in METRIC_SOURCES, false, forbidden);
  assert.throws(() => assertSingleSource({ ...METRIC_SOURCES, research_total: "a+b" }), /forbidden aggregate/);
  assert.throws(() => assertSingleSource({ a: "events:x", b: "events:x" }), /share one source/);
  assert.throws(() => assertSingleSource({ a: "" }), /single source/);
});

test("source of record: compute and ELS are separate, legacy search_log and legacy events.els are not sources", () => {
  const sources = Object.values(METRIC_SOURCES).join("\n");
  assert.doesNotMatch(sources, /search_log/);
  assert.doesNotMatch(sources, /events:els|visitor_events/);
  assert.match(METRIC_SOURCES.gematria_compute_first, /^events:gematria\//);
  assert.match(METRIC_SOURCES.els_search_regular, /^op_trace_spans/);
  // verification, approval, standing approval, tree linkage and publication stay five different measures
  const stages = ["finding_engine_verified", "finding_human_approved", "finding_approved_standing", "finding_linked_to_tree", "finding_published"];
  assert.equal(new Set(stages.map(k => METRIC_SOURCES[k])).size, 5);
});

// ───────────────────────── actor_class ─────────────────────────
test("actor_class: golden vectors from the real data classes", () => {
  const cases = [
    // the heavy single identity (57% of compute): a human account with anomalous volume, NOT an agent
    [{ authenticated: true, identityClass: "user", behavior: { actionsPerSession: 439, shareOfWindow: 0.57 } }, "human_auth", ["unverified_power_identity", "anomalous_rate"]],
    [{ authRole: "admin", authenticated: true }, "owner_admin", []],
    [{ identityClass: "admin" }, "owner_admin", []],
    [{ identityClass: "service" }, "service_worker", []],
    [{ identityClass: "anon" }, "human_anon", []],
    [{ identityClass: "public_user" }, "human_anon", []],
    [{ identityClass: "authenticated_user" }, "human_auth", []],
    [{ source: "import" }, "import", []],
    [{ declared: { via: "decision_ledger.created_by_agent", name: "GPT" } }, "ai_agent", []],
    [{ declared: { via: "convergence_actor_type", name: "claude" }, authenticated: true }, "ai_agent", []],
    [{ identityClass: "anon", behavior: { actionsPerSession: 200, shareOfWindow: 0.001 } }, "human_anon", ["unverified_power_identity", "anomalous_rate"]],
  ];
  for (const [input, cls, flags] of cases) {
    const out = classifyActor(input);
    assert.equal(out.actor_class, cls, JSON.stringify(input)); assert.deepEqual([...out.flags], flags, JSON.stringify(input));
    assert.ok(ACTOR_CLASSES.includes(out.actor_class));
  }
  assert.equal(classifyActor({ declared: { via: "decision_ledger.created_by_agent", name: "GPT" } }).agent_name, "GPT");
});

test("actor_class: behaviour alone, free-text labels or client claims never produce an agent", () => {
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 2000; i += 1) {
    const out = classifyActor({ identityClass: ["anon", "user", "admin", "public_user", "authenticated_user", undefined][Math.floor(rnd() * 6)],
      authenticated: rnd() < 0.5, behavior: { actionsPerSession: Math.floor(rnd() * 5000), shareOfWindow: rnd() } });
    assert.notEqual(out.actor_class, "ai_agent"); assert.equal(out.agent_name, null);
  }
  for (const declared of [{ via: "client_claim", name: "Claude" }, { via: "user_agent", name: "GPTBot" }, { via: "decision_ledger.created_by_agent", name: "  " },
    { via: "decision_ledger.created_by_agent" }, { name: "Claude" }, "claude"]) {
    assert.notEqual(classifyActor({ declared, authenticated: true }).actor_class, "ai_agent", JSON.stringify(declared));
  }
  assert.deepEqual([...DECLARED_AGENT_VIAS].sort(), ["agent_identity", "ai_token_log.source", "convergence_actor_type", "decision_ledger.created_by_agent"]);
});

test("actor_class: the server cannot tell who sent an anonymous beacon, so it is 'unknown' - never inferred from a window, a session or a role claim", () => {
  assert.equal(ANONYMOUS_BEACON_SOURCE, "anonymous_beacon");
  const beaconOnly = classifyActor({ source: "anonymous_beacon" });
  assert.deepEqual({ ...beaconOnly, flags: [...beaconOnly.flags] }, { actor_class: "unknown", actor_basis: "anonymous_beacon_no_identity", agent_name: null, flags: [] });
  // Nothing a caller could attach changes it: not a role, not authentication, not a session id, not a test window, not an agent label.
  const smuggled = classifyActor({ source: "anonymous_beacon", authRole: "admin", authenticated: true, identityClass: "admin", activity_session: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    window: { from: "2026-11-06T08:00Z", to: "2026-11-06T08:30Z", label: "owner-acceptance-test" }, testWindow: true, ts: Date.now(), userAgent: "Claude-User", actor_class: "owner_admin" });
  assert.equal(smuggled.actor_class, "unknown");
  // Without a reliable identity the answer is unknown, not human_anon.
  assert.equal(classifyActor({}).actor_class, "unknown"); assert.equal(classifyActor({ identityClass: "something_new" }).actor_class, "unknown");
  assert.equal(classifyActor({ identityClass: "anon" }).actor_class, "human_anon", "human_anon needs a server identity class that says anon");
  // owner_admin only ever from a verified server role / identity class, whatever else is present.
  let seed = 31; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 2000; i += 1) {
    const out = classifyActor({ activity_session: "x" + i, ts: rnd() * 1e12, testWindow: rnd() < 0.5, userAgent: rnd() < 0.5 ? "Claude-User" : "Mozilla", authenticated: rnd() < 0.5, identityClass: ["anon", "user", "public_user", undefined][Math.floor(rnd() * 4)], behavior: { actionsPerSession: rnd() * 900, shareOfWindow: rnd() } });
    assert.notEqual(out.actor_class, "owner_admin"); assert.notEqual(out.actor_class, "ai_agent");
  }
  assert.equal(isHumanActor("unknown"), false, "unknown is reported as anonymous activity, not as a human user and not as an agent");
});

test("metric quality: compute is labelled not dedupe-verified and actor unknown until the database enforces idempotency", () => {
  for (const metric of ["gematria_compute_first", "gematria_compute_repeat", "gematria_compute_recompute"]) {
    assert.deepEqual({ ...METRIC_QUALITY[metric] }, { dedupe: "client_session_only", dedupe_verified: false, actor_class: "unknown" });
    assert.equal(metricQualityLabel(metric), "not dedupe-verified · actor unknown");
  }
  assert.equal(metricQualityLabel("els_search_regular"), "n/a");
  // The flag may only be turned on together with the database proof: the SQL acceptance script must exist and cover replay + concurrency.
  const runner = readFileSync("scripts/run-reading-activity-sql-test.sh", "utf8"), cases = readFileSync("tests/sql/reading_activity_v1.sql", "utf8");
  assert.match(runner, /concurrent duplicates/); assert.match(runner, /expected 1 recorded \+ 39 duplicate/); assert.match(cases, /T2 replay is a duplicate/);
  assert.match(readFileSync("supabase/proposed/reading_activity_v1.sql", "utf8"), /on conflict do nothing/);
});

test("actor_class: a human-user count never contains agents, workers or imports", () => {
  const population = [
    { id: 1, ...classifyActor({ identityClass: "anon" }) }, { id: 2, ...classifyActor({ identityClass: "user" }) },
    { id: 3, ...classifyActor({ authRole: "admin" }) }, { id: 4, ...classifyActor({ identityClass: "service" }) },
    { id: 5, ...classifyActor({ declared: { via: "ai_token_log.source", name: "research-extract" } }) },
    { id: 6, ...classifyActor({ declared: { via: "decision_ledger.created_by_agent", name: "GPT" } }) }, { id: 7, ...classifyActor({ source: "import" }) },
  ];
  assert.deepEqual(population.filter(p => isHumanActor(p.actor_class)).map(p => p.id), [1, 2, 3]);
});

// ───────────────────────── compute counting and dedupe ─────────────────────────
test("compute counting: replay is idempotent; first/repeat/recompute are never summed into one number", () => {
  const e = (n, type, session = U(900)) => ({ activity_event_id: U(n), activity_session: session, event_type: type });
  const events = [e(1, "first_compute"), e(1, "first_compute"), e(2, "repeat_compute"), e(3, "recompute"), e(3, "recompute"), e(4, "first_compute", U(901)),
    { activity_session: U(900), event_type: "repeat_compute" }, e(5, "compute"), e(6, "sessions")];
  const out = countComputes(events);
  assert.deepEqual({ ...out }, { first_compute: 2, repeat_compute: 1, recompute: 1, sessions: 2 });
  assert.equal("total" in out, false);
  assert.equal("unique" in out, false);
});

// ───────────────────────── ELS: descriptor and counting ─────────────────────────
test("ELS descriptor: server-derived origin and search start, closed kind enum, validated search id, no content", () => {
  const D = (op, body, cursors = 0) => elsActivityDescriptor(op, body, cursors);
  assert.deepEqual({ ...D("page", { term: "משיח" }) }, { schema: 1, origin: "interactive", search_start: true, search_kind: "unspecified", search_id: null });
  assert.equal(D("page", {}, 3).search_start, false, "a continuation page does not open a search");
  assert.equal(D("verify", {}).search_start, false); assert.equal(D("verify_batch", {}).search_start, false);
  assert.equal(D("page", { stage: "adaptive_1" }).origin, "scanner"); assert.equal(D("page", { stage: 2 }).origin, "scanner");
  assert.equal(D("page", { stage: null }).origin, "interactive"); assert.equal(D("page", { stage: "" }).origin, "interactive");
  for (const kind of ELS_SEARCH_KINDS) assert.equal(D("verify_batch", { search_kind: kind }).search_kind, kind);
  for (const kind of ["כללי", "REGULAR", "x".repeat(50), 5, null, {}]) assert.equal(D("page", { search_kind: kind }).search_kind, "unspecified");
  assert.equal(D("verify_batch", { search_id: U(5).toUpperCase() }).search_id, U(5));
  for (const id of ["שלום", "123", "not-a-uuid", "a".repeat(200), 7, {}]) assert.equal(D("verify_batch", { search_id: id }).search_id, null);
  const out = D("page", { term: "משיח", scope: "tanakh", skip_min: 2, user_id: UID_LIKE(), search_id: U(2), search_kind: "cross" }, 1);
  assert.deepEqual(Object.keys(out).sort(), ["origin", "schema", "search_id", "search_kind", "search_start"]);
  assert.doesNotMatch(JSON.stringify(out), /משיח|tanakh|user/);
  assert.equal(Object.isFrozen(out), true);
});
function UID_LIKE() { return "11111111-1111-4111-8111-111111111111"; }

test("ELS counting: one search per search_id, scanner and verify separate, duplicate delivery ignored, old spans are UNAVAILABLE", () => {
  const A = (over = {}) => ({ schema: 1, origin: "interactive", search_start: false, search_kind: "regular", search_id: null, ...over });
  const span = (n, capability, a) => ({ trace_id: U(n), capability, identity_class: "anon", els_activity: a });
  const spans = [
    // Classic: one regular search = 3 verify_batch calls sharing a search_id -> 1 search
    span(1, "els:verify_batch", A({ search_id: U(50) })), span(2, "els:verify_batch", A({ search_id: U(50) })), span(3, "els:verify_batch", A({ search_id: U(50) })),
    // Classic: one cross search = 2 batches
    span(4, "els:verify_batch", A({ search_id: U(51), search_kind: "cross" })), span(5, "els:verify_batch", A({ search_id: U(51), search_kind: "cross" })),
    // native page flow without search id: only the first page counts
    span(6, "els:page", A({ search_start: true })), span(7, "els:page", A({ search_start: false })), span(8, "els:page", A({ search_start: false })),
    // forms
    span(9, "els:verify_batch", A({ search_id: U(52), search_kind: "forms" })),
    // adaptive scanner: separate, never a user search
    span(10, "els:page", A({ origin: "scanner", search_start: true })), span(11, "els:page", A({ origin: "scanner", search_start: false })),
    // single occurrence verification
    span(12, "els:verify", A()), span(13, "els:verify", A()),
    // duplicate delivery of the same trace
    span(1, "els:verify_batch", A({ search_id: U(50) })),
    // span written before the descriptor existed -> not zero, simply not countable
    { trace_id: U(14), capability: "els:page", identity_class: "anon", els_activity: undefined },
    // batch without a search id and not a search start -> cannot be attributed to a search
    span(15, "els:verify_batch", A()),
  ];
  const out = countElsSearches(spans);
  assert.deepEqual({ ...out }, { regular: 2, cross: 1, forms: 1, unspecified: 0, scanner_runs: 1, verify_calls: 3 });
  assert.equal("total" in out, false);
});

// ───────────────────────── edge function: capability and gate untouched ─────────────────────────
test("els-search-bridge: capability names and gate input unchanged; activity label is content-free and fail-open", () => {
  const src = read("supabase/functions/els-search-bridge/index.ts");
  assert.match(src, /capability: `els:\$\{operation\}`/);
  assert.match(src, /p_capability: `els:\$\{op\}`/);
  assert.match(src, /import \{ elsActivityDescriptor \} from "\.\/activity\.js";/);
  assert.equal([...src.matchAll(/els_activity: activity/g)].length, 3, "verify_batch, verify and page spans");
  assert.ok(src.indexOf("const activity = elsActivityDescriptor(") < src.indexOf("await traceBegin("));
  assert.match(src, /elsActivityDescriptor\(op, body, pageCursorCount\)/);
  for (const span of ['"els_verify_batch_v1"', '"els_verify_occurrence_v1"', '"els_search_page_core_v1"']) {
    const at = src.indexOf("traceSpan(trace, " + span); assert.ok(at > 0, span);
    assert.match(src.slice(at, at + 900), /els_activity: activity/);
  }
  assert.doesNotMatch(src.slice(src.indexOf("const pageCursorCount"), src.indexOf("const trace = await traceBegin")), /\bterm\b|userId|\bip\b|forwarded/);
  // engine spans stay fail-open (traceSpan swallows errors); only the gate span is fail-closed
  assert.match(src, /async function traceSpan[\s\S]*?catch \{ \/\* trace fail-open \*\/ \}/);
  const activitySrc = read("supabase/functions/els-search-bridge/activity.js");
  assert.doesNotMatch(activitySrc.replace(/^\s*\/\/.*$/gm, ""), /\bimport\b|\bDeno\b|\bfetch\(|\bconsole\./, "pure: no I/O, no imports");
});

test("TzofenEmbed: search id and kind come only from the engine's own search message and expire; the term is never forwarded", () => {
  const s = read("src/components/TzofenEmbed.jsx");
  assert.match(s, /searchActivityRef\.current = \{ id: newInteractionId\(\), kind: \["regular", "cross", "forms"\]\.includes\(d\.kind\) \? d\.kind : "unspecified", at: Date\.now\(\) \}/);
  assert.match(s, /Date\.now\(\) - searchActivityRef\.current\.at < 120000/);
  assert.match(s, /\.\.\.\(activeSearch \? \{ search_id: activeSearch\.id, search_kind: activeSearch\.kind \} : \{\}\)/);
  const spread = s.indexOf("body: { op, ...payload, interaction_id: newInteractionId()");
  assert.ok(spread > 0 && s.indexOf("search_id: activeSearch.id") > spread, "set after the payload so the iframe payload cannot override it");
  const literal = s.slice(s.indexOf("searchActivityRef.current ="), s.indexOf("};", s.indexOf("searchActivityRef.current =")) + 2);
  assert.doesNotMatch(literal, /d\.term|d\.payload|slug|expression/, "only a random id, a closed-enum kind and a timestamp are stored");
});
