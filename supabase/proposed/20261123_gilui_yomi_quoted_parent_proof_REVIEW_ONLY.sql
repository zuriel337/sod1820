-- REVIEW ONLY, NOT APPLIED. #1514 source-proof extension (no new store).
-- Required ordering: first approved migration, then exact Edge worker SHA,
-- then independent security/read-back. This SQL does not publish any source.
BEGIN;
ALTER TABLE public.channel_update_group_proof
  ADD COLUMN IF NOT EXISTS quoted_parent_ext_msg_id text;
ALTER TABLE public.channel_update_group_proof
  DROP CONSTRAINT IF EXISTS channel_update_group_proof_quoted_parent_id_check;
ALTER TABLE public.channel_update_group_proof
  ADD CONSTRAINT channel_update_group_proof_quoted_parent_id_check
  CHECK (quoted_parent_ext_msg_id IS NULL OR
     quoted_parent_ext_msg_id ~ '^[A-Za-z0-9_-]{16,128}$');
COMMENT ON COLUMN public.channel_update_group_proof.quoted_parent_ext_msg_id
  IS 'Green API stanzaId of quoted parent (private source provenance only). Never a public approval or inferred parent. Only gilui-yomi ingest writes it for new events.';
-- Existing RLS, grants, public readers, sender proof, hold and editorial status
-- remain unchanged. No historical backfill and no existing rows modified.
COMMIT;
