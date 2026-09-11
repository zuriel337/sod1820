import assert from 'node:assert/strict';
import test from 'node:test';
import { composeResearchW2 } from './researchComposerW2.js';
import { buildResearchPlanV2, buildAccessDescriptor, normalizeAccessDescriptor } from './researchPlanV2.js';
import { composeResearchResultBundle, CAPABILITY_STATUS, EVIDENCE_RELATION, findingAccessDecision, ACCESS_CLASS } from './researchResultBundle.js';
import { createCanonicalW2Executors, NUMERIC_SYSTEM_METHOD_RULE_IDS } from './researchW2Executors.js';
import { boundNumberLookupRows, numberLookupRowsToUniversalFindings, numericLensMap } from './numericResearch.js';

// W2.2b · FOUNDATION HARDENING + NUMBER -> UNIVERSAL FINDING — golden regression.
// Covers: 358 + 377 · privacy negatives · auth snapshot mutation · high-cardinality fan-out ·
// governed vs legacy_verified verification mapping · denied research_objects · no raw-source leakage.

// ── fixtures ──────────────────────────────────────────────────────────────────────────────
const SECRET = 'SECRET-SESSION-TOKEN-do-not-emit';
// A context as a TRUSTED BOUNDARY would build it: the private fields plus an explicit attestation.
const PRIVATE_AUTH = Object.freeze({
  user_ref: '11111111-1111-4111-8111-111111111111',
  phone: '+972500000000',
  email: 'private@example.com',
  session_token: SECRET,
  authenticated: true,
  verified_authority: Object.freeze({ source: 'supabase_auth', subject_verified: true }),
});
// The same shape WITHOUT an attestation — a caller simply asserting it is authenticated/admin.
const UNATTESTED_AUTH = Object.freeze({
  user_ref: '11111111-1111-4111-8111-111111111111',
  session_token: SECRET,
  authenticated: true,
  admin: true,
  role: 'admin',
});
const ATTESTED_ADMIN = Object.freeze({
  user_ref: 'admin-1',
  verified_authority: Object.freeze({ source: 'supabase_auth', admin: true, subject_verified: true }),
});

function governedRow(overrides = {}) {
  return {
    bid_id: 'bid-governed-1', word_id: 'word-1', method: 'רגיל', phrase: 'משיח', value: 358,
    method_governed: true, method_active: true, atomic_or_composite: 'atomic',
    row_provenance_state: 'governed', engine_run_id: 'run-e1', computed_at: '2026-02-02T00:00:00Z',
    method_version: 1, dependency_version_snapshot: { ragil: 1 }, node_id: 'node-1',
    verified_at: null, verified_run_id: null, verified_method_version: null, verified_mismatch_value: null,
    ...overrides,
  };
}
function legacyVerifiedRow(overrides = {}) {
  return {
    bid_id: 'bid-legacy-1', word_id: 'word-2', method: 'רגיל', phrase: 'נחש', value: 358,
    method_governed: true, method_active: true, atomic_or_composite: 'atomic',
    row_provenance_state: 'legacy_verified', engine_run_id: null, computed_at: null, method_version: null,
    verified_at: '2026-01-01T00:00:00Z', verified_run_id: 'run-v1', verified_method_version: 1,
    verified_mismatch_value: null, node_id: null,
    ...overrides,
  };
}
function lookupSupabase(rows, extra = {}) {
  return {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') return { data: rows(args.p_value) };
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, facts: { convergences: [] } } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value, map: { root: args.p_value } } };
      if (name === 'number_neighbors') return { data: [{ value: 424, weight: 12.84 }] };
      if (extra[name]) return extra[name](args);
      return { data: null };
    },
  };
}
const numberIdentity = value => [{ type: 'number', value, ref: String(value), source: 'explicit_ref', confidence: 'exact' }];

