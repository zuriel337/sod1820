-- SOD1820 2029 — owner-bound personal Topic branch foundation + 888/Yeshua privacy transition.
--
-- BRANCH ONLY: this migration is intentionally not applied to the live project from this worktree.
-- EXTEND_EXISTING: topic_cards remains the editorial owner, nodes/edges remain the Reality Graph,
-- research_objects remains Research OS, and persons remains the account↔person identity owner.
-- No parallel tree, private content store, publication decision or truth promotion is introduced.

-- ---------------------------------------------------------------------------
-- 1. Topic access axis: publication and person-only access are separate facts.
-- ---------------------------------------------------------------------------
alter table public.topic_cards
  add column if not exists access_scope text not null default 'public',
  add column if not exists owner_person_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.topic_cards'::regclass
      and conname = 'topic_cards_access_scope_check'
  ) then
    alter table public.topic_cards
      add constraint topic_cards_access_scope_check
      check (access_scope in ('public', 'person_only'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.topic_cards'::regclass
      and conname = 'topic_cards_owner_person_id_fkey'
  ) then
    alter table public.topic_cards
      add constraint topic_cards_owner_person_id_fkey
      foreign key (owner_person_id) references public.persons(person_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.topic_cards'::regclass
      and conname = 'topic_cards_access_owner_shape_check'
  ) then
    alter table public.topic_cards
      add constraint topic_cards_access_owner_shape_check
      check (
        (access_scope = 'public' and owner_person_id is null)
        or (access_scope = 'person_only' and owner_person_id is not null)
      );
  end if;
end
$$;

create index if not exists topic_cards_access_owner_idx
  on public.topic_cards (access_scope, owner_person_id, slug);

comment on column public.topic_cards.access_scope is
  'Access axis only. public is eligible for the public read model subject to publication gates; person_only is owner-bound and can never enter public/search/World projections.';
comment on column public.topic_cards.owner_person_id is
  'Canonical persons.person_id owner for access_scope=person_only. Not an author/contributor identity and never returned by the client RPC.';

-- Caller-derived ownership predicate. The caller never supplies an account id, and persons remains
-- the sole account↔person mapping owner. Text input avoids unsafe casts from graph JSON metadata.
create or replace function public.fn_current_user_owns_person_ref(p_owner_person_ref text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and nullif(btrim(p_owner_person_ref), '') is not null
     and exists (
       select 1
       from public.persons p
       where p.account_user_id = (select auth.uid())
         and p.person_id::text = btrim(p_owner_person_ref)
     );
$$;

comment on function public.fn_current_user_owns_person_ref(text) is
  'Fail-closed caller-derived owner check for person-only 2029 projections. No caller-supplied account id and no content payload.';
revoke all on function public.fn_current_user_owns_person_ref(text) from public, anon;
grant execute on function public.fn_current_user_owns_person_ref(text) to authenticated, service_role;

-- Public readers require both publication approval and the public access axis.
drop policy if exists topic_cards_public_read on public.topic_cards;
create policy topic_cards_public_read on public.topic_cards
  for select to anon, authenticated
  using (
    access_scope = 'public'
    and status = 'approved'
    and coalesce((findings ->> '_do_not_publish')::boolean, false) = false
  );

-- Existing admin capability remains, except that person-only rows belong only to their owner.
drop policy if exists topic_cards_admin_write on public.topic_cards;
create policy topic_cards_admin_write on public.topic_cards
  for all to authenticated
  using (
    public.rd_is_admin()
    and (
      access_scope = 'public'
      or (
        access_scope = 'person_only'
        and public.fn_current_user_owns_person_ref(owner_person_id::text)
      )
    )
  )
  with check (
    public.rd_is_admin()
    and (
      access_scope = 'public'
      or (
        access_scope = 'person_only'
        and public.fn_current_user_owns_person_ref(owner_person_id::text)
      )
    )
  );

-- Owner read is separate from admin status so Personal Reality can consume its authorized slice.
drop policy if exists topic_cards_person_only_owner_read on public.topic_cards;
create policy topic_cards_person_only_owner_read on public.topic_cards
  for select to authenticated
  using (
    access_scope = 'person_only'
    and public.fn_current_user_owns_person_ref(owner_person_id::text)
  );

-- Canonical public projection: owner-only rows fail closed even if a future write accidentally
-- combines person_only with approved or removes the editorial _do_not_publish marker.
create or replace view public.topic_cards_public
with (security_barrier = true)
as
select t.id,
       t.slug,
       t.title,
       t.subtitle,
       t.search_terms,
       t.image_ids,
       t.numbers,
       t.highlight_numbers,
       public.topic_cards_public_findings(t.findings) as findings,
       t.status,
       t.quality,
       t.created_by,
       t.created_at,
       t.approved_at,
       t.node_id,
       t.occurred_at,
       t.meter_score
  from public.topic_cards t
 where t.access_scope = 'public'
   and t.status = 'approved'
   and coalesce(t.findings -> '_do_not_publish', 'false'::jsonb) is distinct from 'true'::jsonb;

alter view public.topic_cards_public owner to postgres;
comment on view public.topic_cards_public is
  'Canonical public Topic read model. Requires access_scope=public plus the existing approval and editorial publication gates; recursive internal-key stripping is unchanged.';
revoke all on public.topic_cards_public from public;
grant select on public.topic_cards_public to anon, authenticated;

-- Admin full-row inspection also honors person ownership. Being an admin is not permission to see
-- somebody else\'s Personal Reality.
create or replace function public.admin_topic_cards_full(
  p_ids uuid[] default null,
  p_slug text default null,
  p_status text default null
)
returns setof public.topic_cards
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.rd_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select t.*
    from public.topic_cards t
    where (p_ids is null or t.id = any (p_ids))
      and (p_slug is null or t.slug = p_slug)
      and (p_status is null or t.status = p_status)
      and (
        t.access_scope = 'public'
        or (
          t.access_scope = 'person_only'
          and public.fn_current_user_owns_person_ref(t.owner_person_id::text)
        )
      )
    order by t.quality desc nulls last, t.created_at desc;
end
$$;

revoke all on function public.admin_topic_cards_full(uuid[], text, text) from public, anon;
grant execute on function public.admin_topic_cards_full(uuid[], text, text) to authenticated;

-- Narrow, owner-only 2029 read path. Internal underscore-prefixed fields and owner ids never leave
-- the database. The RPC accepts slugs only; authorization is always derived from auth.uid().
create or replace function public.my_personal_topic_cards_2029(p_slugs text[])
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  numbers integer[],
  highlight_numbers integer[],
  status text,
  quality smallint,
  meter_score integer,
  created_at timestamptz,
  approved_at timestamptz,
  node_id uuid,
  findings jsonb,
  created_by text,
  search_terms text[],
  image_ids uuid[],
  occurred_at date,
  access_scope text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select t.id,
         t.slug,
         t.title,
         t.subtitle,
         t.numbers,
         t.highlight_numbers,
         t.status,
         t.quality,
         t.meter_score,
         t.created_at,
         t.approved_at,
         t.node_id,
         public.topic_cards_public_findings(t.findings),
         t.created_by,
         t.search_terms,
         t.image_ids,
         t.occurred_at,
         t.access_scope
  from public.topic_cards t
  where cardinality(p_slugs) between 1 and 8
    and t.slug = any (p_slugs)
    and t.access_scope = 'person_only'
    and public.fn_current_user_owns_person_ref(t.owner_person_id::text)
  order by array_position(p_slugs, t.slug)
  limit 8;
$$;

comment on function public.my_personal_topic_cards_2029(text[]) is
  'Owner-only, sanitized 2029 Topic reader. No owner id parameter or owner id response; auth.uid()→persons is the authority boundary.';
revoke all on function public.my_personal_topic_cards_2029(text[]) from public, anon;
grant execute on function public.my_personal_topic_cards_2029(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Reality Graph projection: reuse metadata.space and bind person_only rows to persons.
-- ---------------------------------------------------------------------------
drop policy if exists nodes_public_read on public.nodes;
create policy nodes_public_read on public.nodes
  for select to anon, authenticated
  using (
    public.fn_graph_space_is_public(metadata)
    and coalesce(metadata #>> '{access,scope}', '') <> 'person_only'
  );

drop policy if exists edges_public_read on public.edges;
create policy edges_public_read on public.edges
  for select to anon, authenticated
  using (
    public.fn_graph_space_is_public(metadata)
    and coalesce(metadata #>> '{access,scope}', '') <> 'person_only'
  );

drop policy if exists nodes_admin_read on public.nodes;
create policy nodes_admin_read on public.nodes
  for select to authenticated
  using (
    public.rd_is_admin()
    and (
      coalesce(metadata #>> '{access,scope}', '') <> 'person_only'
      or public.fn_current_user_owns_person_ref(metadata #>> '{access,owner_person_id}')
    )
  );

drop policy if exists edges_admin_read on public.edges;
create policy edges_admin_read on public.edges
  for select to authenticated
  using (
    public.rd_is_admin()
    and (
      coalesce(metadata #>> '{access,scope}', '') <> 'person_only'
      or public.fn_current_user_owns_person_ref(metadata #>> '{access,owner_person_id}')
    )
  );

drop policy if exists nodes_person_only_owner_read on public.nodes;
create policy nodes_person_only_owner_read on public.nodes
  for select to authenticated
  using (
    metadata #>> '{access,scope}' = 'person_only'
    and public.fn_current_user_owns_person_ref(metadata #>> '{access,owner_person_id}')
  );

drop policy if exists edges_person_only_owner_read on public.edges;
create policy edges_person_only_owner_read on public.edges
  for select to authenticated
  using (
    metadata #>> '{access,scope}' = 'person_only'
    and public.fn_current_user_owns_person_ref(metadata #>> '{access,owner_person_id}')
  );

-- SECURITY DEFINER readers bypass RLS. Keep the existing public/internal dossier shape, but apply
-- the same owner predicate to every raw topic_cards branch in the internal admin projection.
create or replace function public.fn_number_dossier(p_value integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  mtx jsonb;
  v_admin boolean := false;
  v_public_convergences jsonb := '[]'::jsonb;
begin
  begin
    v_admin := public.rd_is_admin();
  exception when others then
    v_admin := false;
  end;

  if coalesce(v_admin, false) then
    mtx := public.metatron_context(jsonb_build_object(
      'ask', p_value::text,
      'channel', 'number-researcher',
      'entities', jsonb_build_array(jsonb_build_object('type', 'number', 'value', p_value::text))
    ));

    return jsonb_build_object(
      'value', p_value,
      'projection_scope', 'internal_authorized',
      'context_version', coalesce(mtx -> 'context_version', to_jsonb('v1'::text)),
      'rules_snapshot', public.fn_rules_snapshot(array[
        'equality_vs_convergence',
        'convergence_one_per_value',
        'unified_discovery_architecture',
        'gold_seal_convergence',
        'partial_convergence_approval'
      ]),
      'facts', jsonb_build_object(
        'anchor', (
          select fact from public.number_anchors where value = p_value limit 1
        ),
        'metatron_anchor', (
          select label from public.metatron_anchors where anchor_value = p_value limit 1
        ),
        'convergences', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'method', method,
            'group_size', group_size,
            'phrases', (
              select coalesce(jsonb_agg(p), '[]'::jsonb) from unnest(phrases) p
            )
          ) order by group_size desc nulls last), '[]'::jsonb)
          from public.convergences
          where value = p_value and method <> 'siduri'
        ),
        'node', (
          select jsonb_build_object('id', id, 'label', label, 'description', left(description, 400))
          from public.nodes
          where type = 'number' and label = p_value::text
          limit 1
        )
      ),
      'evidence', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id,
          'method', method,
          'a', a_phrase,
          'b', b_phrase,
          'note', note,
          'status', status
        )), '[]'::jsonb)
        from public.relation_evidence
        where value = p_value
      ),
      'cards', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'slug', tc.slug,
          'title', tc.title,
          'status', tc.status
        )), '[]'::jsonb)
        from public.topic_cards tc,
             unnest(coalesce(tc.numbers, '{}'::int[]) || coalesce(tc.highlight_numbers, '{}'::int[])) nn
        where nn = p_value
          and (
            tc.access_scope = 'public'
            or (
              tc.access_scope = 'person_only'
              and public.fn_current_user_owns_person_ref(tc.owner_person_id::text)
            )
          )
      ),
      'decisions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'human_decision', human_decision,
          'reason_code', reason_code,
          'human_reason', human_reason,
          'provenance', provenance,
          'rules_snapshot', rules_snapshot,
          'status', status,
          'created_at', created_at
        ) order by created_at desc), '[]'::jsonb)
        from public.decision_ledger
        where subject_ref = p_value::text and decision_type = 'convergence'
      ),
      'preferences', (
        select coalesce(jsonb_agg(jsonb_build_object('key', pattern_key, 'polarity', polarity)), '[]'::jsonb)
        from public.learned_patterns
        where status = 'approved_preference'
      ),
      'candidates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id,
          'recommendation', recommendation,
          'status', status
        )), '[]'::jsonb)
        from public.research_candidates
        where subject_ref = p_value::text
      ),
      'related', (
        select coalesce(jsonb_agg(distinct nn2), '[]'::jsonb)
        from public.topic_cards tc,
             unnest(coalesce(tc.numbers, '{}'::int[]) || coalesce(tc.highlight_numbers, '{}'::int[])) nn2
        where tc.status = 'approved'
          and nn2 <> p_value
          and (
            tc.access_scope = 'public'
            or (
              tc.access_scope = 'person_only'
              and public.fn_current_user_owns_person_ref(tc.owner_person_id::text)
            )
          )
          and tc.id in (
            select tc2.id
            from public.topic_cards tc2,
                 unnest(coalesce(tc2.numbers, '{}'::int[]) || coalesce(tc2.highlight_numbers, '{}'::int[])) x
            where x = p_value
              and (
                tc2.access_scope = 'public'
                or (
                  tc2.access_scope = 'person_only'
                  and public.fn_current_user_owns_person_ref(tc2.owner_person_id::text)
                )
              )
          )
      ),
      'generated_at', now()
    );
  end if;

  with rows as (
    select l.method,
           l.phrase,
           row_number() over (partition by l.method order by l.phrase, l.bid_id) rn
    from public.fn_number_lookup_core(p_value::bigint) l
  ),
  grouped as (
    select method,
           count(*) group_size,
           coalesce(jsonb_agg(phrase order by phrase) filter (where rn <= 12), '[]'::jsonb) phrases
    from rows
    group by method
  ),
  top_groups as (
    select * from grouped order by group_size desc, method limit 8
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'method', method,
    'group_size', group_size,
    'phrases', phrases
  ) order by group_size desc, method), '[]'::jsonb)
  into v_public_convergences
  from top_groups;

  return jsonb_build_object(
    'value', p_value,
    'projection_scope', 'public',
    'context_version', 'public_projection_v2',
    'rules_snapshot', '[]'::jsonb,
    'facts', jsonb_build_object(
      'anchor', null,
      'metatron_anchor', null,
      'convergences', coalesce(v_public_convergences, '[]'::jsonb),
      'node', (
        select jsonb_build_object('id', id, 'label', label, 'description', left(description, 400))
        from public.nodes
        where type = 'number'
          and label = p_value::text
          and coalesce(is_active, true)
          and public.fn_graph_space_is_public(metadata)
        limit 1
      )
    ),
    'evidence', '[]'::jsonb,
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', slug,
        'title', title,
        'status', status
      )), '[]'::jsonb)
      from public.topic_cards_public
      where p_value = any(coalesce(numbers, '{}'::int[]))
         or p_value = any(coalesce(highlight_numbers, '{}'::int[]))
    ),
    'decisions', '[]'::jsonb,
    'preferences', '[]'::jsonb,
    'candidates', '[]'::jsonb,
    'related', (
      select coalesce(jsonb_agg(distinct nn2), '[]'::jsonb)
      from public.topic_cards_public tc,
           unnest(coalesce(tc.numbers, '{}'::int[]) || coalesce(tc.highlight_numbers, '{}'::int[])) nn2
      where nn2 <> p_value
        and (
          p_value = any(coalesce(tc.numbers, '{}'::int[]))
          or p_value = any(coalesce(tc.highlight_numbers, '{}'::int[]))
        )
    ),
    'generated_at', now()
  );
