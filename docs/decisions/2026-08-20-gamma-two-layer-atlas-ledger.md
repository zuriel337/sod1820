# [ZURIEL-DECISION] γ · Two-Layer Research Identity (Atlas / Ledger) — 2026-08-20

**Provenance:** RESEARCHED_BY=CLAUDE (READ-ONLY schema + work_log audit) → PROPOSED_BY=CLAUDE → **APPROVED_BY=ZURIEL** → documentation record (this file). **No DB write · no schema change · no migration · no Master State write · no merge/deploy.**

Reuse, not invention: both stores already exist and the link convention is already live. This record only names the intended relationship.

---

## The decision (γ)
Research findings live in **two intentional layers**, linked — **no third store, no new table, no schema change.**

- **Atlas layer = `relation_evidence`** — public engine / cross-method findings; read via `atlas_findings(relation_type)`; **server-only write, public read**. (ELS already bridged here via `cipher_link`.)
- **Ledger layer = `research_objects`** — private research units; **server-only**; `owner_person_id` + `privacy_scope` (R1, §16); Family / R1 / discovery.
- **Engine findings stay in their own engine store** — ELS `els_records`; gematria `bidim`/`gematria_words`; names `fn_name_multi`. Neither layer replaces the engine store.
- **Link between layers = `source` / `source_ref` string convention** — polymorphic text, **no FK, no new column, no new table**:
  - Atlas→engine: `relation_evidence.source = 'els_record:<id>'` (already live).
  - Ledger→engine: `research_objects.source_ref = 'els_record:<id>'`.
  - Ledger↔Atlas: `research_objects.source_ref = 'relation_evidence:<id>'` (or in `relates[]`).
- **`nodes` / `edges` remain the canonical graph.** A finding becomes a node/edge only where the endpoint nodes already exist (atlas-bridge rule: *no node invented*). Both layers project into the one graph.
- **`PUBLISHED ≠ CANONICAL ≠ privacy`** — three orthogonal axes:
  - PUBLISHED = surface/moderation (`els_records.status='published'` gates bridging; public-read gates atlas visibility).
  - CANONICAL = `engine_verified` + `status='confirmed'` + promoted into nodes/edges.
  - privacy = `privacy_scope` (private / family_shared / public_candidate) — access, not truth.

## Live-state facts (verified READ-ONLY, this session)
- `relation_evidence` = 132 rows (relation_types: cipher_link 37 · mirror 20 · complement 11 · convergence_candidate 8 · cross_method_convergence 5 …); ELS-sourced = 36; `atlas_findings()` = SQL function; **writes server-only, public read**.
- `research_objects` = 121 rows, server-only, R1 `owner_person_id`+`privacy_scope` applied (§16); dedup index `ro_dedup_idx(source_ref, kind, statement)`.
- `source`/`source_ref` string convention **already in active use** (prefixes: `els_record · cipher_scan · cross_method · engine_scan · ai_judge · vip · zuriel`).
- **No FK references `els_records`**; **no `cipher_link`/`finding_ref` column on `research_objects`** — the cross-layer link is convention, by design.
- **γ requires zero DB change.** No migration.

## Supersession
- **§19-old** («Finding = research_object OR research_contribution», premium-research-audit, 19.8) is **SUPERSEDED by γ** (two-layer Atlas/Ledger + engine-store, linked by string convention).
- This supersession is recorded **here (decision record) only**. §19 was **not** merged into main (P1 sync excluded it); the **§19→γ Master rewrite is a separate Master WRITE gate** and is **not performed by this record**.

## What this record does NOT do
- ❌ No DB write / migration / schema change.
- ❌ No Master State write (no §19 edit; no §20-γ section).
- ❌ No Finding Identity change (`{corpus_id, term_norm, dir, skip, start}` stays FROZEN — separate Human-Gate).
- ❌ No merge / deploy / branch archive.

## Status
`APPROVED` (Zuriel) · `DOCUMENTED` (this record) · DB change = **NONE** · Master State = **UNCHANGED** · §19→γ Master rewrite = **OPEN** (separate gate).
