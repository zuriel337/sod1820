-- PRECHECK for the duplicate-index drop (PROPOSAL, NOT APPLIED). Run it BEFORE 20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql.
-- It changes NOTHING. In every state it ends without an error. If the state is not exactly "both indexes present, identical and valid" (or
-- already dropped with a valid keeper), it writes ONE 'alert' row to work_log and calls notify_admin (guarded), and prints a WARNING that
-- says what is wrong (including BOTH indexes missing, with the rebuild statement). Run it with execute_sql (it is not a migration).
-- Why two files (decision 337): an alert row cannot survive an exception in the same transaction, and a migration that "stops quietly"
-- is recorded as APPLIED by a migration runner. So the alert lives here (committed), and the drop file RAISES on every non-OK state
-- (so it can never be recorded as applied).
-- Evidence read live on 26.11.2026 (read-only):
--   idx_tv_words  : gin (words) array_ops, 9,486,336 bytes, 65 scans, no constraint, no dependent object, valid/ready/live.
--   tv_words_gin  : gin (words) array_ops, 10,887,168 bytes, 4,093 scans, declared in supabase/migrations/20260728_namelab_perf.sql.
--   idx_tv_words is NOT declared in any migration in the repo; tv_words_gin is. Keep tv_words_gin.
--   Planner baseline (EXPLAIN ANALYZE, read-only): words @> {אברהם} 4.1 ms and words @> {משה,אהרן} 4.7 ms, both
--   "Bitmap Index Scan on tv_words_gin" - the surviving index is already the one the planner picks. Expected effect: -9.05 MiB.
do $precheck$
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

  if v_done then raise notice 'PRECHECK OK: idx_tv_words is already absent and tv_words_gin is valid; nothing to drop'; return; end if;
  if v_stop is null then raise notice 'PRECHECK OK: both indexes present, identical and valid; the drop file may be applied'; return; end if;

  raise warning 'PRECHECK STOP: %', v_stop;
  insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
  values (current_date, c_topic, 'בדיקת-טרום להסרת idx_tv_words: ' || v_stop || ' לא בוצע שינוי. קובץ ההסרה ייכשל במצב הזה (לא יירשם כמיגרציה שהוחלה).',
          'alert', 'קבצים: supabase/proposed/20261126120000_drop_duplicate_idx_tv_words_{PRECHECK,PROPOSAL}.sql. אין פעולה אוטומטית; נדרשת בדיקה והחלטה של ZURIEL.');
  begin
    perform public.notify_admin('🚨 סוד1820 — בדיקת-טרום להסרת אינדקס כפול נעצרה' || chr(10) || v_stop);
  exception when others then
    raise warning 'notify_admin failed (%); the work_log alert row is written', sqlerrm;
  end;
end
$precheck$;
