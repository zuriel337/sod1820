-- G3_WORLD_HUMAN_GATE_ALL_RESEARCH_V1
-- Human Gate may inspect every research_contributions row through the ordinary
-- authenticated client. This widens no public access and grants no write authority.
--
-- Owner: research_contribution_law v9 + truth_axes_foundation_law v3.
-- Access only: governance/publication fields are not mutated by this migration.

begin;

drop policy if exists research_contributions_admin_read on public.research_contributions;

create policy research_contributions_admin_read
on public.research_contributions
for select
to authenticated
using ((select public.rd_is_admin()));

commit;
