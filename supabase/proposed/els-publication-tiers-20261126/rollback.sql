-- Reverts apply.sql exactly. Rows created meanwhile keep their values (no data rewrite).
begin;
do $guard$ begin
  if (select pg_get_expr(polqual, polrelid) from pg_policy where polrelid='public.els_records'::regclass and polname='public_read_self_published_els') is distinct from '((self_published = true) AND (visibility = ''public''::text))' then raise exception 'apply.sql not in place'; end if;
end;
$guard$;
drop function if exists public.request_els_library_review(uuid, boolean);
drop function if exists public.detect_els_strong_ciphers();
drop function if exists public.els_my_strong_ciphers();
drop function if exists public.els_strong_cipher_assessment(public.els_records);
drop function if exists public.els_text_looks_sensitive(text);
alter table public.els_records drop constraint if exists els_records_private_not_self_published_chk;
drop policy public_read_self_published_els on public.els_records;
create policy public_read_self_published_els on public.els_records for select using (self_published = true);
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
  else v_status:='published'; v_vis:='public';
  end if;

  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  -- Serialize saves competing for the same slug, including retries by different devices.
  v_base := public.els_slugify(p_term, p_skip);
  perform pg_advisory_xact_lock(hashtextextended('save_els_matrix:' || v_base, 0));

  if v_status = 'published' then
    v_gate := public.els_publish_truth_gate_v1(p_term, p_scope, p_skip, p_direction, p_start_index);
    if v_gate is distinct from 'MATCH' then
      raise exception 'els_publish_gate: %', v_gate using errcode = 'check_violation';
    end if;
  end if;

  select id,status into new_id,v_existing_status from public.els_records
    where (case when v_status = 'draft' then
      owner_user_id = v_uid and visibility = 'private' and not coalesce(self_published,false)
      and status in ('draft','pending','hidden')
    when v_admin then status = 'published' and visibility = 'public'
    else
      owner_user_id = v_uid and status = 'published' and visibility = 'public'
      and corpus_id = v_corpus_id
      and title is not distinct from p_title and description is not distinct from p_note
      -- A repeated screenshot upload gets a new URL; compare the actual saved findings and view.
      and (positions - 'shapeUrl') is not distinct from (p_positions - 'shapeUrl')
      and engine_detail is not distinct from p_engine_detail
    end)
      and search_term = p_term
      and coalesce(skip_distance,-1) = coalesce(p_skip,-1)
      and coalesce(nullif(scope,''),'torah') = coalesce(nullif(p_scope,''),'torah')
      and coalesce(direction,'') = coalesce(p_direction,'')
      and coalesce(start_index,-1) = coalesce(p_start_index,-1)
    order by created_at desc, id limit 1;

  if new_id is not null then
    -- Return the receipt for an identical community submission. Only an administrator
    -- may edit an existing publication. Changed findings get their own stable address.
    if v_existing_status = 'published' then
      if not v_admin then return new_id; end if;
      select public.els_publish_truth_gate_v1(
        search_term, scope, skip_distance, direction, start_index, corpus_id, true
      ) into v_gate from public.els_records where id = new_id;
      if v_gate is distinct from 'MATCH' then
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

  v_slug := v_base;
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
$function$;
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

CREATE OR REPLACE FUNCTION public.self_publish_matrix(p_id uuid, p_on boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  select owner_user_id into v_owner from public.els_records where id=p_id;
  if v_owner is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_owner <> v_uid then return jsonb_build_object('ok',false,'error','not_owner'); end if;
  update public.els_records set self_published = coalesce(p_on,true) where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'self_published',coalesce(p_on,true));
end $function$;
commit;
