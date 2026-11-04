import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareElsRelationshipResearchPlan} from '../src/lib/research/elsAutomaticResearchPlan.js';

test('pair preparation is bounded, explicit, normalized and never a cross-product',()=>{
  const plan=prepareElsRelationshipResearchPlan({primaryTerm:'מלך',additionalTerms:'שופר\nשׁוֹפָר\nמלכ\nשלום',scope:'tanakh',radius:7});
  assert.deepEqual(plan.pairs.map(p=>p.term),['שופר','שלום']);
  assert.equal(plan.scope,'tanakh');assert.equal(plan.radius,7);
  assert.equal(plan.allPairsGenerated,false);assert.equal(plan.explicitExecutionRequired,true);
  assert.equal(plan.persisted,false);assert.equal(plan.aiUsed,false);
  assert.ok(prepareElsRelationshipResearchPlan({primaryTerm:'מלך',additionalTerms:'מלכ'}).error);
  assert.ok(prepareElsRelationshipResearchPlan({primaryTerm:'מלך',additionalTerms:Array(7).fill('שופר')}).error);
  assert.ok(prepareElsRelationshipResearchPlan({primaryTerm:'א',additionalTerms:'שלום'}).error);
});

test('same matrix-discovery owner cancels only its current explicit inspection',async()=>{
  const source=readFileSync(new URL('../tools/els/els-code.template.html',import.meta.url),'utf8');
  const start=source.indexOf('  async function guidedMatrixDiscoveryLens(target){');
  const end=source.indexOf('\n\n  // Explicit Research S2:',start);
  const context=vm.createContext({_guidedMatrixLensSeq:0,_researchInspectionRun:null,st:{res:null},nativeOccurrenceResults:()=>null,postHost:()=>{}});
  vm.runInContext(source.slice(start,end),context);
  await context.guidedMatrixDiscoveryLens({researchOccurrenceInspection:true,inspectionRun:'new',setId:'missing'});
  assert.equal(context._guidedMatrixLensSeq,1);
  await context.guidedMatrixDiscoveryLens({researchOccurrenceInspection:true,inspectionRun:'old',cancel:true});
  assert.equal(context._guidedMatrixLensSeq,1,'late cleanup cannot cancel a new run');
  await context.guidedMatrixDiscoveryLens({researchOccurrenceInspection:true,inspectionRun:'new',cancel:true});
  assert.equal(context._guidedMatrixLensSeq,2);assert.equal(context._researchInspectionRun,null);
});
