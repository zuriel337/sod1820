-- Multilingual Identity Foundation Closure — MUST #1, #2, #3, #5 (atomic batch)
-- Human-Gate approved 2026-08-31 (ZURIEL). Contract:
-- docs/audits/SOD1820_SYSTEM_MASTER_MAP_2026-08-31.md
-- (Multilingual Identity Foundation Closure contract + Cross-Verification sections)
--
-- Purely additive: no node recreation, no UUID replacement, no edge rewiring,
-- no data loss. Rows without identity_key behave EXACTLY as before this migration.
--
-- Preflight (read-only, run live before this migration, all 0 collisions):
--   (a) gematria_words rows sharing one node_id
--   (b) topic_cards rows sharing one node_id
--   (c) duplicate post_wp_id within the same node type
--   (d) full dry-run simulation of coalesce(identity_key,label) across all
--       3632 in-scope rows (type not in image,rule)
--
-- Explicitly NOT in this migration (Cross-Verification FAIL — wrong owner):
--   generalizing word_aliases or creating any new representation table.
--   The Representation Layer remains an open Extension Point.

-- MUST #1a: add the new, optional, language-independent dedup key.
alter table public.nodes add column if not exists identity_key text;

comment on column public.nodes.identity_key is
  'Stable, language-independent dedup key for canonical identity. NULL = falls back to (type,label) exactly as before this migration (no behavior change for unmigrated rows). Format: "<source-table-prefix>:<source-id>", e.g. gw:<gematria_words.id>, tc:<topic_cards.id>, wp:<posts.wp_id>. Per Multilingual Identity Foundation Closure contract (docs/audits/SOD1820_SYSTEM_MASTER_MAP_2026-08-31.md).';

-- MUST #2: mechanical backfill from already-existing, already-verified anchors only.
-- No speculative/human-gate-required rows (e.g. the ~205 unanchored entity nodes,
-- theme/els/concept/feature types) are touched — they keep identity_key = null and
-- keep today's label-based dedup, per the contract's explicit "Rank, Don't Hide" /
-- "do not speculative-backfill UNKNOWN types" instruction.

-- (a) entity/word/phrase nodes anchored via gematria_words.node_id (reverse FK).
update public.nodes n
set identity_key = 'gw:' || gw.id::text
from public.gematria_words gw
where gw.node_id = n.id
  and n.identity_key is null;

-- (b) convergence nodes anchored via topic_cards.node_id.
update public.nodes n
set identity_key = 'tc:' || tc.id::text
from public.topic_cards tc
where tc.node_id = n.id
  and n.type = 'convergence'
  and n.identity_key is null;

-- (c) post/event nodes anchored via metadata->>'post_wp_id'.
update public.nodes n
set identity_key = 'wp:' || (n.metadata->>'post_wp_id')
where n.type in ('post','event')
  and n.metadata ? 'post_wp_id'
  and n.metadata->>'post_wp_id' is not null
  and n.identity_key is null;

-- MUST #1b: replace the (type,label) unique index with a coalescing one.
-- Rows WITH identity_key dedupe safely across languages/labels.
-- Rows WITHOUT identity_key keep EXACTLY today's (type,label) behavior.
drop index if exists public.nodes_identity_canonical_uidx;
create unique index nodes_identity_canonical_uidx
  on public.nodes (type, coalesce(identity_key, label))
  where type not in ('image', 'rule');

