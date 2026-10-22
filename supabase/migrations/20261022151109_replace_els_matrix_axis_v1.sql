-- Replace the primary axis of one explicitly opened ELS record in place.
-- The caller must prove the identity it opened, and the replacement occurrence
-- must pass the existing canonical publication truth gate. The record title,
-- slug and id are deliberately preserved. No table or RLS policy is changed.
create or replace function public.replace_els_matrix_axis_v1(
  p_id uuid,
  p_expected_term text,
  p_expected_scope text,
  p_expected_skip integer,
  p_expected_direction text,
  p_expected_start_index integer,
  p_term text,
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
  v_expected_scope text := lower(coalesce(nullif(btrim(p_expected_scope), ''), 'torah'));
  v_scope text := lower(coalesce(nullif(btrim(p_scope), ''), 'torah'));
  v_corpus_id text;
  v_old_term_norm text;
  v_expected_term_norm text;
  v_term_norm text;
  v_positions jsonb;
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

  -- Prevent a stale browser tab from replacing a record that changed after it
  -- was opened. Null legacy coordinates compare exactly via IS DISTINCT FROM.
  v_old_term_norm := public.fn_els_term_norm(r.search_term);
  v_expected_term_norm := public.fn_els_term_norm(p_expected_term);
  if v_old_term_norm is distinct from v_expected_term_norm
     or lower(coalesce(nullif(btrim(r.scope), ''), 'torah')) is distinct from v_expected_scope
     or r.skip_distance is distinct from p_expected_skip
     or r.direction is distinct from p_expected_direction
     or r.start_index is distinct from p_expected_start_index then
    raise exception 'saved_axis_changed' using errcode = 'serialization_failure';
  end if;

  v_term_norm := public.fn_els_term_norm(p_term);
  if v_term_norm is null or char_length(v_term_norm) < 2 then
    raise exception 'replacement_identity_incomplete:term' using errcode = 'check_violation';
  end if;
  if v_term_norm = v_old_term_norm then
    raise exception 'primary_axis_unchanged' using errcode = 'check_violation';
  end if;

  v_corpus_id := public.fn_els_corpus_id(v_scope);
  v_gate := public.els_publish_truth_gate_v1(
    p_term, v_scope, p_skip, p_direction, p_start_index, v_corpus_id, true
  );
  if v_gate <> 'MATCH' then
    raise exception 'els_publish_gate: % (saved row was not changed)', v_gate
      using errcode = 'check_violation';
  end if;

  -- The promoted finding becomes the scalar primary identity. Remove the old
  -- primary term from persisted findings as requested, while leaving the
  -- in-memory Journey available to return until navigation/save completes.
  v_positions := coalesce(p_positions, r.positions);
  if jsonb_typeof(v_positions -> 'findings') = 'array' then
    v_positions := jsonb_set(
      v_positions,
      '{findings}',
      coalesce((
        select jsonb_agg(finding order by ordinal)
        from jsonb_array_elements(v_positions -> 'findings') with ordinality as item(finding, ordinal)
        where public.fn_els_term_norm(finding ->> 't') is distinct from v_old_term_norm
      ), '[]'::jsonb),
      true
    );
  end if;

  update public.els_records set
    search_term    = p_term,
    scope          = v_scope,
    skip_distance  = p_skip,
    direction      = p_direction,
    start_index    = p_start_index,
    corpus_id      = v_corpus_id,
    term_norm      = v_term_norm,
    positions      = v_positions,
    image_url      = case when p_image_url is not null then nullif(p_image_url, '') else image_url end,
    description    = case when p_description is not null then nullif(p_description, '') else description end,
    engine_detail  = coalesce(p_engine_detail, engine_detail),
    -- Owner changes to published evidence keep the id/title/slug but return to
    -- moderation. An admin may keep an already-published row published.
    status         = case when r.status = 'published' and not v_admin then 'pending' else r.status end,
    visibility     = case when r.status = 'published' and not v_admin then 'private' else r.visibility end
  where id = p_id;
end;
$function$;

revoke all on function public.replace_els_matrix_axis_v1(uuid,text,text,integer,text,integer,text,text,integer,text,integer,jsonb,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_els_matrix_axis_v1(uuid,text,text,integer,text,integer,text,text,integer,text,integer,jsonb,text,text,jsonb)
  to authenticated;
