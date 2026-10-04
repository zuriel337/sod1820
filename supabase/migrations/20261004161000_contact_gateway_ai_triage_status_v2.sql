-- CONTACT_GATEWAY_AI_TRIAGE_STATUS_V2
-- EXTEND_EXISTING: community_hints + system_suggestions. No new store.
-- 1) Authenticated users may read only their own submitted community-hint lifecycle through a bounded RPC.
-- 2) Admin may refresh privacy-safe aggregate UX signals into existing system_suggestions.
-- AI explanation happens separately/on-demand over aggregate suggestion data only.

create or replace function public.my_community_hint_status_v1(p_limit integer default 20)
returns table(
  id uuid,
  status text,
  number integer,
  description text,
  created_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  gallery_image_id uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
  select h.id, h.status, h.number, left(coalesce(h.description,''), 240),
         h.created_at, h.reviewed_at, h.review_note, h.gallery_image_id
  from public.community_hints h
  where h.reporter_user_id = v_uid
  order by h.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.my_community_hint_status_v1(integer) from public;
revoke all on function public.my_community_hint_status_v1(integer) from anon;
revoke all on function public.my_community_hint_status_v1(integer) from service_role;
grant execute on function public.my_community_hint_status_v1(integer) to authenticated;

create or replace function public.admin_contact_gateway_triage_refresh_v2()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_suggestions integer := 0;
  v_id bigint;
begin
  if auth.uid() is null or not public.rd_is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;

  -- Learning gaps: aggregate only bounded semantic keys already emitted by Entry Learn.
  for r in
    select
      coalesce(nullif(e.props->>'entry_surface',''), 'unknown') as entry_surface,
      coalesce(nullif(e.props->>'concept_key',''), 'unknown') as concept_key,
      coalesce(nullif(e.props->>'learn_stage',''), 'unknown') as learn_stage,
      count(*)::integer as events_count,
      count(distinct e.session_id)::integer as sessions_count
    from public.events e
    where e.event_type = 'learn_help_requested'
      and e.created_at >= now() - interval '14 days'
    group by 1,2,3
    having count(distinct e.session_id) >= 3
  loop
    v_id := public.suggest_add(
      'ux',
      'contact_gateway_learn_gap',
      format('פער הבנה חוזר: %s · %s', r.entry_surface, r.concept_key),
      format('%s משתמשים/סשנים ביקשו עזרה נוספת אחרי שכבת ההדרכה.', r.sessions_count),
      jsonb_build_object(
        'signal','learn_help_requested',
        'window_days',14,
        'entry_surface',r.entry_surface,
        'concept_key',r.concept_key,
        'learn_stage',r.learn_stage,
        'events_count',r.events_count,
        'sessions_count',r.sessions_count,
        'raw_user_text_included',false
      ),
      least(95, 55 + r.sessions_count * 5),
      r.sessions_count,
      'שיפור ההסבר בנקודה הזאת עשוי לצמצם בלבול ופניות חוזרות.',
      format('contact-learn:%s:%s:%s', r.entry_surface, r.concept_key, r.learn_stage)
    );
    if v_id is not null then v_suggestions := v_suggestions + 1; end if;
  end loop;

  -- Product-demand signals from Contact Gateway idea submissions.
  -- Raw message bodies are never copied into system_suggestions; only safe context path + counts.
  for r in
    select
      coalesce(
        nullif(substring(m.message from 'path=([^[:space:]·\\]]+)'), ''),
        'unknown'
      ) as path,
      count(*)::integer as sample_count
    from public.contact_messages m
    where m.subject = '💡 רעיון / משהו חסר ב-SOD1820'
      and m.created_at >= now() - interval '30 days'
    group by 1
    having count(*) >= 3
  loop
    v_id := public.suggest_add(
      'ux',
      'contact_gateway_demand',
      format('בקשות חוזרות מהמשתמשים%s', case when r.path <> 'unknown' then format(' · %s', r.path) else '' end),
      format('%s בקשות/רעיונות התקבלו באותו הקשר ב-30 הימים האחרונים.', r.sample_count),
      jsonb_build_object(
        'signal','contact_gateway_idea',
        'window_days',30,
        'path',r.path,
        'sample_count',r.sample_count,
        'raw_user_text_included',false
      ),
      least(90, 50 + r.sample_count * 5),
      r.sample_count,
      'שווה לבדוק האם חסרה יכולת/הבהרה חוזרת במסך הזה לפני שמפתחים משהו חדש.',
      format('contact-demand:%s', r.path)
    );
    if v_id is not null then v_suggestions := v_suggestions + 1; end if;
  end loop;

  return jsonb_build_object('ok', true, 'suggestions_touched', v_suggestions, 'raw_user_text_included', false);
end;
$$;

revoke all on function public.admin_contact_gateway_triage_refresh_v2() from public;
revoke all on function public.admin_contact_gateway_triage_refresh_v2() from anon;
revoke all on function public.admin_contact_gateway_triage_refresh_v2() from service_role;
grant execute on function public.admin_contact_gateway_triage_refresh_v2() to authenticated;
