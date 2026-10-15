import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`);
const {PGlite}=require('@electric-sql/pglite');
test('fresh-guest fixture is the canonical SQL result for explicitly isolated storage',async()=>{
 const db=new PGlite();
 try{
  // Controlled local identity context and storage only. No live auth or visitor
  // records are read. The complete unmodified product SELECT function follows.
  await db.exec(`CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   CREATE TABLE public.notification_prefs(user_id uuid,visitor_id text,email text,topics text[] NOT NULL,channels text[] NOT NULL,intensity text NOT NULL,muted_until timestamptz);`);
  await db.exec(fs.readFileSync(new URL('../fixtures/ci-2029/source/notification-prefs-guest.sql',import.meta.url),'utf8'));
  const known='00000000-0000-4000-8000-000000000001',fresh='00000000-0000-4000-8000-000000000002';
  await db.query("INSERT INTO notification_prefs VALUES(NULL,$1,'fixture@example.invalid',ARRAY['fixture-topic'],ARRAY['browser'],'normal',NULL)",[known]);
  const read=async visitor=>(await db.query('SELECT public.notification_prefs_guest_get_v1($1) AS value',[visitor])).rows[0].value;
  assert.deepEqual(await read(known),{email:'fixture@example.invalid',topics:['fixture-topic'],channels:['browser'],intensity:'normal',muted_until:null});
  assert.equal(await read(fresh),null,'A new isolated visitor has no saved preference row; not a generic empty RPC fallback');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM notification_prefs')).rows[0].n,1,'Reads do not create visitor/preferences records');
  await assert.rejects(read('not-a-uuid'),/bad visitor identity/);
  await db.exec("SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000003'");
  await assert.rejects(read(fresh),/guest endpoint/);
 }finally{await db.close();}
});
