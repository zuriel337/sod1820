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

-- md5(prosrc) 96af69da3d9d8b1b82113248b09e97fa; live config: security definer, search_path = '' (every object schema-qualified).
create or replace function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_key text;
  v_arr jsonb;
  v_reactions jsonb;
  v_added boolean;
  v_parent uuid;
  v_chain_ids uuid[];
  v_chain_parents uuid[];
  v_approved boolean;
  v_has_root boolean;
  v_row record;
  v_locked integer := 0;
  v_repeat boolean := p_visitor in ('community-repeatable-like', 'community-repeatable-dislike');
  v_counter text := case when p_visitor = 'community-repeatable-dislike' then 'community_dislikes' else 'community_likes' end;
  v_repeat_emoji text := case when p_visitor = 'community-repeatable-dislike' then '👎' else '👍' end;
begin
  v_key := coalesce(auth.uid()::text, nullif('v:' || coalesce(nullif(btrim(p_visitor), ''), ''), 'v:'));
  if v_key is null then raise exception 'no identity'; end if;
  if p_emoji is null or p_emoji not in ('👍','👎','💡','🔥','🙏','✨')
    or (p_emoji = '👎' and p_visitor is distinct from 'community-repeatable-dislike') then
    raise exception 'bad emoji';
  end if;

  -- A reply must reach an approved root through approved existing ancestors.
  -- Missing rows, nonpublic rows, cycles and chains over the 128-row safety
  -- bound use the same denial and never return reactions or change activity.
  with recursive ancestry as (
    select rc.id, rc.parent_id, rc.status, array[rc.id] as visited, 1 as depth
    from public.research_contributions rc where rc.id = p_id
    union all
    select rc.id, rc.parent_id, rc.status, a.visited || rc.id, a.depth + 1
    from ancestry a join public.research_contributions rc on rc.id = a.parent_id
    where a.depth < 128 and not (rc.id = any(a.visited))
  )
  select array_agg(id order by depth), array_agg(parent_id order by depth),
         bool_and(coalesce(status = 'approved', false)), bool_or(parent_id is null)
  into v_chain_ids, v_chain_parents, v_approved, v_has_root
  from ancestry;
  if v_approved is distinct from true or v_has_root is distinct from true then
    raise exception 'not found';
  end if;

  -- Lock the whole chain from target toward root, then validate its current status
  -- and links. A moderation/reparent/delete racing the initial read fails
  -- closed. This matches admin_boost_reaction's existing target -> parent order;
  -- UUID order would invert its locks for some replies and introduce deadlocks.
  for v_row in
    select rc.id, rc.parent_id, rc.status, rc.reactions, rc.origin, rc.deleted_at, rc.thread_hidden_at
    from public.research_contributions rc where rc.id = any(v_chain_ids)
    order by array_position(v_chain_ids, rc.id) for update
  loop
    if v_row.status is distinct from 'approved'
      or v_row.parent_id is distinct from v_chain_parents[array_position(v_chain_ids, v_row.id)] then
      raise exception 'not found';
    end if;
    if v_repeat and (p_emoji <> v_repeat_emoji or coalesce(v_row.origin,'') not in ('openweb','community_2029')
      or v_row.thread_hidden_at is not null or (v_row.id = p_id and v_row.deleted_at is not null)) then
      raise exception 'not found';
    end if;
    v_locked := v_locked + 1;
    if v_row.id = p_id then
      v_reactions := v_row.reactions;
      v_parent := v_row.parent_id;
    end if;
  end loop;
  if v_locked <> cardinality(v_chain_ids) then raise exception 'not found'; end if;

  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  if v_repeat then
    v_reactions := jsonb_set(v_reactions, array[v_counter],
      to_jsonb(greatest(coalesce((v_reactions->>v_counter)::bigint,0),0) + 1));
    update public.research_contributions set reactions = v_reactions, last_activity_at = now() where id = p_id;
    if v_parent is not null then
      update public.research_contributions set last_activity_at = now() where id = v_parent;
    end if;
    return v_reactions;
  end if;
  v_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);
  if v_arr ? v_key then
    v_arr := (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements_text(v_arr) e where e <> v_key);
    v_added := false;
  else
    v_arr := v_arr || to_jsonb(v_key);
    v_added := true;
  end if;

  v_reactions := jsonb_set(v_reactions, array[p_emoji], v_arr);
  if v_added then
    update public.research_contributions set reactions = v_reactions, last_activity_at = now() where id = p_id;
    if v_parent is not null then
      update public.research_contributions set last_activity_at = now() where id = v_parent;
    end if;
  else
    update public.research_contributions set reactions = v_reactions where id = p_id;
  end if;
  return v_reactions;
end;
$function$;
