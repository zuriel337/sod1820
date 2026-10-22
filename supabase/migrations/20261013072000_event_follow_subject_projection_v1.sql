-- BRANCH ONLY. NOT APPLIED. Existing Subscription/Person owner extension.
-- No new table, Follow engine, notification dispatcher, audience or grant.
-- A sequence is the projection around its root Event UUID, not a new identity.
-- Existing cases preserved from live canonical_follow_subject (2026-10-13).
-- Apply only after isolated SQL/ACL + dispatcher review. This identity resolver
-- does NOT publish an Event, grant access or prove the event exists. Callers
-- must offer Follow only for a subject obtained from an authorized reader.
create or replace function public.canonical_follow_subject(
  p_entity_type text, p_stable_id text
) returns text
language plpgsql immutable
set search_path to 'public'
as $function$
declare
  v_type text := lower(btrim(coalesce(p_entity_type, '')));
  v_id text := btrim(coalesce(p_stable_id, ''));
begin
  if v_type = '' or v_id = '' then return ''; end if;
  if v_type in ('event', 'event_sequence') then
    if v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return ''; end if;
    return public.canonical_follow_topic('event:' || lower(v_id));
  end if;
  return case v_type
    when 'number' then public.canonical_follow_topic('number:' || v_id)
    when 'author' then public.canonical_follow_topic('author:' || v_id)
    when 'category' then public.canonical_follow_topic('cat:' || v_id)
    when 'cipher_feed' then 'codes:new'
    when 'reality_stream' then 'stream:reality'
    when 'media_channel' then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    when 'channel' then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    else ''
  end;
end
$function$;
