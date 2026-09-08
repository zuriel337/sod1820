-- Authorization Bedrock root-of-trust hardening
-- A client may edit only presentation/profile fields on its own public.users row.
-- Authority-bearing fields remain server/admin controlled.

revoke update on table public.users from authenticated;

grant update (display_name, username, avatar_url)
  on table public.users
  to authenticated;
