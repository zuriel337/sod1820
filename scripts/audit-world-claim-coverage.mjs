// Offline, bounded review adapter. No connection, execution, runtime projection or new parser.
// rehearsal-sql emits a reviewed transaction ending in ROLLBACK; it never executes SQL.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extractCandidates } from '../src/lib/analysisFlow.js';
import { extractCompoundClaims, verifyCandidate, computeExtractionIntegrity, buildIntakeMeta } from '../src/lib/triage.js';
import { normalizeForCalc } from '../src/lib/gematria.js';
import { makeUniversalFinding } from '../src/lib/research/universalFinding.js';
import { capabilityResult, composeResearchResultBundle, ACCESS_CLASS,
  EVIDENCE_RELATION } from '../src/lib/research/researchResultBundle.js';
import { assertReadOnly } from './audit-world-corpus-residual.mjs';

const evidenceUrl = new URL('../docs/reviews/world-claim-coverage-evidence-20261026.json', import.meta.url);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u;
const md5 = text => createHash('md5').update(text).digest('hex');
const check = (ok, reason) => { if (!ok) throw new Error(reason); };
export const readEvidence = () => JSON.parse(readFileSync(evidenceUrl, 'utf8'));
export const readWriterSnapshot = () => JSON.parse(readFileSync(new URL(
  '../docs/reviews/world-exact-claim-writer-snapshot-20261026.json', import.meta.url), 'utf8'));

export function validateEvidence(evidence) {
  const { original, rows, sources, reviewPlan } = evidence;
  for (const items of [original, rows, sources, reviewPlan]) {
    check(Array.isArray(items) && items.length > 0, 'Missing bounded input');
    check(items.every(r => uuid.test(r.id)), 'Invalid ID');
    check(new Set(items.map(r => r.id)).size === items.length, 'Duplicate input ID');
  }
  check(reviewPlan.length === original.length, 'Incomplete review coverage');
  const rowMap = new Map(rows.map(r => [r.id, r]));
  const sourceMap = new Map(sources.map(r => [r.id, r]));
  for (const s of sources) {
    check(md5(s.text) === s.md5, 'Source fingerprint drift');
    check(s.status === 'live' && s.page_only === false && s.channel === 'torat-haremez'
      && s.contributor_id === 'c66f0464-0928-490e-be9b-66d8a87e7fc8', 'Source admission drift');
  }
  for (const row of rows) {
    check(row.privacy_scope === 'public' && ['approved', 'canonical'].includes(row.status), 'Nonpublic input');
    check(row.source_ref.split('#')[0] === `channel_updates:${row.source_id}`, 'Wrong exact source');
    check(sourceMap.has(row.source_id), 'Missing source');
  }
  for (const plan of reviewPlan) {
    check(['coverage_gap', 'composite', 'letter_decomposition', 'atomic_extraction',
      'atomic_punctuation', 'symbol_unresolved'].includes(plan.kind), 'Unknown review kind');
    const previous = original.find(r => r.id === plan.id), live = rowMap.get(plan.id);
    check(previous && live, 'Missing finding');
    check(previous.value === live.value && previous.source_ref === live.source_ref
      && previous.phrase === live.verification?.phrase && previous.method === live.verification?.method,
    'Finding drift since residual audit');
    check(previous.method === 'רגיל' && Number.isSafeInteger(previous.value), 'Unsupported audit input');
    if (plan.kind === 'coverage_gap') check(/^[א-ת]+(?: [א-ת]+)*$/u.test(previous.phrase), 'Mixed coverage input');
    const { start, end, excerpt } = plan.sourceSpan;
    check(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start,
      'Invalid source span');
    check(sourceMap.get(live.source_id).text.slice(start, end) === excerpt, 'Source span mismatch');
    if (plan.operand) check(excerpt.includes(plan.operand), 'Operand is not an exact source substring');
    if (plan.kind === 'letter_decomposition') {
      check(Array.isArray(plan.letterValues) && plan.letterValues.length === normalizeForCalc(plan.operand).length
        && plan.letterValues.every(Number.isSafeInteger), 'Missing positional letter claims');
      check(excerpt.includes(plan.letterValues.join(' + ')), 'Letter claims not found in source');
    }
    for (const id of previous.same_source_value_ids) {
      const retained = rowMap.get(id);
      check(retained && retained.source_id === live.source_id && retained.value === live.value,
        'Retained row missing or cross-source/value');
    }
    for (const span of plan.representativeSpans || []) {
      check(previous.same_source_value_ids.includes(span.id)
        && rowMap.get(span.id).statement.includes(span.text), 'Unbound representative span');
    }
  }
  return evidence;
}

// Calculation-normalized operand coverage != canonical claim identity.
// All normalization comes from the existing shared extractor. Operators and word order
// are never discarded here; a covered operand still does not justify hiding a record.
export function compareCoverage(finding, representatives, explicitSpans = []) {
  const covering = representatives.filter(row => row.source_id === finding.source_id
    && row.value === finding.value).flatMap(row => {
    const texts = [row.statement, ...(row.terms || []).map(t => `«${t}»`),
      ...explicitSpans.filter(s => s.id === row.id).map(s => `«${s.text}»`)];
    return extractCandidates(texts.join('\n')).filter(c => c.norm === finding.phrase)
      .map(c => ({ id: row.id, text: c.text, norm: c.norm }));
  });
  const coveredIds = [...new Set(covering.map(r => r.id))].sort();
  return { coverage: coveredIds.length ? 'operand_covered_format_variant' : 'additional_operand_required',
    coveredIds, evidence: covering, suppress: false };
}

export function replayPlan(plan, finding) {
  if (['composite', 'letter_decomposition'].includes(plan.kind)) {
    const claims = extractCompoundClaims(plan.sourceSpan.excerpt);
    // Never select an unrelated matching result from the full source or skip failed operands.
    const claim = claims.length === 1 ? claims[0] : null;
    const ok = claim?.status === 'ENGINE_VERIFIED_COMPOSITE' && claim.skipUsed === 0
      && claim.linkCount >= 2 && claim.linkValues.every(n => n === finding.value)
      && claim.operands.every(o => o.ok && o.method === finding.method);
    const atomic = plan.operand ? verifyCandidate({ type: 'explicit-claim',
      text: plan.operand, method: finding.method, value: finding.value }) : null;
    return { calculation: ok && (!atomic || atomic.engine_verified === true) ? 'match' : 'not_tested',
      type: 'derivation', claim, atomic, automaticPromotion: false };
  }
  const operand = plan.operand || finding.phrase;
  const atomic = verifyCandidate({ type: 'explicit-claim', text: operand,
    method: finding.method, value: finding.value });
  return { calculation: plan.kind === 'symbol_unresolved' ? 'not_tested'
    : atomic.engine_verified === true ? 'match' : 'mismatch',
  type: 'atomic', operand, atomic, automaticPromotion: false };
}

