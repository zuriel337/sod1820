-- LOCAL ONLY: deterministic synthetic rows, no production data.
create table public.gematria_words (
 id uuid primary key, source text, vip_source text, is_verified boolean,
 dna_status text, node_id uuid, category text, tags text[], is_published boolean,
 is_encrypted boolean
);
create table public.bidim (
 word_id uuid, phrase text, method text, value bigint, bid_id text primary key,
 provenance_state text, method_version integer, dependency_version_snapshot jsonb,
 computed_at timestamptz, engine_run_id uuid, verified_at timestamptz,
 verified_run_id uuid, verified_method_version integer, verified_mismatch_value bigint
);
create table public.site_flags (key text primary key, enabled boolean, mode text, message text);
-- Only auth identity lookup is synthetic. The admin encrypted-read predicate below
-- was read from pg_policies on 2026-10-14; no live identity data was copied.
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table public.users(id uuid primary key, role text);
insert into public.users values ('00000000-0000-0000-0000-000000000001','admin'),
 ('00000000-0000-0000-0000-000000000002','member');
grant usage on schema auth to anon,authenticated,service_role,lab_admin;
grant select on public.users to anon,authenticated,service_role,lab_admin;
insert into public.site_flags values ('fx_existing_sentinel', true, 'all', 'must not change');
insert into public.gematria_words
select md5('word-'||g)::uuid, 'source-'||(g%4), case when g%7=0 then 'vip' end,
 case when g%13=0 then null else g%11<>0 end, 'verified', md5('node-'||g)::uuid,
 'fixture', case when g%9=0 then null else array['t','same'] end,
 case when g%17=0 then null else g%19<>0 end,
 case when g%23=0 then null else g%29=0 end
from generate_series(1,1800) g;
with methods as (
 select array_agg(k order by k nulls last) keys from
 (select method_key k from public.gematria_methods union all select 'unknown_method' union all select null) x
)
insert into public.bidim
select md5('word-'||g)::uuid,
 case when g%37=0 then null else 'מילה משותפת '||(g%11) end,
 keys[1+((g-1)%array_length(keys,1))],
 case when g<=120 then 787 else 7871 end,
 'b-'||lpad(g::text,6,'0'), 'fixture', 1, '{"רגיל":1}'::jsonb,
 '2026-10-14 12:00:00+00', md5('engine-'||g)::uuid,
 '2026-10-14 12:01:00+00', md5('run-'||g)::uuid, 1,
 case when g%31=0 then 9 end
from generate_series(1,1800) g cross join methods;
-- Explicit rows cover bigint boundaries, duplicate phrase/method keys, NULL method/phrase,
-- and encrypted/public/draft/unverified records under a single target value.
insert into public.gematria_words values
 (md5('edge-public')::uuid,'edge',null,true,null,null,null,null,true,false),
 (md5('edge-encrypted')::uuid,'edge',null,true,null,null,null,null,true,true),
 (md5('edge-draft')::uuid,'edge',null,true,null,null,null,null,false,false),
 (md5('edge-unverified')::uuid,'edge',null,false,null,null,null,null,true,false);
insert into public.bidim(word_id,phrase,method,value,bid_id) values
 (md5('edge-public')::uuid,'same','רגיל',0,'edge-1'),
 (md5('edge-public')::uuid,'same','רגיל',0,'edge-2'),
 (md5('edge-public')::uuid,null,'רגיל',0,'edge-null-phrase'),
 (md5('edge-public')::uuid,'same',null,0,'edge-null-method'),
 (md5('edge-public')::uuid,'same','unknown_method',0,'edge-unknown-method'),
 (md5('edge-encrypted')::uuid,'secret','רגיל',0,'edge-encrypted'),
 (md5('edge-draft')::uuid,'draft','רגיל',0,'edge-draft'),
 (md5('edge-unverified')::uuid,'unverified','רגיל',0,'edge-unverified'),
 (md5('edge-public')::uuid,'negative','רגיל',-1,'edge-negative'),
 (md5('edge-public')::uuid,'min','רגיל',-9223372036854775808,'edge-min'),
 (md5('edge-public')::uuid,'max','רגיל',9223372036854775807,'edge-max');
create index on public.bidim(value);
alter table public.gematria_words enable row level security;
alter table public.bidim enable row level security;
alter table public.gematria_methods enable row level security;
create policy words_read on public.gematria_words for select
 using ((is_encrypted=false or is_encrypted is null) and is_verified=true and is_published=true);
create policy words_admin_encrypted on public.gematria_words for select
 using(is_encrypted=true and exists(select 1 from public.users where users.id=auth.uid() and users.role='admin'));
create policy bidim_read on public.bidim for select using
 (exists(select 1 from public.gematria_words w where w.id=bidim.word_id and w.is_verified=true and w.is_published=true));
create policy methods_read on public.gematria_methods for select using(true);
grant usage on schema public to anon, authenticated, service_role, lab_admin, lab_denied;
grant select on public.gematria_words,public.bidim,public.gematria_methods to anon,authenticated,service_role,lab_admin;
analyze public.gematria_words; analyze public.bidim; analyze public.gematria_methods;
