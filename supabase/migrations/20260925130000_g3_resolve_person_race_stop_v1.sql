-- G3 Person Foundation — stop resolve_person() check-then-insert race.
-- Branch-only candidate. No historical duplicate reconciliation is performed here.
--
-- Live preflight (2026-09-25, canonical project linswmnnkjxvweumprav):
--   4,424 sod_id values currently point at >1 person_id (max 4).
-- The same race was documented on 2026-09-03 at 3,656 duplicate sod_id values,
-- so the bleed is still active.
--
-- Contract:
--   * Preserve resolve_person(text,text,text) signature and SECURITY DEFINER model.
--   * Serialize create-vs-reuse for the same sod_id with a transaction advisory lock.
--   * Keep all existing historical duplicate Persons/edges untouched.
--   * Keep events/sod_id_registry semantics unchanged.
--   * Hash collisions may serialize unrelated ids, but cannot merge/corrupt identity.

create or replace function public.resolve_person(
  p_sod_id text,
  p_app_context text default null::text,
  p_via text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_person uuid;
begin
  if p_sod_id is null or btrim(p_sod_id) = '' then
    return null;
  end if;

  -- G3 race-stop: all create-vs-reuse decisions for one identity spine serialize
  -- inside the surrounding transaction/statement. Existing duplicate groups are
  -- not modified; the earliest existing edge remains the deterministic choice.
  perform pg_advisory_xact_lock(
    hashtextextended('resolve_person:' || p_sod_id, 1820)
  );

  select person_id
    into v_person
    from public.identity_edges
   where sod_id = p_sod_id
   order by first_seen, person_id
   limit 1;

  if v_person is null then
    insert into public.persons (first_seen, last_seen, first_source, first_app_context)
    values (now(), now(), p_via, p_app_context)
    returning person_id into v_person;

    insert into public.identity_edges (sod_id, person_id, kind)
    values (p_sod_id, v_person, 'device')
    on conflict (sod_id, person_id, kind) where kind <> 'legacy_seed'
    do nothing;
  else
    update public.persons
       set last_seen = now()
     where person_id = v_person;

    update public.identity_edges
       set last_seen = now()
     where sod_id = p_sod_id
       and kind = 'device';
  end if;

  insert into public.sod_id_registry (sod_id, first_app_context, last_seen)
  values (p_sod_id, p_app_context, now())
  on conflict (sod_id)
  do update set last_seen = now();

  return v_person;
end
$function$;

comment on function public.resolve_person(text,text,text) is
  'Canonical identity-spine resolver. G3 2026-09-25 adds per-sod_id transaction advisory locking to stop concurrent duplicate Person creation. Historical duplicates are preserved for separate Human-Gate reconciliation.';
