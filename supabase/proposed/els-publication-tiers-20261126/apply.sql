-- ELS publication tiers (ZURIEL final product decision, 26.11.2026). NOT APPLIED. Owner-approved operator action only. Supersedes els-private-guarantee-20261126.
--   1. private  : visibility='private' -> owner and administrators only. Nothing can make a private row public except the owner's explicit publication.
--   2. my page  : visibility='public' + self_published -> open to everyone and to Google, no approval (member saves and self_publish_matrix).
--   3. library  : status='published' -> only an administrator (moderate_els_matrix). The owner can only REQUEST it (request_els_library_review).
-- No new table, trigger or engine. Reuses els_records, moderate_els_matrix, system_suggestions/suggest_add. No data rewrite.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.save_els_matrix(text,text,int,text,jsonb,text,text,text,bool,text,text,text,int,jsonb)'::regprocedure)) <> '8f0fee181b926b258282859d5f861203' then raise exception 'Unexpected save_els_matrix'; end if;
  if md5(pg_get_functiondef('public.self_publish_matrix(uuid,boolean)'::regprocedure)) <> 'e5fb2afa044c0ec42640fa1584163dec' then raise exception 'Unexpected self_publish_matrix'; end if;
  if md5(pg_get_functiondef('public.moderate_els_matrix(uuid,text)'::regprocedure)) <> '1e7974a49a86595aedec12276796d24c' then raise exception 'Unexpected moderate_els_matrix'; end if;
  if (select pg_get_expr(polqual, polrelid) from pg_policy where polrelid='public.els_records'::regclass and polname='public_read_self_published_els') is distinct from '(self_published = true)' then raise exception 'Unexpected policy'; end if;
end;
$guard$;

-- A private row can never be public: the read policy requires visibility='public', and the state itself is constrained (existing violating row, if any, is left untouched: NOT VALID).
drop policy public_read_self_published_els on public.els_records;
create policy public_read_self_published_els on public.els_records for select using (self_published = true and visibility = 'public');
alter table public.els_records add constraint els_records_private_not_self_published_chk check (visibility <> 'private' or coalesce(self_published, false) = false) not valid;