end
$$;

-- number_map is a public SECURITY DEFINER projection and therefore must enforce graph-space itself.
create or replace function public.number_map(n integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare nid uuid; res jsonb;
begin
  if n is null or n < 1 then return null; end if;

  select id into nid
  from public.nodes
  where type = 'number'
    and is_active
    and public.fn_graph_space_is_public(metadata)
    and (label = n::text or (metadata ->> 'value') = n::text)
  limit 1;

  if nid is null then
    return jsonb_build_object('value', n, 'node', null, 'neighbors', '{}'::jsonb, 'counts', '{}'::jsonb);
  end if;

  with nb as (
    select case when e.from_node = nid then e.to_node else e.from_node end as other_id,
           e.relation_type,
           e.weight
    from public.edges e
    where (e.from_node = nid or e.to_node = nid)
      and public.fn_graph_space_is_public(e.metadata)
  ),
  joined as (
    select n2.type, n2.label, n2.metadata, nb.relation_type, nb.weight
    from nb
    join public.nodes n2 on n2.id = nb.other_id and n2.is_active
    where n2.type in ('entity', 'convergence', 'number', 'post', 'event')
      and public.fn_graph_space_is_public(n2.metadata)
  ),
  ranked as (
    select type, label, metadata, relation_type, weight,
           row_number() over (partition by type order by weight desc nulls last, label) rn
    from joined
  )
  select jsonb_build_object(
    'value', n,
    'node', nid,
    'neighbors', coalesce((
      select jsonb_object_agg(type, arr)
      from (
        select type,
               jsonb_agg(jsonb_build_object(
                 'label', left(label, 80),
                 'relation', relation_type,
                 'weight', weight,
                 'ref', case type
                   when 'convergence' then metadata ->> 'slug'
                   when 'post' then metadata ->> 'slug'
                   when 'number' then coalesce(metadata ->> 'value', label)
                   else label
                 end
               ) order by rn) arr
        from ranked
        where rn <= 12
        group by type
      ) g
    ), '{}'::jsonb),
    'counts', coalesce((
      select jsonb_object_agg(type, c)
      from (select type, count(*) c from joined group by type) x
    ), '{}'::jsonb)
  ) into res;

  return res;
end
$$;

-- Keep Topic→Graph synchronization access-safe. A later admin sync may never convert a personal
-- branch into a core/active node or recreate its edges without private metadata.
create or replace function public.sync_convergence(p_card uuid)
returns uuid
language plpgsql
as $$
declare
  c record;
  v_node uuid;
  n int;
  num_node uuid;
  ent record;
  v_space text;
  v_access jsonb;
  v_metadata jsonb;
begin
  select * into c from public.topic_cards where id = p_card;
  if not found then raise exception 'card % not found', p_card; end if;

  v_space := case when c.access_scope = 'person_only' then 'private' else 'core' end;
  v_access := case
    when c.access_scope = 'person_only' then jsonb_build_object(
      'access', jsonb_build_object(
        'scope', 'person_only',
        'owner_person_id', c.owner_person_id::text
      )
    )
    else '{}'::jsonb
  end;
  v_metadata := jsonb_build_object(
    'card_id', c.id::text,
    'slug', c.slug,
    'numbers', to_jsonb(c.numbers),
    'highlight', to_jsonb(c.highlight_numbers),
    'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end,
    'space', v_space
  ) || v_access;

  v_node := c.node_id;
  if v_node is null then
    insert into public.nodes(type, label, description, metadata, is_active, weight, hebrew_date)
    values(
      'convergence',
      c.title,
      c.subtitle,
      v_metadata,
      c.status = 'approved' and c.access_scope = 'public',
      greatest(1, least(5, round(coalesce(c.quality, 5) / 2.0)::int)),
      case when c.occurred_at is not null then to_char(c.occurred_at, 'YYYY-MM-DD') else null end
    )
    returning id into v_node;
    update public.topic_cards set node_id = v_node where id = p_card;
  else
    if c.title is null or c.title ~ '[א-ת]' then
      update public.nodes
      set label = c.title,
          description = c.subtitle,
          metadata = v_metadata,
          is_active = c.status = 'approved' and c.access_scope = 'public',
          weight = greatest(1, least(5, round(coalesce(c.quality, 5) / 2.0)::int)),
          hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at, 'YYYY-MM-DD') else null end
      where id = v_node;
    else
      update public.nodes
      set metadata = v_metadata,
          is_active = c.status = 'approved' and c.access_scope = 'public',
          weight = greatest(1, least(5, round(coalesce(c.quality, 5) / 2.0)::int)),
          hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at, 'YYYY-MM-DD') else null end
      where id = v_node;
    end if;
  end if;

  delete from public.edges
  where from_node = v_node and relation_type in ('contains', 'related');

  foreach n in array coalesce(c.numbers, '{}'::int[]) loop
    select id into num_node
    from public.nodes
    where type = 'number' and label = n::text
    limit 1;

    if num_node is null then
      insert into public.nodes(type, label, metadata, is_active, weight)
      values('number', n::text, jsonb_build_object('value', n, 'space', 'core'), true, 1)
      returning id into num_node;
    end if;

    insert into public.edges(from_node, to_node, relation_type, metadata)
    values(v_node, num_node, 'contains', jsonb_build_object('space', v_space) || v_access);
  end loop;

  for ent in
    select e.id
    from public.nodes e
    where e.type = 'entity'
      and e.is_active
      and e.metadata ? 'value'
      and (e.metadata ->> 'value') ~ '^[0-9]+$'
      and (e.metadata ->> 'value')::int = any(coalesce(c.highlight_numbers, '{}'::int[]))
  loop
    insert into public.edges(from_node, to_node, relation_type, metadata)
    values(v_node, ent.id, 'related', jsonb_build_object('space', v_space) || v_access);
  end loop;

  return v_node;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Research OS: person_only is owner-bound and never part of general/admin-universe projection.
