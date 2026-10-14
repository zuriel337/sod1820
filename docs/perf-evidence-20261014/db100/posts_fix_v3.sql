-- posts_by_number_strict_v3: derived token table keyed by posts.id (wp_id may be NULL), tokens = maximal digit runs as TEXT (so '0787' <> '787', no 9-digit limit),
-- negative requests fall back to the original scan. Trigger/maintenance is part of the draft (below), tested with insert/update/delete.
drop table if exists post_numbers cascade;
create table post_numbers (post_id bigint not null, tok text not null, rnk smallint not null, primary key (post_id, tok));
create index post_numbers_tok_idx on post_numbers (tok, rnk);
create or replace function post_number_tokens(p_title text, p_tags text[]) returns table(tok text, rnk smallint) language sql immutable as $$
  select tok, min(r)::smallint from (
    select (m)[1] tok, 1 r from regexp_matches(coalesce(p_title,''), '(?<![0-9])([0-9]+)(?![0-9])', 'g') m
    union all select (m)[1], 2 from unnest(coalesce(p_tags,'{}')) t, regexp_matches(t, '(?<![0-9])([0-9]+)(?![0-9])', 'g') m) s group by tok $$;
insert into post_numbers select p.id, t.tok, t.rnk from posts p, lateral post_number_tokens(p.title, p.tags) t;
create or replace function post_numbers_sync() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then delete from post_numbers where post_id = old.id; return old; end if;
  if tg_op = 'UPDATE' and old.id is distinct from new.id then delete from post_numbers where post_id = old.id; end if;
  if tg_op = 'INSERT' or old.title is distinct from new.title or old.tags is distinct from new.tags or old.id is distinct from new.id then
    delete from post_numbers where post_id = new.id;
    insert into post_numbers select new.id, t.tok, t.rnk from post_number_tokens(new.title, new.tags) t;
  end if;
  return new;
end $$;
drop trigger if exists post_numbers_sync_trg on posts;
create trigger post_numbers_sync_trg after insert or update of id, title, tags or delete on posts for each row execute function post_numbers_sync();
create or replace function posts_by_number_strict_v3(num integer, lim integer default 3) returns table(wp_id bigint, slug text, title text, date timestamptz) language sql stable as $$
  (select p.wp_id, p.slug, p.title, p.date from post_numbers n join posts p on p.id = n.post_id where num >= 0 and n.tok = num::text order by n.rnk asc, p.date desc limit lim)
  union all (select * from posts_by_number_strict(num, lim) where num < 0) $$;
