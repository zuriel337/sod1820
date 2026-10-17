-- SOD1820 v17 — owner-route atomic single-take / single-consume ledger (DESIGN DRAFT)
-- Assignment 799794f9-926a-447f-b294-1ab1fe650b24 · task SOD1820_OWNER_ROUTE_ATOMIC_LEDGER_DRAFT_20261017
--
-- STATE: BRANCH-ONLY DRAFT. Deliberately NOT under supabase/migrations. NOT applied to any hosted
-- database. Applying to Production needs a separate reviewed migration and ZURIEL Human Gate.
-- Tested only against a scratch PostgreSQL (scripts/test-agent-owner-route-atomic-ledger-v17.mjs).
--
-- DESIGN: no new table, no new dispatcher. A route record is one narrowly scoped row on the EXISTING
-- public.work_log, identified by task_key = 'OWNER_ROUTE:' || <64-hex route idempotency key>.
--   * to_actor = 'ZURIEL', dispatch_kind = NULL, dispatch_state = NULL (passive; v17 reporting model)
--   * status in OWNER_ROUTE_{RESERVED,SENT,CONSUMED,DENIED,SEND_UNKNOWN}; none matches
--     QUEUED|ASSIGNED|ACK_REQUIRED|WAITING_SPECIALIST|READ_ONLY|SPECIALIST|CHALLENGE|*_WRITE*, so
--     trg_work_log_dispatch_prepare never turns a route row into an assignment and the AFTER
--     triggers never call agent_dispatch_emit / agent_dispatch_emit_gpt.
--   * RESERVED means "TAKEN": the single take of the route key happened; nothing was sent yet.
--   * unique indexes: route key, ack nonce hash, external receipt id (all partial, route rows only).
--   * the nonce is stored only as sha256 hex; the plaintext is returned once by owner_route_take.
--   * dispatch_context is user-writable JSON in general, so route rows are write-protected by a
--     BEFORE trigger: only the SECURITY DEFINER functions below (running as their owner) may
--     insert/update route rows; DELETE of route rows is always refused (append-only ledger).
--
-- WHAT THE DATABASE CANNOT PROVE (kept fail-closed, NOT claimed here):
--   * that the caller is really the Claude owner session, or that a receipt id is provider-signed.
--     The trusted JS adapter (separate rollout HOLD) must authenticate those and only then call
--     owner_ack_consume. The DB gives atomicity, uniqueness, expiry and replay-rejection only.
--   * the owner/role that applies this draft (Supabase: postgres) can still write route rows
--     directly; only non-owner roles (service_role, authenticated, anon, admin-policy users) are blocked.
--   * TRUNCATE of work_log is not intercepted.

DO $guard$
BEGIN
  IF coalesce(current_setting('owner_route.draft_apply_ack', true), '') <> 'SCRATCH_ONLY_NOT_PRODUCTION' THEN
    RAISE EXCEPTION 'OWNER_ROUTE_DRAFT_NOT_AUTHORIZED_FOR_APPLY: scratch/disposable database only';
  END IF;
  IF to_regclass('public.work_log') IS NULL THEN
    RAISE EXCEPTION 'OWNER_ROUTE_DRAFT_PRECONDITION: public.work_log missing';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema='public' AND table_name='work_log'
         AND column_name IN ('id','topic','status','task_key','from_actor','to_actor','what_we_did',
                             'dispatch_kind','dispatch_state','dispatch_context','created_at')) <> 11 THEN
    RAISE EXCEPTION 'OWNER_ROUTE_DRAFT_PRECONDITION: work_log column drift';
  END IF;
  IF to_regprocedure('public.work_log_gpt_delivery_stop_v17()') IS NULL THEN
    RAISE EXCEPTION 'OWNER_ROUTE_DRAFT_PRECONDITION: v17 GPT delivery guard missing';
  END IF;
END
$guard$;

-- ---------------------------------------------------------------- unique indexes (route rows only)
CREATE UNIQUE INDEX IF NOT EXISTS work_log_owner_route_key_uidx
  ON public.work_log (task_key) WHERE left(task_key, 12) = 'OWNER_ROUTE:';
CREATE UNIQUE INDEX IF NOT EXISTS work_log_owner_route_nonce_uidx
  ON public.work_log ((dispatch_context ->> 'ack_nonce_sha256')) WHERE left(task_key, 12) = 'OWNER_ROUTE:';