// ── 1. PRIVACY NEGATIVES — the raw authorization context never reaches the output ─────────
test('privacy negative: raw authorizationContext never appears anywhere in the composed Bundle', async () => {
  const bundle = await composeResearchW2({
    question: '358',
    rawInput: '358',
    identityCandidates: numberIdentity(358),
    requestedCapabilities: ['numeric'],
    contextType: 'authenticated_user',
    authorizationContext: PRIVATE_AUTH,
    executors: createCanonicalW2Executors({ supabase: lookupSupabase(v => [governedRow({ value: v })]) }),
  });

  const serialized = JSON.stringify(bundle);
  assert.equal(serialized.includes(SECRET), false, 'session token leaked into the Bundle');
  assert.equal(serialized.includes(PRIVATE_AUTH.user_ref), false, 'user_ref leaked into the Bundle');
  assert.equal(serialized.includes(PRIVATE_AUTH.phone), false, 'phone leaked into the Bundle');
  assert.equal(serialized.includes(PRIVATE_AUTH.email), false, 'email leaked into the Bundle');
  assert.equal('authorization_context' in bundle.plan, false);
  assert.equal('authorization_context' in bundle.resolved_run_snapshot, false);

  // The output-safe descriptor is present and states access SHAPE only.
  assert.equal(bundle.plan.access.v, 1);
  assert.equal(bundle.plan.access.authenticated, true);
  assert.equal(bundle.plan.access.contains_identifying_fields, false);
  assert.deepEqual(bundle.plan.access.allowed_access_tiers, ['public', 'personal']);
  assert.equal(bundle.plan.guards.raw_authorization_context_never_in_output, true);
  assert.equal(bundle.invariants.raw_authorization_context_never_in_output, true);
});

test('privacy negative: executors still receive the raw context on the private channel', async () => {
  let seen = null;
  await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: numberIdentity(358),
    requestedCapabilities: ['numeric'], contextType: 'authenticated_user', authorizationContext: PRIVATE_AUTH,
    executors: { numeric: async ({ authorizationContext, plan }) => { seen = { authorizationContext, planAccess: plan.access }; return { status: CAPABILITY_STATUS.EXECUTED, findings: [] }; } },
  });
  assert.equal(seen.authorizationContext.session_token, SECRET, 'executor lost the private execution context');
  assert.equal('session_token' in seen.planAccess, false, 'descriptor must not carry secrets');
});

test('privacy negative: a legacy caller that still puts a raw context on the plan is scrubbed at the composition boundary', () => {
  const bundle = composeResearchResultBundle({
    query: null,
    plan: { v: 2, authorization_context: PRIVATE_AUTH, access: buildAccessDescriptor(null, 'public_user') },
    resolvedRunSnapshot: { authorizationContext: PRIVATE_AUTH },
    capabilities: [],
  });
  assert.equal(JSON.stringify(bundle).includes(SECRET), false);
  assert.equal(bundle.plan.authorization_context_removed_at_composition_boundary, true);
  assert.equal(bundle.resolved_run_snapshot.authorization_context_removed_at_composition_boundary, true);
});

test('privacy negative: an unknown context resolves public-only, never widened by a caller claim', () => {
  assert.deepEqual(buildAccessDescriptor(null, 'public_user').allowed_access_tiers, ['public']);
  // A caller asserting a context_type it has no authority for cannot widen anything.
  assert.deepEqual(buildAccessDescriptor(null, 'admin').allowed_access_tiers, ['public']);
  assert.equal(buildAccessDescriptor({ user_ref: 'x' }, 'public_user').personal_scope_available, false);
});

// GPT challenge 8621de8d finding 2. An earlier revision derived admin/personal tiers straight from
// raw context fields, so a caller asserting {admin:true} unlocked private material — the same defect
// shape that was just closed in fn_raziel_research_intel_scoped. Authority must be ATTESTED.
test('root of trust: a bare caller claim of admin grants nothing, and the refusal is visible', () => {
  const descriptor = buildAccessDescriptor(UNATTESTED_AUTH, 'admin');
  assert.deepEqual(descriptor.allowed_access_tiers, ['public']);
  assert.equal(descriptor.admin, false);
  assert.equal(descriptor.authenticated, false);
  assert.equal(descriptor.personal_scope_available, false);
  assert.equal(descriptor.authority_source, null);
  assert.equal(descriptor.unverified_authority_claims_ignored, true, 'an ignored claim must be reported, not silently dropped');
});

