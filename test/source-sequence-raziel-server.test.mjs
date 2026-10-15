import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { buildPublicPostSequenceBundle, projectPublicSourceSequences, withSourceSequenceContext } from '../src/lib/research/publicSourceSequence2029.js';
import { buildRazielSurfaceContext } from '../src/lib/research/razielSurfaceContext.js';

test('the existing actual AI server allowlist consumes selected source reading/focus without accepting raw sequence payload',()=>{
  const edge=readFileSync(new URL('../supabase/functions/ai-analyze/index.ts',import.meta.url),'utf8');
  const start=edge.indexOf('const rzClean =');
  const end=edge.indexOf('// Compact plan metadata',start);
  assert.ok(start>=0 && end>start);
  const fn=runInNewContext(stripTypeScriptTypes(edge.slice(start,end))+'\nrazielSemanticSurfaceText');
  const row={id:5107,slug:'sharshar-elections-redemption-hints-draft',source:'ai',home_hidden:false,tags:[],date:'2026-09-30T08:55:06.593419Z',modified:'2026-10-12T13:52:58.270789Z'};
  const sequence=projectPublicSourceSequences(buildPublicPostSequenceBundle([row])).sequences[0];
  const update=sequence.updates.at(-1);
  const context=withSourceSequenceContext({subject:{type:'post',id:row.slug}},sequence,update);
  const dto=buildRazielSurfaceContext(context);
  const rendered=fn({surface:'post',subject:context.subject,context:{...dto,sourceSequence:{...dto.sourceSequence,body:'PRIVATE_SEQUENCE_BODY',audience:'PRIVATE_COHORT'}}});
  assert.ok(rendered.includes('מוקד קריאה')); assert.ok(rendered.includes(row.slug)); assert.ok(rendered.includes(update.id));
  assert.ok(!rendered.includes('PRIVATE_SEQUENCE_BODY')); assert.ok(!rendered.includes('PRIVATE_COHORT'));
  assert.ok(rendered.length<=1000);
});
