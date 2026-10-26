import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readEvidence, readTypedClaimReceipt, selectTypedClaims, buildTypedClaimReceiptSql,
  buildTypedClaimReview, composeTypedReviewBundle, selectPendingAtomicClaims,
} from '../scripts/audit-world-claim-coverage.mjs';

const evidence = readEvidence();
const receipt = readTypedClaimReceipt();
const rows = buildTypedClaimReview(evidence, receipt);
const byPrefix = prefix => rows.find(r => r.id.startsWith(prefix));
// Test fixture only. Runtime callers must obtain this from a real trusted boundary.
const reviewFixture = {authority_source:'admin_rpc', authenticated:true, admin:true,
  allowed_access_tiers:['public','public_candidate']};

test('27 prior cases are represented, not added to the separate 47 atomic replacements', () => {
  assert.equal(rows.length,27);
  assert.equal(new Set(rows.map(r => r.id)).size,27);
  assert.equal(rows.filter(r => r.calculation.type === 'derivation').length,20);
  assert.equal(rows.filter(r => r.calculation.type === 'atomic').length,7);
  const prior = selectPendingAtomicClaims(evidence);
  assert.equal(prior.length,47);
  assert.ok(prior.every(p => rows.every(r => r.id !== p.id)));
});

test('original source and claim identities, terms and exact source spans remain intact', () => {
  for (const r of rows) {
    const stored = evidence.rows.find(s => s.id === r.id);
    const source = evidence.sources.find(s => s.id === r.sourceId);
    assert.equal(r.original.statement,stored.statement);
    assert.deepEqual(r.original.terms,stored.terms);
    assert.equal(r.original.sourceUid,stored.source_uid);
    assert.equal(r.original.claimUid,stored.claim_uid);
    assert.equal(source.text.slice(r.sourceSpan.start,r.sourceSpan.end),r.sourceSpan.excerpt);
    assert.equal(r.finding.source.sourceRef,stored.source_ref);
    assert.equal(r.finding.identity.occurrence.sourceMd5,source.md5);
    assert.equal(r.finding.provenance.inputRef,r.id);
    assert.ok(r.retainIds.includes(r.id));
  }
});

test('71 canonical operand checks match; receipt query is bounded read-only SQL', () => {
  assert.equal(receipt.engine_replays.length,71);
  assert.ok(receipt.engine_replays.every(r => r.computed === r.expected && r.method_in_engine));
  const sql = buildTypedClaimReceiptSql(evidence);
  assert.match(sql,/LEFT JOIN public\.research_objects ro ON ro.id=s.id/);
  assert.match(sql,/public\.fn_research_claim_uid\(other.statement\)=s.proposed_claim_uid/);
  assert.match(sql,/public\.fn_method_value\(i.method,i.phrase\)/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|DO|SET)\b|;/iu);
  assert.doesNotMatch(sql,/SELECT\s+\*/iu);
});

test('missing, duplicate or mismatching canonical engine checks fail closed', () => {
  for (const alter of [r => r.engine_replays.pop(),
    r => r.engine_replays.push(r.engine_replays[0]),
    r => {r.engine_replays[0].computed++;},
    r => {r.engine_replays[0].computed=null;},
    r => {r.engine_replays[0].phrase='other';},
    r => {r.engine_replays[0].method_in_engine=false;}]) {
    const changed=structuredClone(receipt); alter(changed);
    assert.throws(() => buildTypedClaimReview(evidence,changed),/replay/);
  }
});