test('root of trust: only an attested authority widens, and only as far as it attests', () => {
  const admin = buildAccessDescriptor(ATTESTED_ADMIN, 'admin');
  assert.deepEqual(admin.allowed_access_tiers, ['public', 'public_candidate', 'private', 'personal']);
  assert.equal(admin.authority_source, 'supabase_auth');

  // A verified PERSON reaches their own personal scope and nobody else's private rows.
  const person = buildAccessDescriptor(PRIVATE_AUTH, 'authenticated_user');
  assert.deepEqual(person.allowed_access_tiers, ['public', 'personal']);
  assert.equal(person.admin, false);

  // An unknown authority source is not an authority.
  assert.deepEqual(
    buildAccessDescriptor({ verified_authority: { source: 'i-said-so', admin: true } }, 'admin').allowed_access_tiers,
    ['public'],
  );
});

test('root of trust: a hand-crafted descriptor cannot widen the boundary filter it is meant to restrain', () => {
  // Dropping unknown tiers is not enough on its own — a well-formed hostile descriptor must fail too.
  const hostile = normalizeAccessDescriptor({ allowed_access_tiers: ['private', 'personal', 'made_up'], admin: true, authenticated: true });
  assert.deepEqual(hostile.allowed_access_tiers, ['public']);
  assert.equal(hostile.admin, false);
  assert.equal(hostile.unverified_authority_claims_ignored, true);

  // Garbage fails closed rather than throwing.
  assert.deepEqual(normalizeAccessDescriptor('nope').allowed_access_tiers, ['public']);
  assert.deepEqual(normalizeAccessDescriptor(null).allowed_access_tiers, ['public']);

  // A genuine attested descriptor survives the round trip intact.
  const real = buildAccessDescriptor(ATTESTED_ADMIN, 'admin');
  assert.deepEqual(normalizeAccessDescriptor(real).allowed_access_tiers, real.allowed_access_tiers);
});

test('root of trust: the composition boundary filters on the NORMALIZED descriptor, not the one it was handed', () => {
  const privateFinding = numberLookupRowsToUniversalFindings([governedRow()])
    .map(f => ({ ...f, access: { tier: 'private', reason: null } }));
  const bundle = composeResearchResultBundle({
    // A caller trying to unlock access-controlled material by asserting its own descriptor.
    accessDescriptor: { allowed_access_tiers: ['public', 'private'], admin: true },
    capabilities: [{ key: 'research_objects', status: CAPABILITY_STATUS.EXECUTED, access_class: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED, findings: privateFinding }],
  });
  assert.equal(bundle.findings.length, 0);
  assert.equal(bundle.coverage.access_filtered, 1);
  assert.deepEqual(bundle.access.allowed_access_tiers, ['public']);
});

// ── 2. AUTH SNAPSHOT MUTATION ─────────────────────────────────────────────────────────────
test('auth snapshot mutation: the access descriptor is by-value and frozen, so a consumer cannot widen access', async () => {
  const bundle = await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: numberIdentity(358),
    requestedCapabilities: ['numeric'], contextType: 'public_user', authorizationContext: null,
    executors: createCanonicalW2Executors({ supabase: lookupSupabase(v => [governedRow({ value: v })]) }),
  });

  const descriptor = bundle.plan.access;
  assert.equal(Object.isFrozen(descriptor), true);
  assert.equal(Object.isFrozen(descriptor.allowed_access_tiers), true);

  // Attempt to widen — silently ignored in sloppy mode, throws in strict; either way nothing widens.
  try { descriptor.admin = true; } catch { /* strict mode */ }
  try { descriptor.allowed_access_tiers.push('private'); } catch { /* strict mode */ }
  assert.equal(bundle.plan.access.admin, false);
  assert.deepEqual(bundle.plan.access.allowed_access_tiers, ['public']);

  // The snapshot carries the SAME by-value descriptor, not a second mutable copy of authority.
  assert.deepEqual(bundle.resolved_run_snapshot.access.allowed_access_tiers, ['public']);

  // And a mutated snapshot cannot be replayed into a wider filter: the boundary re-derives from the
  // descriptor it is given, and a tampered descriptor still only ever holds public.
  const replay = composeResearchResultBundle({
    plan: bundle.plan,
    capabilities: [{ key: 'research_objects', status: CAPABILITY_STATUS.EXECUTED, access_class: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED, findings: numberLookupRowsToUniversalFindings([governedRow()]).map(f => ({ ...f, access: { tier: 'private', reason: null } })) }],
  });
  assert.equal(replay.findings.length, 0);
  assert.equal(replay.coverage.access_filtered, 1);
});

