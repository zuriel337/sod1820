-- LIVE DATA — apply only AFTER the migration 20261105150000_account_link_offers_v1.sql. Authorized by ZURIEL on 5.11.2026
-- ("לחבר את החשבונות ... כשהוא יכנס לחשבון הישן ... להגיד לו אם אתה רוצה לאחד").
-- Basis = owner_assertion: ZURIEL stated that both accounts are the same person; this is NOT user-verified. The offer is only shown to the
-- old account when it signs in, and nothing is merged until that person proves control of both accounts and confirms.
-- Read-only check before seeding (5.11.2026): the old account 793dc271-... owns no Community/Contributor content, no credits, no research;
-- all history is already on 365fb241-... . Auth for both accounts is untouched.
insert into public.account_link_offers (primary_user_id, secondary_user_id, basis, asserted_by, note)
values ('365fb241-77ed-4a9d-98ab-4e30ab53c093', '793dc271-2194-4110-b5ff-d2422d6f1c85', 'owner_assertion', 'ZURIEL',
        'Torah Temima: account created 2026-11-04 is canonical; older Google account is offered the choice to unify history.')
on conflict (secondary_user_id) do nothing;
insert into public.account_link_events (offer_id, actor_user_id, event, detail)
select id, null, 'seeded', jsonb_build_object('by','ZURIEL','basis','owner_assertion')
  from public.account_link_offers where secondary_user_id = '793dc271-2194-4110-b5ff-d2422d6f1c85'
   and not exists (select 1 from public.account_link_events e where e.offer_id = account_link_offers.id and e.event = 'seeded');
