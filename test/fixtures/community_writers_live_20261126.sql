-- Exact live bodies (prosrc) of the two guest write routes as read on 26.11.2026. md5(prosrc): add_guest_community_message 4eb11358227e6b3d8d77b933e076b28a,
-- add_contribution 2c2baa01ecf07abf1e1511f3cb951d3b. Used only by the isolated real-Postgres test.
create or replace function public.add_guest_community_message(p_body text, p_parent_id uuid, p_website text, p_name text)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_headers json;
  v_ip text;
  v_body text := btrim(coalesce(p_body, ''));
  v_plain text;
  v_author text := 'אורח';
  v_hour int;
  v_day int;
  v_global int;
  v_id uuid;
begin
  if auth.uid() is not null then raise exception 'use_account'; end if;
  if not coalesce((select enabled from public.community_guest_settings where singleton), false) then
    raise exception 'guest_publish_disabled';
  end if;
  -- Bots fill hidden fields. Pretend success, store nothing.
  if nullif(btrim(coalesce(p_website, '')), '') is not null then return gen_random_uuid(); end if;

  -- A guest may only comment on an existing message, never start a conversation.
  if p_parent_id is null then raise exception 'reply_only'; end if;

  v_plain := btrim(regexp_replace(v_body, '^\[sod:v1\]\s*', ''));
  if v_plain = '' then raise exception 'empty body'; end if;
  if length(v_body) > 3000 or length(v_plain) > 1500 then raise exception 'too_long'; end if;
  if v_body ~ '📎' or v_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(/|\b))' then
    raise exception 'links_not_allowed';
  end if;

  -- A guest has no name of their own: p_name is accepted for compatibility with older
  -- clients and ignored, so every guest comment is published as plain 'אורח'.

  if not exists (
    select 1 from public.research_contributions r
    where r.id = p_parent_id and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb', 'community_2029')
  ) then raise exception 'invalid_parent'; end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then v_headers := null;
  end;
  v_ip := coalesce(
    nullif(btrim(coalesce(v_headers->>'cf-connecting-ip', '')), ''),
    nullif(btrim(coalesce(v_headers->>'x-real-ip', '')), ''),
    nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''));
  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '24 hours')
    into v_hour, v_day
  from public.anon_contrib_log where ip = v_ip and created_at > now() - interval '24 hours';
  if v_hour >= 3 or v_day >= 10 then raise exception 'rate_limited'; end if;
  select count(*) into v_global from public.community_guest_posts where created_at > now() - interval '1 hour';
  if v_global >= 60 then raise exception 'busy'; end if;

  insert into public.anon_contrib_log (ip) values (v_ip);
  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status,
     target_type, target_id, parent_id, body)
  values (null, null, v_author, 'תגובה', 'community_2029', 'discussion', 'approved',
          'home', 'community', p_parent_id, v_body)
  returning id into v_id;
  insert into public.community_guest_posts (contribution_id) values (v_id);
  -- No last_activity_at bump: a guest's reply must not surface a dormant thread.
  return v_id;
end;
$function$;

create or replace function public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_cid uuid;
  v_name text;
  v_status text;
  v_state text;
  new_id uuid;
  v_ip text;
  v_recent int;
  v_trusted boolean := false;
  v_intent text := nullif(btrim(coalesce(p_intent,'')), '');
begin
  if p_body is null or length(btrim(p_body)) = 0 then raise exception 'empty body'; end if;

  if v_intent is null or not (v_intent = any(array[
    'תגובה','חידוש','שאלה','תיקון','תצפית','השערה','מקור','צופן','גימטריה','קשר'
  ]::text[])) then
    raise exception 'invalid intent';
  end if;

  if v_uid is not null then
    select id, coalesce(trusted,false)
      into v_cid, v_trusted
    from public.contributors
    where user_id = v_uid
    limit 1;

    v_status := case when v_intent = 'תגובה' then 'approved' else 'pending' end;
    v_state  := case
      when v_intent = 'תגובה' then 'discussion'
      when v_trusted then 'validated'
      else 'idea'
    end;

    select coalesce(nullif(display_name,''), nullif(username,''))
      into v_name
    from public.users
    where id = v_uid
    limit 1;
  else
    -- M0 (12.11.2026): the platform-set client address first (as add_guest_community_message); the first X-Forwarded-For hop is client-controlled.
    v_ip := coalesce(nullif(btrim(coalesce((current_setting('request.headers', true)::json)->>'cf-connecting-ip', '')), ''),
                     nullif(btrim(coalesce((current_setting('request.headers', true)::json)->>'x-real-ip', '')), ''),
                     split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for',''), ',', 1));
    v_ip := nullif(btrim(v_ip), '');
    if v_ip is not null then
      select count(*) into v_recent
      from public.anon_contrib_log
      where ip = v_ip and created_at > now() - interval '1 hour';
      if v_recent >= 5 then raise exception 'rate_limited'; end if;
      insert into public.anon_contrib_log(ip) values (v_ip);
    end if;
    v_status := 'pending';
    v_state  := 'discussion';
    v_name := left(coalesce(nullif(btrim(p_author_name),''), 'אורח'), 40);
  end if;

  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status,
     target_type, target_id, parent_id, title, body, gematria_claim, image_url)
  values
    (v_uid, v_cid, v_name, v_intent, coalesce(nullif(p_origin,''),'beit_midrash'),
     v_state, v_status, p_target_type, p_target_id, p_parent_id, p_title,
     left(p_body, 6000), p_gematria_claim, nullif(btrim(p_image_url), ''))
  returning id into new_id;

  if p_parent_id is not null then
    update public.research_contributions
       set last_activity_at = now()
     where id = p_parent_id;
  end if;

  if v_uid is not null and v_status = 'approved' then
    insert into public.contribution_events (user_id, kind, ref, value, source, metadata)
    values (
      v_uid,
      'contribution_posted',
      new_id::text,
      public.contribution_weight(v_intent, false, false, coalesce(nullif(p_origin,''),'beit_midrash') <> 'broadcast'),
      coalesce(nullif(p_origin,''),'beit_midrash'),
      jsonb_build_object('intent', v_intent, 'parent_id', p_parent_id, 'auto', true)
    );
  end if;

  return new_id;
end;
$function$;
