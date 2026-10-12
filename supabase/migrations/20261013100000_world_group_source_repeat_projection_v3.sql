-- Group repeated public source messages in the reader only. Keep every channel_updates row
-- and its provider/proof identity intact. v2 remains the eligibility boundary; this reader
-- uses private proof coordinates solely to decide whether two visible events share a card.
-- The 30-minute window groups consecutive same-sender, same-group, same-text reposts.
create or replace function public.world_group_source_arrivals_v3(
  p_limit integer default 12, p_before timestamptz default null
)
returns table (
  id uuid, body text, created_at timestamptz, contributor_slug text,
  contributor_name text, group_proof boolean, proof_basis text, occurrences jsonb
)
language sql stable security definer set search_path = public, pg_temp as $$
  with visible as (
    select r.id, r.body, r.created_at, r.contributor_slug, r.contributor_name,
           r.group_proof, r.proof_basis, g.group_chat_id, g.sender_jid,
           regexp_replace(lower(btrim(cu.text)), '[[:space:]]+', ' ', 'g') as normalized_text
      from public.world_group_source_arrivals_v2(40, p_before) r
      join public.channel_update_group_proof g on g.update_id = r.id
      join public.channel_updates cu on cu.id = r.id
  ), ordered as (
    select v.*,
           lag(v.created_at) over (
             partition by v.group_chat_id, v.sender_jid, v.contributor_slug, v.normalized_text
             order by v.created_at, v.id
           ) as previous_at
      from visible v
  ), clustered as (
    select o.*,
           sum(case when o.previous_at is null or o.created_at - o.previous_at > interval '30 minutes'
                    then 1 else 0 end) over (
             partition by o.group_chat_id, o.sender_jid, o.contributor_slug, o.normalized_text
             order by o.created_at, o.id rows unbounded preceding
           ) as repeat_cluster
      from ordered o
  )
  select (array_agg(c.id order by c.created_at, c.id))[1] as id,
         (array_agg(c.body order by c.created_at, c.id))[1] as body,
         max(c.created_at) as created_at,
         (array_agg(c.contributor_slug order by c.created_at, c.id))[1] as contributor_slug,
         (array_agg(c.contributor_name order by c.created_at, c.id))[1] as contributor_name,
         bool_and(c.group_proof) as group_proof,
         (array_agg(c.proof_basis order by c.created_at, c.id))[1] as proof_basis,
         jsonb_agg(jsonb_build_object('id', c.id, 'created_at', c.created_at)
                   order by c.created_at, c.id) as occurrences
    from clustered c
   group by c.group_chat_id, c.sender_jid, c.contributor_slug, c.normalized_text, c.repeat_cluster
   order by max(c.created_at) desc, (array_agg(c.id order by c.created_at, c.id))[1]
   limit greatest(1, least(coalesce(p_limit, 12), 40));
$$;
revoke all on function public.world_group_source_arrivals_v3(integer, timestamptz) from public;
grant execute on function public.world_group_source_arrivals_v3(integer, timestamptz) to anon, authenticated, service_role;
