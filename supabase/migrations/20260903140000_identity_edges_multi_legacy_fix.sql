-- IDENTITY_EDGES_MULTI_LEGACY_FIX (Design Gate work_log 27de72b9, approved w/ 2 corrections, apply approved by ZURIEL)
-- Fixes: link_identity(kind='legacy_seed') was silently overwriting legacy_id on ON CONFLICT
-- (sod_id,person_id,kind) instead of keeping many legacy IDs -> one (sod_id,person). No history
-- retained by the old behavior -- see work_log 27de72b9 for full root-cause audit.
--
-- Model: many legacy_ids -> one sod_id/person (each an independent row); same legacy_id -> a
-- DIFFERENT sod_id/person must remain a genuine, surfaced conflict (never silently overwritten).
-- Idempotent ONLY when the exact same (sod_id,person_id,legacy_id) triple repeats.
--
-- Validated via a live BEGIN...ROLLBACK sandbox against this exact production schema/data before
-- this apply (6/6 test cases passed, zero residue after rollback -- see work_log 27de72b9/0e5b1d10),
-- then re-validated live post-apply against production (6/6 passed again, test rows cleaned up --
-- see work_log AFTER entry for this task).
--
-- Already applied directly to production (linswmnnkjxvweumprav) via apply_migration before this
-- file was committed -- this file documents it for git/DB provenance sync, matching the project's
-- convention that DB changes are live immediately and independent of app deploy.

-- 1) Replace the table-wide UNIQUE(sod_id,person_id,kind) with two partial unique indexes:
--    - a GENERAL invariant for every kind except legacy_seed (future kinds get this protection
--      automatically, no hardcoded list)
--    - a row-level invariant for legacy_seed keyed by the actual legacy_id too, so multiple
--      distinct legacy IDs can coexist for the same (sod_id,person)
ALTER TABLE public.identity_edges DROP CONSTRAINT identity_edges_sod_id_person_id_kind_key;

CREATE UNIQUE INDEX identity_edges_singular_kind_unique
  ON public.identity_edges (sod_id, person_id, kind)
  WHERE kind <> 'legacy_seed';

CREATE UNIQUE INDEX identity_edges_legacy_seed_row_unique
  ON public.identity_edges (sod_id, person_id, legacy_id)
  WHERE kind = 'legacy_seed' AND legacy_id IS NOT NULL;

-- NOTE: the existing identity_edges_legacy_seed_unique (legacy_id -> at most one sod_id, from
-- IDENTITY_UNIFICATION_V1) is UNTOUCHED and orthogonal. It is what actually raises a real 23505
-- for "same legacy_id -> different sod_id/person", because the ON CONFLICT clauses below target
-- different column sets and therefore never suppress that index's violations.

-- 2) resolve_person(): only its device-kind insert target changes to match the new partial index.
--    Body otherwise byte-identical to the current live function.
CREATE OR REPLACE FUNCTION public.resolve_person(p_sod_id text, p_app_context text DEFAULT NULL::text, p_via text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_person uuid;
begin
  if p_sod_id is null or p_sod_id = '' then return null; end if;
  select person_id into v_person from identity_edges where sod_id = p_sod_id order by first_seen limit 1;
  if v_person is null then
    insert into persons (first_seen, last_seen, first_source, first_app_context)
      values (now(), now(), p_via, p_app_context) returning person_id into v_person;
    insert into identity_edges (sod_id, person_id, kind) values (p_sod_id, v_person, 'device')
      on conflict (sod_id, person_id, kind) where kind <> 'legacy_seed' do nothing;
  else
    update persons set last_seen = now() where person_id = v_person;
    update identity_edges set last_seen = now() where sod_id = p_sod_id and kind='device';
  end if;
  insert into sod_id_registry (sod_id, first_app_context, last_seen)
    values (p_sod_id, p_app_context, now())
    on conflict (sod_id) do update set last_seen = now();
  return v_person;
end $function$;

-- 3) link_identity(): branches the INSERT by kind. legacy_seed now targets the new row-level
--    index (idempotent per exact triple, never overwrites legacy_id across rows); every other
--    kind keeps the EXACT current behavior (same target, same DO UPDATE clause, same login
--    account-takeover guard from the 19.8.2026 security fix, byte-identical).
CREATE OR REPLACE FUNCTION public.link_identity(p_sod_id text, p_kind text, p_legacy_id text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_person uuid; v_existing uuid; v_old uuid; v_claimed boolean;
begin
  v_person := public.resolve_person(p_sod_id);
  if v_person is null then return null; end if;

  -- 🔒 שער-בעלות (19.8.2026): ענף ה-login נפתח רק כשהקורא הוא באמת p_user_id (חוסם anon),
  --    ורק כשה-person של ה-sod_id אינו כבר משויך לחשבון אחר (חוסם השתלטות דרך sod_id שנקצר).
  if p_kind = 'login' and p_user_id is not null and p_user_id = auth.uid() then
    select (account_user_id is not null and account_user_id <> p_user_id)
      into v_claimed from persons where person_id = v_person;
    if not coalesce(v_claimed, false) then
    select person_id into v_existing from persons where account_user_id = p_user_id limit 1;
    if v_existing is not null and v_existing <> v_person then
      v_old := v_person;
      update identity_edges set person_id = v_existing where person_id = v_old;
      update events set person_id = v_existing where person_id = v_old;  -- ההיסטוריה עוקבת אחרי המיזוג
      update research_objects set owner_person_id = v_existing where owner_person_id = v_old;  -- ← R1: שימור בעלות לפני מחיקת v_old
      update persons set last_seen = greatest(persons.last_seen, (select last_seen from persons where person_id=v_old))
        where person_id = v_existing;
      delete from persons where person_id = v_old;
      v_person := v_existing;
    else
      update persons set account_user_id = p_user_id where person_id = v_person;
    end if;
    end if;
  end if;

  -- IDENTITY_EDGES_MULTI_LEGACY_FIX: many legacy_ids -> one (sod_id,person), each its own row.
  -- Idempotent ONLY on an exact (sod_id,person_id,legacy_id) repeat; a genuine cross-identity
  -- collision (same legacy_id already owned by a different sod_id) is NOT suppressed here -- it
  -- surfaces as a real 23505 from the pre-existing identity_edges_legacy_seed_unique index.
  if p_kind = 'legacy_seed' then
    insert into identity_edges (sod_id, person_id, kind, legacy_id, meta)
      values (p_sod_id, v_person, p_kind, p_legacy_id, p_meta)
      on conflict (sod_id, person_id, legacy_id) where kind = 'legacy_seed' and legacy_id is not null
      do update set last_seen = now();
  else
    insert into identity_edges (sod_id, person_id, kind, legacy_id, meta)
      values (p_sod_id, v_person, p_kind, p_legacy_id, p_meta)
      on conflict (sod_id, person_id, kind) where kind <> 'legacy_seed'
      do update set last_seen = now(), legacy_id = coalesce(excluded.legacy_id, identity_edges.legacy_id);
  end if;
  return v_person;
end $function$;
