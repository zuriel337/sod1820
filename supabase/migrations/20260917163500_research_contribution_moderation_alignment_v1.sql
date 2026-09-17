-- G3_RESEARCH_CONTRIBUTION_MODERATION_ALIGNMENT_V1
-- Aligns live add_contribution behavior with research_contribution_law v9.
-- Only explicit reply/comment intent may be immediately approved; knowledge-bearing intents remain pending.

create or replace function public.add_contribution(
  p_intent text,
  p_origin text,
  p_body text,
  p_target_type text default null,
  p_target_id text default null,
  p_parent_id uuid default null,
  p_title text default null,
  p_gematria_claim jsonb default null,
  p_author_name text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Fail closed: blank or unknown intent must never inherit the auto-approved reply lane.
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

    -- research_contribution_law v9: only a plain reply/comment is live immediately.
    -- Trusted contributor status may affect research maturity, never moderation bypass.
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
    v_ip := split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for',''), ',', 1);
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

  -- Only genuinely auto-approved activity emits the immediate event here.
  -- Pending knowledge-bearing contributions receive approval-side provenance later.
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
