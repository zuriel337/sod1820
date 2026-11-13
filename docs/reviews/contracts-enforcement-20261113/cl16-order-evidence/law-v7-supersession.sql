-- CL-16 ORDER EVIDENCE 1 of 2 (throwaway PostgreSQL only; synthetic rows, never a live project).
-- The shape of supabase/proposed/20261111120100_system_suggestions_law_v7_decision_record_only.sql: deactivate the active version of a rule,
-- insert the next one in the same transaction, then require that the deactivated row is byte-identical (md5 of its metadata::text, lines 79-81 of
-- that file). Run once against the LIVE guard (fixture, md5 56b90b0a...) and once against the guard AFTER the CL-16 proposal. The rows are
-- seeded under the live guard, as they are in the real database, before the proposal is applied.
-- Variable: apply_cl16 = on | off.   Expected: off -> "supersession OK"; on -> ERROR "NOT byte-identical" (the guard stamps metadata.rule_guard).
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
\i tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version)
values ('rule','l5','d5','{"g3_disposition_v1":{"classification":"x"},"compaction_v1":{"canonical_owner":"fixture_law"},"owner_routing":{"canonical_owner":"fixture_law"}}',false,'fixture_law',5,null);
insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version)
values ('rule','l6','d6','{"g3_disposition_v1":{"classification":"x"},"compaction_v1":{"canonical_owner":"fixture_law"},"owner_routing":{"canonical_owner":"fixture_law"}}',true,'fixture_law',6,5);
\if :apply_cl16
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\endif
select '@@GUARD ' || md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure));
create temp table before_md5 as select md5(metadata::text) m from public.nodes where rule_id='fixture_law' and rule_version=6;
do $$
declare v_ssl public.nodes%rowtype; v_after text;
begin
  select * into v_ssl from public.nodes where type='rule' and rule_id='fixture_law' and is_active for update;
  update public.nodes set is_active=false where id=v_ssl.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version)
  values ('rule','l7','d7',v_ssl.metadata,true,'fixture_law',7,v_ssl.depends_on,6);
  select md5(metadata::text) into v_after from public.nodes where id=v_ssl.id;
  if v_after <> (select m from before_md5) then
    raise exception 'supersession: the deactivated v6 row is NOT byte-identical (metadata md5 % -> %)', (select m from before_md5), v_after;
  end if;
  raise notice '@@RESULT supersession OK: the deactivated row is identical';
end $$;
