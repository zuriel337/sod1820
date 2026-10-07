// Golden Post Context Packs v1 (GOLDEN_POST_CONTEXT_PACKS_V1, REV1) — thin, bounded ADAPTER from the
// governed event/System-Method owners into the EXISTING Post `surfaceFindings` path.
//
// This module declares NO domain law. It declares only (a) typed source inputs of the two pilot Posts
// (a source-observed flight number, a typed clock/day observation, and the numeric equalities the
// SOURCE itself claims) and (b) how an already-governed Universal Finding is summarized into a
// bounded row. Every semantic output (clock -> 1820, day ordinal, rule applications, convergence,
// site interpretation + its canonical attribution) is produced by the closed owner modules:
//   eventObservationCompiler / eventSystemMethodRuntime / momentClockSystemMethod / nasrallahPost92Golden
// and only summarized here. Calculations come only from live canonical Gematria Method Traces with
// parity=true, for source-claimed expressions with their exact registered method.
//
// No DB access (live deps are injected), no new store/engine/registry, no Finding/Contributor minting.
// Access is whatever the owner bundle's own filter allows (no descriptor => public-only, fail closed).

import { gematriaTraceToFinding } from "./gematriaTrace.js";
import { buildSourceBundles } from "./sourceBundleProjection.js";
import { EVENT_MEMBER_TYPE, EVENT_SURFACE, FZ1073_EVENT_CANDIDATE_DECLARATION, projectEventContextForSurface } from "./eventObservationCompiler.js";
import { ATTRIBUTION_ROLE, compileEventObservationWithSystemMethods, normalizeAttribution } from "./eventSystemMethodRuntime.js";
import { compileNasrallahPost92Golden } from "./nasrallahPost92Golden.js";

export const GOLDEN_CONTEXT_PACK_MAX_ROWS = 6;

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const cap = (v, n) => clean(v).slice(0, n);

// Typed SOURCE inputs only. `claims` are expressions the Post source itself states with a numeric value
// (live source presence verified); anything not listed here can never become a calculation row.
const PACKS = Object.freeze({
  "5112": {
    packId: "golden-fz1073",
    flight: { type: EVENT_MEMBER_TYPE.FLIGHT_NUMBER, number: 1073, key: "flight:FZ1073", label: "FZ1073", source_ref: "post:5112" },
    supportNumbers: [730],
    claims: [
      { expression: "אשר בשמים ממעל", method_key: "רגיל", claimed_value: 1073 },
      { expression: "ולמות לא נתנני", method_key: "רגיל", claimed_value: 1073 },
      { expression: "משיח בן דוד", method_key: "רגיל", claimed_value: 424 },
      { expression: "ולדימיר פוטין", method_key: "מסתתר", claimed_value: 424 },
      { expression: "שבעים וחמש", method_key: "רגיל", claimed_value: 776 },
      { expression: "ביאת המשיח", method_key: "רגיל", claimed_value: 776 },
    ],
    order: ["event", "calculations", "convergence", "sourceBundles"],
  },
  "92": {
    packId: "golden-nasrallah",
    clockObservation: { display: "18:20", hour: 18, minute: 20, timezone: "Asia/Beirut", context: "site approved reading", source_ref: "post:92", accessTier: "public" },
    dayOrdinal: { ordinal: 358, counting_context: "day of the war (source claim)", source_ref: "post:92", accessTier: "public" },
    sourceWork: { role: ATTRIBUTION_ROLE.SOURCE_WORK, display_name: "סוד החשמל" },
    claims: [
      { expression: "משיח", method_key: "רגיל", claimed_value: 358 },
      { expression: "חכמה", method_key: "רגיל", claimed_value: 73 },
      // 1202 is admitted by the owner compiler only as the sourced Oct7 cross-time member with a מסתתר receipt.
      { expression: "סוד יהונתן תשפד", method_key: "מסתתר", claimed_value: 1202, scope: "cross_time", cross_time_subject: "oct7" },
    ],
    order: ["clock", "day", "calculations", "interpretation"],
  },
});

