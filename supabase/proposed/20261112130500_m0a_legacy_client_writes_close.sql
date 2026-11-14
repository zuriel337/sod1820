-- M0-A · Legacy tables closed to client writes - PROPOSED (production DB change, needs explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-E / §6 item 5; owner decision 12.11.2026: "close all seven"; no row is deleted.
-- Evidence (12.11.2026, read-only): no 2029 code writes these tables. lab_notes / lab_messages are written and read only by the
-- service-role Edge functions lab-reflect and wa-mora (service_role bypasses RLS and keeps its grants). The single client helper
-- that wrote chat_messages (src/lib/supabase.js sendChatMessage) has no importer.
--
--   table                   before (client)                                   after
--   words                   anon/auth INSERT (true), public SELECT            SELECT unchanged; INSERT closed
--   syncs                   anon/auth INSERT (true), public SELECT            SELECT unchanged; INSERT closed
--   chat_messages           anon/auth INSERT (length checks), public SELECT   SELECT unchanged (0 rows); INSERT closed
--   chiddush_submissions    anon/auth INSERT (true), admin SELECT             admin SELECT unchanged; INSERT closed
--   metatron_beta_feedback  anon/auth INSERT (true), no SELECT                INSERT closed
--   lab_notes               anon/auth INSERT/UPDATE/DELETE grants, public SELECT    all client writes closed; SELECT admin only
--   lab_messages            anon/auth INSERT/UPDATE/DELETE grants, public SELECT    all client writes closed; SELECT admin only
-- The admin-checked UPDATE/DELETE policies on lab_* are kept as they are (admin-only, inert without a client grant).
-- Rollback: supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql. Test: tests/sql/m0a_db_permissions_v1.sql.
-- Revision 14.11.2026 (foundation package): the file runs as ONE transaction with lock and statement timeouts (it either applies completely or not at all) and, where the objects are policies or grants, with a catalogue fingerprint guard
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Catalogue guard: client grants, row level security and every policy of the seven Legacy tables must be exactly the live "before" state read on 14.11.2026 (fingerprint 3200137f4b3fe33aa59f0d8436e27dee),
-- or already the "after" state of this file (fingerprint 4990e840290b609119a46c31041ed18e: a re-run is then a no-op). Anything else stops the file before any change.
create or replace function pg_temp.m0a_fp_s5() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'g|'||c.relname||'|'||r.rolname||'|'||p.priv as x from pg_class c cross join (values ('anon'),('authenticated')) r(rolname) cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv)
      where c.oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass]) and has_table_privilege(r.rolname, c.oid, p.priv)
    union all select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages')
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s5();
begin
  if v not in ('3200137f4b3fe33aa59f0d8436e27dee', '4990e840290b609119a46c31041ed18e') then
    raise exception 'M0-A step 5: the catalogue is not the reviewed one (fingerprint %, expected 3200137f4b3fe33aa59f0d8436e27dee before or 4990e840290b609119a46c31041ed18e after); nothing changed', v;
  end if;
end $$;

revoke insert, update, delete on public.words, public.syncs, public.chat_messages, public.chiddush_submissions,
  public.metatron_beta_feedback, public.lab_notes, public.lab_messages from anon, authenticated;

drop policy if exists anon_insert_words on public.words;
drop policy if exists anon_insert_syncs on public.syncs;
drop policy if exists chat_public_insert on public.chat_messages;
drop policy if exists chiddush_public_insert on public.chiddush_submissions;
drop policy if exists beta_feedback_insert on public.metatron_beta_feedback;
drop policy if exists lab_notes_insert on public.lab_notes;
drop policy if exists lab_messages_insert on public.lab_messages;

-- lab_* reads: administrators only.
drop policy if exists lab_notes_read on public.lab_notes;
drop policy if exists lab_messages_read on public.lab_messages;
create policy lab_notes_admin_read on public.lab_notes for select to authenticated using ((select public.rd_is_admin()));
create policy lab_messages_admin_read on public.lab_messages for select to authenticated using ((select public.rd_is_admin()));
revoke select on public.lab_notes, public.lab_messages from anon;

-- Postcondition: the catalogue is exactly the "after" state proven on the isolated fixture.
do $$
declare v text := pg_temp.m0a_fp_s5();
begin
  if v <> '4990e840290b609119a46c31041ed18e' then
    raise exception 'M0-A step 5: the catalogue after the change is not the reviewed one (fingerprint %, expected 4990e840290b609119a46c31041ed18e)', v;
  end if;
end $$;

commit;
