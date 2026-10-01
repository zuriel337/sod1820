-- G3 Canonical Data Inventory projection V1 — read-only table-of-tables.
-- Owners: foundation_closure_protocol_law v7 + research_intake_foundation_contract_law v13.
-- EXTEND_EXISTING only: pg_catalog + docs/2029-data-placement-retention-crosswalk.md
-- + admin_retention_preview() classes + analytics_cache capacity snapshots (read only).
-- No persistent inventory table, no second registry, no writes, no cron, no purge.
-- Anything the crosswalk does not map stays explicit: owner_pointer/role/disposition = 'UNKNOWN'.
-- The embedded crosswalk VALUES list is a pointer mirror of the doc; live owners/DB win if it drifts.

create or replace function public.admin_canonical_data_inventory_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  with xw(obj, owner_pointer, placement_role, crosswalk_state, retention_class, retention_pointer, cutover_gate) as (
    values
    ('research_objects','research_intake_foundation_contract_law v13','ATOMIC_SHARED_RESEARCH_OS','KEEP_OWNER',null,null,'governed intake/identity rules'),
    ('research_object_revisions','research_intake_foundation_contract_law v13','ADDITIVE_RESEARCH_HISTORY','KEEP_OWNER',null,null,'revision lineage'),
    ('nodes','canonical Reality Graph owner','CANONICAL_REALITY_GRAPH','KEEP_OWNER',null,null,'qualified identity/relation promotion only'),
    ('edges','canonical Reality Graph owner','CANONICAL_REALITY_GRAPH','KEEP_OWNER',null,null,'qualified identity/relation promotion only'),
    ('persons','Person identity owner','PERSON_IDENTITY_FABRIC','KEEP_OWNER',null,null,'Person owner only'),
    ('identity_edges','Person identity owner','PERSON_IDENTITY_FABRIC','KEEP_OWNER',null,null,'Person owner only'),
    ('research_items','research_intake_foundation_contract_law v13','PERSONAL_WORKSPACE_STATE','KEEP_OWNER',null,null,'personal state only'),
    ('user_research','research_intake_foundation_contract_law v13','PERSONAL_WORKSPACE_STATE','KEEP_OWNER',null,null,'personal state only'),
    ('posts','Post owner','AUTHORED_PUBLICATION_SOURCE','KEEP_OWNER',null,null,'through Post owner'),
    ('post_revisions','Post owner','AUTHORED_PUBLICATION_SOURCE','KEEP_OWNER',null,null,'through Post owner'),
    ('gematria_words','Gematria owners','GEMATRIA_EXPRESSION_AUTHORITY','KEEP_OWNER',null,null,'Gematria owners only'),
    ('gematria_methods','Gematria owners','GEMATRIA_METHOD_AUTHORITY','KEEP_OWNER',null,null,'Gematria owners only'),
    ('research_contributions','research_intake_foundation_contract_law v13','CONTRIBUTION_INPUT_PIPELINE','KEEP_OWNER',null,null,'contribution input, never replacement Truth store'),
    ('channel_updates','source ingress owner','SOURCE_INGRESS_PROVENANCE','KEEP_SOURCE','ACTIVE_SOURCE','admin_retention_preview','source/runtime writes only'),
    ('gallery_images','media/source placement owner','MEDIA_REPRESENTATION_SOURCE','KEEP_SOURCE',null,null,'media/source placement only'),
    ('wa_bot_log','WhatsApp source ingress owner','SOURCE_INGRESS_PROVENANCE','KEEP_SOURCE / HYBRID OPERATIONAL','HUMAN_REVIEW','admin_retention_preview','raw interaction only'),
    ('wa_deep_queue','WhatsApp source ingress owner','OPERATIONAL_RUNTIME','COMPATIBILITY / HUMAN_REVIEW','HUMAN_REVIEW','admin_retention_preview','operational only; no new semantic authority'),
    ('wa_vip_inbox','WhatsApp source ingress owner','SOURCE_INGRESS_PROVENANCE','KEEP_SOURCE','PROVENANCE_PROTECTED','admin_retention_preview','source intake only'),
    ('wa_msg_ext','WhatsApp source ingress owner','OPERATIONAL_RUNTIME','OPERATIONAL_RUNTIME','BOUNDED_RUNTIME','admin_retention_preview','operational only'),
    ('wa_message_status','WhatsApp source ingress owner','OPERATIONAL_RUNTIME','OPERATIONAL_RUNTIME','BOUNDED_RUNTIME','admin_retention_preview','operational only'),
    ('contributor_content','UNKNOWN','LEGACY_CONTRIBUTOR_PRESENTATION','REVIEW_FOR_RETIREMENT',null,null,'no new 2029 semantic authority'),
    ('gematria_wall','UNKNOWN','UNRECONCILED_HIGH_VOLUME','NEEDS_ADJUDICATION',null,null,'do not expand until owner is resolved'),
    ('raw_gematria','UNKNOWN','UNRECONCILED_HISTORICAL_RAW','NEEDS_ADJUDICATION',null,null,'do not expand until owner is resolved'),
    ('visitor_events','traffic_intelligence_law v11','OPERATIONAL_RUNTIME','BOUNDED_RUNTIME_120D','BOUNDED_RUNTIME_120D','admin_retention_preview','ZURIEL Human Gate 2026-09-30'),
    ('site_visits','traffic_intelligence_law v11','OPERATIONAL_RUNTIME','BOUNDED_RUNTIME_120D','BOUNDED_RUNTIME_120D','admin_retention_preview','ZURIEL Human Gate 2026-09-30'),
    ('events','traffic_intelligence_law v11','OPERATIONAL_RUNTIME','BOUNDED_RUNTIME_120D','BOUNDED_RUNTIME_120D','admin_retention_preview','monthly partitions; ZURIEL Human Gate 2026-09-30'),
    ('work_log','Coordination Ledger (work_log law)','COORDINATION_PROVENANCE','KEEP_OWNER','PROVENANCE_PROTECTED','admin_retention_preview','KEEP_FOREVER; archived routing state only')
  ),
  rel as (
    select c.oid, c.relname::text as obj, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
           c.reltuples, c.relhasindex
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r','p','m','v','f')
      and not c.relispartition
  ),
  fn_src as (
    select p.proname, p.prosrc from pg_proc p where p.pronamespace = 'public'::regnamespace
  ),
  cap as (
    select payload->'relations' as rels, computed_at
    from public.analytics_cache
    where cache_kind = 'capacity_snapshot'
    order by computed_at desc
    limit 1
  ),
  cap7 as (
    select payload->'relations' as rels, computed_at
    from public.analytics_cache
    where cache_kind = 'capacity_snapshot'
      and computed_at between now()-interval '8 days' and now()-interval '6 days'
    order by abs(extract(epoch from (computed_at-(now()-interval '7 days'))))
    limit 1
  ),
  rows_ as (
    select
      r.obj,
      r.relkind,
      case r.relkind when 'r' then 'TABLE' when 'p' then 'PARTITIONED_TABLE' when 'm' then 'MATERIALIZED_VIEW' when 'v' then 'VIEW' else 'FOREIGN_TABLE' end as object_kind,
      coalesce(x.owner_pointer,'UNKNOWN') as owner_pointer,
      coalesce(x.placement_role,'UNKNOWN') as placement_role,
      coalesce(x.crosswalk_state,'UNMAPPED') as crosswalk_state,
      x.obj is not null as crosswalk_mapped,
      coalesce(x.retention_class,'UNKNOWN') as retention_class,
      coalesce(x.retention_pointer,'UNKNOWN') as retention_pointer,
      coalesce(x.cutover_gate,'UNKNOWN') as cutover_gate,
      case
        when x.obj is null then 'UNKNOWN'
        when x.crosswalk_state in ('NEEDS_ADJUDICATION','REVIEW_FOR_RETIREMENT') then 'HUMAN_REVIEW'
        else x.crosswalk_state
      end as disposition,
      case when r.relkind in ('r','p','m') then coalesce(nullif(r.reltuples,-1),0)::bigint else null end as est_rows,
      case when r.relkind in ('r','p','m') then pg_total_relation_size(r.oid) else null end as total_bytes,
      case when r.relkind in ('r','p','m') then pg_indexes_size(r.oid) else null end as index_bytes,
      case when r.relkind in ('r','p','m') then (select count(*) from pg_index i where i.indrelid = r.oid) else null end as index_count,
      r.relrowsecurity as rls_enabled,
      r.relforcerowsecurity as rls_forced,
      (select count(*) from pg_policy pol where pol.polrelid = r.oid) as policy_count,
      has_table_privilege('anon', r.oid, 'select') as anon_select,
      has_table_privilege('authenticated', r.oid, 'select') as authenticated_select,
      has_table_privilege('anon', r.oid, 'insert,update,delete') as anon_write,
      has_table_privilege('authenticated', r.oid, 'insert,update,delete') as authenticated_write,
      (select count(distinct d.refobjid) from pg_rewrite rw
         join pg_depend d on d.objid = rw.oid and d.classid = 'pg_rewrite'::regclass
        where d.refobjid = r.oid and rw.ev_class <> r.oid) as dependent_views,
      (select count(*) from pg_constraint k where k.contype = 'f' and k.confrelid = r.oid) as inbound_fks,
      (select count(*) from pg_trigger t where t.tgrelid = r.oid and not t.tgisinternal) as triggers,
      (select count(*) from fn_src f where f.prosrc ~ ('\m' || r.obj || '\M')) as function_source_mentions,
      (select to_jsonb(s) from (
         select s.last_analyze, s.last_autoanalyze, s.last_vacuum, s.last_autovacuum, s.n_live_tup
         from pg_stat_user_tables s where s.relid = r.oid) s) as stats,
      (select (rels->>r.obj)::bigint from cap) as bytes_latest_snapshot,
      (select (rels->>r.obj)::bigint from cap7) as bytes_7d_snapshot
    from rel r
    left join xw x on x.obj = r.obj
  ),
  final as (
    select
      'public'::text as schema_name,
      obj as object_name,
      object_kind,
      owner_pointer,
      placement_role,
      crosswalk_state,
      crosswalk_mapped,
      retention_class,
      retention_pointer,
      cutover_gate,
      disposition,
      jsonb_build_object(
        'reader_writer', 'UNKNOWN_UNLESS_EVIDENCE_PRESENT',
        'dependent_views', dependent_views,
        'inbound_fks', inbound_fks,
        'triggers', triggers,
        'function_source_text_mentions', function_source_mentions,
        'note', 'catalog/function-source mentions are evidence of possible readers/writers, not proof; app-code readers are not catalog-visible'
      ) as reader_writer_evidence,
      jsonb_build_object('count', index_count, 'bytes', index_bytes) as indexes,
      jsonb_build_object(
        'rls_enabled', rls_enabled, 'rls_forced', rls_forced, 'policy_count', policy_count,
        'anon_select', anon_select, 'authenticated_select', authenticated_select,
        'anon_write', anon_write, 'authenticated_write', authenticated_write,
        'rls_open_to_clients', (not rls_enabled) and (anon_select or authenticated_select or anon_write or authenticated_write)
      ) as security_posture,
      jsonb_build_object(
        'est_rows', est_rows,
        'total_bytes', total_bytes,
        'bytes_latest_snapshot', bytes_latest_snapshot,
        'bytes_7d_snapshot', bytes_7d_snapshot,
        'growth_bytes_7d', case when bytes_latest_snapshot is not null and bytes_7d_snapshot is not null
                                then bytes_latest_snapshot - bytes_7d_snapshot end,
        'basis', 'pg_class.reltuples estimate + pg_total_relation_size; growth from existing analytics_cache capacity_snapshot only when two snapshots exist else null'
      ) as volume,
      (object_kind in ('TABLE','PARTITIONED_TABLE','MATERIALIZED_VIEW')
        and not crosswalk_mapped
        and (coalesce(est_rows,0) >= 1000 or coalesce(total_bytes,0) >= 1048576)) as material_unmapped,
      jsonb_build_object(
        'verified_at', now(),
        'last_analyze', greatest((stats->>'last_analyze')::timestamptz, (stats->>'last_autoanalyze')::timestamptz)
      ) as last_verification
    from rows_
  )
  select jsonb_build_object(
    'contract', 'G3_CANONICAL_DATA_INVENTORY_PROJECTION_V1',
    'mode', 'READ_ONLY_PROJECTION_NO_PERSISTENT_STORE',
    'owners', 'foundation_closure_protocol_law v7 + research_intake_foundation_contract_law v13',
    'crosswalk_pointer', 'docs/2029-data-placement-retention-crosswalk.md',
    'generated_at', now(),
    'summary', jsonb_build_object(
      'objects', count(*),
      'tables', count(*) filter (where object_kind in ('TABLE','PARTITIONED_TABLE')),
      'views', count(*) filter (where object_kind in ('VIEW','MATERIALIZED_VIEW')),
      'crosswalk_mapped', count(*) filter (where crosswalk_mapped),
      'unmapped', count(*) filter (where not crosswalk_mapped),
      'material_unmapped', count(*) filter (where material_unmapped),
      'rls_open_to_clients', count(*) filter (where (security_posture->>'rls_open_to_clients')::boolean)
    ),
    'material_unmapped', coalesce(jsonb_agg(object_name order by object_name) filter (where material_unmapped), '[]'::jsonb),
    'objects', coalesce(jsonb_agg(to_jsonb(final) order by object_name), '[]'::jsonb)
  )
  into v_result
  from final;

  return v_result;
end;
$function$;

revoke all on function public.admin_canonical_data_inventory_v1() from public, anon, authenticated;
grant execute on function public.admin_canonical_data_inventory_v1() to authenticated, service_role;

comment on function public.admin_canonical_data_inventory_v1() is
  'G3 Canonical Data Inventory: read-only projection over pg_catalog + crosswalk pointers. Admin/service_role only. No store.';
