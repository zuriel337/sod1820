#!/usr/bin/env node
// SOD1820 v17 — regression harness for docs/coordination-drafts/owner-route-atomic-ledger-v17.sql
// Runs REAL SQL against a throwaway local PostgreSQL cluster (initdb in a temp dir, unix socket only).
// No Supabase / network / production. No npm dependency: uses the system postgres binaries + psql.
// If the binaries are unavailable the suite reports BLOCKED (exit 2) and never fabricates passes.
//   node scripts/test-agent-owner-route-atomic-ledger-v17.mjs
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DRAFT = join(here, '..', 'docs', 'coordination-drafts', 'owner-route-atomic-ledger-v17.sql');
const draftSql = readFileSync(DRAFT, 'utf8');

const results = [];
let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; results.push(['PASS', name]); console.log(`PASS  ${name}`); }
  catch (e) { failed++; results.push(['FAIL', name]); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
};
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m); };

// ---------------------------------------------------------------- locate postgres
const binDirs = [process.env.PG_BIN, ...(existsSync('/usr/lib/postgresql') ? readdirSync('/usr/lib/postgresql').sort().reverse().map((v) => `/usr/lib/postgresql/${v}/bin`) : [])].filter(Boolean);
const bin = binDirs.find((d) => existsSync(join(d, 'initdb')) && existsSync(join(d, 'pg_ctl')) && existsSync(join(d, 'psql')));
if (!bin) {
  console.log('BLOCKED: no local PostgreSQL binaries (initdb/pg_ctl/psql). Nothing was run; no passes claimed.');
  process.exit(2);
}
const isRoot = process.getuid?.() === 0;
const asPg = (cmd, args) => (isRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...args]] : [cmd, args]);

