-- Included by verified_openweb_account_links_v1.sql after the exact committed
-- identity operation. All IDs/accounts/emails here are disposable fixtures.
create role anon nologin;
create role authenticated nologin;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid',true),'')::uuid
$$;
alter table research_contributions
  add column parent_id uuid,
  add column author_user_id uuid,
  add column author_name text,
  add column body text,
  add column title text,
  add column target_type text,
  add column target_id text,
  add column convergence_slug text,
  add column created_at timestamptz;

update research_contributions r set
  author_name='כותב בדיקה '||f.ordinality,
  body='הפוסט הישן של חשבון '||f.ordinality,
  created_at='2016-03-07'::timestamptz
from fixture f where r.id=f.message_id;

-- One direct incoming reply; then an own-account continuation and a deep reply.
-- The latter has two owned ancestors and must still appear just once.
create temporary table reply_fixture as
select f.*,gen_random_uuid() as direct_id,gen_random_uuid() as self_id,
       gen_random_uuid() as deep_id,gen_random_uuid() as alias_self_id
from fixture f;
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at)
select direct_id,message_id,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','חבר מהקהילה',
       'תגובה ישירה לחשבון '||ordinality,'openweb','approved','2016-03-08' from reply_fixture;
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at)
select self_id,direct_id,account_id,'כותב בדיקה '||ordinality,
       'המשך שלי בחשבון '||ordinality,'community_2029','approved','2016-03-09' from reply_fixture;
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at)
select deep_id,self_id,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','חבר מהקהילה',
       'תגובה עמוקה לחשבון '||ordinality,'openweb','approved','2016-03-10' from reply_fixture;
insert into research_contributions(id,parent_id,author_contributor_id,author_name,body,origin,status,created_at)
select alias_self_id,message_id,contributor_id,'הכינוי הישן',
       'תגובה עצמית מהכינוי '||ordinality,'openweb','approved','2016-03-11' from reply_fixture;
-- These are not public incoming replies and may never enter the exported inbox.
insert into research_contributions(id,parent_id,author_name,body,origin,status,created_at)
select gen_random_uuid(),message_id,'חבר מהקהילה',s.status||' '||ordinality,
       'openweb',s.status,'2016-03-12'
from reply_fixture cross join (values ('pending'),('hidden'),('rejected')) s(status);

-- Same display name, without any canonical account/Person link.
insert into research_contributions(id,author_contributor_id,author_name,body,origin,status,created_at)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddd01',null,'כותב בדיקה 1','שורש ללא שיוך','openweb','approved','2016-03-07');
insert into research_contributions(id,parent_id,author_name,body,origin,status,created_at)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddd02','dddddddd-dddd-4ddd-8ddd-dddddddddd01','חבר מהקהילה','אין לשייך לפי שם','openweb','approved','2016-03-08');

\i supabase/migrations/20261026070000_replies_to_me_community_context_v1.sql

-- Run the reader as the real database role with a synthetic principal. No live
-- JWT/session or impersonated Auth request is created by this acceptance test.
create temporary table browser_accounts(ordinality integer, account_id uuid, rows jsonb, messages jsonb);
create temporary table fixture_messages as
select f.account_id,jsonb_agg(to_jsonb(r)) as messages from reply_fixture f
join research_contributions r on r.id=any(array[f.message_id,f.direct_id,f.self_id,f.deep_id])
group by f.account_id;
grant select on reply_fixture to authenticated;
grant select on fixture_messages to authenticated;
grant select,insert on browser_accounts to authenticated;
set local role authenticated;
do $test$
declare f record; actual jsonb; message_rows jsonb;
begin
  for f in select * from reply_fixture order by ordinality loop
    perform set_config('test.uid',f.account_id::text,true);
    select jsonb_agg(to_jsonb(r) order by r.created_at desc) into actual from replies_to_me() r;
    perform test_assert(jsonb_array_length(actual)=2,'account '||f.ordinality||': exactly two incoming replies');
    perform test_assert((select count(distinct value->>'id')=2 from jsonb_array_elements(actual)),
      'account '||f.ordinality||': multiple owned ancestors/direct plus Person bridges never duplicate');
    perform test_assert((actual->0->>'id')::uuid=f.deep_id and (actual->1->>'id')::uuid=f.direct_id,
      'account '||f.ordinality||': no other account, own alias, name-only or nonpublic row');
    perform test_assert(actual->0->'thread_path'=to_jsonb(array[f.message_id,f.direct_id,f.self_id,f.deep_id]),
      'account '||f.ordinality||': exact old-root path through native continuation');
    perform test_assert((select count(*)=1 and bool_and(id=f.direct_id) from replies_to_me(40,'2016-03-09')),
      'account '||f.ordinality||': history cursor includes only older own replies');
    -- Export only the rows returned by the actual reader and the exact public
    -- messages needed to open them; no identity-edge/email/Auth payload.
    select messages into message_rows from fixture_messages where account_id=f.account_id;
    insert into browser_accounts values(f.ordinality,f.account_id,actual,message_rows);
  end loop;
end $test$;
select set_config('test.uid','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select test_assert((select count(*)=0 from replies_to_me()),'unrelated account receives no historical replies');
select set_config('test.uid','',true);
select test_assert((select count(*)=0 from replies_to_me()),'missing principal receives no historical replies');
reset role;
select test_assert(not has_function_privilege('anon','public.replies_to_me(integer,timestamptz)','EXECUTE'),
  'anonymous role cannot execute personal replies');
select test_assert(not exists(select 1 from contributors where user_id is not null group by user_id having count(*)>1),
  'integrated reader preserves exactly one primary dossier per account');
select test_assert(not exists(select 1 from contributors where dossier_settings->>'visibility'<>'private'),
  'public community replies do not publish private source dossiers');

\pset tuples_only on
\pset format unaligned
\o /tmp/verified-replies-browser.json
select jsonb_build_object('source','disposable-postgresql17-committed-operations','accounts',jsonb_agg(to_jsonb(a) order by ordinality)) from browser_accounts a;
\o
\pset tuples_only off
\pset format aligned
select 'verified identity -> replies reader: 35 assertions PASS' as result;
