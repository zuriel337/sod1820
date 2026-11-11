-- SOD1820 · ROLLBACK of 24_design_v1_v2_alignment.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
begin;

-- rollback research_workspace_law: v6 → v5 (no row is deleted; v6 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='research_workspace_law' and rule_version=6 and is_active) then
    raise exception 'rollback research_workspace_law: v6 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='research_workspace_law' and rule_version=6;
  update public.nodes set is_active=true  where type='rule' and rule_id='research_workspace_law' and rule_version=5;
end
$sod_rb$;

-- rollback sod1820_canonical_identity_law: v6 → v5 (no row is deleted; v6 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='sod1820_canonical_identity_law' and rule_version=6 and is_active) then
    raise exception 'rollback sod1820_canonical_identity_law: v6 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='sod1820_canonical_identity_law' and rule_version=6;
  update public.nodes set is_active=true  where type='rule' and rule_id='sod1820_canonical_identity_law' and rule_version=5;
end
$sod_rb$;

-- rollback logo_integrity_law: v4 → v3 (no row is deleted; v4 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='logo_integrity_law' and rule_version=4 and is_active) then
    raise exception 'rollback logo_integrity_law: v4 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='logo_integrity_law' and rule_version=4;
  update public.nodes set is_active=true  where type='rule' and rule_id='logo_integrity_law' and rule_version=3;
end
$sod_rb$;

-- rollback canonical_colors_law: v3 → v2 (no row is deleted; v3 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='canonical_colors_law' and rule_version=3 and is_active) then
    raise exception 'rollback canonical_colors_law: v3 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='canonical_colors_law' and rule_version=3;
  update public.nodes set is_active=true  where type='rule' and rule_id='canonical_colors_law' and rule_version=2;
end
$sod_rb$;

-- rollback brand_spelling_law: v2 → v1 (no row is deleted; v2 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='brand_spelling_law' and rule_version=2 and is_active) then
    raise exception 'rollback brand_spelling_law: v2 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='brand_spelling_law' and rule_version=2;
  update public.nodes set is_active=true  where type='rule' and rule_id='brand_spelling_law' and rule_version=1;
end
$sod_rb$;

commit;
