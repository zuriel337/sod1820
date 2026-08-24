-- SOD1820 — Private F-1b Family Slice (Ledger-only)
-- ZURIEL Human-Gate: OD-F9a + OD-F9b approved direction (work_log actor=GPT 06:11:13, 24.8.2026)
-- Applied to the live project via apply_migration (name: create_fn_family_private_slice).
-- Function-level design mirrors fn_upsert_self_profile (F-1a'), applied via execute_sql in an
-- earlier session; this slice uses apply_migration instead since it is DDL (CREATE FUNCTION).
-- Source of record for provenance — the live functions are the executable truth; this file
-- exists so the design has a reviewable, committed artifact.
--
-- Scope (smallest possible private Ledger-only F-1b slice):
--   - server-minted stable person-ref for a new family member, under the already-approved
--     namespace person:<owner>:{self|p:<ref>} (OD-F10a, docs/planning/family_identity_contract.md)
--   - one normalized-direction typed relation (parent_of) as a provenance-bearing assertion
--     in the existing private research_objects Ledger
--   - zero new tables/columns; zero nodes/edges writes; zero public exposure
--
-- Explicitly OUT OF SCOPE (per ZURIEL's gate):
--   - OD-F8 / nodes_public_read / any graph projection
--   - account registration/claim flow (future: attaches to this same identity, never mints a
--     competing one — not built here)
--   - family_shared enforcement (the column value exists on research_objects already per R1/§16,
--     but §16 itself already states there is no active ACL for it — this slice never sets
--     anything but 'private', by design, fail-closed)
--
-- Live schema facts verified before writing this (fresh, this session):
--   research_objects.kind CHECK already permits 'relation' (66 existing rows, all
--     source='discovery-engine' cross-method equality — unrelated to family, precedent only)
--   research_objects.relates text[] exists (used loosely by the above precedent; here it is
--     ONE part of a structured convention, never the sole encoding, per ZURIEL's instruction)
--   research_objects RLS is enabled with ZERO policies and ZERO client grants (anon/authenticated
--     have no SELECT/INSERT/UPDATE at all) — the table is already fully server-only; these
--     SECURITY DEFINER functions are the only access path, exactly like fn_upsert_self_profile
--   persons has no name column — a family member never gets a persons row here; per
--     family_identity_contract.md: "identity is logical (person-ref), embodied by the identity-RO"

-- ============================================================================
-- 1) fn_upsert_family_member — mints or updates a family member's identity-RO
-- ============================================================================
-- Contract: pass p_ref=NULL to mint a brand-new, server-generated stable ref (returned in the
-- result). Pass an already-minted p_ref back on any subsequent call to update that same member
-- idempotently (same owner+kind+source_ref key => same row, never a duplicate). This mirrors
-- fn_upsert_self_profile's own idempotent-upsert-by-deterministic-key pattern, generalized to
-- a caller-supplied key for the "which family member" axis (self has only one; family members
-- do not, so the ref itself is that axis).
create or replace function public.fn_upsert_family_member(
  p_owner uuid,
  p_ref   text,      -- null => mint new; non-null => idempotent update of that existing ref
  p_name  text,
  p_meta  jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
  v_owner boolean;
  v_ref   text := p_ref;
  v_source_ref text;
  v_id    uuid;
begin
  if p_owner is null then raise exception 'missing owner'; end if;
  if coalesce(nullif(p_name, ''), '') = '' then raise exception 'missing name'; end if;

  v_admin := exists (select 1 from public.users   u  where u.id = v_uid and u.role = 'admin');
  v_owner := exists (select 1 from public.persons pr where pr.person_id = p_owner and pr.account_user_id = v_uid);
  if not (v_admin or v_owner) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  if v_ref is null or v_ref = '' then
    v_ref := gen_random_uuid()::text;
  end if;

  v_source_ref := 'person:' || p_owner::text || ':p:' || v_ref;

  select id into v_id
    from public.research_objects
   where owner_person_id = p_owner
     and kind            = 'observation'
     and source_ref      = v_source_ref
   limit 1;

  if v_id is not null then
    update public.research_objects
       set statement = p_name,
           meta      = coalesce(p_meta, '{}'::jsonb)
     where id = v_id;
  else
    insert into public.research_objects
      (kind, statement, source, source_ref, contributor, owner_person_id, privacy_scope, status, engine_verified, meta)
    values
      ('observation', p_name, 'family_input', v_source_ref, p_owner::text, p_owner, 'private', 'candidate', false, coalesce(p_meta, '{}'::jsonb))
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id, 'ref', v_ref, 'source_ref', v_source_ref, 'name', p_name);
end;
$$;

revoke all on function public.fn_upsert_family_member(uuid, text, text, jsonb) from public;
grant execute on function public.fn_upsert_family_member(uuid, text, text, jsonb) to authenticated;

-- ============================================================================
-- 2) fn_upsert_family_relation — one normalized-direction typed relation assertion
-- ============================================================================
-- Contract: stores exactly one direction (parent_of today; the parameter exists for future
-- extension without a signature change, but this slice validates against a single-value
-- allowlist — widening the vocabulary is a separate future decision, not made here). The
-- inverse (child_of) is never stored as a second row — callers/readers derive it, e.g.
-- fn_list_family below does this in its SELECT, not via a second write.
create or replace function public.fn_upsert_family_relation(
  p_owner         uuid,
  p_parent_ref    text,
  p_child_ref     text,
  p_relation_type text default 'parent_of',
  p_meta          jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
  v_owner boolean;
  v_source_ref text;
  v_id    uuid;
  v_self_ref text := 'person:' || coalesce(p_owner::text, '') || ':self';
begin
  if p_owner is null then raise exception 'missing owner'; end if;
  if coalesce(nullif(p_parent_ref, ''), '') = '' or coalesce(nullif(p_child_ref, ''), '') = '' then
    raise exception 'missing parent_ref/child_ref';
  end if;
  if p_parent_ref = p_child_ref then
    raise exception 'parent_ref and child_ref must differ';
  end if;
  if p_relation_type not in ('parent_of') then
    raise exception 'unsupported relation_type: % (this slice supports only parent_of)', p_relation_type;
  end if;

  v_admin := exists (select 1 from public.users   u  where u.id = v_uid and u.role = 'admin');
  v_owner := exists (select 1 from public.persons pr where pr.person_id = p_owner and pr.account_user_id = v_uid);
  if not (v_admin or v_owner) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  -- both endpoints must already exist as this owner's identities (self, or a minted family member)
  if p_parent_ref <> v_self_ref and not exists (
    select 1 from public.research_objects
     where owner_person_id = p_owner and kind = 'observation' and source_ref = p_parent_ref
  ) then
    raise exception 'unknown parent_ref for this owner: %', p_parent_ref;
  end if;
  if p_child_ref <> v_self_ref and not exists (
    select 1 from public.research_objects
     where owner_person_id = p_owner and kind = 'observation' and source_ref = p_child_ref
  ) then
    raise exception 'unknown child_ref for this owner: %', p_child_ref;
  end if;

  v_source_ref := 'family_relation:' || p_relation_type || ':' || p_parent_ref || ':' || p_child_ref;

  select id into v_id
    from public.research_objects
   where owner_person_id = p_owner
     and kind            = 'relation'
     and source_ref      = v_source_ref
   limit 1;

  if v_id is not null then
    update public.research_objects
       set relates = ARRAY[p_parent_ref, p_child_ref],
           meta    = coalesce(p_meta, '{}'::jsonb)
                      || jsonb_build_object('relation_type', p_relation_type, 'parent_ref', p_parent_ref, 'child_ref', p_child_ref)
     where id = v_id;
  else
    insert into public.research_objects
      (kind, statement, terms, relates, source, source_ref, contributor, owner_person_id, privacy_scope, status, engine_verified, meta)
    values
      ('relation',
       p_relation_type || ': ' || p_parent_ref || ' -> ' || p_child_ref,
       ARRAY[p_parent_ref, p_child_ref],
       ARRAY[p_parent_ref, p_child_ref],
       'family_input', v_source_ref, p_owner::text, p_owner, 'private', 'candidate', false,
       coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('relation_type', p_relation_type, 'parent_ref', p_parent_ref, 'child_ref', p_child_ref))
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id, 'source_ref', v_source_ref, 'relation_type', p_relation_type,
                             'parent_ref', p_parent_ref, 'child_ref', p_child_ref);
end;
$$;

revoke all on function public.fn_upsert_family_relation(uuid, text, text, text, jsonb) from public;
grant execute on function public.fn_upsert_family_relation(uuid, text, text, text, jsonb) to authenticated;

-- ============================================================================
-- 3) fn_list_family — owner-scoped read, derives the inverse (child_of) at read time
-- ============================================================================
-- Never leaks another owner's rows regardless of privacy_scope value (family_shared has no
-- active ACL yet per §16 — this function does not attempt to implement one; it simply never
-- returns anything outside the exact owner requested, which is the only guarantee this slice
-- makes).
create or replace function public.fn_list_family(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
  v_owner boolean;
  v_members jsonb;
  v_relations jsonb;
begin
  if p_owner is null then raise exception 'missing owner'; end if;

  v_admin := exists (select 1 from public.users   u  where u.id = v_uid and u.role = 'admin');
  v_owner := exists (select 1 from public.persons pr where pr.person_id = p_owner and pr.account_user_id = v_uid);
  if not (v_admin or v_owner) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'source_ref', source_ref, 'name', statement, 'meta', meta, 'created_at', created_at
         )), '[]'::jsonb)
    into v_members
    from public.research_objects
   where owner_person_id = p_owner and kind = 'observation'
     and source_ref like 'person:' || p_owner::text || ':%';

  select coalesce(jsonb_agg(jsonb_build_object(
           'source_ref', source_ref,
           'relation_type', meta->>'relation_type',
           'parent_ref', meta->>'parent_ref',
           'child_ref', meta->>'child_ref',
           -- derived inverse, never a stored second row:
           'inverse', case when meta->>'relation_type' = 'parent_of' then 'child_of' else null end,
           'created_at', created_at
         )), '[]'::jsonb)
    into v_relations
    from public.research_objects
   where owner_person_id = p_owner and kind = 'relation'
     and source_ref like 'family_relation:%';

  return jsonb_build_object('members', v_members, 'relations', v_relations);
end;
$$;

revoke all on function public.fn_list_family(uuid) from public;
grant execute on function public.fn_list_family(uuid) to authenticated;
