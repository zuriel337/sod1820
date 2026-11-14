-- Rollback of 20261112130500_m0a_legacy_client_writes_close.sql: the exact grants and policies read from the live catalogue on 12.11.2026.
-- Revision 14.11.2026 (foundation package, after an independent review): the file runs as ONE transaction with a lock timeout, a statement timeout and its OWN search_path
-- (the text of policy expressions that the guard compares depends on it); it takes SHARE UPDATE EXCLUSIVE on the tables it changes BEFORE it reads the catalogue, so a
-- policy change made by another session (CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE, which conflicts with it) is either finished and seen by the guard or still
-- running (the file then fails on the lock timeout and changes nothing); and it carries a catalogue fingerprint guard. Locks: the policy DDL of this file waits for
-- running reads for at most the lock timeout (2s) and new reads queue behind it meanwhile; on a timeout nothing changes: STOP and inspect (pg_locks, pg_stat_activity), do not resend automatically.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;
lock table public.words, public.syncs, public.chat_messages, public.chiddush_submissions, public.metatron_beta_feedback, public.lab_notes, public.lab_messages in share update exclusive mode;

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 4990e840290b609119a46c31041ed18e). The state before the apply
-- (3200137f4b3fe33aa59f0d8436e27dee) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
create or replace function pg_temp.m0a_fp_s5() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'g|'||c.relname||'|'||r.rolname||'|'||p.priv as x from pg_class c cross join (values ('anon'),('authenticated')) r(rolname) cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv) where c.oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass]) and has_table_privilege(r.rolname, c.oid, p.priv)
    union all select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r collate "C") from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages')
    union all select 'cacl|'||c.relname||'.'||a.attname||'|'||a.attacl::text from pg_attribute a join pg_class c on c.oid = a.attrelid where a.attacl is not null and not a.attisdropped and c.oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass])
    union all select 'cm|'||c.relname||'|'||p.polname||'|'||obj_description(p.oid, 'pg_policy') from pg_policy p join pg_class c on c.oid = p.polrelid where obj_description(p.oid, 'pg_policy') is not null and c.oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass])
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s5();
begin
  if v = '3200137f4b3fe33aa59f0d8436e27dee' then
    raise exception 'M0-A step 5 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '4990e840290b609119a46c31041ed18e' then
    raise exception 'M0-A step 5 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 4990e840290b609119a46c31041ed18e): changed since; nothing changed, a human decision is needed', v;
  end if;
end $$;

grant insert on public.words, public.syncs, public.chat_messages, public.chiddush_submissions, public.metatron_beta_feedback to anon, authenticated;
grant insert, update, delete on public.lab_notes, public.lab_messages to anon, authenticated;
grant select on public.lab_notes, public.lab_messages to anon;

drop policy if exists lab_notes_admin_read on public.lab_notes;
drop policy if exists lab_messages_admin_read on public.lab_messages;
create policy lab_notes_read on public.lab_notes for select to public using (true);
create policy lab_messages_read on public.lab_messages for select to public using (true);

create policy anon_insert_words on public.words for insert to anon with check (true);
create policy anon_insert_syncs on public.syncs for insert to anon with check (true);
create policy chat_public_insert on public.chat_messages for insert to public
  with check (((length(content) >= 1) AND (length(content) <= 1000) AND ((length(author) >= 1) AND (length(author) <= 60))));
create policy chiddush_public_insert on public.chiddush_submissions for insert to anon, authenticated with check (true);
create policy beta_feedback_insert on public.metatron_beta_feedback for insert to anon, authenticated with check (true);
create policy lab_notes_insert on public.lab_notes for insert to public with check (true);
create policy lab_messages_insert on public.lab_messages for insert to public with check (true);

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint 3200137f4b3fe33aa59f0d8436e27dee).
do $$
declare v text := pg_temp.m0a_fp_s5();
begin
  if v <> '3200137f4b3fe33aa59f0d8436e27dee' then
    raise exception 'M0-A step 5 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected 3200137f4b3fe33aa59f0d8436e27dee)', v;
  end if;
end $$;

commit;
