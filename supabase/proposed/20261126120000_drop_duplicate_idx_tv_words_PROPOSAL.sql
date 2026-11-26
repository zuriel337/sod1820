-- Drop the exact duplicate GIN index public.idx_tv_words (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB).
-- Package: docs/reviews/db-capacity-audit-20261126/README.md (section "תיקון ענפי: אינדקס כפול").
--
-- Owners: foundation_closure_protocol_law v8 item 94 (capacity/growth + retention/compaction rows) under
-- research_intake_foundation_contract_law v14 13.11 (no arbitrary clock; age/size alone never authorizes deletion).
-- This drops an INDEX only. No table, row, column, function, policy or cron changes. tanach_verses data is untouched.
--
-- Evidence read live on 26.11.2026 (read-only):
--   idx_tv_words  : gin (words) array_ops, 9,486,336 bytes, 65 scans, no constraint, no dependent object, valid/ready/live.
--   tv_words_gin  : gin (words) array_ops, 10,887,168 bytes, 4,093 scans, declared in supabase/migrations/20260728_namelab_perf.sql.
--   idx_tv_words is NOT declared in any migration in the repo; tv_words_gin is. Keep tv_words_gin.
--   Planner baseline (EXPLAIN ANALYZE, read-only): words @> {אברהם} 4.1 ms and words @> {משה,אהרן} 4.7 ms, both
--   "Bitmap Index Scan on tv_words_gin" - the surviving index is already the one the planner picks.
-- Expected effect: -9.05 MiB on disk, one fewer GIN index to maintain on writes (tanach_verses is a near-static reference table).
-- Locks: DROP INDEX takes ACCESS EXCLUSIVE on tanach_verses for a moment; lock_timeout below makes it fail fast instead of queueing.
-- Guard: refuses to run unless both indexes are still byte-for-byte the same definition and tv_words_gin is valid.
-- Rollback: 20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql (re-creates the index; ~23K rows, seconds).
do $migration$
declare
  v_tbl constant regclass := 'public.tanach_verses'::regclass;
  v_drop oid;
  v_keep oid;
  r record;
  v_def_drop text;
  v_def_keep text;
begin
  perform set_config('lock_timeout', '3s', true);
  perform set_config('statement_timeout', '30s', true);

  select c.oid into v_drop from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'idx_tv_words' and c.relkind = 'i';
  select c.oid into v_keep from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'tv_words_gin' and c.relkind = 'i';

  if v_drop is null then
    raise notice 'idx_tv_words already absent; nothing to do';
    return;
  end if;
  if v_keep is null then
    raise exception 'refusing: the surviving index tv_words_gin does not exist';
  end if;

  -- Both must index the same table and be fully usable.
  for r in
    select c.relname, i.indrelid, i.indisvalid, i.indisready, i.indislive, i.indisunique, i.indisprimary,
           i.indisexclusion, i.indpred is not null as has_pred, i.indexprs is not null as has_expr, c.reloptions
      from pg_index i join pg_class c on c.oid = i.indexrelid
     where i.indexrelid in (v_drop, v_keep)
  loop
    if r.indrelid <> v_tbl then raise exception 'refusing: % is not on public.tanach_verses', r.relname; end if;
    if not (r.indisvalid and r.indisready and r.indislive) then
      raise exception 'refusing: % is not valid/ready/live', r.relname;
    end if;
    if r.indisunique or r.indisprimary or r.indisexclusion or r.has_pred or r.has_expr or r.reloptions is not null then
      raise exception 'refusing: % is not a plain non-unique GIN index', r.relname;
    end if;
  end loop;

  -- Same definition once the index name is removed (access method, columns, opclass, predicate, options).
  v_def_drop := regexp_replace(pg_get_indexdef(v_drop), 'INDEX \S+ ON', 'INDEX x ON');
  v_def_keep := regexp_replace(pg_get_indexdef(v_keep), 'INDEX \S+ ON', 'INDEX x ON');
  if v_def_drop is distinct from v_def_keep then
    raise exception 'refusing: definitions differ (% vs %)', v_def_drop, v_def_keep;
  end if;

  -- No constraint or other object may depend on the index being dropped.
  if exists (select 1 from pg_constraint where conindid = v_drop)
     or exists (select 1 from pg_depend d where d.refobjid = v_drop and d.deptype in ('n', 'a', 'i')) then
    raise exception 'refusing: idx_tv_words has a dependent constraint or object';
  end if;

  drop index public.idx_tv_words;

  -- Post-check: the surviving index is still there and usable.
  if not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                  where c.relname = 'tv_words_gin' and i.indisvalid and i.indisready) then
    raise exception 'post-check failed: tv_words_gin is not valid';
  end if;
end
$migration$;