CREATE UNIQUE INDEX IF NOT EXISTS work_log_owner_route_receipt_uidx
  ON public.work_log ((dispatch_context ->> 'receipt_id'))
  WHERE left(task_key, 12) = 'OWNER_ROUTE:' AND (dispatch_context ->> 'receipt_id') IS NOT NULL;

-- ---------------------------------------------------------------- unpredictable nonce source
CREATE OR REPLACE FUNCTION public.owner_route_new_nonce() RETURNS text
LANGUAGE sql VOLATILE SET search_path = pg_catalog, pg_temp AS $$
  SELECT replace(pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text, '-', '')
$$;

-- ---------------------------------------------------------------- take: atomic, single, no retry
CREATE OR REPLACE FUNCTION public.owner_route_take(
  p_route_key text, p_claim_id text, p_session_id text, p_task_key text,
  p_approval_id text, p_head text, p_ttl_seconds integer DEFAULT 900)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_nonce text; v_id uuid; v_now timestamptz := clock_timestamp(); v_exp timestamptz; v_status text;
BEGIN
  IF p_route_key IS NULL OR p_route_key !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('taken', false, 'reason', 'INVALID_ROUTE_KEY');
  END IF;
  IF p_claim_id IS NULL OR p_claim_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_task_key IS NULL OR p_task_key !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_approval_id IS NULL OR p_approval_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_head IS NULL OR p_head !~ '^[0-9a-f]{40}$' THEN
    RETURN jsonb_build_object('taken', false, 'reason', 'INVALID_ROUTE_FIELDS');
  END IF;
  IF p_ttl_seconds IS NULL OR p_ttl_seconds < 30 OR p_ttl_seconds > 3600 THEN
    RETURN jsonb_build_object('taken', false, 'reason', 'INVALID_TTL');
  END IF;
  v_nonce := public.owner_route_new_nonce();
  v_exp := v_now + make_interval(secs => p_ttl_seconds);
  BEGIN
    INSERT INTO public.work_log (topic, status, task_key, from_actor, to_actor, what_we_did, dispatch_context)
    VALUES ('OWNER_ROUTE v17 route record', 'OWNER_ROUTE_RESERVED', 'OWNER_ROUTE:' || p_route_key,
            'COORDINATION', 'ZURIEL',
            'Passive route reservation. No message is sent by this record; no retry after DENIED or UNKNOWN.',
            jsonb_build_object(
              'owner_route_v', 1, 'claim_id', p_claim_id, 'session_id', p_session_id,
              'route_task_key', p_task_key, 'approval_id', p_approval_id, 'expected_head', p_head,
              'ack_nonce_sha256', encode(sha256(convert_to(v_nonce, 'UTF8')), 'hex'),
              'reserved_at', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
              'expires_at', to_char(v_exp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
              'no_auto_retry', true))
    ON CONFLICT (task_key) WHERE left(task_key, 12) = 'OWNER_ROUTE:' DO NOTHING
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('taken', false, 'reason', 'ACK_NONCE_COLLISION');
  END;
  IF v_id IS NULL THEN
    SELECT w.status INTO v_status FROM public.work_log w WHERE w.task_key = 'OWNER_ROUTE:' || p_route_key;
    RETURN jsonb_build_object('taken', false, 'reason', 'ROUTE_ALREADY_TAKEN', 'status', v_status);
  END IF;
  RETURN jsonb_build_object('taken', true, 'id', v_id, 'status', 'OWNER_ROUTE_RESERVED',
                            'ack_nonce', v_nonce, 'expires_at', v_exp);
END
$$;

-- ---------------------------------------------------------------- record the single send outcome
-- ACCEPTED only after the provider accepted the send. DENIED / UNKNOWN are terminal: never retried.
CREATE OR REPLACE FUNCTION public.owner_route_record_send(
  p_route_key text, p_outcome text, p_provider_ref text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_row public.work_log%ROWTYPE; v_new text; v_id uuid;
BEGIN
  IF p_route_key IS NULL OR p_route_key !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'INVALID_ROUTE_KEY');
  END IF;
  IF p_outcome NOT IN ('ACCEPTED', 'DENIED', 'UNKNOWN') THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'INVALID_OUTCOME');
  END IF;
  IF p_outcome = 'ACCEPTED' AND (p_provider_ref IS NULL OR p_provider_ref !~ '^[A-Za-z0-9_.:-]{1,200}$') THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'PROVIDER_REF_REQUIRED');
  END IF;
  v_new := CASE p_outcome WHEN 'ACCEPTED' THEN 'OWNER_ROUTE_SENT'
                          WHEN 'DENIED' THEN 'OWNER_ROUTE_DENIED' ELSE 'OWNER_ROUTE_SEND_UNKNOWN' END;
  UPDATE public.work_log w
     SET status = v_new,
         dispatch_context = w.dispatch_context || jsonb_build_object(
           'send_outcome', p_outcome,
           'provider_ref', CASE WHEN p_outcome = 'ACCEPTED' THEN p_provider_ref END,
           'sent_recorded_at', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
   WHERE w.task_key = 'OWNER_ROUTE:' || p_route_key
     AND w.status = 'OWNER_ROUTE_RESERVED'
     AND (p_outcome <> 'ACCEPTED' OR clock_timestamp() < (w.dispatch_context ->> 'expires_at')::timestamptz)
  RETURNING w.id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('recorded', true, 'status', v_new);
  END IF;
  SELECT * INTO v_row FROM public.work_log w WHERE w.task_key = 'OWNER_ROUTE:' || p_route_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('recorded', false, 'reason', 'ROUTE_NOT_FOUND'); END IF;
  IF v_row.status = 'OWNER_ROUTE_RESERVED' THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'SEND_AFTER_EXPIRY');
  END IF;
  RETURN jsonb_build_object('recorded', false, 'reason', 'SEND_ALREADY_RECORDED', 'status', v_row.status);
