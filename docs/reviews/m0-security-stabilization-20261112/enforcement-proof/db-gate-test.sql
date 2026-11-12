
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
\i GUARD_FILE
create trigger trg_rule_compaction_integrity_guard_v1 before insert or update of is_active, metadata, rule_id, rule_version, supersedes_version on public.nodes
  for each row execute function fn_rule_compaction_integrity_guard_v1();
select 'GUARD md5 ' || md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure));
create function pg_temp.m(owner text, res text, gate text default null) returns jsonb language sql as $$
  select jsonb_build_object('g3_disposition_v1', jsonb_build_object('classification','KEEP_CANONICAL_OWNER'),
    'compaction_v1', jsonb_build_object('canonical_owner', owner),
    'owner_routing', jsonb_strip_nulls(jsonb_build_object('canonical_owner', owner, 'resolution', res, 'human_gate', gate))) $$;
-- seed (written with the trigger disabled, like existing live rows)
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1;
insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values
 ('rule','owner A','owner_a_law',1,true,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','retired R','retired_r_law',1,false,pg_temp.m('retired_r_law','RESOLVED')),
 ('rule','legacy child','legacy_child_law',1,true,pg_temp.m('owner_a_law','RESOLVED_G2_COMPACTION'));
alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1;
create temp table result(case_id text, outcome text);
create function pg_temp.try(c text, q text) returns void language plpgsql as $$
declare v text;
begin
  begin execute q; v := 'ALLOWED'; raise exception 'rollback-probe';
  exception when others then
    if sqlerrm <> 'rollback-probe' then v := 'REFUSED: ' || left(sqlerrm, 90); end if;
  end;
  insert into result values (c, v);
end $$;
select pg_temp.try('D1 second active version of owner_a_law', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','dup','owner_a_law',2,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D2 VALID new version v2 (v1 retired first, same owner)', $q$update public.nodes set is_active=false where rule_id='owner_a_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','A v2','owner_a_law',2,1,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D3 new family duplicating owner_a_law, no verdict', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','dup family','owner_a_copy_law',1,true,pg_temp.m('owner_a_copy_law','RESOLVED'))$q$);
select pg_temp.try('D4 VALID new scoped child extending active owner_a_law', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','owner_a_child_law',1,true,pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D5 new child routed to RETIRED retired_r_law', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child of retired','retired_child_law',1,true,pg_temp.m('retired_r_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D6 contract change v2 silently moves the owner', $q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('someone_else_law','RESOLVED'))$q$);
select pg_temp.try('D7 VALID contract change v2 moves owner via SUPERSEDE_EXISTING + human_gate', $q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('owner_a_law','SUPERSEDE_EXISTING','ZURIEL 12.11.2026 msg-ref'))$q$);
select pg_temp.try('D8 VALID metadata touch on an existing active row (legacy verdict)', $q$update public.nodes set metadata = metadata || '{"note":"x"}' where rule_id='legacy_child_law' and is_active$q$);
select pg_temp.try('D9a GENUINELY_NEW_DOMAIN without human_gate', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','new','new_domain_law',1,true,pg_temp.m('new_domain_law','GENUINELY_NEW_DOMAIN'))$q$);
select pg_temp.try('D9b VALID GENUINELY_NEW_DOMAIN with human_gate', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','new','new_domain_law',1,true,pg_temp.m('new_domain_law','GENUINELY_NEW_DOMAIN','ZURIEL 12.11.2026 msg-ref'))$q$);
select case_id || ' => ' || outcome from result order by case_id;
