-- G3 cache / billable acceptance over the existing analytics_cache KV.
-- No Cache System 2. Operational KV rows (heartbeat/egress/canary override) remain outside memoization semantics.

alter table public.analytics_cache
  add column if not exists cache_kind text,
  add column if not exists producer text,
  add column if not exists producer_version text,
  add column if not exists input_identity text,
  add column if not exists expires_at timestamptz,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidation_reason text,
  add column if not exists billable_state text,
  add column if not exists hit_count bigint not null default 0,
  add column if not exists last_hit_at timestamptz;

alter table public.analytics_cache
  add constraint analytics_cache_billable_state_v1_check
  check (billable_state is null or billable_state in ('NOT_BILLABLE','PROVIDER_BILLABLE','PROVIDER_NON_BILLABLE','UNKNOWN'));

alter table public.analytics_cache
  add constraint analytics_cache_memoized_contract_v1_check
  check (
    cache_kind is distinct from 'memoized_result'
    or (
      producer is not null and producer_version is not null and input_identity is not null
      and expires_at is not null and billable_state is not null
    )
  );

create or replace function public.analytics_cache_producer_version_v1(p_producer text)
returns text
language plpgsql
stable
security invoker
set search_path to ''
as $$
declare
  v_n int;
  v_hash text;
begin
  select count(*), min(md5(pg_catalog.pg_get_functiondef(p.oid)))
    into v_n,v_hash
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=p_producer and p.prokind='f';
  if v_n <> 1 then return null; end if;
  return v_hash;
end
$$;

