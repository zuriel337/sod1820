-- NEWSLETTER_PIPELINE_LIVE_DRIFT_CLOSURE_V1
-- Human-Gate ZURIEL 2026-09-07.
-- newsletter_sends is server-owned operational delivery state.
-- RLS does not protect TRUNCATE, and public clients do not need REFERENCES/TRIGGER either.
-- Preserve table/data/history; remove only unnecessary table-level capabilities.

revoke truncate, references, trigger on table public.newsletter_sends from anon;
revoke truncate, references, trigger on table public.newsletter_sends from authenticated;
