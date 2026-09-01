-- SOD1820 — ELS Corpus Identity Closure · D3
-- Actor: CLAUDE · Date: 2026-09-01 · Human-Gate: ZURIEL (explicit "D3" task authorization)
-- Scope: Foundation-only identity correction. No tanakh_stream, no second engine, no UI change.
--
-- ROOT CAUSE (live-verified, not assumed):
--   `0b022e8eef6f9c16` is not a Torah-specific fingerprint. It is literally
--   sha256(tools/els/data/tk-letters.txt)[0:16] — the hash of the FULL canonical
--   corpus file (all 24 books, 1,204,583 letters), truncated to 16 hex chars.
--   Verified live on 2026-09-01:
--     sha256(full tk-letters.txt)          = 0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b
--     sha256(full tk-letters.txt)[0:16]    = 0b022e8eef6f9c16   <- adopted 18.8.2026 as "the" corpus_id
--     sha256(first 304,805 chars = Torah)  = 9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4
--     md5(first 304,805 chars)             = 0066c2431821863d258745e664d3883e  (= torah_stream's own known-good md5)
--   fn_els_corpus_id('tanakh') was added later (Gate #5/WS-TANAKH) but returned the
--   SAME constant, because that constant already *was* (by origin) the full/Tanakh
--   fingerprint — it had just already been claimed as "Torah's" identity by convention.
--
-- IDENTITY DESIGN (minimal, non-arbitrary, provenance-derived):
--   - torah  : UNCHANGED. `0b022e8eef6f9c16` is preserved exactly as-is (grandfathered).
--              It is already relied upon by fn_els_search's returned envelope, by 15 live
--              els_records rows (scope='torah'), and by 2+ months of docs/work_log. There is
--              no compelling operational reason to move it, and moving it would be pure churn.
--   - tanakh : NEW. The full, untruncated 64-hex sha256 digest of the exact same canonical
--              source file: '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'.
--              This is not invented: it is the real, already-independently-computed (and
--              twice work_log-documented) fingerprint of the actual Tanakh corpus file.
--              It is guaranteed distinct from Torah's id as a string, while remaining honest
--              about their real relationship: Torah's 16-char id is literally the first 16
--              characters of Tanakh's 64-char id, because the Torah letter-stream is
--              literally the first 304,805-character prefix of the same tk-letters.txt file.
--
-- fn_els_search is NOT modified: it only ever searches torah_stream, and its hardcoded
-- 'scope':'torah' + 'corpus_id':'0b022e8eef6f9c16' output is already honest and correct
-- under this design. No server-side Tanakh search capability is claimed here or anywhere.
--
-- save_els_matrix / save_els_matrix_anon are NOT modified: both already derive corpus_id
-- generically via `public.fn_els_corpus_id(p_scope)` on INSERT only (never on UPDATE, per
-- the existing Step-3 INSERT-only identity policy) — fixing this one function is sufficient
-- for every future save to receive the correct, scope-specific identity automatically.
--
-- HISTORICAL ROWS — explicitly NOT rewritten in this migration:
--   els_records today (live-verified 2026-09-01):
--     scope='torah',  corpus_id='0b022e8eef6f9c16' : 15 rows — correct under this design, untouched.
--     scope='torah',  corpus_id IS NULL             : 66 rows — legacy/unverified per the
--                                                      19.8.2026 Human-Gate-approved legacy
--                                                      model (NULLABLE, no batch-assign,
--                                                      opt-in per-record re-anchor). Untouched.
--     scope='tanakh', corpus_id='0b022e8eef6f9c16'  :  2 rows — PRE-FIX AMBIGUOUS. These two
--                                                      rows were written when the only
--                                                      corpus_id value in existence was the
--                                                      (mislabeled-as-Torah) full-file hash.
--                                                      They now carry Torah's frozen identity
--                                                      value while their own `scope` column
--                                                      says 'tanakh' — an inherited, historical
--                                                      inconsistency, not a new one. This
--                                                      migration does not rewrite them. Per the
--                                                      existing approved legacy-row policy, a
--                                                      correction requires a separate, per-record,
--                                                      opt-in re-anchor pass with its own
--                                                      Human-Gate — not a silent bulk rewrite.
--     scope='tanakh', corpus_id IS NULL             : 43 rows — legacy/unverified, same policy
--                                                      as the torah-NULL rows above. Untouched.
--   Total 126 els_records rows: 0 rows written, updated, or deleted by this migration.

CREATE OR REPLACE FUNCTION public.fn_els_corpus_id(p_scope text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case coalesce(nullif(p_scope,''),'torah')
    when 'torah'  then '0b022e8eef6f9c16'
    when 'tanakh' then '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    else null
  end
$function$;