test('missing live claim, source drift, privacy, scope, target or revision drift fails closed', () => {
  for (const alter of [r => r.claims.pop(),r => r.claims.push(r.claims[0]),
    r => {r.claims[0].source_md5='changed';},r => {r.claims[0].statement_md5='changed';},
    r => {r.claims[0].source_ref='different';},r => {r.claims[0].proposed_statement='different';},
    ...['public_unattached','general_world_scope','exact_claim','exact_public_source',
      'exact_target','unique_target','no_existing_revision'].map(key => r => {r.claims[0][key]=false;})]) {
    const changed=structuredClone(receipt); alter(changed);
    assert.throws(() => buildTypedClaimReview(evidence,changed));
  }
  for (const alter of [e => {e.rows[0].privacy_scope='private';},
    e => {e.rows[0].status='candidate';},e => {e.sources[0].channel='or-geula';}]) {
    const changed=structuredClone(evidence); alter(changed);
    assert.throws(() => selectTypedClaims(changed));
  }
});

test('compound arithmetic match does not erase the existing partial extraction fidelity', () => {
  for (const r of rows.filter(r => r.calculation.type === 'derivation')) {
    assert.equal(r.finding.kind,'derivation');
    assert.equal(r.finding.verification.claimed_method,null);
    assert.equal(r.finding.verification.engine_method_tested,null);
    assert.equal(r.finding.source.method,null);
    assert.equal(r.calculation.method,null);
    assert.equal(r.calculation.operandMethod,'רגיל');
    assert.equal(r.finding.verification.verification_state,'match');
    assert.equal(r.finding.verification.scope,'calculation_only');
    assert.equal(r.calculation.extractionIntegrity.arithmeticVerified,true);
    assert.equal(r.calculation.extractionIntegrity.fidelityStatus,'partial');
    assert.equal(r.calculation.intakeMeta.ext.extraction_integrity.fidelity_status,'partial');
    assert.ok(r.calculation.trace.numericLiterals.some(n => n.status === 'unresolved'));
    assert.equal(r.route,'derivation_fidelity_review');
    assert.equal(r.automaticPromotion,false);
  }
});

test('repeated operands and numeric inputs are not collapsed to a phrase or counted as sources', () => {
  const repeated=byPrefix('4b6c');
  assert.deepEqual(repeated.calculation.trace.operands.map(o => o.phrase),['חזק','חזק','חזק']);
  assert.deepEqual(repeated.calculation.trace.linkValues,[345,345]);
  const literals=byPrefix('4ec5');
  assert.match(literals.calculation.sourceExpression,/393\+393/);
  assert.deepEqual(literals.calculation.trace.linkValues,[786,786,786]);
  assert.equal(literals.calculation.operand,null);
  assert.equal(literals.independentSourcesAdded,0);
  assert.equal(literals.sourceCount,null);
});

test('positional letter decomposition is preserved and spelling is not silently repaired', () => {
  const r=byPrefix('da0a');
  const checks=r.calculation.canonicalChecks.filter(c => c.role.startsWith('letter_'));
  assert.deepEqual(checks.map(c => c.phrase),['כ','ו','כ','ב','י','ם']);
  assert.deepEqual(checks.map(c => c.computed),[20,6,20,2,10,40]);
  assert.equal(byPrefix('cf60').calculation.value,98);
  assert.match(byPrefix('cf60').sourceSpan.excerpt,/עִכּוּב/u);
  assert.equal(evidence.integrationHold.sourceSpellings.proseVariantValue,108);
});

test('six material atomic extractions require a governed successor, never an in-place rewrite', () => {
  const corrections=rows.filter(r => r.correction);
  assert.equal(corrections.length,6);
  assert.ok(corrections.every(r => r.route === 'governed_successor_required'));
  for (const r of corrections) {
    assert.notEqual(r.original.claimUid,r.correction.proposedClaimUid);
    assert.equal(r.correction.identityConflicts,0);
    assert.equal(r.correction.canonicalWriter,'fn_research_object_correct');
    assert.equal(r.correction.execute,false);
    assert.notEqual(r.original.statement,r.correction.proposedStatement);
  }
  assert.equal(byPrefix('61d2').calculation.operand,'משיח בן דוד בא על החמור');
  assert.match(byPrefix('61d2').original.statement,/^1/);
  assert.match(byPrefix('c33d').original.statement,/^3/);
  assert.equal(byPrefix('c33d').calculation.operand,'יאיר אור משיח');
});

