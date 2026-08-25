-- SOD1820 Research Intake — STEP 0: Git↔Live reconciliation baseline
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: RESEARCH_INTAKE_STEP0_STEP1A (per Zuriel instruction, "Writing" turn)
--
-- Purpose: make a fresh environment reproducible from git migrations, per live_state_sync_law.
-- This file mirrors schema state ALREADY LIVE in Supabase (project linswmnnkjxvweumprav) for
-- public.research_objects and public.decision_ledger — the two tables admin_research_review
-- reads/writes and the ones STEP 1A (next migration) extends the function to write to.
--
-- Drift found (READ-ONLY verification performed before writing this file, not from memory):
--   - grep across supabase/migrations/*.sql for `create table` matching research_objects,
--     decision_ledger, public.nodes, public.edges found ZERO hits. These tables/their columns,
--     constraints and indexes exist live (confirmed via live introspection: information_schema.columns,
--     pg_constraint, pg_indexes, pg_policies, pg_class.relrowsecurity) but were created out-of-band
--     (directly against the DB, not via a tracked migration) at some point before this session.
--   - admin_research_review itself has NO drift: its definition in
--     20260823_security_fix_anon_execute_revoke_and_null_bypass.sql (lines 40-85) is
--     semantically identical to the live pg_get_functiondef() output verified this session
--     (Postgres normalizes stored function bodies to lowercase keywords, which is the only
--     surface difference — logic, branching and error handling are byte-identical).
--
-- This migration does NOT claim to recreate the original creation history of these tables — it is
-- an explicit LIVE BASELINE SNAPSHOT dated 2026-08-25, safe to replay (CREATE TABLE IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS everywhere) and semantically verified against the live schema this
-- session. It intentionally does not backfill, alter, or touch any of the 192 existing
-- research_objects rows or the 10 existing decision_ledger rows.
--
-- Nothing in this file changes behavior on the live database (every statement is a no-op there,
-- since the objects already exist matching this shape). Its only effect is on a FRESH environment
-- rebuilt from migrations, which would otherwise be missing these tables entirely.

-- ── public.research_objects ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_objects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  kind             text NOT NULL,
  statement        text NOT NULL,
  terms            text[] DEFAULT '{}'::text[],
  value            integer,
  relates          text[] DEFAULT '{}'::text[],
  source           text,
  source_ref       text,
  contributor      text,
  confidence       integer,
  engine_verified  boolean,
  engine_detail    jsonb,
  evidence         text,
  status           text NOT NULL DEFAULT 'candidate',
  promoted_node_id uuid,
  parent_id        uuid,
  meta             jsonb DEFAULT '{}'::jsonb,
  owner_person_id  uuid,
  privacy_scope    text NOT NULL DEFAULT 'private'
);

DO $$ BEGIN
  ALTER TABLE public.research_objects
    ADD CONSTRAINT research_objects_kind_check
    CHECK (kind = ANY (ARRAY['fact','relation','observation','hypothesis','question']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.research_objects
    ADD CONSTRAINT research_objects_privacy_scope_check
    CHECK (privacy_scope = ANY (ARRAY['private','family_shared','public_candidate']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.research_objects
    ADD CONSTRAINT research_objects_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.research_objects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.research_objects
    ADD CONSTRAINT research_objects_owner_person_id_fkey
    FOREIGN KEY (owner_person_id) REFERENCES public.persons(person_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS research_objects_owner_privacy_idx
  ON public.research_objects USING btree (owner_person_id, privacy_scope);
CREATE INDEX IF NOT EXISTS ro_dedup_idx
  ON public.research_objects USING btree (source_ref, kind, statement);
CREATE INDEX IF NOT EXISTS ro_kind_status_idx
  ON public.research_objects USING btree (kind, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ro_value_idx
  ON public.research_objects USING btree (value) WHERE (value IS NOT NULL);

ALTER TABLE public.research_objects ENABLE ROW LEVEL SECURITY;
-- Live baseline has RLS enabled with ZERO policies (verified via pg_policies this session) —
-- i.e. deny-all to anon/authenticated; the only write path is via SECURITY DEFINER RPCs
-- (fn_persist_discovery, admin_research_review) and the research-extract edge function
-- (service-role key). This snapshot intentionally adds no policy, matching live exactly.

-- ── public.decision_ledger ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.decision_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type    text NOT NULL,
  subject_type     text,
  subject_ref      text,
  candidate        jsonb,
  methods          text[],
  sources          jsonb,
  domain           text,
  created_by_agent text,
  agents_involved  text[],
  evidence_ref     uuid,
  evidence         jsonb,
  ai_model         text,
  ai_reasoning     text,
  ai_score         numeric,
  rules_version    jsonb,
  human_decision   text,
  human_reason     text,
  decided_by       text,
  source_event_id  bigint,
  result_ref       jsonb,
  provenance       jsonb,
  status           text NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  reason_code      text,
  rules_snapshot   jsonb,
  engine_snapshot  jsonb
);

DO $$ BEGIN
  ALTER TABLE public.decision_ledger
    ADD CONSTRAINT decision_ledger_human_decision_check
    CHECK (human_decision = ANY (ARRAY['approve','reject','merge','modify']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.decision_ledger
    ADD CONSTRAINT decision_ledger_reason_code_fkey
    FOREIGN KEY (reason_code) REFERENCES public.decision_reason_codes(code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.decision_ledger ENABLE ROW LEVEL SECURITY;
-- Same live baseline: RLS enabled, zero policies (server-only per table comment "Human Feedback /
-- Decision layer ... server-only"). This snapshot adds no policy, matching live exactly.

-- ── public.edges.metadata reciprocal-provenance note ────────────────────────
-- No schema change needed here: public.edges.metadata is already `jsonb DEFAULT '{}'::jsonb`
-- (verified live, no CREATE for public.edges/public.nodes found in migrations either — same
-- out-of-band-creation pattern, but out of scope for this pass: STEP 1A does not alter their
-- shape, only writes into the existing metadata jsonb column). Flagged here for visibility,
-- not resolved in this migration.