// ── 3. DENIED research_objects + NO RAW-SOURCE LEAKAGE ────────────────────────────────────
const PRIVATE_RESEARCH_ROWS = [
  { id: 'ro-1', kind: 'fact', statement: 'PRIVATE-STATEMENT-must-not-leak', privacy_scope: 'private', contributor: 'PRIVATE-CONTRIBUTOR', source: 'wa', value: 358, terms: ['משיח'] },
  { id: 'ro-2', kind: 'question', statement: 'CANDIDATE-STATEMENT-must-not-leak', privacy_scope: 'public_candidate', contributor: 'X', source: 'post', value: 358, terms: [] },
];

test('denied research_objects: with no injected access-filtered reader the capability stays fail-closed', async () => {
  const executors = createCanonicalW2Executors({ supabase: lookupSupabase(() => []) });
  const out = await executors.research_objects({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(out.accessClass, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED);
  assert.deepEqual(out.findings, []);
});

test('denied research_objects: private + public_candidate rows are dropped at the boundary for a public caller, with zero raw-source leakage', async () => {
  const bundle = await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: numberIdentity(358),
    requestedCapabilities: ['research_objects'], contextType: 'public_user', authorizationContext: null,
    executors: createCanonicalW2Executors({
      supabase: lookupSupabase(() => []),
      fetchResearchObjects: async () => PRIVATE_RESEARCH_ROWS,
    }),
  });

  const serialized = JSON.stringify(bundle);
  assert.equal(serialized.includes('PRIVATE-STATEMENT-must-not-leak'), false, 'private statement leaked');
  assert.equal(serialized.includes('CANDIDATE-STATEMENT-must-not-leak'), false, 'public_candidate statement leaked');
  assert.equal(serialized.includes('PRIVATE-CONTRIBUTOR'), false, 'contributor leaked');
  assert.equal(serialized.includes('ro-1'), false, 'research object id leaked');

  assert.equal(bundle.findings.length, 0);
  const cap = bundle.capability_trace.find(x => x.key === 'research_objects');
  assert.equal(cap.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(cap.access_filtered.count, 2);
  assert.equal(bundle.coverage.access_filtered, 2);
  // Withheld is NOT "searched and found absent".
  assert.equal(bundle.coverage.negative_result, 0);
  assert.equal(bundle.invariants.access_filtered_is_not_negative_evidence, true);
});

test('denied research_objects: an admin descriptor legitimately unlocks the same rows', async () => {
  const bundle = await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: numberIdentity(358),
    requestedCapabilities: ['research_objects'], contextType: 'admin',
    authorizationContext: ATTESTED_ADMIN,
    executors: createCanonicalW2Executors({
      supabase: lookupSupabase(() => []),
      fetchResearchObjects: async () => PRIVATE_RESEARCH_ROWS,
    }),
  });
  assert.equal(bundle.findings.length, 2);
  assert.equal(bundle.coverage.access_filtered, 0);
});

test('denied research_objects: an access-controlled Finding with NO declared tier is refused, not passed', () => {
  const untiered = { access: { tier: null } };
  assert.equal(findingAccessDecision(untiered, buildAccessDescriptor(null, 'public_user'), ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED).allowed, false);
  // A public source may legitimately carry no per-row tier.
  assert.equal(findingAccessDecision(untiered, buildAccessDescriptor(null, 'public_user'), ACCESS_CLASS.PUBLIC_SOURCE).allowed, true);
  // But an explicitly restricted tier still loses, whatever the class.
  assert.equal(findingAccessDecision({ access: { tier: 'private' } }, buildAccessDescriptor(null, 'public_user'), ACCESS_CLASS.PUBLIC_SOURCE).allowed, false);
});

