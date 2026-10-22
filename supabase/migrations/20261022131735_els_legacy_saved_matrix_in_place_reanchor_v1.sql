-- Legacy saved ELS records predate complete canonical identity. Repair one opened record
-- in place only after its newly supplied primary occurrence passes the existing canonical
-- publication truth gate. No table, RLS policy, role or engine is introduced.
create or replace function public.reanchor_els_matrix_v1(
  p_id uuid,
  p_scope text,
  p_skip integer,
  p_direction text,
  p_start_index integer,
  p_positions jsonb default null,
  p_image_url text default null,
  p_description text default null,
  p_engine_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_gate text;
  v_scope text := lower(coalesce(nullif(btrim(p_scope), ''), 'torah'));
  v_corpus_id text;
  v_term_norm text;
  r public.els_records;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;

  select * into r
  from public.els_records
  where id = p_id
  for update;
  if not found then raise exception 'not found'; end if;

  v_admin := exists(select 1 from public.users u where u.id = v_uid and u.role = 'admin');
  if not (v_admin or (r.owner_user_id is not null and r.owner_user_id = v_uid)) then
    raise exception 'not authorized';
  end if;

  -- Re-anchoring fills missing legacy identity; it is not a route for replacing the
  -- historical primary term or skip with a different search.
  if abs(coalesce(r.skip_distance, 0)) <> p_skip then
    raise exception 'legacy_identity_changed:skip' using errcode = 'check_violation';
  end if;

  v_corpus_id := public.fn_els_corpus_id(v_scope);
  v_term_norm := public.fn_els_term_norm(r.search_term);
  v_gate := public.els_publish_truth_gate_v1(
    r.search_term, v_scope, p_skip, p_direction, p_start_index, v_corpus_id, true
  );
  if v_gate <> 'MATCH' then
    raise exception 'els_publish_gate: % (legacy row was not changed)', v_gate
      using errcode = 'check_violation';
  end if;

  update public.els_records set
    scope          = v_scope,
    skip_distance  = p_skip,
    direction      = p_direction,
    start_index    = p_start_index,
    corpus_id      = v_corpus_id,
    term_norm      = v_term_norm,
    positions      = coalesce(p_positions, positions),
    image_url      = case when p_image_url is not null then nullif(p_image_url, '') else image_url end,
    description    = case when p_description is not null then nullif(p_description, '') else description end,
    engine_detail  = coalesce(p_engine_detail, engine_detail),
    -- An owner may keep the same record id, but public evidence still returns to
    -- moderation. Admin repair keeps an already-published record published.
    status         = case when r.status = 'published' and not v_admin then 'pending' else r.status end,
    visibility     = case when r.status = 'published' and not v_admin then 'private' else r.visibility end
  where id = p_id;
end;
$function$;

revoke all on function public.reanchor_els_matrix_v1(uuid,text,integer,text,integer,jsonb,text,text,jsonb) from public, anon;
grant execute on function public.reanchor_els_matrix_v1(uuid,text,integer,text,integer,jsonb,text,text,jsonb) to authenticated;
