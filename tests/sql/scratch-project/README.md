# Scratch-project acceptance (real Supabase platform, synthetic data)

Purpose: prove `coordination_read_current` on a real Supabase project (real `auth.users`, `auth.uid()`, PostgREST roles and default privileges) without touching production and without replaying the site's migration history.

1. In the Supabase dashboard create a **new, empty** project (any region, free tier is fine). Do NOT use a branch of the production project.
2. Copy its direct connection string (Settings → Database).
3. `SCRATCH_DB_URL='postgresql://postgres:<pw>@db.<scratch-ref>.supabase.co:5432/postgres' tests/sql/scratch-project/run.sh`
   The script refuses to run against the production ref or any DB that already has site tables.
4. Expected last line: `SQL_PASS`. Send the full output (no secrets) back for the evidence record.
5. Optional end-to-end: deploy `supabase/functions/coordination-mcp` to the scratch project, create an Auth user, set `raw_app_meta_data.sod1820_coordination_reader=true` via the Admin API, enable OAuth 2.1, and run the acceptance script in `docs/coordination-reader-gateway-v1.md` from a fresh ChatGPT session against the scratch URL.
6. Delete the scratch project afterwards.

Notes: seed inserts `(id, raw_app_meta_data)` into `auth.users`; if your project's `auth.users` rejects that, add the NOT NULL columns it names (e.g. `instance_id`, `aud`, `role`). `01_schema.sql` mirrors production's `work_log` columns, admin-only RLS policy and ACLs (authenticated SELECT on `work_log` only; none on the view).