export function goldenContextPackFor(postId) {
  return PACKS[clean(postId)] || null;
}

/** Source claims (expression + exact registered method) whose live Trace the caller must fetch. */
export function goldenContextPackClaims(postId) {
  return goldenContextPackFor(postId)?.claims || [];
}

const claimKey = (method, expression) => `${clean(method)}\u0000${clean(expression)}`;

// Receipt resolver over PRE-FETCHED live traces: parity=true + same value as the source claim, else null.
function makeReceiptResolver(pack, traces) {
  const byClaim = new Map();
  for (const trace of Array.isArray(traces) ? traces : []) {
    if (!trace || trace.status === "error" || trace.verification?.parity !== true) continue;
    byClaim.set(claimKey(trace.method_key, trace.input), trace);
  }
  const allowed = new Map(pack.claims.map((c) => [claimKey(c.method_key, c.expression), c]));
  return (member) => {
    const k = claimKey(member?.method_key, member?.expression);
    const claim = allowed.get(k);
    const trace = byClaim.get(k);
    if (!claim || !trace || Number(trace.result) !== claim.claimed_value) return null;
    return gematriaTraceToFinding(trace, { inputText: claim.expression });
  };
}

// Explain-Why for every source claim (admin layer): which Trace outcome admitted or refused it.
// Derived only from the same pre-fetched live traces; never a client-side calculation.
export function goldenClaimOutcomes(postId, traces = []) {
  const pack = goldenContextPackFor(postId);
  if (!pack) return [];
  const byClaim = new Map();
  for (const trace of Array.isArray(traces) ? traces : []) {
    if (trace) byClaim.set(claimKey(trace.method_key, trace.input), trace);
  }
  return pack.claims.map((c) => {
    const trace = byClaim.get(claimKey(c.method_key, c.expression)) || null;
    let outcome = "match";
    if (!trace) outcome = "trace_unavailable";
    else if (trace.status === "error") outcome = "trace_error";
    else if (trace.verification?.parity !== true) outcome = "parity_failed";
    else if (Number(trace.result) !== c.claimed_value) outcome = "value_mismatch";
    return {
      expression: c.expression,
      method_key: c.method_key,
      claimed_value: c.claimed_value,
      engine_result: trace && trace.result != null ? Number(trace.result) : null,
      parity: trace?.verification?.parity ?? null,
      outcome,
    };
  });
}

const factOf = (f) => (Array.isArray(f?.evidence?.facts) ? f.evidence.facts[0] || {} : {});

// Presentation-only mapping Finding -> bounded summary row (no child findings, no evidence payload).
function calculationRows(findings) {
  const byValue = new Map();
  for (const f of findings) {
    if (f.kind !== "event-expression-match" || f.verification?.verification_state !== "match") continue;
    const value = Number(f.verification.engine_result);
    const entry = byValue.get(value) || { value, id: f.id, expressions: [], methods: [] };
    entry.expressions.push(clean(f.subject?.label));
    const m = clean(f.verification.engine_method_tested);
    if (m && !entry.methods.includes(m)) entry.methods.push(m);
    byValue.set(value, entry);
  }
  return [...byValue.values()].sort((a, b) => a.value - b.value).map((e) => ({
    id: e.id,
    label: cap(e.expressions.join(" = "), 80),
    value: String(e.value),
    kind: "calculation",
    reason: cap(`חישוב קנוני · ${e.methods.join(" / ")} · parity=true`, 200),
    sourceLabel: "מנוע גימטריה",
  }));
}

