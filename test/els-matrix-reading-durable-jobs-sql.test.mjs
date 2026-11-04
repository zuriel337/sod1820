import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { localPgBin, startLocalPg } from './helpers/els-matrix-reading-durable-jobs-local-pg.mjs';

const migration = readFileSync(new URL('../supabase/migrations/20261029125427_els_matrix_reading_durable_jobs.sql', import.meta.url), 'utf8');
const bootstrap = readFileSync(new URL('./fixtures/els-matrix-reading-durable-jobs-bootstrap.sql', import.meta.url), 'utf8');
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const axis = { term: 'קולומביה', scope: 'torah', corpus_id: 'test-canonical-corpus', start: 248765, skip: 4545, dir: 1 };
const snapshot = { contract: 'els_matrix_reading_v1', state: 'STARTING', axis };
const digest = value => createHash('sha256').update(value).digest('hex');
const literal = value => value === null ? 'null' : "'" + String(typeof value === 'object' ? JSON.stringify(value) : value).replaceAll("'", "''") + "'";
const sqlRpc = (name, args) => `select public.els_matrix_reading_job_${name}_v1(${args.map(literal).join(',')});`;
const payload = (id, batch, owner = OWNER) => ({ v: 1, b: batch, i: `u:${owner}`, bc: `els_${id}`, ax: axis });
const usage = { input_tokens: 100, output_tokens: 23, cache_read_input_tokens: 7, cache_creation_input_tokens: 11 };

test('durable migration is private technical storage without a dispatch lease or public execution', () => {
  assert.match(migration, /enable row level security/i);
  assert.equal((migration.match(/security invoker set search_path = ''/g) || []).length, 6);
  assert.doesNotMatch(migration, /security definer|create policy|cron\.schedule|alter table public\.ai_token_log/i);
  assert.match(migration, /where state in \('STARTING','UNKNOWN','RUNNING','CANCEL_REQUESTED'\)/);
});

