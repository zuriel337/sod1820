# Research Snapshot — 2026-08-22

**A read-only preservation snapshot, not a data-persistence pass.** This directory holds a
verbatim, byte-for-byte copy of research artifacts that existed only in an ephemeral
session scratchpad (`/tmp/.../scratchpad`, wiped on session close) at the end of a
multi-phase research arc: Corpus DNA / Master Classification (era 1) and Numeric
Language / Methods Expansion / Words-Names-Aliases / Corpus Expansion / Hebrew
Identity (era 2, this conversation's own work).

## What this is

- **138 files**, copied unmodified from the scratchpad into this repo location so they
  survive session close. See `MANIFEST.csv` (machine-readable, one row per file — filename,
  repo path, phase/task, row count, research status, provenance, canonical/candidate,
  SHA-256 checksum, and verification result) and `MANIFEST.md` (the same data, grouped
  by directory, human-readable).
- Built by `_build_snapshot.py`, included here for reproducibility. Every file's SHA-256
  and row count were compared against the scratchpad original at copy time —
  **0 mismatches** (see `_build_summary.json`).
- Directory layout follows the research phase each artifact belongs to (`era1-...`,
  `era2-...`, `session-audit/`, `intermediate-caches/`).

## What this is NOT

- **Not a DB write.** Nothing in `gematria_words`, `word_aliases`, `research_objects`,
  `research_contributions`, `nodes`, `edges`, or any other canonical table was touched by
  producing this snapshot.
- **Not a canonical promotion.** Every dataset here retains the research status it had in
  the scratchpad (`SCRATCHPAD_ONLY` / `PARTIALLY_PERSISTED` / `SUPERSEDED`) — see the
  `research_status` column in `MANIFEST.csv`. Copying a file into the repo does not
  change its evidentiary status.
- **Not a decision.** In particular, the Hebrew Identity Phase 2 files
  (`era2-hebrew-identity/`) are marked `candidate / pending Human-Gate` here — a
  conversational chat discussion of these families is **not** durable Human-Gate
  provenance. See the corrective `work_log` memo (id `3dd31ed2-c771-4c5c-83e0-de436b077b33`,
  which supersedes-in-characterization, without deleting, the prior closing memo
  id `5f64cf9b-1c9d-43b4-aa46-1221b5e14e74`).

## Provenance

- Session scratchpad this snapshot was built from: this conversation, 2026-08-22.
- Companion `work_log` rows (Supabase project `linswmnnkjxvweumprav`):
  - `5f64cf9b-1c9d-43b4-aa46-1221b5e14e74` — original `SESSION_RESEARCH_PERSISTENCE_AUDIT`
    closing memo (contains an overstated provenance claim — see next row).
  - `3dd31ed2-c771-4c5c-83e0-de436b077b33` — `PROVENANCE_CORRECTION` memo, additive,
    corrects the above without deleting it.
- Branch: `claude/gematria-lists-organization-u39nlj`, forked fresh from `origin/main`
  (commit `9b68639`, Roadmap v5 canonical) per explicit instruction — not from the
  pre-existing, 10-commits-behind local research branch.

## Next steps (not performed here)

`PROPOSED_PERSISTENCE_PASS.md` (in `session-audit/`) lays out a not-yet-executed plan for
routing the highest-value at-risk datasets (starting with `MASTER_CLASSIFICATION_v3.csv`,
15,433 rows, zero live-DB footprint) into existing DB structures
(`research_objects` / `research_contributions` / `word_aliases` / `project_codex`) once
Zuriel picks a destination for each. This snapshot's only purpose is to stop that
research from being lost to session close — no DB persistence was started or implied.
