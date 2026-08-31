-- Correction to 20260831150000_multilingual_identity_foundation_closure.sql (MUST #5).
--
-- CREATE OR REPLACE FUNCTION with an added parameter creates a NEW overload in
-- Postgres rather than replacing the existing 3-arg function -- caught during
-- that migration's own live verification step (before any deploy/merge).
--
-- Fix: drop the erroneous 4-arg overload, and rewrite the ORIGINAL 3-arg
-- signature to read an optional identity_key out of p_meta->>'identity_key'
-- instead of a new positional parameter. Zero signature change, zero new
-- overload, fully backward compatible (callers not passing that key get
-- byte-identical behavior to the pre-migration function), and MUST #5 now
-- actually applies to every caller of the one true
-- get_or_create_entity_node(text,text,jsonb).

drop function if exists public.get_or_create_entity_node(text, text, jsonb, text);

create or replace function public.get_or_create_entity_node(
  p_type text,
  p_label text,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v uuid;
  v_existing_key text;
  v_identity_key text;
  v_meta jsonb;
begin
  if p_label is null or p_label = '' then return null; end if;

  v_identity_key := nullif(p_meta->>'identity_key', '');
  v_meta := coalesce(p_meta, '{}'::jsonb) - 'identity_key';

  if v_identity_key is not null then
    select id into v from public.nodes where type = p_type and identity_key = v_identity_key limit 1;
  end if;

  if v is null then
    select id, identity_key into v, v_existing_key from public.nodes where type = p_type and label = p_label limit 1;
    if v is not null and v_identity_key is not null then
      if v_existing_key is null then
        -- opportunistic backfill: this legacy label-matched row IS the entity v_identity_key refers to.
        update public.nodes set identity_key = v_identity_key where id = v;
      elsif v_existing_key <> v_identity_key then
        -- a DIFFERENT already-anchored entity happens to share this label -- do not merge.
        v := null;
      end if;
    end if;
  end if;

  if v is null then
    insert into public.nodes (type, label, is_active, metadata, identity_key)
    values (p_type, p_label, true, v_meta || jsonb_build_object('auto','research_contribution'), v_identity_key)
    returning id into v;
  end if;

  return v;
end;
$function$;