test('a reader that refuses is context_required, never a negative research result', async () => {
  const executors = createCanonicalW2Executors({
    supabase: lookupSupabase(() => []),
    fetchResearchObjects: async () => { const e = new Error('permission denied for table research_objects'); e.name = 'PostgrestError'; throw e; },
  });
  const out = await executors.research_objects({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.notEqual(out.status, CAPABILITY_STATUS.NEGATIVE_RESULT);
  assert.equal(JSON.stringify(out).includes('permission denied'), false, 'raw source error text must not travel');
});

// ── 4. NUMBER -> UNIVERSAL FINDING · governed vs legacy_verified ──────────────────────────
test('358 governed row becomes a Universal Finding keyed on source-native bid_id, not on label+value', () => {
  const [finding] = numberLookupRowsToUniversalFindings([governedRow()]);
  assert.equal(finding.identity.sourceIdentity.bidId, 'bid-governed-1');
  assert.equal(finding.identity.sourceIdentity.table, 'bidim');
  assert.equal(finding.identity.entityRef, 'node:node-1');
  assert.equal(finding.source.sourceRef, 'bidim:bid-governed-1');
  assert.equal(finding.id.includes('bid-governed-1'), true);
  // GPT challenge 8621de8d finding 1. An earlier revision wrote bidim.provenance_state into `status`
  // and called it GOVERNANCE. truth_axes_foundation_law v3 AXIS 3 defines governance as HUMAN-GATE
  // acceptance over candidate|approved|canonical|rejected, and INVARIANT G2 forbids inferring it
  // from verification. A bidim row has no Human-Gate state at all, so both semantic axes stay null
  // and the computation history lives on the provenance axis instead.
  assert.equal(finding.status, null);
  assert.equal(finding.stage, null);
  assert.equal(finding.provenance.rowProvenanceState, 'governed');
  assert.equal(finding.provenance.engineRunId, 'run-e1');
  assert.equal(finding.projection.dimensions.numberLookup.provenanceState, 'governed');
  // A governed row is the engine's own output; no claim was submitted, so nothing was "matched".
  assert.equal(finding.verification.verification_state, 'not_tested');
  assert.equal(finding.evidence.facts[0].engine_run_id, 'run-e1');
  assert.equal(finding.evidence.facts[0].method_version, 1);
  assert.deepEqual(finding.evidence.facts[0].dependency_version_snapshot, { ragil: 1 });
});

test('legacy_verified row honestly reports match, and a recorded mismatch reports mismatch', () => {
  const [match] = numberLookupRowsToUniversalFindings([legacyVerifiedRow()]);
  assert.equal(match.status, null, 'provenance is never written into the governance axis');
  assert.equal(match.provenance.rowProvenanceState, 'legacy_verified');
  assert.equal(match.verification.verification_state, 'match');
  assert.equal(match.verification.claimed_value, 358);
  assert.equal(match.evidence.facts[0].verified_run_id, 'run-v1');

  const [mismatch] = numberLookupRowsToUniversalFindings([legacyVerifiedRow({ bid_id: 'bid-legacy-2', verified_mismatch_value: 359 })]);
  assert.equal(mismatch.verification.verification_state, 'mismatch');
  assert.equal(mismatch.verification.claimed_value, 358);
  assert.equal(mismatch.verification.engine_result, 359);
});

test('a row with neither a governed run nor a verification run stays honestly unknown', () => {
  const [unknown] = numberLookupRowsToUniversalFindings([governedRow({ bid_id: 'b-x', row_provenance_state: 'legacy_unknown', engine_run_id: null })]);
  assert.equal(unknown.verification.verification_state, null);
});

test('two distinct bidim rows for the same phrase+method+value stay two Findings, never collapsed by label', () => {
  const rows = [governedRow({ bid_id: 'gen-1' }), governedRow({ bid_id: 'gen-2', engine_run_id: 'run-e2' })];
  const findings = numberLookupRowsToUniversalFindings(rows);
  assert.equal(findings.length, 2);
  assert.notEqual(findings[0].id, findings[1].id);
});

test('377 lookup mixes governed and legacy_verified rows and preserves both provenance states', async () => {
  const rows377 = [
    governedRow({ bid_id: 'g377', value: 377, phrase: 'עולם הבא' }),
    legacyVerifiedRow({ bid_id: 'l377', value: 377, phrase: 'ושבתי' }),
  ];
  const out = await createCanonicalW2Executors({ supabase: lookupSupabase(() => rows377) })
    .numeric({ identityResolution: { identities: numberIdentity(377) } });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.deepEqual(out.findings.map(f => f.provenance.rowProvenanceState).sort(), ['governed', 'legacy_verified']);
  assert.deepEqual(out.findings.map(f => f.verification.verification_state).sort(), ['match', 'not_tested']);
  // Neither semantic axis is invented from provenance.
  assert.deepEqual(out.findings.map(f => f.status), [null, null]);
  assert.deepEqual(out.findings.map(f => f.stage), [null, null]);
  assert.equal(JSON.stringify(out.trace).includes('עולם הבא'), false, 'raw phrase must not travel in the trace');
});

// ── 5. HIGH-CARDINALITY FAN-OUT · bounded output + continuation ───────────────────────────
function manyRows(count, value = 358) {
  return Array.from({ length: count }, (_, i) => governedRow({
    bid_id: `bid-${String(i).padStart(4, '0')}`,
    word_id: `w-${i}`,
    phrase: `phrase-${String(i).padStart(4, '0')}`,
    value,
    method_governed: i % 5 !== 0,
    value_index: i,
  }));
}

test('high-cardinality: a 500-row value returns a bounded window that never claims to be exhaustive', async () => {
  const bundle = await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: numberIdentity(358),
    requestedCapabilities: ['numeric'],
    executors: createCanonicalW2Executors({ supabase: lookupSupabase(v => manyRows(500, v)) }),
  });

  const cap = bundle.capability_trace.find(x => x.key === 'numeric');
  assert.equal(cap.bounded.total_count, 500);
  assert.equal(cap.bounded.returned_count, 50);
  assert.equal(cap.bounded.truncated, true);
  assert.equal(bundle.findings.length, 50);
  assert.equal(bundle.output_bounds.truncated, true);

  // Continuation is first-class, so the caller can actually get the rest.
  const next = bundle.next_actions.find(a => a.action === 'continue_bounded_capability');
  assert.ok(next, 'a truncated capability must offer a continuation');
  assert.equal(next.capability, 'numeric');
  assert.equal(next.continuation.remaining, 450);
  assert.ok(next.continuation.after_bid_id);
});

