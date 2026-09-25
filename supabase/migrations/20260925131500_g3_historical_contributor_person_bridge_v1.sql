-- G3 Person Foundation — materialize reviewed historical Contributor/OpenWeb history
-- into the existing canonical persons + identity_edges spine.
--
-- Branch-only candidate. No live apply in this commit.
--
-- EXTEND_EXISTING:
--   * no new Person/identity table, graph, store, kind or ranking system
--   * reuses persons + identity_edges(kind='legacy_seed')
--   * never infers identity by display name or unverified email
--   * never calls link_identity()/resolve_person() internally (they may mint a new device Person)
--   * never mutates contributors.merged_into
--   * source IDs come only from contributions already attributed to the canonical Contributor
--
-- Security:
--   * authenticated + rd_is_admin() only
--   * no client-selected target Person in V1
--   * account-linked Contributor must already have exactly one account-bound Person; this RPC
--     does not create an account Person, avoiding the inherited account create race
--   * unclaimed historical Contributor may create one historical Person under advisory lock
--   * any namespaced legacy/source edge already owned by another Person aborts the transaction
--
-- Provenance:
--   * original OpenWeb/source rows and contribution_links remain untouched
--   * historical first/last timestamps are projected into identity_edges/persons
--   * decision_ledger records the admin actor, resulting Person and exact materialized edges
--   * no raw email is copied into edge metadata

