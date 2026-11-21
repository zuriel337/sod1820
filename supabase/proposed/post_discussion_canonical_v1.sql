-- Proposal for isolated review. No automatic migration or public transport admission.
begin;
alter table public.research_contributions
  add column post_unit_id text
  check (post_unit_id is null or (
    target_type is not distinct from 'post' and target_id is not null
    and post_unit_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$'
  ));

create function public.post_discussion_read_v1(p_post_id bigint, p_limit integer default 200)
returns table(source_kind text, source_id text, author_name text, body text,
              parent_ref text, post_unit_id text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with source as (
    select p.id, p.wp_id from public.posts p
    where p.id = p_post_id and nullif(btrim(p.slug), '') is not null
      and lower(btrim(coalesce(p.source, ''))) not in ('gpt-draft', 'web')
      and not exists (select 1 from unnest(p.tags) t(tag) where btrim(t.tag) in ('טיוטה', 'פורום'))
  ), discussion as (
    select 'wordpress'::text as kind, c.wp_id::text as id, c.author_name, c.content as body,
           nullif(nullif(c.parent_wp_id::text, '0'), ''), null::text, c.date as at
    from source s join public.comments c on c.post_wp_id = s.wp_id
    where c.status = 'publish'
    union all
    select 'community', rc.id::text, coalesce(rc.author_name, ct.display_name), rc.body,
           rc.parent_id::text, rc.post_unit_id, rc.created_at
    from source s join public.research_contributions rc on rc.target_type = 'post' and rc.target_id = s.id::text
    left join public.contributors ct on rc.author_contributor_id = ct.id
    where rc.status = 'approved' and nullif(btrim(rc.body), '') is not null
  )
  select * from discussion order by at desc, kind, id
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

create function public.post_discussion_publish_v1(p_post_id bigint, p_unit_id text, p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  article text;
  row_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 6000 then
    raise exception 'COMMENT_BODY_INVALID' using errcode = '22023';
  end if;
  select coalesce(p.content, '') into article from public.posts p
    where p.id = p_post_id and nullif(btrim(p.slug), '') is not null
      and lower(btrim(coalesce(p.source, ''))) not in ('gpt-draft', 'web')
      and not exists (select 1 from unnest(p.tags) t(tag) where btrim(t.tag) in ('טיוטה', 'פורום'))
    for share;
  if not found then raise exception 'POST_UNAVAILABLE' using errcode = '22023'; end if;
  if p_unit_id is not null then
    if p_unit_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$' then
      raise exception 'POST_UNIT_INVALID' using errcode = '22023';
    end if;
    -- Review scope: a single stored section ID. Production admission needs the
    -- Publishing owner's canonical unit membership validator for all formats.
    if (select count(*) from regexp_matches(article, '<section\M[^>]*[[:space:]]id=["'']' || p_unit_id || '["'']', 'g')) <> 1 then
      raise exception 'POST_UNIT_UNAVAILABLE' using errcode = '22023';
    end if;
  end if;
  row_id := public.add_contribution('תגובה', 'post_discussion_2029', btrim(p_body), 'post', p_post_id::text);
  update public.research_contributions set post_unit_id = p_unit_id where id = row_id;
  return row_id;
end;
$$;

revoke all on function public.post_discussion_read_v1(bigint, integer) from public, anon, authenticated;
revoke all on function public.post_discussion_publish_v1(bigint, text, text) from public, anon, authenticated;
grant execute on function public.post_discussion_read_v1(bigint, integer) to anon, authenticated;
grant execute on function public.post_discussion_publish_v1(bigint, text, text) to authenticated;
commit;