export function collectReplayInputs(evidence) {
  validateEvidence(evidence);
  const inputs = [];
  for (const plan of evidence.reviewPlan) {
    const finding = evidence.original.find(r => r.id === plan.id);
    const replay = replayPlan(plan, finding);
    if (replay.atomic) inputs.push({ id: plan.id, role: 'atomic', method: finding.method,
      phrase: plan.operand || finding.phrase, expected: finding.value });
    for (const [index, op] of (replay.claim?.operands || []).entries()) {
      inputs.push({ id: plan.id, role: `operand_${index}`, method: op.method,
        phrase: op.phrase, expected: op.value });
    }
    if (plan.kind === 'letter_decomposition') {
      // Leaves only. Arithmetic remains the canonical shared chain, not a new evaluator.
      for (const [index, letter] of [...normalizeForCalc(plan.operand)].entries()) {
        inputs.push({ id: plan.id, role: `letter_${index}`, method: finding.method,
          phrase: letter, expected: plan.letterValues[index] });
      }
    }
  }
  return inputs;
}

export function buildReplaySql(evidence) {
  const quote = text => `'${String(text).replaceAll("'", "''")}'`;
  const values = collectReplayInputs(evidence).map(r => `(${quote(r.id)}::uuid,${quote(r.role)},`
    + `${quote(r.method)},${quote(r.phrase)},${r.expected == null ? 'NULL' : r.expected}::integer)`).join(',\n');
  return assertReadOnly(`WITH inputs(id,role,method,phrase,expected) AS (VALUES ${values})
    SELECT i.*,public.fn_method_value(i.method,i.phrase) computed,
      now() checked_at,
      md5(pg_get_functiondef('public.fn_method_value(text,text)'::regprocedure)) engine_definition_md5
    FROM inputs i ORDER BY id,role`);
}

export function buildReview(evidence) {
  validateEvidence(evidence);
  const rowMap = new Map(evidence.rows.map(r => [r.id, r]));
  const allExpectedChecks = collectReplayInputs(evidence);
  return evidence.reviewPlan.map(plan => {
    const finding = evidence.original.find(r => r.id === plan.id);
    const live = rowMap.get(plan.id);
    const retained = finding.same_source_value_ids.map(id => rowMap.get(id));
    const coverage = plan.kind === 'coverage_gap'
      ? compareCoverage(finding, retained, plan.representativeSpans) : null;
    const replay = replayPlan(plan, finding);
    const dbChecks = (evidence.engineReplays || []).filter(r => r.id === plan.id);
    const expectedChecks = allExpectedChecks.filter(r => r.id === plan.id);
    const databaseConfirmed = expectedChecks.length > 0 && dbChecks.length === expectedChecks.length
      && expectedChecks.every(expected => dbChecks.some(r => r.role === expected.role
        && r.phrase === expected.phrase && r.method === expected.method
        && r.expected === expected.expected
        && typeof r.computed === 'number' && Number.isFinite(r.computed)
        && (expected.expected == null || r.computed === expected.expected)));
    const target = (evidence.targets || []).filter(t => t.value === finding.value);
    const targetId = target.length === 1 ? target[0].id : null;
    const ready = replay.calculation === 'match' && databaseConfirmed && !!targetId;
    const canonicalDuplicateIds = retained.filter(r => r.source_uid === live.source_uid
      && r.claim_uid === live.claim_uid).map(r => r.id);
    const covered = coverage?.coveredIds || [];
    const displayCandidates = [live, ...retained.filter(r => covered.includes(r.id))];
    displayCandidates.sort((a,b) => b.statement.length-a.statement.length || a.id.localeCompare(b.id));
    return { id: plan.id, sourceRef: live.source_ref, sourceId: live.source_id,
      sourceSpan: plan.sourceSpan, phrase: finding.phrase, value: finding.value,
      kind: plan.kind, replay, databaseConfirmed, targetId,
      recommendation: !ready ? 'requires_review' : coverage ? coverage.coverage : 'typed_calculation_ready',
      coverage, canonicalDuplicateIds, retainedIds: retained.map(r => r.id),
      preferredDisplayId: displayCandidates[0].id,
      keepAllRecords: true, suppress: false, independentSourcesAdded: 0,
      strength: null, evidenceQuality: null, publicationChanged: false, promoted: false,
      interpretationVerified: false, note: plan.note };
  });
}

export function summarizeReview(rows) {
  const counts = {};
  for (const r of rows) counts[r.recommendation] = (counts[r.recommendation] || 0) + 1;
  return { rows: rows.length, sources: new Set(rows.map(r => r.sourceId)).size, counts,
    canonicalDuplicatePairs: rows.reduce((n,r) => n+r.canonicalDuplicateIds.length, 0),
    livePromotions: 0, hiddenRecords: 0 };
}

// The fixed, previously inspected 27 cases, NOT a new admission rule or parser.
// Their calculation status cannot confer completeness, publication or tree membership.
export function selectTypedClaims(evidence) {
  const rows = buildReview(evidence).filter(r => ['composite', 'letter_decomposition',
    'atomic_extraction', 'atomic_punctuation'].includes(r.kind));
  check(rows.length === 27 && rows.every(r => r.databaseConfirmed && r.replay.calculation === 'match'),
    'Typed review needs the exact 27 verified cases');
  return rows.map(r => {
    const stored = evidence.rows.find(s => s.id === r.id);
    return { ...r, stored, sourceMd5:evidence.sources.find(s => s.id === r.sourceId).md5,
      proposedStatement:r.kind === 'atomic_extraction' ? `${r.replay.operand} = ${r.value}` : stored.statement };
  });
}