// postgres refuses to run as root; its helper user must be able to traverse the disposable dir
const root = mkdtempSync(join(isRoot ? '/tmp' : tmpdir(), 'owner-route-pg-'));
const data = join(root, 'data'), sock = join(root, 'sock');
spawnSync('mkdir', ['-p', data, sock]);
chmodSync(root, 0o755); chmodSync(sock, 0o777);
if (isRoot) spawnSync('chown', ['-R', 'postgres:postgres', data, sock]);
let started = false;
const stop = () => { if (started) { const [c, a] = asPg(join(bin, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']); spawnSync(c, a); } try { rmSync(root, { recursive: true, force: true }); } catch {} };
process.on('exit', stop);

{
  const [c, a] = asPg(join(bin, 'initdb'), ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-sync']);
  const r = spawnSync(c, a, { encoding: 'utf8' });
  if (r.status !== 0) { console.log('BLOCKED: initdb failed:', r.stderr); process.exit(2); }
  const [c2, a2] = asPg(join(bin, 'pg_ctl'), ['-D', data, '-w', '-o', `-c listen_addresses='' -c unix_socket_directories='${sock}' -c fsync=off`, '-l', join(sock, 'pg.log'), 'start']);
  const s = spawnSync(c2, a2, { encoding: 'utf8' });
  if (s.status !== 0) { console.log('BLOCKED: pg_ctl start failed:', s.stderr, s.stdout); process.exit(2); }
  started = true;
}

const psqlArgs = (db) => ['-X', '-q', '-A', '-t', '-h', sock, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1'];
// synchronous run -> {code, out, err}
const run = (sql, { db = 'scratch', env = {} } = {}) => {
  const r = spawnSync(join(bin, 'psql'), psqlArgs(db), { input: sql, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
const q = (sql, o) => { const r = run(sql, o); if (r.code !== 0) throw new Error(`psql failed: ${r.err}\nSQL: ${sql.slice(0, 300)}`); return r.out; };
const qf = (sql, o) => { const r = run(sql, o); if (r.code === 0) throw new Error(`expected failure but succeeded: ${sql.slice(0, 200)}\n${r.out}`); return r.err; };
// async run for true concurrent sessions
const runAsync = (sql) => new Promise((res) => {
  const t0 = Date.now();
  const p = spawn(join(bin, 'psql'), psqlArgs('scratch'));
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => res({ code, out: out.trim(), err: err.trim(), ms: Date.now() - t0 }));
  p.stdin.end(sql);
});
const j = (s) => JSON.parse(s);

const hex = (c, n = 64) => c.repeat(n).slice(0, n);
const KEY = (c) => hex(c);
const HEAD = hex('a', 40);
const take = (k, extra = {}) => j(q(`SET ROLE service_role; SELECT public.owner_route_take('${KEY(k)}','claim-1','session_1','TASK_X','appr-1','${extra.head || HEAD}',${extra.ttl || 900});`));
const send = (k, outcome, ref = 'prov-ref-1') => j(q(`SET ROLE service_role; SELECT public.owner_route_record_send('${KEY(k)}','${outcome}',${ref === null ? 'NULL' : `'${ref}'`});`));
const consume = (k, nonce, { claim = 'claim-1', session = 'session_1', receipt = 'receipt-0001', at = 'now()' } = {}) =>
  j(q(`SET ROLE service_role; SELECT public.owner_ack_consume('${KEY(k)}','${nonce}','${claim}','${session}','${receipt.replace(/'/g, "''")}',${at === 'now()' ? 'now()' : `'${at}'::timestamptz`});`));
const lastLine = (s) => s.split('\n').filter((l) => l.trim().startsWith('{')).pop();

// ---------------------------------------------------------------- scratch fixture (replica of live facts 2026-10-17)
q('DROP DATABASE IF EXISTS scratch;', { db: 'postgres' }); q('CREATE DATABASE scratch;', { db: 'postgres' });
const FIXTURE = String.raw`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TABLE public.work_log (
 id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, session_date date DEFAULT CURRENT_DATE, topic text NOT NULL,
 numbers text[], what_we_did text, status text, open_threads text, created_at timestamptz DEFAULT now(),
 archived boolean NOT NULL DEFAULT false, superseded_by_id uuid, task_key text, from_actor text, to_actor text,
 assignment_mode text, assignment_scope text, primary_owner text, release_authorization_state text,
 parent_assignment_id uuid, dispatch_kind text, dispatch_state text, dispatch_context jsonb DEFAULT '{}'::jsonb,
 dispatch_attempts integer DEFAULT 0, dispatch_next_attempt_at timestamptz, dispatch_lease_owner text,
 dispatch_lease_expires_at timestamptz, dispatch_last_error text, dispatch_last_request_id bigint,
 dispatch_last_emitted_at timestamptz, dispatch_completed_at timestamptz, dispatch_session_id text,
 dispatch_session_url text, dispatch_response_at timestamptz);
CREATE UNIQUE INDEX work_log_assignment_idempotency_uidx ON public.work_log (task_key, to_actor, dispatch_kind) WHERE dispatch_kind='ASSIGNMENT';
ALTER TABLE public.work_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_log_admin_all ON public.work_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.work_log TO authenticated;
GRANT ALL ON public.work_log TO service_role;
-- worst case for the test: an admin-policy user that CAN write the table
CREATE ROLE admin_writer NOLOGIN; GRANT USAGE ON SCHEMA public TO admin_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_log TO admin_writer;
CREATE POLICY work_log_admin_writer ON public.work_log FOR ALL TO admin_writer USING (true) WITH CHECK (true);
CREATE TABLE public.emit_probe (id bigserial PRIMARY KEY, fn text, assignment_id uuid);
CREATE FUNCTION public.agent_dispatch_emit(p_assignment_id uuid) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.emit_probe(fn,assignment_id) VALUES ('agent_dispatch_emit',p_assignment_id) $$;
CREATE FUNCTION public.agent_dispatch_emit_gpt(p_assignment_id uuid) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.emit_probe(fn,assignment_id) VALUES ('agent_dispatch_emit_gpt',p_assignment_id) $$;
CREATE FUNCTION public.work_log_dispatch_after_write() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if new.to_actor in ('GPT','CLAUDE') and new.dispatch_state in ('QUEUED','RETRY_WAIT') and coalesce(new.dispatch_next_attempt_at,now())<=now() then perform public.agent_dispatch_emit(new.id); end if; return null;
end $$;
CREATE FUNCTION public.work_log_dispatch_gpt_after_write() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if new.to_actor='GPT' and new.dispatch_kind='RESULT_WAKE' and coalesce(new.assignment_mode,'READ_ONLY')='READ_ONLY' and new.dispatch_state in ('QUEUED','RETRY_WAIT') and coalesce(new.dispatch_next_attempt_at,now()) <= now() then perform public.agent_dispatch_emit_gpt(new.id); end if;
  return null;
end $$;
CREATE FUNCTION public.work_log_dispatch_prepare() RETURNS trigger LANGUAGE plpgsql AS $$
declare
  v_match text[];
  v_claimable boolean;
begin
  if tg_op='INSERT' then
    if new.task_key is null then
      v_match:=regexp_match(coalesce(new.topic,''),'task=([^ ]+)');
      if v_match is not null then new.task_key:=v_match[1]; end if;
    end if;
    if new.from_actor is null then
      v_match:=regexp_match(coalesce(new.topic,''),'(^| )FROM=(GPT|CLAUDE|ZURIEL)( |$)');
      if v_match is not null then new.from_actor:=v_match[2]; end if;
    end if;
    if new.to_actor is null then
      v_match:=regexp_match(coalesce(new.topic,''),'(^| )TO=(GPT|CLAUDE)( |$)');
      if v_match is not null then new.to_actor:=v_match[2]; end if;
    end if;
    if new.assignment_scope is null and new.task_key is not null then new.assignment_scope:=new.task_key; end if;
    if new.assignment_mode is not null then new.assignment_mode:=upper(new.assignment_mode);
    elsif coalesce(new.status,'') ~* '(READ_ONLY|SPECIALIST|CHALLENGE)' then new.assignment_mode:='READ_ONLY';
    elsif coalesce(new.status,'') ~* '(CLAIMED_WRITE|WRITE_SCOPE|ASSIGNED_WRITE)' then new.assignment_mode:='WRITE'; end if;
    v_claimable:=coalesce(new.status,'') ~* '(QUEUED|ASSIGNED|ACK_REQUIRED|WAITING_SPECIALIST)';
    if new.dispatch_kind is null and new.task_key is not null and new.to_actor in ('GPT','CLAUDE') and v_claimable then new.dispatch_kind:='ASSIGNMENT'; end if;
    if new.dispatch_kind='ASSIGNMENT' and new.assignment_mode is null then new.assignment_mode:='READ_ONLY'; end if;
  else
    if new.assignment_mode is not null then new.assignment_mode:=upper(new.assignment_mode); end if;
  end if;
  if new.dispatch_kind in ('ASSIGNMENT','RESULT_WAKE') and new.to_actor in ('GPT','CLAUDE') and new.dispatch_state is null then
    new.dispatch_state:='QUEUED';
    new.dispatch_next_attempt_at:=coalesce(new.dispatch_next_attempt_at,now());
  end if;
  new.dispatch_context:=coalesce(new.dispatch_context,'{}'::jsonb);
  new.dispatch_attempts:=coalesce(new.dispatch_attempts,0);
  return new;
end $$;
CREATE FUNCTION public.work_log_gpt_delivery_stop_v17() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.to_actor='GPT' AND (TG_OP='INSERT' OR NEW.dispatch_state IN ('QUEUED','RETRY_WAIT')) THEN
  NEW.dispatch_context:=coalesce(NEW.dispatch_context,'{}'::jsonb)||jsonb_build_object('original_to_actor','GPT','delivery_disabled_by','ZURIEL_V17','gpt_ack_required',false);
  NEW.to_actor:='ZURIEL'; NEW.dispatch_kind:=NULL; NEW.dispatch_state:=NULL; NEW.dispatch_next_attempt_at:=NULL;
  NEW.dispatch_last_error:='GPT_DELIVERY_DISABLED_BY_ZURIEL_V17_PASSIVE_REPORT';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_work_log_dispatch_00_gpt_event AFTER INSERT OR UPDATE OF dispatch_state, dispatch_next_attempt_at ON public.work_log FOR EACH ROW EXECUTE FUNCTION work_log_dispatch_gpt_after_write();
CREATE TRIGGER trg_work_log_dispatch_event AFTER INSERT OR UPDATE OF dispatch_state, dispatch_next_attempt_at ON public.work_log FOR EACH ROW EXECUTE FUNCTION work_log_dispatch_after_write();
CREATE TRIGGER trg_work_log_dispatch_prepare BEFORE INSERT OR UPDATE ON public.work_log FOR EACH ROW EXECUTE FUNCTION work_log_dispatch_prepare();
CREATE TRIGGER trg_work_log_zz_gpt_delivery_stop_v17 BEFORE INSERT OR UPDATE ON public.work_log FOR EACH ROW EXECUTE FUNCTION work_log_gpt_delivery_stop_v17();
INSERT INTO public.work_log(topic,status,task_key,from_actor,to_actor,assignment_mode,assignment_scope) VALUES ('legacy passive WRITE claim (no structured paths)','BEFORE_CLAIMED_WRITE','LEGACY_PASSIVE_1','CLAUDE','ZURIEL','WRITE','legacy-scope');
`;
q(FIXTURE);
const applyDraft = (ack = true) => run((ack ? "SET owner_route.draft_apply_ack = 'SCRATCH_ONLY_NOT_PRODUCTION';\n" : '') + draftSql);
const legacyBefore = q("SELECT md5(w::text) FROM public.work_log w WHERE task_key='LEGACY_PASSIVE_1'");

// ================================================================ tests
await test('draft refuses to apply without the scratch-only acknowledgement', async () => {
  const r = applyDraft(false);
  ok(r.code !== 0 && /OWNER_ROUTE_DRAFT_NOT_AUTHORIZED_FOR_APPLY/.test(r.err), r.err);
  eq(q("SELECT to_regprocedure('public.owner_route_take(text,text,text,text,text,text,integer)') IS NULL"), 't');
});
await test('draft applies cleanly and re-applies idempotently', async () => {
  const a = applyDraft(); ok(a.code === 0, a.err);
  const b = applyDraft(); ok(b.code === 0, b.err);
  eq(q("SELECT count(*) FROM pg_indexes WHERE tablename='work_log' AND indexname LIKE 'work_log_owner_route_%'"), '3');
  eq(q("SELECT count(*) FROM pg_trigger WHERE tgrelid='public.work_log'::regclass AND NOT tgisinternal"), '5');
});
await test('trigger order: route guard runs after prepare and before the v17 GPT guard', () => {
  const names = q("SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid='public.work_log'::regclass AND NOT tgisinternal AND tgtype & 2 = 2");
  eq(names, 'trg_work_log_dispatch_prepare,trg_work_log_zy_owner_route_guard,trg_work_log_zz_gpt_delivery_stop_v17');
});
await test('grants: PUBLIC/anon/authenticated cannot execute; service_role can', () => {
  const fns = ['owner_route_take(text,text,text,text,text,text,integer)', 'owner_route_record_send(text,text,text)', 'owner_ack_consume(text,text,text,text,text,timestamptz)', 'owner_route_new_nonce()', 'owner_route_write_guard()'];
  for (const f of fns) {
    for (const r of ['anon', 'authenticated', 'admin_writer']) eq(q(`SELECT has_function_privilege('${r}','public.${f}','EXECUTE')`), 'f', `${r} ${f}`);
    eq(q(`SELECT has_function_privilege('service_role','public.${f}','EXECUTE')`), f.startsWith('owner_route_new') || f.includes('write_guard') ? 'f' : 't', f);
  }
  const e = qf(`SET ROLE anon; SELECT public.owner_route_take('${KEY('b')}','c','s','t','a','${HEAD}',60);`);
  ok(/permission denied/i.test(e), e);
  const e2 = qf(`SET ROLE authenticated; SELECT public.owner_ack_consume('${KEY('b')}','${hex('c')}','c','s','receipt-0001',now());`);
  ok(/permission denied/i.test(e2), e2);
});
await test('functions are SECURITY DEFINER with fixed schema-qualified search_path', () => {
  eq(q("SELECT count(*) FROM pg_proc WHERE proname IN ('owner_route_take','owner_route_record_send','owner_ack_consume') AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']"), '3');
  eq(q("SELECT count(*) FROM pg_proc WHERE proname LIKE 'owner_%' AND pronamespace='public'::regnamespace AND proconfig IS NULL"), '0');
});

let nonceA;
await test('take: first take reserves a passive ZURIEL row with null dispatch fields and an unpredictable nonce', () => {
  const r = take('1');
  eq(r.taken, true); ok(/^[0-9a-f]{64}$/.test(r.ack_nonce), 'nonce shape'); nonceA = r.ack_nonce;
  const row = j(q(`SELECT row_to_json(w) FROM public.work_log w WHERE task_key='OWNER_ROUTE:${KEY('1')}'`));
  eq([row.status, row.to_actor, row.dispatch_kind, row.dispatch_state], ['OWNER_ROUTE_RESERVED', 'ZURIEL', null, null]);
  ok(!JSON.stringify(row).includes(r.ack_nonce), 'plaintext nonce must not be stored');
  ok(row.dispatch_context.ack_nonce_sha256.length === 64, 'hash stored');
  ok(take('2').ack_nonce !== nonceA, 'distinct nonces');
});
await test('duplicate send key is refused atomically (no second row, no nonce)', () => {
  const r = take('1');
  eq([r.taken, r.reason, r.status, r.ack_nonce], [false, 'ROUTE_ALREADY_TAKEN', 'OWNER_ROUTE_RESERVED', undefined]);
  eq(q(`SELECT count(*) FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), '1');
});
await test('invalid keys/fields/ttl are refused without writing', () => {
  const n0 = q('SELECT count(*) FROM public.work_log');
  eq(j(q("SET ROLE service_role; SELECT public.owner_route_take('short','c','s','t','a','" + HEAD + "',60);")).reason, 'INVALID_ROUTE_KEY');
  eq(j(q(`SET ROLE service_role; SELECT public.owner_route_take('${KEY('e')}','c d','s','t','a','${HEAD}',60);`)).reason, 'INVALID_ROUTE_FIELDS');
  eq(take('e', { ttl: 5 }).reason, 'INVALID_TTL');
  eq(take('e', { head: 'zz' }).reason, 'INVALID_ROUTE_FIELDS');
  eq(q('SELECT count(*) FROM public.work_log'), n0);
});
await test('parallel racing reservations: exactly one winner under 4 concurrent connections', async () => {
  const sql = (hold) => `SET ROLE service_role; BEGIN; SELECT public.owner_route_take('${KEY('3')}','claim-1','session_1','TASK_X','appr-1','${HEAD}',900); ${hold ? 'SELECT pg_sleep(1.5);' : ''} COMMIT;`;
  const rs = await Promise.all([runAsync(sql(true)), new Promise((r) => setTimeout(r, 200)).then(() => runAsync(sql(false))), runAsync(sql(false)), runAsync(sql(false))]);
  for (const r of rs) ok(r.code === 0, r.err);
  const outs = rs.map((r) => j(lastLine(r.out)));
  eq(outs.filter((o) => o.taken).length, 1, JSON.stringify(outs));
  eq(outs.filter((o) => o.reason === 'ROUTE_ALREADY_TAKEN').length, 3);
  ok(rs[1].ms >= 1000, 'losers must block on the unique index until winner commits (' + rs[1].ms + 'ms)');
  eq(q(`SELECT count(*) FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('3')}'`), '1');
});
await test('concurrent ack-nonce collision across different route keys: DB refuses the second, returns reason', async () => {
  const C = hex('c');
  q(`CREATE OR REPLACE FUNCTION public.owner_route_new_nonce() RETURNS text LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $$ SELECT '${C}'::text $$;`);
  try {
    const sql = (k, hold) => `SET ROLE service_role; BEGIN; SELECT public.owner_route_take('${KEY(k)}','claim-1','session_1','TASK_X','appr-1','${HEAD}',900); ${hold ? 'SELECT pg_sleep(1.2);' : ''} COMMIT;`;
    const rs = await Promise.all([runAsync(sql('4', true)), new Promise((r) => setTimeout(r, 200)).then(() => runAsync(sql('5', false)))]);
    const outs = rs.map((r) => { ok(r.code === 0, r.err); return j(lastLine(r.out)); });
    eq(outs.filter((o) => o.taken).length, 1, JSON.stringify(outs));
    eq(outs.find((o) => !o.taken).reason, 'ACK_NONCE_COLLISION');
    eq(q("SELECT count(*) FROM public.work_log WHERE task_key IN ('OWNER_ROUTE:" + KEY('4') + "','OWNER_ROUTE:" + KEY('5') + "')"), '1');
    const e = qf(`INSERT INTO public.work_log(topic,status,task_key,to_actor,dispatch_context) VALUES ('x','OWNER_ROUTE_RESERVED','OWNER_ROUTE:${KEY('6')}','ZURIEL','{"ack_nonce_sha256":"dup"}'),('x','OWNER_ROUTE_RESERVED','OWNER_ROUTE:${KEY('7')}','ZURIEL','{"ack_nonce_sha256":"dup"}');`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED|duplicate key/.test(e), e);
  } finally { applyDraft(); }
  ok(take('8').ack_nonce !== C, 'real nonce generator restored');
});
await test('forged route rows: service_role / authenticated / admin-policy writer cannot insert, update or delete', () => {
  for (const role of ['service_role', 'admin_writer']) {
    const ins = qf(`SET ROLE ${role}; INSERT INTO public.work_log(topic,status,task_key,to_actor) VALUES ('forged','OWNER_ROUTE_CONSUMED','OWNER_ROUTE:${KEY('f')}','ZURIEL');`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED/.test(ins), role + ins);
    const upd = qf(`SET ROLE ${role}; UPDATE public.work_log SET status='OWNER_ROUTE_CONSUMED' WHERE task_key='OWNER_ROUTE:${KEY('1')}';`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED/.test(upd), role + upd);
    const upd2 = qf(`SET ROLE ${role}; UPDATE public.work_log SET dispatch_context = dispatch_context || '{"receipt_id":"forged-0001"}' WHERE task_key='OWNER_ROUTE:${KEY('1')}';`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED/.test(upd2), role + upd2);
    const del = qf(`SET ROLE ${role}; DELETE FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}';`);
    ok(/OWNER_ROUTE_ROW_DELETE_DENIED/.test(del), role + del);
    // squatting: turn an ordinary row into a route row or build one via topic
    const sq = qf(`SET ROLE ${role}; UPDATE public.work_log SET task_key='OWNER_ROUTE:${KEY('9')}' WHERE task_key='LEGACY_PASSIVE_1';`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED/.test(sq), role + sq);
    const sq2 = qf(`SET ROLE ${role}; INSERT INTO public.work_log(topic) VALUES ('task=OWNER_ROUTE:${KEY('9')}');`);
    ok(/OWNER_ROUTE_ROW_WRITE_DENIED/.test(sq2), role + sq2);
  }
  ok(/permission denied/.test(qf(`SET ROLE authenticated; UPDATE public.work_log SET status='OWNER_ROUTE_CONSUMED' WHERE task_key='OWNER_ROUTE:${KEY('1')}';`)), 'authenticated has no write privilege');
  eq(q(`SELECT status FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'OWNER_ROUTE_RESERVED');
});
await test('route-row invariants hold even for the owner role (status/to_actor/dispatch fields)', () => {
  for (const bad of [`status='QUEUED'`, `to_actor='CLAUDE'`, `dispatch_kind='ASSIGNMENT'`, `dispatch_state='QUEUED'`, `task_key='OWNER_ROUTE:${KEY('d')}'`]) {
    const e = qf(`UPDATE public.work_log SET ${bad} WHERE task_key='OWNER_ROUTE:${KEY('1')}';`);
    ok(/OWNER_ROUTE_ROW_INVARIANT/.test(e), bad + ' -> ' + e);
  }
  ok(/OWNER_ROUTE_ROW_DELETE_DENIED/.test(qf(`DELETE FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}';`)), 'delete denied for owner too');
});
await test('ACK before SENT is refused and leaves the route RESERVED', () => {
  const r = consume('1', nonceA, { receipt: 'receipt-early' });
  eq([r.consumed, r.reason], [false, 'ACK_BEFORE_SENT']);
  eq(q(`SELECT status FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'OWNER_ROUTE_RESERVED');
});
await test('send outcome: ACCEPTED needs a provider ref; invalid outcome refused; only RESERVED -> SENT once', () => {
  eq(send('1', 'MAYBE').reason, 'INVALID_OUTCOME');
  eq(send('1', 'ACCEPTED', null).reason, 'PROVIDER_REF_REQUIRED');
  eq(send('0', 'ACCEPTED').reason, 'ROUTE_NOT_FOUND');
  eq(send('1', 'ACCEPTED').status, 'OWNER_ROUTE_SENT');
  const again = send('1', 'ACCEPTED', 'prov-ref-2');
  eq([again.recorded, again.reason], [false, 'SEND_ALREADY_RECORDED']);
  eq(send('1', 'DENIED').recorded, false);
  eq(q(`SELECT dispatch_context->>'provider_ref' FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'prov-ref-1');
});
await test('DENIED and UNKNOWN sends are terminal: no retry, no later SENT, no ACK', () => {
  const kd = take('d'); eq(send('d', 'DENIED').status, 'OWNER_ROUTE_DENIED');
  const ku = take('e'); eq(send('e', 'UNKNOWN').status, 'OWNER_ROUTE_SEND_UNKNOWN');
  for (const [k, n] of [['d', kd], ['e', ku]]) {
    eq(send(k, 'ACCEPTED').recorded, false);
    eq(take(k).reason, 'ROUTE_ALREADY_TAKEN');
    const c = consume(k, n.ack_nonce, { receipt: 'receipt-' + k + '0001' });
    eq([c.consumed, c.reason], [false, 'ROUTE_NOT_SENT']);
  }
});
await test('wrong claim / wrong session / wrong nonce / bad shape are refused without state change', () => {
  const before = q(`SELECT md5(w::text) FROM public.work_log w WHERE task_key='OWNER_ROUTE:${KEY('1')}'`);
  eq(consume('1', nonceA, { claim: 'claim-2', receipt: 'receipt-w1' }).reason, 'WRONG_CLAIM');
  eq(consume('1', nonceA, { session: 'session_2', receipt: 'receipt-w2' }).reason, 'WRONG_SESSION');
  eq(consume('1', hex('9'), { receipt: 'receipt-w3' }).reason, 'WRONG_NONCE');
  eq(consume('1', 'not-a-nonce', { receipt: 'receipt-w4' }).reason, 'INVALID_ACK_FIELDS');
  eq(consume('7', nonceA, { receipt: 'receipt-w5' }).reason, 'ROUTE_NOT_FOUND');
  eq(q(`SELECT md5(w::text) FROM public.work_log w WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), before);
});
await test('forged receipt shapes and out-of-window receipt times are refused', () => {
  eq(consume('1', nonceA, { receipt: '' }).reason, 'INVALID_ACK_FIELDS');
  eq(consume('1', nonceA, { receipt: "x'; DROP TABLE work_log;--" }).reason, 'INVALID_ACK_FIELDS');
  eq(consume('1', nonceA, { receipt: 'short' }).reason, 'INVALID_ACK_FIELDS');
  eq(consume('1', nonceA, { receipt: 'receipt-old1', at: '2000-01-01T00:00:00Z' }).reason, 'RECEIPT_OUT_OF_WINDOW');
  eq(consume('1', nonceA, { receipt: 'receipt-fut1', at: '2999-01-01T00:00:00Z' }).reason, 'RECEIPT_OUT_OF_WINDOW');
  eq(q(`SELECT status FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'OWNER_ROUTE_SENT');
});
await test('valid ACK consumes exactly once; replay by same or second consumer is rejected', () => {
  const r = consume('1', nonceA, { receipt: 'receipt-good1' });
  eq(r.consumed, true);
  eq(q(`SELECT status FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'OWNER_ROUTE_CONSUMED');
  eq(consume('1', nonceA, { receipt: 'receipt-good1' }).reason, 'ACK_REPLAY_REJECTED');
  eq(consume('1', nonceA, { receipt: 'receipt-other2', session: 'session_9', claim: 'claim-9' }).reason, 'ACK_REPLAY_REJECTED');
  eq(q(`SELECT dispatch_context->>'receipt_id' FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('1')}'`), 'receipt-good1');
});
await test('one external receipt id cannot consume two different routes (receipt uniqueness)', () => {
  const t = take('a'); eq(send('a', 'ACCEPTED', 'prov-ref-a').recorded, true);
  const r = consume('a', t.ack_nonce, { receipt: 'receipt-good1' });
  eq([r.consumed, r.reason], [false, 'RECEIPT_REPLAY']);
  eq(q(`SELECT status FROM public.work_log WHERE task_key='OWNER_ROUTE:${KEY('a')}'`), 'OWNER_ROUTE_SENT');
  eq(consume('a', t.ack_nonce, { receipt: 'receipt-good2' }).consumed, true);
});
await test('concurrent ACK consume race: exactly one of 3 simultaneous consumers wins', async () => {
  const t = take('b'); send('b', 'ACCEPTED', 'prov-ref-b');
  const sql = (rcpt, hold) => `SET ROLE service_role; BEGIN; SELECT public.owner_ack_consume('${KEY('b')}','${t.ack_nonce}','claim-1','session_1','${rcpt}',now()); ${hold ? 'SELECT pg_sleep(1.2);' : ''} COMMIT;`;
  const rs = await Promise.all([runAsync(sql('receipt-race1', true)), new Promise((r) => setTimeout(r, 200)).then(() => runAsync(sql('receipt-race2', false))), new Promise((r) => setTimeout(r, 250)).then(() => runAsync(sql('receipt-race3', false)))]);
  const outs = rs.map((r) => { ok(r.code === 0, r.err); return j(lastLine(r.out)); });
  eq(outs.filter((o) => o.consumed).length, 1, JSON.stringify(outs));
  eq(outs.filter((o) => o.reason === 'ACK_REPLAY_REJECTED').length, 2);
});
await test('expiry: expired SENT cannot be consumed; late ACCEPTED on RESERVED is refused', () => {
  const t = take('c', { ttl: 30 }); eq(send('c', 'ACCEPTED', 'prov-ref-c').recorded, true);
  q(`UPDATE public.work_log SET dispatch_context = dispatch_context || jsonb_build_object('expires_at', to_char((clock_timestamp()-interval '1 second') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) WHERE task_key='OWNER_ROUTE:${KEY('c')}'`);
  const r = consume('c', t.ack_nonce, { receipt: 'receipt-exp01' });
  eq([r.consumed, r.reason], [false, 'REQUEST_EXPIRED']);
  take('f', { ttl: 30 });
  q(`UPDATE public.work_log SET dispatch_context = dispatch_context || jsonb_build_object('expires_at', to_char((clock_timestamp()-interval '1 second') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) WHERE task_key='OWNER_ROUTE:${KEY('f')}'`);
  eq(send('f', 'ACCEPTED', 'prov-ref-f').reason, 'SEND_AFTER_EXPIRY');
  eq(send('f', 'DENIED').recorded, true);
});
await test('v17: GPT-directed rows still rerouted; route lifecycle triggers zero dispatch emits', () => {
  eq(q('SELECT count(*) FROM public.emit_probe'), '0', 'probe must be empty after full route lifecycle');
  eq(q("SELECT count(*) FROM public.work_log WHERE left(task_key,12)='OWNER_ROUTE:' AND (dispatch_kind IS NOT NULL OR dispatch_state IS NOT NULL OR to_actor<>'ZURIEL' OR dispatch_next_attempt_at IS NOT NULL OR dispatch_lease_owner IS NOT NULL)"), '0');
  eq(q("SELECT count(*) FROM public.work_log WHERE left(task_key,12)='OWNER_ROUTE:' AND status ~* '(QUEUED|ASSIGNED|ACK_REQUIRED|WAITING_SPECIALIST|READ_ONLY|SPECIALIST|CHALLENGE|CLAIMED_WRITE|WRITE_SCOPE|ASSIGNED_WRITE)'"), '0');
  // GPT RESULT_WAKE insert -> rerouted to ZURIEL, no GPT wake
  q("INSERT INTO public.work_log(topic,status,task_key,to_actor,dispatch_kind,assignment_mode) VALUES ('wake','QUEUED','GPT_CTRL','GPT','RESULT_WAKE','READ_ONLY')");
  eq(q("SELECT to_actor||'/'||coalesce(dispatch_kind,'null')||'/'||coalesce(dispatch_state,'null') FROM public.work_log WHERE task_key='GPT_CTRL'"), 'ZURIEL/null/null');
  eq(q('SELECT count(*) FROM public.emit_probe'), '0');
  // positive control: harness probe is live (CLAUDE assignment does emit)
  q("INSERT INTO public.work_log(topic,status,task_key,to_actor,assignment_mode) VALUES ('ctrl','QUEUED','CLAUDE_CTRL','CLAUDE','READ_ONLY')");
  eq(q('SELECT count(*) FROM public.emit_probe'), '1', 'positive control must fire');
});
await test('legacy passive WRITE claim row and non-route rows are untouched (no mass close / bypass)', () => {
  eq(q("SELECT md5(w::text) FROM public.work_log w WHERE task_key='LEGACY_PASSIVE_1'"), legacyBefore);
  eq(q("SELECT count(*) FROM public.work_log WHERE task_key='LEGACY_PASSIVE_1' AND status='BEFORE_CLAIMED_WRITE' AND archived=false"), '1');
  // ordinary rows remain writable by service_role (guard is scoped to route rows)
  q("SET ROLE service_role; UPDATE public.work_log SET open_threads='still writable' WHERE task_key='LEGACY_PASSIVE_1'");
});
await test('draft source has no secrets / tokens / PII-looking literals and no live-apply paths', () => {
  ok(!/(sk-[A-Za-z0-9]{10,}|eyJ[A-Za-z0-9_-]{20,}|password\s*=|secret\s*=|@[a-z0-9-]+\.(com|org|net))/i.test(draftSql), 'secret-like literal');
  ok(!/supabase\/migrations/.test(draftSql.replace(/^--.*$/gm, '')), 'no migration path in executable SQL');
  ok(/SCRATCH_ONLY_NOT_PRODUCTION/.test(draftSql), 'apply guard present');
});

console.log(`\nSUMMARY passed=${passed} failed=${failed} skipped=0 total=${passed + failed}  postgres=${spawnSync(join(bin, 'postgres'), ['--version'], { encoding: 'utf8' }).stdout.trim()}`);
process.exit(failed ? 1 : 0);
