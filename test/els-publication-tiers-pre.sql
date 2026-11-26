-- State BEFORE the fix: live definitions (26.11.2026) on the isolated ELS fixture (test/els-native-save-fixture.sql).
alter table users add column email text;
update users set email = 'u' || right(id::text,1) || '@example.test';
create table user_notifications(user_id uuid, email text, kind text, title text, body text, link text);
create table system_suggestions(id bigserial primary key, created_at timestamptz default now(), category text, detector text, title text, reason text, observed jsonb,
  confidence smallint, sample_size int, estimated_impact text, status text default 'pending', decided_at timestamptz, decision_note text, dedupe_key text);
create function public.suggest_add(p_category text, p_detector text, p_title text, p_reason text, p_observed jsonb, p_confidence integer, p_sample integer, p_impact text, p_dedupe text)
 returns bigint language plpgsql security definer set search_path to 'public' as $function$
declare v_id bigint;
begin
  if exists (select 1 from system_suggestions where dedupe_key = p_dedupe and (status in ('pending','later') or (status='rejected' and decided_at > now() - interval '30 days'))) then
    update system_suggestions set observed = p_observed, confidence = p_confidence, sample_size = p_sample, estimated_impact = p_impact where dedupe_key = p_dedupe and status in ('pending','later');
    return null;
  end if;
  insert into system_suggestions (category, detector, title, reason, observed, confidence, sample_size, estimated_impact, dedupe_key)
  values (p_category, p_detector, p_title, p_reason, p_observed, greatest(0,least(100,p_confidence)), p_sample, p_impact, p_dedupe) returning id into v_id;
  return v_id;
end; $function$;
create function public.self_publish_matrix(p_id uuid, p_on boolean default true) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  select owner_user_id into v_owner from public.els_records where id=p_id;
  if v_owner is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_owner <> v_uid then return jsonb_build_object('ok',false,'error','not_owner'); end if;
  update public.els_records set self_published = coalesce(p_on,true) where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'self_published',coalesce(p_on,true));
end $function$;
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

-- A=…01 member, B=…02 member, C=…03 admin. Seeds: the live leak case, approved public ciphers (with and without the flag), a strong private cipher.
insert into els_records(id,owner_user_id,search_term,scope,skip_distance,direction,start_index,status,visibility,self_published,title,slug,source,engine_detail,positions) values
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','אליהו','torah',22,'back',10,'draft','private',true,'live leak case','e1','admin',null,'{}'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','פומבי','torah',3,'fwd',10,'published','public',true,'public self','e3','community',null,'{}'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','פומבי ב','torah',4,'fwd',10,'published','public',false,'public approved','e4','community',null,'{}'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','חזק פרטי','torah',5,'fwd',10,'draft','private',false,'strong private','e5','community','{"ranking":{"quality":{"score":72,"stars":5}}}','{"findings":[{"t":"א"},{"t":"ב"}]}'),
 ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','חסום','torah',6,'fwd',-1,'draft','private',false,'A mismatch','e6','community',null,'{}'),
 ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','מוסתר','torah',7,'fwd',10,'hidden','private',false,'A withheld','e7','community',null,'{}'),
 ('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002','חזק ציבורי','torah',8,'fwd',10,'draft','public',true,'strong page','e8','community','{"ranking":{"quality":{"score":68,"stars":4}}}','{"findings":[{"t":"ג"},{"t":"ד"},{"t":"ה"}]}'),
 ('a0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002','חזק רגיש','torah',9,'fwd',10,'draft','public',true,'call me a@b.co','e9','community','{"ranking":{"quality":{"score":80,"stars":5}}}','{"findings":[{"t":"ו"},{"t":"ז"}]}'),
 ('a0000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000002','חלש ציבורי','torah',11,'fwd',10,'draft','public',true,'weak page','ea','community','{"ranking":{"quality":{"score":30,"stars":3}}}','{"findings":[{"t":"ח"}]}');
begin; set local role anon;
select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000001'),'BEFORE: anon reads a private row whose flag is set (the live leak)');
commit;
