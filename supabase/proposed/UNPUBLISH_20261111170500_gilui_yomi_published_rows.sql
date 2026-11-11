-- UNPUBLISH — takes out of public view the «הגילוי היומי» rows published by the activation. Separate ZURIEL approval.
-- Scope is exact: channel gilui-yomi, published by the ingest (source auto/ai), created at or after the recorded activation moment.
-- Manual admin posts (source = admin, e.g. 6.11.2026) and everything from before the activation are not touched.
-- status -> hidden: the row leaves every public reader (RLS cu_public_read admits only live rows); the existing trigger
-- guard_group_source_status_hold_v1 also clears group_source_intake_public. pinned_until is cleared. Nothing is deleted.
-- Run in ONE session/call, first naming the recorded moment (work_log / the activation output):
--   set sod.gilui_activated_at = '2026-11-12 08:00:00+00';
-- Without it the block stops and changes nothing. Run it before the schema rollback (it clears pinned_until).

do $$
declare
  v_from timestamptz := nullif(current_setting('sod.gilui_activated_at', true), '')::timestamptz;
  v_n integer;
begin
  if v_from is null then raise exception 'set sod.gilui_activated_at to the recorded activation moment first'; end if;
  update public.channel_updates
     set status = 'hidden', pinned_until = null
   where channel = 'gilui-yomi' and status = 'live' and source in ('auto', 'ai') and created_at >= v_from;
  get diagnostics v_n = row_count;
  raise notice 'gilui-yomi rows taken out of public view: %', v_n;
end $$;
