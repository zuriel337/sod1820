-- GAP-5 reproducibility envelope (Pass 2, els_pass2_gap5_migration): one additive, nullable jsonb
-- column on els_records, matching the research_objects.engine_detail naming precedent. Does not
-- duplicate existing dedicated columns (corpus_id/term_norm/scope/direction/skip_distance/start_index)
-- or the existing positions jsonb (different established purpose: UI findings/postUrl/quality/shapeUrl).
-- Contract (documented, not yet populated by any RPC/client in this pass -- see work_log BEFORE memo):
--   {engineVersion, corpus, geometry:{S,mainCol,c0,cw,r0,r1,ctxR}, occurrence:{index,count,capped},
--    searchParams:{cap}, form:{kind,derivation,tokens}|null, ranking:{quality,...}|null,
--    sampling:{policy,capped}}
--
-- PROVENANCE NOTE (added post-hoc, GPT Challenge provenance fix): this migration was applied
-- directly to Supabase via the apply_migration MCP tool on 2026-08-24 (recorded server-side as
-- migration version 20260824204445) BEFORE this file existed in the repository. This file is
-- committed after the fact for source-of-record parity -- it reproduces the exact SQL that was
-- already run. Do NOT re-apply; the column already exists live. If this file is ever run against
-- a fresh database, `add column if not exists` and `comment on column` are both idempotent/safe.
alter table public.els_records add column if not exists engine_detail jsonb;
comment on column public.els_records.engine_detail is
  'GAP-5 reproducibility envelope (Pass 2): engine/profile version, geometry snapshot, search parameters, FORM/method, ranking/statistical provenance, sampling/truncation policy for a saved cipher. Nullable/additive -- not yet populated by save_els_matrix/save_els_matrix_anon RPCs (Pass 3 follow-up). Does not duplicate corpus_id/term_norm/scope/direction/skip_distance/start_index (existing dedicated columns) or positions (existing UI-facing jsonb).';
