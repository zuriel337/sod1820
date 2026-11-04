\set ON_ERROR_STOP on
begin;
create schema auth;
create table auth.users(id uuid primary key,email text,created_at timestamptz,email_confirmed_at timestamptz,deleted_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
create table public.users(id uuid primary key,avatar_url text,role text default 'user');
create table public.contributors(id uuid primary key,user_id uuid,source text,active boolean,locked boolean,trusted boolean,vip boolean,merged_into text,email text,updated_at timestamptz,dossier_settings jsonb);
create table public.persons(person_id uuid primary key default gen_random_uuid(),account_user_id uuid unique,first_seen timestamptz,last_seen timestamptz,first_source text,first_app_context text);
create table public.identity_edges(id uuid primary key default gen_random_uuid(),sod_id text not null,person_id uuid references persons(person_id),kind text,legacy_id text,confidence smallint,first_seen timestamptz,last_seen timestamptz,meta jsonb);
create unique index test_legacy_identity_unique on identity_edges(legacy_id) where kind='legacy_seed' and legacy_id is not null;
create table public.research_contributions(id uuid primary key,author_contributor_id uuid,author_user_id uuid,origin text,status text,created_at timestamptz,body text);
create table public.contribution_links(from_contribution_id uuid,target_type text,target_id text);
create table public.contributor_claim_events(id bigint generated always as identity,contributor_id uuid,user_id uuid,method text);
create table public.decision_ledger(id uuid primary key default gen_random_uuid(),decision_type text,subject_type text,subject_ref text,candidate jsonb,sources jsonb,domain text,created_by_agent text,evidence jsonb,rules_version jsonb,human_decision text,human_reason text,decided_by text,result_ref jsonb,provenance jsonb,status text);
-- The live identity-edge trigger must run too. This account and these reserved
-- historical keys have no Follow preferences; prove that no consent is invented.
create table public.notification_prefs(user_id uuid,visitor_id text,topics text[],channels text[],intensity text,muted_until timestamptz,updated_at timestamptz);
\i supabase/migrations/20260916182800_g3_f_guest_account_claim_lock_v1.sql
create trigger trg_identity_edges_claim_follow_prefs after insert or update on identity_edges
for each row when (new.kind in ('login','legacy_seed')) execute function claim_follow_prefs_from_identity();
create function test_assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; raise notice 'PASS: %',message; end $$;

-- Synthetic account only. Intentionally no old email and no account Person.
insert into auth.users(id,email,created_at,email_confirmed_at) values('365fb241-77ed-4a9d-98ab-4e30ab53c093','fixture@example.invalid','2026-11-04T17:57:06Z',now());
insert into public.users(id) values('365fb241-77ed-4a9d-98ab-4e30ab53c093');
insert into contributors(id,source,active,locked,trusted,vip,updated_at,dossier_settings)
values('1f95f46b-b18b-480b-a2d2-8a9ce90eb194','openweb_import',true,false,false,false,'2026-10-31','{"visibility":"private"}');
insert into research_contributions(id,author_contributor_id,origin,status,created_at,body)
select gen_random_uuid(),'1f95f46b-b18b-480b-a2d2-8a9ce90eb194','openweb',case when n=1 then 'pending' else 'approved' end,
  '2026-10-21T20:40:36Z'::timestamptz+n*interval '1 minute','Original body '||n from generate_series(1,12) n;
insert into contribution_links select id,'openweb_user','U_QAu9LlY39eZZzLYi' from research_contributions;
insert into research_contributions(id,author_user_id,origin,status,created_at,body)
values('81e82bc4-5c05-408b-92b0-4779732c418f','365fb241-77ed-4a9d-98ab-4e30ab53c093','community_2029','approved','2026-11-04T18:01:43.375921Z','New message');
create temporary table source_before as select jsonb_agg(to_jsonb(r) order by id) rows from research_contributions r;
create temporary table links_before as select jsonb_agg(to_jsonb(r) order by from_contribution_id,target_type) rows from contribution_links r;
create temporary table auth_before as select to_jsonb(a) row from auth.users a;

-- Negative cases are appended below; each includes the exact operational SQL.

savepoint wrong_owner;
update contributors set user_id=gen_random_uuid();
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: wrong_owner
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to wrong_owner;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'wrong_owner: atomic rejection, no identity/photo mutation');

savepoint existing_primary;
insert into contributors(id,user_id) values(gen_random_uuid(),'365fb241-77ed-4a9d-98ab-4e30ab53c093');
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: existing_primary
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to existing_primary;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'existing_primary: atomic rejection, no identity/photo mutation');

savepoint unconfirmed;
update auth.users set email_confirmed_at=null;
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: unconfirmed
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to unconfirmed;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'unconfirmed: atomic rejection, no identity/photo mutation');

savepoint deleted;
update auth.users set deleted_at=now();
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: deleted
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to deleted;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'deleted: atomic rejection, no identity/photo mutation');

savepoint anonymous;
update auth.users set is_anonymous=true;
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: anonymous
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to anonymous;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'anonymous: atomic rejection, no identity/photo mutation');

