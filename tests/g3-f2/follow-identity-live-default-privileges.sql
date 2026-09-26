-- SOD1820 G3-F2 isolated baseline prelude.
-- Current Supabase local defaults auto-grant new public objects to client roles.
-- The live production Follow/Identity dependency objects predate those defaults and were
-- verified live with narrower ACLs. Disable current auto-grants before reconstructing them;
-- the baseline fixture then grants only the privileges observed on linswmnnkjxvweumprav.
-- Test fixture only: never copied to production migrations.

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from public, anon, authenticated, service_role;