const bin = localPgBin();
test('durable reading jobs: real isolated PostgreSQL transactions, permissions and races', { skip: !bin && 'Set ELS_DURABLE_TEST_PG_BIN to local PostgreSQL binaries (no remote DB is accepted)', timeout: 90000 }, async t => {
  const pg = startLocalPg(bin);
  try {
    const admin = await pg.connect();
    await admin.query(bootstrap); await admin.query(migration);
    t.diagnostic(`Real PostgreSQL ${ (await admin.query('show server_version;'))[0][0] }, Unix socket only; no model or external DB`);
    const service = await pg.connect(); await service.query('set role service_role;');
    const rpc = async (name, args, client = service) => JSON.parse((await client.query(sqlRpc(name, args)))[0][0]);
    const claim = (scope = randomUUID(), req = randomUUID(), owner = OWNER) => rpc('claim', [owner, req, digest(scope), digest('request:' + scope), snapshot]);
    const attach = (job, batch = 'msgbatch_' + job.id.replaceAll('-', '')) => rpc('attach', [job.owner_id, job.id, batch, null, payload(job.id, batch, job.owner_id)]);
    const finishBody = (job, state = 'COMPLETE') => ({ contract: 'els_matrix_reading_v1', state, axis, job: { id: job.id, batch_id: job.batch_id }, output: { usage }, cost: { logged: true } });
    const failure = (promise, message, code = '22023') => assert.rejects(promise, error => error.code === code && error.message.includes(message));

    await t.test('RLS and every RPC deny anon/authenticated, including spoofed owner JWT', async () => {
      const metadata = JSON.parse((await admin.query(`select json_build_object('rls', relrowsecurity, 'policies', (select count(*) from pg_policy where polrelid = c.oid)) from pg_class c where oid = 'public.els_matrix_reading_jobs'::regclass;`))[0][0]);
      assert.deepEqual(metadata, { rls: true, policies: 0 });
      for (const role of ['anon', 'authenticated']) {
        const client = await pg.connect(); await client.query(`set role ${role}; set request.jwt.claim.sub = '${OWNER}';`);
        for (const statement of ['select * from public.els_matrix_reading_jobs',
          'insert into public.els_matrix_reading_jobs select * from public.els_matrix_reading_jobs',
          'update public.els_matrix_reading_jobs set request_hash = request_hash',
          'delete from public.els_matrix_reading_jobs']) {
          await failure(client.query(statement), 'permission denied', '42501');
        }
        const calls = [
          ['claim', [OWNER, randomUUID(), digest('a'), digest('b'), snapshot]],
          ['get', [OWNER, randomUUID(), null, null]],
          ['attach', [OWNER, randomUUID(), 'msgbatch_x', null, {}]],
          ['mark_unknown', [OWNER, randomUUID()]],
          ['cost', [OWNER, randomUUID(), 'claude-test-model', usage]],
          ['finish', [OWNER, randomUUID(), {}]],
        ];
        for (const [name, args] of calls) await failure(rpc(name, args, client), 'permission denied', '42501');
        client.close();
      }
      assert.deepEqual((await admin.query(`select prosecdef, proconfig::text from pg_proc where proname like 'els_matrix_reading_job_%_v1';`)).map(row => row[0]), Array(6).fill('f'));
      assert.equal((await admin.query(`select has_table_privilege('service_role', 'public.els_matrix_reading_jobs', 'delete');`))[0][0], 'f');
    });

    await t.test('stable request receipt; altered payload refused; owner boundaries; UNKNOWN cannot expire', async () => {
      const scope = randomUUID(), req = randomUUID();
      const first = await claim(scope, req); assert.equal(first.created, true); assert.equal(first.conflict, false);
      const replay = await claim(scope, req); assert.equal(replay.created, false); assert.equal(replay.conflict, false); assert.equal(replay.job.id, first.job.id);
      await failure(rpc('claim', [OWNER, req, digest(scope), digest('changed'), snapshot]), 'reading_request_id_conflict');
      const conflict = await claim(scope); assert.equal(conflict.conflict, true); assert.equal(conflict.job.id, first.job.id);
      const other = await claim(scope, randomUUID(), OTHER); assert.equal(other.created, true); assert.notEqual(other.job.id, first.job.id);
      assert.equal((await rpc('get', [OTHER, first.job.id, null, null])).job, null);
      await failure(rpc('mark_unknown', [OTHER, first.job.id]), 'reading_job_not_found', 'P0002');
      assert.equal((await rpc('mark_unknown', [OWNER, first.job.id])).job.state, 'UNKNOWN');
      await admin.query(`update public.els_matrix_reading_jobs set created_at = now() - interval '400 days', updated_at = now() - interval '400 days' where id = '${first.job.id}';`);
      const uncertain = await claim(scope); assert.equal(uncertain.conflict, true); assert.equal(uncertain.job.state, 'UNKNOWN');
      assert.equal((await rpc('get', [OWNER, null, digest(scope), null])).job.id, first.job.id);
      await failure(rpc('get', [OWNER, first.job.id, digest(scope), null]), 'invalid_reading_job_selector');
      await failure(rpc('get', [OWNER, null, null, null]), 'invalid_reading_job_selector');
      const bound = await attach(first.job); assert.equal(bound.job.state, 'RUNNING');
      assert.equal((await rpc('mark_unknown', [OWNER, first.job.id])).job.state, 'RUNNING');
      assert.equal((await rpc('get', [OWNER, null, null, bound.job.batch_id])).job.id, first.job.id);
      assert.equal((await rpc('get', [OTHER, null, null, bound.job.batch_id])).job, null);
    });

    await t.test('concurrent distinct request IDs claim one active scope, then same request replays once', async () => {
      for (const sameRequest of [false, true]) {
        const scope = randomUUID(), fixedRequest = randomUUID();
        const clients = await Promise.all(Array.from({ length: 12 }, () => pg.connect()));
        try {
          await Promise.all(clients.map(client => client.query('set role service_role;')));
          const results = await Promise.all(clients.map(client => rpc('claim', [OWNER, sameRequest ? fixedRequest : randomUUID(), digest(scope), digest('request:' + scope), snapshot], client)));
          assert.equal(results.filter(row => row.created).length, 1);
          assert.equal(new Set(results.map(row => row.job.id)).size, 1);
          assert.equal(results.filter(row => row.conflict).length, sameRequest ? 0 : 11);
          assert.equal((await admin.query(`select count(*) from public.els_matrix_reading_jobs where scope_key = '${digest(scope)}';`))[0][0], '1');
        } finally { clients.forEach(client => client.close()); }
      }
    });

    await t.test('attachment is bound to exact owner, batch, canonical axis and job custom ID', async () => {
      const { job } = await claim(); const batch = 'msgbatch_bind';
      await failure(rpc('attach', [OTHER, job.id, batch, null, payload(job.id, batch, OTHER)]), 'reading_job_not_found', 'P0002');
      await failure(rpc('attach', [OWNER, job.id, batch, null, { ...payload(job.id, batch), i: `u:${OTHER}` }]), 'invalid_reading_job_attachment');
      await failure(rpc('attach', [OWNER, job.id, batch, null, { ...payload(job.id, batch), bc: 'els_wrong' }]), 'invalid_reading_job_attachment');
      await failure(rpc('attach', [OWNER, job.id, batch, null, { ...payload(job.id, batch), ax: { ...axis, start: axis.start + 1 } }]), 'reading_job_axis_mismatch');
      await failure(rpc('attach', [OWNER, job.id, batch, null, { ...payload(job.id, batch), ax: { ...axis, corpus_id: 'another-corpus' } }]), 'reading_job_axis_mismatch');
      const bound = await attach(job, batch); assert.equal(bound.job.job_token, null);
      assert.deepEqual(bound.job.job_payload, payload(job.id, batch));
      assert.equal((await attach(job, batch)).job.id, job.id);
      await failure(attach(job, 'msgbatch_rebind'), 'reading_job_already_bound');
      const tokenJob = (await claim()).job;
      const token = 'a'.repeat(3000) + '.' + 'b'.repeat(2000);
      assert.equal((await rpc('attach', [OWNER, tokenJob.id, 'msgbatch_longtoken', token, payload(tokenJob.id, 'msgbatch_longtoken')])).job.job_token, token);
    });

    await t.test('atomic cost receipt: simultaneous collectors insert exactly one owner-bound audit row', async () => {
      const { job } = await attach((await claim()).job);
      await failure(rpc('cost', [OTHER, job.id, 'claude-test-model', usage]), 'reading_job_not_found', 'P0002');
      for (const bad of [{ ...usage, input_tokens: -1 }, { ...usage, output_tokens: '23' }, { ...usage, output_tokens: 0.5 }, { ...usage, input_tokens: 2147483647 }]) {
        await failure(rpc('cost', [OWNER, job.id, 'claude-test-model', bad]), 'invalid_reading_token_usage');
      }
      const clients = await Promise.all(Array.from({ length: 12 }, () => pg.connect()));
      try {
        await Promise.all(clients.map(client => client.query('set role service_role;')));
        const results = await Promise.all(clients.map(client => rpc('cost', [OWNER, job.id, 'claude-test-model', usage], client)));
        assert.equal(results.filter(row => !row.existed).length, 1); assert.equal(new Set(results.map(row => row.id)).size, 1);
        const rows = await admin.query(`select user_id, input_tokens, output_tokens, source, kind, ref from public.ai_token_log where ref = '${job.batch_id}';`);
        assert.deepEqual(rows, [[OWNER, '118', '23', 'analyze', 'raziel_els_matrix_reading', job.batch_id]]);
        assert.equal((await rpc('get', [OWNER, job.id, null, null])).job.cost_log_id, results[0].id);
        await failure(rpc('cost', [OWNER, job.id, 'claude-another-model', usage]), 'reading_cost_receipt_conflict');
        await failure(rpc('cost', [OWNER, job.id, 'claude-test-model', { ...usage, output_tokens: 24 }]), 'reading_cost_receipt_conflict');
        assert.equal((await admin.query(`select count(*) from public.ai_token_log where ref = '${job.batch_id}';`))[0][0], '1');
      } finally { clients.forEach(client => client.close()); }
    });

    await t.test('rollback cannot leave a cost row without its durable receipt', async () => {
      const { job } = await attach((await claim()).job);
      await service.query('begin;'); await rpc('cost', [OWNER, job.id, 'claude-test-model', usage]); await service.query('rollback;');
      assert.equal((await admin.query(`select count(*) from public.ai_token_log where ref = '${job.batch_id}';`))[0][0], '0');
      assert.equal((await rpc('get', [OWNER, job.id, null, null])).job.cost_log_id, null);
      const receipt = await rpc('cost', [OWNER, job.id, 'claude-test-model', usage]); assert.equal(receipt.existed, false);
    });

    await t.test('winner can late-bind an existing trace pair, never rebind or duplicate cost', async () => {
      const { job } = await attach((await claim()).job);
      const first = await rpc('cost', [OWNER, job.id, 'claude-test-model', usage]);
      const traceId = randomUUID(), spanId = randomUUID(), otherTrace = randomUUID(), otherSpan = randomUUID();
      await admin.query(`insert into public.op_trace_roots values ('${traceId}'),('${otherTrace}');
        insert into public.op_trace_spans values ('${spanId}','${traceId}'),('${otherSpan}','${otherTrace}');`);
      const traceOf = async () => (await admin.query(`select trace_id, span_id from public.ai_token_log where id = ${first.id};`))[0];
      for (const invalid of [{ traceId: 'invalid', spanId }, { traceId, spanId: randomUUID() }, { traceId, spanId: otherSpan }]) {
        assert.equal((await rpc('cost', [OWNER, job.id, 'claude-test-model', usage, invalid])).existed, true);
        assert.deepEqual(await traceOf(), [null, null]);
      }
      assert.equal((await rpc('cost', [OWNER, job.id, 'claude-test-model', usage, { traceId, spanId }])).id, first.id);
      assert.deepEqual(await traceOf(), [traceId, spanId]);
      await rpc('cost', [OWNER, job.id, 'claude-test-model', usage, { traceId: otherTrace, spanId: otherSpan }]);
      assert.deepEqual(await traceOf(), [traceId, spanId]);
      const second = (await attach((await claim()).job)).job;
      const reusedPair = await rpc('cost', [OWNER, second.id, 'claude-test-model', usage, { traceId, spanId }]);
      assert.equal(reusedPair.logged, true);
      assert.deepEqual((await admin.query(`select trace_id,span_id from public.ai_token_log where id = ${reusedPair.id};`))[0], [null, null]);
      assert.equal((await admin.query(`select count(*) from public.ai_token_log where ref = '${job.batch_id}';`))[0][0], '1');
    });

    await t.test('failed receipt UPDATE rolls back the audit INSERT atomically', async () => {
      const { job } = await attach((await claim()).job);
      await admin.query(`create function public.test_els_durable_fail_receipt() returns trigger language plpgsql as $$ begin if new.id = '${job.id}'::uuid and new.cost_log_id is not null then raise exception 'injected_receipt_failure'; end if; return new; end; $$;
        create trigger test_els_durable_fail_receipt before update on public.els_matrix_reading_jobs for each row execute function public.test_els_durable_fail_receipt();`);
      try {
        await failure(rpc('cost', [OWNER, job.id, 'claude-test-model', usage]), 'injected_receipt_failure', 'P0001');
        assert.equal((await admin.query(`select count(*) from public.ai_token_log where ref = '${job.batch_id}';`))[0][0], '0');
        assert.equal((await rpc('get', [OWNER, job.id, null, null])).job.cost_log_id, null);
      } finally {
        await admin.query('drop trigger test_els_durable_fail_receipt on public.els_matrix_reading_jobs; drop function public.test_els_durable_fail_receipt();');
      }
      assert.equal((await rpc('cost', [OWNER, job.id, 'claude-test-model', usage])).existed, false);
    });

    await t.test('terminal result requires matching batch/axis and receipt; first result survives replay and reload', async () => {
      const scope = randomUUID(), req = randomUUID(); const original = await claim(scope, req);
      const { job } = await attach(original.job); const body = finishBody(job);
      await failure(rpc('finish', [OTHER, job.id, body]), 'reading_job_not_found', 'P0002');
      await failure(rpc('finish', [OWNER, job.id, body]), 'reading_cost_receipt_required');
      await rpc('cost', [OWNER, job.id, 'claude-test-model', usage]);
      await failure(rpc('finish', [OWNER, job.id, { ...body, axis: { ...axis, skip: 1 } }]), 'invalid_reading_terminal_result');
      await failure(rpc('finish', [OWNER, job.id, { ...body, axis: { ...axis, corpus_id: 'another-corpus' } }]), 'invalid_reading_terminal_result');
      await failure(rpc('finish', [OWNER, job.id, { ...body, job: { ...body.job, batch_id: 'msgbatch_wrong' } }]), 'invalid_reading_terminal_result');
      const completed = await rpc('finish', [OWNER, job.id, { ...body, job: { ...body.job, token: 'secret-never-retained-in-result' } }]);
      assert.equal(completed.job.state, 'COMPLETE'); assert.equal(completed.job.result.job.token, undefined);
      assert.equal((await rpc('cost', [OWNER, job.id, 'claude-test-model', usage])).existed, true);
      const repeated = await rpc('finish', [OWNER, job.id, { ...body, state: 'INCOMPLETE' }]); assert.deepEqual(repeated.job, completed.job);
      assert.equal((await claim(scope, req)).job.id, job.id);
      assert.equal((await rpc('mark_unknown', [OWNER, job.id])).job.state, 'COMPLETE');
      const reloadClient = await pg.connect(); await reloadClient.query('set role service_role;');
      assert.deepEqual((await rpc('get', [OWNER, job.id, null, null], reloadClient)).job.result, completed.job.result); reloadClient.close();
      const next = await claim(scope); assert.equal(next.created, true); assert.notEqual(next.job.id, job.id);
      assert.equal((await rpc('get', [OWNER, null, digest(scope), null])).job.id, next.job.id);
      assert.equal((await claim(scope, req)).job.id, job.id);
    });

    await t.test('failed provider response can terminate without invented usage or cost', async () => {
      const { job } = await attach((await claim()).job);
      await failure(rpc('finish', [OWNER, job.id, finishBody(job, 'FAILED_WITH_REASON')]), 'reading_cost_receipt_required');
      const body = { ...finishBody(job, 'FAILED_WITH_REASON'), output: null, cost: null, reason: 'provider_canceled' };
      const result = await rpc('finish', [OWNER, job.id, body]); assert.equal(result.job.state, 'FAILED'); assert.equal(result.job.cost_log_id, null);
    });

    await t.test('bounds reject malformed or excessive server payloads', async () => {
      const args = [OWNER, randomUUID(), digest('bounds'), digest('bounds-request')];
      for (const bad of [{}, { ...snapshot, axis: { ...axis, scope: 'tanakh' } }, { ...snapshot, axis: { ...axis, corpus_id: null } }, { ...snapshot, extra: 'x'.repeat(65537) }]) {
        await failure(rpc('claim', [...args, bad]), 'invalid_reading_job_claim');
      }
      const { job } = await claim();
      await failure(rpc('attach', [OWNER, job.id, 'msgbatch_bound', 'x'.repeat(6001), payload(job.id, 'msgbatch_bound')]), 'invalid_reading_job_attachment');
    });
  } finally { pg.stop(); }
});
