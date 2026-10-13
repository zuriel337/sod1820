-- Public reactions must follow the approved conversation boundary even though
-- the existing mutation runs as SECURITY DEFINER and bypasses table RLS.
-- Retains the RPC signature, guest identity, five emojis, historical likes and
-- activity behavior from the live function reviewed on 2026-10-13.
create or replace function public.toggle_contribution_reaction(
  p_id uuid,
  p_emoji text,
  p_visitor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_arr jsonb;
  v_reactions jsonb;
  v_added boolean;
  v_parent uuid;
  v_chain_ids uuid[];
  v_chain_parents uuid[];
  v_approved boolean;
  v_has_root boolean;
  v_row record;
  v_locked integer := 0;
begin
  v_key := coalesce(auth.uid()::text, nullif('v:' || coalesce(nullif(btrim(p_visitor), ''), ''), 'v:'));
  if v_key is null then raise exception 'no identity'; end if;
  if p_emoji is null or p_emoji not in ('👍','💡','🔥','🙏','✨') then raise exception 'bad emoji'; end if;

  -- A reply must reach an approved root through approved existing ancestors.
  -- Missing rows, nonpublic rows, cycles and chains over the 128-row safety
  -- bound use the same denial and never return reactions or change activity.
  with recursive ancestry as (
    select rc.id, rc.parent_id, rc.status, array[rc.id] as visited, 1 as depth
    from public.research_contributions rc where rc.id = p_id
    union all
    select rc.id, rc.parent_id, rc.status, a.visited || rc.id, a.depth + 1
    from ancestry a join public.research_contributions rc on rc.id = a.parent_id
    where a.depth < 128 and not (rc.id = any(a.visited))
  )
  select array_agg(id order by depth), array_agg(parent_id order by depth),
         bool_and(coalesce(status = 'approved', false)), bool_or(parent_id is null)
  into v_chain_ids, v_chain_parents, v_approved, v_has_root
  from ancestry;
  if v_approved is distinct from true or v_has_root is distinct from true then
    raise exception 'not found';
  end if;

  -- Lock the whole chain from target toward root, then validate its current status
  -- and links. A moderation/reparent/delete racing the initial read fails
  -- closed. This matches admin_boost_reaction's existing target -> parent order;
  -- UUID order would invert its locks for some replies and introduce deadlocks.
  for v_row in
    select rc.id, rc.parent_id, rc.status, rc.reactions
    from public.research_contributions rc where rc.id = any(v_chain_ids)
    order by array_position(v_chain_ids, rc.id) for update
  loop
    if v_row.status is distinct from 'approved'
      or v_row.parent_id is distinct from v_chain_parents[array_position(v_chain_ids, v_row.id)] then
      raise exception 'not found';
    end if;
    v_locked := v_locked + 1;
    if v_row.id = p_id then
      v_reactions := v_row.reactions;
      v_parent := v_row.parent_id;
    end if;
  end loop;
  if v_locked <> cardinality(v_chain_ids) then raise exception 'not found'; end if;

  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  v_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);
  if v_arr ? v_key then
    v_arr := (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements_text(v_arr) e where e <> v_key);
    v_added := false;
  else
    v_arr := v_arr || to_jsonb(v_key);
    v_added := true;
  end if;

  v_reactions := jsonb_set(v_reactions, array[p_emoji], v_arr);
  if v_added then
    update public.research_contributions set reactions = v_reactions, last_activity_at = now() where id = p_id;
    if v_parent is not null then
      update public.research_contributions set last_activity_at = now() where id = v_parent;
    end if;
  else
    update public.research_contributions set reactions = v_reactions where id = p_id;
  end if;
  return v_reactions;
end;
$$;

revoke all on function public.toggle_contribution_reaction(uuid, text, text) from public;
grant execute on function public.toggle_contribution_reaction(uuid, text, text) to anon, authenticated;
