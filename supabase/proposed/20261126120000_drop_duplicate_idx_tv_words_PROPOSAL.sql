-- Drop the exact duplicate GIN index public.idx_tv_words (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB), as ONE transaction (apply_migration), AFTER a
-- clean run of 20261126120000_drop_duplicate_idx_tv_words_PRECHECK.sql. Package: docs/reviews/db-capacity-audit-20261126/APPROVAL-REQUESTS-20261126.md.
--
-- Owners: foundation_closure_protocol_law v8 item 94 (capacity/growth + retention/compaction rows) under research_intake_foundation_contract_law v14
-- 13.11 (age/size alone never authorizes deletion). This drops an INDEX only: no table, row, column, function, policy or cron changes.
-- Evidence read live on 26.11.2026 (read-only):
--   idx_tv_words  : gin (words) array_ops, 9,486,336 bytes, 65 scans, no constraint, no dependent object, valid/ready/live.
--   tv_words_gin  : gin (words) array_ops, 10,887,168 bytes, 4,093 scans, declared in supabase/migrations/20260728_namelab_perf.sql.
--   idx_tv_words is NOT declared in any migration in the repo; tv_words_gin is. Keep tv_words_gin.
--   Planner baseline (EXPLAIN ANALYZE, read-only): words @> {אברהם} 4.1 ms and words @> {משה,אהרן} 4.7 ms, both
--   "Bitmap Index Scan on tv_words_gin" - the surviving index is already the one the planner picks. Expected effect: -9.05 MiB.
--
-- FAILURE IS NEVER SUCCESS (decision 337): in EVERY unexpected state this file RAISES (SQLSTATE P0001), so the transaction aborts, nothing is
-- dropped and a migration runner does NOT record it as applied. The unexpected states: BOTH indexes missing; tv_words_gin missing or
-- invalid; either index invalid, on another table, unique/primary/exclusion/partial/expression, or with options; the definitions differ; a
-- constraint or other object depends on idx_tv_words; the lock is not obtained within 3 s; any other error while dropping. The only quiet
-- success is the desired end state: idx_tv_words absent and tv_words_gin valid.
-- Rollback: 20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql (re-creates the index; ~23K rows, seconds).
do $migration$
declare
  v_tbl constant regclass := 'public.tanach_verses'::regclass;
  c_topic constant text := '🚨 הסרת אינדקס כפול נעצרה (אוטומטי)';
  v_drop oid; v_keep oid; r record; v_def_drop text; v_def_keep text;
  v_stop text; v_keep_ok boolean; v_done boolean := false;
begin
  perform set_config('lock_timeout', '3s', true);
  perform set_config('statement_timeout', '30s', true);

  select c.oid into v_drop from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'idx_tv_words' and c.relkind = 'i';
  select c.oid into v_keep from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'tv_words_gin' and c.relkind = 'i';
  select coalesce(i.indisvalid and i.indisready and i.indislive, false) into v_keep_ok from pg_index i where i.indexrelid = v_keep;

  if v_drop is null and v_keep is null then
    v_stop := 'שני האינדקסים idx_tv_words ו-tv_words_gin חסרים: אין אינדקס GIN על tanach_verses.words, חיפושי words @> יסרקו את כל הטבלה. '
           || 'שחזור: create index tv_words_gin on public.tanach_verses using gin (words); (ראו supabase/migrations/20260728_namelab_perf.sql).';
  elsif v_keep is null then
    v_stop := 'tv_words_gin חסר ו-idx_tv_words הוא האינדקס היחיד על tanach_verses.words. שחזור tv_words_gin: create index tv_words_gin on public.tanach_verses using gin (words);';
  elsif not v_keep_ok then
    v_stop := 'tv_words_gin קיים אך אינו valid/ready/live; יש לבנות אותו מחדש לפני כל הסרה.';
  elsif v_drop is null then
    v_done := true;
  end if;

  if v_stop is null and not v_done then
    for r in
      select c.relname, i.indrelid, i.indisvalid, i.indisready, i.indislive, i.indisunique, i.indisprimary,
             i.indisexclusion, i.indpred is not null as has_pred, i.indexprs is not null as has_expr, c.reloptions
        from pg_index i join pg_class c on c.oid = i.indexrelid
       where i.indexrelid in (v_drop, v_keep)
    loop
      if r.indrelid <> v_tbl then v_stop := format('%s אינו על public.tanach_verses', r.relname); exit; end if;
      if not (r.indisvalid and r.indisready and r.indislive) then v_stop := format('%s אינו valid/ready/live', r.relname); exit; end if;
      if r.indisunique or r.indisprimary or r.indisexclusion or r.has_pred or r.has_expr or r.reloptions is not null then
        v_stop := format('%s אינו אינדקס GIN רגיל (ייחודי/חלקי/עם ביטוי/עם אפשרויות)', r.relname); exit;
      end if;
    end loop;
    if v_stop is null then
      -- Same definition once the index name is removed (access method, columns, opclass, predicate, options).
      v_def_drop := regexp_replace(pg_get_indexdef(v_drop), 'INDEX \S+ ON', 'INDEX x ON');
      v_def_keep := regexp_replace(pg_get_indexdef(v_keep), 'INDEX \S+ ON', 'INDEX x ON');
      if v_def_drop is distinct from v_def_keep then v_stop := format('ההגדרות שונות (%s מול %s)', v_def_drop, v_def_keep); end if;
    end if;
    if v_stop is null and (exists (select 1 from pg_constraint where conindid = v_drop)
          or exists (select 1 from pg_depend d where d.refobjid = v_drop and d.deptype in ('n', 'a', 'i'))) then
      v_stop := 'idx_tv_words מחזיק constraint או אובייקט תלוי';
    end if;
  end if;

  if v_done then raise notice 'idx_tv_words already absent and tv_words_gin is valid; nothing to do'; return; end if;
  if v_stop is not null then
    -- A STOP is a FAILURE: the exception aborts the transaction, so a migration runner never records this file as applied.
    raise exception 'duplicate-index drop STOPPED, nothing changed: %', v_stop using errcode = 'P0001';
  end if;

  drop index public.idx_tv_words;   -- any error here (lock timeout, ...) also aborts: failure, never success

  if not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                  where c.relname = 'tv_words_gin' and i.indisvalid and i.indisready) then
    raise exception 'post-check failed: tv_words_gin is not valid after the drop';
  end if;
end
$migration$;

-- Check query (run after applying; expected: idx_tv_words_present=false, tv_words_gin_valid=true):
--   select exists(select 1 from pg_class where relname='idx_tv_words' and relkind='i') as idx_tv_words_present,
--          exists(select 1 from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='tv_words_gin' and i.indisvalid) as tv_words_gin_valid;
