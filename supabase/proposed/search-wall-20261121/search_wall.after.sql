-- Private search wall (ZURIEL 21.11.2026): what visitors type in the gematria calculators, the Bible-code (ELS) search and
-- the site search is kept again in the existing search_log (term, value, time) and shown ONLY to admins.
-- Owner decisions: kept forever; no person link (no user, IP, session or visit id); sources gematria/els/site.
-- Public display of typed text stays forbidden (TI v9 public rule unchanged); the client still cannot read or insert
-- search_log directly (#1462 stage 1 floor unchanged): one validated writer and one admin-only reader.

alter table public.search_log add column if not exists source text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'search_log_source_check') then
    alter table public.search_log add constraint search_log_source_check check (source is null or source in ('gematria','els','site'));
  end if;
end $$;

-- Writer: validates and inserts one row. Content only: term, regular value, source. No caller identity is stored.
create or replace function public.log_search_2029(p_term text, p_value integer default null, p_source text default 'gematria')
returns void language plpgsql security definer set search_path = public as $$
declare t text := btrim(regexp_replace(coalesce(p_term, ''), '\s+', ' ', 'g'));
begin
  if p_source is null or p_source not in ('gematria','els','site') then return; end if;
  if char_length(t) < 1 or char_length(t) > 120 then return; end if;
  if t !~ '[א-תA-Za-z0-9]' then return; end if;
  insert into public.search_log(term, value, source)
  values (t, case when p_value between 0 and 9999999 then p_value end, p_source);
end $$;
revoke all on function public.log_search_2029(text, integer, text) from public;
grant execute on function public.log_search_2029(text, integer, text) to anon, authenticated;

-- Admin-only reader: the latest searches (newest first, optional source and text filter, paged by time) and the
-- most searched terms today and in the last 7 days (Israel day). Non-admins get an error, never rows.
create or replace function public.admin_search_wall_2029(p_limit integer default 200, p_source text default null,
  p_query text default null, p_before timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 200), 1), 500);
  q text := nullif(btrim(coalesce(p_query, '')), '');
  day0 timestamptz := (date_trunc('day', now() at time zone 'Asia/Jerusalem')) at time zone 'Asia/Jerusalem';
begin
  if not public.rd_is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'version', 1,
    'generated_at', now(),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('term', r.term, 'value', r.value, 'source', coalesce(r.source, 'gematria'), 'at', r.created_at) order by r.created_at desc, r.id desc)
      from (select id, term, value, source, created_at from public.search_log
            where (p_source is null or coalesce(source, 'gematria') = p_source)
              and (q is null or term ilike '%' || replace(replace(q, '%', '\%'), '_', '\_') || '%')
              and (p_before is null or created_at < p_before)
            order by created_at desc, id desc limit lim) r), '[]'::jsonb),
    'today', (select count(*) from public.search_log where created_at >= day0 and (p_source is null or coalesce(source, 'gematria') = p_source)),
    'top_today', coalesce((select jsonb_agg(jsonb_build_object('term', t.term, 'count', t.n) order by t.n desc, t.term) from (
      select term, count(*) n from public.search_log where created_at >= day0 and (p_source is null or coalesce(source, 'gematria') = p_source)
      group by term order by 2 desc, 1 limit 20) t), '[]'::jsonb),
    'top_week', coalesce((select jsonb_agg(jsonb_build_object('term', t.term, 'count', t.n) order by t.n desc, t.term) from (
      select term, count(*) n from public.search_log where created_at >= now() - interval '7 days' and (p_source is null or coalesce(source, 'gematria') = p_source)
      group by term order by 2 desc, 1 limit 20) t), '[]'::jsonb),
    'last_at', (select max(created_at) from public.search_log));
end $$;
revoke all on function public.admin_search_wall_2029(integer, text, text, timestamptz) from public;
grant execute on function public.admin_search_wall_2029(integer, text, text, timestamptz) to authenticated;
