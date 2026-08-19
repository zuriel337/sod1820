-- F-1a′ — Family Input Ledger (SELF profile only)
-- Human-Gate authorized WRITE. Scope: research_objects ONLY.
-- ⛔ No nodes/edges. No family members. No parent_of. No Journey. No ELS.
-- ⛔ No migration / no new index / no schema change. No deploy / no merge.
--
-- Writes exactly ONE singleton research_object per owner ("self"), private, server-side ledger.
-- Idempotency key = (owner_person_id, kind='observation', source_ref='person:<owner>:self')
--   — deliberately NOT keyed on statement/name (rename must not duplicate the self row).
-- Graph projection is a SEPARATE later phase (blocked by OD-F8: nodes_public_read USING(true)).
-- Family members are a SEPARATE later phase (blocked by OD-F9: member idempotency key).

create or replace function public.fn_upsert_self_profile(p_owner uuid, p_name text, p_meta jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid   uuid    := auth.uid();
  v_admin boolean;
  v_owner boolean;
  v_ref   text    := 'person:' || p_owner::text || ':self';
  v_id    uuid;
begin
  if p_owner is null then raise exception 'missing owner'; end if;
  if coalesce(nullif(p_name, ''), '') = '' then raise exception 'missing name'; end if;

  -- owner/admin gate (no is_admin helper exists → inline, mirrors save_els_matrix)
  v_admin := exists (select 1 from public.users   u  where u.id = v_uid and u.role = 'admin');
  v_owner := exists (select 1 from public.persons pr where pr.person_id = p_owner and pr.account_user_id = v_uid);
  if not (v_admin or v_owner) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  -- idempotent singleton lookup (owner + kind + source_ref) — never by name
  select id into v_id
    from public.research_objects
   where owner_person_id = p_owner
     and kind            = 'observation'
     and source_ref      = v_ref
   limit 1;

  if v_id is not null then
    -- update ONLY statement + meta; preserve created_at / source / source_ref / contributor / owner / privacy
    update public.research_objects
       set statement = p_name,
           meta      = coalesce(p_meta, '{}'::jsonb)
     where id = v_id;
    return v_id;
  end if;

  insert into public.research_objects
    (kind,          statement, source,          source_ref, contributor,     owner_person_id, privacy_scope, status,      engine_verified, meta)
  values
    ('observation', p_name,    'family_input',  v_ref,      p_owner::text,   p_owner,         'private',     'candidate', false,           coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all     on function public.fn_upsert_self_profile(uuid, text, jsonb) from public, anon;
grant  execute on function public.fn_upsert_self_profile(uuid, text, jsonb) to   authenticated;
