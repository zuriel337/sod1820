-- PROPOSAL ONLY — not a migration, not applied, not under supabase/migrations.
-- HOME-UPDATES-VISUAL-20261103. Needed before the Edge sources in this branch may be deployed.
-- Existing mailing owner/table only (public.subscribers). No subscriber UPDATE/DELETE, no new table/RPC/list.
-- Historical rows (email_purposes containing 'site-openings') are untouched: their consent stays opening-only.
BEGIN;
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS site_updates_consented_at timestamptz;
ALTER TABLE public.subscribers DROP CONSTRAINT IF EXISTS subscribers_email_purposes_valid;
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_email_purposes_valid CHECK (
  cardinality(email_purposes) > 0
  AND email_purposes <@ ARRAY['general','site-openings','site-updates']::text[]
  AND (NOT (email_purposes @> ARRAY['site-openings']::text[]) OR opening_updates_consented_at IS NOT NULL)
  AND (NOT (email_purposes @> ARRAY['site-updates']::text[]) OR site_updates_consented_at IS NOT NULL)
);
-- Preserve the existing Legacy general signup while reserving both typed consent
-- envelopes for the validated existing Edge handler. This only narrows inserts.
ALTER POLICY subscribers_public_insert ON public.subscribers
  WITH CHECK (email_purposes = ARRAY['general']::text[]
    AND opening_updates_consented_at IS NULL AND site_updates_consented_at IS NULL);
COMMIT;
-- No existing consent, status, email, preference or history is updated/deleted.
