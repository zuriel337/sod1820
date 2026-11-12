-- Throwaway-Postgres lifecycle test for supabase/proposed/20261112200000_g1_rule_guard_cl16.sql and its ROLLBACK (never a live project).
-- The simulated state is the state AFTER M0: M0 changes none of these objects (the runner checks that no file of the M0 apply plan
-- mentions public.nodes or the rule guard), so the post-M0 state of public.nodes and its guard is the live 12.11.2026 state.
--
-- Every run of one of the two files is one CASE with an expected outcome. The runner (scripts/run-g1-rule-guard-sql-test.sh) reads the
-- markers written to stderr and fails on any difference:
--   @@CASE <id> OK                 the file must run without any ERROR
--   @@CASE <id> REFUSE <needle>    the file must stop with an ERROR whose text contains <needle> (a refusal for another reason fails)
-- After every refusal the test asserts that NOTHING changed (function md5, both trigger texts and their enabled flags).
--
-- G0  no function: both files stop and create nothing.
-- G1  the live fixture is byte-identical to live (md5 56b90b0a...), with the live trigger text, enabled.
-- G2  drift before apply (a changed body): both files stop.
-- N1  BEFORE body, trigger MISSING (the NULL case): both files stop.          N2  BEFORE body, trigger DISABLED / REPLICA-only: both stop.
-- G3  apply on the exact live state: exact AFTER state; behaviour checks.      G4  apply again: a no-op.
-- N3  AFTER body, trigger MISSING: both stop.   N4  AFTER body, TRUNCATE trigger MISSING: both stop.
-- N5  AFTER body, trigger DISABLED: both stop.  N6  AFTER body, TRUNCATE trigger DISABLED: both stop.
-- G5  drift after apply (a changed trigger text): both stop.
-- G6  rollback on the exact applied state: the exact live state; rollback again: a no-op.   G7  apply again after the rollback.
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
insert into public.work_log values ('11111111-2222-4333-8444-555555555555', 'ZURIEL approval: revived_law', 'fixture');
-- the full state: function md5 | trigger text [enabled flag] | TRUNCATE trigger text [enabled flag]
create function pg_temp.state() returns text language sql as $$
  select coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_rule_compaction_integrity_guard_v1()')), 'none')
    || ' | ' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1'), 'none')
    || ' | ' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate'), 'none') $$;
create function pg_temp.refused(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if position(msg in sqlerrm) > 0 then return; end if;
    raise exception 'refused for another reason: % (expected %)', sqlerrm, msg;
  end;
  raise exception 'NOT REFUSED: %', q;
end $$;
create temp table probe(s text);
-- unchanged(): the state equals the one saved by mark() just before the two files ran
create function pg_temp.mark() returns void language sql as $$ delete from probe; insert into probe select pg_temp.state() $$;
create function pg_temp.unchanged(c text) returns void language plpgsql as $$
begin if pg_temp.state() is distinct from (select s from probe) then raise exception '%: the refused file changed the state: % (was %)', c, pg_temp.state(), (select s from probe); end if; end $$;
\set ON_ERROR_STOP off

-- G0
select pg_temp.mark();
\warn @@CASE G0-apply-no-function REFUSE G1 rule guard precondition: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing changed
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE G0-rollback-no-function REFUSE G1 rule guard rollback: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing created
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = 'none | none | none', 'G0: nothing may be created: ' || pg_temp.state(); end $$;

-- G1
\i tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
create temp table live_state as select pg_temp.state() as s;
do $$ begin
  assert (select s from live_state) = '56b90b0ae0f9c5915b730314d13ca7a0 | CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O] | none',
    'G1: the fixture is the live 12.11.2026 state: ' || (select s from live_state);
end $$;

-- G2 a changed body (one comment line in another clause)
create table g2_saved as select pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure) as def;
do $$ begin execute replace((select def from g2_saved), 'begin', E'begin\n  -- drift'); end $$;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE G2-apply-drifted-body REFUSE G1 rule guard drift: function md5
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE G2-rollback-drifted-body REFUSE G1 rule guard rollback drift: function md5
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('G2');
do $$ begin execute (select def from g2_saved); end $$;
do $$ begin assert pg_temp.state() = (select s from live_state), 'G2: restored to the live state'; end $$;

-- N1 the NULL case before apply: the live body, the trigger MISSING. A NULL comparison must not let either file continue.
drop trigger trg_rule_compaction_integrity_guard_v1 on public.nodes;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N1-apply-before-trigger-missing REFUSE G1 rule guard drift: function md5 56b90b0ae0f9c5915b730314d13ca7a0, trigger (missing), truncate trigger (missing)
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N1-rollback-before-trigger-missing REFUSE G1 rule guard rollback drift: function md5 56b90b0ae0f9c5915b730314d13ca7a0, trigger (missing), truncate trigger (missing)
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N1');
do $$ begin assert pg_temp.state() = '56b90b0ae0f9c5915b730314d13ca7a0 | none | none', 'N1: no trigger may be created by a refused file: ' || pg_temp.state(); end $$;
CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
do $$ begin assert pg_temp.state() = (select s from live_state), 'N1: restored to the live state'; end $$;

