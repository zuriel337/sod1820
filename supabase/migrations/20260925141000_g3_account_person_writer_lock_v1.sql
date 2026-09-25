-- G3 Account → Person Completeness — serialize all live account-Person writers.
-- Depends on persons_account_user_id_unique.
--
-- Writers covered:
--   1) fn_get_or_create_my_person() INSERTs account-bound Person rows.
--   2) link_identity(kind='login') may bind/merge a device Person to an account.
-- admin_person_materialize_contributor_history_v1 already uses the same
-- person_account:<uuid> advisory-lock namespace and does not create account Persons.
--
-- No public signature changes. No new store/table/identity kind.

create or replace function public.fn_get_or_create_my_person()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_person uuid;
begin
  if v_uid is null then
    raise exception 'not authorized: authentication required';
  end if;

  -- Serialize account create-vs-reuse with every other Account→Person writer.
  perform pg_advisory_xact_lock(
    hashtextextended('person_account:' || v_uid::text, 1820)
  );

  select p.person_id
    into v_person
    from public.persons p
   where p.account_user_id = v_uid
   order by p.created_at, p.person_id
   limit 1;

  if v_person is not null then
    return v_person;
  end if;

  insert into public.persons (
    first_seen,
    last_seen,
    first_source,
    account_user_id
  )
  values (
    now(),
    now(),
    'life_journey_ui',
    v_uid
  )
  returning person_id into v_person;

  return v_person;
end
$function$;

comment on function public.fn_get_or_create_my_person() is
  'Returns/creates the authenticated caller canonical account Person. G3 2026-09-25 serializes account create-vs-reuse with person_account:<auth.uid> transaction advisory locking.';

create or replace function public.link_identity(
  p_sod_id text,
  p_kind text,
  p_legacy_id text default null::text,
  p_user_id uuid default null::uuid,
  p_meta jsonb default null::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_person uuid;
  v_existing uuid;
  v_old uuid;
  v_claimed boolean;
begin
  if p_sod_id is null or btrim(p_sod_id) = '' then
    return null;
  end if;

  -- Public contract remains explicit and finite.
  if p_kind not in ('legacy_seed','login','push') then
    return null;
  end if;

  if p_kind = 'login' then
    if p_user_id is null
       or auth.uid() is null
       or p_user_id is distinct from auth.uid() then
      return null;
    end if;
  else
    -- Anonymous bridge kinds never carry a claimed account principal.
    if p_user_id is not null then
      return null;
    end if;
  end if;

  if p_kind = 'legacy_seed'
     and (p_legacy_id is null or btrim(p_legacy_id) = '') then
    return null;
  end if;

  -- resolve_person now holds resolve_person:<sod_id> xact lock until this outer call
  -- ends, so same-sod_id login claims remain serialized as before.
  v_person := public.resolve_person(p_sod_id);
  if v_person is null then
    return null;
  end if;

  if p_kind = 'login' then
    -- Fixed lock order:
    --   resolve_person:<sod_id> → person_account:<user_id>
    -- This matches the existing historical bridge account lock namespace and prevents
    -- concurrent account Person create/bind races without introducing a deadlock cycle.
    perform pg_advisory_xact_lock(
      hashtextextended('person_account:' || p_user_id::text, 1820)
    );

    select (p.account_user_id is not null and p.account_user_id <> p_user_id)
      into v_claimed
      from public.persons p
     where p.person_id = v_person;

    if not coalesce(v_claimed, false) then
      select p.person_id
        into v_existing
        from public.persons p
       where p.account_user_id = p_user_id
       order by p.created_at, p.person_id
       limit 1;

      if v_existing is not null and v_existing <> v_person then
        v_old := v_person;

        update public.identity_edges
           set person_id = v_existing
         where person_id = v_old;

        update public.events
           set person_id = v_existing
         where person_id = v_old;

        update public.research_objects
           set owner_person_id = v_existing
         where owner_person_id = v_old;

        update public.persons
           set last_seen = greatest(
             public.persons.last_seen,
             (select p2.last_seen from public.persons p2 where p2.person_id = v_old)
           )
         where person_id = v_existing;

        delete from public.persons
         where person_id = v_old;

        v_person := v_existing;
      else
        update public.persons
           set account_user_id = p_user_id
         where person_id = v_person;
      end if;
    end if;
  end if;

  if p_kind = 'legacy_seed' then
    insert into public.identity_edges (
      sod_id,
      person_id,
      kind,
      legacy_id,
      meta
    )
    values (
      p_sod_id,
      v_person,
      p_kind,
      p_legacy_id,
      p_meta
    )
    on conflict (sod_id, person_id, legacy_id)
      where kind = 'legacy_seed' and legacy_id is not null
    do update
      set last_seen = now();
  else
    insert into public.identity_edges (
      sod_id,
      person_id,
      kind,
      legacy_id,
      meta
    )
    values (
      p_sod_id,
      v_person,
      p_kind,
      p_legacy_id,
      p_meta
    )
    on conflict (sod_id, person_id, kind)
      where kind <> 'legacy_seed'
    do update
      set last_seen = now(),
          legacy_id = coalesce(excluded.legacy_id, public.identity_edges.legacy_id);
  end if;

  return v_person;
end
$function$;

comment on function public.link_identity(text,text,text,uuid,jsonb) is
  'Canonical identity bridge. Public/client kinds remain legacy_seed, login (auth-owned), push. G3 2026-09-25 serializes login account decisions with the canonical person_account:<user_id> advisory lock.';