-- Member public save = public on the owner's page (status draft), no longer straight into the central library; administrator public save is unchanged.
CREATE OR REPLACE FUNCTION public.save_els_matrix(p_term text, p_scope text DEFAULT 'torah'::text, p_skip integer DEFAULT NULL::integer, p_direction text DEFAULT NULL::text, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_public boolean DEFAULT true, p_from_topic text DEFAULT NULL::text, p_corpus_id text DEFAULT NULL::text, p_term_norm text DEFAULT NULL::text, p_start_index integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_admin boolean; v_name text; new_id uuid;
        v_status text; v_vis text; v_base text; v_slug text; v_i int := 1;
        v_topic_slug text; v_node uuid;
        v_corpus_id text; v_term_norm text; v_gate text; v_existing_status text; v_private boolean;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;
  if coalesce(nullif(p_term,''),'') = '' then raise exception 'missing term'; end if;
  v_admin := exists (select 1 from public.users u where u.id=v_uid and u.role='admin');
  select coalesce(nullif(display_name,''), nullif(username,'')) into v_name from public.users where id=v_uid;
  v_private := not coalesce(p_public,true);
  if v_private then v_status:='draft'; v_vis:='private';          -- private: owner and administrators only
  elsif v_admin then v_status:='published'; v_vis:='public';      -- administrator publication (unchanged)
  else v_status:='draft'; v_vis:='public';                        -- member: public on the owner's own page, NOT in the central library
  end if;

  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  -- Serialize saves competing for the same slug, including retries by different devices.
  v_base := public.els_slugify(p_term, p_skip);
  perform pg_advisory_xact_lock(hashtextextended('save_els_matrix:' || v_base, 0));

  if v_vis = 'public' then
    v_gate := public.els_publish_truth_gate_v1(p_term, p_scope, p_skip, p_direction, p_start_index);
    if v_gate is distinct from 'MATCH' then
      raise exception 'els_publish_gate: %', v_gate using errcode = 'check_violation';
    end if;
  end if;

  select id,status into new_id,v_existing_status from public.els_records
    where (case when v_private then
      owner_user_id = v_uid and visibility = 'private' and not coalesce(self_published,false)
      and status in ('draft','pending','hidden')
    when v_admin then status = 'published' and visibility = 'public'
    else
      owner_user_id = v_uid and visibility = 'public' and coalesce(self_published,false)
      and status in ('draft','pending','published')
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
    -- An identical member submission (same findings and view) returns its existing receipt in any state.
    if not v_admin and not v_private then return new_id; end if;
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
     case when v_admin then 'admin' else 'community' end, v_status, v_vis, v_slug, (not v_private),
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

create or replace function public.self_publish_matrix(p_id uuid, p_on boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); r public.els_records%rowtype; v_gate text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into r from public.els_records where id = p_id for update;
  if not found or r.owner_user_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.owner_user_id <> v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  if coalesce(p_on, true) then
    if r.status in ('hidden', 'archived') then return jsonb_build_object('ok', false, 'error', 'withheld'); end if;
    if r.visibility is distinct from 'public' then
      v_gate := public.els_publish_truth_gate_v1(r.search_term, r.scope, r.skip_distance, r.direction, r.start_index);
      if v_gate is distinct from 'MATCH' then raise exception 'els_publish_gate: %', v_gate using errcode = 'check_violation'; end if;
    end if;
    -- Public on the owner's page: no administrator approval; status is NOT changed (the central library is a separate request).
    update public.els_records set self_published = true, visibility = 'public' where id = p_id;
    return jsonb_build_object('ok', true, 'id', p_id, 'self_published', true, 'visibility', 'public', 'status', r.status);
  end if;
  -- Withdrawal returns an owner-published record to private (a pending library request is withdrawn too). An approved cipher keeps its library access.
  update public.els_records
     set self_published = false,
         visibility = case when r.status = 'published' then r.visibility else 'private' end,
         status = case when r.status = 'pending' then 'draft' else r.status end
   where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'self_published', false,
    'visibility', case when r.status = 'published' then r.visibility else 'private' end,
    'status', case when r.status = 'pending' then 'draft' else r.status end);
end
$function$;

-- Approval stays the administrator's single gate. Added: 'draft' (decline: back to the owner's page) and a refusal to admit a private row.
CREATE OR REPLACE FUNCTION public.moderate_els_matrix(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.els_records; v_gate text;
begin
  if not exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin') then raise exception 'not authorized'; end if;
  if p_status not in ('published','pending','hidden','draft') then raise exception 'bad status'; end if;   -- 'draft' = decline: back to the owner's page, never silent deletion
  if p_status='published' then
    select * into r from public.els_records where id = p_id;
    -- A private row is never admitted to the central library; it must first be published by its owner.
    if found and r.visibility = 'private' then raise exception 'private rows are not publishable' using errcode = 'check_violation'; end if;
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

-- Sensitive-content screen (heuristic, deliberately conservative): e-mail, phone-like or ID-like digit runs, long digit strings, URLs.
create or replace function public.els_text_looks_sensitive(p_text text) returns boolean language sql immutable as $f$
  select coalesce(p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or p_text ~ '(\+?\d[\d\s().-]{7,}\d)'
      or p_text ~* '(https?://|www\.)', false);
$f$;
revoke all on function public.els_text_looks_sensitive(text) from public, anon, authenticated;

-- ONE assessment shared by the administrator detector and the owner's own view. It reads what the system already stored
-- (engine_detail.ranking.quality from the canonical engine's rank/rarity/cross-over scoring, the findings, the canonical replay gate).
-- It is an indicative heuristic, NOT a calibrated significance: the ranking policy is not calibrated yet (elsResearchAssessment.js).
create or replace function public.els_strong_cipher_assessment(r public.els_records) returns jsonb language plpgsql stable security definer set search_path to 'public' as $f$
declare q jsonb := r.engine_detail #> '{ranking,quality}'; v_score int := nullif(q->>'score','')::int; v_stars int := nullif(q->>'stars','')::int;
        v_find int := case when jsonb_typeof(r.positions->'findings') = 'array' then jsonb_array_length(r.positions->'findings') else 0 end;
        v_gate text; v_sens boolean; v_strong boolean; v_reasons jsonb := '[]'::jsonb;
begin
  v_gate := public.els_publish_truth_gate_v1(r.search_term, r.scope, r.skip_distance, r.direction, r.start_index);
  v_sens := public.els_text_looks_sensitive(coalesce(r.title,'') || ' ' || coalesce(r.description,'') || ' ' || coalesce(r.positions::text,''));
  v_strong := v_gate = 'MATCH' and coalesce(v_stars,0) >= 4 and coalesce(v_score,0) >= 60 and v_find >= 2;
  if v_gate = 'MATCH' then v_reasons := v_reasons || to_jsonb('אומת במנוע הקנוני (MATCH)'::text); end if;
  if v_stars is not null then v_reasons := v_reasons || to_jsonb(format('דירוג המערכת: %s כוכבים, ציון %s', v_stars, coalesce(v_score,0))); end if;
  if v_find >= 2 then v_reasons := v_reasons || to_jsonb(format('הצטלבות של %s מילים בממצא', v_find)); end if;
  return jsonb_build_object('strong', v_strong, 'verified', v_gate = 'MATCH', 'sensitive', v_sens, 'stars', v_stars, 'score', v_score,
    'findings', v_find, 'certainty', 'indicative', 'calibrated', false, 'reasons', v_reasons,
    'note', 'היוריסטיקה מבוססת דירוג המנוע; אין עדיין מדיניות דירוג מכוילת. זו המלצה ולא קביעה מחקרית.');
end $f$;
revoke all on function public.els_strong_cipher_assessment(public.els_records) from public, anon, authenticated;

-- The owner's own view: strong ciphers among their own private or page-level ciphers. Reads only the caller's rows; sends nothing.
create or replace function public.els_my_strong_ciphers() returns jsonb language plpgsql stable security definer set search_path to 'public' as $f$
declare v_uid uuid := auth.uid(); out jsonb;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'slug', e.slug, 'title', coalesce(nullif(e.title,''), e.search_term),
           'visibility', e.visibility, 'self_published', coalesce(e.self_published,false), 'status', e.status, 'assessment', e.a) order by (e.a->>'score')::int desc nulls last), '[]'::jsonb)
    into out
    from (select r.*, public.els_strong_cipher_assessment(r) a from public.els_records r
           where r.owner_user_id = v_uid and r.status in ('draft','pending') order by r.created_at desc limit 40) e
   where (e.a->>'strong')::boolean and not (e.a->>'sensitive')::boolean;
  return out;