savepoint banned;
update auth.users set banned_until=now()+interval '1 day';
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: banned
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to banned;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'banned: atomic rejection, no identity/photo mutation');

savepoint missing_native_proof;
delete from research_contributions where origin='community_2029';
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: missing_native_proof
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to missing_native_proof;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'missing_native_proof: atomic rejection, no identity/photo mutation');

savepoint missing_source_proof;
delete from contribution_links where from_contribution_id=(select id from research_contributions where origin='openweb' limit 1);
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: missing_source_proof
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to missing_source_proof;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'missing_source_proof: atomic rejection, no identity/photo mutation');

savepoint wrong_source;
update contribution_links set target_id='another-source';
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: wrong_source
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to wrong_source;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'wrong_source: atomic rejection, no identity/photo mutation');

savepoint changed_scope;
delete from research_contributions where id=(select id from research_contributions where origin='openweb' limit 1);
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: changed_scope
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to changed_scope;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'changed_scope: atomic rejection, no identity/photo mutation');

savepoint merged;
update contributors set merged_into='another-contributor';
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: merged
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to merged;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'merged: atomic rejection, no identity/photo mutation');

savepoint protected;
update contributors set locked=true;
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: protected
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to protected;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'protected: atomic rejection, no identity/photo mutation');

savepoint conflicting_edge;
insert into persons(person_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into identity_edges(sod_id,person_id,kind,legacy_id) values('historical:openweb:U_QAu9LlY39eZZzLYi','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy_seed','openweb_user:U_QAu9LlY39eZZzLYi');
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: conflicting_edge
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to conflicting_edge;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'conflicting_edge: atomic rejection, no identity/photo mutation');

savepoint late_audit_failure;
alter table decision_ledger add constraint synthetic_late_failure check(false);
\set ON_ERROR_STOP off
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
\if :ERROR
\else
  \echo expected rejection: late_audit_failure
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to late_audit_failure;
select test_assert((select count(*)=0 from persons) and (select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select user_id is null from contributors) and (select avatar_url is null from public.users),'late_audit_failure: atomic rejection, no identity/photo mutation');

-- Existing account Person and chosen photo are preserved.
savepoint existing_person_photo;
insert into persons(person_id,account_user_id,first_seen,last_seen) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','365fb241-77ed-4a9d-98ab-4e30ab53c093','2026-11-04','2026-11-04');
update public.users set avatar_url='https://example.invalid/chosen.jpg';
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
select test_assert((select count(*)=1 from persons) and (select count(*)=2 from identity_edges where person_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') and (select avatar_url='https://example.invalid/chosen.jpg' from public.users),'existing Person reused; chosen image preserved');
rollback to existing_person_photo;

-- Positive case matches the reviewed missing-Person/empty-photo baseline.
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
select test_assert((select count(*)=1 from persons) and (select count(*)=2 from identity_edges),'one canonical account Person and two exact historical edges');
select test_assert((select user_id='365fb241-77ed-4a9d-98ab-4e30ab53c093' from contributors) and (select count(*)=1 from contributor_claim_events),'one primary Contributor and one audited claim');
select test_assert((select avatar_url='https://sod1820.co.il/community-avatars/1215acc5cd59c120f52d.jpg' from public.users),'original public avatar restored to the empty account profile');
select test_assert((select dossier_settings->>'visibility'='private' and email is null and merged_into is null from contributors),'private dossier and missing source email untouched');
select test_assert((select jsonb_agg(to_jsonb(r) order by id) from research_contributions r)=(select rows from source_before) and (select jsonb_agg(to_jsonb(r) order by from_contribution_id,target_type) from contribution_links r)=(select rows from links_before),'all original messages/status/timestamps/bodies/provenance unchanged');
select test_assert((select to_jsonb(a) from auth.users a)=(select row from auth_before),'Auth identity/email/verification unchanged');
select test_assert((select count(*)=0 from notification_prefs),'canonical identity trigger creates no Follow or delivery consent');
select test_assert((select count(*)=1 from decision_ledger where evidence->>'email_match_claimed'='false' and evidence->>'manual_owner_confirmation'='true' and provenance->>'account_person_created'='true' and jsonb_array_length(provenance->'new_edge_ids')=2 and provenance->>'claim_event_id' is not null),'honest manual Human Gate and exact rollback provenance');
create temporary table edges_after as select jsonb_agg(to_jsonb(r) order by id) rows from identity_edges r;
create temporary table person_after as select to_jsonb(r) row from persons r;
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
select test_assert((select count(*)=1 from decision_ledger) and (select count(*)=1 from contributor_claim_events) and (select jsonb_agg(to_jsonb(r) order by id) from identity_edges r)=(select rows from edges_after) and (select to_jsonb(r) from persons r)=(select row from person_after),'identical replay preserves IDs/bounds and creates no duplicates');
update public.users set avatar_url=null;
\i scripts/ops/link-torah-tamima-approved-account-20261104.sql
select test_assert((select avatar_url is null from public.users),'replay preserves a later user photo removal');
rollback;
