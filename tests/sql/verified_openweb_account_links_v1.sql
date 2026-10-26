\set ON_ERROR_STOP on
begin;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
create table public.contributors(id uuid primary key,user_id uuid,source text,active boolean,locked boolean,trusted boolean,vip boolean,merged_into text,email text,updated_at timestamptz,dossier_settings jsonb,slug text,code text);
create table public.persons(person_id uuid primary key default gen_random_uuid(),account_user_id uuid unique,first_seen timestamptz,last_seen timestamptz);
create table public.identity_edges(id uuid primary key default gen_random_uuid(),sod_id text not null,person_id uuid references persons(person_id),kind text,legacy_id text,confidence smallint,first_seen timestamptz,last_seen timestamptz,meta jsonb);
create unique index test_legacy_identity_unique on identity_edges(legacy_id) where kind='legacy_seed' and legacy_id is not null;
create table public.research_contributions(id uuid primary key,author_contributor_id uuid,origin text,status text);
create table public.contribution_links(from_contribution_id uuid,target_type text,target_id text);
create table public.g3_openweb_import_stage(message_id text,user_id text,email text,email_verified boolean,created_at timestamptz);
create table public.contributor_claim_events(id bigint generated always as identity,contributor_id uuid,user_id uuid,method text);
create table public.decision_ledger(id uuid primary key default gen_random_uuid(),decision_type text,subject_type text,subject_ref text,candidate jsonb,sources jsonb,domain text,created_by_agent text,evidence jsonb,rules_version jsonb,human_decision text,human_reason text,decided_by text,result_ref jsonb,provenance jsonb,status text);
create function test_assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;

create temporary table fixture as
select contributor_id,gen_random_uuid() as account_id,gen_random_uuid() as person_id,gen_random_uuid() as message_id,
       'fixture-'||ordinality as source_id,'fixture-'||ordinality||'@example.invalid' as email,ordinality
from unnest(array['b8c49719-6fd4-4027-ada1-1a986466eaf9','4a6ae4d2-5372-4b7b-8e3b-3a230dc1a291','8894bec6-b252-4405-bcd9-3773488e2a91','2b189295-f30d-4061-a1a0-b26afb313863','4cd9c034-0464-4600-a35d-7156f0584d9b','19936860-6b35-4386-bc44-113289858ff0']::uuid[]) with ordinality as f(contributor_id,ordinality);
insert into auth.users(id,email,email_confirmed_at) select account_id,email,now() from fixture;
insert into contributors(id,source,active,locked,trusted,vip,email,dossier_settings)
select contributor_id,'openweb_import',true,false,false,false,email,'{"visibility":"private"}' from fixture;
insert into persons(person_id,account_user_id,first_seen,last_seen) select person_id,account_id,now(),now() from fixture;
insert into research_contributions select message_id,contributor_id,'openweb','approved' from fixture;
insert into contribution_links select message_id,'openweb_message',message_id::text from fixture;
insert into contribution_links select message_id,'openweb_user',source_id from fixture;
insert into g3_openweb_import_stage select message_id::text,source_id,email,true,'2016-03-08'::timestamptz from fixture;
-- Four current primary dossiers remain the only primary for their account.
insert into contributors(id,user_id,source,active,dossier_settings,slug)
select gen_random_uuid(),account_id,'self-dossier',true,'{"visibility":"private"}','canonical-'||ordinality from fixture where ordinality in(2,4,5,6);
update contributors set merged_into='canonical-6' where id='19936860-6b35-4386-bc44-113289858ff0';

savepoint missing_source_proof;
update g3_openweb_import_stage set email_verified=false where user_id='fixture-1';
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for unverified source email
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to missing_source_proof;
select test_assert((select count(*)=0 from identity_edges) and (select count(*)=0 from decision_ledger) and (select count(*)=4 from contributors where user_id is not null),'failed late source proof leaves no partial bindings');

savepoint duplicate_account;
insert into auth.users(id,email,email_confirmed_at) select gen_random_uuid(),email,now() from fixture where ordinality=1;
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for ambiguous account
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to duplicate_account;
select test_assert((select count(*)=0 from identity_edges),'ambiguous email never binds a Person');

savepoint no_account_person;
delete from persons where account_user_id=(select account_id from fixture where ordinality=1);
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for absent existing Person
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to no_account_person;
select test_assert((select count(*)=6 from persons) and (select count(*)=0 from identity_edges),'no Person is invented');

