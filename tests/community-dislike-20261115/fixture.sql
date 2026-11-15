-- Disposable database only. No live identifiers, readers or URLs.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema public,auth to anon,authenticated;
create table public.research_contributions(
 id uuid primary key,status text,parent_id uuid,origin text default 'openweb',
 deleted_at timestamptz,thread_hidden_at timestamptz,reactions jsonb,
 last_activity_at timestamptz default '2020-01-01T00:00:00Z'
);
alter table public.research_contributions enable row level security;
create policy public_read on public.research_contributions for select using(status='approved');
grant select on public.research_contributions to anon,authenticated;
insert into public.research_contributions(id,status,parent_id,reactions) values
 ('00000000-0000-4000-8000-000000000001','approved',null,'{"likes":27,"dislikes":8,"👍":["v:old"],"🔥":["v:old"]}'),
 ('00000000-0000-4000-8000-000000000002','approved','00000000-0000-4000-8000-000000000001','{}'),
 ('00000000-0000-4000-8000-000000000003','pending',null,'{"likes":99}'),
 ('00000000-0000-4000-8000-000000000004','approved','00000000-0000-4000-8000-000000000003','{}'),
 ('00000000-0000-4000-8000-000000000005','approved',null,'{}'),
 ('00000000-0000-4000-8000-000000000006','approved',null,'{}'),
 ('00000000-0000-4000-8000-000000000007','approved',null,'{}'),
 ('00000000-0000-4000-8000-000000000008','approved','00000000-0000-4000-8000-000000000006','{}'),
 ('00000000-0000-4000-8000-000000000009','approved','00000000-0000-4000-8000-000000000009','{}'),
 ('00000000-0000-4000-8000-000000000010','approved','00000000-0000-4000-8000-000000000099','{}');
update public.research_contributions set deleted_at=now() where id='00000000-0000-4000-8000-000000000005';
update public.research_contributions set thread_hidden_at=now() where id='00000000-0000-4000-8000-000000000006';
update public.research_contributions set origin='forum' where id='00000000-0000-4000-8000-000000000007';
