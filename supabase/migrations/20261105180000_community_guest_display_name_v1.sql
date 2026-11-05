-- Community guest publishing v2: an optional display name.
-- A visitor without an account may type a name for the message. The name is a
-- label only, never an identity: it is always shown with an "(אורח)" suffix so a
-- guest can never appear as a registered member, it carries no account, and the
-- same text-only, rate-limit, review and kill-switch rules apply as before.
-- Callers that send no name keep the previous fixed "אורח" label.

-- Adding a parameter must replace the old signature: keeping both would make a
-- call without p_name ambiguous.
drop function if exists public.add_guest_community_message(text, uuid, text);

create function public.add_guest_community_message(
  p_body text,
  p_parent_id uuid default null,
  p_website text default null,
  p_name text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_headers json;
  v_ip text;
  v_body text := btrim(coalesce(p_body, ''));
  v_plain text;
  v_name text;
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

  v_plain := btrim(regexp_replace(v_body, '^\[sod:v1\]\s*', ''));
  if v_plain = '' then raise exception 'empty body'; end if;
  if length(v_body) > 3000 or length(v_plain) > 1500 then raise exception 'too_long'; end if;
  if v_body ~ '📎' or v_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(/|\b))' then
    raise exception 'links_not_allowed';
  end if;

  -- Optional name: control and direction characters removed, spaces collapsed,
  -- 2-30 characters, no links and no markup or symbol characters.
  if nullif(btrim(coalesce(p_name, '')), '') is not null then
    v_name := btrim(regexp_replace(regexp_replace(p_name, '[\u0001-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]', '', 'g'), '\s+', ' ', 'g'));
    if v_name ~* '(https?://|www\.|[a-z0-9-]+\.(com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(/|\b))' or v_name ~ '📎' then
      raise exception 'links_not_allowed';
    end if;
    if char_length(v_name) < 2 or char_length(v_name) > 30
       or v_name ~ '[<>&{}\[\]\\/|@#$%^*=+~`;:_]' then
      raise exception 'invalid_name';
    end if;
    v_author := v_name || ' (אורח)';
  end if;

  if p_parent_id is not null and not exists (
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
  if p_parent_id is not null then
    update public.research_contributions set last_activity_at = now() where id = p_parent_id;
  end if;
  return v_id;
end;
$function$;
revoke all on function public.add_guest_community_message(text, uuid, text, text) from public;
grant execute on function public.add_guest_community_message(text, uuid, text, text) to anon, authenticated;
