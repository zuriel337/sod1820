import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const sql = await readFile(new URL('./subscriber-purpose.proposal.sql', import.meta.url), 'utf8');
const checks = [];
let version;
for (const fixture of ['clean', 'existing']) {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE TABLE public.subscribers (id bigserial primary key, email text not null, name text, source text default 'site', active boolean default true, created_at timestamptz default now(), acquisition jsonb, unsubscribed_at timestamptz, token text default md5(random()::text));
      CREATE UNIQUE INDEX subscribers_email_uniq ON public.subscribers (lower(email));
      ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY subscribers_public_insert ON public.subscribers FOR INSERT TO anon,authenticated WITH CHECK(true);
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT INSERT ON public.subscribers TO anon,authenticated;
      GRANT ALL ON public.subscribers TO service_role;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role;
    `);
    version = (await db.query('select version() as version')).rows[0].version;
    if (fixture === 'existing') await db.exec(`INSERT INTO subscribers(email,source,active,unsubscribed_at) VALUES ('general@example.invalid','site',true,null),('suppressed@example.invalid','legacy',false,'2026-10-01'),('mailpoet@example.invalid','mailpoet',true,null);`);
    const snapshot = async () => (await db.query('select id,email,source,active,unsubscribed_at,token,acquisition,created_at from subscribers order by id')).rows;
    const before = await snapshot();
    await db.exec(sql); await db.exec(sql);
    assert.deepEqual(await snapshot(), before); checks.push(`${fixture}: twice-applied proposal preserves all existing subscriber fields`);
    assert.equal((await db.query("select count(*)::int as n from pg_constraint where conname='subscribers_email_purposes_valid'")).rows[0].n,1); checks.push(`${fixture}: idempotent constraint`);
    if (fixture === 'existing') {
      assert.equal((await db.query("select count(*)::int as n from subscribers where email_purposes=array['general'] and opening_updates_consented_at is null")).rows[0].n,3); checks.push('existing: legacy purpose semantics preserved; no opening consent invented');
    }
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await db.exec(`INSERT INTO subscribers(email) VALUES ('${role}-general@example.invalid')`);
        await assert.rejects(db.exec(`INSERT INTO subscribers(email,email_purposes,opening_updates_consented_at) VALUES ('${role}-spoof@example.invalid',array['site-openings'],now())`), /row-level security/i);
        await assert.rejects(db.exec(`UPDATE subscribers SET active=true`), /permission denied/i);
        checks.push(`${fixture}: ${role} legacy insert allowed; opening envelope and update denied by actual SQL roles/RLS`);
      } finally { await db.exec('RESET ROLE'); }
    }
    await db.exec('SET ROLE service_role');
    try { await db.exec("INSERT INTO subscribers(email,source,email_purposes,opening_updates_consented_at) VALUES ('opening@example.invalid','2029-opening-parts',array['site-openings'],now())"); }
    finally { await db.exec('RESET ROLE'); }
    assert.equal((await db.query("select count(*)::int as n from subscribers where email='opening@example.invalid' and email_purposes @> array['general']")).rows[0].n,0); checks.push(`${fixture}: existing server role inserts opening-only; general selector excludes`);
    await assert.rejects(db.exec("INSERT INTO subscribers(email,email_purposes) VALUES ('invalid@example.invalid',array['site-openings'])"), /check constraint/i); checks.push(`${fixture}: missing opening consent time denied`);
    await db.exec("UPDATE subscribers SET active=false,unsubscribed_at=now() WHERE email='opening@example.invalid'");
    assert.equal((await db.query("select count(*)::int as n from subscribers where active and email_purposes @> array['site-openings']")).rows[0].n,0); checks.push(`${fixture}: unchanged global unsubscribe removes opening recipients`);
    const count = (await db.query('select count(*)::int as n from subscribers')).rows[0].n;
    await db.exec("BEGIN; INSERT INTO subscribers(email) VALUES ('rollback@example.invalid'); ROLLBACK;");
    assert.equal((await db.query('select count(*)::int as n from subscribers')).rows[0].n,count); checks.push(`${fixture}: transaction rollback preserves consent and existing rows`);
  } finally { await db.close(); }
}
const receipt = { environment:'isolated in-memory PGlite PostgreSQL; synthetic data only', package:'@electric-sql/pglite@0.5.14', version, checks, passed:checks.length, failed:0, liveDatabaseTouched:false, emailSent:false, productionAcceptance:false };
console.log(JSON.stringify(receipt,null,2));
if (process.env.MAIL_REPLAY_RECEIPT) await writeFile(process.env.MAIL_REPLAY_RECEIPT,JSON.stringify(receipt,null,2)+'\n');
