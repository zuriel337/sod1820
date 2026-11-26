-- Read-only acceptance after an approved apply. Expected: every row true.
select 'ga_62_rows' k, count(*)=62 ok from public.traffic_history where granularity='day' and source='ga' and period between date '2026-09-07' and date '2026-11-07'
union all select 'il_62_rows', count(*)=62 from public.traffic_history where granularity='day' and source='ga:country:IL' and period between date '2026-09-07' and date '2026-11-07'
union all select 'ga_views_60215', sum(views)=60215 from public.traffic_history where granularity='day' and source='ga' and period between date '2026-09-07' and date '2026-11-07'
union all select 'il_views_51112', sum(views)=51112 from public.traffic_history where granularity='day' and source='ga:country:IL' and period between date '2026-09-07' and date '2026-11-07'
union all select 'no_gap_ga_7_9_to_26_11', (select count(distinct period) from public.traffic_history where granularity='day' and source='ga' and period between date '2026-09-07' and current_date - 1) = (current_date - 1 - date '2026-09-07' + 1)
union all select 'notes_of_11_15_11_kept', (select count(*) from public.traffic_history where granularity='day' and source in ('ga','ga:country:IL') and period between date '2026-11-11' and date '2026-11-15' and note is not null) = 10;
