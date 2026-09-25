-- G3 People 2029 — reserve server-owned historical identity namespaces.
-- Branch-only candidate; no live apply in this commit.
--
-- Problem:
-- public.link_identity(kind='legacy_seed') is intentionally client-executable for browser
-- legacy ids, accepts client meta, and identity_edges.confidence defaults to 100.
-- Therefore server-reviewed namespaces must be rejected before resolve_person() so an
-- anonymous/client caller cannot pre-claim or spoof Contributor/OpenWeb Human-Gate edges.
--
-- Reserved server namespaces:
--   sod_id:    historical:*
--   legacy_id: contributor:*
--              openweb_user:*
--
-- Legitimate browser legacy seeds (sod_vid / older raw ids) continue unchanged.

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
    if p_user_id is not null then
      return null;
    end if;
  end if;

  if p_kind = 'legacy_seed'
     and (p_legacy_id is null or btrim(p_legacy_id) = '') then
    return null;
  end if;

  -- Server-only historical identity namespaces. The admin historical bridge writes
  -- identity_edges directly and never calls link_identity(), so rejecting them here
  -- cannot block the approved Human-Gate path.
  if p_kind = 'legacy_seed'
     and (
       lower(btrim(p_sod_id)) like 'historical:%'
       or lower(btrim(p_legacy_id)) like 'contributor:%'
       or lower(btrim(p_legacy_id)) like 'openweb_user:%'
     ) then
    return null;
  end if;

  v_person := public.resolve_person(p_sod_id);
  if v_person is null then
    return null;
  end if;

  if p_kind = 'login' then
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
      sod_id, person_id, kind, legacy_id, meta
    )
    values (
      p_sod_id, v_person, p_kind, p_legacy_id, p_meta
    )
    on conflict (sod_id, person_id, legacy_id)
      where kind = 'legacy_seed' and legacy_id is not null
    do update
      set last_seen = now();
  else
    insert into public.identity_edges (
      sod_id, person_id, kind, legacy_id, meta
    )
    values (
      p_sod_id, v_person, p_kind, p_legacy_id, p_meta
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
  'Canonical public identity bridge. G3 2026-09-25 additionally reserves historical:/contributor:/openweb_user: namespaces for trusted server/Human-Gate writers; browser legacy_seed/login/push behavior remains bounded and unchanged.';
