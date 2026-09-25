-- G3 Account → Person Completeness — account uniqueness invariant.
-- Branch-only candidate. Production apply protocol is special because public.persons is hot:
--   1) re-run the duplicate preflight immediately before production DDL;
--   2) create this index CONCURRENTLY outside a migration transaction;
--   3) later migration replay uses IF NOT EXISTS and is therefore idempotent.
--
-- Fresh/test databases may execute this plain form inside the normal migration runner.
--
-- EXTEND_EXISTING: one authenticated account_user_id may own at most one canonical Person.
-- NULL remains allowed for anonymous/historical Persons.

do $preflight$
begin
  if exists (
    select 1
    from public.persons p
    where p.account_user_id is not null
    group by p.account_user_id
    having count(*) > 1
  ) then
    raise exception 'persons.account_user_id uniqueness preflight failed: duplicate account Persons exist';
  end if;
end
$preflight$;

create unique index if not exists persons_account_user_id_unique
  on public.persons (account_user_id)
  where account_user_id is not null;

comment on index public.persons_account_user_id_unique is
  'Person Foundation 2029 invariant: one canonical Person at most per non-null account_user_id. Production first-create is performed CONCURRENTLY because persons is a hot write path.';
