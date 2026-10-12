-- Isolated PostgreSQL fixture. Tests persistence/privacy, not ELS arithmetic.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to public;
create table public.users(id uuid primary key,role text,display_name text,username text);
insert into users values
 ('00000000-0000-0000-0000-000000000001','member','Member A','a'),
 ('00000000-0000-0000-0000-000000000002','member','Member B','b'),
 ('00000000-0000-0000-0000-000000000003','admin','Admin','admin');
create table els_records(
 id uuid primary key default gen_random_uuid(),owner_user_id uuid,author_name text,
 search_term text,scope text,skip_distance int,direction text,positions jsonb,image_url text,
 title text,description text,source text,status text check(status in ('draft','pending','published','hidden','archived')),
 visibility text check(visibility in ('public','member','premium','admin','private')),slug text unique,
 self_published boolean default false,corpus_id text,term_norm text,start_index int,engine_detail jsonb,
 created_at timestamptz default now());
alter table els_records enable row level security;
create policy els_owner_read on els_records for select to authenticated using(owner_user_id=auth.uid());
create policy public_read_published_els on els_records for select using(status='published' and visibility='public');
create policy public_read_self_published_els on els_records for select using(self_published=true);
create policy admin_all_els on els_records to authenticated using(exists(select 1 from users where id=auth.uid() and role='admin'));
grant select on els_records,users to anon,authenticated;
create function fn_els_term_norm(t text) returns text language sql immutable as $$select replace(t,' ','')$$;
create function fn_els_corpus_id(s text) returns text language sql immutable as $$select 'test-corpus-'||s$$;
create function els_slugify(t text,s int) returns text language sql immutable as $$select replace(t,' ','-')||'-'||s$$;
create table test_publish_gate_calls(start_index int);
create function els_publish_truth_gate_v1(text,text,int,text,int,text default null,boolean default false)
 returns text language plpgsql as $$begin insert into test_publish_gate_calls values($5);return case when $5>=0 then 'MATCH' else 'REPLAY_MISMATCH' end;end$$;
create table topic_cards(slug text,node_id uuid);
create table research_contributions(author_user_id uuid,author_name text,intent text,origin text,research_state text,status text,target_type text,target_id text,title text,body text,gematria_claim text,graph_node_id uuid);
create function test_expect(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION: %',msg;end if;end$$;
grant select on research_contributions,test_publish_gate_calls to authenticated;
