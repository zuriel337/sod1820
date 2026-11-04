-- Test-only compatible schema, containing no production data. Only columns used
-- by the original SQL functions are present; this is not a full backup/restore.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole;
alter role supabase_auth_admin set search_path=auth,public;
create schema auth authorization supabase_auth_admin;
grant usage on schema public, auth to anon, authenticated, service_role;
grant create on schema public to supabase_auth_admin;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claims',true)::jsonb->>'role';
$$;
alter function auth.uid() owner to supabase_auth_admin;
alter function auth.role() owner to supabase_auth_admin;
create table public.users(id uuid primary key, role text);
create table public.profiles(user_id uuid primary key, tier integer);
create table public.ai_token_log(id bigint primary key, source text, model text,
  created_at timestamptz, input_tokens bigint, output_tokens bigint);
create table public.api_pricing(model text, usd_per_m_input numeric, usd_per_m_output numeric,
  usd_to_ils numeric, valid_from date, valid_until date);
create table public.ai_usage(day date, identity text, tier text, n integer, updated_at timestamptz, primary key(day,identity));
create table public.site_flags(key text primary key, enabled boolean, mode text, message text);
create table public.gematria_words(id uuid primary key, phrase text, ragil bigint,
  lead_rank integer, is_verified boolean, is_published boolean, is_encrypted boolean,
  node_id uuid, created_at timestamptz, source text, vip_source text, dna_status text,
  category text, tags text[], space text);
create table public.gematria_methods(method_key text primary key, category text,
  mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean,
  final_letter_sensitive boolean, derived_from text[], operator text, execution_kind text,
  active boolean, scannable boolean, "function" text, version integer,
  dependency_verified_at timestamptz, dependency_version integer, dependency_versions jsonb);
create table public.bidim(bid_id text primary key, word_id uuid references public.gematria_words(id),
  method text, phrase text, value bigint, provenance_state text, method_version integer,
  dependency_version_snapshot jsonb, computed_at timestamptz, engine_run_id uuid,
  verified_at timestamptz, verified_run_id uuid, verified_method_version integer,
  verified_mismatch_value bigint);
create table public.nodes(id uuid primary key, type text, label text, description text, is_active boolean, metadata jsonb);
create table public.topic_cards(id uuid primary key, slug text, title text, status text,
  numbers integer[], highlight_numbers integer[]);
create table public.gallery_images(id uuid primary key, all_values integer[]);
create table public.tanach_verses(book text, chapter integer, verse integer, text text, book_idx integer, ragil bigint);

-- Empty test corpus is deliberately not populated with invented numeric evidence.
do $$ declare tab record; begin
  for tab in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security',tab.tablename);
    execute format('revoke all on public.%I from public,anon,authenticated',tab.tablename);
    execute format('grant all on public.%I to service_role',tab.tablename);
  end loop;
end $$;
grant select on public.gematria_words,public.gematria_methods,public.bidim,public.nodes,
  public.topic_cards,public.gallery_images,public.tanach_verses to anon,authenticated;
create policy empty_corpus on public.gematria_words for select to anon,authenticated using(false);
create policy empty_corpus on public.gematria_methods for select to anon,authenticated using(false);
create policy empty_corpus on public.bidim for select to anon,authenticated using(false);
create policy empty_corpus on public.nodes for select to anon,authenticated using(false);
create policy empty_corpus on public.topic_cards for select to anon,authenticated using(false);
create policy empty_corpus on public.gallery_images for select to anon,authenticated using(false);
create policy empty_corpus on public.tanach_verses for select to anon,authenticated using(false);
create view public.topic_cards_public with(security_invoker=true) as select * from public.topic_cards where status='approved';
grant select on public.topic_cards_public to anon,authenticated,service_role;
