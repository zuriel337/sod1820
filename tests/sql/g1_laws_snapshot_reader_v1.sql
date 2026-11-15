-- Throwaway-Postgres END-TO-END test of the successor of a retired rule: database row -> the rule guard -> the ONE snapshot reader
-- (scripts/sql/g1_laws_snapshot.sql) -> the G1 rules (scripts/lib/g1LawsSnapshotRules.mjs). Never a live project.
-- Why: recording metadata.retired_routing_v1 does not by itself prove that the system uses the right successor. Here every step
-- writes through the PROPOSED guard (the live fixture + the real apply file), prints the snapshot the reader produces between
-- "@@SNAP <name>" and "@@END", and scripts/check-g1-laws-snapshot-reader.mjs feeds those snapshots to the real G1 rules and
-- compares each transition with its expected outcome (scripts/run-g1-laws-snapshot-reader-test.sh; any difference exits 1).
\set ON_ERROR_STOP on
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
insert into public.work_log values ('11111111-2222-4333-8444-555555555555', 'ZURIEL approval: gone_ownerless_law, gone_owned_law, gone_unnamed_routed_law, gone_dep_law, other_root_law', 'fixture');
\i tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
create function pg_temp.m(owner text, family text, res text default 'RESOLVED', gate text default null) returns jsonb language sql as $$
  select jsonb_build_object('g3_disposition_v1', jsonb_build_object('classification','KEEP_CANONICAL_OWNER'),
    'compaction_v1', jsonb_build_object('canonical_owner', owner, 'owner_family', family),
    'owner_routing', jsonb_strip_nulls(jsonb_build_object('canonical_owner', owner, 'resolution', res, 'human_gate', gate))) $$;
create function pg_temp.rr(succ text, rel text, ref text) returns jsonb language sql as $$
  select jsonb_build_object('retired_routing_v1', jsonb_strip_nulls(jsonb_build_object('successor', succ, 'relation', rel, 'basis', 'fixture', 'decided_by', 'ZURIEL', 'approval_ref', ref))) $$;
create function pg_temp.refused(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if position(msg in sqlerrm) > 0 then return; end if;
    raise exception 'refused for another reason: % (expected %)', sqlerrm, msg;
  end;
  raise exception 'NOT REFUSED: %', q;
end $$;
\set W1 'work_log:11111111-2222-4333-8444-555555555555'
-- the state that exists before the guard is applied (written with the triggers off)
alter table public.nodes disable trigger user;
insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,depends_on,metadata) values
 ('rule','root','root text','root_law',1,null,true,null,pg_temp.m('root_law','fam_root')),
 ('rule','other root','other root text','other_root_law',1,null,true,null,pg_temp.m('other_root_law','fam_other')),
 ('rule','child v1','child text 1','child_law',1,null,false,null,pg_temp.m('root_law','fam_child')),
 ('rule','child v2','child text 2','child_law',2,1,true,null,pg_temp.m('root_law','fam_child')),
 ('rule','names','this law still names gone_owned_law and gone_ownerless_law in its text','names_law',1,null,true,array['gone_dep_law'],pg_temp.m('root_law','fam_names')),
 ('rule','gone owned','g1','gone_owned_law',1,null,false,null,pg_temp.m('root_law','fam_gone')),
 ('rule','gone ownerless v1','g2a','gone_ownerless_law',1,null,false,null,'{}'::jsonb),
 ('rule','gone ownerless v2','g2b','gone_ownerless_law',2,1,false,null,'{}'::jsonb),
 ('rule','gone dep','g3','gone_dep_law',1,null,false,null,pg_temp.m('other_root_law','fam_gone')),
 ('rule','gone unnamed','g4','gone_unnamed_law',1,null,false,null,pg_temp.m('root_law','fam_gone')),
 ('rule','gone unnamed routed','g5','gone_unnamed_routed_law',1,null,false,null,'{}'::jsonb),
 ('note','a note','not a rule: gone_unnamed_law is named here, and a note is not a law',null,null,null,true,null,'{}'::jsonb);
alter table public.nodes enable trigger user;
\pset tuples_only on
\pset format unaligned

