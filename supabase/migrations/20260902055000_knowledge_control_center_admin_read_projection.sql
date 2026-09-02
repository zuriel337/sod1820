-- Knowledge Control Center v0 — admin-only READ projection.
-- Foundation law: no new store/tree/lifecycle state. This function only projects existing SSOT.
-- It intentionally avoids broad SELECT grants on legacy/private tables.

create or replace function public.admin_knowledge_control_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_is_admin boolean := false;
  v_result jsonb;
begin
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'admin only';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'chiddush_submissions', (select count(*) from public.chiddush_submissions),
      'research_contributions', (select count(*) from public.research_contributions),
      'research_objects', (select count(*) from public.research_objects),
      'topic_cards', (select count(*) from public.topic_cards),
      'convergences', (select count(*) from public.convergences),
      'relation_evidence', (select count(*) from public.relation_evidence),
      'nodes', (select count(*) from public.nodes where is_active is true),
      'edges', (select count(*) from public.edges)
    ),
    'reconciliation', jsonb_build_object(
      'topicMapped', (select count(*) from public.topic_cards where node_id is not null),
      'topicUnmapped', (select count(*) from public.topic_cards where node_id is null),
      'convergenceNodes', (select count(*) from public.nodes where type='convergence' and is_active is true),
      'convergenceEdges', (select count(*) from public.edges where relation_type='converges_on'),
      'relationWithDecision', (select count(*) from public.edges where relation_type='converges_on' and metadata ? 'decision_ledger_id'),
      'relationWithResearchObject', (select count(*) from public.edges where relation_type='converges_on' and metadata ? 'research_object_id'),
      'relationWithSource', (select count(*) from public.edges where relation_type='converges_on' and metadata ? 'source'),
      'legacyRelationEdges', (select count(*) from public.edges where relation_type='converges_on' and not (metadata ? 'decision_ledger_id')),
      'candidateRO', (select count(*) from public.research_objects where status='candidate'),
      'approvedRO', (select count(*) from public.research_objects where status='approved'),
      'canonicalRO', (select count(*) from public.research_objects where status='canonical')
    ),
    'recentRO', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select id, kind, status, statement, source, privacy_scope, engine_verified, promoted_node_id, created_at
        from public.research_objects
        order by created_at desc
        limit 12
      ) x
    ), '[]'::jsonb),
    'recentTopics', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select id, title, status, node_id, created_by, created_at
        from public.topic_cards
        order by created_at desc
        limit 12
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.admin_knowledge_control_snapshot() from public;
grant execute on function public.admin_knowledge_control_snapshot() to authenticated;

comment on function public.admin_knowledge_control_snapshot() is
'Admin-only read projection for Knowledge Control Center v0. Computes inventory/reconciliation from existing tables; creates no truth/governance state and performs no writes.';
