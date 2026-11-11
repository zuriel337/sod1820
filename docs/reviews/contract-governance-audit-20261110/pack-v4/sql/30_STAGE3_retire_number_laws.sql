-- SOD1820 · STAGE 3 — deactivate number_page_law v1 and no_row_without_number_law v1 — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
-- RUN ONLY AFTER 20_number_principles_to_2029_owners.sql was applied AND verified (successor checks below enforce it).
-- Effect: is_active=false only (number_page_law carries metadata.immutable=true — its row content is not touched). Provenance lives in the successors' metadata and in the BEFORE/AFTER work_log.
begin;
do $sod_blk$
declare n int;
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='platform_tiers_law' and is_active and rule_version >= 6
                  and description like '%NUMBER VISIBLE, DEPTH GATED%' and metadata ? 'v6_number_visible_depth_gated') then
    raise exception 'S30: successor missing — platform_tiers_law v6 §19 not active'; end if;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='canonical_methods_registry_law' and is_active and rule_version >= 7
                  and description like '%VALUE BESIDE A GEMATRIA MATCH ROW%' and metadata ? 'v7_value_beside_gematria_match_row') then
    raise exception 'S30: successor missing — canonical_methods_registry_law v7 §26 not active'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='number_page_law' and rule_version=1 and is_active and md5(description)='bad06d43f99af1b9364ca53e89ddfd98' for update;
  if not found then raise exception 'S30: number_page_law v1 drift or not active'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='no_row_without_number_law' and rule_version=1 and is_active and md5(description)='bea683c751c32801e35cdcd3311853a1' for update;
  if not found then raise exception 'S30: no_row_without_number_law v1 drift or not active'; end if;
  update public.nodes set is_active=false
   where type='rule' and is_active and ((rule_id='number_page_law' and rule_version=1) or (rule_id='no_row_without_number_law' and rule_version=1));
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'S30: expected 2 rows, updated %', n; end if;
end
$sod_blk$;
commit;
