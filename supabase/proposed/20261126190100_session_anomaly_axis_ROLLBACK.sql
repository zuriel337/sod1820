-- Rollback of 20261126190100_session_anomaly_axis_PROPOSAL.sql. Fails (RAISES) if another function depends on it, so a dependent proposal is never broken silently.
drop function if exists public.fn_ti_session_anomaly_v1(date, date);
