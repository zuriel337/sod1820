-- VIDEO_SEMANTIC_TREE_PROJECTOR_V1
-- EXTEND_EXISTING only: research_objects remains the single durable Research home.
-- This RPC admits ONE private/candidate representation-map row per video+transcript map_key.
-- It does not create Video nodes, graph edges, truth, approval, canonicalization or publication.

create or replace function public.research_video_semantic_map_save_v1(
  p_source_ref text,
  p_statement text,
  p_terms text[],
  p_meta jsonb,
  p_contributor text default 'SYSTEM:video-semantic-map'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), '');
  v_source_ref text := btrim(coalesce(p_source_ref, ''));
  v_statement text := left(btrim(coalesce(p_statement, '')), 2000);
  v_meta jsonb := case when jsonb_typeof(p_meta) = 'object' then p_meta else '{}'::jsonb end;
  v_map jsonb;
  v_map_key text;
  v_existing uuid;
  v_new uuid;
begin
  -- Internal worker boundary only. Human/admin clients use the ordinary Research Intake surfaces;
  -- service_role here is execution authority, NOT Human-Gate/canonicalization authority.
  if v_role <> 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'service_role_only');
  end if;

  if v_source_ref = '' or v_source_ref !~ '^video:' then
    return jsonb_build_object('ok', false, 'error', 'video_source_ref_required');
  end if;
  if v_statement = '' then
    return jsonb_build_object('ok', false, 'error', 'statement_required');
  end if;

  v_map := v_meta #> '{ext,video_semantic_map}';
  if jsonb_typeof(v_map) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'video_semantic_map_required');
  end if;
  v_map_key := btrim(coalesce(v_map->>'map_key', ''));
  if v_map_key = '' then
    return jsonb_build_object('ok', false, 'error', 'map_key_required');
  end if;
  if btrim(coalesce(v_map->>'media_url', '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'media_url_required');
  end if;
  if jsonb_typeof(v_map->'anchors') <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'anchors_array_required');
  end if;

  -- Same source + exact transcript/map key is idempotent even under concurrent workers.
  perform pg_advisory_xact_lock(hashtextextended(v_source_ref || E'\n' || v_map_key, 0));

  select id into v_existing
  from public.research_objects
  where source_ref = v_source_ref
    and meta #>> '{ext,video_semantic_map,map_key}' = v_map_key
  order by created_at
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('ok', true, 'already_existed', true, 'research_object_id', v_existing);
  end if;

  insert into public.research_objects(
    kind, statement, terms, value, relates, source, source_ref, contributor,
    confidence, engine_verified, engine_detail, status, privacy_scope, meta
  ) values (
    'observation',
    v_statement,
    coalesce((select array_agg(distinct left(btrim(x), 160))
              from unnest(coalesce(p_terms, '{}'::text[])) x
              where btrim(x) <> ''), '{}'::text[]),
    null,
    array[v_source_ref],
    'video_semantic_map',
    v_source_ref,
    nullif(btrim(coalesce(p_contributor, '')), ''),
    null,
    false,
    jsonb_build_object(
      'verification_state', 'not_tested',
      'statement_lang', nullif(btrim(coalesce(v_map->>'source_lang', '')), '')
    ),
    'candidate',
    'private',
    v_meta
      || jsonb_build_object(
           'layer', 'VIDEO_REPRESENTATION_MAP',
           'admission', jsonb_build_object(
             'actor_type', 'deterministic_worker',
             'admitted_at', now(),
             'governance_transition', false,
             'publication_transition', false
           )
         )
  )
  returning id into v_new;

  return jsonb_build_object('ok', true, 'already_existed', false, 'research_object_id', v_new);
end;
$$;

revoke all on function public.research_video_semantic_map_save_v1(text,text,text[],jsonb,text) from public;
revoke all on function public.research_video_semantic_map_save_v1(text,text,text[],jsonb,text) from anon;
revoke all on function public.research_video_semantic_map_save_v1(text,text,text[],jsonb,text) from authenticated;
grant execute on function public.research_video_semantic_map_save_v1(text,text,text[],jsonb,text) to service_role;

comment on function public.research_video_semantic_map_save_v1(text,text,text[],jsonb,text)
is 'VIDEO_SEMANTIC_TREE_PROJECTOR_V1: service-worker admission of one private candidate Representation Map into existing research_objects. Never approves/canonicalizes/publishes and creates no Video node/edge/store.';
