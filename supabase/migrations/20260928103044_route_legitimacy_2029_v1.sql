-- ROUTE_LEGITIMACY_2029_V1
-- True HTTP 404 for the legacy single-segment post catch-all without changing CN/SG policy.
-- Middleware caller is fail-open when Supabase cannot answer.

create index if not exists idx_posts_slug_route
on public.posts (slug);

create or replace function public.public_post_slug_exists(
  p_slug text,
  p_encoded_slug text default null
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.slug = btrim(p_slug)
       or (p_encoded_slug is not null and p.slug = btrim(p_encoded_slug))
  );
$$;

revoke all on function public.public_post_slug_exists(text,text) from public;
grant execute on function public.public_post_slug_exists(text,text) to anon,authenticated,service_role;

comment on function public.public_post_slug_exists(text,text) is
  'ROUTE_LEGITIMACY_2029_V1: exact existence check for the legacy single-segment post route; security-invoker and fail-open at middleware caller.';
