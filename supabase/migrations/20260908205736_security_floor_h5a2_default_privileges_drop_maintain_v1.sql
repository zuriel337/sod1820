-- H5 STEP 1b — remove the residual MAINTAIN default (PG17) for anon/authenticated.
-- MAINTAIN permits VACUUM/ANALYZE/CLUSTER/REINDEX/REFRESH MATVIEW. It is not a data-access
-- or data-destruction privilege, but there is no reason for a browser role to hold it.
-- After this the postgres default for public tables grants anon/authenticated nothing,
-- so every new table must receive an explicit, deliberate GRANT — which is exactly what
-- rls_client_read_protocol v2 already requires ("policy AND grant, per feature").
-- Reversible: alter default privileges ... grant maintain on tables to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke maintain on tables from anon, authenticated;