test('high-cardinality: ordering is deterministic and governed-first, and paging is disjoint and total', () => {
  const rows = manyRows(120);
  const first = boundNumberLookupRows(rows, { limit: 40 });
  const second = boundNumberLookupRows(rows, { limit: 40, afterBidId: first.bounded.continuation.after_bid_id });
  const third = boundNumberLookupRows(rows, { limit: 40, afterBidId: second.bounded.continuation.after_bid_id });

  // Governed before historical — Rank, Don't Hide, never Hide.
  assert.equal(first.rows.every(r => r.method_governed === true), true);
  assert.equal(first.bounded.source_exhaustive, false);
  assert.equal(third.bounded.truncated, false);
  assert.equal(third.bounded.source_exhaustive, true);

  const ids = [...first.rows, ...second.rows, ...third.rows].map(r => r.bid_id);
  assert.equal(ids.length, 120, 'pages must cover the population exactly once');
  assert.equal(new Set(ids).size, 120, 'pages must not repeat a row');

  // Deterministic: the same input always produces the same order.
  assert.deepEqual(boundNumberLookupRows(rows, { limit: 40 }).rows.map(r => r.bid_id), first.rows.map(r => r.bid_id));
  // ...and is independent of the order the source happened to hand them back in.
  assert.deepEqual(boundNumberLookupRows([...rows].reverse(), { limit: 40 }).rows.map(r => r.bid_id), first.rows.map(r => r.bid_id));
});