-- MUST #5: get_or_create_entity_node prefers identity_key when the caller supplies one.
-- Fully backward compatible: existing callers passing only (type,label,meta) get
-- byte-identical behavior — p_identity_key defaults to null, every new branch is skipped.
create or replace function public.get_or_create_entity_node(
  p_type text,
  p_label text,
  p_meta jsonb default '{}'::jsonb,
  p_identity_key text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v uuid;
  v_existing_key text;
begin
  if p_label is null or p_label = '' then return null; end if;

  if p_identity_key is not null then
    select id into v from public.nodes where type = p_type and identity_key = p_identity_key limit 1;
  end if;

  if v is null then
    select id, identity_key into v, v_existing_key from public.nodes where type = p_type and label = p_label limit 1;
    if v is not null and p_identity_key is not null then
      if v_existing_key is null then
        -- opportunistic backfill: this legacy label-matched row IS the entity p_identity_key refers to.
        update public.nodes set identity_key = p_identity_key where id = v;
      elsif v_existing_key <> p_identity_key then
        -- a DIFFERENT already-anchored entity happens to share this label -- do not merge.
        -- (matches the contract's future-capability check: two distinct entities, same display label.)
        v := null;
      end if;
    end if;
  end if;

  if v is null then
    insert into public.nodes (type, label, is_active, metadata, identity_key)
    values (p_type, p_label, true, coalesce(p_meta,'{}'::jsonb) || jsonb_build_object('auto','research_contribution'), p_identity_key)
    returning id into v;
  end if;

  return v;
end;
$function$;

-- MUST #3: guard sync_convergence's unconditional label/description overwrite.
-- Only change from the live function: the update branch no longer blindly writes
-- label/description when the incoming topic_cards.title contains no Hebrew characters
-- (a deterministic, infrastructure-free signal that this would be a non-source-language
-- write -- per the contract's "translation must never overwrite source truth" principle,
-- and per Cross-Verification's requirement that #3 land atomically with #1/#2/#5).
-- Everything else (edges, metadata numbers, is_active, weight, hebrew_date, node matching
-- via topic_cards.node_id) is completely unchanged from the live function.
create or replace function public.sync_convergence(p_card uuid)
returns uuid
language plpgsql
as $function$
declare c record; v_node uuid; n int; num_node uuid; ent record;
begin
  select * into c from topic_cards where id = p_card;
  if not found then raise exception 'card % not found', p_card; end if;

  select node_id into v_node from topic_cards where id = p_card;
  if v_node is null then
    insert into nodes(type,label,description,metadata,is_active,weight,hebrew_date)
    values('convergence', c.title, c.subtitle,
      jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
        'highlight',to_jsonb(c.highlight_numbers),
        'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
      c.status='approved', greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
      case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end)
    returning id into v_node;
    update topic_cards set node_id = v_node where id = p_card;
  else
    if c.title is null or c.title ~ '[א-ת]' then
      -- source-language (Hebrew) title, or null: safe to sync exactly as before.
      update nodes set label=c.title, description=c.subtitle,
        metadata=jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
          'highlight',to_jsonb(c.highlight_numbers),
          'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
        is_active=(c.status='approved'),
        weight=greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
        hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end
      where id = v_node;
    else
      -- non-Hebrew title: do NOT overwrite the source-original label/description
      -- (no representation layer exists yet to route it to -- contract Section B,
      -- open Extension Point, explicitly not built in this implementation).
      -- everything else still syncs normally.
      update nodes set
        metadata=jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
          'highlight',to_jsonb(c.highlight_numbers),
          'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
        is_active=(c.status='approved'),
        weight=greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
        hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end
      where id = v_node;
    end if;
  end if;

  delete from edges where from_node = v_node and relation_type in ('contains','related');
  foreach n in array coalesce(c.numbers,'{}'::int[]) loop
    select id into num_node from nodes where type='number' and label = n::text limit 1;
    if num_node is null then
      insert into nodes(type,label,metadata,is_active,weight)
      values('number', n::text, jsonb_build_object('value',n), true, 1) returning id into num_node;
    end if;
    insert into edges(from_node,to_node,relation_type) values(v_node, num_node, 'contains');
  end loop;
  for ent in
    select e.id from nodes e
    where e.type='entity' and e.is_active and e.metadata ? 'value'
      and (e.metadata->>'value') ~ '^[0-9]+$'
      and (e.metadata->>'value')::int = any(coalesce(c.highlight_numbers,'{}'::int[]))
  loop
    insert into edges(from_node,to_node,relation_type) values(v_node, ent.id, 'related');
  end loop;
  return v_node;
end
$function$;
