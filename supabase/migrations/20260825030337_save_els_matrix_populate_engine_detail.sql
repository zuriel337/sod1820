-- Pass 3 (els_pass3_engine_detail_population): adds one new optional parameter p_engine_detail jsonb
-- to save_els_matrix / save_els_matrix_anon, writing it into the els_records.engine_detail column
-- added in Pass 2 (migration 20260824204445_els_records_add_engine_detail). Purely additive: no
-- existing scalar identity column (corpus_id/term_norm/scope/direction/skip_distance/start_index)
-- is touched, removed, or changed in meaning -- those remain the canonical FindingID identity fields
-- (Gate #4, server-derived, UPSERT-match key). engine_detail only supplements them.

CREATE OR REPLACE FUNCTION public.save_els_matrix(p_term text, p_scope text DEFAULT 'torah'::text, p_skip integer DEFAULT NULL::integer, p_direction text DEFAULT NULL::text, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_public boolean DEFAULT true, p_from_topic text DEFAULT NULL::text, p_corpus_id text DEFAULT NULL::text, p_term_norm text DEFAULT NULL::text, p_start_index integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_admin boolean; v_name text; new_id uuid;
        v_status text; v_vis text; v_base text; v_slug text; v_i int := 1;
        v_topic_slug text; v_node uuid;
        v_corpus_id text; v_term_norm text;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;
  if coalesce(nullif(p_term,''),'') = '' then raise exception 'missing term'; end if;
  v_admin := exists (select 1 from public.users u where u.id=v_uid and u.role='admin');
  select coalesce(nullif(display_name,''), nullif(username,'')) into v_name from public.users where id=v_uid;
  if v_admin then v_status:='published'; v_vis:='public';
  elsif coalesce(p_public,true) then v_status:='pending'; v_vis:='private';
  else v_status:='private'; v_vis:='private';
  end if;

  -- 🆔 identity is SERVER-DERIVED from the shared canonical source (never from the client).
  --    p_corpus_id / p_term_norm are intentionally IGNORED (no invented corpus_id, no client norm).
  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  -- 🔁 UPSERT: צופן זהה (מונח+דילוג+היקף+כיוון+מיקום-ממצא). אדמין → מתאים לכל בעלים; משתמש רגיל → רק שלו.
  --    ⚠️ תוקן 21.8 (Gate #4 bugfix, false-merge): direction/start_index נוספו למפתח-ההתאמה —
  --    לפני-כן שני ממצאים-שונים-אמיתיים (אותו מונח+דילוג+היקף, כיוון/מיקום שונה) התנגשו לשורה אחת
  --    וגרמו לדריסה-שקטה. ⛔ scope-קשיח: רק שני התנאים האלה, שום שינוי נוסף (לא UNIQUE, לא
  --    research_objects, לא anon, לא term-normalization) — ר' Gate #4 (OPEN, Intake Identity design).
  select id into new_id from public.els_records
    where (v_admin or owner_user_id = v_uid)
      and search_term = p_term
      and coalesce(skip_distance,-1) = coalesce(p_skip,-1)
      and coalesce(nullif(scope,''),'torah') = coalesce(nullif(p_scope,''),'torah')
      and coalesce(direction,'') = coalesce(p_direction,'')
      and coalesce(start_index,-1) = coalesce(p_start_index,-1)
    order by (status='published') desc, created_at desc limit 1;

  if new_id is not null then
    -- ✏️ עריכה: שומר status/visibility. ⛔ Step 3: identity columns are NOT touched on an
    --    existing row (INSERT-only policy) → legacy rows stay unchanged, no backfill.
    --    engine_detail: coalesce -- a save that doesn't supply a fresh envelope never blanks an existing one.
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

  v_base := public.els_slugify(p_term, p_skip); v_slug := v_base;
  while exists(select 1 from public.els_records where slug = v_slug) loop
    v_i := v_i + 1; v_slug := v_base || '-' || v_i;
  end loop;
  -- 📁 new row → identity persisted (Torah: full; Tanakh: corpus_id NULL).
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

CREATE OR REPLACE FUNCTION public.save_els_matrix_anon(p_visitor_id text, p_term text, p_scope text DEFAULT 'torah'::text, p_skip integer DEFAULT NULL::integer, p_direction text DEFAULT NULL::text, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_author_name text DEFAULT NULL::text, p_start_index integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_id uuid; v_base text; v_slug text; v_i int := 1; v_pending int; v_name text;
        v_corpus_id text; v_term_norm text;
begin
  -- If actually logged in, route through the normal path (no orphan anon rows).
  -- Forward p_start_index/p_engine_detail; corpus_id/term_norm are server-derived inside save_els_matrix.
  if auth.uid() is not null then
    return public.save_els_matrix(p_term, p_scope, p_skip, p_direction, p_positions,
                                  p_image_url, p_title, p_note, true, null, null, null, p_start_index, p_engine_detail);
  end if;
  if coalesce(nullif(btrim(p_visitor_id),''),'') = '' then raise exception 'missing visitor'; end if;
  if coalesce(nullif(btrim(p_term),''),'') = '' then raise exception 'missing term'; end if;
  -- anti-flood: cap unreviewed anonymous submissions per visitor
  select count(*) into v_pending from public.els_records
    where visitor_id = p_visitor_id and status = 'pending';
  if v_pending >= 20 then raise exception 'too many pending submissions'; end if;

  v_name := left(coalesce(nullif(btrim(p_author_name),''), 'אורח'), 60);
  v_base := public.els_slugify(p_term, p_skip); v_slug := v_base;
  while exists (select 1 from public.els_records where slug = v_slug) loop
    v_i := v_i + 1; v_slug := v_base || '-' || v_i;
  end loop;

  -- 🆔 same identity policy as save_els_matrix: server-derived, this is a NEW row (INSERT).
  v_term_norm := public.fn_els_term_norm(p_term);
  v_corpus_id := public.fn_els_corpus_id(p_scope);

  insert into public.els_records
    (owner_user_id, visitor_id, author_name, search_term, scope, skip_distance, direction,
     positions, image_url, title, description, source, status, visibility, slug,
     corpus_id, term_norm, start_index, engine_detail)
  values
    (null, btrim(p_visitor_id), v_name, p_term, coalesce(nullif(p_scope,''),'torah'),
     p_skip, p_direction, p_positions, p_image_url,
     left(coalesce(nullif(btrim(p_title),''), p_term), 200), left(p_note, 2000),
     'community', 'pending', 'private', v_slug,
     v_corpus_id, v_term_norm, p_start_index, p_engine_detail)
  returning id into new_id;
  return new_id;
end;
$function$;