export function buildTypedClaimReceiptSql(evidence) {
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;
  const selected = selectTypedClaims(evidence);
  const ids = new Set(selected.map(r => r.id));
  const inputs = collectReplayInputs(evidence).filter(r => ids.has(r.id));
  const rows = selected.map(r => `(${quote(r.id)}::uuid,${quote(r.sourceId)}::uuid,`
    + `${quote(r.sourceRef)},${quote(r.sourceMd5)},${quote(r.stored.source_uid)},`
    + `${quote(r.stored.claim_uid)},${quote(md5(r.stored.statement))},`
    + `${quote(JSON.stringify(r.stored.terms))}::jsonb,${r.value}::integer,`
    + `${quote(r.proposedStatement)},${quote(r.targetId)}::uuid)`).join(',\n');
  const leaves = inputs.map(r => `(${quote(r.id)}::uuid,${quote(r.role)},${quote(r.method)},`
    + `${quote(r.phrase)},${r.expected}::integer)`).join(',\n');
  return assertReadOnly(`WITH selected(id,source_id,source_ref,source_md5,source_uid,claim_uid,
      statement_md5,terms,value,proposed_statement,target_id) AS (VALUES ${rows}),
    leaves(id,role,method,phrase,expected) AS (VALUES ${leaves}),
    identities AS (SELECT s.*,public.fn_research_claim_uid(s.proposed_statement) proposed_claim_uid FROM selected s),
    checks AS (SELECT s.id,s.source_id,s.source_ref,s.source_md5,s.source_uid,s.claim_uid,s.statement_md5,
      s.proposed_statement,s.proposed_claim_uid,
      coalesce(ro.status='approved' AND ro.privacy_scope='public' AND ro.promoted_node_id IS NULL,false) public_unattached,
      coalesce(lower(btrim(ro.meta#>>'{ext,personal_scope,scope}')),'')<>'person_only'
        AND coalesce(lower(btrim(ro.source)),'') NOT IN ('openweb_legacy','old_chat','or-geula')
        AND coalesce(btrim(ro.contributor),'')<>'אור הגאולה' general_world_scope,
      coalesce(ro.source_ref=s.source_ref AND public.fn_research_source_uid(ro.source_ref)=s.source_uid
        AND public.fn_research_claim_uid(ro.statement)=s.claim_uid AND md5(ro.statement)=s.statement_md5
        AND to_jsonb(ro.terms)=s.terms AND ro.value=s.value,false) exact_claim,
      coalesce(cu.id=s.source_id AND cu.status='live' AND cu.page_only IS FALSE
        AND cu.channel='torat-haremez' AND cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
        AND md5(cu.text)=s.source_md5,false) exact_public_source,
      coalesce(n.id=s.target_id AND n.type='number' AND n.label=s.value::text AND n.is_active IS TRUE
        AND coalesce(n.metadata->>'space','core')='core',false) exact_target,
      (SELECT count(*)=1 FROM public.nodes nn WHERE nn.type='number' AND nn.label=s.value::text
        AND nn.is_active IS TRUE AND coalesce(nn.metadata->>'space','core')='core') unique_target,
      (SELECT count(*) FROM public.research_objects other WHERE other.id<>s.id
        AND public.fn_research_source_uid(other.source_ref)=s.source_uid
        AND public.fn_research_claim_uid(other.statement)=s.proposed_claim_uid) proposed_identity_conflicts,
      ro.meta#>'{ext,revision}' IS NULL no_existing_revision,
      ro.meta#>>'{ext,extraction_integrity,fidelity_status}' stored_fidelity
    FROM identities s LEFT JOIN public.research_objects ro ON ro.id=s.id
      LEFT JOIN public.channel_updates cu ON cu.id=s.source_id LEFT JOIN public.nodes n ON n.id=s.target_id),
    replay AS (SELECT i.*,public.fn_method_value(i.method,i.phrase) computed,
      EXISTS(SELECT 1 FROM public.gematria_methods m WHERE m.method_key=i.method AND m.in_engine IS TRUE) method_in_engine
      FROM leaves i)
    SELECT now() checked_at,
      (SELECT jsonb_agg(c ORDER BY c.id) FROM checks c) claims,
      (SELECT jsonb_agg(r ORDER BY r.id,r.role) FROM replay r) engine_replays,
      md5(pg_get_functiondef('public.fn_method_value(text,text)'::regprocedure)) engine_definition_md5,
      md5(pg_get_functiondef('public.fn_research_claim_uid(text)'::regprocedure)) claim_identity_definition_md5,
      md5(pg_get_functiondef('public.fn_research_object_correct(uuid,text,text,integer,text[],text[])'::regprocedure)) correction_definition_md5`);
}

export const readTypedClaimReceipt = () => JSON.parse(readFileSync(new URL(
  '../docs/reviews/world-typed-claim-receipt-20261026.json', import.meta.url), 'utf8'));

