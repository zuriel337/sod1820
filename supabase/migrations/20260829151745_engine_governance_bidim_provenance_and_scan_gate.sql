-- ENGINE GOVERNANCE FOUNDATION — PART 3/3
-- BIDIM PROVENANCE · SCANNABLE WRITE GATE · FULL-SCAN REPORT CONTRACT
-- Removes the live governance bypass: bidim_sync's hardcoded
--   approved_sum_composites ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך']
-- which wrote four active=false composites on every verified word.
-- Historical rows are NOT deleted and NOT rewritten (HG-E2).

-- 1. BIDIM PROVENANCE COLUMNS
alter table public.bidim
  add column if not exists method_version              int,
  add column if not exists operator                    text,
  add column if not exists dependency_version_snapshot jsonb,
  add column if not exists computed_at                 timestamptz,
  add column if not exists engine_run_id               uuid,
  add column if not exists provenance_state            text not null default 'legacy_unknown';

alter table public.bidim alter column provenance_state set default 'governed';

alter table public.bidim drop constraint if exists bidim_provenance_state_chk;
alter table public.bidim
  add constraint bidim_provenance_state_chk
  check (provenance_state in ('governed', 'legacy_unknown')) not valid;
alter table public.bidim validate constraint bidim_provenance_state_chk;

comment on column public.bidim.method_version is
  'gematria_methods.version in force when this row was computed. NULL = legacy row, engine version unknown.';
comment on column public.bidim.operator is
  'Composition operator in force for a composite result. NULL for atomic results and for legacy rows.';
comment on column public.bidim.dependency_version_snapshot is
  'Snapshot of gematria_methods.dependency_versions at compute time — lets a composite result be re-derived against exactly the component versions that produced it.';
comment on column public.bidim.computed_at is
  'When this row was computed by a governed engine run. NULL = legacy row.';
comment on column public.bidim.engine_run_id is
  'Groups all rows written by one governed engine run. NULL = legacy row.';
comment on column public.bidim.provenance_state is
  'governed = written by the scannable-gated engine with full provenance. legacy_unknown = pre-Engine-Governance row whose producing run cannot be reconstructed; deliberately left as explicitly unknown rather than back-filled with fabricated metadata (everything_additive_law). Includes the 50,368 composite rows written under the removed bidim_sync bypass.';

grant select (method_version, operator, dependency_version_snapshot,
              computed_at, engine_run_id, provenance_state)
  on public.bidim to anon, authenticated, service_role;

-- 2. THE GOVERNED WRITE PATH — bidim_sync without the bypass
create or replace function public.bidim_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m record; v bigint; pr int;
  v_run uuid := gen_random_uuid();
  v_bid text;
begin
  -- INVALIDATION: historical rows for no-longer-scannable methods are PRESERVED
  -- while they still describe the same phrase. A changed phrase invalidates all
  -- derived rows for that word (invalidation of a changed source, not cleanup).
  if TG_OP = 'DELETE' then
    delete from public.bidim where word_id = OLD.id;
  elsif TG_OP = 'UPDATE' then
    if NEW.phrase is distinct from OLD.phrase then
      delete from public.bidim where word_id = OLD.id;
    else
      delete from public.bidim b
       where b.word_id = OLD.id
         and public.fn_method_is_scannable(b.method);
      update public.bidim b
         set category = NEW.category, is_verified = NEW.is_verified
       where b.word_id = OLD.id;
    end if;
  end if;

  if TG_OP not in ('INSERT', 'UPDATE') or not NEW.is_verified then
    return null;
  end if;

  -- GOVERNED WRITE. NO HARDCODED METHOD OR COMPOSITE LIST. Eligibility comes
  -- exclusively from scannable AND active AND executable AND engine_verified.
  -- Atomic, depth and composite pass the SAME gate; in_engine is never consulted.
  for m in
    select s.method_key, s.category, s.operator, s.method_version, s.dependency_versions, s.sort_order
    from public.v_method_states s
    where s.scannable
    order by s.sort_order
  loop
    begin
      v := public.fn_method_value(m.method_key, NEW.phrase);
    exception when others then
      v := null;
    end;

    if v is not null then
      pr := case m.method_key
              when 'רגיל' then 1 when 'מסתתר' then 1 when 'קדמי' then 1
              when 'מילוי' then 2 when 'אתבש' then 3
              else 4 end;

      v_bid := public.fn_bidim_id(
                 NEW.id, m.method_key, m.method_version,
                 case when m.category = 'composite' then m.operator else null end);

      insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                                bid_id, method_version, operator, dependency_version_snapshot,
                                computed_at, engine_run_id, provenance_state)
      values (NEW.id, NEW.phrase, m.method_key, v, pr, NEW.category, NEW.is_verified,
              v_bid, m.method_version,
              case when m.category = 'composite' then m.operator else null end,
              case when m.category = 'composite' then m.dependency_versions else null end,
              now(), v_run, 'governed')
      on conflict (bid_id) do update set
        value                       = excluded.value,
        phrase                      = excluded.phrase,
        is_verified                 = excluded.is_verified,
        category                    = excluded.category,
        priority                    = excluded.priority,
        method_version              = excluded.method_version,
        operator                    = excluded.operator,
        dependency_version_snapshot = excluded.dependency_version_snapshot,
        computed_at                 = excluded.computed_at,
        engine_run_id               = excluded.engine_run_id,
        provenance_state            = 'governed';
    end if;
  end loop;

  return null;
