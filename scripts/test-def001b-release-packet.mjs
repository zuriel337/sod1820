// Runs only against the disposable DB already owned by run-def001-sql-test.sh.
// Accepts a local socket or a named local Docker container; never accepts a DSN.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, packetDir, buildPacket, fixtureSQL } from './def001b-release-packet.mjs';

const args = process.argv.slice(2);
let executable, prefix;
if (args[0] === '--container' && /^def001-sql-[0-9]+$/.test(args[1] || '')) {
  executable = 'docker';
  prefix = ['--host=unix:///var/run/docker.sock', 'exec', '-i', args[1], 'psql'];
} else if (args[0] === '--socket' && path.isAbsolute(args[1] || '') && /^\d+$/.test(args[2] || '')) {
  executable = 'psql'; prefix = ['-h', args[1], '-p', args[2]];
} else throw new Error('Only the disposable runner container or a local Unix socket is accepted');
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('PG') || ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'].includes(k)) delete env[k];
function query(db, sql, expectFailure = false, marker = '') {
  const result = spawnSync(executable, [...prefix, '-X', '-qAt', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1'], { cwd: root, env, input: sql, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (expectFailure) {
    assert.notEqual(result.status, 0, 'expected SQL refusal');
    assert.ok(result.stderr.includes(marker), `wrong refusal, expected ${marker}: ${result.stderr}`);
  } else assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const files = buildPacket();
for (const [name, content] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, packetDir, name), 'utf8'), content, `generated file drift: ${name}`);
const hashes = JSON.parse(fs.readFileSync(path.join(root, packetDir, 'phase-hashes.json'), 'utf8'));
const catalogue = fs.readFileSync(path.join(root, packetDir, 'catalogue.sql'), 'utf8').trim().replace(/;$/, '');
const fingerprint = db => query(db, `select md5(s.snapshot::text) from (${catalogue}) s;`);
let count = 0;
function scenario(name, fn) {
  const db = `def001b_packet_${process.pid}_${++count}`;
  query('postgres', `create database ${db};`);
  try {
    query(db, fixtureSQL());
    assert.equal(fingerprint(db), hashes.before, 'fixture differs from reviewed live baseline');
    fn(db);
    console.log(`PASS ${count}: ${name}`);
  } finally { query('postgres', `drop database ${db};`); }
}
function refusal(db, file, marker, sql = files[file]) {
  const before = fingerprint(db);
  query(db, sql, true, marker);
  assert.equal(fingerprint(db), before, 'refusal must preserve the entire checked catalogue');
}
const prepare = db => query(db, files['01-prepare.sql']);
const lockdown = db => query(db, files['02-lockdown.sql']);
const rollback = db => query(db, files['rollback.sql']);

scenario('prepare, guest/member RPCs, lockdown, exact rollback, no data loss', db => {
  prepare(db); assert.equal(fingerprint(db), hashes.prepared);
  query(db, `begin; set local role anon;
    select public.push_subscription_upsert_v1('https://push.example.invalid/new','K','A',array['topic'],null,'00000000-0000-4000-8000-000000000002');
    select public.push_subscription_upsert_v1('https://push.example.invalid/new','K2','A2',array['topic'],null,'00000000-0000-4000-8000-000000000002'); commit;`);
  assert.equal(query(db, "select count(*)||':'||min(p256dh) from public.push_subscriptions where endpoint='https://push.example.invalid/new'"), '1:K2');
  query(db, `begin; set local role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
    select public.push_subscription_upsert_v1('https://push.example.invalid/member','M','M',null,null,null); commit;`);
  assert.equal(query(db,"select user_id::text from public.push_subscriptions where endpoint='https://push.example.invalid/member'"),'11111111-1111-4111-8111-111111111111');
  lockdown(db); assert.equal(fingerprint(db), hashes.locked);
  query(db, 'begin; set local role anon; select * from public.push_subscriptions;', true, 'permission denied');
  query(db, `begin; set local role anon;
    select public.push_subscription_delete_v1('https://push.example.invalid/member');
    select public.push_subscription_delete_v1('https://push.example.invalid/new');
    select public.push_subscription_upsert_v1('https://push.example.invalid/new-after','K','A',null,null,null);
    select public.push_subscription_delete_v1('https://push.example.invalid/new-after'); commit;`);
  assert.equal(query(db,"select count(*) from public.push_subscriptions where endpoint='https://push.example.invalid/member'"),'1');
  rollback(db); assert.equal(fingerprint(db), hashes.before);
  assert.equal(query(db,"select has_table_privilege('anon','public.push_subscriptions','MAINTAIN')"),'t');
  assert.equal(query(db,'select count(*) from public.feedback'),'1');
  assert.equal(query(db,'select count(*) from public.els_records'),'1');
  assert.equal(query(db,'select count(*) from public.push_subscriptions'),'2');
});
scenario('rollback after preparation alone restores exact baseline', db => { prepare(db); rollback(db); assert.equal(fingerprint(db), hashes.before); });
scenario('lockdown before preparation refuses', db => refusal(db,'02-lockdown.sql','lockdown precondition'));
scenario('prepare repeated refuses without change', db => { prepare(db); refusal(db,'01-prepare.sql','prepare precondition'); });
scenario('lockdown repeated refuses without change', db => { prepare(db); lockdown(db); refusal(db,'02-lockdown.sql','lockdown precondition'); });
scenario('rollback before application refuses', db => refusal(db,'rollback.sql','rollback precondition'));

