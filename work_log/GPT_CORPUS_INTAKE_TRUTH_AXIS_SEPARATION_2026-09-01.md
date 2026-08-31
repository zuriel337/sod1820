# GPT — Corpus Intake Truth-Axis Separation — BEFORE/AFTER

Actor: GPT
Date: 2026-09-01
Status: IMPLEMENTED_ON_BRANCH_NOT_MERGED_NOT_DEPLOYED_NOT_LIVE

## Live facts

Canonical Supabase: linswmnnkjxvweumprav.
Current main at branch creation: 82b93cc4a05916e0b03a4a56bf7b3870e2bca0ac.

Live defect verified in `resolve_word_review`: approve/edit called `wa_add_word`, then human review directly set `gematria_words.is_verified=true` and `is_published=true` together with `visibility_reason='approved_by_admin'`.

Live Truth Axes law requires Verification != Governance != Publication/Access. Live corpus-admission documentation contains drift: one rule records the old coupled behavior as closed while the lifecycle/truth-axis law requires machine-owned verification and separate publication.

## Change prepared

Branch: gpt/corpus-intake-truth-axis-separation-v1.

Added one migration introducing `fn_verify_gematria_word_engine(uuid)` and replacing `resolve_word_review` so approval:
- delegates machine verification to that verifier;
- records corpus approval through `visibility_reason='approved_by_admin'` and queue status;
- never changes `is_published`;
- never directly assigns `is_verified`.

No new table/store/graph/lifecycle enum.

## Verification

Read-only live preflight:
- clean Hebrew gematria_words rows: 13,956
- clean rows missing any required stored method field: 0
- gematria_integrity mismatches: 0

Added regression test asserting the separation contract.

## Release state

IMPLEMENTED=yes (branch only)
MERGED=no
DEPLOYED=no
LIVE=no
VERIFIED=live read-only compatibility preflight + static regression contract; production migration not applied.

STOP CONDITION: do not merge or apply migration without explicit ZURIEL release approval.
