-- ============================================================
--  NameLab — internal quality board (freeze advanced tier, measure first)
--  Zuriel: don't build the bridges skeleton — instead learn from real usage.
--  Logs every name search (dev telemetry): how many tracks returned, the
--  evidence mix (direct/value_match), consensus count, per-track fire rate,
--  and elapsed time — so we know where to invest before adding more layers.
-- ============================================================
create table if not exists public.name_research_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name_norm text, name_len int, lang text,
  has_surname boolean, has_birthdate boolean, has_question boolean,
  literal_full_found boolean,
  tracks_total int, tracks_ok int, direct_ok int, value_match_ok int, consensus_count int,
  elapsed_ms int,
  track_status jsonb          -- [{id,status,evidence}] → per-track fire-rate
);
alter table public.name_research_log enable row level security;   -- server-only; written via the definer RPC
create index if not exists nrl_created on public.name_research_log(created_at desc);

create or replace function public.fn_log_name_research(p_doc jsonb, p_ms int default null)
returns void language sql security definer set search_path=public as $$
  insert into public.name_research_log(name_norm, name_len, lang, has_surname, has_birthdate, has_question,
    literal_full_found, tracks_total, tracks_ok, direct_ok, value_match_ok, consensus_count, elapsed_ms, track_status)
  select
    left(coalesce(p_doc#>>'{input,components,full}',''),80),
    char_length(regexp_replace(coalesce(p_doc#>>'{input,components,full}',''),'\s','','g')),
    p_doc#>>'{input,language}',
    coalesce(btrim(p_doc#>>'{input,surname}'),'') <> '',
    coalesce(btrim(p_doc#>>'{input,birthdate}'),'') <> '',
    (p_doc->'question') is not null and p_doc->'question' <> 'null'::jsonb,
    (p_doc->>'literal_full_found')::boolean,
    (select count(*) from jsonb_array_elements(coalesce(p_doc->'tracks','[]'::jsonb))),
    (select count(*) from jsonb_array_elements(coalesce(p_doc->'tracks','[]'::jsonb)) t where t->>'status'='ok'),
    (select count(*) from jsonb_array_elements(coalesce(p_doc->'tracks','[]'::jsonb)) t where t->>'status'='ok' and t->>'evidence'='direct'),
    (select count(*) from jsonb_array_elements(coalesce(p_doc->'tracks','[]'::jsonb)) t where t->>'status'='ok' and t->>'evidence'='value_match'),
    jsonb_array_length(coalesce(p_doc->'consensus','[]'::jsonb)),
    p_ms,
    (select jsonb_agg(jsonb_build_object('id',t->>'id','status',t->>'status','evidence',t->>'evidence')) from jsonb_array_elements(coalesce(p_doc->'tracks','[]'::jsonb)) t)
  where coalesce(p_doc#>>'{input,components,full}','') <> '';
$$;
grant execute on function public.fn_log_name_research(jsonb,int) to anon, authenticated;

create or replace function public.fn_name_research_stats(p_days int default 30)
returns jsonb language sql stable security definer set search_path=public as $$
  with base as (select * from name_research_log where created_at > now() - (p_days||' days')::interval)
  select jsonb_build_object(
    'days', p_days,
    'total_searches', (select count(*) from base),
    'with_surname', (select count(*) from base where has_surname),
    'with_birthdate', (select count(*) from base where has_birthdate),
    'with_question', (select count(*) from base where has_question),
    'literal_hit_rate', (select round(100.0*count(*) filter (where literal_full_found)/nullif(count(*),0),1) from base),
    'avg', (select jsonb_build_object(
        'tracks_ok', round(avg(tracks_ok),1), 'direct_ok', round(avg(direct_ok),1),
        'value_match_ok', round(avg(value_match_ok),1), 'consensus', round(avg(consensus_count),1),
        'elapsed_ms', round(avg(elapsed_ms),0)) from base),
    'per_track', (select jsonb_agg(jsonb_build_object('track',id,'fired_pct',pct,'fired',fired,'of',tot) order by pct desc)
       from (select ts->>'id' id,
                    count(*) filter (where ts->>'status'='ok') fired, count(*) tot,
                    round(100.0*count(*) filter (where ts->>'status'='ok')/nullif(count(*),0),1) pct
             from base, jsonb_array_elements(coalesce(track_status,'[]'::jsonb)) ts
             group by ts->>'id') q)
  );
$$;
grant execute on function public.fn_name_research_stats(int) to authenticated;