end;
$$;

comment on function public.bidim_sync() is
  'Governed bidim projection writer. Engine Governance Foundation 29.8.2026: the hardcoded approved_sum_composites array that wrote four inactive composites regardless of gematria_methods.active has been REMOVED. Eligibility is now exclusively fn_method_is_scannable() = scannable AND active AND executable AND engine_verified. in_engine is not a gate. Every written row carries method_version, operator, dependency_version_snapshot, computed_at, engine_run_id and provenance_state=governed.';

-- 3. FULL CANONICAL METHOD SCAN — REPORT CONTRACT (the scan itself is NOT run)
create or replace function public.fn_method_scan_report()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'generated_at',            now(),
    'corpus_size_verified',    (select count(*) from public.gematria_words where is_verified),
    'n_registered',            (select count(*) from public.v_method_states),
    'n_active',                (select count(*) from public.v_method_states where active),
    'n_in_engine_declared',    (select count(*) from public.v_method_states where in_engine_declared),
    'n_in_engine_drift',       (select count(*) from public.v_method_states where in_engine_drift),
    'n_executable',            (select count(*) from public.v_method_states where executable),
    'n_engine_verified',       (select count(*) from public.v_method_states where engine_verified),
    'n_scannable',             (select count(*) from public.v_method_states where scannable),
    'n_scannable_base',        (select count(*) from public.v_method_states where scannable and category = 'base'),
    'n_scannable_depth',       (select count(*) from public.v_method_states where scannable and category = 'depth'),
    'n_scannable_composite',   (select count(*) from public.v_method_states where scannable and category = 'composite'),
    'n_registered_composites', (select count(*) from public.v_method_states where category = 'composite'),
    'n_active_composites',     (select count(*) from public.v_method_states where category = 'composite' and active),
    'scannable_methods',       (select coalesce(jsonb_agg(method_key order by sort_order), '[]'::jsonb)
                                  from public.v_method_states where scannable),
    'excluded_with_reason',    (select coalesce(jsonb_agg(jsonb_build_object(
                                      'method_key', method_key, 'category', category,
                                      'reason', not_scannable_reason) order by sort_order), '[]'::jsonb)
                                  from public.v_method_states where not scannable),
    'bidim_coverage',          (select coalesce(jsonb_agg(jsonb_build_object(
                                      'method', method, 'rows', n,
                                      'governed', governed_n, 'legacy_unknown', legacy_n,
                                      'currently_scannable', public.fn_method_is_scannable(method)) order by method), '[]'::jsonb)
                                  from (select method, count(*) n,
                                               count(*) filter (where provenance_state = 'governed') governed_n,
                                               count(*) filter (where provenance_state = 'legacy_unknown') legacy_n
                                        from public.bidim group by method) c),
    'pre_scan_invariant_note', 'A Full Canonical Method Scan may only run when bidim holds rows ONLY for currently-scannable methods, at the current corpus size, with current versions. Compare bidim_coverage.currently_scannable against corpus_size_verified before running anything.'
  );
$$;

comment on function public.fn_method_scan_report() is
  'Live runtime report for the Full Canonical Method Scan contract. Every figure is measured, never hardcoded. Reports REGISTERED / ACTIVE / IN_ENGINE(diagnostic) / EXECUTABLE / ENGINE_VERIFIED / SCANNABLE, per-category scannable counts, the scannable method list, every exclusion with its reason, and bidim coverage split governed vs legacy_unknown. This function REPORTS — it never scans and never writes.';

grant execute on function public.fn_method_scan_report() to service_role;
