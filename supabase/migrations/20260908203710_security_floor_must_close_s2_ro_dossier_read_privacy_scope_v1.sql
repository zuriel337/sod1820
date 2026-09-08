-- Security Floor MUST-CLOSE S2 — ro_dossier_read must honour the privacy axis.
-- truth_axes_foundation_law INVARIANT P3: an OR-ed policy producing world-readability
-- is an ACCESS FACT, not a publication decision. A missing gate is not consent.
-- The policy never consulted privacy_scope, so 297 rows with privacy_scope='private'
-- were anon-readable. Live vocabulary reverified before write: only 'private' (543)
-- and 'public_candidate' (159) exist; CHECK allows private|family_shared|public_candidate.
-- Narrowed to the canonical public value only. No row is promoted, no privacy widened.
-- Admin access is untouched (ro_admin_read); service_role bypasses RLS as before.
-- Reversible: recreate without the privacy_scope predicate.

drop policy if exists ro_dossier_read on public.research_objects;

create policy ro_dossier_read on public.research_objects
  for select
  using (
    privacy_scope = 'public_candidate'
    and coalesce(((meta -> 'ext') -> 'writer_dossier') ->> 'visible', 'false') = 'true'
    and exists (
      select 1 from public.contributors c
      where c.display_name = research_objects.contributor
        and coalesce(c.dossier_settings ->> 'visibility', 'public') <> 'private'
    )
  );
