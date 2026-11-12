-- EVIDENCE: the live rule guard versus the proposed extension, on a throwaway PostgreSQL (g1.variant = live|proposed). The proposed
-- variant is the live fixture PLUS the real apply file supabase/proposed/20261112200000_g1_rule_guard_cl16.sql (run-db-scenarios.sh).
-- Every case has an expected outcome for each variant; ANY difference raises at the end, so psql (and the runner) exits non-zero.
-- Round 3 (on handoff b0f471dcd): D13d..D13h a document owner is registered or authorized; D22b the owner of a retired row is never
-- written; D25..D25k the successor of a retired rule is recorded in metadata.retired_routing_v1 (contracts session section 16.4);
-- D26..D26i the owner chain ends at a valid root (retired or missing links at depth 2, cycles, codex and document roots).
\set ON_ERROR_STOP on
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
insert into public.work_log values ('11111111-2222-4333-8444-555555555555', 'ZURIEL approval: legacy_child_law, new_domain_law, revived_law, owner_a_law, doc_new_law, ownerless_retired_law, routed_retired_law', 'fixture');
insert into public.project_codex(slug) values ('publishing_conventions');
\i GUARD_FILE
select 'GUARD md5 ' || md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure));
create function pg_temp.m(owner text, res text, gate text default null) returns jsonb language sql as $$
  select jsonb_build_object('g3_disposition_v1', jsonb_build_object('classification','KEEP_CANONICAL_OWNER'),
    'compaction_v1', jsonb_build_object('canonical_owner', owner),
    'owner_routing', jsonb_strip_nulls(jsonb_build_object('canonical_owner', owner, 'resolution', res, 'human_gate', gate))) $$;
