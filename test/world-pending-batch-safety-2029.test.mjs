import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { COHORT_FILES, extractCohortSelect, buildResidualAuditSql } from '../scripts/audit-world-corpus-residual.mjs';
import { readEvidence, buildReview, selectPendingAtomicClaims, buildPendingAtomicPreflightSql,
  readWriterSnapshot, buildAtomicReplacementRehearsalSql } from '../scripts/audit-world-claim-coverage.mjs';

const evidence=readEvidence();
const selection=selectPendingAtomicClaims(evidence);
const sql=buildPendingAtomicPreflightSql(evidence);
const writerSnapshot=readWriterSnapshot();
const rehearsal=buildAtomicReplacementRehearsalSql(evidence,writerSnapshot);
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

test('replacement is a rollback-only offline artifact with real admin authorization, not impersonation',()=>{
  assert.match(rehearsal,/BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(rehearsal,/ROLLBACK;\s*$/u);
  assert.doesNotMatch(rehearsal,/\bCOMMIT\s*;|set_config|request\.jwt|localStorage|CREATE (?:OR REPLACE )?FUNCTION/iu);
  assert.match(rehearsal,/id=auth.uid\(\) AND role='admin'/u);
  assert.match(rehearsal,/SET LOCAL lock_timeout = '3s'/u);
  assert.ok(rehearsal.indexOf('WORLD_ATOMIC_PREFLIGHT_FAILED')<rehearsal.indexOf('result := public.admin_research_review('));
});

test('replacement preserves siblings, source text and graph identity without source-number ranking',()=>{
  for(const key of ['WORLD_ATOMIC_IDENTITY_COLLISION','WORLD_ATOMIC_SELECTED_POSTCONDITION',
    'WORLD_ATOMIC_PRESERVATION_FAILED','preserve_sibling_ids','independent_sources_added']) assert.ok(rehearsal.includes(key));
  assert.doesNotMatch(rehearsal,/\bDELETE\b|row_number\(|PARTITION BY|UPDATE public\.(?:research_objects|channel_updates|nodes)\b/iu);
  assert.match(rehearsal,/UPDATE public\.decision_ledger l SET provenance=/u);
  assert.ok(rehearsal.includes('interpretation not verified'));
});

test('engine, writer and registry drift invalidate the replacement artifact',()=>{
  const modified=structuredClone(writerSnapshot);
  modified.functions[0].definition+=' changed';
  assert.throws(()=>buildAtomicReplacementRehearsalSql(evidence,modified),/Invalid writer snapshot/);
  assert.match(rehearsal,/WORLD_ATOMIC_IMPLEMENTATION_DRIFT/);
  assert.match(rehearsal,/WORLD_ATOMIC_METHOD_DRIFT/);
  assert.match(rehearsal,/md5\(pg_get_functiondef\(to_regprocedure/);
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

    // Rehearse with captured canonical SQL functions, including the actual regular
    // engine and revision trigger. Only auth and surrounding fixture schema are local.
    const siblings=evidence.rows.filter(row=>!selection.some(s=>s.id===row.id)
      && sources.some(s=>s.id===row.source_id));
    const actor='00000000-0000-4000-8000-000000000001';
    const member='00000000-0000-4000-8000-000000000002';
    pg(`
      ALTER TABLE research_objects ADD kind text DEFAULT 'observation', ADD engine_verified boolean DEFAULT false,
        ADD relates text[] DEFAULT '{}', ADD confidence numeric, ADD evidence jsonb, ADD parent_id uuid, ADD owner_person_id uuid;
      ALTER TABLE channel_updates ADD credit text;
      ALTER TABLE gematria_methods ADD function text, ADD version integer, ADD active boolean,
        ADD deterministic boolean, ADD execution_kind text, ADD dependency_version integer,
        ADD dependency_versions jsonb, ADD required_entitlement text;
      UPDATE gematria_methods SET function='fn_ragil',version=1,active=true,deterministic=true,
        execution_kind='sql_function',dependency_version=1,dependency_versions='{}',required_entitlement='public';
      INSERT INTO research_objects(id,source_ref,statement,value,terms,status,privacy_scope,source,contributor,meta,engine_detail)
        VALUES ${siblings.map(s=>`(${quote(s.id)},${quote(s.source_ref)},${quote(s.statement)},${s.value},ARRAY[${s.terms.map(quote).join(',')}]::text[],${quote(s.status)},'public','channel','צבי','{}',${quote(JSON.stringify({verification:s.verification}))}::jsonb)`).join(',')};
      CREATE TABLE public.users(id uuid primary key,role text);
      INSERT INTO public.users VALUES ('${actor}','admin'),('${member}','member');
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
        $$ SELECT nullif(current_setting('world_fixture.actor',true),'')::uuid $$;
      CREATE TABLE public.decision_ledger(id uuid primary key DEFAULT gen_random_uuid(),decision_type text,
        subject_type text,subject_ref text,candidate jsonb,domain text,created_by_agent text,agents_involved text[],
        human_decision text,human_reason text,decided_by text,result_ref jsonb,provenance jsonb,status text,
        created_at timestamptz DEFAULT now());
      CREATE TABLE public.research_object_revisions(research_object_id uuid,research_object_source_uid text,
        research_object_claim_uid text,change_kind text,changed_fields text[],before_snapshot jsonb,
        statement_before text,actor uuid,actor_fallback text,occurred_at timestamptz);
      DROP FUNCTION public.fn_method_value(text,text);
      ${writerSnapshot.functions.map(f=>f.definition+';').join('\n')}
      CREATE TRIGGER trg_00_zvi_standing_approve_research_object BEFORE INSERT OR UPDATE OF status,source_ref
        ON research_objects FOR EACH ROW EXECUTE FUNCTION fn_zvi_standing_approve_research_object();
      CREATE TRIGGER trg_snapshot_research_object_before_update BEFORE UPDATE ON research_objects
        FOR EACH ROW EXECUTE FUNCTION fn_snapshot_research_object_revision();
      CREATE TRIGGER trg_snapshot_research_object_before_delete BEFORE DELETE ON research_objects
        FOR EACH ROW EXECUTE FUNCTION fn_snapshot_research_object_revision();
    `);
    const baseline=pg('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM research_objects r;').stdout;
    const run=(body=rehearsal,as=actor)=>pg(`SET world_fixture.actor=${quote(as)};\n${body}`,true);
    const unchanged=()=>{
      assert.equal(pg('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM research_objects r;').stdout,baseline);
      assert.equal(pg('SELECT count(*) FROM decision_ledger; SELECT count(*) FROM research_object_revisions;').stdout,'0\n0\n');
    };
    for(const as of ['',member]) {
      const result=run(rehearsal,as);
      assert.equal(result.status,3);
      assert.match(result.stderr,/WORLD_ATOMIC_ADMIN_REQUIRED/);
      unchanged();
    }
    for(let attempt=0;attempt<2;attempt++) {
      const result=run();
      assert.equal(result.status,0,result.stderr);
      assert.deepEqual(JSON.parse(result.stdout),{rehearsed:47,persisted:false});
      unchanged();
    }
    const inject=change=>rehearsal.replace('BEGIN ISOLATION LEVEL SERIALIZABLE;',
      ()=>`BEGIN ISOLATION LEVEL SERIALIZABLE;\n${change}`);
    for(const [mutation,marker] of [
      [`UPDATE research_objects SET privacy_scope='private' WHERE id=${id};`,'WORLD_ATOMIC_PREFLIGHT_FAILED'],
      [`UPDATE channel_updates SET text=text||' changed' WHERE id=${sourceId};`,'WORLD_ATOMIC_PREFLIGHT_FAILED'],
      [`UPDATE gematria_methods SET version=version+1;`,'WORLD_ATOMIC_METHOD_DRIFT'],
      [`CREATE OR REPLACE FUNCTION fn_letter_val(c text) RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 0';`,'WORLD_ATOMIC_IMPLEMENTATION_DRIFT'],
      [`INSERT INTO research_objects SELECT (jsonb_populate_record(null::research_objects,
          to_jsonb(r)||'{"id":"00000000-0000-4000-8000-000000000003"}')).* FROM research_objects r WHERE id=${id};`,'WORLD_ATOMIC_IDENTITY_COLLISION'],
      [`ALTER TABLE decision_ledger ADD CONSTRAINT fixture_late_failure CHECK(subject_ref<>${quote([...selection].sort((a,b)=>a.id.localeCompare(b.id)).at(-1).id)});`,'fixture_late_failure'],
    ]) {
      const result=run(inject(mutation));
      assert.equal(result.status,3,result.stdout);
      assert.ok(result.stderr.includes(marker),result.stderr);
      unchanged();
    }
    // An extra fixture-only trigger attempts to corrupt an unselected sibling.
    // The canonical revision trigger permits this metadata-only update; our
    // transaction's preservation postcondition must catch and roll it all back.
    const corrupt=`CREATE FUNCTION fixture_touch_sibling() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN UPDATE research_objects SET meta='{"fixture_corruption":true}' WHERE id=${quote(siblings[0].id)}; RETURN NEW; END; $$;
      CREATE TRIGGER fixture_corruption AFTER UPDATE ON research_objects
        FOR EACH ROW WHEN (NEW.id=${id} AND NEW.status='canonical') EXECUTE FUNCTION fixture_touch_sibling();`;
    const rejected=run(inject(corrupt));
    assert.equal(rejected.status,3);
    assert.match(rejected.stderr,/WORLD_ATOMIC_PRESERVATION_FAILED/);
    unchanged();
    // Only in this disposable, network-none test database: persist once to test
    // the actual writers' end state and refusal to promote the cohort twice.
    const committed=run(rehearsal.replace(/ROLLBACK;\s*$/u,'COMMIT;'));
    assert.equal(committed.status,0,committed.stderr);
    assert.equal(pg("SELECT count(*) FROM decision_ledger; SELECT count(*) FROM research_object_revisions;").stdout,'47\n94\n');
    const ledger=JSON.parse(pg('SELECT jsonb_agg(provenance) FROM decision_ledger').stdout);
    assert.ok(ledger.every(p=>p.independent_sources_added===0 && p.truth_score_created===false
      && p.computed===p.expected && !p.selection.includes('strength=')));
    const repeated=run();
    assert.equal(repeated.status,3);
    assert.match(repeated.stderr,/WORLD_ATOMIC_PREFLIGHT_FAILED/);
  });
