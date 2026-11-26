-- Local mirror of the live objects read on 26.11.2026 (policies, function bodies, grants). No live data.
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), ''), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create table public.users (id uuid primary key, role text);
create table public.gematria_words (
  id uuid primary key default gen_random_uuid(), phrase text, ragil integer,
  is_verified boolean, is_published boolean not null default false, is_encrypted boolean,
  visibility_tier smallint not null default 0);
create index idx_gw_siduri on public.gematria_words (ragil) where is_verified;
create table public.gematria_blocklist (id bigserial primary key, pattern text not null, note text, created_at timestamptz default now());
insert into public.gematria_blocklist(pattern) values ('חסום'), ('x-block');
alter table public.gematria_words enable row level security;
alter table public.gematria_blocklist enable row level security;
revoke all on public.gematria_blocklist from anon, authenticated;
grant select on public.gematria_words to anon, authenticated;
alter table public.users enable row level security;
grant select on public.users to anon, authenticated;
create policy users_select_public on public.users for select to public using (true);

CREATE OR REPLACE FUNCTION public.rd_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$;
CREATE OR REPLACE FUNCTION public.gematria_public_word_eligible(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.gematria_words g where g.id=p_id
   and g.is_verified is true and g.is_published is true
   and coalesce(g.is_encrypted,false)=false and coalesce(g.visibility_tier,0)>=0
   and not exists(select 1 from public.gematria_blocklist b where position(b.pattern in g.phrase)>0))
$function$;
grant execute on function public.rd_is_admin(), public.gematria_public_word_eligible(uuid) to anon, authenticated;

create policy "admin קורא מוצפן" on public.gematria_words for select to public
  using ((is_encrypted = true) AND (EXISTS (SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));
create policy anon_read_verified_gematria on public.gematria_words for select to public
  using (((is_encrypted = false) OR (is_encrypted IS NULL)) AND (is_verified = true) AND (is_published = true));
create policy gw_admin_insert on public.gematria_words for insert to public
  with check (EXISTS (SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))));
create policy ti_public_word_floor on public.gematria_words as restrictive for select to anon, authenticated
  using (rd_is_admin() OR gematria_public_word_eligible(id));

insert into public.users values ('00000000-0000-0000-0000-0000000000a1','admin'), ('00000000-0000-0000-0000-0000000000b1','member');
-- exhaustive flag grid x phrase variants (NULL, plain, blocked, blocked-in-middle, empty) = 3*3*3*3*... rows
insert into public.gematria_words(phrase, ragil, is_verified, is_published, is_encrypted, visibility_tier)
select p, 100 + (row_number() over ())::int % 50, v, pub, e, t
from (values (null::text), ('שלום'), ('דבר חסום כאן'), ('x-block'), ('')) ph(p)
cross join (values (true),(false),(null::boolean)) a(v)
cross join (values (true),(false)) b(pub)
cross join (values (true),(false),(null::boolean)) c(e)
cross join (values (0::smallint),(1::smallint),(-1::smallint)) d(t);
