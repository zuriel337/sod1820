// Executable reference of traffic_intelligence_law v12 (DRAFT, not yet Human-Gate approved).
//
// Pure and dependency-free. It is NOT imported by the app bundle: it is the testable definition of
//  (1) the single source of record per metric, (2) the actor_class derivation rules, and
//  (3) the counting/dedupe semantics that the later server projection (fn_ti_research_*) must reproduce.
// The same golden vectors are meant to be replayed against that SQL projection.

// ── 1. Source of record: one source per metric, no overlap, no combined research number ──────────────────
export const METRIC_SOURCES = Object.freeze({
  gematria_compute_first: "events:gematria/first_compute",
  gematria_compute_repeat: "events:gematria/repeat_compute",
  gematria_compute_recompute: "events:gematria/recompute",
  els_search_regular: "op_trace_spans.resources.els_activity:regular",
  els_search_cross: "op_trace_spans.resources.els_activity:cross",
  els_search_forms: "op_trace_spans.resources.els_activity:forms",
  els_search_unspecified: "op_trace_spans.resources.els_activity:unspecified",
  els_scanner_runs: "op_trace_spans.resources.els_activity:scanner",
  els_verify: "op_trace_roots:els:verify|els:verify_batch",
  finding_created: "research_objects|els_records|research_contributions(native):created_at",
  finding_engine_verified: "research_objects.engine_verified",
  finding_human_approved: "research_objects.status(approved|canonical) minus standing_approval",
  finding_approved_standing: "research_objects.meta.governance.standing_approval",
  finding_linked_to_tree: "research_objects.promoted_node_id",
  finding_published: "owner-table visibility (gematria_words.is_published | els_records.visibility | research_contributions.status)",
  ga4_visitors: "traffic_history(source=ga):visitors",
  anonymous_activity_sessions: "events:gematria/*:props.activity_session",
});

// A dashboard may never publish a number built by adding these distinct metrics together.
export const FORBIDDEN_AGGREGATES = Object.freeze([
  "research_total", "total_research", "research_activity_total", "findings_total_all_stages",
  "compute_plus_search", "searches_all", "users_total_with_agents",
]);

export function assertSingleSource(registry = METRIC_SOURCES) {
  const seen = new Map();
  for (const [metric, source] of Object.entries(registry)) {
    if (FORBIDDEN_AGGREGATES.includes(metric)) throw new Error(`forbidden aggregate metric: ${metric}`);
    if (typeof source !== "string" || !source) throw new Error(`metric without a single source: ${metric}`);
    if (seen.has(source)) throw new Error(`metrics ${seen.get(source)} and ${metric} share one source`);
    seen.set(source, metric);
  }
  return true;
}

// ── 2. actor_class (derived server-side only; never from client input) ────────────────────────────────────
export const DECLARED_AGENT_VIAS = Object.freeze([
  "decision_ledger.created_by_agent", "convergence_actor_type", "ai_token_log.source", "agent_identity",
]);
// "unknown" = the sender cannot be established. Every row written by the public-reading beacon is "unknown": the worker
// replaces the account JWT with the anon key, so the database sees an anonymous caller whether it was a visitor, the owner
// or a script. It is never upgraded from a time window, an activity_session or an observed pattern.
export const ACTOR_CLASSES = Object.freeze(["unknown", "human_anon", "human_auth", "owner_admin", "ai_agent", "service_worker", "import"]);
export const ANONYMOUS_BEACON_SOURCE = "anonymous_beacon";
export const POWER_IDENTITY_THRESHOLDS = Object.freeze({ actionsPerSession: 50, shareOfWindow: 0.05 });