-- N2 the live body, the trigger DISABLED. CREATE OR REPLACE TRIGGER would re-enable it silently, so both files must stop instead.
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N2-apply-before-trigger-disabled REFUSE supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=D], truncate trigger (missing)
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N2-rollback-before-trigger-disabled REFUSE G1 rule guard rollback drift: function md5 56b90b0ae0f9c5915b730314d13ca7a0, trigger CREATE TRIGGER
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N2');
do $$ begin assert pg_temp.state() like '%[enabled=D] | none', 'N2: a disabled trigger must stay disabled after a refusal: ' || pg_temp.state(); end $$;
-- a trigger that fires in replica sessions only does not fire for ordinary writers either
alter table public.nodes enable replica trigger trg_rule_compaction_integrity_guard_v1;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N2-apply-before-trigger-replica-only REFUSE [enabled=R], truncate trigger (missing)
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N2-rollback-before-trigger-replica-only REFUSE [enabled=R], truncate trigger (missing)
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N2 replica');
alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1;
do $$ begin assert pg_temp.state() = (select s from live_state), 'N2: restored to the live state'; end $$;

-- G3 apply on the exact live state
\set ON_ERROR_STOP off
\warn @@CASE G3-apply-exact-live-state OK
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
create temp table applied_state as select pg_temp.state() as s;
do $$ begin
  assert (select s from applied_state) = '7b03b1a78f4e04962c15399feb1668ff | CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O] | CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]',
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
\set ON_ERROR_STOP off
\warn @@CASE G4-apply-again-noop OK
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G4: a second apply changes nothing'; end $$;

-- N3 the NULL case before rollback: the applied body, the trigger MISSING
drop trigger trg_rule_compaction_integrity_guard_v1 on public.nodes;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N3-apply-after-trigger-missing REFUSE G1 rule guard drift: function md5 7b03b1a78f4e04962c15399feb1668ff, trigger (missing), truncate trigger CREATE TRIGGER
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N3-rollback-after-trigger-missing REFUSE G1 rule guard rollback drift: function md5 7b03b1a78f4e04962c15399feb1668ff, trigger (missing), truncate trigger CREATE TRIGGER
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N3');
CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
do $$ begin assert pg_temp.state() = (select s from applied_state), 'N3: restored to the applied state'; end $$;

-- N4 the applied body, the TRUNCATE trigger MISSING (the second NULL case before rollback)
drop trigger trg_rule_compaction_integrity_guard_v1_truncate on public.nodes;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N4-apply-after-truncate-trigger-missing REFUSE [enabled=O], truncate trigger (missing) is neither the live state
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N4-rollback-after-truncate-trigger-missing REFUSE [enabled=O], truncate trigger (missing) is neither the applied state
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N4');
CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
do $$ begin assert pg_temp.state() = (select s from applied_state), 'N4: restored to the applied state'; end $$;

-- N5 the applied body, the trigger DISABLED
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N5-apply-after-trigger-disabled REFUSE identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=D], truncate trigger
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N5-rollback-after-trigger-disabled REFUSE identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=D], truncate trigger
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N5');
alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1;
do $$ begin assert pg_temp.state() = (select s from applied_state), 'N5: restored to the applied state'; end $$;

-- N6 the applied body, the TRUNCATE trigger DISABLED
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1_truncate;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE N6-apply-after-truncate-trigger-disabled REFUSE FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=D] is neither the live state
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE N6-rollback-after-truncate-trigger-disabled REFUSE FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=D] is neither the applied state
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('N6');
alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1_truncate;
do $$ begin assert pg_temp.state() = (select s from applied_state), 'N6: restored to the applied state'; end $$;

-- G5 a changed trigger text after apply
CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE G5-apply-drifted-trigger REFUSE G1 rule guard drift: function md5 7b03b1a78f4e04962c15399feb1668ff, trigger CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata ON public.nodes
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\warn @@CASE G5-rollback-drifted-trigger REFUSE G1 rule guard rollback drift: function md5 7b03b1a78f4e04962c15399feb1668ff, trigger CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata ON public.nodes
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('G5');
CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G5: restored to the applied state'; end $$;

-- G6 rollback on the exact applied state, twice
\set ON_ERROR_STOP off
\warn @@CASE G6-rollback-exact-applied-state OK
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = (select s from live_state), 'G6: the rollback restores the exact live state: ' || pg_temp.state(); end $$;
\set ON_ERROR_STOP off
\warn @@CASE G6-rollback-again-noop OK
\i supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = (select s from live_state), 'G6: a second rollback changes nothing'; end $$;
do $$ begin -- the live guard behaviour is back: a type change of a rule row is not seen by the live trigger
  update public.nodes set type='note' where rule_id='revived_law' and rule_version=1;
  update public.nodes set type='rule' where rule_id='revived_law' and rule_version=1;
end $$;

-- G7 apply again after the rollback
\set ON_ERROR_STOP off
\warn @@CASE G7-apply-after-rollback OK
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\warn @@END
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.state() = (select s from applied_state), 'G7: re-apply after rollback'; end $$;
select 'g1_rule_guard_cl16_v1: PASS';