// ── 6. PER-LENS ACCESS/SEMANTIC HONESTY ───────────────────────────────────────────────────
test('per-lens classes are honest: hot_context is server-only and dossier/journey/neighbors are not evidence', () => {
  assert.equal(numericLensMap.hot_context.client_executable, false);
  assert.equal(numericLensMap.hot_context.emits_findings, false);
  assert.equal(numericLensMap.number_dossier.semantic_class, 'context');
  assert.equal(numericLensMap.number_journey.semantic_class, 'projection');
  assert.equal(numericLensMap.neighbors.semantic_class, 'ranking');
  assert.equal(numericLensMap.number_lookup.semantic_class, 'evidence');
  assert.equal(numericLensMap.gematria_reverse.is_logical_alias, true);
});

// GPT challenge 8621de8d finding 3. Public EXECUTE on a SECURITY DEFINER RPC is an ACCESS FACT, not
// a publication decision (truth_axes_foundation_law v3 INVARIANT P3). fn_number_dossier reads
// decision_ledger/research_candidates/learned_patterns/topic_cards and fn_number_journey reads
// journey_seeds, none of which grant anon or authenticated SELECT.
test('definer-elevated lenses are never classified as public source material', () => {
  for (const lens of ['number_dossier', 'number_journey']) {
    assert.equal(numericLensMap[lens].access_class, 'definer_elevated', `${lens} must not claim public_source`);
    assert.equal(numericLensMap[lens].publication_authorized, false);
    assert.equal(numericLensMap[lens].emits_findings, false);
  }
  // The genuinely public, non-definer lookup contract keeps its public classification.
  assert.equal(numericLensMap.number_lookup.access_class, 'public_source');
});

test('a definer-elevated lens payload never reaches the capability trace', async () => {
  const SENSITIVE = 'HUMAN-REASON-internal-must-not-leak';
  const supabase = {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') return { data: [] };
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, decisions: [{ human_reason: SENSITIVE }] } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value, seed: { status: 'draft', readiness: 0.2 } } };
      if (name === 'number_neighbors') return { data: [{ value: 424 }] };
      return { data: null };
    },
  };
  const out = await createCanonicalW2Executors({ supabase }).numeric({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(JSON.stringify(out.trace).includes(SENSITIVE), false, 'decision_ledger human_reason leaked into the trace');
  assert.equal(JSON.stringify(out.trace).includes('draft'), false, 'journey_seeds draft state leaked into the trace');
  assert.deepEqual(out.findings, []);
});

test('a server-only lens cannot be dispatched from a client context', () => {
  assert.throws(
    () => createCanonicalW2Executors({ supabase: lookupSupabase(() => []), numericLenses: ['number_lookup', 'hot_context'] }),
    /server-only lenses/,
  );
  // It stays available to a caller that genuinely holds a server path.
  assert.ok(createCanonicalW2Executors({ supabase: lookupSupabase(() => []), numericLenses: ['number_lookup', 'hot_context'], serverContext: true }));
});