end $f$;
grant execute on function public.els_my_strong_ciphers() to authenticated;

-- Administrator-facing candidates through the EXISTING system_suggestions engine (suggest_add: dedupe, 30-day rejection memory, no notification
-- because no severity is set). Only PUBLIC page-level ciphers that are strong, verified and not sensitive; private rows are never candidates.
-- Attribution stays with the original researcher (observed carries owner and author; nothing is rewritten). Bounded to 5 per run.
create or replace function public.detect_els_strong_ciphers() returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare r public.els_records; a jsonb; n int := 0; v_id bigint;
begin
  for r in select * from public.els_records e
            where e.visibility = 'public' and coalesce(e.self_published,false) and e.status = 'draft' and e.owner_user_id is not null
            order by e.created_at desc limit 40 loop
    a := public.els_strong_cipher_assessment(r);
    continue when not (a->>'strong')::boolean or (a->>'sensitive')::boolean;
    v_id := public.suggest_add('research', 'els_strong_cipher',
      format('צופן חזק מועמד לספרייה המרכזית: «%s»', coalesce(nullif(r.title,''), r.search_term)),
      'נבחר כי: ' || (select string_agg(x, ' · ') from jsonb_array_elements_text(a->'reasons') x) || '. ' || (a->>'note') || ' הבעלים פרסם אותו בדף שלו; קבלה לספרייה המרכזית היא החלטת מנהל בלבד (moderate_els_matrix).',
      jsonb_build_object('els_record_id', r.id, 'slug', r.slug, 'owner_user_id', r.owner_user_id, 'author_name', r.author_name, 'assessment', a),
      55, coalesce((a->>'findings')::int, 1), 'מועמד לספרייה המרכזית — קבלה רק באישור מנהל',
      'els_strong_cipher:' || r.id::text);
    if v_id is not null then n := n + 1; end if;   -- suggest_add returns NULL for a duplicate: no repeat recommendation
    exit when n >= 5;
  end loop;
  return jsonb_build_object('raised', n, 'checked_at', now());
end $f$;
revoke all on function public.detect_els_strong_ciphers() from public, anon, authenticated;

-- The owner asks for the central library through the EXISTING moderation queue (status 'pending') and the EXISTING suggestions surface.
-- A request is not an approval. Withdrawing returns pending -> draft. Only the owner, only for a public page-level cipher.
create or replace function public.request_els_library_review(p_id uuid, p_on boolean default true) returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare v_uid uuid := auth.uid(); r public.els_records;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into r from public.els_records where id = p_id for update;
  if not found or r.owner_user_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.owner_user_id <> v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  if coalesce(p_on, true) then
    if r.status = 'published' then return jsonb_build_object('ok', true, 'id', p_id, 'status', 'published'); end if;
    if r.visibility <> 'public' or not coalesce(r.self_published, false) then return jsonb_build_object('ok', false, 'error', 'not_public'); end if;
    if r.status not in ('draft','pending') then return jsonb_build_object('ok', false, 'error', 'withheld'); end if;
    update public.els_records set status = 'pending' where id = p_id;
    perform public.suggest_add('research', 'els_library_request',
      format('בקשת הוספה לספרייה המרכזית: «%s»', coalesce(nullif(r.title,''), r.search_term)),
      'הבעלים ביקש להוסיף את הצופן לספרייה המרכזית. אין בבקשה אישור: ההחלטה למנהל (moderate_els_matrix).',
      jsonb_build_object('els_record_id', r.id, 'slug', r.slug, 'owner_user_id', r.owner_user_id, 'author_name', r.author_name, 'source', 'owner_request'),
      100, 1, 'קבלה לספרייה המרכזית — רק באישור מנהל', 'els_library_request:' || r.id::text);
    return jsonb_build_object('ok', true, 'id', p_id, 'status', 'pending');
  end if;
  if r.status = 'pending' then update public.els_records set status = 'draft' where id = p_id; end if;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', case when r.status = 'pending' then 'draft' else r.status end);
end $f$;
grant execute on function public.request_els_library_review(uuid, boolean) to authenticated;
commit;