savepoint conflicting_person;
insert into identity_edges(sod_id,person_id,kind,legacy_id)
select 'historical:contributor:b8c49719-6fd4-4027-ada1-1a986466eaf9',person_id,'legacy_seed','contributor:b8c49719-6fd4-4027-ada1-1a986466eaf9' from fixture where ordinality=2;
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for conflicting Person
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to conflicting_person;
select test_assert((select count(*)=0 from identity_edges),'conflicting ownership is never overwritten');

savepoint merged_profile;
update contributors set merged_into='existing-merge' where id=(select contributor_id from fixture where ordinality=1);
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for unresolved merge
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to merged_profile;
select test_assert((select count(*)=0 from identity_edges),'unresolved merges remain untouched');

savepoint wrong_account_merge;
update contributors set merged_into='canonical-5' where id='19936860-6b35-4386-bc44-113289858ff0';
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for cross-account merge
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to wrong_account_merge;
select test_assert((select count(*)=0 from identity_edges),'merge to another account cannot join their histories');

savepoint unowned_merge;
update contributors set user_id=null where slug='canonical-6';
\set ON_ERROR_STOP off
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
\if :ERROR
\else
  \echo expected rejection for unowned merge target
  \quit 3
\endif
\set ON_ERROR_STOP on
rollback to unowned_merge;
select test_assert((select count(*)=0 from identity_edges),'NULL owner of a merge target fails closed');

-- Reproduce the already-applied four-profile batch before adding the owner's two.
insert into identity_edges(sod_id,person_id,kind,legacy_id,confidence,first_seen,last_seen)
select 'historical:contributor:'||contributor_id,person_id,'legacy_seed','contributor:'||contributor_id,100,'2016-03-08','2016-03-08' from fixture where ordinality<=4;
insert into identity_edges(sod_id,person_id,kind,legacy_id,confidence,first_seen,last_seen)
select 'historical:openweb:'||source_id,person_id,'legacy_seed','openweb_user:'||source_id,100,'2016-03-08','2016-03-08' from fixture where ordinality<=4;
insert into decision_ledger(subject_type,subject_ref,provenance,status)
select 'contributor',contributor_id::text,'{"task_key":"VERIFIED_LEGACY_ACCOUNT_LINKS_20261026"}','applied' from fixture where ordinality<=4;
update contributors c set user_id=f.account_id from fixture f where c.id=f.contributor_id and f.ordinality in(1,3);
insert into contributor_claim_events(contributor_id,user_id,method)
select contributor_id,account_id,'verified_source_email_human_gate' from fixture where ordinality in(1,3);
create temporary table first_four_edges as select id from identity_edges;
select test_assert((select count(*)=8 from identity_edges),'four-profile applied baseline reproduced');

\i scripts/ops/link-verified-openweb-accounts-20261026.sql
select test_assert((select count(*)=12 from identity_edges),'six exact Contributor/source pairs linked');
select test_assert((select count(*)=8 from identity_edges e join first_four_edges previous using(id)),'the first four identity links retain their exact edge IDs');
select test_assert(not exists(select 1 from identity_edges ie join fixture f on ie.legacy_id='contributor:'||f.contributor_id::text where ie.person_id<>f.person_id),'each alias belongs to the correct account Person');
select test_assert((select count(*)=2 from contributors where source='openweb_import' and user_id is not null),'only accounts without primary dossier receive direct primary links');
select test_assert(not exists(select 1 from contributors where user_id is not null group by user_id having count(*)>1),'primary identity remains unambiguous');
select test_assert((select count(*)=4 from contributors where source='self-dossier' and user_id is not null),'existing primary dossiers retained');
select test_assert((select count(*)=6 from persons) and (select count(*)=6 from auth.users),'no accounts or Persons created');
select test_assert((select count(*)=6 from research_contributions) and (select count(*)=12 from contribution_links),'source rows and provenance retained');
select test_assert(not exists(select 1 from contributors where dossier_settings->>'visibility'<>'private'),'privacy remains private');
select test_assert((select user_id is null and merged_into='canonical-6' from contributors where id='19936860-6b35-4386-bc44-113289858ff0'),'same-account alias stays intact without duplicate primary');
select test_assert((select count(*)=6 from decision_ledger) and (select count(*)=2 from contributor_claim_events),'existing audit ledgers record exact changes');
\i scripts/ops/link-verified-openweb-accounts-20261026.sql
select test_assert((select count(*)=12 from identity_edges) and (select count(*)=6 from decision_ledger) and (select count(*)=2 from contributor_claim_events),'replay is idempotent');
select 'verified historical account links PostgreSQL acceptance: PASS' as result;
rollback;
