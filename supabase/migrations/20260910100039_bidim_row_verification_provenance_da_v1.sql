-- D-A · ZURIEL Human Gate 2026-09-10 (work_log befe06ce) · Phase-0 evidence 1bed2e14.
-- Four NULLABLE additive columns (no default => metadata-only, zero row rewrite).
-- Records verification-by-re-execution as a fact DISTINCT from the original computation:
-- computed_at / engine_run_id / method_version stay untouched (NULL on historical rows = truthfully unknown).
alter table public.bidim
  add column if not exists verified_at             timestamptz,
  add column if not exists verified_run_id         uuid,
  add column if not exists verified_method_version integer,
  add column if not exists verified_mismatch_value bigint;

comment on column public.bidim.verified_at is 'When this stored row was re-executed through the canonical dispatcher and compared. NOT when the value was computed (that is computed_at).';
comment on column public.bidim.verified_run_id is 'Engine run id of the verification pass. Distinct from engine_run_id (original computation).';
comment on column public.bidim.verified_method_version is 'gematria_methods.version in force at verification time. Distinct from method_version (version that produced the stored value).';
comment on column public.bidim.verified_mismatch_value is 'Set ONLY when re-execution disagreed with the stored value. The stored value is never corrected and the row is never deleted; it stays legacy_unknown and unresolved.';