export function buildTypedClaimReview(evidence, receipt) {
  const selected = selectTypedClaims(evidence);
  check(receipt && !Number.isNaN(Date.parse(receipt.checked_at)), 'Missing receipt date');
  check(receipt.claims?.length === selected.length
    && new Set(receipt.claims.map(r => r.id)).size === selected.length, 'Incomplete live claim receipt');
  const ids = new Set(selected.map(r => r.id));
  const expected = collectReplayInputs(evidence).filter(r => ids.has(r.id));
  check(receipt.engine_replays?.length === expected.length && expected.every(e =>
    receipt.engine_replays.filter(r => r.id === e.id && r.role === e.role && r.phrase === e.phrase
      && r.method === e.method && r.expected === e.expected && r.computed === e.expected
      && r.method_in_engine === true).length === 1), 'Live canonical replay mismatch');
  for (const key of ['engine_definition_md5','claim_identity_definition_md5','correction_definition_md5']) {
    check(/^[a-f0-9]{32}$/u.test(receipt[key]), 'Missing canonical function fingerprint');
  }
  return selected.map(r => {
    const live = receipt.claims.find(c => c.id === r.id);
    check(live && ['public_unattached','general_world_scope','exact_claim','exact_public_source',
      'exact_target','unique_target','no_existing_revision'].every(k => live[k] === true), 'Live claim scope drift');
    check(live.source_id === r.sourceId && live.source_ref === r.sourceRef && live.source_md5 === r.sourceMd5
      && live.source_uid === r.stored.source_uid && live.claim_uid === r.stored.claim_uid
      && live.statement_md5 === md5(r.stored.statement) && live.proposed_statement === r.proposedStatement
      && typeof live.proposed_claim_uid === 'string' && live.proposed_claim_uid.length > 0
      && Number.isSafeInteger(live.proposed_identity_conflicts) && live.proposed_identity_conflicts >= 0,
    'Live identity receipt drift');
    const derivation = r.replay.type === 'derivation';
    const integrity = derivation ? computeExtractionIntegrity([r.replay.claim], []) : null;
    const intakeMeta = derivation ? buildIntakeMeta({ compoundClaims:[r.replay.claim],
      sourceMediaRefs:[], extractionIntegrity:integrity }) : {};
    const correction = r.kind === 'atomic_extraction';
    const route = derivation ? (integrity.fidelityStatus === 'complete'
      ? 'derivation_slice_complete_requires_review' : 'derivation_fidelity_review')
      : !correction ? 'preserve_claim_add_calculation_trace'
      : live.proposed_identity_conflicts > 0 ? 'existing_identity_requires_review'
      : live.proposed_claim_uid !== r.stored.claim_uid ? 'governed_successor_required'
      : 'correction_identity_unchanged_requires_review';
    const operand = derivation ? null : r.replay.operand;
    const calculation = { type:derivation ? 'derivation' : 'atomic', method:derivation ? null : 'רגיל',
      operandMethod:'רגיל', value:r.value,
      sourceExpression:r.sourceSpan.excerpt, operand, normalizedOperand:operand ? normalizeForCalc(operand) : null,
      trace:derivation ? r.replay.claim : r.replay.atomic.engine_detail,
      canonicalChecks:receipt.engine_replays.filter(c => c.id === r.id),
      arithmeticVerified:true, extractionIntegrity:integrity, intakeMeta,
      ...(derivation ? {extractionScope:'source_span_only'} : {}),
      mediaInspected:false, interpretationVerified:false };
    const finding = makeUniversalFinding({
      id:`world-typed-review:${r.id}`, kind:derivation ? 'derivation' : 'gematria', stage:'claim', status:null,
      subject:{ type:'number',key:String(r.value),value:r.value,label:r.stored.statement,lang:'he' },
      source:{ engine:derivation ? 'extractCompoundClaims' : 'verifyCandidate',
        adapter:'world-offline-typed-review',sourceRef:r.sourceRef,method:derivation ? null : 'רגיל',lang:'he' },
      identity:{ sourceIdentity:{source_uid:r.stored.source_uid,claim_uid:r.stored.claim_uid},
        occurrence:{sourceId:r.sourceId,sourceMd5:r.sourceMd5,...r.sourceSpan} },
      verification:{ claimed_expression:derivation ? r.sourceSpan.excerpt : operand,
        claimed_method:derivation ? null : 'רגיל',claimed_value:r.value,
        engine_method_tested:derivation ? null : 'רגיל',
        engine_result:r.value,verification_state:'match',statement_lang:'he',scope:'calculation_only' },
      evidence:{ refs:[{sourceRef:r.sourceRef,sourceMd5:r.sourceMd5,...r.sourceSpan}],facts:[calculation] },
      // Restricts the offline proposal; does NOT change the original public row's access.
      access:{tier:'public_candidate',reason:'Unapplied typed representation; review only'},
      provenance:{createdBy:'world-offline-review',createdAt:receipt.checked_at,inputRef:r.id,parentFindingIds:[r.id]},
    });
    return { id:r.id,kind:r.kind,sourceRef:r.sourceRef,sourceId:r.sourceId,sourceSpan:r.sourceSpan,
      original:{statement:r.stored.statement,terms:r.stored.terms,value:r.value,
        sourceUid:r.stored.source_uid,claimUid:r.stored.claim_uid,status:r.stored.status,privacyScope:r.stored.privacy_scope},
      calculation,finding,route,
      correction:correction ? {proposedStatement:r.proposedStatement,proposedTerms:[operand],
        proposedClaimUid:live.proposed_claim_uid,identityConflicts:live.proposed_identity_conflicts,
        canonicalWriter:'fn_research_object_correct',execute:false} : null,
      targetId:r.targetId,retainIds:[r.id,...r.retainedIds],sourceCount:null,independentSourcesAdded:0,
      strength:null,evidenceQuality:null,publicationChanged:false,promoted:false,suppress:false,
      automaticPromotion:false,note:r.note };
  });
}

// Offline contract demonstration ONLY. Never fabricates an auth descriptor. All
// review details stay inside Findings, where the existing Bundle boundary filters them.
export function composeTypedReviewBundle(rows, accessDescriptor = null) {
  return composeResearchResultBundle({ accessDescriptor,
    capabilities:[capabilityResult({key:'world-typed-offline-review',owner:'World',
      accessClass:ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      findings:rows.map(r => r.finding),
      findingOutcomes:rows.filter(r => r.calculation.type === 'derivation').map(r => ({
        findingId:r.finding.id,evidenceRelation:EVIDENCE_RELATION.DERIVATION,dependsOn:[r.id] })),
    })] });
}

export const readSourceBindingPlan = () => JSON.parse(readFileSync(new URL(
  '../docs/reviews/world-source-bound-corrections-20261026.json', import.meta.url), 'utf8'));
export const readSourceBindingReceipt = () => JSON.parse(readFileSync(new URL(
  '../docs/reviews/world-source-bound-receipt-20261026.json', import.meta.url), 'utf8'));

