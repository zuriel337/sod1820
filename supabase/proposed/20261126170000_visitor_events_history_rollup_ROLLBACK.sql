-- Rollback of 20261126170000_visitor_events_history_rollup_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Deletes ONLY the history rows the roll-up wrote (source prefix 'visitor_events_legacy:'), then drops the function. No other traffic_history source and no
-- visitor_events row is touched. Note: after a rollback the anonymous summary is gone and the raw rows keep being deleted every night. Apply as ONE transaction.
delete from public.traffic_history where source like 'visitor_events\_legacy:%' escape '\';
drop function if exists public.refresh_visitor_events_history_v1(date, date);
