-- H2 — editorial suppression was enforced only in the curated view topic_cards_public,
-- never at the table. Policy topic_cards_public_read allowed anon/authenticated to read
-- EVERY status='approved' row, including rows flagged findings->>'_do_not_publish'.
-- The view already filters them; the table did not, so a direct PostgREST read bypassed
-- the editorial decision. Narrow the table policy to match the view.
-- Public consumers all read the VIEW (topicConvergence.js, researchViewerProjection.js,
-- contributions.js, ContributorPage, TimelinePage) so view semantics are preserved.
-- Admins keep full access through topic_cards_admin_write (FOR ALL).
-- Reversible: recreate with using (status = 'approved') only.

drop policy if exists topic_cards_public_read on public.topic_cards;

create policy topic_cards_public_read on public.topic_cards
  for select
  using (
    status = 'approved'
    and coalesce((findings ->> '_do_not_publish')::boolean, false) = false
  );
