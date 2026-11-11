-- SOD1820 · 18c · ROLLBACK of 11c: system_suggestions_law back to v6. PROPOSAL ONLY. NOT EXECUTED.
-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4).
-- ORDER: 1st of the rollback. ROLLBACK_20261111120000_admin_suggestion_decide.sql refuses until this has run.
-- v7 is deactivated and v6 reactivated; the v7 row stays as inactive history; nothing is deleted.
-- One statement (one DO block), all or nothing. Refuses unless v7 is exactly the version 11c wrote and v6 is unchanged.
do $sod_18c$
begin
  perform set_config('search_path', 'public', true);
  perform 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' for update;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=7 and supersedes_version=6 and md5(description)='a594e1fe21d41c644961771353b23934' and md5(metadata::text)='d2236c320e6b312b0bf57b5fb12a5582') <> 1 then
    raise exception '18c refused: the active system_suggestions_law is not the v7 written by 11c';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=6 and not is_active and md5(description)='98d4d88e16d2ec5f70dac6e5a7f98ea5' and md5(metadata::text)='f4e5216a8eb44645ea0978b35161a82e') <> 1 then
    raise exception '18c refused: the v6 history row is missing or changed';
  end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 7) then
    raise exception '18c refused: a version above v7 exists';
  end if;
  update public.nodes set is_active=false where type='rule' and rule_id='system_suggestions_law' and rule_version=7;
  update public.nodes set is_active=true  where type='rule' and rule_id='system_suggestions_law' and rule_version=6;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=6 and md5(description)='98d4d88e16d2ec5f70dac6e5a7f98ea5' and md5(metadata::text)='f4e5216a8eb44645ea0978b35161a82e') <> 1
     or (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then
    raise exception '18c failed after apply: v6 is not the single active version; the statement is rolled back';
  end if;
  raise notice '18c applied: system_suggestions_law v6 active again; v7 kept as inactive history';
end
$sod_18c$;
