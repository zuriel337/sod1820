-- Additional local-only dependencies for the live health readers. No network calls.
create schema auth;
create function auth.role() returns text language sql stable as $$ select current_setting('test.role', true) $$;
create table public.agent_token_costs (cost_usd numeric, created_at timestamptz);
create table public.vercel_usage_estimate (est_vercel_bandwidth_mb numeric, day date);
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.role() to authenticated, service_role;
set test.role = 'service_role';