-- ---------------------------------------------------------------------------
drop policy if exists ro_admin_read on public.research_objects;
create policy ro_admin_read on public.research_objects
  for select to authenticated
  using (
    public.rd_is_admin()
    and (
      coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
      or public.fn_current_user_owns_person_ref(owner_person_id::text)
    )
  );

drop policy if exists ro_person_only_owner_read on public.research_objects;
create policy ro_person_only_owner_read on public.research_objects
  for select to authenticated
  using (
    meta #>> '{ext,personal_scope,scope}' = 'person_only'
    and public.fn_current_user_owns_person_ref(owner_person_id::text)
  );

drop policy if exists ro_dossier_read on public.research_objects;
create policy ro_dossier_read on public.research_objects
  for select
  using (
    privacy_scope = 'public_candidate'
    and coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
    and coalesce(((meta -> 'ext') -> 'writer_dossier') ->> 'visible', 'false') = 'true'
    and exists (
      select 1
      from public.contributors c
      where c.display_name = research_objects.contributor
        and coalesce(c.dossier_settings ->> 'visibility', 'public') <> 'private'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Human instruction: move the existing 888/Yeshua branch behind the owner boundary and attach
--    Amit Bliz attribution without renaming the canonical contributor or promoting any claim.
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner_candidates uuid[];
  v_owner uuid;
  v_topic public.topic_cards;
  v_contributor_node uuid;
  v_research_count integer;
  v_access jsonb;
begin
  -- Explicit, stable account identity supplied by the existing account record. Fail closed if it
  -- no longer resolves uniquely; never guess the first admin or silently transfer ownership.
  select array_agg(p.person_id order by p.person_id)
  into v_owner_candidates
  from public.persons p
  join public.users u on u.id = p.account_user_id
  where u.username = 'כי לה'' המלוכה'
    and u.display_name = 'sod1820';

  if cardinality(v_owner_candidates) is distinct from 1 then
    raise exception 'personal 888 branch owner must resolve to exactly one persons row';
  end if;
  v_owner := v_owner_candidates[1];
  v_access := jsonb_build_object(
    'scope', 'person_only',
    'owner_person_id', v_owner::text
  );

  select * into v_topic
  from public.topic_cards
  where slug = '888-yeshua'
  for update;
  if not found then
    raise exception 'required topic_cards row 888-yeshua not found';
  end if;

  update public.topic_cards
  set status = 'draft',
      approved_at = null,
      access_scope = 'person_only',
      owner_person_id = v_owner,
      search_terms = array(
        select distinct term
        from unnest(coalesce(v_topic.search_terms, '{}'::text[]) || array['ישו', 'עמית בליז']) term
        order by term
      ),
      findings = coalesce(v_topic.findings, '{}'::jsonb) || jsonb_build_object(
        'writer', 'עמית בליז',
        'source', 'הכתב עמית בליז',
        '_do_not_publish', true,
        '_access', v_access,
        '_source_attribution', jsonb_build_object(
          'supplied_by_user', true,
          'display_name', 'עמית בליז',
          'canonical_contributor_slug', 'amit-mike-rob',
          'canonical_contributor_name', 'עמית מייק רוב',
          'method_note_ids', jsonb_build_array(
            '2808c504-1ed5-4a7a-8b0c-f6cfe8bd6991',
            '5492057d-774a-4239-b37c-b956e1e84a4b'
          ),
          'research_object_ids', jsonb_build_array(
            '2e9e11d1-bd64-4db4-b606-38cba0849302',
            'cd2556c7-04b5-4618-bc3f-54d38eefc0ae',
            '640cbb89-86fd-49ed-b7cf-25bd6756bf7e',
            '547151d9-ab33-423b-95e9-70c7ee28523d'
          ),
          'attribution_is_not_verification', true
        ),
        '_privacy_transition', jsonb_build_object(
          'previous_status', v_topic.status,
          'previous_approved_at', v_topic.approved_at,
          'new_scope', 'person_only',
          'human_instruction_date', '2026-10-26',
          'system', '2029'
        )
      )
  where id = v_topic.id;

  if v_topic.node_id is null then
    raise exception '888-yeshua has no canonical convergence node';
  end if;

  update public.nodes
  set is_active = false,
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('space', 'private', 'access', v_access)
  where id = v_topic.node_id;

  update public.edges
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('space', 'private', 'access', v_access)
  where from_node = v_topic.node_id or to_node = v_topic.node_id;

  select n.id into v_contributor_node
  from public.nodes n
  where n.type = 'entity'
    and n.metadata ->> 'slug' = 'amit-mike-rob'
  order by n.created_at
  limit 1;

  if v_contributor_node is null then
    raise exception 'canonical contributor node amit-mike-rob not found';
  end if;

  insert into public.edges(from_node, to_node, relation_type, metadata)
  select v_topic.node_id,
         v_contributor_node,
         'attributed_to',
         jsonb_build_object(
           'space', 'private',
           'access', v_access,
           'display_name', 'עמית בליז',
           'canonical_contributor_slug', 'amit-mike-rob',
           'attribution_is_not_verification', true
         )
  where not exists (
    select 1
    from public.edges e
    where e.from_node = v_topic.node_id
      and e.to_node = v_contributor_node
      and e.relation_type = 'attributed_to'
  );

  update public.research_objects r
  set owner_person_id = v_owner,
      privacy_scope = 'private',
      meta = jsonb_set(
        coalesce(r.meta, '{}'::jsonb),
        '{ext}',
        coalesce(r.meta -> 'ext', '{}'::jsonb) || jsonb_build_object(
          'personal_scope', jsonb_build_object(
            'scope', 'person_only',
            'owner_person_id', v_owner::text,
            'branch_ref', 'topic:888-yeshua',
            'source_display_name', 'עמית בליז',
            'canonical_contributor_slug', 'amit-mike-rob',
            'attribution_is_not_verification', true
          )
        ),
        true
      )
  where r.id in (
    '2e9e11d1-bd64-4db4-b606-38cba0849302'::uuid,
    'cd2556c7-04b5-4618-bc3f-54d38eefc0ae'::uuid,
    '640cbb89-86fd-49ed-b7cf-25bd6756bf7e'::uuid,
    '547151d9-ab33-423b-95e9-70c7ee28523d'::uuid
  )
    and r.contributor = 'עמית מייק רוב';

  get diagnostics v_research_count = row_count;
  if v_research_count <> 4 then
    raise exception 'expected 4 Amit research objects for personal 888 branch, updated %', v_research_count;
  end if;
end
$$;
