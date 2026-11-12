-- M0 post-apply verification - READ-ONLY catalogue queries (no function is executed, nothing is written).
-- Run on the canonical project right after each apply step (execute_sql). Every row must read ok = true.
-- It never calls a revoked function to "prove" the revoke: has_function_privilege answers that without side effects.
with fn(sig) as (values
  ('public.fn_edge_grant_audit()'), ('public.fn_rls_grant_audit()'), ('public.check_security_spike()'), ('public.snapshot_seo_wave(integer,integer)'),
  ('public.fn_detect_patterns(integer,text)'), ('public.fn_detect_pattern_contradictions()'), ('public.fn_scan_reeval(text,text)'),
  ('public.fn_outbox_bump(text)'), ('public.fn_raziel_claim(text)'), ('public.fn_raziel_claims_gc()'), ('public.ai_quota_check(text,text,integer)'),
  ('public.router_rate_check(uuid,integer)'), ('public.wa_msg_count(uuid)'))
select 'A1 server-only: ' || sig as check, not has_function_privilege('anon', sig, 'EXECUTE') and not has_function_privilege('authenticated', sig, 'EXECUTE')
  and has_function_privilege('service_role', sig, 'EXECUTE') as ok from fn
union all select 'A2 admin guard admin_resolve_translit', md5(pg_get_functiondef('public.admin_resolve_translit(text,text,boolean)'::regprocedure)) = '29151b32c06ed3c36fab0211f243403b'
union all select 'A2 admin guard admin_ai_cost', md5(pg_get_functiondef('public.admin_ai_cost(integer)'::regprocedure)) = 'd33b0bfbaf9d1f39177333bef3024b9f'
union all select 'A3 link_visitor_identity no overwrite', md5(pg_get_functiondef('public.link_visitor_identity(text)'::regprocedure)) = '310dde303e978757604318a3f82a652a'
union all select 'A8 add_contribution keyed by the platform client address', md5(pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure)) = '19759e2793b11c1f7ad0e095343ede42'
union all select 'A3 owner-rights callers intact (research_level_of executable by anon)', has_function_privilege('anon', 'public.research_level_of(uuid)', 'EXECUTE')
union all select 'A4 gematria_wall private hidden', exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gematria_wall'
  and policyname = 'wall public read' and qual like '%private%rd_is_admin%')
union all select 'A5 legacy: no client insert on ' || t, not has_table_privilege('anon', 'public.' || t, 'INSERT') and not has_table_privilege('authenticated', 'public.' || t, 'INSERT')
  from unnest(array['words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages']) t
union all select 'A5 legacy: lab_* not readable by anon', not has_table_privilege('anon', 'public.lab_notes', 'SELECT') and not has_table_privilege('anon', 'public.lab_messages', 'SELECT')
union all select 'A5 legacy: public reads kept (words, syncs, chat_messages)', has_table_privilege('anon', 'public.words', 'SELECT') and has_table_privilege('anon', 'public.syncs', 'SELECT')
  and has_table_privilege('anon', 'public.chat_messages', 'SELECT')
union all select 'A5 no row deleted (lab_notes rows > 0)', (select count(*) from public.lab_notes) > 0
union all select 'A6 dormant ALL policies are admin-only', not exists (select 1 from pg_policies where schemaname = 'public'
  and (tablename, policyname) in (('insights','authenticated write'),('word_aliases','word_aliases_auth_write'),('hint_sets','admin_all'),('hint_set_members','admin_all'),
    ('trails','admin_all'),('trail_members','admin_all'),('page_content','auth_write')) and qual not like '%rd_is_admin%')
union all select 'A7 no cron job carries a query secret', not exists (select 1 from cron.job where command ~ '[?&]s=')
union all select 'A7 active cron jobs untouched (security_spike_hourly active)', exists (select 1 from cron.job where jobname = 'security_spike_hourly' and active)
union all select 'P push RPCs exist (DEF-001b step 1)', to_regprocedure('public.push_subscription_upsert_v1(text,text,text,text[],text,text)') is not null
  and to_regprocedure('public.push_subscription_delete_v1(text)') is not null
union all select 'P feedback admin-only read (DEF-001b step 1)', not has_table_privilege('anon', 'public.feedback', 'SELECT')
union all select 'P els_records visitor_id hidden from anon (DEF-001b step 1)', not has_column_privilege('anon', 'public.els_records', 'visitor_id', 'SELECT')
  and has_column_privilege('anon', 'public.els_records', 'title', 'SELECT')
union all select 'P push_subscriptions anon table access removed (DEF-001b step 2)', not has_table_privilege('anon', 'public.push_subscriptions', 'SELECT')
  and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname like 'ps_anon_%')
union all select 'B ai_quota_check refuses a missing identity (M0-B SQL)', position('missing_identity' in pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure)) > 0
union all select 'C gallery 120 MiB ceiling, no bucket MIME list, still public', exists (select 1 from storage.buckets where id = 'gallery' and file_size_limit = 125829120 and allowed_mime_types is null and public)
union all select 'C gallery client policies replaced (old public_upload / community_anon_upload gone)', not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('public_upload', 'community_anon_upload'))
  and (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('gallery_flat_image_upload_v1', 'gallery_client_upload_scoped_v1', 'gallery_admin_upload_v1')) = 3
union all select 'C gallery public read unchanged', exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_read' and cmd = 'SELECT')
union all select 'R public research readable by anon', has_table_privilege('anon', 'public.research_objects', 'SELECT')
union all select 'D contributor view admits public candidates (status kept)', position($a$'candidate'::text$a$ in pg_get_viewdef('public.world_contributor_research_v1'::regclass, true)) > 0
  and has_table_privilege('anon', 'public.world_contributor_research_v1', 'SELECT')
order by 1;
