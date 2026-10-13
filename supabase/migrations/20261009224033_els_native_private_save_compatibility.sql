-- Native private saves opt into the existing p_public=false contract.
-- Fix its invalid legacy status, honor private intent for admins, and constrain
-- private upserts to the caller's unpublished/non-dossier rows. Default/public
-- calls and all publication replay gates remain unchanged. No rows are rewritten.
CREATE OR REPLACE FUNCTION public.save_els_matrix(p_term text, p_scope text DEFAULT 'torah'::text, p_skip integer DEFAULT NULL::integer, p_direction text DEFAULT NULL::text, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_public boolean DEFAULT true, p_from_topic text DEFAULT NULL::text, p_corpus_id text DEFAULT NULL::text, p_term_norm text DEFAULT NULL::text, p_start_index integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_admin boolean; v_name text; new_id uuid;
        v_status text; v_vis text; v_base text; v_slug text; v_i int := 1;
        v_topic_slug text; v_node uuid;
        v_corpus_id text; v_term_norm text; v_gate text; v_existing_status text;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;
  if coalesce(nullif(p_term,''),'') = '' then raise exception 'missing term'; end if;
  v_admin := exists (select 1 from public.users u where u.id=v_uid and u.role='admin');
  select coalesce(nullif(display_name,''), nullif(username,'')) into v_name from public.users where id=v_uid;
  if not coalesce(p_public,true) then v_status:='draft'; v_vis:='private';
  elsif v_admin then v_status:='published'; v_vis:='public';
  elsif coalesce(p_public,true) then v_status:='pending'; v_vis:='private';
  else v_status:='draft'; v_vis:='private';
  end if;

  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  select id,status into new_id,v_existing_status from public.els_records
    where (case when not coalesce(p_public,true) then
      owner_user_id = v_uid and visibility = 'private' and not coalesce(self_published,false)
      and status in ('draft','pending','hidden')
      else (v_admin or (owner_user_id = v_uid and status is distinct from 'published')) end)
      and search_term = p_term
      and coalesce(skip_distance,-1) = coalesce(p_skip,-1)
      and coalesce(nullif(scope,''),'torah') = coalesce(nullif(p_scope,''),'torah')
      and coalesce(direction,'') = coalesce(p_direction,'')
      and coalesce(start_index,-1) = coalesce(p_start_index,-1)
    order by (status='published') desc, created_at desc limit 1;

  if new_id is not null then
    -- A published row is immutable to its non-admin owner: owner re-saves create a new pending row instead.
    -- Admin may edit an already-published row only while its persisted primary identity still replays MATCH.
    if v_admin and v_existing_status = 'published' then
      select public.els_publish_truth_gate_v1(
        search_term, scope, skip_distance, direction, start_index, corpus_id, true
      ) into v_gate
      from public.els_records where id = new_id;
      if v_gate <> 'MATCH' then
        raise exception 'els_publish_gate: % (published row must be re-anchored before edit)', v_gate using errcode = 'check_violation';
      end if;
    end if;
    update public.els_records set
        direction  = p_direction,
        positions  = coalesce(p_positions, positions),
        image_url  = coalesce(p_image_url, image_url),
        title      = coalesce(nullif(p_title,''), title),
        description= coalesce(p_note, description),
        engine_detail = coalesce(p_engine_detail, engine_detail)
      where id = new_id;
    return new_id;
  end if;

  -- 🧬 G3 publish truth gate (forward-only): a NEW admin auto-published row needs complete ELS identity AND a canonical
  --    replay MATCH of the primary occurrence. Pending/private (community) intake is unchanged and never auto-published.
  if v_status = 'published' then
    v_gate := public.els_publish_truth_gate_v1(p_term, p_scope, p_skip, p_direction, p_start_index);
    if v_gate <> 'MATCH' then
      raise exception 'els_publish_gate: % (new published ELS row requires complete identity and canonical replay MATCH)', v_gate using errcode = 'check_violation';
    end if;
  end if;

  v_base := public.els_slugify(p_term, p_skip); v_slug := v_base;
  while exists(select 1 from public.els_records where slug = v_slug) loop
    v_i := v_i + 1; v_slug := v_base || '-' || v_i;
  end loop;
  insert into public.els_records
    (owner_user_id, author_name, search_term, scope, skip_distance, direction, positions,
     image_url, title, description, source, status, visibility, slug, self_published,
     corpus_id, term_norm, start_index, engine_detail)
  values
    (v_uid, v_name, p_term, coalesce(nullif(p_scope,''),'torah'), p_skip, p_direction, p_positions,
     p_image_url, p_title, p_note,
     case when v_admin then 'admin' else 'community' end, v_status, v_vis, v_slug, (v_status <> 'draft'),
     v_corpus_id, v_term_norm, p_start_index, p_engine_detail)
  returning id into new_id;

  if coalesce(p_public,true) and coalesce(nullif(p_from_topic,''),'') <> '' then
    v_topic_slug := regexp_replace(p_from_topic, '^topic:', '');
    select node_id into v_node from public.topic_cards where slug = v_topic_slug limit 1;
    insert into public.research_contributions
      (author_user_id, author_name, intent, origin, research_state, status,
       target_type, target_id, title, body, gematria_claim, graph_node_id)
    values
      (v_uid, v_name, 'מקור', 'els',
       case when v_admin then 'validated' else 'discussion' end,
       case when v_admin then 'approved' else 'pending' end,
       'topic', v_topic_slug,
       coalesce(nullif(p_title,''), p_term),
       'צופן דילוג «' || p_term || '» בדילוג ' || coalesce(p_skip::text,'?') ||
         ' ב' || case when p_scope='tanakh' then 'תנ״ך' else 'תורה' end ||
         ' — /codes/' || v_slug,
       p_term || ' · דילוג ' || coalesce(p_skip::text,'?'),
       v_node);
  end if;
  return new_id;
end;
$function$
