-- One-off PRIVATE archive staging in existing inbound_emails, not a new RPC/store.
-- Caller: single transaction, trusted postgres operator, reviewed private JSON in
-- sod1820.email_archive_v1. No addresses, original bodies or archive IDs in git.
-- A payload hash binds the imported MIME projection; it is NOT sender proof.
DO $archive$
DECLARE
  v_ctx jsonb := current_setting('sod1820.email_archive_v1',true)::jsonb;
  v_records jsonb;
  v_item jsonb;
  v_thread text;
  v_row public.inbound_emails%rowtype;
  v_ids bigint[];
  v_revision text;
  v_input_revision text;
  v_audit public.decision_ledger%rowtype;
  v_replay boolean;
  v_expected integer;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'trusted database operator required';
  END IF;
  v_records := v_ctx->'records';
  IF v_ctx->>'decision_ref' IS NULL OR v_ctx->>'human_decision' IS DISTINCT FROM 'approve_private_staging'
    OR jsonb_typeof(v_records) IS DISTINCT FROM 'array' OR jsonb_array_length(v_records)<>13
    OR (SELECT count(DISTINCT i->>'gmail_id') FROM jsonb_array_elements(v_records) i)<>13
    OR (SELECT count(DISTINCT i->>'message_id') FROM jsonb_array_elements(v_records) i)<>13
    OR (SELECT count(DISTINCT i->>'thread_id') FROM jsonb_array_elements(v_records) i)<>4
    OR (SELECT count(*) FROM jsonb_array_elements(v_records) i WHERE i->>'expected_id' IS NOT NULL)<>2
  THEN RAISE EXCEPTION 'reviewed four-thread private staging input required'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_records) i WHERE
    nullif(i->>'gmail_id','') IS NULL OR nullif(i->>'thread_id','') IS NULL
    OR nullif(i->>'message_id','') IS NULL OR nullif(i->>'from_email','') IS NULL
    OR nullif(i->>'payload_sha256','') IS NULL OR length(i->>'payload_sha256')<>64
    OR i->'normalized'->>'provider' IS DISTINCT FROM 'gmail'
    OR i->'normalized'->>'provider_id' IS DISTINCT FROM i->>'gmail_id'
    OR i->'normalized'->>'message_id' IS DISTINCT FROM i->>'message_id'
    OR i->'normalized'->>'admission' IS DISTINCT FROM 'archive_unverified'
    OR i->'normalized'->>'source_state' IS DISTINCT FROM 'unverified'
    OR i->'normalized'->'held' IS DISTINCT FROM 'true'::jsonb
    OR coalesce(i->'normalized'->'author','null'::jsonb)<>'null'::jsonb
    OR coalesce(i->'normalized'->'identity_proof','null'::jsonb)<>'null'::jsonb)
  THEN RAISE EXCEPTION 'archive input must not assert sender identity or admission'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('private_email_archive_v1'));
  -- Short lock prevents a concurrent legacy receipt/import with the same RFC ID.
  LOCK TABLE public.inbound_emails IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.decision_ledger IN SHARE ROW EXCLUSIVE MODE;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.inbound_emails'::regclass)
    OR has_table_privilege('anon','public.inbound_emails','SELECT')
  THEN RAISE EXCEPTION 'private inbox access boundary changed'; END IF;
  v_input_revision := md5(v_records::text);
  IF v_ctx->>'expected_input_revision' IS DISTINCT FROM v_input_revision THEN
    RAISE EXCEPTION 'reviewed input changed';
  END IF;
  SELECT count(*) INTO v_expected FROM public.decision_ledger d
    WHERE d.decision_type='email_archive_staging' AND d.provenance->>'decision_ref'=v_ctx->>'decision_ref';
  IF v_expected NOT IN (0,4) THEN RAISE EXCEPTION 'partial archive audit'; END IF;
  v_replay := v_expected=4;
  IF NOT v_replay AND (SELECT count(*) FROM public.inbound_emails)<>(v_ctx->>'expected_inbox_count')::integer THEN
    RAISE EXCEPTION 'inbox changed; fresh preflight required';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_records) LOOP
    IF v_item->>'expected_id' IS NOT NULL THEN
      SELECT * INTO v_row FROM public.inbound_emails e WHERE e.id=(v_item->>'expected_id')::bigint;
      IF NOT FOUND OR v_row.message_id IS DISTINCT FROM v_item->>'message_id'
        OR v_row.from_email IS DISTINCT FROM v_item->>'from_email'
        OR md5(to_jsonb(v_row)::text) IS DISTINCT FROM v_item->>'expected_revision'
      THEN RAISE EXCEPTION 'existing source changed; no hydration or overwrite allowed'; END IF;
    ELSIF NOT v_replay THEN
      IF EXISTS(SELECT 1 FROM public.inbound_emails e WHERE e.message_id=v_item->>'message_id'
        OR e.meta->'archive_curated_v1'->>'gmail_id'=v_item->>'gmail_id') THEN
        RAISE EXCEPTION 'archive source already present; reconcile instead of duplicate';
      END IF;
      INSERT INTO public.inbound_emails(from_email,from_name,subject,body_text,message_id,in_reply_to,received_at,meta)
      VALUES(v_item->>'from_email',v_item->>'from_name',v_item->>'subject',v_item->>'body_text',
        v_item->>'message_id',v_item->>'in_reply_to',(v_item->>'received_at')::timestamptz,
        jsonb_build_object('provider','gmail','provider_id',v_item->>'gmail_id','source_held',true,
          'source_email_v1',v_item->'normalized',
          'archive_curated_v1',jsonb_build_object('basis','admin_curated_archive_v1',
            'gmail_id',v_item->>'gmail_id','thread_id',v_item->>'thread_id',
            'payload_sha256',v_item->>'payload_sha256','hash_basis','gmail_api_mime_projection',
            'raw_sha256',null,'sender_authenticated',false),
          'intake_projection_v1',jsonb_build_object('v',1,'revision',1,'state','draft',
            'destinations',jsonb_build_array('world','nowbar','writer'),
            'scope','whole_thread','decision_ref',v_ctx->>'decision_ref','publication_ready',false)));
    END IF;
  END LOOP;
  FOR v_thread IN SELECT DISTINCT i->>'thread_id' FROM jsonb_array_elements(v_records) i LOOP
    SELECT array_agg(e.id ORDER BY e.id),md5(jsonb_agg(to_jsonb(e) ORDER BY e.id)::text)
    INTO v_ids,v_revision FROM public.inbound_emails e JOIN jsonb_array_elements(v_records) i
      ON e.message_id=i->>'message_id' WHERE i->>'thread_id'=v_thread;
    IF cardinality(v_ids)<>(SELECT count(*) FROM jsonb_array_elements(v_records) i WHERE i->>'thread_id'=v_thread)
      THEN RAISE EXCEPTION 'archive staging readback incomplete'; END IF;
    IF v_replay THEN
      SELECT * INTO v_audit FROM public.decision_ledger d WHERE d.decision_type='email_archive_staging'
        AND d.subject_ref=v_thread AND d.provenance->>'decision_ref'=v_ctx->>'decision_ref';
      IF NOT FOUND OR v_audit.status IS DISTINCT FROM 'applied'
        OR v_audit.provenance->>'input_revision' IS DISTINCT FROM v_input_revision
        OR v_audit.result_ref->>'rows_revision' IS DISTINCT FROM v_revision
      THEN RAISE EXCEPTION 'staged archive changed; replay refused'; END IF;
    ELSE
      INSERT INTO public.decision_ledger(decision_type,subject_type,subject_ref,domain,created_by_agent,
        human_decision,human_reason,decided_by,status,evidence,result_ref,provenance)
      VALUES('email_archive_staging','email_thread',v_thread,'research_intake','GPT','approve',
        'Four threads approved for Legacy; this receipt applies PRIVATE staging only. Sender/security gates remain closed.',
        'ZURIEL','applied',jsonb_build_object('basis','admin_curated_archive_v1','source_state','unverified',
          'sender_authenticated',false,'publication_ready',false,'thread_scope','whole_thread'),
        jsonb_build_object('inbound_ids',to_jsonb(v_ids),'rows_revision',v_revision,'public_admission',false),
        jsonb_build_object('decision_ref',v_ctx->>'decision_ref','input_revision',v_input_revision,
          'authorization_scope','PRIVATE_STAGING_ONLY','public_destinations',jsonb_build_array('world','nowbar','writer')));
    END IF;
  END LOOP;
END;
$archive$;