create or replace function public.analytics_cache_get_v1(p_key text,p_producer text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_payload jsonb;
  v_version text;
begin
  v_version := public.analytics_cache_producer_version_v1(p_producer);
  if v_version is null then return null; end if;

  select c.payload into v_payload
  from public.analytics_cache c
  where c.cache_key=p_key
    and c.cache_kind='memoized_result'
    and c.producer=p_producer
    and c.producer_version=v_version
    and c.input_identity=p_key
    and c.invalidated_at is null
    and c.expires_at > now();

  if v_payload is not null then
    update public.analytics_cache
       set hit_count=hit_count+1,last_hit_at=now()
     where cache_key=p_key
       and producer_version=v_version
       and invalidated_at is null;
  end if;
  return v_payload;
end
$$;

create or replace function public.analytics_cache_invalidate_v1(p_key text,p_reason text)
returns boolean
language plpgsql
volatile
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_n int;
begin
  if p_reason is null or length(btrim(p_reason))<3 then
    raise exception 'invalidation reason required';
  end if;
  update public.analytics_cache
     set invalidated_at=now(),invalidation_reason=left(p_reason,300)
   where cache_key=p_key and cache_kind='memoized_result' and invalidated_at is null;
  get diagnostics v_n=row_count;
  return v_n>0;
end
$$;

revoke all on function public.analytics_cache_producer_version_v1(text) from public,anon,authenticated;
revoke all on function public.analytics_cache_get_v1(text,text) from public,anon,authenticated;
revoke all on function public.analytics_cache_invalidate_v1(text,text) from public,anon,authenticated;

create or replace function public.analytics_cache_contract_write_guard_v1()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_prefix text := split_part(new.cache_key,':',1);
  v_producer text;
  v_ttl interval;
  v_version text;
begin
  if v_prefix in (
    'admin_entries_breakdown','admin_funnel','admin_live_visitors','admin_real_traffic',
    'admin_realtime_now','admin_retention','admin_traffic_insights','arrival_sources',
    'recent_number_opens_clean_v1','visits_stats'
  ) then
    raise exception 'legacy unversioned memoization key rejected: %',new.cache_key;
  end if;

  v_producer := case v_prefix
    when 'admin_entries_breakdown_v2' then 'admin_entries_breakdown'
    when 'admin_funnel_v2' then 'admin_funnel'
    when 'admin_live_visitors_v2' then 'admin_live_visitors'
    when 'admin_real_traffic_v2' then 'admin_real_traffic'
    when 'admin_realtime_now_v2' then 'admin_realtime_now'
    when 'admin_retention_v2' then 'admin_retention'
    when 'admin_traffic_insights_v2' then 'admin_traffic_insights'
    when 'arrival_sources_v2' then 'arrival_sources'
    when 'recent_number_opens_clean_v1_v2' then 'recent_number_opens'
    when 'visits_stats_v2' then 'visits_stats'
    else null
  end;

  if v_producer is null then return new; end if;

  v_ttl := case v_prefix
    when 'admin_live_visitors_v2' then interval '60 seconds'
    when 'admin_realtime_now_v2' then interval '30 seconds'
    when 'admin_retention_v2' then interval '15 minutes'
    when 'recent_number_opens_clean_v1_v2' then interval '20 minutes'
    else interval '10 minutes'
  end;

  v_version := public.analytics_cache_producer_version_v1(v_producer);
  if v_version is null then
    raise exception 'cache producer % is ambiguous or unavailable',v_producer;
  end if;

  new.cache_kind := 'memoized_result';
  new.producer := v_producer;
  new.producer_version := v_version;
  new.input_identity := new.cache_key;
  new.expires_at := now()+v_ttl;
  new.invalidated_at := null;
  new.invalidation_reason := null;
  new.billable_state := 'NOT_BILLABLE';
  new.hit_count := 0;
  new.last_hit_at := null;
  return new;
end
$$;

revoke all on function public.analytics_cache_contract_write_guard_v1() from public,anon,authenticated;

create trigger trg_analytics_cache_contract_write_v1
before insert or update of cache_key,payload,computed_at
on public.analytics_cache
for each row execute function public.analytics_cache_contract_write_guard_v1();

do $$
declare
  r record;
  v_oid oid;
  v_def text;
  v_new text;
  v_pattern text;
begin
  for r in
    select * from (values
      ('admin_entries_breakdown','admin_entries_breakdown:','admin_entries_breakdown_v2:'),
      ('admin_funnel','admin_funnel:','admin_funnel_v2:'),
      ('admin_live_visitors','admin_live_visitors:','admin_live_visitors_v2:'),
      ('admin_real_traffic','admin_real_traffic:','admin_real_traffic_v2:'),
      ('admin_realtime_now','admin_realtime_now:','admin_realtime_now_v2:'),
      ('admin_retention','admin_retention:','admin_retention_v2:'),
      ('admin_traffic_insights','admin_traffic_insights:','admin_traffic_insights_v2:'),
      ('arrival_sources','arrival_sources:','arrival_sources_v2:'),
      ('recent_number_opens','recent_number_opens_clean_v1:','recent_number_opens_clean_v1_v2:'),
      ('visits_stats','visits_stats:','visits_stats_v2:')
    ) x(proname,old_prefix,new_prefix)
  loop
    select p.oid,pg_catalog.pg_get_functiondef(p.oid)
      into v_oid,v_def
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=r.proname and p.prokind='f';

    if v_oid is null then raise exception 'cache producer % missing',r.proname; end if;

    v_new := replace(v_def, quote_literal(r.old_prefix), quote_literal(r.new_prefix));

    v_pattern := 'select[[:space:]]+payload[[:space:]]+into[[:space:]]+([a-z_]+)[[:space:]]+from[[:space:]]+public[.]analytics_cache[[:space:]]+where[[:space:]]+cache_key[[:space:]]*=[[:space:]]*v_key[[:space:]]+and[[:space:]]+computed_at[[:space:]]*>[[:space:]]*now[(][)][[:space:]]*-[[:space:]]*interval[[:space:]]*''[^'']+''[[:space:]]*;';
    v_new := regexp_replace(
      v_new,
      v_pattern,
      'select public.analytics_cache_get_v1(v_key, '''||r.proname||''') into \1;',
      'i'
    );

    if v_new=v_def or position('analytics_cache_get_v1' in v_new)=0
       or position(r.new_prefix in v_new)=0 then
      raise exception 'cache producer % patch failed closed',r.proname;
    end if;
    execute v_new;
  end loop;
end $$;

create or replace function public._analytics_cache_on()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select coalesce((select enabled from public.analytics_cache_control where id=1),true)
    and not exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname <> '_analytics_cache_on'
        and p.prosrc ilike '%_analytics_cache_on%'
        and p.prosrc not ilike '%analytics_cache_get_v1%'
    )
$$;
