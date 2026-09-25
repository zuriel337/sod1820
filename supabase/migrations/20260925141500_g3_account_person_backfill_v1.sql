-- G3 Account → Person Completeness — one-time idempotent account backfill.
-- Depends on persons_account_user_id_unique and locked account writers.
--
-- Scope: every public.users account that currently has no account-bound Person.
-- This intentionally includes sparse/inactive accounts: account existence itself is the
-- same eligibility criterion used by fn_get_or_create_my_person().
--
-- Temporal semantics:
--   * first_seen = account creation time. We do NOT backdate identity merely because a
--     research row has the same user_id; pre-account historical identity is materialized
--     separately through governed Contributor/Claim provenance.
--   * last_seen may extend to account-keyed activity/contribution evidence.
--
-- No identity_edges are created by this account-only backfill.
-- Different Auth accounts remain different Persons; no cross-account merge is performed.

insert into public.persons (
  first_seen,
  last_seen,
  first_source,
  first_app_context,
  account_user_id
)
select
  coalesce(u.created_at, now()) as first_seen,
  greatest(
    coalesce(u.created_at, now()),
    coalesce(
      (select max(ua.created_at)
         from public.user_activity ua
        where ua.user_id = u.id),
      coalesce(u.created_at, now())
    ),
    coalesce(
      (select max(rc.created_at)
         from public.research_contributions rc
        where rc.author_user_id = u.id),
      coalesce(u.created_at, now())
    )
  ) as last_seen,
  'account_backfill_2029'::text as first_source,
  'people_2029'::text as first_app_context,
  u.id as account_user_id
from public.users u
where not exists (
  select 1
  from public.persons p
  where p.account_user_id = u.id
)
on conflict (account_user_id)
  where account_user_id is not null
do nothing;
