# Corpus Intake Truth-Axis Separation v1

Status: IMPLEMENTED ON BRANCH ONLY — NOT MERGED, NOT DEPLOYED, NOT LIVE.

## Problem

Live `resolve_word_review(approve)` currently couples three distinct axes in one human-review action:

- corpus approval (`visibility_reason='approved_by_admin'`)
- engine verification (`is_verified=true`)
- publication (`is_published=true`)

This conflicts with the live Truth Axes foundation: verification is machine-owned, governance is Human-Gate-owned, and publication/access is a separate axis.

## Resolution

Migration `20260901010000_corpus_intake_truth_axis_separation_v1.sql` introduces one machine-only verifier, `fn_verify_gematria_word_engine(uuid)`, and updates `resolve_word_review` so that:

1. machine verification is delegated to the verifier;
2. human approval records corpus approval through `visibility_reason='approved_by_admin'` and queue status only;
3. review approval never changes `is_published`.

No new table, graph, store, lifecycle enum, or truth axis is introduced.

## Verification

Live read-only preflight against canonical Supabase on 2026-09-01:

- clean Hebrew `gematria_words` rows: 13,956
- clean rows missing any of the 14 method fields required by the verifier: 0
- rows currently returned by `gematria_integrity`: 0

Therefore the verifier reuses the existing canonical engine-integrity contract rather than inventing a new verification rule.

## Foundation classification

MUST FOUNDATION NOW — this separation is required before declaring Corpus Intake truth lifecycle sufficient.

## Release state

IMPLEMENTED: yes, branch only.
MERGED: no.
DEPLOYED: no.
LIVE: no.
VERIFIED: static migration review + live read-only compatibility preflight.

Explicit ZURIEL release approval is required before merge/apply.
