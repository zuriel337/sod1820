-- ============================================================================
-- MF-1 MINIMUM CLOSURE — RESEARCH OBJECT SOURCE-NATIVE IDENTITY INVARIANT
-- ============================================================================
-- Human-Gate approved (ZURIEL, 2026-08-29). Scope is EXACTLY the minimum package
-- designed in work_log 372d7a5c-f9ff-4bed-80f9-d6f67a19f533 and opened in
-- work_log 091b7274-277c-4747-b3c7-78e1676df4b6 (BEFORE).
--
-- WHY (root cause, work_log 372d7a5c):
--   Nine writer classes reach public.research_objects, each with its own,
--   mutually invisible, unenforced answer to "what makes two ingestions the same
--   source claim". The DOMINANT writer is direct agent SQL via service-role/MCP
--   (410 of 579 rows = 70.8%), which cannot be routed through any RPC. Therefore
--   the ONLY enforcement point that covers 100% of writers is the table boundary.
--   This is also the smallest fix: one invariant on one table beats nine writer
--   patches. Same pattern as gm_composition_identity_uidx (Engine pass, CA-1).
--
-- WHAT THIS DOES NOT DO (explicit non-scope):
--   no new table · no new column · no new Store/Engine/Graph · no Source-node
--   architecture · no contributor->Person work · no content hashing/versioning ·
--   NO historical duplicate cleanup · no delete · no merge · no backfill ·
--   no canonicalization · no Projection/UI · no Engine/Composite work.
--
-- HISTORY IS UNTOUCHED (everything_additive_law + HG-E4 RANK, DON'T HIDE):
--   All 579 pre-existing rows (max(created_at) = 2026-08-29 20:54:23.87096+00,
--   id fingerprint md5 = 1a31c4511b5bbb447f31f0550461c988) fall structurally
--   OUTSIDE the partial index by construction. The 5-row historical duplicate
--   family stays exactly as it is; it becomes VISIBLE through the two functions
--   without being rewritten.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A1. SOURCE-NATIVE IDENTITY
-- ----------------------------------------------------------------------------
-- Normalizes research_objects.source_ref to the SOURCE OBJECT it cites.
--
-- Strips ONLY the two proven INGESTION/BATCH suffix shapes: '#batch<digits>'
-- (293 live rows) and '#a<digits>' (1 live row). These are positional ordinals
-- assigned by the chunker; re-chunking renumbers them, so they are not identity.
-- Stripping them is what finally lets 'channel_updates:<uuid>' and
-- 'channel_updates:<uuid>#batch0' resolve to the SAME source object.
--
-- SEMANTIC fragments are deliberately PRESERVED (live: '#interpretation',
-- '#mem-stuma', '#valuation'). They discriminate genuinely different sub-claims
-- of one source and are NOT ingestion artefacts. Safety-gate requirement 6:
-- "fragment normalization removes only the proven ingestion/batch suffix
-- semantics" — a generic split_part(source_ref,'#',1) would have violated this,
-- so the narrower regexp is used instead.
--
-- IMMUTABLE is genuine here: lower/btrim/regexp_replace/coalesce are all
-- IMMUTABLE, and the function reads no table and no GUC.
create or replace function public.fn_research_source_uid(p_source_ref text)
returns text
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  select lower(btrim(regexp_replace(coalesce(p_source_ref, ''), '#(batch|a)[0-9]+$', '')));
$$;

comment on function public.fn_research_source_uid(text) is
  'MF-1: canonical source-native identity of a research_object. Strips only the proven ingestion/batch suffixes (#batchN / #aN); semantic fragments (#interpretation, #mem-stuma, #valuation) are preserved. NULL and '''' normalize to the same empty uid, which closes the research-extract "" vs NULL dedup mismatch at the DB boundary.';


-- ----------------------------------------------------------------------------
-- A2. CLAIM IDENTITY
-- ----------------------------------------------------------------------------
-- Conservative normalization of research_objects.statement.
--   * unifies the dash/maqaf family  ־ – — ‒ ‑  -> '-'
--   * deletes the quote family       " ' ״ ׳ ` ‚ „ “ ” ‘ ’
--   * deletes all whitespace
--
-- DELIBERATELY PRESERVED: digits and mathematical operators. Research Intake
-- Foundation Contract §6.10 (Mathematical Symbol/Operation Identity) makes
-- 'יקיר +אפרים' and 'יקיר אפרים' semantically DISTINCT; a normalizer must not
-- overrule the contract. The aggressive strip-all-punctuation variant was
-- measured (573 distinct / 3 collisions / 6 rows) and REJECTED for exactly this
-- reason in favour of the conservative variant (575 / 1 / 4).
--
-- DELIBERATELY NOT PART OF THE KEY (see the index below): `kind` and `source`.
-- The live duplicate family changed kind observation->relation on re-extraction,
-- which is precisely why research-extract's own (source_ref, kind, statement)
-- dedup let it through; and `source` is free text with 40 spellings for ~15
-- logical sources.
--
-- Honest residual, accepted by design: LLM re-phrasings that differ by WORDS
-- rather than punctuation are NOT caught. A UNIQUE constraint must never guess
-- semantics — that residual is an EXTENSION POINT, not part of MF-1.
create or replace function public.fn_research_claim_uid(p_statement text)
returns text
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  select regexp_replace(
           translate(lower(coalesce(p_statement, '')),
                     '־–—‒‑"''״׳`‚„“”‘’',
                     '-----'),
           '\s+', '', 'g');
$$;

comment on function public.fn_research_claim_uid(text) is
  'MF-1: canonical claim identity of a research_object. Conservative: unifies dash/maqaf, deletes quote family and whitespace; digits and mathematical operators stay identity-significant per research_intake_foundation_contract §6.10.';


-- ----------------------------------------------------------------------------
-- B. FORWARD-ONLY UNIQUENESS ENFORCEMENT
-- ----------------------------------------------------------------------------
-- One partial UNIQUE INDEX over the two identity expressions.
--
-- FIXED, DETERMINISTIC CUTOFF — timestamptz '2026-08-29 21:00:00+00'.
-- NOT now()/CURRENT_TIMESTAMP: a volatile expression in an index predicate is
-- not allowed and would make the invariant non-reproducible. The literal was
-- chosen because max(created_at) over all 579 historical rows is
-- 2026-08-29 20:54:23.87096+00, so `select count(*) from research_objects
-- where created_at >= '2026-08-29 21:00:00+00'` returned 0 at migration time
-- (verified live) — every historical row is outside, every future row inside.
--
-- Consequence for each writer class:
--   * SQL writers updated in this same migration absorb conflicts via
--     ON CONFLICT ... DO NOTHING and return the pre-existing row.
--   * The research-extract Edge Function treats SQLSTATE 23505 as "already
--     ingested" (see supabase/functions/research-extract/index.ts).
--   * Direct agent SQL (the 70.8% writer) receives a hard unique-violation.
--     That is INTENDED, not a regression: an agent re-inserting the same source
--     claim should be told, not silently absorbed.
create unique index if not exists research_objects_identity_uidx
  on public.research_objects (
    public.fn_research_source_uid(source_ref),
    public.fn_research_claim_uid(statement)
  )
  where created_at >= timestamptz '2026-08-29 21:00:00+00';

comment on index public.research_objects_identity_uidx is
  'MF-1 forward-only source-native identity invariant. Partial by fixed cutoff 2026-08-29 21:00:00+00 so all 579 pre-existing rows remain structurally outside it — no delete, no merge, no backfill, no canonicalization (everything_additive_law / RANK, DON''T HIDE). ro_dedup_idx (non-unique) is intentionally retained for its existing lookup role.';