function governedRows(findings, approvedClockFindingId, sourceWorkLabel) {
  const rows = { event: [], convergence: [], clock: [], day: [], interpretation: [] };
  for (const f of findings) {
    const fact = factOf(f);
    if (f.kind === "event-flight-number") {
      rows.event.push({ id: f.id, label: cap(f.subject?.label, 80), value: f.subject?.value != null ? String(f.subject.value) : undefined, kind: "event_fact", reason: "תצפית מקור (מספר טיסה); נפרדת מחישוב ומפרשנות.", sourceLabel: cap(f.source?.sourceRef, 80) || undefined });
    } else if (f.kind === "event-rule-convergence") {
      const inputs = [...new Set((Array.isArray(fact.chains) ? fact.chains : []).map((c) => c.input))].sort((a, b) => b - a);
      rows.convergence.push({ id: f.id, label: cap(`${inputs.join(" · ")} → ${fact.target}`, 80), kind: "typed_relation", reason: cap(fact.boundary, 200) || undefined, sourceLabel: "שיטות המערכת" });
    } else if (f.kind === "numeric-operator" && f.id === approvedClockFindingId) {
      rows.clock.push({ id: f.id, label: cap(`${fact.output?.representation_display ?? ""} → ${fact.output?.value}`, 80), value: String(fact.output?.value), kind: "typed_derivation", reason: cap(fact.boundary || `${fact.rule_id} v${fact.rule_version}`, 200), sourceLabel: sourceWorkLabel || undefined });
    } else if (f.kind === "event-day-ordinal") {
      rows.day.push({ id: f.id, label: cap(f.subject?.label, 80), kind: "typed_observation", reason: cap(fact.boundary, 200) || undefined, sourceLabel: sourceWorkLabel || undefined });
    } else if (f.kind === "event-site-interpretation") {
      rows.interpretation.push({ id: f.id, label: cap(fact.attribution?.display_name || f.subject?.label, 80), kind: "interpretation", reason: cap(fact.boundary, 200) || undefined, sourceLabel: cap(fact.attribution?.display_name, 80) || undefined });
    }
  }
  return rows;
}

// Source bundles: only from ALREADY access-filtered findings the caller supplies; presentation
// grouping, never independence. With none supplied the bundle is explicitly unavailable (fail closed).
function sourceBundleRows(findings, occurrences) {
  return buildSourceBundles(findings, { occurrences })
    .filter((b) => !b.isSingleton)
    .slice(0, 1)
    .map((b) => ({
      id: `pack:bundle:${b.id}`,
      label: clean(b.header?.label) || "מקור משותף",
      kind: "source_bundle",
      reason: `${b.count} ממצאים מאותו מקור · קיבוץ הצגה בלבד, לא ראיה בלתי־תלויה.`,
      sourceLabel: clean(b.header?.label) || undefined,
      sourceRef: clean(b.sourceRef) || undefined,
      bundleCount: b.count,
    }));
}

/**
 * Summarize an already-compiled governed pack (owner output) into bounded rows. Pure.
 * @returns {{packId:string, rows:Array, sourceBundle:{status:string, reason:string|null}}}
 */
export function summarizeGovernedPack({ postId, governed, findings = [], occurrences = {}, claimOutcomes = [] } = {}) {
  const pack = goldenContextPackFor(postId);
  if (!pack || !governed?.bundle) return null;
  const surface = projectEventContextForSurface(governed, EVENT_SURFACE.CONTEXT_RAIL, { limit: 100 });
  const wanted = new Set(surface?.finding_ids || []);
  const visible = governed.bundle.findings.filter((f) => wanted.has(f.id));
  const attribution = pack.sourceWork ? normalizeAttribution(pack.sourceWork) : null;
  const sourceWorkLabel = attribution?.ok ? attribution.attribution?.display_name : null;
  // The approved clock reading is selected by the OWNER's own golden output, not by a rule/operation name here.
  const golden = governed.golden;
  const approvedClockFindingId = golden?.representations?.find((r) => r.output === golden.approved_reading?.clock_24h_concat)?.finding_id ?? null;
  const g = governedRows(visible, approvedClockFindingId, sourceWorkLabel);
  const bundleRows = pack.order.includes("sourceBundles") ? sourceBundleRows(findings, occurrences) : [];
  const parts = { ...g, calculations: calculationRows(visible), sourceBundles: bundleRows };
  const seen = new Set();
  const rows = pack.order.flatMap((k) => parts[k] || [])
    .filter((r) => r.id && !seen.has(r.id) && seen.add(r.id))
    .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)))
    .slice(0, GOLDEN_CONTEXT_PACK_MAX_ROWS);
  const surfacedIds = new Set(rows.map((r) => r.id));
  return {
    packId: pack.packId,
    rows,
    // Full governed universe for the admin layer: every owner finding (surfaced or not) and every
    // source claim with its Trace outcome. Public data only; never written to Research Context.
    audit: {
      findings: governed.bundle.findings.map((f) => {
        const fact = factOf(f);
        return {
          id: f.id,
          kind: clean(f.kind),
          label: cap(f.subject?.label || fact.attribution?.display_name || f.kind, 120),
          value: f.subject?.value != null ? String(f.subject.value) : (fact.output?.value != null ? String(fact.output.value) : null),
          status: clean(f.status) || null,
          verificationState: clean(f.verification?.verification_state) || null,
          accessTier: clean(f.access?.tier) || null,
          sourceRef: clean(f.source?.sourceRef) || null,
          boundary: cap(fact.boundary, 240) || null,
          inContextRail: wanted.has(f.id),
          inPublicLayer: surfacedIds.has(f.id),
        };
      }),
      claims: Array.isArray(claimOutcomes) ? claimOutcomes : [],
    },
    sourceBundle: pack.order.includes("sourceBundles")
      ? (bundleRows.length
        ? { status: "available", reason: null }
        : { status: "unavailable", reason: "no_access_filtered_findings_supplied" })
      : { status: "not_applicable", reason: null },
  };
}