// A bounded, manually reviewed evidence mapping, NOT a new general extractor.
// It neither changes the shared AST nor upgrades its generic fidelity status.
export function selectSourceBindings(evidence, plan = readSourceBindingPlan()) {
  const selected = selectTypedClaims(evidence);
  const ids = ['4ec599a6-5237-487b-9ee0-2fe57fba7610',
    'cf605c84-21e9-4a73-85c5-575e6c5fe8dd', 'da0a6436-9e18-4249-8340-470e7ccef2f2'];
  check(plan.bindings?.length === ids.length && ids.every(id =>
    plan.bindings.filter(b => b.id === id).length === 1), 'Wrong bounded binding set');
  return plan.bindings.map(binding => {
    const r = selected.find(r => r.id === binding.id);
    const source = evidence.sources.find(s => s.id === r.sourceId);
    const exact = span => {
      check(span && Number.isInteger(span.start) && Number.isInteger(span.end)
        && span.start >= 0 && span.end > span.start
        && source.text.slice(span.start, span.end) === span.excerpt, 'Binding source span drift');
      return span;
    };
    const context = exact(binding.contextSpan), spans = binding.operandSpans.map(exact);
    check(context.end === r.sourceSpan.end && context.start <= r.sourceSpan.start
      && spans.every(s => s.start >= context.start && s.end <= r.sourceSpan.start + r.sourceSpan.excerpt.length),
    'Binding is outside the exact claim context');
    const inputs = r.replay.claim.numericOccurrences.map((n, index) => ({ ...n, occurrenceIndex:index }))
      .filter(n => n.syntacticRole === 'arithmetic_input');
    check(inputs.length > 0 && inputs.every(n => n.linkIndex === 0), 'Unexpected input AST');
    let origins;
    if (binding.kind === 'adjacent_phrase_sum') {
      check(r.id === ids[0] && spans.length === 2 && inputs.length === 2
        && spans[0].start === context.start && spans[1].start > spans[0].end
        && source.text.slice(spans[0].end, spans[1].start) === '  + '
        && source.text.slice(spans[1].end, r.sourceSpan.start) === '=\n',
      'Unproven adjacent phrase-to-sum binding');
      origins = spans.map(span => ({ span, phrase:span.excerpt, role:'gematria_operand' }));
    } else {
      const originalPlan = evidence.reviewPlan.find(p => p.id === r.id);
      check(binding.kind === 'positional_letters' && r.kind === 'letter_decomposition'
        && spans.length === 1 && spans[0].start === context.start
        && spans[0].excerpt === originalPlan.operand && context.start === r.sourceSpan.start
        && context.excerpt === `${spans[0].excerpt}: ${originalPlan.letterValues.join(' + ')} = ${r.value}`,
      'Unproven positional letter binding');
      // Offset mapping only. Values come from the existing canonical engine below.
      origins = [...spans[0].excerpt.matchAll(/[א-ת]/gu)].map((match, letterIndex) => ({
        span:{start:spans[0].start + match.index, end:spans[0].start + match.index + 1, excerpt:match[0]},
        wordSpan:spans[0], letterIndex, phrase:match[0], role:'letter_value',
      }));
      check(origins.map(o => o.phrase).join('') === normalizeForCalc(originalPlan.operand),
        'Letter normalization drift');
    }
    check(origins.length === inputs.length, 'Incomplete occurrence binding');
    const bindings = inputs.map((input, index) => {
      const origin = origins[index];
      const replay = verifyCandidate({type:'explicit-claim', text:origin.phrase, method:'רגיל', value:input.value});
      check(replay.engine_verified === true, 'Source-origin calculation mismatch');
      return { value:input.value, role:origin.role, origin_type:'canonical_calculation',
        origin_statement:origin.phrase,
        origin_ref:{sourceRef:r.sourceRef, sourceMd5:source.md5, sourceSpan:origin.span,
          ...(origin.wordSpan ? {wordSpan:origin.wordSpan, letterIndex:origin.letterIndex} : {})},
        expression_ref:{expression:input.expression, link_index:input.linkIndex, ast_path:input.astPath},
        occurrenceIndex:input.occurrenceIndex, canonicalCheckRole:`source_origin_${index}`,
        method:'רגיל', verification_state:'match', calculationTrace:replay.engine_detail };
    });
    return {id:r.id, sourceRef:r.sourceRef, sourceMd5:source.md5, contextSpan:context, bindings};
  });
}

export function collectSourceBindingChecks(evidence, plan = readSourceBindingPlan()) {
  return [...selectSourceBindings(evidence, plan).flatMap(r => r.bindings.map(b => ({
    id:r.id, role:b.canonicalCheckRole, phrase:b.origin_statement, method:b.method, expected:b.value,
  }))), {id:'cf605c84-21e9-4a73-85c5-575e6c5fe8dd', role:'prose_spelling_contrast',
    phrase:'עיכוב', method:'רגיל', expected:108}];
}

export function buildSourceBindingReceiptSql(evidence, plan = readSourceBindingPlan()) {
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;
  const leaves = collectSourceBindingChecks(evidence, plan).map(r =>
    `(${quote(r.id)}::uuid,${quote(r.role)},${quote(r.phrase)},${quote(r.method)},${r.expected}::integer)`).join(',\n');
  return assertReadOnly(`WITH typed AS (${buildTypedClaimReceiptSql(evidence)}),
    leaves(id,role,phrase,method,expected) AS (VALUES ${leaves}),
    replay AS (SELECT i.*,public.fn_method_value(i.method,i.phrase) computed,
      EXISTS(SELECT 1 FROM public.gematria_methods m WHERE m.method_key=i.method AND m.in_engine IS TRUE) method_in_engine
      FROM leaves i),
    writers AS (SELECT p.proname,md5(pg_get_functiondef(p.oid)) definition_md5,
      pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.oid IN (
        'public.fn_research_object_correct(uuid,text,text,integer,text[],text[])'::regprocedure,
        'public.fn_zvi_standing_approve_research_object()'::regprocedure)),
    triggers AS (SELECT t.tgname,t.tgenabled,t.tgtype,pg_get_triggerdef(t.oid) definition,
      md5(pg_get_triggerdef(t.oid)) definition_md5
      FROM pg_trigger t WHERE t.tgrelid='public.research_objects'::regclass AND NOT t.tgisinternal
        AND t.tgfoid='public.fn_zvi_standing_approve_research_object()'::regprocedure)
    SELECT to_jsonb(typed) typed,(SELECT jsonb_agg(r ORDER BY r.id,r.role) FROM replay r) origin_checks,
      (SELECT jsonb_agg(w ORDER BY w.proname) FROM writers w) writers,
      (SELECT jsonb_agg(t ORDER BY t.tgname) FROM triggers t) approval_triggers FROM typed`);
}

