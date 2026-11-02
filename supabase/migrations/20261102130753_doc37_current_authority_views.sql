-- Recorded from the exact approved query applied by Supabase migration API.
-- Version read back from supabase_migrations.schema_migrations; no generated timestamp guessed.
-- PROPOSAL ONLY. Root must obtain/confirm shared-service authorization before apply.
-- Preserve columns, owner, ACL, existing current/history contract. No DELETE.
BEGIN;
CREATE OR REPLACE VIEW public.rules_active AS
SELECT DISTINCT ON (rule_id) rule_id AS "מזהה_חוק", rule_version AS "גרסה",
 label AS "חוק", description AS "תיאור", depends_on AS "תלוי_ב", created_at
FROM public.nodes
WHERE type='rule' AND rule_id IS NOT NULL AND is_active=true
ORDER BY rule_id,rule_version DESC;

-- Remove ONLY BEFORE claims with an explicit later parent-linked release.
-- Merely having a newer row of the same task is NOT proof of scope release.
CREATE OR REPLACE VIEW public.work_log_current AS
 WITH base AS (
         SELECT w.id,
            w.session_date,
            w.topic,
            w.numbers,
            w.what_we_did,
            w.status,
            w.open_threads,
            w.created_at,
            w.archived,
            w.superseded_by_id,
            w.task_key,
            w.from_actor,
            w.to_actor,
            w.assignment_mode,
            w.assignment_scope,
            w.primary_owner,
            w.release_authorization_state,
            w.parent_assignment_id,
            w.dispatch_kind,
            w.dispatch_state,
            w.dispatch_context,
            w.dispatch_attempts,
            w.dispatch_next_attempt_at,
            w.dispatch_lease_owner,
            w.dispatch_lease_expires_at,
            w.dispatch_last_error,
            w.dispatch_last_request_id,
            w.dispatch_last_emitted_at,
            w.dispatch_completed_at,
            w.dispatch_session_id,
            w.dispatch_session_url,
            w.dispatch_response_at,
            COALESCE(w.task_key, (regexp_match(COALESCE(w.topic, ''::text), 'task=([^ ]+)'::text))[1], split_part(COALESCE(w.topic, ''::text), ' — '::text, 1)) AS _task_scope
           FROM work_log w
          WHERE ((w.archived = false) AND (w.superseded_by_id IS NULL))
            AND NOT EXISTS (
              SELECT 1 FROM public.work_log closure
              WHERE closure.parent_assignment_id = w.id
                AND closure.created_at >= w.created_at
                AND closure.status ~ '^AFTER_.*(SCOPE_RELEASED|OWNERSHIP_RELEASED)'
                AND w.status ~ '^BEFORE'
            )
        ), recent AS (
         SELECT base.id
           FROM base
          ORDER BY base.created_at DESC
         LIMIT 100
        ), active_latest AS (
         SELECT DISTINCT ON (base._task_scope) base.id
           FROM base
          WHERE ((base.created_at >= (now() - '14 days'::interval)) AND ((COALESCE(base.status, ''::text) ~* '(CLAIMED_WRITE|WRITE_SCOPE_OPEN|BLOCKED|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'::text) OR (base.dispatch_state = ANY (ARRAY['QUEUED'::text, 'FIRE_REQUESTED'::text, 'SESSION_STARTED'::text, 'CLAIMED'::text, 'RETRY_WAIT'::text, 'DEFERRED'::text]))))
          ORDER BY base._task_scope, base.created_at DESC
        ), keep AS (
         SELECT recent.id
           FROM recent
        UNION
         SELECT active_latest.id
           FROM active_latest
        )
 SELECT b.id,
    b.session_date,
    b.topic,
    b.numbers,
    b.what_we_did,
    b.status,
    b.open_threads,
    b.created_at,
    b.archived,
    b.superseded_by_id,
    b.task_key,
    b.from_actor,
    b.to_actor,
    b.assignment_mode,
    b.assignment_scope,
    b.primary_owner,
    b.release_authorization_state,
    b.parent_assignment_id,
    b.dispatch_kind,
    b.dispatch_state,
    b.dispatch_context,
    b.dispatch_attempts,
    b.dispatch_next_attempt_at,
    b.dispatch_lease_owner,
    b.dispatch_lease_expires_at,
    b.dispatch_last_error,
    b.dispatch_last_request_id,
    b.dispatch_last_emitted_at,
    b.dispatch_completed_at,
    b.dispatch_session_id,
    b.dispatch_session_url,
    b.dispatch_response_at
   FROM (base b
     JOIN keep k USING (id))
  ORDER BY b.created_at DESC;
COMMIT;
