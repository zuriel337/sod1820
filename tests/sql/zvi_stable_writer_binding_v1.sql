-- Focused SQL test for 20261004064040_zvi_stable_writer_binding_v1.sql + 20261004111500_zvi_stable_writer_fallback_retirement_v1.sql.
-- Runs against a THROWAWAY local Postgres with minimal stubs (never the live project). Each check raises on failure.
\set ON_ERROR_STOP on
create table contributors (id uuid primary key, display_name text, wa_names text[]);
create table channel_updates (id uuid primary key default gen_random_uuid(), channel text, credit text, text text default 'x');
create table research_contributions (id uuid primary key default gen_random_uuid(), author_contributor_id uuid, author_user_id uuid);
create table research_objects (id uuid primary key default gen_random_uuid(), status text, source_ref text, meta jsonb, contributor text, privacy_scope text default 'private');
create role anon; create role authenticated;

insert into contributors values
 ('c66f0464-0928-490e-be9b-66d8a87e7fc8','צבי (OPOC)','{"OPOC1 OPOC1","צבי"}'),
 ('11111111-1111-1111-1111-111111111111','Other',null);

-- legacy fixture: 680 eligible + the rows that must stay untouched
insert into channel_updates(channel,credit) select 'torat-haremez','צבי (OPOC)' from generate_series(1,680);
insert into channel_updates(id,channel,credit) values
 ('a0000000-0000-0000-0000-000000000001','torat-haremez','OPOC1 OPOC1'),
 ('a0000000-0000-0000-0000-000000000002','torat-haremez','צבי'),
 ('a0000000-0000-0000-0000-000000000003','gilui-yomi','צבי (OPOC)'),
 ('a0000000-0000-0000-0000-000000000004','torat-haremez','רזיאל · AI');

-- precondition: exactly 680 eligible rows
do $$ begin
  if (select count(*) from channel_updates where channel='torat-haremez' and credit='צבי (OPOC)') <> 680 then raise exception 'precondition: eligible <> 680'; end if;
end $$;

-- research_objects fixtures that exist BEFORE migration (historical state snapshot)
insert into research_objects(status,source_ref,meta,contributor)
 select 'candidate','channel_updates:'||id, '{}', credit from channel_updates where id::text like 'a0000000%';
create temp table ro_before as select id,status,source_ref,meta,contributor,privacy_scope from research_objects;
create temp table cu_credit_before as select id,credit,channel from channel_updates;

\i supabase/migrations/20261004064040_zvi_stable_writer_binding_v1.sql
\i supabase/migrations/20261004111500_zvi_stable_writer_fallback_retirement_v1.sql
-- the migrations only (re)define the function; install the trigger as in 20260927195900
create trigger trg_00 before insert or update of status, source_ref on research_objects
 for each row execute function public.fn_zvi_standing_approve_research_object();

do $$ declare n int; begin
  -- backfill: exact 680, only Zvi id, only torat-haremez+exact credit
  select count(*) into n from channel_updates where contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8';
  if n <> 680 then raise exception 'backfill count % <> 680', n; end if;
  select count(*) into n from channel_updates where contributor_id is not null and not (channel='torat-haremez' and credit='צבי (OPOC)');
  if n <> 0 then raise exception 'backfill leaked to non-candidate rows: %', n; end if;
  -- alias rows, short צבי, other channel, bot remain null
  select count(*) into n from channel_updates where id::text like 'a0000000%' and contributor_id is not null;
  if n <> 0 then raise exception 'noncandidate rows bound: %', n; end if;
  -- historical research_objects and credit text unchanged
  select count(*) into n from (select id,status,source_ref,meta,contributor,privacy_scope from research_objects except select * from ro_before) d;
  if n <> 0 then raise exception 'research_objects changed by migration'; end if;
  select count(*) into n from (select id,credit,channel from channel_updates except select * from cu_credit_before) d;
  if n <> 0 then raise exception 'credit/channel text changed'; end if;
  -- FK enforced
  begin
    update channel_updates set contributor_id='22222222-2222-2222-2222-222222222222' where id='a0000000-0000-0000-0000-000000000001';
    raise exception 'FK not enforced';
  exception when foreign_key_violation then null; end;
end $$;

-- trigger behaviour on NEW research objects
insert into channel_updates(id,channel,credit,contributor_id) values
 ('b0000000-0000-0000-0000-000000000001','torat-haremez','צבי (OPOC)','11111111-1111-1111-1111-111111111111'), -- other id + matching credit
 ('b0000000-0000-0000-0000-000000000002','torat-haremez','Someone','c66f0464-0928-490e-be9b-66d8a87e7fc8'),   -- stable id, other text
 ('b0000000-0000-0000-0000-000000000003','gilui-yomi','צבי (OPOC)',null),                                      -- legacy NULL-id + matching credit: fallback retired
 ('b0000000-0000-0000-0000-000000000004','torat-haremez','OPOC1 OPOC1',null),                                  -- alias unbound
 ('b0000000-0000-0000-0000-000000000005','torat-haremez','רזיאל · AI',null),
 ('b0000000-0000-0000-0000-000000000006','torat-haremez','צבי (OPOC)',null);                                   -- NULL id + exact credit on canonical channel: rejected                                   -- bot null
insert into research_objects(status,source_ref) select 'candidate','channel_updates:'||id from channel_updates where id::text like 'b0000000%';

do $$ declare s text; begin
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000001';
  if s <> 'candidate' then raise exception 'other-id + matching credit gained approval: %', s; end if;
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000002';
  if s <> 'approved' then raise exception 'stable id not approved: %', s; end if;
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000003';
  if s <> 'candidate' then raise exception 'legacy null-id credit fallback not retired: %', s; end if;
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000004';
  if s <> 'candidate' then raise exception 'alias row approved: %', s; end if;
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000005';
  if s <> 'candidate' then raise exception 'bot row approved: %', s; end if;
  select status into s from research_objects where source_ref='channel_updates:b0000000-0000-0000-0000-000000000006';
  if s <> 'candidate' then raise exception 'NULL-id matching credit approved after retirement: %', s; end if;
  -- governance-only: privacy untouched, not published/canonical
  if exists (select 1 from research_objects where status='approved' and (privacy_scope<>'private' or meta#>>'{governance,published}'<>'false' or meta#>>'{governance,canonicalized}'<>'false')) then
    raise exception 'approval widened scope'; end if;
  -- research_contributions stable-id path unchanged
  insert into research_contributions(id,author_contributor_id) values ('c0000000-0000-0000-0000-000000000001','c66f0464-0928-490e-be9b-66d8a87e7fc8');
  insert into research_objects(status,source_ref) values ('candidate','research_contributions:c0000000-0000-0000-0000-000000000001');
  select status into s from research_objects where source_ref='research_contributions:c0000000-0000-0000-0000-000000000001';
  if s <> 'approved' then raise exception 'research_contributions path regressed'; end if;
  -- function not executable by client roles
  if has_function_privilege('anon','public.fn_zvi_standing_approve_research_object()','execute')
     or has_function_privilege('authenticated','public.fn_zvi_standing_approve_research_object()','execute') then raise exception 'client roles can execute definer fn'; end if;
end $$;
select 'ZVI_STABLE_WRITER_BINDING_SQL_PASS' as result;