create or replace function public.admin_person_materialize_contributor_history_v1(
  p_contributor_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_contributor_source text;
  v_contributor_created_at timestamptz;
  v_merged_into text;

  v_person uuid;
  v_person_created boolean := false;
  v_account_person_count integer := 0;
  v_contribution_count integer := 0;

  v_first_seen timestamptz;
  v_last_seen timestamptz;
  v_source_ids text[] := array[]::text[];
  v_source_id text;
  v_source_first timestamptz;
  v_source_last timestamptz;

  v_contributor_sod text := 'historical:contributor:' || p_contributor_id::text;
  v_contributor_legacy text := 'contributor:' || p_contributor_id::text;
  v_source_sod text;
  v_source_legacy text;

  v_conflicts integer := 0;
  v_edge_id uuid;
  v_edges jsonb := '[]'::jsonb;
  v_edge_count integer := 0;
begin
  if v_actor is null or not public.rd_is_admin() then
    raise exception 'admin required';
  end if;

  if p_contributor_id is null then
    raise exception 'p_contributor_id required';
  end if;

  -- One in-flight materialization decision per canonical Contributor.
  perform pg_advisory_xact_lock(
    hashtextextended('person_contributor:' || p_contributor_id::text, 1820)
  );

  select c.user_id, c.source, c.created_at, c.merged_into
    into v_user_id, v_contributor_source, v_contributor_created_at, v_merged_into
    from public.contributors c
   where c.id = p_contributor_id;

  if not found then
    raise exception 'contributor not found';
  end if;

  if nullif(btrim(coalesce(v_merged_into, '')), '') is not null then
    raise exception 'contributor is marked merged_into; resolve canonical contributor before materialization';
  end if;

  select count(*)
    into v_contribution_count
    from public.research_contributions rc
   where rc.author_contributor_id = p_contributor_id;

  if v_contribution_count < 1 then
    raise exception 'contributor has no currently-attributed contributions; resolve canonical contributor after reconciliation';
  end if;

  -- Historical bounds come first from exact OpenWeb message provenance, then from
  -- contribution timestamps, finally from the Contributor row creation timestamp.
  select min(s.created_at), max(s.created_at)
    into v_first_seen, v_last_seen
    from public.research_contributions rc
    join public.contribution_links cl
      on cl.from_contribution_id = rc.id
     and cl.target_type = 'openweb_message'
    join public.g3_openweb_import_stage s
      on s.message_id = cl.target_id
   where rc.author_contributor_id = p_contributor_id;

  if v_first_seen is null or v_last_seen is null then
    select
      coalesce(v_first_seen, min(rc.created_at)),
      coalesce(v_last_seen, max(rc.created_at))
      into v_first_seen, v_last_seen
      from public.research_contributions rc
     where rc.author_contributor_id = p_contributor_id;
  end if;

  v_first_seen := coalesce(v_first_seen, v_contributor_created_at, now());
  v_last_seen := coalesce(v_last_seen, v_first_seen);

  select coalesce(array_agg(distinct cl.target_id order by cl.target_id), array[]::text[])
    into v_source_ids
    from public.research_contributions rc
    join public.contribution_links cl
      on cl.from_contribution_id = rc.id
     and cl.target_type = 'openweb_user'
   where rc.author_contributor_id = p_contributor_id
     and cl.target_id is not null
     and btrim(cl.target_id) <> '';

  -- Serialize ownership decisions for every currently-attributed OpenWeb source.
  -- v_source_ids is deterministically sorted by array_agg(... order by target_id),
  -- so overlapping admin calls acquire locks in the same order and avoid deadlocks.
  foreach v_source_id in array v_source_ids
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('person_openweb_source:' || v_source_id, 1820)
    );
  end loop;

  if v_user_id is not null then
    -- Serialize this bridge against other bridge calls for the same account. V1 still
    -- refuses to create an account Person; normal account/login ownership remains separate.
    perform pg_advisory_xact_lock(
      hashtextextended('person_account:' || v_user_id::text, 1820)
    );

    select count(*)
      into v_account_person_count
      from public.persons p
     where p.account_user_id = v_user_id;

    if v_account_person_count <> 1 then
      raise exception
        'account-linked contributor requires exactly one existing account Person; found %',
        v_account_person_count;
    end if;

    select p.person_id
      into v_person
      from public.persons p
     where p.account_user_id = v_user_id
     order by p.created_at, p.person_id
     limit 1;
  else
    select e.person_id
      into v_person
      from public.identity_edges e
     where e.kind = 'legacy_seed'
       and e.legacy_id = v_contributor_legacy
     order by e.first_seen, e.person_id
     limit 1;

    if v_person is null then
      insert into public.persons (
        first_seen,
        last_seen,
        first_source,
        first_app_context,
        primary_channel
      )
      values (
        v_first_seen,
        v_last_seen,
        'historical_contributor',
        'people_2029',
        coalesce(nullif(v_contributor_source, ''), 'historical')
      )
      returning person_id into v_person;

      v_person_created := true;
    end if;
  end if;

  -- Fail closed on either legacy-id or namespaced sod-id ownership conflicts.
  select count(*)
    into v_conflicts
    from public.identity_edges e
   where e.person_id <> v_person
     and (
       (e.kind = 'legacy_seed' and e.legacy_id = v_contributor_legacy)
       or e.sod_id = v_contributor_sod
     );

  if v_conflicts > 0 then
    raise exception 'historical contributor identity already belongs to another Person';
  end if;

  select count(*)
    into v_conflicts
    from public.identity_edges e
    join unnest(v_source_ids) sid(source_id)
      on (
        (e.kind = 'legacy_seed' and e.legacy_id = 'openweb_user:' || sid.source_id)
        or e.sod_id = 'historical:openweb:' || sid.source_id
      )
   where e.person_id <> v_person;

  if v_conflicts > 0 then
    raise exception 'one or more OpenWeb source identities already belong to another Person';
  end if;

  -- Keep the Person lifetime envelope honest when attaching older reviewed history.
  update public.persons p
     set first_seen = case
           when p.first_seen is null then v_first_seen
           else least(p.first_seen, v_first_seen)
         end,
         last_seen = case
           when p.last_seen is null then v_last_seen
           else greatest(p.last_seen, v_last_seen)
         end
   where p.person_id = v_person;

  insert into public.identity_edges as ie (
    sod_id,
    person_id,
    kind,
    legacy_id,
    confidence,
    first_seen,
    last_seen,
    meta
  )
  values (
    v_contributor_sod,
    v_person,
    'legacy_seed',
    v_contributor_legacy,
    100,
    v_first_seen,
    v_last_seen,
    jsonb_build_object(
      'provider', 'contributors',
      'contributor_id', p_contributor_id,
      'materialized_by', v_actor,
      'human_gate', true,
      'contract', 'admin_person_materialize_contributor_history_v1'
    )
  )
  on conflict (sod_id, person_id, legacy_id)
    where kind = 'legacy_seed' and legacy_id is not null
  do update
    set first_seen = least(ie.first_seen, excluded.first_seen),
        last_seen = greatest(ie.last_seen, excluded.last_seen),
        meta = coalesce(ie.meta, '{}'::jsonb) || excluded.meta
  returning id into v_edge_id;

  v_edges := v_edges || jsonb_build_array(
    jsonb_build_object(
      'edge_id', v_edge_id,
      'kind', 'contributor',
      'legacy_id', v_contributor_legacy
    )
  );
  v_edge_count := v_edge_count + 1;

  foreach v_source_id in array v_source_ids
  loop
    v_source_sod := 'historical:openweb:' || v_source_id;
    v_source_legacy := 'openweb_user:' || v_source_id;

    select min(s.created_at), max(s.created_at)
      into v_source_first, v_source_last
      from public.research_contributions rc
      join public.contribution_links clu
        on clu.from_contribution_id = rc.id
       and clu.target_type = 'openweb_user'
       and clu.target_id = v_source_id
      join public.contribution_links clm
        on clm.from_contribution_id = rc.id
       and clm.target_type = 'openweb_message'
      join public.g3_openweb_import_stage s
        on s.message_id = clm.target_id
       and s.user_id = v_source_id
     where rc.author_contributor_id = p_contributor_id;

    v_source_first := coalesce(v_source_first, v_first_seen);
    v_source_last := coalesce(v_source_last, v_last_seen);

    insert into public.identity_edges as ie (
      sod_id,
      person_id,
      kind,
      legacy_id,
      confidence,
      first_seen,
      last_seen,
      meta
    )
    values (
      v_source_sod,
      v_person,
      'legacy_seed',
      v_source_legacy,
      100,
      v_source_first,
      v_source_last,
      jsonb_build_object(
        'provider', 'openweb_import',
        'source_id', v_source_id,
        'contributor_id', p_contributor_id,
        'materialized_by', v_actor,
        'human_gate', true,
        'contract', 'admin_person_materialize_contributor_history_v1'
      )
    )
    on conflict (sod_id, person_id, legacy_id)
      where kind = 'legacy_seed' and legacy_id is not null
    do update
      set first_seen = least(ie.first_seen, excluded.first_seen),
          last_seen = greatest(ie.last_seen, excluded.last_seen),
          meta = coalesce(ie.meta, '{}'::jsonb) || excluded.meta
    returning id into v_edge_id;

    v_edges := v_edges || jsonb_build_array(
      jsonb_build_object(
        'edge_id', v_edge_id,
        'kind', 'openweb_user',
        'source_id', v_source_id,
        'legacy_id', v_source_legacy
      )
    );
    v_edge_count := v_edge_count + 1;
  end loop;

  insert into public.decision_ledger (
    decision_type,
    subject_type,
    subject_ref,
    candidate,
    sources,
    domain,
    created_by_agent,
    evidence,
    rules_version,
    human_decision,
    human_reason,
    decided_by,
    result_ref,
    provenance,
    status,
    created_at,
    updated_at
  )
  values (
    'historical_identity_materialization',
    'contributor',
    p_contributor_id::text,
    jsonb_build_object(
      'person_id', v_person,
      'contributor_id', p_contributor_id
    ),
    jsonb_build_object(
      'source_ids', to_jsonb(v_source_ids),
      'source_count', cardinality(v_source_ids)
    ),
    'person_identity',
    'admin_person_materialize_contributor_history_v1',
    jsonb_build_object(
      'person_created', v_person_created,
      'first_seen', v_first_seen,
      'last_seen', v_last_seen,
      'edges', v_edges
    ),
    jsonb_build_object(
      'person_foundation_contract_law', 6,
      'identity_architecture_law', 1,
      'inter_agent_coordination_law', 13
    ),
    'modify',
    coalesce(
      nullif(btrim(p_reason), ''),
      'Admin Human-Gate materialized reviewed historical Contributor identity into the canonical Person spine.'
    ),
    v_actor::text,
    jsonb_build_object(
      'person_id', v_person,
      'contributor_id', p_contributor_id,
      'edge_count', v_edge_count,
      'edges', v_edges
    ),
    jsonb_build_object(
      'person_created', v_person_created,
      'source_rows_deleted', false,
      'contribution_rows_mutated', false,
      'contributors_merged_into_mutated', false,
      'rollback', 'Remove only edge IDs recorded in result_ref after Human-Gate review. Do not auto-delete Person; separately verify it has no account/history dependencies.'
    ),
    'applied',
    now(),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'person_id', v_person,
    'person_created', v_person_created,
    'contributor_id', p_contributor_id,
    'source_count', cardinality(v_source_ids),
    'edge_count', v_edge_count,
    'edges', v_edges
  );
end
$function$;

revoke all on function public.admin_person_materialize_contributor_history_v1(uuid,text)
  from public, anon;
grant execute on function public.admin_person_materialize_contributor_history_v1(uuid,text)
  to authenticated;

comment on function public.admin_person_materialize_contributor_history_v1(uuid,text) is
  'Admin/Human-Gate bridge from an already-reviewed canonical Contributor and its currently-attributed OpenWeb source identities into the existing persons/identity_edges spine. Never merges by name/email and never calls resolve_person/link_identity.';
