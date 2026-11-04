import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const prior = await readFile(new URL('../../doc37-alignment-20261102/mail/subscriber-purpose.proposal.sql', import.meta.url), 'utf8');
const sql = await readFile(new URL('./site-updates-purpose.sql', import.meta.url), 'utf8');
const checks = [];
for (const fixture of ['clean', 'existing']) {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE subscribers(id bigserial PRIMARY KEY,email text UNIQUE NOT NULL,source text DEFAULT 'site',active boolean DEFAULT true,unsubscribed_at timestamptz,created_at timestamptz DEFAULT now());
      ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY subscribers_public_insert ON subscribers FOR INSERT TO anon,authenticated WITH CHECK(true);
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT INSERT ON subscribers TO anon,authenticated; GRANT ALL ON subscribers TO service_role;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role;`);
    await db.exec(prior);
    if (fixture === 'existing') await db.exec(`INSERT INTO subscribers(email,source,active,unsubscribed_at,email_purposes,opening_updates_consented_at) VALUES
      ('general@example.invalid','site',true,null,array['general'],null),
      ('suppressed@example.invalid','site',false,'2026-11-01',array['general'],null),
      ('opening@example.invalid','2029-opening-parts',true,null,array['site-openings'],'2026-11-02');`);
    const snapshot = async () => (await db.query('SELECT id,email,source,active,unsubscribed_at,created_at,email_purposes,opening_updates_consented_at FROM subscribers ORDER BY id')).rows;
    const before = await snapshot();
    await db.exec(sql); await db.exec(sql);
    assert.deepEqual(await snapshot(), before);
    assert.equal((await db.query('SELECT count(*)::int n FROM subscribers WHERE site_updates_consented_at IS NOT NULL')).rows[0].n,0);
    checks.push(`${fixture}: twice-applied SQL preserves every existing row and historical consent; no consent invented`);
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await db.exec(`INSERT INTO subscribers(email) VALUES ('${role}-general@example.invalid')`);
        await assert.rejects(db.exec(`INSERT INTO subscribers(email,email_purposes,site_updates_consented_at) VALUES ('${role}-site@example.invalid',array['site-updates'],now())`),/row-level security/i);
        await assert.rejects(db.exec(`INSERT INTO subscribers(email,site_updates_consented_at) VALUES ('${role}-timestamp@example.invalid',now())`),/row-level security/i);
        await assert.rejects(db.exec(`UPDATE subscribers SET active=true`),/permission denied/i);
        await assert.rejects(db.exec('SELECT * FROM subscribers'),/permission denied/i);
      } finally { await db.exec('RESET ROLE'); }
      checks.push(`${fixture}: ${role} Legacy general insert unchanged; scoped consent/timestamp spoof, select and update denied`);
    }
    await assert.rejects(db.exec("INSERT INTO subscribers(email,email_purposes) VALUES ('missing@example.invalid',array['site-updates'])"),/check constraint/i);
    await assert.rejects(db.exec("INSERT INTO subscribers(email,email_purposes,site_updates_consented_at) VALUES ('unknown@example.invalid',array['other'],now())"),/check constraint/i);
    await db.exec(`SET ROLE service_role; INSERT INTO subscribers(email,source,email_purposes,site_updates_consented_at) VALUES ('site@example.invalid','2029-site-updates',array['site-updates'],now()); RESET ROLE;`);
    assert.equal((await db.query("SELECT count(*)::int n FROM subscribers WHERE email='site@example.invalid' AND email_purposes && array['general','site-openings']")).rows[0].n,0);
    checks.push(`${fixture}: server typed consent allowed; unknown/missing consent denied; general/opening cohorts excluded`);
    await db.exec("UPDATE subscribers SET active=false,unsubscribed_at=now() WHERE email='site@example.invalid'");
    assert.equal((await db.query("SELECT count(*)::int n FROM subscribers WHERE active AND unsubscribed_at IS NULL AND email_purposes @> array['site-updates']")).rows[0].n,0);
    checks.push(`${fixture}: unchanged global suppression excludes site-updates`);
    // Operational rollback restores the old Edge versions, retaining the additive
    // column/constraint and all consent evidence. Prove old inserts still work.
    await db.exec("INSERT INTO subscribers(email,email_purposes,opening_updates_consented_at) VALUES ('rollback-old@example.invalid',array['site-openings'],now())");
    assert.equal((await db.query("SELECT count(*)::int n FROM subscribers WHERE email='site@example.invalid' AND NOT active AND site_updates_consented_at IS NOT NULL")).rows[0].n,1);
    checks.push(`${fixture}: old Edge shapes remain compatible after non-destructive rollback; new consent retained`);
  } finally { await db.close(); }
}
const receipt = { environment: 'isolated PGlite PostgreSQL, synthetic data only', checks, passed: checks.length, failed: 0, liveWrites: 0, emailSent: false, migrationApplied: false };
console.log(JSON.stringify(receipt, null, 2));
if (process.env.SITE_UPDATES_RECEIPT) await writeFile(process.env.SITE_UPDATES_RECEIPT,JSON.stringify(receipt,null,2)+'\n');