for (const [name, drift] of [
  ['ACL', 'grant insert on public.feedback to anon'],
  ['owner', 'alter table public.feedback owner to authenticated'],
  ['RLS disabled', 'alter table public.feedback disable row level security'],
  ['policy', 'alter policy feedback_public_read on public.feedback using(false)'],
  ['new column', 'alter table public.els_records add column unreviewed text'],
  ['column default', "alter table public.els_records alter column visibility set default 'private'"],
  ['column grant', 'grant select(visitor_id) on public.els_records to anon'],
  ['RPC name/overload', "create function public.push_subscription_delete_v1(integer) returns void language plpgsql as $$begin null; end$$"],
]) scenario(`prepare rejects ${name} drift`, db => { query(db,drift); refusal(db,'01-prepare.sql','prepare precondition'); });
scenario('prepare rejects missing unique endpoint index', db => { query(db,'alter table public.push_subscriptions drop constraint push_subscriptions_endpoint_key'); refusal(db,'01-prepare.sql','endpoint unique index missing'); });
for (const [name, drift] of [
  ['body', "create or replace function public.push_subscription_delete_v1(p_endpoint text) returns void language plpgsql security definer set search_path=public as $$begin null; end$$"],
  ['owner', 'alter function public.push_subscription_delete_v1(text) owner to authenticated'],
  ['security mode', 'alter function public.push_subscription_delete_v1(text) security invoker'],
  ['execute grant', 'revoke execute on function public.push_subscription_delete_v1(text) from authenticated'],
]) scenario(`rollback rejects RPC ${name} drift`, db => { prepare(db); query(db,drift); refusal(db,'rollback.sql','rollback precondition'); });
scenario('lockdown refuses drift introduced between steps', db => { prepare(db); query(db,'alter policy ps_anon_select on public.push_subscriptions using(false)'); refusal(db,'02-lockdown.sql','lockdown precondition'); });
scenario('late postcondition failure rolls back every prepare change', db => {
  const broken = files['01-prepare.sql'].replace(hashes.prepared,'00000000000000000000000000000000');
  refusal(db,'01-prepare.sql','prepare postcondition',broken);
});
scenario('rollback missing MAINTAIN is caught and remains atomic', db => {
  prepare(db); lockdown(db);
  const broken = files['rollback.sql'].replace('grant maintain on public.push_subscriptions to anon;','-- intentionally broken');
  refusal(db,'rollback.sql','rollback postcondition',broken);
});
scenario('precondition-removal mutation would wrongly accept an altered starting policy', db => {
  query(db,'alter policy feedback_public_read on public.feedback using(false)');
  const broken = files['01-prepare.sql'].replace(/do \$guard\$[\s\S]*?end \$guard\$;/,'-- intentionally removed precondition');
  assert.notEqual(broken,files['01-prepare.sql']);
  // The unchanged postcondition can pass after overwriting this drift. The earlier refusal test detects the mutation.
  query(db,broken); assert.equal(fingerprint(db), hashes.prepared);
});
console.log(`DEF001B release packet: ${count}/${count} PASS; baseline and both rollback paths verified; no live DB used.`);