test('context/projection/ranking lenses execute but never become positive Findings', async () => {
  const out = await createCanonicalW2Executors({ supabase: lookupSupabase(() => []) })
    .numeric({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(out.trace.per_lens.number_dossier.status, 'ok');
  assert.equal(out.trace.per_lens.neighbors.status, 'ok');
  assert.deepEqual(out.findings, []);
  assert.equal(out.trace.lens_classes.number_dossier.emits_findings, false);
});

// ── 7. numeric_operators · governed Rule Application, never fabricated ────────────────────
test('numeric_operators refuses to emit a rule application whose rule_version is not attested', async () => {
  const out = await createCanonicalW2Executors({ supabase: lookupSupabase(() => []) })
    .numeric_operators({ identityResolution: { identities: numberIdentity(1358) } });
  assert.equal(out.status, CAPABILITY_STATUS.UNVERIFIED);
  assert.deepEqual(out.findings, []);
  assert.ok(out.trace.skipped.some(s => s.rule_id === 'shitat_haechad_alef_law' && /not attested/.test(s.reason)));
});

test('numeric_operators emits a DERIVATION carrying rule_id/version/operation/input/output provenance', async () => {
  const executors = createCanonicalW2Executors({
    supabase: lookupSupabase(() => []),
    numericRuleVersions: async ids => {
      assert.deepEqual([...ids], [...NUMERIC_SYSTEM_METHOD_RULE_IDS]);
      return { shitat_haechad_alef_law: 1, zero_navigation: 1 };
    },
  });
  const out = await executors.numeric_operators({ identityResolution: { identities: numberIdentity(1358) } });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);

  const finding = out.findings[0];
  assert.equal(finding.kind, 'numeric-operator');
  assert.equal(finding.source.method, 'shitat_haechad_alef_law');
  assert.equal(finding.provenance.createdBy, 'RULE:shitat_haechad_alef_law@v1');
  const fact = finding.evidence.facts[0];
  assert.equal(fact.rule_id, 'shitat_haechad_alef_law');
  assert.equal(fact.rule_version, 1);
  assert.equal(fact.rule_version_source, 'nodes.rule_version');
  assert.equal(fact.operation, 'leading_one_split');
  assert.equal(fact.input, 1358);
  assert.deepEqual(fact.output, { leading_unit: 1000, remainder: 358 });
  // A rule application transforms an existing value — it is never independent corroboration of it.
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.DERIVATION);
  assert.equal(finding.verification.verification_state, 'not_tested');
  assert.equal(finding.stage, null);
});

test('numeric_operators takes zero_scale_law version from the canonical fn_zero_scale RPC, not from a local helper', async () => {
  const executors = createCanonicalW2Executors({
    supabase: lookupSupabase(() => [], { fn_zero_scale: args => ({ data: { method_id: 'zero_scale', version: 1, applicable: true, value: args.p_value, core_root: 358, scale_chain: [358, 3580] } }) }),
  });
  const out = await executors.numeric_operators({ identityResolution: { identities: numberIdentity(3580) } });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  const zero = out.findings.find(f => f.source.method === 'zero_scale_law');
  assert.ok(zero);
  assert.equal(zero.evidence.facts[0].rule_version_source, 'fn_zero_scale.version');
  assert.equal(zero.evidence.facts[0].engine_ref, 'fn_zero_scale');
  assert.equal(zero.source.engine, 'fn_zero_scale');
});

// ── 8. GRAPH · only through the existing canonical adapter ────────────────────────────────
test('graph is missing_adapter until the EXISTING canonical adapter is injected — W2 never builds a second resolver', async () => {
  const out = await createCanonicalW2Executors({ supabase: lookupSupabase(() => []) })
    .graph({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.match(out.reason, /entityGraphFinding/);
});

test('graph requires a canonical node identity handoff and never derives one from a label or value', async () => {
  const executors = createCanonicalW2Executors({
    supabase: lookupSupabase(() => []),
    graph: { fetchEntityFindings: async () => { throw new Error('must not be called without an identity'); } },
  });
  const out = await executors.graph({ identityResolution: { identities: numberIdentity(358) } });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(out.trace.identity_handoff, 'absent');
});

test('graph executes through the canonical adapter once the node identity is handed off', async () => {
  let asked = null;
  const executors = createCanonicalW2Executors({
    supabase: lookupSupabase(() => []),
    graph: { fetchEntityFindings: async nodeId => { asked = nodeId; return numberLookupRowsToUniversalFindings([governedRow()]); } },
  });
  const out = await executors.graph({
    identityResolution: { identities: [{ type: 'number', value: 358, ref: 'node:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] },
  });
  assert.equal(asked, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.owner, 'unified_graph_law');
  assert.equal(out.findings.length, 1);
});

// ── 9. PLAN SHAPE ─────────────────────────────────────────────────────────────────────────
test('the plan itself never carries a raw authorization context', () => {
  const plan = buildResearchPlanV2({
    question: '358', identityResolution: { identities: [], text_calculation_allowed: true },
    contextType: 'authenticated_user', authorizationContext: PRIVATE_AUTH,
  });
  assert.equal('authorization_context' in plan, false);
  assert.equal(JSON.stringify(plan).includes(SECRET), false);
  assert.equal(plan.access.derived_from, 'authorization_context');
});
