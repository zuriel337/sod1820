-- ROLLBACK of 20261124230000_group_reply_proof_v2 (REVIEW ONLY). Removes v2 only; v1 and every proof row stay as they are.
-- Deploy the previous wa-channel-ingest first (it calls v2 for replies), then run this.
DROP FUNCTION IF EXISTS public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text);
