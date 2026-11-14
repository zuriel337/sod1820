-- M0 DB foundations (package P1) PHASE-AWARE verification - READ-ONLY catalogue queries (no function is executed, nothing is written).
-- Revision 14.11.2026 (foundation package). The earlier version required every row to be true after EVERY step, which is wrong while later steps are
-- still unapplied (Codex review 14.11.2026, finding 1). Now every row belongs to ONE step and has a kind:
--   change   : true exactly when that step has been applied (and must stay false while it has not);
--   preserve : must be true in every phase (nothing a step does may break it).
-- Run on the canonical project (execute_sql) right after each apply step. Before running, edit the ONE line marked <== in the CTE `applied` so that it lists
-- the steps applied so far. The state read on 14.11.2026 (18:35 UTC) is: '1' and '9' applied (DEF-001b, Codex packet of PR #1339), all others not applied.
-- The query answers per row as_expected = true/false and ends with one VERDICT row: every row as_expected = true means the catalogue is exactly
-- "the applied steps are in force, the rest has not moved, nothing preserved was damaged". An applied step that shows false, or a step not listed
-- as applied that shows true (an accidental early or partial apply), makes the verdict false.
-- Rows named FP are the catalogue fingerprints proven on the isolated fixtures (the same text the apply files carry as their guard).
with applied(step) as (values ('1'), ('9')),   -- <== add '2', '4', '5', '6', '7', '8', '10' as each is applied
fn(sig, step) as (values
  ('public.fn_edge_grant_audit()', '2'), ('public.fn_rls_grant_audit()', '2'), ('public.check_security_spike()', '2'), ('public.snapshot_seo_wave(integer,integer)', '2'),
  ('public.fn_detect_patterns(integer,text)', '2'), ('public.fn_detect_pattern_contradictions()', '2'), ('public.fn_scan_reeval(text,text)', '2'),
  ('public.fn_outbox_bump(text)', '2'), ('public.fn_raziel_claim(text)', '2'), ('public.fn_raziel_claims_gc()', '2'), ('public.ai_quota_check(text,text,integer)', '2'),
  ('public.router_rate_check(uuid,integer)', '2'), ('public.wa_msg_count(uuid)', '4')),
checks(step, kind, name, ok) as (
  select step, 'change', 'A1 server-only: ' || sig,
    not has_function_privilege('anon', sig, 'EXECUTE') and not has_function_privilege('authenticated', sig, 'EXECUTE') and has_function_privilege('service_role', sig, 'EXECUTE') from fn
  union all select '2', 'preserve', 'A1b no unreviewed overload carries one of the twelve reviewed names (DEF-005 reviews signatures, not names): ' || p.oid::regprocedure::text, false
    from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('fn_edge_grant_audit','fn_rls_grant_audit','check_security_spike','snapshot_seo_wave','fn_detect_patterns','fn_detect_pattern_contradictions','fn_scan_reeval',
                        'fn_outbox_bump','fn_raziel_claim','fn_raziel_claims_gc','ai_quota_check','router_rate_check')
      and p.oid not in (select to_regprocedure('public.' || s)::oid from (values ('fn_edge_grant_audit()'), ('fn_rls_grant_audit()'), ('check_security_spike()'),
        ('snapshot_seo_wave(integer,integer)'), ('fn_detect_patterns(integer,text)'), ('fn_detect_pattern_contradictions()'), ('fn_scan_reeval(text,text)'),
        ('fn_outbox_bump(text)'), ('fn_raziel_claim(text)'), ('fn_raziel_claims_gc()'), ('ai_quota_check(text,text,integer)'), ('router_rate_check(uuid,integer)')) v(s)
        where to_regprocedure('public.' || s) is not null)
  union all select '2', 'change', 'A1c apply record intact (the definition is the one the apply recorded): ' || s.sig,
    coalesce(substring(obj_description(to_regprocedure(s.sig), 'pg_proc') from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64=') = md5(pg_get_functiondef(to_regprocedure(s.sig))), false)
    from (values ('public.fn_edge_grant_audit()'), ('public.fn_rls_grant_audit()'), ('public.check_security_spike()'), ('public.snapshot_seo_wave(integer,integer)'),
      ('public.fn_detect_patterns(integer,text)'), ('public.fn_detect_pattern_contradictions()'), ('public.fn_scan_reeval(text,text)'), ('public.fn_outbox_bump(text)'),
      ('public.fn_raziel_claim(text)'), ('public.fn_raziel_claims_gc()'), ('public.ai_quota_check(text,text,integer)'), ('public.router_rate_check(uuid,integer)')) s(sig)
  union all select '4', 'change', 'A2 admin guard admin_resolve_translit', md5(pg_get_functiondef('public.admin_resolve_translit(text,text,boolean)'::regprocedure)) = '29151b32c06ed3c36fab0211f243403b'
  union all select '4', 'change', 'A2 admin guard admin_ai_cost', md5(pg_get_functiondef('public.admin_ai_cost(integer)'::regprocedure)) = 'd33b0bfbaf9d1f39177333bef3024b9f'
  union all select '4', 'change', 'A3 link_visitor_identity no overwrite', md5(pg_get_functiondef('public.link_visitor_identity(text)'::regprocedure)) = '310dde303e978757604318a3f82a652a'
  union all select '4', 'preserve', 'A3 owner-rights callers intact (research_level_of executable by anon)', has_function_privilege('anon', 'public.research_level_of(uuid)', 'EXECUTE')
  union all select '4', 'change', 'A4 gematria_wall private rows hidden', exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gematria_wall'
    and policyname = 'wall public read' and qual like '%private%rd_is_admin%')
  union all select '5', 'change', 'A5 legacy: no client insert on ' || t, not has_table_privilege('anon', 'public.' || t, 'INSERT') and not has_table_privilege('authenticated', 'public.' || t, 'INSERT')
    from unnest(array['words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages']) t
  union all select '5', 'change', 'A5 legacy: lab_* not readable by anon', not has_table_privilege('anon', 'public.lab_notes', 'SELECT') and not has_table_privilege('anon', 'public.lab_messages', 'SELECT')
  union all select '5', 'preserve', 'A5 legacy: public reads kept (words, syncs, chat_messages)', has_table_privilege('anon', 'public.words', 'SELECT') and has_table_privilege('anon', 'public.syncs', 'SELECT')
    and has_table_privilege('anon', 'public.chat_messages', 'SELECT')
  union all select '5', 'preserve', 'A5 no row deleted (lab_notes rows > 0)', (select count(*) from public.lab_notes) > 0
  union all select '6', 'change', 'A6 dormant ALL policies are admin-only', not exists (select 1 from pg_policies where schemaname = 'public'
    and (tablename, policyname) in (('insights','authenticated write'),('word_aliases','word_aliases_auth_write'),('hint_sets','admin_all'),('hint_set_members','admin_all'),
      ('trails','admin_all'),('trail_members','admin_all'),('page_content','auth_write')) and qual not like '%rd_is_admin%')
  union all select '7', 'change', 'A8 add_contribution keyed by the platform client address', md5(pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure)) = '19759e2793b11c1f7ad0e095343ede42'
  union all select '10', 'change', 'A7 no cron job carries a query secret', not exists (select 1 from cron.job where command ~ '[?&]s=')
  union all select '10', 'preserve', 'A7 active cron jobs untouched (security_spike_hourly active)', exists (select 1 from cron.job where jobname = 'security_spike_hourly' and active)
  union all select '1', 'change', 'P push RPCs exist (DEF-001b step 1)', to_regprocedure('public.push_subscription_upsert_v1(text,text,text,text[],text,text)') is not null
    and to_regprocedure('public.push_subscription_delete_v1(text)') is not null
  union all select '1', 'change', 'P feedback admin-only read (DEF-001b step 1)', not has_table_privilege('anon', 'public.feedback', 'SELECT')
  union all select '1', 'change', 'P els_records visitor_id hidden from anon (DEF-001b step 1)', not has_column_privilege('anon', 'public.els_records', 'visitor_id', 'SELECT')
    and has_column_privilege('anon', 'public.els_records', 'title', 'SELECT')
  union all select '9', 'change', 'P push_subscriptions anon table access removed (DEF-001b step 2)', not has_table_privilege('anon', 'public.push_subscriptions', 'SELECT')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname like 'ps_anon_%')
  union all select '8', 'change', 'C gallery 120 MiB ceiling (PRODUCT DECISION D-1, not confirmed), no bucket MIME list, still public', exists (select 1 from storage.buckets where id = 'gallery' and file_size_limit = 125829120 and allowed_mime_types is null and public)
  union all select '8', 'change', 'C gallery client policies replaced (old public_upload / community_anon_upload gone)', not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('public_upload', 'community_anon_upload'))
    and (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('gallery_flat_image_upload_v1', 'gallery_client_upload_scoped_v1', 'gallery_admin_upload_v1')) = 3
  union all select '8', 'preserve', 'C gallery public read unchanged', exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_read' and cmd = 'SELECT')
  union all select '2', 'preserve', 'R public research readable by anon', has_table_privilege('anon', 'public.research_objects', 'SELECT')
),
fp(step, name, observed, before_fp, after_fp) as (
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
),
all_rows as (
  select c.step, c.kind, c.name, c.ok::text as observed,
    case when c.kind = 'preserve' or c.step in (select step from applied) then 'true' else 'false (not applied yet)' end as expected,
    case when c.kind = 'preserve' or c.step in (select step from applied) then coalesce(c.ok, false) else not coalesce(c.ok, false) end as as_expected
  from checks c
  union all
  select f.step, 'change', f.name, f.observed,
    case when f.step in (select step from applied) then f.after_fp else f.before_fp end,
    f.observed = case when f.step in (select step from applied) then f.after_fp else f.before_fp end
  from fp f
)
select * from (
  select 0 as o, 'VERDICT' as step, '' as kind, 'every row as expected for the steps listed in `applied`' as name, count(*) filter (where not as_expected)::text || ' row(s) not as expected' as observed, '0' as expected, bool_and(as_expected) as as_expected from all_rows
  union all select 1, step, kind, name, observed, expected, as_expected from all_rows
) v order by o, case when step ~ '^[0-9]+$' then step::int end, name;
