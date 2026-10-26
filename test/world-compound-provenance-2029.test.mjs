import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readEvidence, buildTypedClaimReview } from '../scripts/audit-world-claim-coverage.mjs';
import { extractCompoundClaims, computeExtractionIntegrity, extractSourceMediaRefs } from '../src/lib/triage.js';

const report=JSON.parse(readFileSync(new URL('../docs/reviews/world-compound-provenance-20261026.json',import.meta.url)));
const evidence=readEvidence();
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('all 45 source replays preserve every pre-existing claim field, result, method and status',()=>{
  assert.equal(report.baseline.sources.length,45);
  assert.equal(report.current.sources.length,45);
  for(const before of report.baseline.sources){
    const source=evidence.sources.find(s=>s.id===before.id);
    assert.equal(source.md5,before.sourceMd5);
    const claims=extractCompoundClaims(source.text);
    assert.equal(claims.length,before.claimCount);
    assert.equal(sha(claims.map(({numericOccurrences,...rest})=>rest)),before.claimsSha256);
    assert.deepEqual(computeExtractionIntegrity(claims,extractSourceMediaRefs(source.text,{})),
      report.current.sources.find(s=>s.id===before.id).integrity);
  }
});

test('fresh read-only receipt binds all sources and all 71 canonical calculations without new IDs',()=>{
  assert.equal(report.liveSourceReceipt.length,45);
  assert.equal(new Set(report.liveSourceReceipt.map(r=>r.id)).size,45);
  assert.ok(report.liveSourceReceipt.every(r=>r.unchanged_public_source===true));
  assert.deepEqual(report.liveSourceReceipt.map(r=>r.id).sort(),evidence.sources.map(r=>r.id).sort());
  assert.equal(report.liveCalculationReceipt.claims.length,27);
  assert.equal(report.liveCalculationReceipt.engine_replays.length,71);
  assert.ok(report.liveCalculationReceipt.engine_replays.every(r=>r.computed===r.expected));
  assert.equal(buildTypedClaimReview(evidence,report.liveCalculationReceipt).length,27);
});

test('17 equation slices become complete; three bare-input derivations remain partial, not approved',()=>{
  const current=buildTypedClaimReview(evidence,report.liveCalculationReceipt)
    .filter(r=>r.calculation.type==='derivation');
  assert.equal(current.length,20);
  assert.equal(report.baseline.cases.filter(r=>r.oldIntegrity.fidelityStatus==='partial').length,20);
  assert.equal(current.filter(r=>r.calculation.extractionIntegrity.fidelityStatus==='complete').length,17);
  assert.deepEqual(current.filter(r=>r.calculation.extractionIntegrity.fidelityStatus==='partial')
    .map(r=>r.id.slice(0,8)),['4ec599a6','cf605c84','da0a6436']);
  for(const r of current){
    const saved=report.current.cases.find(c=>c.id===r.id);
    assert.deepEqual(r.calculation.trace.numericOccurrences,saved.numericOccurrences);
    assert.deepEqual(r.calculation.intakeMeta,saved.intakeMeta);
    assert.equal(r.calculation.extractionScope,'source_span_only');
    assert.equal(r.finding.status,null);
    assert.equal(r.promoted,false);
    assert.equal(r.publicationChanged,false);
    assert.equal(r.automaticPromotion,false);
    assert.equal(r.calculation.mediaInspected,false);
  }
});

test('metadata preserves each repeated numeric input, ordered operator position and exact expression',()=>{
  for(const row of report.current.cases){
    const occurrences=row.numericOccurrences;
    const keys=occurrences.map(p=>JSON.stringify([p.linkIndex,p.astPath]));
    assert.equal(new Set(keys).size,keys.length);
    const meta=row.intakeMeta.ext.derivation;
    assert.equal(meta.inputs.length,occurrences.filter(p=>p.syntacticRole==='arithmetic_input').length);
    assert.equal(meta.outputs.length,occurrences.filter(p=>p.syntacticRole==='equation_value').length);
    assert.ok(meta.outputs.every(p=>p.calculation_match===true));
    assert.ok(meta.inputs.every(p=>p.role===null));
  }
  const repeat=report.current.cases.find(r=>r.id.startsWith('4ec5'));
  assert.deepEqual(repeat.intakeMeta.ext.derivation.inputs.map(i=>i.value),[393,393]);
  assert.ok(repeat.intakeMeta.ext.derivation.inputs.every(i=>i.status==='unresolved'));
});

test('bounded source replay is not a claim that the historical 378-source corpus or media was revalidated',()=>{
  assert.equal(report.limits.historical378SourceCorpus,'not_reconstructed_no_frozen_id_manifest_or_historical_runner');
  assert.equal(report.limits.liveProductWrites,false);
  assert.equal(report.limits.publicDeployment,false);
  const sourceWithMissingMedia=report.current.sources.find(s=>s.integrity.mediaReferenceCoverage==='partial');
  assert.ok(sourceWithMissingMedia);
  assert.equal(sourceWithMissingMedia.integrity.fidelityStatus,'partial');
});