// input: { source?: "import"|"anonymous_beacon", declared?: { via, name }, identityClass?, authRole?, authenticated?,
//          behavior?: { actionsPerSession, shareOfWindow } }
// Only these fields are read. Anything else (activity_session, timestamps, test windows, user agents) is ignored by design.
export function classifyActor(input = {}) {
  const flags = [];
  const behavior = input.behavior || {};
  if ((Number(behavior.actionsPerSession) || 0) >= POWER_IDENTITY_THRESHOLDS.actionsPerSession
    || (Number(behavior.shareOfWindow) || 0) >= POWER_IDENTITY_THRESHOLDS.shareOfWindow) {
    flags.push("unverified_power_identity", "anomalous_rate");
  }
  let actor = null, basis = null;
  if (input.source === "import") { actor = "import"; basis = "declared_import"; }
  else if (input.source === ANONYMOUS_BEACON_SOURCE) { actor = "unknown"; basis = "anonymous_beacon_no_identity"; }
  else if (input.declared && DECLARED_AGENT_VIAS.includes(input.declared.via) && typeof input.declared.name === "string" && input.declared.name.trim()) { actor = "ai_agent"; basis = "declared_agent:" + input.declared.via; }
  else if (input.identityClass === "service") { actor = "service_worker"; basis = "server_identity_class"; }
  else if (input.authRole === "admin" || input.identityClass === "admin") { actor = "owner_admin"; basis = "verified_server_role"; }
  else if (input.authenticated === true || ["user", "authenticated_user"].includes(input.identityClass)) { actor = "human_auth"; basis = "verified_server_auth"; }
  else if (["anon", "public_user"].includes(input.identityClass)) { actor = "human_anon"; basis = "server_identity_class"; }
  else { actor = "unknown"; basis = "no_reliable_identity"; }
  const agentName = actor === "ai_agent" ? input.declared.name.trim() : null;
  // Behavior may only add flags, never change the class: an anomalous caller keeps the class its identity proves.
  return Object.freeze({ actor_class: actor, actor_basis: basis, agent_name: agentName, flags: Object.freeze(flags) });
}

// "unknown" is not counted as a human user (nor as an agent): it is reported as anonymous activity, with its own label.
export const isHumanActor = actorClass => actorClass === "human_anon" || actorClass === "human_auth" || actorClass === "owner_admin";

// ── Quality of each metric, stated next to it so no dashboard can imply more than is verified ─────────────────
// dedupe_verified becomes true only when the database enforces idempotency (unique key + RPC) and its acceptance tests pass.
export const METRIC_QUALITY = Object.freeze({
  gematria_compute_first: { dedupe: "client_session_only", dedupe_verified: false, actor_class: "unknown" },
  gematria_compute_repeat: { dedupe: "client_session_only", dedupe_verified: false, actor_class: "unknown" },
  gematria_compute_recompute: { dedupe: "client_session_only", dedupe_verified: false, actor_class: "unknown" },
});
export function metricQualityLabel(metric) {
  const q = METRIC_QUALITY[metric];
  return q ? (q.dedupe_verified ? "dedupe-verified" : "not dedupe-verified") + " · actor " + q.actor_class : "n/a";
}

// ── 3. Counting semantics ─────────────────────────────────────────────────────────────────────────────────
// events: [{ activity_event_id, activity_session, event_type }] -> three separate counts, never one total.
export function countComputes(events) {
  const seen = new Set();
  const sessions = new Set();
  const out = { first_compute: 0, repeat_compute: 0, recompute: 0, sessions: 0 };
  for (const e of events) {
    if (!e?.activity_event_id || seen.has(e.activity_event_id)) continue;      // replay / duplicate delivery
    if (!(e.event_type in out) || e.event_type === "sessions") continue;
    seen.add(e.activity_event_id);
    out[e.event_type] += 1;
    if (e.activity_session) sessions.add(e.activity_session);
  }
  out.sessions = sessions.size;
  return Object.freeze(out);
}

// spans: [{ trace_id, capability, identity_class, els_activity }] -> ELS searches by kind (+ separate scanner/verify).
// One search = distinct search_id when present, otherwise one `page` span that opens a search (no cursor).
export function countElsSearches(spans) {
  const traces = new Set();
  const groups = new Set();
  const out = { regular: 0, cross: 0, forms: 0, unspecified: 0, scanner_runs: 0, verify_calls: 0 };
  for (const s of spans) {
    if (!s?.trace_id || traces.has(s.trace_id)) continue;                      // the same trace delivered twice
    traces.add(s.trace_id);
    const a = s.els_activity;
    if (!a || a.schema !== 1) continue;                                          // pre-descriptor spans are UNAVAILABLE, not zero
    if (a.origin === "scanner") { if (a.search_start) out.scanner_runs += 1; continue; }
    if (s.capability === "els:verify" || (s.capability === "els:verify_batch" && !a.search_id)) { out.verify_calls += 1; continue; }
    const key = a.search_id ? `id:${a.search_id}` : a.search_start ? `trace:${s.trace_id}` : null;
    if (!key || groups.has(key)) continue;
    groups.add(key);
    out[["regular", "cross", "forms"].includes(a.search_kind) ? a.search_kind : "unspecified"] += 1;
  }
  return Object.freeze(out);
}
