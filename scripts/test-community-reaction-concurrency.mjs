// Requires a fresh, disposable PostgreSQL cluster. The CI service is destroyed
// after the job. Local Docker use: REACTION_TEST_CONTAINER=sod1820-reaction-...
// with this checkout mounted read-only at /fixture. Never accepts a DB_URL/key.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const container = process.env.REACTION_TEST_CONTAINER;
if (container) {
  assert.match(container, /^sod1820-reaction-[a-z0-9-]+$/, 'Use the disposable reaction fixture container');
} else {
  assert(['localhost', '127.0.0.1', '::1'].includes(process.env.PGHOST), 'Only a local disposable PostgreSQL service is permitted');
  assert.equal(process.env.PGDATABASE, 'community_reaction_fixture', 'Use the disposable CI fixture database');
}
const command = container ? 'docker' : 'psql';
const args = [
  ...(container ? ['exec', '-i', '-w', '/fixture/tests/sql', container, 'psql', '-U', 'postgres', '-d', 'community_reaction_fixture'] : []),
  '-XAtq', '-v', 'ON_ERROR_STOP=1',
];
const children = new Set();

function session(sql) {
  const child = spawn(command, args, { cwd: `${root}tests/sql`, stdio: ['pipe', 'pipe', 'pipe'] });
  children.add(child);
  let stdout = '', stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => { children.delete(child); resolve({ code, stdout, stderr }); });
  });
  if (sql) child.stdin.end(sql);
  return { child, done, stdout: () => stdout };
}
async function query(sql) {
  const result = await session(sql).done;
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim();
}
async function waitFor(predicate, message) {
  const deadline = Date.now() + 10000;
  while (!(await predicate())) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
async function waitForLock(applicationName) {
  await waitFor(async () => (await query(`select count(*) from pg_stat_activity where application_name='${applicationName}' and wait_event_type='Lock';`)) === '1', `${applicationName} never reached the expected row lock`);
}
async function success(handle) {
  const result = await handle.done;
  assert.equal(result.code, 0, result.stderr);
  return result;
}

const target = '00000000-0000-0000-0000-000000000011';
const parent = '00000000-0000-0000-0000-000000000010';
const adminId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const fixture = readFileSync(`${root}tests/sql/community_reaction_public_visibility_v1.sql`, 'utf8');
const setup = fixture.split('create function public.expect_reaction_denial')[0];
const existingMigration = readFileSync(`${root}supabase/migrations/20260808_forum_admin_reaction_boosts.sql`, 'utf8');
// Execute the exact existing admin RPC, rather than an approximation of it.
const adminRPC = existingMigration.slice(existingMigration.indexOf('create or replace function public.admin_boost_reaction'));
assert(adminRPC.startsWith('create or replace function public.admin_boost_reaction'));

try {
  await query(`${setup}
create table public.users (id uuid primary key, role text);
insert into public.users values ('${adminId}', 'admin');
alter table public.research_contributions add column reaction_boosts jsonb not null default '{}'::jsonb;
${adminRPC}
commit;
`);

  // The admin RPC already locks target -> parent. Hold its target before the
  // call so a UUID-ordered candidate locks the parent first and causes 40P01.
  // The candidate must instead wait on the target, allowing the real admin
  // RPC to finish and both valid mutations to succeed without retry.
  const admin = session();
  admin.child.stdin.write(`begin;
set local statement_timeout='10s';
set local deadlock_timeout='100ms';
select id from public.research_contributions where id='${target}' for update;
select 'ADMIN_TARGET_LOCKED';
`);
  await waitFor(() => admin.stdout().includes('ADMIN_TARGET_LOCKED'), 'Admin did not lock its target');
  const toggle = session(`set application_name='reaction_admin_interaction';
begin; set local statement_timeout='10s'; set local role anon;
select public.toggle_contribution_reaction('${target}','👍','admin-race-guest');
commit;
`);
  await waitForLock('reaction_admin_interaction');
  admin.child.stdin.end(`select set_config('request.jwt.claim.sub','${adminId}',true);
set local role authenticated;
select public.admin_boost_reaction('${target}','👍',1);
commit;
`);
  await success(admin);
  await success(toggle);
  const both = JSON.parse(await query(`select jsonb_build_object('reactions',reactions,'boosts',reaction_boosts) from public.research_contributions where id='${target}';`));
  assert.deepEqual(both, { reactions: { likes: 8, '👍': ['v:admin-race-guest'] }, boosts: { '👍': 1 } });
  console.log('PASS: actual admin_boost_reaction and toggle both complete with compatible target -> parent locks');

  // A parent hide committed while the toggle waits must invalidate the
  // earlier ancestry snapshot and leave the target byte-for-byte unchanged.
  const before = await query(`select to_jsonb(rc) from public.research_contributions rc where id='${target}';`);
  const moderator = session();
  moderator.child.stdin.write(`begin; set local statement_timeout='10s';
update public.research_contributions set status='hidden' where id='${parent}';
select 'MODERATOR_PARENT_LOCKED';
`);
  await waitFor(() => moderator.stdout().includes('MODERATOR_PARENT_LOCKED'), 'Moderator did not lock the parent');
  const denied = session(`set application_name='reaction_moderation_race';
begin; set local statement_timeout='10s'; set local role anon;
select public.toggle_contribution_reaction('${target}','👍','moderation-race-guest');
commit;
`);
  await waitForLock('reaction_moderation_race');
  moderator.child.stdin.end('commit;\n');
  await success(moderator);
  const denial = await denied.done;
  assert.notEqual(denial.code, 0);
  assert.match(denial.stderr, /ERROR:\s+not found/);
  assert.equal(await query(`select to_jsonb(rc) from public.research_contributions rc where id='${target}';`), before);
  console.log('PASS: concurrent ancestor moderation denies the toggle without changing reactions, boosts or activity');

  await query(`update public.research_contributions set status='approved' where id='${parent}';
update public.research_contributions set reactions='{"likes":8}' where id='${target}';
`);
  await Promise.all(Array.from({ length: 5 }, (_, index) => success(session(`begin;
set local statement_timeout='10s'; set local role anon;
select public.toggle_contribution_reaction('${target}','👍','concurrent-${index}');
commit;
`))));
  const reactions = JSON.parse(await query(`select reactions from public.research_contributions where id='${target}';`));
  assert.equal(reactions.likes, 8);
  assert.equal(reactions['👍'].length, 5);
  assert.deepEqual(new Set(reactions['👍']), new Set(Array.from({ length: 5 }, (_, index) => `v:concurrent-${index}`)));
  assert.equal(await query(`select reaction_boosts->>'👍' from public.research_contributions where id='${target}';`), '1');
  console.log('PASS: five concurrent guest toggles preserve every identity, historical likes and independent admin boosts');
} finally {
  for (const child of children) child.kill('SIGTERM');
}
