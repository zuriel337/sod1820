-- PROPOSED — NOT APPLIED. Requires the 20261108090000 migration and ZURIEL's explicit approval.
-- Human Gate decision (ZURIEL, 8.11.2026): these three chat messages enter the tree.
--   ed9fc8bb…  Jasha8, 28.10  — 77.7% turnout / Netanyahu 77 / the sevens
--   6aab5c61…  אמילי, 28.10    — 26 mandates = י-ה-ו-ה   (representative of the 26 = הויה cluster; swap if another is wanted)
--   5326eaf7…  Esther26, 25.10 — "מחזיק ימינך" + 541 / 521 / 182 / 162 (all differ by 20)
-- Order of entry sets the order of the pinned line: the last row entered is the one shown first.
insert into public.community_tree_hints (contribution_id, entered_at)
select r.id, v.at
from (values
  ('5326eaf7-146c-49b6-8176-42fef3c79fd6'::uuid, now() - interval '2 minutes'),
  ('6aab5c61-50b7-4170-8c98-bc39c8599f2f'::uuid, now() - interval '1 minute'),
  ('ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'::uuid, now())
) as v(id, at)
join public.research_contributions r on r.id = v.id
where r.status = 'approved' and r.deleted_at is null
on conflict (contribution_id) do nothing;
