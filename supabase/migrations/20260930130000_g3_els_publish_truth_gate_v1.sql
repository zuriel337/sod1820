-- G3 ELS publish truth gate (forward-only) — amends PR #861 per GPT adjudication.
-- Only a canonical replay MATCH with COMPLETE ELS identity may become a NEW public ELS row or transition to 'published'.
--   * els_publish_truth_gate_v1 : internal gate (identity completeness + canonical els_verify_occurrence_v1 == MATCH)
--   * save_els_matrix           : admin auto-publish INSERT is gated; pending/private/community intake unchanged
--   * moderate_els_matrix       : transition to 'published' is gated (incomplete legacy => explicit re-anchor first)
-- Forward-only: no existing row is rewritten; already-published rows are never re-gated/edited; no backfill.
-- Identity stays server-derived (fn_els_corpus_id / fn_els_term_norm); no new store/registry/engine.

create or replace function public.els_publish_truth_gate_v1(
  p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text default null, p_check_row_corpus boolean default false
)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_norm text := public.fn_els_term_norm(p_term);
  v_corpus text;
  v_dir integer;
  v_state text;
begin
  if v_scope not in ('torah','tanakh') then return 'IDENTITY_INCOMPLETE:scope'; end if;
  v_corpus := public.fn_els_corpus_id(v_scope);
  if v_corpus is null then return 'IDENTITY_INCOMPLETE:corpus_id'; end if;
  if p_check_row_corpus and p_row_corpus_id is distinct from v_corpus then return 'IDENTITY_INCOMPLETE:corpus_id'; end if;
  if length(coalesce(v_norm,'')) < 2 then return 'IDENTITY_INCOMPLETE:term'; end if;
  if coalesce(p_skip,0) < 2 then return 'IDENTITY_INCOMPLETE:skip'; end if;
  v_dir := case p_direction when 'fwd' then 1 when 'back' then -1 else null end;
  if v_dir is null then return 'IDENTITY_INCOMPLETE:direction'; end if;
  if coalesce(p_start_index,-1) < 0 then return 'IDENTITY_INCOMPLETE:start_index'; end if;
  v_state := public.els_verify_occurrence_v1(p_term, v_scope, p_skip, v_dir, p_start_index)->>'verification_state';
  if v_state is distinct from 'MATCH' then return 'REPLAY_'||coalesce(v_state,'NOT_TESTED'); end if;
  return 'MATCH';
end
$function$;

revoke all on function public.els_publish_truth_gate_v1(text,text,integer,text,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.els_publish_truth_gate_v1(text,text,integer,text,integer,text,boolean) to service_role;

CREATE OR REPLACE FUNCTION public.moderate_els_matrix(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.els_records; v_gate text;
begin
  if not exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin') then raise exception 'not authorized'; end if;
  if p_status not in ('published','pending','hidden') then raise exception 'bad status'; end if;
  if p_status='published' then
    select * into r from public.els_records where id = p_id;
    -- forward-only: a row that is ALREADY published is not re-gated; any other row must pass the truth gate to publish.
    if found and r.status is distinct from 'published' then
      v_gate := public.els_publish_truth_gate_v1(r.search_term, r.scope, r.skip_distance, r.direction, r.start_index, r.corpus_id, true);
      if v_gate <> 'MATCH' then
        raise exception 'els_publish_gate: % (incomplete/unverified occurrence; re-anchor the finding before publishing)', v_gate using errcode = 'check_violation';
      end if;
    end if;
  end if;
  update public.els_records
    set status = p_status,
        visibility = case when p_status='published' then 'public' else visibility end
    where id = p_id returning * into r;
  if p_status='published' and r.owner_user_id is not null then
    insert into public.user_notifications (user_id, email, kind, title, body, link)
    select r.owner_user_id, lower(u.email), 'matrix_approved', 'הצופן שלך אושר! 🔠',
           format('הצופן «%s» ששמרת אושר ומופיע עכשיו בספריית-הצפנים.', coalesce(nullif(r.title,''), r.search_term)),
           '/codes/' || coalesce(r.slug, '')
    from public.users u where u.id=r.owner_user_id;
  end if;
end; $function$;

-- save_els_matrix: body == live definition, plus the gate on the NEW admin auto-published INSERT only.
-- Signature/ACL unchanged (create or replace keeps existing grants). Existing-row edit branch is untouched (no rewrite).
CREATE OR REPLACE FUNCTION public.save_els_matrix(p_term text, p_scope text DEFAULT 'torah'::text, p_skip integer DEFAULT NULL::integer, p_direction text DEFAULT NULL::text, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_public boolean DEFAULT true, p_from_topic text DEFAULT NULL::text, p_corpus_id text DEFAULT NULL::text, p_term_norm text DEFAULT NULL::text, p_start_index integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_admin boolean; v_name text; new_id uuid;
        v_status text; v_vis text; v_base text; v_slug text; v_i int := 1;
        v_topic_slug text; v_node uuid;
        v_corpus_id text; v_term_norm text; v_gate text;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;
  if coalesce(nullif(p_term,''),'') = '' then raise exception 'missing term'; end if;
  v_admin := exists (select 1 from public.users u where u.id=v_uid and u.role='admin');
  select coalesce(nullif(display_name,''), nullif(username,'')) into v_name from public.users where id=v_uid;
  if v_admin then v_status:='published'; v_vis:='public';
  elsif coalesce(p_public,true) then v_status:='pending'; v_vis:='private';
  else v_status:='private'; v_vis:='private';
  end if;

  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  select id into new_id from public.els_records
    where (v_admin or owner_user_id = v_uid)
      and search_term = p_term
      and coalesce(skip_distance,-1) = coalesce(p_skip,-1)
      and coalesce(nullif(scope,''),'torah') = coalesce(nullif(p_scope,''),'torah')
      and coalesce(direction,'') = coalesce(p_direction,'')
      and coalesce(start_index,-1) = coalesce(p_start_index,-1)
    order by (status='published') desc, created_at desc limit 1;

  if new_id is not null then
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
  if v_admin then
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
     case when v_admin then 'admin' else 'community' end, v_status, v_vis, v_slug, (v_status <> 'private'),
     v_corpus_id, v_term_norm, p_start_index, p_engine_detail)
  returning id into new_id;

  if coalesce(nullif(p_from_topic,''),'') <> '' then
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
$function$;