/**
 * Compile the governed pack for a pilot Post through the closed owners, then summarize.
 * Fail-closed: any owner refusal/exception yields null (no pack rows), never a client-side value.
 *
 * @param {object} input
 * @param {string|number} input.postId
 * @param {object} input.post existing post row ({id, slug, date})
 * @param {Array} [input.traces] live canonical gematria_method_trace responses (raw RPC shape)
 * @param {Function} [input.numericOperators] governed numeric_operators capability (Post 5112)
 * @param {Function|object} [input.ruleVersions] live nodes rule-version attestation (Post 92)
 * @param {Array} [input.findings] already access-filtered Universal Findings (source bundle)
 * @param {Record<string,object>} [input.occurrences]
 */
export async function buildGoldenPostContextPack({ postId, post = null, traces = [], numericOperators = null, ruleVersions = null, findings = [], occurrences = {} } = {}) {
  const pack = goldenContextPackFor(postId);
  if (!pack) return null;
  const subject = post || { id: postId };
  const receiptResolver = makeReceiptResolver(pack, traces);
  const expressionMembers = pack.claims.map((c) => ({ type: EVENT_MEMBER_TYPE.EXPRESSION_MATCH, ...c, source_ref: `post:${clean(postId)}` }));
  try {
    const governed = pack.flight
      ? await compileEventObservationWithSystemMethods({
        candidate: FZ1073_EVENT_CANDIDATE_DECLARATION,
        post: subject,
        members: [pack.flight, ...expressionMembers],
        numericOperators,
        supportNumbers: pack.supportNumbers || [],
        receiptResolver,
      })
      : await compileNasrallahPost92Golden({
        post: subject,
        clockObservation: pack.clockObservation,
        dayOrdinal: pack.dayOrdinal,
        ruleVersions,
        receiptResolver,
        expression: pack.claims[0],
        additionalExpressions: pack.claims.slice(1),
      });
    return summarizeGovernedPack({ postId, governed, findings, occurrences, claimOutcomes: goldenClaimOutcomes(postId, traces) });
  } catch {
    return null;
  }
}

// Pack rows lead (bounded); an existing connection that merely repeats a pack value is a reference, so
// it is dropped from the list (the number stays reachable from the pack row). Other connections keep
// their place: the pack never crowds out the rest of the existing adapter list.
export function mergeContextPackWithConnections(pack, connections = []) {
  if (!pack) return Array.isArray(connections) ? connections : [];
  const packValues = new Set(pack.rows.map((r) => r.value).filter(Boolean));
  const rest = (Array.isArray(connections) ? connections : [])
    .filter((c) => !(c?.value != null && packValues.has(String(c.value))));
  return [...pack.rows, ...rest];
}
