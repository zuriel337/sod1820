-- DRAFT (LOCAL LAB ONLY, never applied live). Corrected derived mapping for posts_by_number_strict.
-- Preserves OLD semantics exactly: old regex '(^|[^0-9])'||num::text||'([^0-9]|$)' on title (rank 1) or on any tag (rank 2) == the queried text equals a MAXIMAL digit run
-- (for num>=0), or '-'+maximal digit run with the '-' not preceded by a digit (for num<0). Keys are TEXT, so no integer cast/overflow/leading-zero collapse.
-- Identity = posts.id (NOT NULL PK); wp_id is nullable and is only an output column, never a key.
\set ON_ERROR_STOP on
create table post_number_keys (
  post_id bigint not null references posts(id) on delete cascade on update cascade,
  key     text   not null,
  rnk     smallint not null check (rnk in (1,2)),
  primary key (key, post_id));
create index post_number_keys_lookup on post_number_keys (key, rnk, post_id);

create or replace function pnk_extract(p_title text, p_tags text[]) returns table(key text, rnk smallint)
language sql immutable parallel safe as $$
  select k, min(r)::smallint from (
    select (m)[1] k, 1 r from regexp_matches(coalesce(p_title,''), '[0-9]+', 'g') m
    union all select (m)[1], 1 from regexp_matches(coalesce(p_title,''), '(?<![0-9])(-[0-9]+)', 'g') m
    union all select (m)[1], 2 from unnest(coalesce(p_tags,'{}')) t, regexp_matches(coalesce(t,''), '[0-9]+', 'g') m
    union all select (m)[1], 2 from unnest(coalesce(p_tags,'{}')) t, regexp_matches(coalesce(t,''), '(?<![0-9])(-[0-9]+)', 'g') m
  ) s group by k $$;

create or replace function pnk_sync() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op in ('UPDATE','DELETE') then delete from post_number_keys where post_id = old.id; end if;
  if tg_op in ('INSERT','UPDATE') then insert into post_number_keys (post_id, key, rnk) select new.id, e.key, e.rnk from pnk_extract(new.title, new.tags) e; end if;
  return null;
end $$;
create trigger posts_pnk_sync after insert or delete or update of title, tags, id on posts for each row execute function pnk_sync();

create or replace function pnk_rebuild() returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare n bigint; begin
  delete from post_number_keys;
  insert into post_number_keys (post_id, key, rnk) select p.id, e.key, e.rnk from posts p cross join lateral pnk_extract(p.title, p.tags) e;
  get diagnostics n = row_count; return n; end $$;

-- drift detector: rows missing / extra vs a fresh derivation (0/0 expected)
create or replace function pnk_verify(out missing bigint, out extra bigint) language sql stable as $$
  select (select count(*) from (select p.id, e.key, e.rnk from posts p cross join lateral pnk_extract(p.title,p.tags) e except select post_id,key,rnk from post_number_keys) a),
         (select count(*) from (select post_id,key,rnk from post_number_keys except select p.id, e.key, e.rnk from posts p cross join lateral pnk_extract(p.title,p.tags) e) b) $$;

-- SECURITY INVOKER like the old function; keys table RLS inherits posts visibility.
create or replace function posts_by_number_strict_v3(num integer, lim integer default 3)
returns table(wp_id bigint, slug text, title text, date timestamptz) language sql stable as $$
  select p.wp_id, p.slug, p.title, p.date from post_number_keys k join posts p on p.id = k.post_id
  where k.key = num::text order by k.rnk asc, p.date desc, p.id asc limit lim $$;
