-- G3 People 2029 — supporting index for canonical researcher_reputation().
-- Branch-only candidate. Live first-create should use CONCURRENTLY because contribution_links is active.
-- Fresh/replay DBs may use this idempotent form through normal migration tooling.

create index if not exists contribution_links_created_by_idx
  on public.contribution_links(created_by)
  where created_by is not null;

comment on index public.contribution_links_created_by_idx is
  'Supports researcher_reputation links_made / contributor provenance lookups by created_by. No ranking semantics are changed.';
