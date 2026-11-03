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
-- subscribers_public_insert already requires email_purposes = {general} and no consent timestamp; the new
-- consent envelope is written only by the validated newsletter-signup Edge handler (service role). Unchanged.
COMMIT;
-- Verify afterwards (read-only): constraint definition; zero rows changed; policy definition unchanged.
