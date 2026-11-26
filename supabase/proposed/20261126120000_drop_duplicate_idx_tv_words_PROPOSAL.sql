-- Drop the exact duplicate GIN index public.idx_tv_words (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB). Apply as ONE transaction.
-- Package: docs/reviews/db-capacity-audit-20261126/README.md section 14 and PART3-DECISION-337.md section 4.
--
-- Owners: foundation_closure_protocol_law v8 item 94 (capacity/growth + retention/compaction rows) under
-- research_intake_foundation_contract_law v14 13.11 (age/size alone never authorizes deletion).
-- This drops an INDEX only. No table, row, column, function, policy or cron changes. tanach_verses data is untouched.
--
-- Evidence read live on 26.11.2026 (read-only):
--   idx_tv_words  : gin (words) array_ops, 9,486,336 bytes, 65 scans, no constraint, no dependent object, valid/ready/live.
--   tv_words_gin  : gin (words) array_ops, 10,887,168 bytes, 4,093 scans, declared in supabase/migrations/20260728_namelab_perf.sql.
--   idx_tv_words is NOT declared in any migration in the repo; tv_words_gin is. Keep tv_words_gin.
--   Planner baseline (EXPLAIN ANALYZE, read-only): words @> {אברהם} 4.1 ms and words @> {משה,אהרן} 4.7 ms, both
--   "Bitmap Index Scan on tv_words_gin" - the surviving index is already the one the planner picks.
-- Expected effect: -9.05 MiB on disk, one fewer GIN index to maintain on writes (tanach_verses is a near-static reference table).
--
-- STOP-AND-ALERT (26.11.2026, decision 337): the script never fails silently and never drops in an unexpected state.
-- Every refusal below (a) performs NO drop, (b) writes one 'alert' row to work_log (topic below) and calls notify_admin (guarded:
-- a notify failure does not hide the work_log row), and (c) RAISES A WARNING with the same text. The script then ends without an
-- error on purpose, so the alert row is committed; verify the outcome with the check query at the end of this file.
--   * BOTH indexes missing  -> tanach_verses.words lookups have NO index (sequential scans); alert text carries the rebuild statement.
--   * the surviving index tv_words_gin missing (idx_tv_words present) -> nothing is dropped (it would be the only index).
--   * either index invalid/not ready/not live, not on tanach_verses, unique/primary/exclusion/partial/expression, or with options.
--   * the two definitions differ, or a constraint/other object depends on idx_tv_words.
--   * lock not obtained within 3 s (lock_timeout) or any other error while dropping.
-- Only "idx_tv_words already absent and tv_words_gin valid" is a quiet no-op (NOTICE), because that is the desired end state.
-- Rollback: 20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql (re-creates the index; ~23K rows, seconds).
do $migration$
declare
  v_tbl constant regclass := 'public.tanach_verses'::regclass;
  c_topic constant text := '🚨 הסרת אינדקס כפול נעצרה (אוטומטי)';
  v_drop oid;
  v_keep oid;
  r record;
  v_def_drop text;
  v_def_keep text;
  v_stop text;
  v_keep_ok boolean;
begin
  perform set_config('lock_timeout', '3s', true);
  perform set_config('statement_timeout', '30s', true);

  select c.oid into v_drop from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'idx_tv_words' and c.relkind = 'i';
  select c.oid into v_keep from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'tv_words_gin' and c.relkind = 'i';

  -- The surviving index must exist and be usable BEFORE anything else is decided (this also covers "both missing").
  select coalesce(i.indisvalid and i.indisready and i.indislive, false) into v_keep_ok
    from pg_index i where i.indexrelid = v_keep;

  if v_drop is null and v_keep is null then
    v_stop := 'שני האינדקסים idx_tv_words ו-tv_words_gin חסרים: אין אינדקס GIN על tanach_verses.words, חיפושי words @> יסרקו את כל הטבלה. '
           || 'לא בוצעה פעולה. שחזור: create index tv_words_gin on public.tanach_verses using gin (words); (ראו supabase/migrations/20260728_namelab_perf.sql).';
  elsif v_keep is null then
    v_stop := 'tv_words_gin חסר ו-idx_tv_words הוא האינדקס היחיד על tanach_verses.words. לא נמחק דבר. '
           || 'שחזור tv_words_gin: create index tv_words_gin on public.tanach_verses using gin (words);';
  elsif not v_keep_ok then
    v_stop := 'tv_words_gin קיים אך אינו valid/ready/live. לא נמחק דבר; יש לבנות אותו מחדש לפני כל הסרה.';
  elsif v_drop is null then
    raise notice 'idx_tv_words already absent and tv_words_gin is valid; nothing to do';
    return;
  end if;

  if v_stop is null then
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
  end if;

  if v_stop is null then
    -- Same definition once the index name is removed (access method, columns, opclass, predicate, options).
    v_def_drop := regexp_replace(pg_get_indexdef(v_drop), 'INDEX \S+ ON', 'INDEX x ON');
    v_def_keep := regexp_replace(pg_get_indexdef(v_keep), 'INDEX \S+ ON', 'INDEX x ON');
    if v_def_drop is distinct from v_def_keep then
      v_stop := format('ההגדרות שונות (%s מול %s)', v_def_drop, v_def_keep);
    end if;
  end if;

  if v_stop is null
     and (exists (select 1 from pg_constraint where conindid = v_drop)
          or exists (select 1 from pg_depend d where d.refobjid = v_drop and d.deptype in ('n', 'a', 'i'))) then
    v_stop := 'idx_tv_words מחזיק constraint או אובייקט תלוי';
  end if;

  if v_stop is null then
    begin
      drop index public.idx_tv_words;
    exception when others then
      v_stop := format('ההסרה נכשלה (%s: %s). לא נשתנה דבר.', sqlstate, sqlerrm);
    end;
  end if;

  if v_stop is null and not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                                    where c.relname = 'tv_words_gin' and i.indisvalid and i.indisready) then
    -- Defensive: cannot happen unless the drop touched the wrong object; the whole transaction is rolled back by the exception.
    raise exception 'post-check failed: tv_words_gin is not valid after the drop';
  end if;

  if v_stop is not null then
    raise warning 'duplicate-index drop STOPPED: %', v_stop;
    insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
    values (current_date, c_topic,
            'הסרת האינדקס הכפול idx_tv_words נעצרה ללא שינוי: ' || v_stop,
            'alert',
            'קובץ: supabase/proposed/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql. אין פעולה אוטומטית; נדרשת בדיקה והחלטה של ZURIEL.');
    begin
      perform public.notify_admin('🚨 סוד1820 — הסרת אינדקס כפול נעצרה' || chr(10) || v_stop);
    exception when others then
      raise warning 'notify_admin failed (%); the work_log alert row is written', sqlerrm;
    end;
  end if;
end
$migration$;

-- Check query (run after applying; expected: dropped | tv_words_gin valid  -> idx_tv_words absent):
--   select exists(select 1 from pg_class where relname='idx_tv_words' and relkind='i') as idx_tv_words_present,
--          exists(select 1 from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='tv_words_gin' and i.indisvalid) as tv_words_gin_valid,
--          (select max(created_at) from public.work_log where topic='🚨 הסרת אינדקס כפול נעצרה (אוטומטי)') as last_stop_alert;
