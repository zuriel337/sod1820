-- CL-16 ORDER EVIDENCE 2 of 2 (throwaway PostgreSQL only; synthetic rows, never a live project).
-- The state AFTER supabase/proposed/20261111120100 (v6 retired, v7 active; produced under the LIVE guard, as in the real database) and then the
-- shape of supabase/proposed/ROLLBACK_20261111120100_system_suggestions_law_v7.sql (deactivate v7, reactivate v6), against the live guard and
-- against the guard AFTER the CL-16 proposal. Variable: apply_cl16 = on | off.
-- Expected: off -> "rollback OK"; on -> ERROR "re-activated without an owner-creation verdict" (a retired version coming back is a revival).
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
do $$
declare v_ssl public.nodes%rowtype;
begin
  select * into v_ssl from public.nodes where type='rule' and rule_id='fixture_law' and is_active for update;
  update public.nodes set is_active=false where id=v_ssl.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version)
  values ('rule','l7','d7',v_ssl.metadata,true,'fixture_law',7,v_ssl.depends_on,6);
end $$;
\if :apply_cl16
\i supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
\endif
select '@@GUARD ' || md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure));
do $$
begin
  update public.nodes set is_active=false where type='rule' and rule_id='fixture_law' and rule_version=7;
  update public.nodes set is_active=true  where type='rule' and rule_id='fixture_law' and rule_version=6;
  raise notice '@@RESULT rollback OK: the active version is v%', (select rule_version from public.nodes where rule_id='fixture_law' and is_active);
end $$;
