-- GA4 property id server config via existing Supabase Vault.
-- OWNER CHECK: EXTEND_EXISTING traffic_intelligence_law.
-- No new store/table/connector. Server-only config reader for ga-sync-server.

create or replace function public.ga_sync_config()
returns table(property_id text)
language sql
security definer
set search_path to ''
as $$
  select (
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'GA_PROPERTY_ID'
    order by created_at desc
    limit 1
  )::text as property_id;
$$;

revoke all on function public.ga_sync_config() from public;
revoke all on function public.ga_sync_config() from anon;
revoke all on function public.ga_sync_config() from authenticated;
grant execute on function public.ga_sync_config() to service_role, postgres;

comment on function public.ga_sync_config() is
  'Server-only Traffic Intelligence config reader for GA_PROPERTY_ID stored in Supabase Vault.';