export function buildSourceBoundCorrectionReview(evidence, receipt, plan = readSourceBindingPlan()) {
  const typed = buildTypedClaimReview(evidence, receipt?.typed);
  const expected = collectSourceBindingChecks(evidence, plan);
  check(receipt.origin_checks?.length === expected.length && expected.every(e =>
    receipt.origin_checks.filter(r => r.id === e.id && r.role === e.role && r.phrase === e.phrase
      && r.method === e.method && r.expected === e.expected && r.computed === e.expected
      && r.method_in_engine === true).length === 1), 'Source-origin canonical receipt mismatch');
  const definitions = {
    fn_research_object_correct:'cf7ff46e3d376faa5760ac3680fcb391',
    fn_zvi_standing_approve_research_object:'50536aed430fcfc7ecbf069f24316bcc',
  };
  check(receipt.writers?.length === 2 && Object.entries(definitions).every(([name, hash]) =>
    receipt.writers.filter(w => w.proname === name && w.definition_md5 === hash
      && md5(w.definition) === hash).length === 1), 'Correction writer definition drift; re-review required');
  check(receipt.typed.correction_definition_md5 === definitions.fn_research_object_correct,
    'Correction receipt definition mismatch');
  check(receipt.approval_triggers?.length === 1 && receipt.approval_triggers.every(t =>
    t.tgenabled === 'O' && t.tgtype === 23 && md5(t.definition) === t.definition_md5
      && t.tgname === 'trg_00_zvi_standing_approve_research_object'
      && t.definition_md5 === '5df13da5c490e1376abbcc298b5954dd'),
  'Standing approval trigger drift; re-review required');
  const sourceBindings = selectSourceBindings(evidence, plan).map(binding => {
    const original = typed.find(r => r.id === binding.id);
    return { ...binding, originalSourceSpan:original.sourceSpan,
      reviewedInputCoverage:'complete', genericExtractionFidelity:original.calculation.extractionIntegrity.fidelityStatus,
      scope:'reviewed_source_spans_only', interpretationVerified:false, mediaInspected:false,
      independentSourcesAdded:0, automaticPromotion:false, publicationChanged:false,
      canonicalChecks:receipt.origin_checks.filter(c => c.id === binding.id),
      // Existing Intake §7.1 shape, offered as evidence only; never persisted here.
      proposedDerivation:{inputs:binding.bindings, outputs:original.calculation.intakeMeta.ext.derivation.outputs},
      originalTrace:original.calculation.trace, retainIds:original.retainIds,
    };
  });
  const corrections = typed.filter(r => r.correction).map(r => ({
    id:r.id, sourceRef:r.sourceRef, sourceMd5:r.finding.identity.occurrence.sourceMd5,
    sourceSpan:r.sourceSpan, original:r.original, retainIds:r.retainIds,
    canonicalWriter:'fn_research_object_correct',
    parameters:{p_id:r.id,
      p_reason:`Exact source extraction correction; ${r.sourceRef}; source_md5=${r.finding.identity.occurrence.sourceMd5}; span=${r.sourceSpan.start}:${r.sourceSpan.end}. Preserve predecessor and source; no new claim of publication.`,
      p_new_statement:r.correction.proposedStatement, p_new_value:r.calculation.value,
      p_new_terms:r.correction.proposedTerms, p_new_relates:null},
    proposedClaimUid:r.correction.proposedClaimUid, identityConflicts:r.correction.identityConflicts,
    calculation:r.calculation, execute:false, publicationChanged:false, automaticPromotion:false,
    readiness:r.route === 'governed_successor_required'
      ? 'blocked_standing_approval_side_effect' : r.route,
    writerEffect:{rpcReportedStatus:'candidate', storedStatusFromReviewedDefinitions:'approved',
      engineVerifiedAfterCorrection:false, engineDetailAfterCorrection:null,
      successorMeta:'revision_only_plus_standing_approval_governance; predecessor metadata retained on predecessor',
      evidence:'current_function_and_trigger_definitions_not_live_execution',
      requires:'Authorized correction/status decision, fresh preflight, transaction and stored-row postcondition checks'},
  }));
  check(corrections.length === 6, 'Wrong atomic correction set');
  return {base:plan.base, checkedAt:receipt.typed.checked_at,
    counts:{reviewedInputBindings:sourceBindings.length,
      numericOccurrences:sourceBindings.reduce((count,r) => count+r.bindings.length,0),
      atomicCorrectionPlans:corrections.length,
      newFindings:0, liveCorrections:0, treePromotions:0}, sourceBindings, corrections,
    publicationChanged:false, automaticPromotion:false, execute:false,
    remaining:['Generic extractor still reports three partial slices; no runtime parser change',
      'Six corrections blocked on governed writer side-effect acceptance, not arithmetic',
      'Historical 378-source full regression manifest unavailable; prior shared fix not deployment-ready'],
  };
}

// Review selection only, never a writer or a standing admission rule. Reuse the
// already source-inspected audit, without replacing a whole source/value cluster.
export function selectPendingAtomicClaims(evidence) {
  const blockedId = evidence.integrationHold?.retainedClaimMismatch?.id;
  const selected = buildReview(evidence)
    .filter(r => r.kind === 'coverage_gap' && r.recommendation === 'additional_operand_required');
  check(selected.length > 0, 'No verified atomic claims selected');
  return selected.map(r => {
    check(r.id !== blockedId && r.replay.type === 'atomic' && r.databaseConfirmed, 'Unsafe selection');
    const stored = evidence.rows.find(row => row.id === r.id);
    const source = evidence.sources.find(row => row.id === r.sourceId);
    return { id:r.id, sourceRef:r.sourceRef, sourceId:r.sourceId, sourceMd5:source.md5,
      sourceUid:stored.source_uid, claimUid:stored.claim_uid,
      statementMd5:md5(stored.statement), phrase:r.phrase, method:'רגיל', value:r.value,
      targetId:r.targetId, sourceSpan:r.sourceSpan,
      preserveSiblingIds:r.retainedIds, independentSourcesAdded:0, execute:false };
  });
}

export function buildPendingAtomicPreflightSql(evidence) {
  const quote = text => `'${String(text).replaceAll("'", "''")}'`;
  const values = selectPendingAtomicClaims(evidence).map(r => `(${quote(r.id)}::uuid,`
    + `${quote(r.sourceId)}::uuid,${quote(r.sourceRef)},${quote(r.sourceMd5)},`
    + `${quote(r.sourceUid)},${quote(r.claimUid)},${quote(r.statementMd5)},`
    + `${quote(r.phrase)},${quote(r.method)},${r.value}::integer,${quote(r.targetId)}::uuid)`)
    .join(',\n');
  return assertReadOnly(`WITH selected(id,source_id,source_ref,source_md5,source_uid,claim_uid,
      statement_md5,phrase,method,value,target_id) AS (VALUES ${values}), checks AS (
    SELECT s.id,s.source_id,s.source_ref,s.phrase,s.method,s.value,s.target_id,
      ro.id IS NOT NULL AS finding_found,
      coalesce(ro.status='approved' AND ro.privacy_scope='public' AND ro.promoted_node_id IS NULL,false) AS public_unattached,
      coalesce(lower(btrim(ro.meta#>>'{ext,personal_scope,scope}')),'')<>'person_only'
        AND coalesce(lower(btrim(ro.source)),'') NOT IN ('openweb_legacy','old_chat','or-geula')
        AND coalesce(btrim(ro.contributor),'')<>'אור הגאולה' AS general_world_scope,
      coalesce(ro.source_ref=s.source_ref AND public.fn_research_source_uid(ro.source_ref)=s.source_uid
        AND public.fn_research_claim_uid(ro.statement)=s.claim_uid AND md5(ro.statement)=s.statement_md5,false) AS exact_identity,
      coalesce(ro.value=s.value AND ro.terms=ARRAY[s.phrase]::text[]
        AND ro.engine_detail#>>'{verification,method}'=s.method
        AND ro.engine_detail#>>'{verification,phrase}'=s.phrase
        AND ro.engine_detail#>>'{verification,claimed}'=s.value::text,false) AS exact_atomic_claim,
      coalesce(ro.engine_detail->>'verification_state','') NOT IN ('mismatch','conflict','partial','method_unknown')
        AND coalesce(ro.meta#>>'{ext,extraction_integrity,fidelity_status}','')<>'partial' AS no_known_conflict,
      coalesce(cu.id=s.source_id AND cu.status='live' AND cu.page_only IS FALSE
        AND cu.channel='torat-haremez'
        AND cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
        AND md5(cu.text)=s.source_md5,false) AS exact_public_source,
      EXISTS (SELECT 1 FROM public.gematria_methods m WHERE m.method_key=s.method AND m.in_engine IS TRUE) AS method_in_engine,
      public.fn_method_value(s.method,s.phrase) AS computed,
      coalesce(n.id=s.target_id AND n.type='number' AND n.label=s.value::text AND n.is_active IS TRUE
        AND coalesce(n.metadata->>'space','core')='core',false) AS exact_public_target,
      (SELECT count(*) FROM public.nodes nn WHERE nn.type='number' AND nn.label=s.value::text
        AND nn.is_active IS TRUE AND coalesce(nn.metadata->>'space','core')='core')=1 AS unique_target
    FROM selected s
    LEFT JOIN public.research_objects ro ON ro.id=s.id
    LEFT JOIN public.channel_updates cu ON cu.id=s.source_id
    LEFT JOIN public.nodes n ON n.id=s.target_id
  ) SELECT *,coalesce(finding_found AND public_unattached AND general_world_scope AND exact_identity
      AND exact_atomic_claim AND no_known_conflict AND exact_public_source AND method_in_engine
      AND computed=value AND exact_public_target AND unique_target,false) AS ready_for_review,
    now() AS checked_at FROM checks ORDER BY id`);
}

