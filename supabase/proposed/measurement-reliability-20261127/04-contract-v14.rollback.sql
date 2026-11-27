-- ROLLBACK for 04-contract-v14.sql, BY SUPERSESSION (the CL-16 rule guard refuses a revival, so v13 is never reactivated):
-- in ONE transaction retire the active v14 and insert v15 whose body is exactly the v13 body. History is kept (v13, v14 and v15 all stay). NOT APPLIED.
\set ON_ERROR_STOP on
begin;
  do $$
  begin
    if (select count(*) from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and is_active and rule_version=14) <> 1 then raise exception 'expected the active v14'; end if;
    if exists (select 1 from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and rule_version=15) then raise exception 'v15 already exists'; end if;
  end $$;
  update public.nodes set is_active=false where type='rule' and rule_id='traffic_intelligence_law' and rule_version=14 and is_active;
  insert into public.nodes(type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight)
  select n.type,n.label,
    (select description from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and rule_version=13),
    (n.metadata - 'rule_guard') || jsonb_build_object('amended','27.11.2026 rollback of v14 (the v13 body restored by supersession)','supersedes','v14'),
    true,n.rule_id,15,n.depends_on,14,n.weight
  from public.nodes n where n.type='rule' and n.rule_id='traffic_intelligence_law' and n.rule_version=14;
commit;
