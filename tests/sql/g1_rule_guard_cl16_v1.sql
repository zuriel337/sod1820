-- Throwaway-Postgres lifecycle test for supabase/proposed/20261112200000_g1_rule_guard_cl16.sql and its ROLLBACK (never a live project).
-- The simulated state is the state AFTER M0: M0 changes none of these objects (the runner checks that no file of the M0 apply plan
-- mentions public.nodes or the rule guard), so the post-M0 state of public.nodes and its guard is the live 12.11.2026 state.
-- G0 no function: the proposal and the rollback both stop and create nothing.
-- G1 the live fixture is byte-identical to live (md5 56b90b0a...) with the live trigger text.
-- G2 drift before apply (a changed body): the proposal and the rollback both stop, nothing changes.
-- G3 apply: exact AFTER state; rule identity, revival, retirement stamp and non-rule rows behave as reviewed.
-- G4 apply again: a no-op.
-- G5 drift after apply (a changed trigger): the proposal and the rollback both stop.
-- G6 rollback: the exact live state again; rollback again: a no-op; G7 apply again after the rollback works.
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
insert into public.work_log values ('11111111-2222-4333-8444-555555555555', 'ZURIEL approval: revived_law', 'fixture');
create function pg_temp.state() returns text language sql as $$
  select coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_rule_compaction_integrity_guard_v1()')), 'none')
    || ' | ' || coalesce((select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1'), 'none')
    || ' | ' || coalesce((select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate'), 'none') $$;
create function pg_temp.refused(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if position(msg in sqlerrm) > 0 then return; end if;
    raise exception 'refused for another reason: % (expected %)', sqlerrm, msg;
  end;
  raise exception 'NOT REFUSED: %', q;
end $$;

-- G0
\set ON_ERROR_STOP off
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = 'none | none | none', 'G0: nothing may be created: ' || pg_temp.state(); end $$;

-- G1
\i tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
create temp table live_state as select pg_temp.state() as s;
do $$ begin
  assert (select s from live_state) = '56b90b0ae0f9c5915b730314d13ca7a0 | CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() | none',
    'G1: the fixture is the live 12.11.2026 state: ' || (select s from live_state);
end $$;

-- G2 a changed body (one comment line in another clause)
create table g2_saved as select pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure) as def;
do $$ begin execute replace((select def from g2_saved), 'begin', E'begin\n  -- drift'); end $$;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\set ON_ERROR_STOP on
do $$ begin assert position('-- drift' in pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure)) > 0, 'G2: a drifted body must be left as it was'; end $$;
do $$ begin execute (select def from g2_saved); end $$;
do $$ begin assert pg_temp.state() = (select s from live_state), 'G2: restored to the live state'; end $$;

-- G3 apply
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
create temp table applied_state as select pg_temp.state() as s;
do $$ begin
  assert (select s from applied_state) like '8a75cb63eecfbc61e70d85deb6a1fe51 | %OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes% | CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT%',
    'G3: exact applied state: ' || (select s from applied_state);
end $$;
create function pg_temp.m(owner text, res text, gate text default null) returns jsonb language sql as $$
  select jsonb_build_object('g3_disposition_v1', jsonb_build_object('classification','KEEP_CANONICAL_OWNER'),
    'compaction_v1', jsonb_build_object('canonical_owner', owner),
    'owner_routing', jsonb_strip_nulls(jsonb_build_object('canonical_owner', owner, 'resolution', res, 'human_gate', gate))) $$;
alter table public.nodes disable trigger user;
insert into public.nodes(type,label,description,rule_id,rule_version,is_active,metadata,supersedes_version) values
 ('rule','owner A','A text','owner_a_law',1,true,pg_temp.m('owner_a_law','RESOLVED'),null),
 ('rule','revived v1','r1','revived_law',1,false,pg_temp.m('owner_a_law','RESOLVED'),null),
 ('rule','revived v2','r2','revived_law',2,false,pg_temp.m('owner_a_law','RESOLVED'),1),
 ('note','a note','not a rule',null,null,true,'{}'::jsonb,null);
alter table public.nodes enable trigger user;
select pg_temp.refused($q$update public.nodes set type='note' where rule_id='owner_a_law'$q$, 'cannot change its type');
select pg_temp.refused($q$update public.nodes set id=gen_random_uuid() where rule_id='owner_a_law'$q$, 'cannot change its id');
select pg_temp.refused($q$update public.nodes set rule_version=7 where rule_id='revived_law' and rule_version=1$q$, 'cannot change its identity or version in place');
select pg_temp.refused($q$update public.nodes set is_active=true where rule_id='revived_law' and rule_version=2$q$, 're-activated without');
select pg_temp.refused($q$delete from public.nodes where rule_id='revived_law' and rule_version=1$q$, 'DELETE of rule');
select pg_temp.refused($q$truncate public.nodes$q$, 'TRUNCATE of public.nodes is refused');
-- a normal supersession in one transaction is allowed, and the retirement is stamped by the guard
do $$ begin
  update public.nodes set is_active=false where rule_id='owner_a_law';
  insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','A v2','A text 2','owner_a_law',2,1,true,pg_temp.m('owner_a_law','RESOLVED'));
  assert (select metadata#>>'{rule_guard,deactivated_in_xact}' from public.nodes where rule_id='owner_a_law' and rule_version=1) = pg_current_xact_id()::text, 'G3: the retirement is stamped';
end $$;
select pg_temp.refused($q$update public.nodes set metadata = metadata || '{"rule_guard":{"deactivated_in_xact":"1"}}' where rule_id='revived_law' and rule_version=2$q$, 'written by the rule guard only');
-- a row that is not a rule is not blocked by anything new
do $$ begin
  update public.nodes set type='topic', label='renamed', description='changed', identity_key='k' where type='note';
  delete from public.nodes where type='topic';
end $$;

-- G4 apply again: no-op
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G4: a second apply changes nothing'; end $$;

-- G5 a changed trigger after apply
CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
\set ON_ERROR_STOP off
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() like '8a75cb63eecfbc61e70d85deb6a1fe51 | %UPDATE OF is_active, metadata ON public.nodes%', 'G5: a drifted trigger must be left as it was: ' || pg_temp.state(); end $$;
CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G5: restored to the applied state'; end $$;

-- G6 rollback, twice
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
do $$ begin assert pg_temp.state() = (select s from live_state), 'G6: the rollback restores the exact live state: ' || pg_temp.state(); end $$;
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
do $$ begin assert pg_temp.state() = (select s from live_state), 'G6: a second rollback changes nothing'; end $$;
do $$ begin -- the live guard behaviour is back: a type change of a rule row is not seen by the live trigger
  update public.nodes set type='note' where rule_id='revived_law' and rule_version=1;
  update public.nodes set type='rule' where rule_id='revived_law' and rule_version=1;
end $$;

-- G7 apply again after the rollback
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G7: re-apply after rollback'; end $$;
select 'g1_rule_guard_cl16_v1: PASS';