// Fixed review artifact, deliberately outside migration discovery. This is not a
// replacement RPC, admin credential injector, automatic promoter or release gate.
export function buildAtomicReplacementRehearsalSql(evidence, snapshot = readWriterSnapshot()) {
  const selected = selectPendingAtomicClaims(evidence);
  check(selected.length === 47 && new Set(selected.map(r => `${r.sourceUid}\n${r.claimUid}`)).size === 47,
    'Replacement requires all 47 distinct source-native claims');
  const quote = s => `'${String(s).replaceAll("'", "''")}'`;
  const ids = [...selected.map(r => r.id)].sort();
  const sources = [...new Set(selected.map(r => r.sourceId))].sort();
  const targets = [...new Set(selected.map(r => r.targetId))].sort();
  const array = values => `ARRAY[${values.map(quote).join(',')}]::uuid[]`;
  const methodKeys = ['method_key','function','version','active','in_engine','deterministic',
    'execution_kind','dependency_version','dependency_versions','required_entitlement'];
  const method = Object.fromEntries(methodKeys.map(k => [k,snapshot.method[k]]));
  check(snapshot.functions.length === 11 && snapshot.functions.every(f =>
    /^[a-z_][a-z0-9_]*\([a-z0-9,]*\)$/u.test(f.signature) && md5(f.definition) === f.definition_md5), 'Invalid writer snapshot');
  const functions = snapshot.functions.map(f => `(${quote(`public.${f.signature}`)},${quote(f.definition_md5)})`).join(',\n');
  const provenance = selected.map(r => `(${quote(r.id)}::uuid,${quote(JSON.stringify({
    source_ref:r.sourceRef,source_uid:r.sourceUid,claim_uid:r.claimUid,source_md5:r.sourceMd5,
    statement_md5:r.statementMd5,source_span:r.sourceSpan,phrase:r.phrase,method:r.method,
    expected:r.value,target_id:r.targetId,preserve_sibling_ids:r.preserveSiblingIds
  }))}::jsonb)`).join(',\n');
  return `-- REVIEW REHEARSAL ONLY. Never run against the live project in this cut.
-- Existing v2-v5 holds remain mandatory; no migration history is modified.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
DO $world_atomic$
DECLARE
  r record;
  result jsonb;
  updated integer;
  processed integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_ADMIN_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM (VALUES ${functions}) AS expected(signature,digest)
    WHERE md5(pg_get_functiondef(to_regprocedure(expected.signature))) IS DISTINCT FROM expected.digest) THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_IMPLEMENTATION_DRIFT';
  END IF;
  PERFORM 1 FROM public.gematria_methods WHERE method_key='רגיל' FOR SHARE;
  IF (SELECT jsonb_build_object(${methodKeys.flatMap(k => [quote(k),`to_jsonb(m)->${quote(k)}`]).join(',')})
      FROM public.gematria_methods m WHERE method_key='רגיל') IS DISTINCT FROM ${quote(JSON.stringify(method))}::jsonb THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_METHOD_DRIFT';
  END IF;
  -- Lock in stable order; no network calls or whole-table locks inside the transaction.
  PERFORM ro.id FROM public.research_objects ro
    WHERE ro.id=ANY(${array(ids)}) OR split_part(ro.source_ref,'#',1)=ANY(
      ARRAY(SELECT 'channel_updates:'||x::text FROM unnest(${array(sources)}) x))
    ORDER BY ro.id FOR UPDATE;
  PERFORM id FROM public.channel_updates WHERE id=ANY(${array(sources)}) ORDER BY id FOR SHARE;
  PERFORM id FROM public.nodes WHERE id=ANY(${array(targets)}) ORDER BY id FOR SHARE;

  CREATE TEMP TABLE _world_atomic_ready ON COMMIT DROP AS
    ${buildPendingAtomicPreflightSql(evidence)};
  IF (SELECT count(*) FROM _world_atomic_ready)<>47
    OR EXISTS (SELECT 1 FROM _world_atomic_ready WHERE ready_for_review IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_PREFLIGHT_FAILED';
  END IF;
  IF EXISTS (SELECT 1 FROM _world_atomic_ready s
    JOIN public.research_objects a ON a.id=s.id JOIN public.research_objects b ON b.id<>a.id
      AND public.fn_research_source_uid(b.source_ref)=public.fn_research_source_uid(a.source_ref)
      AND public.fn_research_claim_uid(b.statement)=public.fn_research_claim_uid(a.statement)) THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_IDENTITY_COLLISION';
  END IF;
  CREATE TEMP TABLE _world_atomic_provenance(id uuid PRIMARY KEY,data jsonb) ON COMMIT DROP;
  INSERT INTO _world_atomic_provenance VALUES ${provenance};
  CREATE TEMP TABLE _world_atomic_before ON COMMIT DROP AS
    SELECT ro.id,to_jsonb(ro) AS body FROM public.research_objects ro
    WHERE ro.id=ANY(${array(ids)}) OR split_part(ro.source_ref,'#',1)=ANY(
      ARRAY(SELECT 'channel_updates:'||x::text FROM unnest(${array(sources)}) x));
  CREATE TEMP TABLE _world_atomic_sources ON COMMIT DROP AS
    SELECT id,to_jsonb(cu) AS body FROM public.channel_updates cu WHERE id=ANY(${array(sources)});
  CREATE TEMP TABLE _world_atomic_targets ON COMMIT DROP AS
    SELECT id,to_jsonb(n) AS body FROM public.nodes n WHERE id=ANY(${array(targets)});
  FOR r IN SELECT * FROM _world_atomic_ready ORDER BY id LOOP
    result := public.admin_research_review(r.id,'canonicalize','match',false);
    IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'canonical'
      OR result->>'verification_state' IS DISTINCT FROM 'match' OR result->>'published' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'WORLD_ATOMIC_REVIEW_FAILED: %',r.id;
    END IF;
    result := public.admin_research_attach_existing_graph_node_v1(r.id,r.target_id,
      'ZURIEL reviewed Zvi corpus; exact atomic source claim replay; existing number target only; interpretation not verified.');
    IF result->>'ok' IS DISTINCT FROM 'true' OR result->>'tree_attached' IS DISTINCT FROM 'true'
      OR result->>'target_node_id' IS DISTINCT FROM r.target_id::text
      OR result->>'created_node' IS DISTINCT FROM 'false' OR result->>'created_edge' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'WORLD_ATOMIC_ATTACH_FAILED: %',r.id;
    END IF;
    -- Correct the existing RPC's historical triage provenance; never invent strength.
    UPDATE public.decision_ledger l SET provenance=coalesce(l.provenance,'{}'::jsonb)
      || (SELECT data FROM _world_atomic_provenance WHERE id=r.id)
      || jsonb_build_object('triage_snapshot_date','2026-10-26',
        'triage_base_commit','15716bbf10d8fb2de3470b7ac438b4f3476e2f26',
        'selection','47 reviewed exact atomic source-native claims; no source-number suppression',
        'computed',r.computed,'verification_scope','numeric equality only; interpretation not verified',
        'independent_sources_added',0,'truth_score_created',false,'privacy_changed',false,'publication_changed',false,
        'engine_verified_boolean_changed',false)
    WHERE l.id=(result->>'decision_ledger_id')::uuid AND l.subject_ref=r.id::text
      AND l.subject_type='research_object' AND l.decision_type='research_graph_attach'
      AND l.candidate->>'target_node_id'=r.target_id::text;
    GET DIAGNOSTICS updated=ROW_COUNT;
    IF updated<>1 THEN RAISE EXCEPTION 'WORLD_ATOMIC_LEDGER_FAILED: %',r.id; END IF;
    processed := processed+1;
  END LOOP;
  IF processed<>47 OR EXISTS (
    SELECT 1 FROM _world_atomic_ready s
    JOIN _world_atomic_before b ON b.id=s.id
    LEFT JOIN public.research_objects ro ON ro.id=s.id
    WHERE ro.status IS DISTINCT FROM 'canonical' OR ro.promoted_node_id IS DISTINCT FROM s.target_id
      OR ro.engine_detail->>'verification_state' IS DISTINCT FROM 'match'
      OR (to_jsonb(ro)-ARRAY['status','promoted_node_id','meta','engine_detail'])
        IS DISTINCT FROM (b.body-ARRAY['status','promoted_node_id','meta','engine_detail'])
      OR (coalesce(ro.meta,'{}'::jsonb)-'governance') IS DISTINCT FROM (coalesce(b.body->'meta','{}'::jsonb)-'governance')
      OR (ro.engine_detail-ARRAY['verification_state','verification_declared'])
        IS DISTINCT FROM ((b.body->'engine_detail')-ARRAY['verification_state','verification_declared'])
  ) THEN RAISE EXCEPTION 'WORLD_ATOMIC_SELECTED_POSTCONDITION'; END IF;
  IF EXISTS (SELECT 1 FROM _world_atomic_before b LEFT JOIN public.research_objects ro ON ro.id=b.id
    WHERE NOT EXISTS(SELECT 1 FROM _world_atomic_ready s WHERE s.id=b.id)
      AND to_jsonb(ro) IS DISTINCT FROM b.body)
    OR EXISTS (SELECT 1 FROM _world_atomic_sources b LEFT JOIN public.channel_updates cu ON cu.id=b.id
      WHERE to_jsonb(cu) IS DISTINCT FROM b.body)
    OR EXISTS (SELECT 1 FROM _world_atomic_targets b LEFT JOIN public.nodes n ON n.id=b.id
      WHERE to_jsonb(n) IS DISTINCT FROM b.body) THEN
    RAISE EXCEPTION 'WORLD_ATOMIC_PRESERVATION_FAILED';
  END IF;
END;
$world_atomic$;
SELECT jsonb_build_object('rehearsed',count(*),'persisted',false) FROM _world_atomic_ready;
ROLLBACK;
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const evidence = readEvidence();
  if (process.argv[2] === 'source-bound-sql') process.stdout.write(buildSourceBindingReceiptSql(evidence) + '\n');
  else if (process.argv[2] === 'source-bound') process.stdout.write(JSON.stringify(
    buildSourceBoundCorrectionReview(evidence, readSourceBindingReceipt()), null, 2) + '\n');
  else if (process.argv[2] === 'typed-sql') process.stdout.write(buildTypedClaimReceiptSql(evidence) + '\n');
  else if (process.argv[2] === 'typed') process.stdout.write(JSON.stringify(
    buildTypedClaimReview(evidence, readTypedClaimReceipt()), null, 2) + '\n');
  else if (process.argv[2] === 'rehearsal-sql') process.stdout.write(buildAtomicReplacementRehearsalSql(evidence));
  else if (process.argv[2] === 'preflight-sql') process.stdout.write(buildPendingAtomicPreflightSql(evidence) + '\n');
  else if (process.argv[2] === 'selection') process.stdout.write(JSON.stringify(selectPendingAtomicClaims(evidence), null, 2) + '\n');
  else if (process.argv[2] === 'sql') process.stdout.write(buildReplaySql(evidence) + '\n');
  else if (process.argv[2] === 'inputs') process.stdout.write(JSON.stringify(collectReplayInputs(evidence)) + '\n');
  else {
    const rows = buildReview(evidence);
    process.stdout.write(JSON.stringify(process.argv[2] === 'rows' ? rows : summarizeReview(rows), null, 2) + '\n');
  }
}
