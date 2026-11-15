-- Isolated fixture only. Auth and classification are dependencies, not reimplementations.
create schema auth;
create role anon;
create role authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.rd_is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
create table public.persons(person_id uuid primary key default gen_random_uuid(),account_user_id uuid,created_at timestamptz default now(),first_seen timestamptz,last_seen timestamptz,first_source text);
create table public.users(id uuid primary key,role text,display_name text,username text);
create table public.events(event_id uuid default gen_random_uuid(),ts timestamptz not null default now(),sod_id text,person_id uuid,session_id text,surface text,event_type text,path text,ref_host text,via text,app_context text,device text,journey_id text,depth_reached smallint,utm jsonb,is_bot boolean not null default false,props jsonb,ingest_at timestamptz default now());
create function public.resolve_person(text,text,text) returns uuid language sql as $$select null::uuid$$;
create function public.fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean) language sql as $$select null::text,'unknown'::text,false where false$$;
grant usage on schema public,auth to anon,authenticated;
