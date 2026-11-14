-- M0 DB foundations (package P1): PRE-APPLY catalogue fingerprints - READ-ONLY (nothing is executed or written).
-- Run on the canonical project immediately BEFORE the apply of step 4, 5, 6 or 8 and compare with this table. The apply files carry the same guard
-- themselves (they refuse before any change on any other state); this query lets the operator see the value and the match beforehand.
--   fingerprint = md5 over a canonical text rendering (sorted, collation C) of exactly the objects the step changes: effective grants, row level security flags
--   and every policy (name, command, permissive, roles, USING, WITH CHECK), plus for step 8 the settings of the bucket gallery.
-- Values: BEFORE = read on the live project 14.11.2026 (PostgreSQL 17.6) and equal to the isolated fixtures of the SQL tests (PostgreSQL 16 and 17);
--         AFTER  = produced by the apply on those fixtures. matches_before = true means the step may be applied; matches_after = true means it is already applied.
with fp(step, name, observed, before_fp, after_fp) as (
  select '4', 'FP step 4 tail (wa_msg_count privileges, gematria_wall policy)', (select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'x|wa_msg_count|'||r||'|'||has_function_privilege(r, 'public.wa_msg_count(uuid)'::regprocedure, 'EXECUTE')::text as x from unnest(array['anon','authenticated','service_role']) r
    union all select 'pub|wa_msg_count|'||exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')::text from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'p|gematria_wall|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename='gematria_wall'
    union all select 'rls|gematria_wall|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid='public.gematria_wall'::regclass
  ) q), '0eb07c1da74babeaf438250b700054fc', '00a5e44d3412c197b2f76983523a4e01'
  union all select '5', 'FP step 5 (grants, row security and policies of the seven Legacy tables)', (select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'g|'||c.relname||'|'||r.rolname||'|'||p.priv as x from pg_class c cross join (values ('anon'),('authenticated')) r(rolname) cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv)
      where c.oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass]) and has_table_privilege(r.rolname, c.oid, p.priv)
    union all select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid = any(array['public.words'::regclass,'public.syncs'::regclass,'public.chat_messages'::regclass,'public.chiddush_submissions'::regclass,'public.metatron_beta_feedback'::regclass,'public.lab_notes'::regclass,'public.lab_messages'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages')
  ) q), '3200137f4b3fe33aa59f0d8436e27dee', '4990e840290b609119a46c31041ed18e'
  union all select '6', 'FP step 6 (row security and policies of the seven dormant-policy tables)', (select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text as x from pg_class where oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content')
  ) q), '4408d4349d306b19e2b6dade0e273e78', '80bd7ea3853d215d069542f1a252a318'
  union all select '8', 'FP step 8 (every policy on storage.objects, the settings of the bucket gallery)', (select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'p|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') as x from pg_policies where schemaname='storage' and tablename='objects'
    union all select 'b|'||id||'|'||public::text||'|'||coalesce(file_size_limit::text,'-')||'|'||coalesce(allowed_mime_types::text,'-') from storage.buckets where id='gallery'
    union all select 'rls|objects|'||relrowsecurity::text from pg_class where oid='storage.objects'::regclass
  ) q), 'fc57c5ec4289358741cd622b02d39556', '9fbf59431d86a0c4453d1e31302b0c66'
)
select step, name, observed, before_fp, after_fp, observed = before_fp as matches_before, observed = after_fp as matches_after
from fp order by step::int;