test('a collision or unchanged canonical UID is held without invented disambiguation', () => {
  const changed=structuredClone(receipt);
  const c=changed.claims.find(r => r.id.startsWith('61d2'));
  c.proposed_identity_conflicts=1;
  const result=buildTypedClaimReview(evidence,changed).find(r => r.id === c.id);
  assert.equal(result.route,'existing_identity_requires_review');
  assert.equal(result.correction.proposedStatement,byPrefix('61d2').correction.proposedStatement);
  c.proposed_identity_conflicts=0; c.proposed_claim_uid=c.claim_uid;
  assert.equal(buildTypedClaimReview(evidence,changed).find(r => r.id===c.id).route,
    'correction_identity_unchanged_requires_review');
});

test('punctuation uses the existing calculation normalization without changing claim identity', () => {
  const r=byPrefix('641a');
  assert.equal(r.route,'preserve_claim_add_calculation_trace');
  assert.equal(r.correction,null);
  assert.equal(r.calculation.operand,'אברהם, רחל  מבכה');
  assert.equal(r.calculation.normalizedOperand,'אברהם רחל מבכה');
  assert.equal(r.calculation.value,553);
  assert.equal(r.original.claimUid,'אברהם,רחלמבכה=553');
});

test('a verified word does not verify its unresolved degree-mark neighbor or spiritual meaning', () => {
  const r=byPrefix('e5ca');
  assert.match(r.sourceSpan.excerpt,/כובע°/u);
  assert.equal(r.calculation.operand,'עכוב');
  assert.equal(r.finding.verification.claimed_expression,'עכוב');
  assert.equal(r.calculation.interpretationVerified,false);
  assert.ok(rows.every(r => !r.id.startsWith('9818')));
});

test('guest and unattested admin get no proposal data, including trace and outcome backchannels', () => {
  for (const descriptor of [null,{admin:true},
    {admin:true,allowed_access_tiers:['public','public_candidate']}]) {
    const bundle=composeTypedReviewBundle(rows,descriptor);
    assert.deepEqual(bundle.findings,[]);
    assert.deepEqual(bundle.finding_outcomes,[]);
    const serialized=JSON.stringify(bundle);
    for (const r of rows) {
      assert.ok(!serialized.includes(r.id));
      assert.ok(!serialized.includes(r.sourceRef));
      assert.ok(!serialized.includes(r.original.statement));
    }
    assert.equal(bundle.coverage.negative_result,0);
  }
});

test('explicit review fixture preserves 27 envelopes and 20 dependency outcomes without public status', () => {
  const bundle=composeTypedReviewBundle(rows,reviewFixture);
  assert.equal(bundle.findings.length,27);
  assert.equal(bundle.finding_outcomes.length,20);
  assert.ok(bundle.finding_outcomes.every(o => o.evidence_relation === 'derivation' && o.depends_on.length === 1));
  assert.equal(bundle.invariants.no_auto_publication,true);
  for (const r of rows) {
    assert.equal(r.finding.status,null);
    assert.equal(r.finding.access.tier,'public_candidate');
    assert.equal(r.original.privacyScope,'public');
    assert.equal(r.original.status,'approved');
    assert.equal(r.finding.evidence.score,null);
    assert.equal(r.strength,null); assert.equal(r.evidenceQuality,null);
    assert.equal(r.suppress,false); assert.equal(r.promoted,false);
    assert.equal(r.publicationChanged,false); assert.equal(r.calculation.mediaInspected,false);
    assert.deepEqual(r.finding.projection.anchors,[]);
  }
});

test('checked-in review is deterministic and exactly replayable', () => {
  const saved=JSON.parse(readFileSync(new URL('../docs/reviews/world-typed-claim-representation-20261026.json',import.meta.url)));
  assert.deepEqual(saved,rows);
  assert.deepEqual(buildTypedClaimReview(evidence,receipt),rows);
});
