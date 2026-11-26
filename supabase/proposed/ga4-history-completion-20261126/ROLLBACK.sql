-- ROLLBACK for APPLY.sql: exact, because the guard guarantees that none of these rows existed. NOT EXECUTED.
begin;
  delete from public.traffic_history where granularity='day' and source in ('ga','ga:country:IL') and period between date '2026-09-07' and date '2026-11-07';
commit;
