-- SOD1820 · ROLLBACK of 20_number_principles_to_2029_owners.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
begin;

-- rollback canonical_methods_registry_law: v7 → v6 (no row is deleted; v7 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='canonical_methods_registry_law' and rule_version=7 and is_active) then
    raise exception 'rollback canonical_methods_registry_law: v7 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='canonical_methods_registry_law' and rule_version=7;
  update public.nodes set is_active=true  where type='rule' and rule_id='canonical_methods_registry_law' and rule_version=6;
end
$sod_rb$;

-- rollback platform_tiers_law: v6 → v5 (no row is deleted; v6 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='platform_tiers_law' and rule_version=6 and is_active) then
    raise exception 'rollback platform_tiers_law: v6 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='platform_tiers_law' and rule_version=6;
  update public.nodes set is_active=true  where type='rule' and rule_id='platform_tiers_law' and rule_version=5;
end
$sod_rb$;

commit;
