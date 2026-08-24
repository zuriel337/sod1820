-- SOD1820 — Person/Life Journey v1: "who am I" resolver for the frontend
-- The first real UI consumer of the F-1a'/F-1b Ledger backend (docs/planning/sql/
-- fn_family_private_slice.sql, fn_family_claims_phase{1,2}.sql) needs to resolve the
-- logged-in user's own persons.person_id client-side. persons is server-only (zero
-- client grants, by design — see fn_family_private_slice.sql's own header notes), and
-- no existing RPC exposes this. resolve_person()/link_identity() (pre-existing, visitor/
-- device identity resolution) create a persons row keyed by an anonymous sod_id and only
-- attach account_user_id on login — a freshly-authenticated user without prior
-- device-tracking history may not have a row yet. This function is a minimal,
-- purpose-specific, idempotent "get or create my own row" resolver — it does not touch
-- identity_edges, does not merge anything, and never creates a second row for the same
-- account_user_id (lookup-then-create, matching every other function in this Person/
-- Family track).
create or replace function public.fn_get_or_create_my_person()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_person uuid;
begin
  if v_uid is null then
    raise exception 'not authorized: authentication required';
  end if;

  select person_id into v_person from public.persons where account_user_id = v_uid limit 1;
  if v_person is not null then
    return v_person;
  end if;

  insert into public.persons (first_seen, last_seen, first_source, account_user_id)
  values (now(), now(), 'life_journey_ui', v_uid)
  returning person_id into v_person;

  return v_person;
end;
$$;

revoke all on function public.fn_get_or_create_my_person() from public;
grant execute on function public.fn_get_or_create_my_person() to authenticated;
