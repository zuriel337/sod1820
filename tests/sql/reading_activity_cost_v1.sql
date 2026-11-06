\set ON_ERROR_STOP on
-- Cost per outcome of ingest_reading_activity_v1: row writes (exact, from pg_stat_xact), wall time, bytes stored. Disposable DB only.
create function t.writes() returns bigint language sql as $$
  select coalesce(sum(n_tup_ins + n_tup_upd + n_tup_del), 0) from pg_stat_xact_all_tables
  where relname in ('edge_rate_limit_buckets', 'reading_activity_ids', 'reading_activity_outcomes', 'events_cur', 'events_prev', 'events_default') $$;
create table t.cost (outcome text, calls int, row_writes numeric, ms numeric);
create function t.prefill(p_key text, p_count int) returns void language sql as $$
  insert into private.edge_rate_limit_buckets(key_hash, bucket, count) values (p_key, floor(extract(epoch from clock_timestamp()) / 60)::bigint, p_count)
  on conflict (key_hash, bucket) do update set count = excluded.count $$;
do $$
declare
  n constant int := 100;
  big jsonb := jsonb_build_object('schema', 1, 'activity_event_id', gen_random_uuid(), 'activity_session', gen_random_uuid(), 'length_bucket', '4-8', 'entry', 'direct', 'surface_kind', 'calculator', 'pad', repeat('x', 1000000));
  dup uuid := gen_random_uuid(); addr_key text := encode(sha256(convert_to('reading-activity-v1|a|10.1.1.1', 'utf8')), 'hex'); glob_key text := encode(sha256(convert_to('reading-activity-v1|global', 'utf8')), 'hex');
  o text; i int; w0 bigint; t0 timestamptz; tot_w bigint; tot_ms numeric; r jsonb;
begin
  perform t.call_as('anon', '10.1.1.2', null, 'first_compute', '/gematria', 'chrome', t.props(dup));
  foreach o in array array['recorded', 'duplicate', 'rejected_schema', 'rejected_size', 'rate_limited_address', 'rate_limited_global', 'no_address'] loop
    tot_w := 0; tot_ms := 0;
    for i in 1..n loop
      delete from private.edge_rate_limit_buckets;
      if o = 'rate_limited_address' then perform t.prefill(addr_key, 60); end if;
      if o = 'rate_limited_global' then perform t.prefill(glob_key, 120); end if;
      w0 := t.writes(); t0 := clock_timestamp();
      r := case o
        when 'recorded' then t.call_as('anon', '10.1.1.1', null, 'first_compute', '/gematria', 'chrome', t.props())
        when 'duplicate' then t.call_as('anon', '10.1.1.1', null, 'first_compute', '/gematria', 'chrome', t.props(dup))
        when 'rejected_schema' then t.call_as('anon', '10.1.1.1', null, 'compute', '/gematria', 'chrome', t.props())
        when 'rejected_size' then t.call_as('anon', '10.1.1.1', null, 'first_compute', '/gematria', 'chrome', big)
        when 'rate_limited_address' then t.call_as('anon', '10.1.1.1', null, 'first_compute', '/gematria', 'chrome', t.props())
        when 'rate_limited_global' then t.call_as('anon', '10.1.1.1', null, 'first_compute', '/gematria', 'chrome', t.props())
        else t.call_as('anon', null, null, 'first_compute', '/gematria', 'chrome', t.props()) end;
      tot_ms := tot_ms + extract(milliseconds from clock_timestamp() - t0);
      tot_w := tot_w + (t.writes() - w0);
    end loop;
    insert into t.cost values (o, n, round(tot_w::numeric / n, 2), round(tot_ms / n, 2));
  end loop;
end $$;
select outcome, calls, row_writes, ms as avg_ms_per_call from t.cost order by row_writes desc, outcome;
select 'bytes stored per recorded call: event row ' || (select round(avg(pg_column_size(e.*))) from public.events e where props->>'beacon' = 'v1')
  || ' + key row ' || (select round(avg(pg_column_size(k.*))) from public.reading_activity_ids k) as storage;
do $$ begin
  assert (select row_writes from t.cost where outcome = 'recorded') <= 4, 'cost: recorded is at most 4 row writes (address bucket, global bucket, key, event)';
  assert (select row_writes from t.cost where outcome = 'duplicate') <= 3, 'cost: duplicate is at most 3 row writes';
  assert (select max(row_writes) from t.cost where outcome in ('rejected_schema', 'rejected_size', 'rate_limited_address')) <= 2, 'cost: refusals before the global check are at most 2 row writes';
  assert (select row_writes from t.cost where outcome = 'rate_limited_global') <= 3, 'cost: global refusal is at most 3 row writes';
  assert (select row_writes from t.cost where outcome = 'no_address') <= 1, 'cost: no address is at most 1 row write';
  assert (select ms from t.cost where outcome = 'rejected_size') < 50, 'cost: a 1 MB payload is refused in well under 50 ms';
end $$;
