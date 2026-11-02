-- PROPOSAL ONLY — not a migration, not applied. Generate a migration through the
-- installed Supabase CLI after review; run twice against isolated clean/existing schemas.
-- Existing mailing owner/table only. No subscriber data UPDATE/DELETE, RPC or table.
BEGIN;
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS email_purposes text[] NOT NULL DEFAULT ARRAY['general']::text[],
  ADD COLUMN IF NOT EXISTS opening_updates_consented_at timestamptz;
DO $purpose_constraint$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.subscribers'::regclass AND conname='subscribers_email_purposes_valid') THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_email_purposes_valid CHECK (
      cardinality(email_purposes)>0 AND email_purposes <@ ARRAY['general','site-openings']::text[]
      AND (NOT (email_purposes @> ARRAY['site-openings']::text[]) OR opening_updates_consented_at IS NOT NULL)
    );
  END IF;
END $purpose_constraint$;
-- Keep legacy public insert behavior, but reserve the new consent envelope for
-- the existing validated Edge handler. No new public UPDATE/SELECT grant.
ALTER POLICY subscribers_public_insert ON public.subscribers
  WITH CHECK (email_purposes = ARRAY['general']::text[] AND opening_updates_consented_at IS NULL);
COMMIT;