-- S1 the base: 4 active laws; 3 retired families that an active law still names (text, text, depends_on); 2 retired families
-- that nobody names are NOT listed.
\echo @@SNAP S1-base
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S2 a known gap receives its successor THROUGH THE GUARD, on the last version of the family
update public.nodes set metadata = metadata || pg_temp.rr('root_law','REPLACED', :'W1') where rule_id='gone_ownerless_law' and rule_version=2;
do $$ begin
  assert (select metadata #>> '{owner_routing,canonical_owner}' from public.nodes where rule_id='gone_ownerless_law' and rule_version=2) is null, 'S2: no owner is written onto the retired row';
end $$;
\echo @@SNAP S2-known-gap-routed
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S3 a retired family that nobody names is listed once it carries a record (otherwise the record would never be read)
update public.nodes set metadata = metadata || pg_temp.rr('other_root_law','ABSORBED', :'W1') where rule_id='gone_unnamed_routed_law';
\echo @@SNAP S3-unnamed-family-routed
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S4 a later mapping wins over the owner recorded at retirement, and that owner stays in the row as history
update public.nodes set metadata = metadata || pg_temp.rr('other_root_law','ABSORBED', :'W1') where rule_id='gone_owned_law';
do $$ begin
  assert (select metadata #>> '{compaction_v1,canonical_owner}' from public.nodes where rule_id='gone_owned_law') = 'root_law', 'S4: the owner recorded at retirement is untouched';
end $$;
\echo @@SNAP S4-later-mapping-wins
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S5 the SAME change of a successor done as a rewrite of the retired row's owner: the guard refuses it ...
select pg_temp.refused($q$update public.nodes set metadata = jsonb_set(jsonb_set(metadata,'{compaction_v1,canonical_owner}','"root_law"'),'{owner_routing,canonical_owner}','"root_law"') where rule_id='gone_dep_law'$q$, 'owner changed without a new version');
-- ... and when the guard is BYPASSED (triggers off: a role that can disable them), the snapshot it produces is refused by G1
alter table public.nodes disable trigger user;
update public.nodes set metadata = jsonb_set(jsonb_set(metadata,'{compaction_v1,canonical_owner}','"root_law"'),'{owner_routing,canonical_owner}','"root_law"') where rule_id='gone_dep_law';
alter table public.nodes enable trigger user;
\echo @@SNAP S5-silent-rewrite-with-the-guard-bypassed
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END
alter table public.nodes disable trigger user;
update public.nodes set metadata = jsonb_set(jsonb_set(metadata,'{compaction_v1,canonical_owner}','"other_root_law"'),'{owner_routing,canonical_owner}','"other_root_law"') where rule_id='gone_dep_law';
alter table public.nodes enable trigger user;

-- S6 a record written where no reader looks is refused by the guard (so "recorded but never read" cannot happen)
select pg_temp.refused(format($q$update public.nodes set metadata = metadata || pg_temp.rr('root_law','REPLACED',%L) where rule_id='gone_ownerless_law' and rule_version=1$q$, :'W1'), 'recorded on the last version of the family only');
select pg_temp.refused(format($q$update public.nodes set metadata = metadata || pg_temp.rr('root_law','REPLACED',%L) where rule_id='child_law' and rule_version=1$q$, :'W1'), 'recorded on a retired family only');

-- S7 the successor itself retires later (the guard does not refuse the retirement of a law that other rows route to). The guard
-- stamps the retirement, so the reader lists the retired root although no active law names it; a retired self-owned root has
-- itself as "owner at retirement", which is not a successor. G1 refuses the snapshot until new approved routings are recorded.
update public.nodes set is_active=false where rule_id='other_root_law';
\echo @@SNAP S7-successor-retired-later
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S8 new approved routings replace the stale ones (two records, one owner recorded at retirement, and the retired root itself);
-- the snapshot is valid again
update public.nodes set metadata = metadata || pg_temp.rr('root_law','ABSORBED', :'W1') where rule_id in ('gone_owned_law','gone_unnamed_routed_law','gone_dep_law','other_root_law');
\echo @@SNAP S8-rerouted-to-an-active-successor
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END

-- S9 a retired family is revived by a new approved version: it is an active law again (an L row); the record left on its old
-- version is history and is NOT read as a successor
insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata)
  values ('rule','revived','g5 revived','gone_unnamed_routed_law',2,1,true,pg_temp.m('root_law','fam_gone','SUPERSEDE_EXISTING', :'W1'));
do $$ begin
  assert (select metadata ? 'retired_routing_v1' from public.nodes where rule_id='gone_unnamed_routed_law' and rule_version=1), 'S9: the old record stays on the old version (history)';
end $$;
\echo @@SNAP S9-family-revived
\i scripts/sql/g1_laws_snapshot.sql
\echo @@END
\echo g1_laws_snapshot_reader_v1: SQL PART DONE
