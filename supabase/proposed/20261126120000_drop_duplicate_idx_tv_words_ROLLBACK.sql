-- Rollback of 20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Re-creates the dropped duplicate exactly as read live on 26.11.2026: gin (words), default array_ops, no options, no predicate.
-- tanach_verses is a ~23K-row near-static reference table, so the plain build takes seconds. CREATE INDEX blocks writes (not reads)
-- to the table while it builds; if writes must continue, run the statement in the comment below by itself, outside a transaction.
--   create index concurrently idx_tv_words on public.tanach_verses using gin (words);
-- If tv_words_gin is also missing, the index is still re-created (a sole index is better than none) and a NOTICE says so;
-- rebuild tv_words_gin from supabase/migrations/20260728_namelab_perf.sql afterwards.
do $rollback$
begin
  perform set_config('lock_timeout', '3s', true);
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname = 'idx_tv_words') then
    raise notice 'idx_tv_words already exists; nothing to do';
    return;
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'tv_words_gin') then
    raise notice 'tv_words_gin is also missing: idx_tv_words is re-created as the only words index; rebuild tv_words_gin per 20260728_namelab_perf.sql';
  end if;
  create index idx_tv_words on public.tanach_verses using gin (words);
end
$rollback$;