END
$$;

-- ---------------------------------------------------------------- ACK consume: one conditional UPDATE
-- p_receipt_id / p_receipt_at must be authenticated by the trusted provider adapter BEFORE this call;
-- the database only enforces shape, window, nonce, claim/session match, state, expiry and uniqueness.
CREATE OR REPLACE FUNCTION public.owner_ack_consume(
  p_route_key text, p_nonce text, p_claim_id text, p_session_id text,
  p_receipt_id text, p_receipt_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_id uuid; v_row public.work_log%ROWTYPE; v_hash text; v_now timestamptz;
BEGIN
  IF p_route_key IS NULL OR p_route_key !~ '^[0-9a-f]{64}$'
     OR p_nonce IS NULL OR p_nonce !~ '^[0-9a-f]{64}$'
     OR p_claim_id IS NULL OR p_claim_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
     OR p_receipt_id IS NULL OR p_receipt_id !~ '^[A-Za-z0-9_.:-]{8,200}$'
     OR p_receipt_at IS NULL THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'INVALID_ACK_FIELDS');
  END IF;
  v_hash := encode(sha256(convert_to(p_nonce, 'UTF8')), 'hex');
  BEGIN
    UPDATE public.work_log w
       SET status = 'OWNER_ROUTE_CONSUMED',
           dispatch_context = w.dispatch_context || jsonb_build_object(
             'receipt_id', p_receipt_id,
             'receipt_at', to_char(p_receipt_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
             'consumed_at', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
     WHERE w.task_key = 'OWNER_ROUTE:' || p_route_key
       AND w.status = 'OWNER_ROUTE_SENT'
       AND w.dispatch_context ->> 'ack_nonce_sha256' = v_hash
       AND w.dispatch_context ->> 'claim_id' = p_claim_id
       AND w.dispatch_context ->> 'session_id' = p_session_id
       AND clock_timestamp() < (w.dispatch_context ->> 'expires_at')::timestamptz
       AND p_receipt_at >= (w.dispatch_context ->> 'reserved_at')::timestamptz
       AND p_receipt_at <= (w.dispatch_context ->> 'expires_at')::timestamptz
    RETURNING w.id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'RECEIPT_REPLAY');
  END;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('consumed', true, 'id', v_id);
  END IF;
  -- diagnosis only (the UPDATE above is the sole authority)
  SELECT * INTO v_row FROM public.work_log w WHERE w.task_key = 'OWNER_ROUTE:' || p_route_key;
  v_now := clock_timestamp();
  IF NOT FOUND THEN RETURN jsonb_build_object('consumed', false, 'reason', 'ROUTE_NOT_FOUND'); END IF;
  IF v_row.status = 'OWNER_ROUTE_RESERVED' THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'ACK_BEFORE_SENT'); END IF;
  IF v_row.status = 'OWNER_ROUTE_CONSUMED' THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'ACK_REPLAY_REJECTED'); END IF;
  IF v_row.status <> 'OWNER_ROUTE_SENT' THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'ROUTE_NOT_SENT', 'status', v_row.status); END IF;
  IF v_row.dispatch_context ->> 'claim_id' <> p_claim_id THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'WRONG_CLAIM'); END IF;
  IF v_row.dispatch_context ->> 'session_id' <> p_session_id THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'WRONG_SESSION'); END IF;
  IF v_row.dispatch_context ->> 'ack_nonce_sha256' <> v_hash THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'WRONG_NONCE'); END IF;
  IF v_now >= (v_row.dispatch_context ->> 'expires_at')::timestamptz THEN
    RETURN jsonb_build_object('consumed', false, 'reason', 'REQUEST_EXPIRED'); END IF;
  RETURN jsonb_build_object('consumed', false, 'reason', 'RECEIPT_OUT_OF_WINDOW');
