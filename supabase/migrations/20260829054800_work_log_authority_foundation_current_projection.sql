-- WORK_LOG HISTORICAL AUTHORITY FOUNDATION FIX
--
-- Problem (per work_log/CLAUDE.md audit): work_log already distinguishes
-- archived (boolean) from everything else, but has no structured way to say
-- "this row's content was superseded by a later row" -- so raw retrieval
-- (get_work_log() / `select * from work_log order by created_at desc`) mixes
-- current operational instructions with old/replaced ones, newest-first,
-- with no authority signal. Agents bootstrapping from CLAUDE.md's raw SELECT
-- instruction have no way to tell CURRENT from SUPERSEDED from ARCHIVED.
--
-- Fix: add one nullable self-referencing FK (superseded_by_id) and one
-- canonical CURRENT projection (view + matching SECURITY DEFINER RPC,
-- mirroring the existing get_work_log() grant pattern). Historical retrieval
-- stays get_work_log() (unchanged body -- SETOF work_log already returns the
-- new column) and work_log_view (extended to expose it). No rows are
-- deleted, archived, or reclassified by this migration -- supersede, don't
-- erase. No historical reconciliation is performed here (separate task).
--
-- Semantics (NOT synonyms):
--   CURRENT     = archived = false AND superseded_by_id IS NULL
--   SUPERSEDED  = superseded_by_id IS NOT NULL
--   ARCHIVED    = archived = true
-- A row can be both archived AND superseded; work_log_current excludes it
-- either way. Historical retrieval (get_work_log/work_log_view) always
-- returns every row regardless of lifecycle state.

alter table public.work_log
  add column if not exists superseded_by_id uuid null references public.work_log(id) on delete set null,
  add constraint work_log_no_self_supersede check (superseded_by_id is null or superseded_by_id <> id);

comment on column public.work_log.superseded_by_id is
  'Structured lifecycle: points to the work_log row that supersedes this one. NULL = not superseded. Distinct from archived (a superseded row need not be archived, and vice versa). Set manually by an agent/admin documenting an explicit supersession -- never auto-inferred by age.';

-- Supports the CURRENT projection filter and reverse lookup (find what a row was superseded by).
create index if not exists idx_work_log_superseded_by_id on public.work_log(superseded_by_id) where superseded_by_id is not null;
create index if not exists idx_work_log_current on public.work_log(created_at desc) where archived = false and superseded_by_id is null;

-- Canonical CURRENT operational projection. Excludes archived and superseded rows.
-- This is what agent bootstrap must read for "what applies right now" -- never raw work_log.
create or replace view public.work_log_current as
  select id, session_date, topic, numbers, what_we_did, status, open_threads, created_at, archived, superseded_by_id
  from public.work_log
  where archived = false and superseded_by_id is null
  order by created_at desc;

comment on view public.work_log_current is
  'Canonical Current Work Projection for operational agent bootstrap. CURRENT = archived=false AND superseded_by_id IS NULL. Never a second source of truth over Master State/Roadmap/live DB -- purely a lifecycle filter over work_log. For full history (including archived/superseded rows) use get_work_log() or query work_log directly with lifecycle awareness.';

-- RLS-safe RPC mirroring the existing get_work_log() security/grant pattern, scoped to CURRENT rows only.
create or replace function public.get_work_log_current()
returns setof public.work_log
language sql
security definer
set search_path to 'public'
as $function$
  select * from public.work_log_current;
$function$;

comment on function public.get_work_log_current() is
  'Canonical Current Work Projection RPC for agent/operational bootstrap. Returns only archived=false AND superseded_by_id IS NULL rows, newest first. For explicit historical/audit retrieval (all rows, including archived+superseded) use get_work_log() instead -- that surface is intentionally unchanged.';

revoke all on function public.get_work_log_current() from public;
grant execute on function public.get_work_log_current() to anon, authenticated, postgres, service_role;

-- Historical retrieval convenience view: extend to expose lifecycle metadata explicitly
-- (archived, superseded_by_id) so a human/agent reading it can see WHY a row is or isn't
-- current, without needing a second query. New columns must append at the end -- Postgres
-- forbids reordering/inserting columns into an existing view via CREATE OR REPLACE.
-- get_work_log() itself needs no change: it already returns SETOF work_log, which now
-- includes superseded_by_id automatically.
create or replace view public.work_log_view as
  select id,
         session_date,
         topic,
         what_we_did,
         status,
         open_threads,
         (created_at at time zone 'Asia/Jerusalem') as created_at_il,
         archived,
         superseded_by_id
  from public.work_log
  order by created_at desc;
