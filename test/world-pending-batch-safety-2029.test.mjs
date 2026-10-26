import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { COHORT_FILES, extractCohortSelect, buildResidualAuditSql } from '../scripts/audit-world-corpus-residual.mjs';
import { readEvidence, buildReview, selectPendingAtomicClaims, buildPendingAtomicPreflightSql } from '../scripts/audit-world-claim-coverage.mjs';

const evidence=readEvidence();
const selection=selectPendingAtomicClaims(evidence);
const sql=buildPendingAtomicPreflightSql(evidence);
const migrations=COHORT_FILES.map(([file,table])=>({file,table,
  body:readFileSync(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8')}));
const quote=s=>`'${String(s).replaceAll("'","''")}'`;

test('pending v2-v5 stop unconditionally before admin lookup, locks or writers',()=>{
  migrations.forEach(({body},i)=>{
    const first=body.slice(body.indexOf('\nBEGIN\n')).replace(/--[^\n]*/gu,'');
    assert.match(first,new RegExp(`^\\nBEGIN\\n\\s*RAISE EXCEPTION USING\\s+ERRCODE = 'P0001',\\s+MESSAGE = 'WORLD_BATCH_REVIEW_REQUIRED_V${i+2}'`));
    assert.ok(first.indexOf('RAISE EXCEPTION')<first.indexOf('FROM public.users'));
    assert.ok(first.indexOf('RAISE EXCEPTION')<first.indexOf('LOCK TABLE'));
    assert.ok(first.indexOf('RAISE EXCEPTION')<first.indexOf('public.admin_research_review'));
    assert.match(body,/world-pending-batch-safety-20261026.md/);
  });
});

test('historical read-only cohorts remain available behind the guards',()=>{
  for(const {body,table} of migrations) {
    const query=extractCohortSelect(body,table);
    assert.match(query,/research_objects/);
    assert.doesNotMatch(query,/RAISE|LOCK TABLE|admin_research/);
  }
  assert.doesNotThrow(()=>buildResidualAuditSql('summary'));
});

test('replacement selection keeps all 47 reviewed distinct claims, not one per number',()=>{
  const expected=buildReview(evidence).filter(r=>r.recommendation==='additional_operand_required').map(r=>r.id);
  assert.deepEqual(selection.map(r=>r.id),expected);
  assert.equal(selection.length,47);
  assert.equal(new Set(selection.map(r=>r.sourceId)).size,22);
  assert.equal(new Set(selection.map(r=>r.targetId)).size,23);
  assert.ok(new Set(selection.map(r=>`${r.sourceId}:${r.value}`)).size<47);
  assert.ok(selection.every(r=>r.execute===false && r.independentSourcesAdded===0));
  assert.ok(!selection.some(r=>r.id===evidence.integrationHold.retainedClaimMismatch.id));
  assert.ok(selection.some(r=>r.preserveSiblingIds.includes(evidence.integrationHold.retainedClaimMismatch.id)));
});

test('preflight is a bounded SELECT with no ranking, mutation, admin impersonation or fallback',()=>{
  assert.match(sql,/LEFT JOIN public.research_objects ro ON ro.id=s.id/);
  assert.match(sql,/public.fn_research_source_uid/);
  assert.match(sql,/public.fn_research_claim_uid/);
  assert.match(sql,/public.fn_method_value/);
  assert.match(sql,/md5\(cu.text\)=s.source_md5/);
  assert.doesNotMatch(sql,/;|\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SET|PERFORM|CALL|LOCK|DO)\b|set_config|admin_research|row_number|PARTITION BY|LIMIT/iu);
  for(const key of ['person_only','openweb_legacy','old_chat','or-geula','privacy_scope','verification,claimed','unique_target']) assert.ok(sql.includes(key));
});

test('live receipt covers the exact selection without claiming execution',()=>{
  const receipt=JSON.parse(readFileSync(new URL('../docs/reviews/world-pending-batch-preflight-20261026.json',import.meta.url),'utf8'));
  assert.deepEqual(receipt.livePreflight.map(r=>r.id).sort(),selection.map(r=>r.id).sort());
  assert.ok(receipt.livePreflight.every(r=>r.ready_for_review && r.computed===r.value));
  assert.deepEqual(receipt.migrationHistory.registeredApplied,[]);
  assert.equal(receipt.applied,false);
  assert.equal(receipt.executionAuthorized,false);
});

test('mixed expressions, covered variants and failed engine evidence cannot enter the atomic selection',()=>{
  const c=structuredClone(evidence);
  c.engineReplays=c.engineReplays.filter(r=>r.id!==selection[0].id);
  assert.ok(!selectPendingAtomicClaims(c).some(r=>r.id===selection[0].id));
  const kinds=new Map(evidence.reviewPlan.map(p=>[p.id,p.kind]));
  assert.ok(selection.every(r=>kinds.get(r.id)==='coverage_gap'));
  assert.equal(new Set(selection.map(r=>r.id)).size,47);
});

// Optional integration harness: real PostgreSQL in an explicitly supplied,
// network-isolated disposable container. No Supabase credentials or remote DSN.
const container=process.env.WORLD_TEST_PG_CONTAINER;
const dockerEnv={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete dockerEnv[key];
function docker(args,input) {
  const r=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],
    {input,encoding:'utf8',env:dockerEnv,maxBuffer:4*1024*1024});
  if(r.error)throw r.error;
  return r;
}
function pg(input,allowError=false) {
  const r=docker(['exec','-i',container,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input);
  if(!allowError)assert.equal(r.status,0,r.stderr);
  return r;
}

test('real PostgreSQL executes holds and negative preflight cases without product data',
  {skip:!container},()=>{
    assert.match(container,/^world-batch-guard-[a-z0-9-]+$/u);
    const network=docker(['inspect','--format','{{.HostConfig.NetworkMode}}',container]);
    assert.equal(network.status,0,network.stderr);
    assert.equal(network.stdout.trim(),'none');
    // Refuse to operate on an existing database that contains any public tables.
    assert.equal(pg("select count(*) from information_schema.tables where table_schema='public'").stdout.trim(),'0');
    for(const [index,{body}] of migrations.entries()) {
      const r=pg(body,true);
      assert.equal(r.status,3);
      assert.match(r.stderr,new RegExp(`WORLD_BATCH_REVIEW_REQUIRED_V${index+2}`));
      assert.doesNotMatch(r.stderr,/does not exist/);
    }
    assert.equal(pg("select count(*) from information_schema.tables where table_schema='public'").stdout.trim(),'0');

    // Engine/identity functions below are fixture lookups, NOT alternative engines.
    // Arithmetic truth was checked independently through live canonical SQL.
    const sources=evidence.sources.filter(s=>selection.some(r=>r.sourceId===s.id));
    const rows=evidence.rows.filter(r=>selection.some(s=>s.id===r.id));
    const targets=evidence.targets.filter(n=>selection.some(r=>r.targetId===n.id));
    const sourceIdentities=[...new Map(selection.map(r=>[r.sourceRef,r.sourceUid])).entries()];
    const claimIdentities=[...new Map(rows.map(r=>[r.statement,r.claim_uid])).entries()];
    const operands=[...new Map(selection.map(r=>[r.phrase,r.value])).entries()];
    const setup=`
      CREATE TABLE public.research_objects(id uuid primary key,source_ref text,statement text,value integer,
        terms text[],status text,privacy_scope text,promoted_node_id uuid,source text,contributor text,meta jsonb,engine_detail jsonb);
      CREATE TABLE public.channel_updates(id uuid primary key,text text,status text,page_only boolean,channel text,contributor_id uuid);
      CREATE TABLE public.nodes(id uuid primary key,label text,type text,is_active boolean,metadata jsonb);
      CREATE TABLE public.gematria_methods(method_key text,in_engine boolean);
      CREATE TABLE public.fixture_sources(ref text,uid text);
      CREATE TABLE public.fixture_claims(statement text,uid text);
      CREATE TABLE public.fixture_values(phrase text,value integer);
      INSERT INTO public.fixture_sources VALUES ${sourceIdentities.map(([ref,uid])=>`(${quote(ref)},${quote(uid)})`).join(',')};
      INSERT INTO public.fixture_claims VALUES ${claimIdentities.map(([statement,uid])=>`(${quote(statement)},${quote(uid)})`).join(',')};
      INSERT INTO public.fixture_values VALUES ${operands.map(([phrase,value])=>`(${quote(phrase)},${value})`).join(',')};
      CREATE FUNCTION public.fn_research_source_uid(text) RETURNS text LANGUAGE sql AS
        $$ SELECT uid FROM public.fixture_sources WHERE ref=$1 $$;
      CREATE FUNCTION public.fn_research_claim_uid(text) RETURNS text LANGUAGE sql AS
        $$ SELECT uid FROM public.fixture_claims WHERE statement=$1 $$;
      CREATE FUNCTION public.fn_method_value(text,text) RETURNS integer LANGUAGE sql AS
        $$ SELECT value FROM public.fixture_values WHERE phrase=$2 AND $1='רגיל' $$;
      INSERT INTO public.gematria_methods VALUES ('רגיל',true);
      INSERT INTO public.research_objects VALUES ${rows.map(r=>`(${quote(r.id)},${quote(r.source_ref)},${quote(r.statement)},${r.value},ARRAY[${r.terms.map(quote).join(',')}],'approved','public',null,'channel','צבי','{}',${quote(JSON.stringify({verification:r.verification}))}::jsonb)`).join(',')};
      INSERT INTO public.channel_updates VALUES ${sources.map(s=>`(${quote(s.id)},${quote(s.text)},'live',false,'torat-haremez',${quote(s.contributor_id)})`).join(',')};
      INSERT INTO public.nodes VALUES ${targets.map(n=>`(${quote(n.id)},${quote(n.value)},'number',true,'{}')`).join(',')};
    `;
    pg(setup);
    const read=(mutation='')=>JSON.parse(pg(`BEGIN; ${mutation} SELECT jsonb_agg(to_jsonb(x)) FROM (${sql}) x; ROLLBACK;`).stdout);
    assert.equal(read().filter(r=>r.ready_for_review).length,47);
    const r=selection[0], id=quote(r.id),sourceId=quote(r.sourceId),targetId=quote(r.targetId);
    const mutations=[
      `UPDATE research_objects SET privacy_scope='private' WHERE id=${id};`,
      `UPDATE research_objects SET status='candidate' WHERE id=${id};`,
      `UPDATE research_objects SET promoted_node_id=${targetId} WHERE id=${id};`,
      `UPDATE research_objects SET meta='{"ext":{"personal_scope":{"scope":"person_only"}}}' WHERE id=${id};`,
      `UPDATE research_objects SET source='openweb_legacy' WHERE id=${id};`,
      `UPDATE research_objects SET source='old_chat' WHERE id=${id};`,
      `UPDATE research_objects SET contributor='אור הגאולה' WHERE id=${id};`,
      `UPDATE research_objects SET source_ref=source_ref||'#other' WHERE id=${id};`,
      `UPDATE research_objects SET statement=statement||' changed' WHERE id=${id};`,
      `UPDATE research_objects SET terms=terms||ARRAY['extra'] WHERE id=${id};`,
      `UPDATE research_objects SET engine_detail=engine_detail||'{"verification_state":"mismatch"}' WHERE id=${id};`,
      `UPDATE research_objects SET engine_detail=jsonb_set(engine_detail,'{verification,claimed}','"0"') WHERE id=${id};`,
      `UPDATE research_objects SET meta='{"ext":{"extraction_integrity":{"fidelity_status":"partial"}}}' WHERE id=${id};`,
      `UPDATE channel_updates SET channel='or-geula' WHERE id=${sourceId};`,
      `UPDATE channel_updates SET page_only=true WHERE id=${sourceId};`,
      `UPDATE channel_updates SET status='draft' WHERE id=${sourceId};`,
      `UPDATE channel_updates SET text=text||' changed' WHERE id=${sourceId};`,
      `UPDATE channel_updates SET contributor_id=${id} WHERE id=${sourceId};`,
      `UPDATE gematria_methods SET in_engine=false;`,
      `UPDATE fixture_values SET value=value+1 WHERE phrase=${quote(r.phrase)};`,
      `UPDATE nodes SET is_active=false WHERE id=${targetId};`,
      `UPDATE nodes SET metadata='{"space":"private"}' WHERE id=${targetId};`,
      `INSERT INTO nodes SELECT '00000000-0000-4000-8000-000000000000',label,type,is_active,metadata FROM nodes WHERE id=${targetId};`,
      `DELETE FROM research_objects WHERE id=${id};`,
    ];
    for(const mutation of mutations) {
      const actual=read(mutation);
      assert.equal(actual.length,47,'Missing rows must remain visible as failed checks');
      assert.equal(actual.find(x=>x.id===r.id).ready_for_review,false,mutation);
    }
    assert.equal(read().filter(r=>r.ready_for_review).length,47,'Every negative fixture was rolled back');
  });