alter table public.nodes disable trigger user;
insert into public.nodes(type,label,description,rule_id,rule_version,is_active,metadata) values
 ('rule','owner A','A text','owner_a_law',1,true,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','owner B','B text','owner_b_law',1,true,pg_temp.m('owner_b_law','RESOLVED')),
 ('rule','retired R','R text','retired_r_law',1,false,pg_temp.m('retired_r_law','RESOLVED')),
 ('rule','legacy child','child text','legacy_child_law',1,true,pg_temp.m('owner_a_law','RESOLVED_G2_COMPACTION')),
 ('rule','dormant','dormant text','dormant_law',1,false,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','body','body text','body_law',1,true,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','hist v1','old text','hist_law',1,false,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','hist v2','new text','hist_law',2,true,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','revived v1','r1','revived_law',1,false,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','revived v2','r2','revived_law',2,false,pg_temp.m('owner_a_law','RESOLVED')),
 ('rule','ownerless retired','o1','ownerless_retired_law',1,false,'{}'::jsonb),
 -- round 3 seeds (written with the triggers off, as states that exist before the guard is applied):
 ('rule','mid retired','m1','mid_retired_law',1,true,pg_temp.m('retired_r_law','RESOLVED')),          -- an active child of a retired owner
 ('rule','mid ghost','m2','mid_ghost_law',1,true,pg_temp.m('never_existed_law','RESOLVED')),         -- an active child of an owner that does not exist
 ('rule','cycle a','c1','cyc_a_law',1,true,pg_temp.m('cyc_b_law','RESOLVED')),                       -- a cycle with no root: a -> b -> a
 ('rule','cycle b','c2','cyc_b_law',1,true,pg_temp.m('cyc_a_law','RESOLVED')),
 ('rule','mid codex bad','m3','mid_codex_bad_law',1,true,pg_temp.m('project_codex.no_such_slug','RESOLVED')),
 ('rule','mid codex ok','m4','mid_codex_ok_law',1,true,pg_temp.m('project_codex.publishing_conventions','RESOLVED')),
 ('rule','no owner mid','m5','no_owner_mid_law',1,true,'{}'::jsonb),                                   -- an active rule that records no owner
 ('rule','doc child','d1','doc_child_law',1,true,pg_temp.m('docs/registered-owner-contract.md','RESOLVED')), -- registers the document
 ('rule','solo doc','d2','solo_doc_law',1,true,pg_temp.m('docs/solo-owner-contract.md','RESOLVED')),  -- the only rule that names its document
 ('rule','routed retired','rr','routed_retired_law',1,false,pg_temp.m('owner_a_law','RESOLVED') || '{"retired_routing_v1":{"successor":"owner_b_law","relation":"REPLACED","approval_ref":"work_log:11111111-2222-4333-8444-555555555555"}}'),
 ('note','a note','not a rule',null,null,true,'{}'::jsonb);
update public.nodes set supersedes_version=1 where rule_id in ('hist_law','revived_law') and rule_version=2;
alter table public.nodes enable trigger user;
create temp table result(case_id text primary key, outcome text, detail text);
create function pg_temp.try(c text, q text) returns void language plpgsql as $$
declare v text; d text := '';
begin
  begin execute q; v := 'ALLOWED'; raise exception 'rollback-probe';
  exception when others then
    if sqlerrm <> 'rollback-probe' then v := 'REFUSED'; d := left(sqlerrm, 200); end if;
  end;
  insert into result values (c, v, d);
end $$;
\set W1 'work_log:11111111-2222-4333-8444-555555555555'
\set WX 'work_log:99999999-8888-4777-8666-555555555555'
select pg_temp.try('D01 second active version, no lineage', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','dup','owner_a_law',2,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D02 VALID new version, same owner', $q$update public.nodes set is_active=false where rule_id='owner_a_law'; insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','A v2','A text 2','owner_a_law',2,1,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D03 new family duplicating an owner, no verdict', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','dup family','owner_a_copy_law',1,true,pg_temp.m('owner_a_copy_law','RESOLVED'))$q$);
select pg_temp.try('D04 VALID scoped child of an active owner', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','owner_a_child_law',1,true,pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D05 new child routed to a retired owner', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','retired_child_law',1,true,pg_temp.m('retired_r_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D06 new version moves the owner silently', $q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('owner_b_law','RESOLVED'))$q$);
select pg_temp.try('D07 VALID real owner swap A->B with SUPERSEDE_EXISTING and a resolving approval', format($q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('owner_b_law','SUPERSEDE_EXISTING',%L)); do $c$ begin if (select metadata#>>'{owner_routing,canonical_owner}' from public.nodes where rule_id='legacy_child_law' and is_active) <> 'owner_b_law' then raise exception 'D07 did not swap the owner'; end if; end $c$$q$, :'W1'));
select pg_temp.try('D07b owner swap with an approval reference that does not exist', format($q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('owner_b_law','SUPERSEDE_EXISTING',%L))$q$, :'WX'));
select pg_temp.try('D07c owner swap with an invented approval text', $q$update public.nodes set is_active=false where rule_id='legacy_child_law'; insert into public.nodes(type,label,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','child v2','legacy_child_law',2,1,true,pg_temp.m('owner_b_law','SUPERSEDE_EXISTING','ZURIEL said yes'))$q$);
select pg_temp.try('D08 VALID metadata touch, no owner change', $q$update public.nodes set metadata = metadata || '{"note":"x"}' where rule_id='legacy_child_law' and is_active$q$);
select pg_temp.try('D09a new domain without an approval reference', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','new','new_domain_law',1,true,pg_temp.m('new_domain_law','GENUINELY_NEW_DOMAIN'))$q$);
select pg_temp.try('D09b VALID new domain with a resolving approval reference', format($q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','new','new_domain_law',1,true,pg_temp.m('new_domain_law','GENUINELY_NEW_DOMAIN',%L))$q$, :'W1'));
select pg_temp.try('D10 a law inserted inactive is activated without a verdict', $q$update public.nodes set is_active=true where rule_id='dormant_law'$q$);
select pg_temp.try('D10b VALID activation with a scoped-child verdict, same owner', $q$update public.nodes set is_active=true, metadata = jsonb_set(metadata, '{owner_routing,resolution}', '"EXTEND_EXISTING_SCOPED_CHILD"') where rule_id='dormant_law'$q$);
select pg_temp.try('D11 owner changed at the same version', $q$update public.nodes set metadata = jsonb_set(jsonb_set(metadata, '{owner_routing,canonical_owner}', '"owner_b_law"'), '{compaction_v1,canonical_owner}', '"owner_b_law"') where rule_id='legacy_child_law' and is_active$q$);
select pg_temp.try('D12 body edited without a new version (active)', $q$update public.nodes set description = 'silently rewritten' where rule_id='body_law'$q$);
select pg_temp.try('D12b history row edited (inactive version)', $q$update public.nodes set description = 'history rewritten' where rule_id='hist_law' and rule_version=1$q$);
select pg_temp.try('D13 owner that does not exist', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','ghost_child_law',1,true,pg_temp.m('never_existed_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13b codex owner that does not exist', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','codex_child_law',1,true,pg_temp.m('project_codex.no_such_slug','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13c VALID codex owner that exists', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','codex_child_law',1,true,pg_temp.m('project_codex.publishing_conventions','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13d document owner that no active rule names, without an approval', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','file_child_law',1,true,pg_temp.m('SOD1820_DESIGN_CONTRACT_V2.md','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13e VALID document owner that an active rule already names (registered)', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','doc_sibling_law',1,true,pg_temp.m('docs/registered-owner-contract.md','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13f VALID new document owner with a resolving approval (authorized)', format($q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','doc_new_law',1,true,pg_temp.m('docs/brand-new-owner-contract.md','EXTEND_EXISTING_SCOPED_CHILD',%L))$q$, :'W1'));
select pg_temp.try('D13g owner that is not a rule id, a codex item or a document path', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','child','odd_owner_law',1,true,pg_temp.m('Some Owner Text','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D13h VALID new version keeps the document owner that only its previous version named', $q$update public.nodes set is_active=false where rule_id='solo_doc_law'; insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','solo v2','d2 text 2','solo_doc_law',2,1,true,pg_temp.m('docs/solo-owner-contract.md','RESOLVED'))$q$);
select pg_temp.try('D14 DELETE of a rule row', $q$delete from public.nodes where rule_id='hist_law' and rule_version=1$q$);
select pg_temp.try('D15 TRUNCATE of nodes', $q$truncate public.nodes$q$);
select pg_temp.try('D16 VALID retirement (is_active=false, body unchanged)', $q$update public.nodes set is_active=false where rule_id='body_law'$q$);
select pg_temp.try('D17 type change of a rule row', $q$update public.nodes set type='note' where rule_id='body_law'$q$);
select pg_temp.try('D17b type change, then DELETE of the same row', $q$update public.nodes set type='note' where rule_id='hist_law' and rule_version=1; delete from public.nodes where label='hist v1'$q$);
select pg_temp.try('D18 id reset of a rule row', $q$update public.nodes set id = gen_random_uuid() where rule_id='body_law'$q$);
select pg_temp.try('D19 version changed in place (history row)', $q$update public.nodes set rule_version=7 where rule_id='hist_law' and rule_version=1$q$);
select pg_temp.try('D19b rule_id changed in place (active row)', $q$update public.nodes set rule_id='renamed_law' where rule_id='body_law'$q$);
select pg_temp.try('D20 retired family re-activated at v2 without a decision', $q$update public.nodes set is_active=true where rule_id='revived_law' and rule_version=2$q$);
select pg_temp.try('D20b retired family revived by a new v3 without a decision', $q$insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','revived v3','r3','revived_law',3,2,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D20c VALID revival at v2 with a verdict and a resolving approval', format($q$update public.nodes set is_active=true, metadata = pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD',%L) where rule_id='revived_law' and rule_version=2$q$, :'W1'));
select pg_temp.try('D20d revival at v2 with a verdict but no approval', $q$update public.nodes set is_active=true, metadata = pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD') where rule_id='revived_law' and rule_version=2$q$);
select pg_temp.try('D21 forged guard stamp, then a new version', $q$update public.nodes set metadata = metadata || jsonb_build_object('rule_guard', jsonb_build_object('deactivated_in_xact', pg_current_xact_id()::text)) where rule_id='revived_law' and rule_version=2; insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','revived v3','r3','revived_law',3,2,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D21b no-op re-retirement of a retired row, then a new version', $q$update public.nodes set is_active=false where rule_id='revived_law' and rule_version=2; insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','revived v3','r3','revived_law',3,2,true,pg_temp.m('owner_a_law','RESOLVED'))$q$);
select pg_temp.try('D22 VALID documented retirement with successor metadata', $q$update public.nodes set is_active=false, metadata = metadata || '{"superseded_by":"owner_b_law","superseded_at":"2026-11-12"}' where rule_id='body_law'$q$);
select pg_temp.try('D22b owner written onto a retired row that had none (a successor goes to retired_routing_v1)', $q$update public.nodes set metadata = pg_temp.m('owner_b_law','RESOLVED') where rule_id='ownerless_retired_law'$q$);
select pg_temp.try('D22c owner rewritten on a retired row that had one', $q$update public.nodes set metadata = jsonb_set(metadata,'{owner_routing,canonical_owner}','"owner_b_law"') where rule_id='hist_law' and rule_version=1$q$);
select pg_temp.try('D23 VALID row that is not a rule: type, label, description, identity_key and DELETE', $q$update public.nodes set type='topic', label='renamed', description='changed', identity_key='k' where label='a note'; delete from public.nodes where label='renamed'$q$);
select pg_temp.try('D24 a row that is not a rule promoted to an active rule without a verdict', $q$update public.nodes set type='rule', rule_id='promoted_law', rule_version=1, is_active=true, metadata=pg_temp.m('promoted_law','RESOLVED') where label='a note'$q$);
-- round 3: successor routing of a retired rule (contracts session section 16.4), and the owner chain up to a valid root
create function pg_temp.rr(succ text, rel text, ref text) returns jsonb language sql as $$
  select jsonb_build_object('retired_routing_v1', jsonb_strip_nulls(jsonb_build_object('successor', succ, 'relation', rel, 'basis', 'fixture', 'decided_by', 'ZURIEL', 'approval_ref', ref))) $$;
select pg_temp.try('D25 VALID successor of a retired rule recorded in retired_routing_v1 with a resolving approval', format($q$update public.nodes set metadata = coalesce(metadata,'{}'::jsonb) || pg_temp.rr('owner_b_law','REPLACED',%L) where rule_id='ownerless_retired_law'; do $c$ begin if (select metadata#>>'{owner_routing,canonical_owner}' from public.nodes where rule_id='ownerless_retired_law') is not null then raise exception 'D25 wrote an owner'; end if; end $c$$q$, :'W1'));
select pg_temp.try('D25b successor routing without an approval reference', $q$update public.nodes set metadata = coalesce(metadata,'{}'::jsonb) || pg_temp.rr('owner_b_law','REPLACED',null) where rule_id='ownerless_retired_law'$q$);
select pg_temp.try('D25c successor routing with an approval reference that does not exist', format($q$update public.nodes set metadata = coalesce(metadata,'{}'::jsonb) || pg_temp.rr('owner_b_law','REPLACED',%L) where rule_id='ownerless_retired_law'$q$, :'WX'));
select pg_temp.try('D25d successor routing to a rule that is itself retired', format($q$update public.nodes set metadata = coalesce(metadata,'{}'::jsonb) || pg_temp.rr('retired_r_law','REPLACED',%L) where rule_id='ownerless_retired_law'$q$, :'W1'));
select pg_temp.try('D25e successor routing written on an active rule', format($q$update public.nodes set metadata = metadata || pg_temp.rr('owner_b_law','REPLACED',%L) where rule_id='legacy_child_law' and is_active$q$, :'W1'));
select pg_temp.try('D25f removal of a recorded successor routing', $q$update public.nodes set metadata = metadata - 'retired_routing_v1' where rule_id='routed_retired_law'$q$);
select pg_temp.try('D25g successor routing without a relation', format($q$update public.nodes set metadata = coalesce(metadata,'{}'::jsonb) || pg_temp.rr('owner_b_law',null,%L) where rule_id='ownerless_retired_law'$q$, :'W1'));
select pg_temp.try('D25h VALID replacement of a recorded successor routing by a new approved one', format($q$update public.nodes set metadata = metadata || pg_temp.rr('owner_a_law','ABSORBED',%L) where rule_id='routed_retired_law'$q$, :'W1'));
select pg_temp.try('D25i VALID other metadata on a retired row that carries a successor routing', $q$update public.nodes set metadata = metadata || '{"note":"x"}' where rule_id='routed_retired_law'$q$);
select pg_temp.try('D25j revival of a retired rule that still carries its successor routing', format($q$update public.nodes set is_active=true, metadata = pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD',%L) || jsonb_build_object('retired_routing_v1', metadata->'retired_routing_v1') where rule_id='routed_retired_law'$q$, :'W1'));
select pg_temp.try('D25k VALID revival with a verdict and an approval that drops the successor routing', format($q$update public.nodes set is_active=true, metadata = pg_temp.m('owner_a_law','EXTEND_EXISTING_SCOPED_CHILD',%L) where rule_id='routed_retired_law'$q$, :'W1'));
select pg_temp.try('D26 child of a child of a retired owner (chain, depth 2)', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('mid_retired_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26b VALID chain of depth 2 that ends at a self-owned active rule', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('legacy_child_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26c owner inside an ownership cycle (a -> b -> a, no root)', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('cyc_a_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26d new version that would close a cycle (an owner moves under its own child)', format($q$update public.nodes set is_active=false where rule_id='owner_a_law'; insert into public.nodes(type,label,description,rule_id,rule_version,supersedes_version,is_active,metadata) values ('rule','A v2','A text 2','owner_a_law',2,1,true,pg_temp.m('legacy_child_law','SUPERSEDE_EXISTING',%L))$q$, :'W1'));
select pg_temp.try('D26e chain that ends at a codex item which does not exist', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('mid_codex_bad_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26f VALID chain that ends at an existing codex item', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('mid_codex_ok_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26g chain through an active rule that records no owner', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('no_owner_mid_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26h VALID chain that ends at a registered document', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('doc_child_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
select pg_temp.try('D26i chain through an owner that does not exist (depth 2)', $q$insert into public.nodes(type,label,rule_id,rule_version,is_active,metadata) values ('rule','gc','grandchild_law',1,true,pg_temp.m('mid_ghost_law','EXTEND_EXISTING_SCOPED_CHILD'))$q$);
create temp table expected(case_id text primary key, live text, proposed text);
insert into expected values
 ('D01 second active version, no lineage','REFUSED','REFUSED'), ('D02 VALID new version, same owner','ALLOWED','ALLOWED'),
 ('D03 new family duplicating an owner, no verdict','ALLOWED','REFUSED'), ('D04 VALID scoped child of an active owner','ALLOWED','ALLOWED'),
 ('D05 new child routed to a retired owner','ALLOWED','REFUSED'), ('D06 new version moves the owner silently','ALLOWED','REFUSED'),
 ('D07 VALID real owner swap A->B with SUPERSEDE_EXISTING and a resolving approval','ALLOWED','ALLOWED'),
 ('D07b owner swap with an approval reference that does not exist','ALLOWED','REFUSED'), ('D07c owner swap with an invented approval text','ALLOWED','REFUSED'),
 ('D08 VALID metadata touch, no owner change','ALLOWED','ALLOWED'), ('D09a new domain without an approval reference','ALLOWED','REFUSED'),
 ('D09b VALID new domain with a resolving approval reference','ALLOWED','ALLOWED'), ('D10 a law inserted inactive is activated without a verdict','ALLOWED','REFUSED'),
 ('D10b VALID activation with a scoped-child verdict, same owner','ALLOWED','ALLOWED'), ('D11 owner changed at the same version','ALLOWED','REFUSED'),
 ('D12 body edited without a new version (active)','ALLOWED','REFUSED'), ('D12b history row edited (inactive version)','ALLOWED','REFUSED'),
 ('D13 owner that does not exist','ALLOWED','REFUSED'), ('D13b codex owner that does not exist','ALLOWED','REFUSED'),
 ('D13c VALID codex owner that exists','ALLOWED','ALLOWED'), ('D13d document owner that no active rule names, without an approval','ALLOWED','REFUSED'),
 ('D13e VALID document owner that an active rule already names (registered)','ALLOWED','ALLOWED'),
 ('D13f VALID new document owner with a resolving approval (authorized)','ALLOWED','ALLOWED'),
 ('D13g owner that is not a rule id, a codex item or a document path','ALLOWED','REFUSED'),
 ('D13h VALID new version keeps the document owner that only its previous version named','ALLOWED','ALLOWED'),
 ('D14 DELETE of a rule row','ALLOWED','REFUSED'), ('D15 TRUNCATE of nodes','ALLOWED','REFUSED'),
 ('D16 VALID retirement (is_active=false, body unchanged)','ALLOWED','ALLOWED'),
 ('D17 type change of a rule row','ALLOWED','REFUSED'), ('D17b type change, then DELETE of the same row','ALLOWED','REFUSED'),
 ('D18 id reset of a rule row','ALLOWED','REFUSED'), ('D19 version changed in place (history row)','ALLOWED','REFUSED'),
 ('D19b rule_id changed in place (active row)','ALLOWED','REFUSED'),
 ('D20 retired family re-activated at v2 without a decision','ALLOWED','REFUSED'), ('D20b retired family revived by a new v3 without a decision','ALLOWED','REFUSED'),
 ('D20c VALID revival at v2 with a verdict and a resolving approval','ALLOWED','ALLOWED'), ('D20d revival at v2 with a verdict but no approval','ALLOWED','REFUSED'),
 ('D21 forged guard stamp, then a new version','ALLOWED','REFUSED'), ('D21b no-op re-retirement of a retired row, then a new version','ALLOWED','REFUSED'),
 ('D22 VALID documented retirement with successor metadata','ALLOWED','ALLOWED'), ('D22b owner written onto a retired row that had none (a successor goes to retired_routing_v1)','ALLOWED','REFUSED'),
 ('D22c owner rewritten on a retired row that had one','ALLOWED','REFUSED'),
 ('D23 VALID row that is not a rule: type, label, description, identity_key and DELETE','ALLOWED','ALLOWED'),
 ('D24 a row that is not a rule promoted to an active rule without a verdict','ALLOWED','REFUSED'),
 ('D25 VALID successor of a retired rule recorded in retired_routing_v1 with a resolving approval','ALLOWED','ALLOWED'),
 ('D25b successor routing without an approval reference','ALLOWED','REFUSED'),
 ('D25c successor routing with an approval reference that does not exist','ALLOWED','REFUSED'),
 ('D25d successor routing to a rule that is itself retired','ALLOWED','REFUSED'),
 ('D25e successor routing written on an active rule','ALLOWED','REFUSED'),
 ('D25f removal of a recorded successor routing','ALLOWED','REFUSED'),
 ('D25g successor routing without a relation','ALLOWED','REFUSED'),
 ('D25h VALID replacement of a recorded successor routing by a new approved one','ALLOWED','ALLOWED'),
 ('D25i VALID other metadata on a retired row that carries a successor routing','ALLOWED','ALLOWED'),
 ('D25j revival of a retired rule that still carries its successor routing','ALLOWED','REFUSED'),
 ('D25k VALID revival with a verdict and an approval that drops the successor routing','ALLOWED','ALLOWED'),
 ('D26 child of a child of a retired owner (chain, depth 2)','ALLOWED','REFUSED'),
 ('D26b VALID chain of depth 2 that ends at a self-owned active rule','ALLOWED','ALLOWED'),
 ('D26c owner inside an ownership cycle (a -> b -> a, no root)','ALLOWED','REFUSED'),
 ('D26d new version that would close a cycle (an owner moves under its own child)','ALLOWED','REFUSED'),
 ('D26e chain that ends at a codex item which does not exist','ALLOWED','REFUSED'),
 ('D26f VALID chain that ends at an existing codex item','ALLOWED','ALLOWED'),
 ('D26g chain through an active rule that records no owner','ALLOWED','REFUSED'),
 ('D26h VALID chain that ends at a registered document','ALLOWED','ALLOWED'),
 ('D26i chain through an owner that does not exist (depth 2)','ALLOWED','REFUSED');
-- every expected REFUSAL must also refuse for its reason (a refusal for another reason is an unexpected outcome)
create temp table expected_reason(case_id text primary key, needle text);
insert into expected_reason values
 ('D01 second active version, no lineage','requires unambiguous immediate predecessor'),
 ('D03 new family duplicating an owner, no verdict','requires an owner-creation verdict'),
 ('D05 new child routed to a retired owner','routes to retired owner'),
 ('D06 new version moves the owner silently','changes its canonical owner without SUPERSEDE_EXISTING'),
 ('D07b owner swap with an approval reference that does not exist','does not resolve to a w'),
 ('D07c owner swap with an invented approval text','does not resolve to a work_log record'),
 ('D09a new domain without an approval reference','requires owner_routing.human_gate'),
 ('D10 a law inserted inactive is activated without a verdict','requires an owner-creation verdict'),
 ('D11 owner changed at the same version','owner changed without a new version'),
 ('D12 body edited without a new version (active)','body changed without a new version'),
 ('D12b history row edited (inactive version)','body changed without a new version'),
 ('D13 owner that does not exist','which does not exist'),
 ('D13b codex owner that does not exist','routes to codex entry project_codex.no_such_slug which does not exist'),
 ('D13d document owner that no active rule names, without an approval','a new document owner requires owner_routing.human_gate'),
 ('D13g owner that is not a rule id, a codex item or a document path','is not a rule id, a project_codex.<slug> or a document path'),
 ('D14 DELETE of a rule row','DELETE of rule'),
 ('D15 TRUNCATE of nodes','TRUNCATE of public.nodes is refused'),
 ('D17 type change of a rule row','cannot change its type'),
 ('D17b type change, then DELETE of the same row','cannot change its type'),
 ('D18 id reset of a rule row','cannot change its id'),
 ('D19 version changed in place (history row)','cannot change its identity or version in place'),
 ('D19b rule_id changed in place (active row)','cannot change its identity or version in place'),
 ('D20 retired family re-activated at v2 without a decision','re-activated without an owner-creation verdict'),
 ('D20b retired family revived by a new v3 without a decision','re-activated without an owner-creation verdict'),
 ('D20d revival at v2 with a verdict but no approval','re-activated without owner_routing.human_gate'),
 ('D21 forged guard stamp, then a new version','written by the rule guard only'),
 ('D21b no-op re-retirement of a retired row, then a new version','re-activated without an owner-creation verdict'),
 ('D22b owner written onto a retired row that had none (a successor goes to retired_routing_v1)','owner changed without a new version'),
 ('D22c owner rewritten on a retired row that had one','owner changed without a new version'),
 ('D25b successor routing without an approval reference','retired_routing_v1 approval reference (none) does not resolve'),
 ('D25c successor routing with an approval reference that does not exist','retired_routing_v1 approval reference work_log:99999999'),
 ('D25d successor routing to a rule that is itself retired','retired_routing_v1 successor retired_r_law is not an active rule'),
 ('D25e successor routing written on an active rule','retired_routing_v1 belongs to a retired row'),
 ('D25f removal of a recorded successor routing','retired_routing_v1 cannot be removed'),
 ('D25g successor routing without a relation','retired_routing_v1 requires a relation'),
 ('D25j revival of a retired rule that still carries its successor routing','retired_routing_v1 belongs to a retired row'),
 ('D26 child of a child of a retired owner (chain, depth 2)','ownership chain reaches retired owner retired_r_law'),
 ('D26c owner inside an ownership cycle (a -> b -> a, no root)','ownership chain is a cycle'),
 ('D26d new version that would close a cycle (an owner moves under its own child)','ownership chain is a cycle'),
 ('D26e chain that ends at a codex item which does not exist','ownership chain reaches codex entry project_codex.no_such_slug which does not exist'),
 ('D26g chain through an active rule that records no owner','ownership chain reaches no_owner_mid_law which records no owner'),
 ('D26i chain through an owner that does not exist (depth 2)','ownership chain reaches owner never_existed_law which does not exist'),
 ('D24 a row that is not a rule promoted to an active rule without a verdict','requires an owner-creation verdict');
select r.case_id || ' => ' || r.outcome || case when r.detail <> '' then ' (' || r.detail || ')' else '' end from result r order by 1;
do $$ declare n int; m text; begin
  select count(*), string_agg(e.case_id || ': expected ' || case when current_setting('g1.variant') = 'live' then e.live else e.proposed end || ', got ' || coalesce(r.outcome,'(missing)'), '; ')
    into n, m from expected e full join result r using (case_id)
   where coalesce(r.outcome,'?') <> coalesce(case when current_setting('g1.variant') = 'live' then e.live else e.proposed end, '?');
  if n > 0 then raise exception 'UNEXPECTED OUTCOME(S) for %: %', current_setting('g1.variant'), m; end if;
  select count(*), string_agg(r.case_id || ': refused for another reason (' || r.detail || ')', '; ') into n, m
    from result r join expected_reason x using (case_id)
   where r.outcome = 'REFUSED' and position(x.needle in r.detail) = 0;
  if n > 0 then raise exception 'UNEXPECTED REFUSAL REASON(S) for %: %', current_setting('g1.variant'), m; end if;
  raise notice 'ALL % CASES AS EXPECTED for %', (select count(*) from expected), current_setting('g1.variant');
end $$;