END
$$;

-- ---------------------------------------------------------------- write guard (fail closed)
-- Route rows (task_key prefix) may be written only while current_user is the owner of
-- owner_route_take, i.e. inside the SECURITY DEFINER functions. Invariants apply to everyone.
-- Name sorts after trg_work_log_dispatch_prepare and before trg_work_log_zz_gpt_delivery_stop_v17.
CREATE OR REPLACE FUNCTION public.owner_route_write_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_old boolean := false; v_new boolean := false; v_owner name;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN v_old := coalesce(left(OLD.task_key, 12) = 'OWNER_ROUTE:', false); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN v_new := coalesce(left(NEW.task_key, 12) = 'OWNER_ROUTE:', false); END IF;
  IF NOT (v_old OR v_new) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'OWNER_ROUTE_ROW_DELETE_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.pg_get_userbyid(p.proowner) INTO v_owner FROM pg_catalog.pg_proc p
   WHERE p.oid = pg_catalog.to_regprocedure('public.owner_route_take(text,text,text,text,text,text,integer)');
  IF v_owner IS NULL OR current_user::name <> v_owner THEN
    RAISE EXCEPTION 'OWNER_ROUTE_ROW_WRITE_DENIED: route rows are written only by owner_route_* functions'
      USING ERRCODE = '42501';
  END IF;
  IF v_new AND (NEW.to_actor IS DISTINCT FROM 'ZURIEL' OR NEW.dispatch_kind IS NOT NULL
                OR NEW.dispatch_state IS NOT NULL
                OR NEW.status IS NULL
                OR NEW.status !~ '^OWNER_ROUTE_(RESERVED|SENT|CONSUMED|DENIED|SEND_UNKNOWN)$') THEN
    RAISE EXCEPTION 'OWNER_ROUTE_ROW_INVARIANT: passive ZURIEL record, null dispatch fields, allowed status only'
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND v_old AND (NEW.task_key IS DISTINCT FROM OLD.task_key) THEN
    RAISE EXCEPTION 'OWNER_ROUTE_ROW_INVARIANT: task_key immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_work_log_zy_owner_route_guard ON public.work_log;
CREATE TRIGGER trg_work_log_zy_owner_route_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.work_log
  FOR EACH ROW EXECUTE FUNCTION public.owner_route_write_guard();

-- ---------------------------------------------------------------- grants (least privilege)
REVOKE ALL ON FUNCTION public.owner_route_new_nonce() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_route_write_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_route_take(text,text,text,text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_route_record_send(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_ack_consume(text,text,text,text,text,timestamptz) FROM PUBLIC;
DO $grants$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.owner_route_new_nonce() FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.owner_route_write_guard() FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.owner_route_take(text,text,text,text,text,text,integer) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.owner_route_record_send(text,text,text) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.owner_ack_consume(text,text,text,text,text,timestamptz) FROM %I', r);
    END IF;
  END LOOP;
  -- service_role is the pre-existing coordination service role (also used by the v16 transport
  -- functions). Holding it proves a backend key, NOT an authenticated owner session.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.owner_route_take(text,text,text,text,text,text,integer) TO service_role;
    GRANT EXECUTE ON FUNCTION public.owner_route_record_send(text,text,text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.owner_ack_consume(text,text,text,text,text,timestamptz) TO service_role;
  END IF;
END
$grants$;
