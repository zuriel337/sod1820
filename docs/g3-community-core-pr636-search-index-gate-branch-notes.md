# G3 Community Core — PR #636 Search Index Gate (branch-only)

Assignment: `work_log.id=4d89f4b6-7472-4e40-ab36-a49f367c90d1`,
`task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_GATE_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`), amended in place on top of the final-blockers
fix (`2d61b3e3`); no new parallel branch/PR. No live DB write, no migration applied, no OpenWeb/
current chat/forum file touched, no merge/deploy, no import execution.

## What this closes

ZURIEL's Human-Gate instruction: preserve all Community history, but make only material
Remez/Research-bearing authored text index/search/Raziel-retrieval eligible. Mere number, mere
URL, video-only/link-only content, or social chat/reaction/small talk must never be sufficient on
their own.

1. **Classifier assumption fixed at the eligibility layer, not the label layer.**
   `scripts/g3-community-foundation-runtime/classificationSeam.mjs`'s existing `multiLabel` still
   labels a message `'גימטריה'`/`'מקור'` on any bare number/URL (unchanged — that's a display tag,
   not a search-eligibility decision, and rewriting it would have broken every existing label
   test). A new, separate `evaluateIndexEligibility(body, internalLinks)` requires an actual
   research-bearing signal instead: a gematria/numeric relation claim (`גימטריה`/`בגימטריה`/…), a
   cipher/ELS/method operation (`אתב"ש`, `צופן`, `קפיצות אותיות`, `ELS`, …), a verse/entity
   reference (`פרק`/`פסוק`/a Tanakh book name, or an internal `/number/`, `/entity/`, `/person/`,
   `/world/`, `/topic/` link), or an explicit interpretive connection (`מרמז`, `מסמל`, `מקביל ל`,
   `קשור ל`, …). None of these fire on a bare number, a bare URL, or ordinary chat/reaction text.

2. **Candidate-only field, existing carrier, no new store.** `classifyContribution` now also
   returns `index_eligibility: { eligible, reasons }`; `toDecisionLedgerCandidate` embeds it as
   `candidate.index_eligible` (boolean) + `candidate.index_eligibility_reasons` (string[]) inside
   the `decision_ledger.candidate` jsonb payload it already shapes — no new column, no new table,
   no parallel Community search store. `status` stays `'pending'` and `human_decision` stays
   `null`, exactly as before: this is an AI candidate signal, never a publication/canonical/fact
   change.

3. **Enforcement at the read seams.** New migration
   `supabase/migrations/20260924101400_g3_community_core_pr636_search_index_gate.sql` (not applied
   live) adds `public.community_contribution_index_eligible(p_contribution_id uuid)`, a read-only
   helper that resolves a contribution's latest `community_contribution_classification`
   `decision_ledger` candidate's `index_eligible` flag (defaults to `false` — not yet classified
   means not yet eligible, never eligible-by-default). `community_search_facts` and
   `fn_raziel_community_intel_scoped`'s research-context fields
   (`new_since_last_visit_count`/`recent_thread_ids`) now gate on it in addition to their existing
   `status='approved'` predicate. `community_stream_projection` and `post_conversation_projection`
   (ordinary chronological Community reading) are **not** touched — all approved history stays
   visible there exactly as before; only the search/Raziel-research surfaces are gated.

## New tests

`scripts/test-g3-community-core-2029-phase2.mjs` gained 10 focused cases under "Search Index
Gate": five false-positive guards (random number, YouTube-link-only, generic-URL-only, small
talk, reaction-only text — all `eligible:false`), three true-positive cases (explicit gematria
relation, a verse reference with an interpretive connection, an ELS/cipher/method statement — all
`eligible:true` with the expected `reasons`), one internal-entity-link case, and one
`toDecisionLedgerCandidate` shape check confirming `candidate.index_eligible`/
`index_eligibility_reasons` are present while `status`/`human_decision` stay unchanged.

SQL-level guarantees (the new helper function and the two gated read seams) are read/reasoned
about, not executable-tested — no live DB write/migration is authorized in this branch, the same
stated limitation every prior Community Core phase's own test suite carries.

## Build/test evidence (this session, on this branch)

```
npm run test:g3-community-foundation-runtime                # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                  # 25 pass, 0 fail (10 new)
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction  # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor     # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter     # 12 pass, 0 fail
npm run test:g3-community-core-pr636-dry-run-cli            # 3 pass, 0 fail
npm run build:2029                                          # ✓ built in 1.10s (same pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT warning
                                                              #   on src/lib/auth.js, unrelated to
                                                              #   this change)
```

Total focused Community suite: 78 pre-existing + 10 new = 88 tests, 0 failures.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply — the new migration is committed but never run against the canonical
  project (`linswmnnkjxvweumprav`) from this task.
- No wiring of `classifyContribution`/`toDecisionLedgerCandidate` into a live write path yet (no
  such caller exists in this repo today — confirmed by search before this pass); this task adds
  the eligibility decision and its enforcement at the read seams, not a new write pipeline.
- No change to `community_stream_projection`/`post_conversation_projection` (ordinary
  chronological reading) — intentionally out of scope per the assignment.
- No re-classification/backfill job for already-approved contributions with no
  `decision_ledger` candidate yet — they resolve to `index_eligible=false` (not yet classified)
  until classified, which is the correct default, not a gap to silently fill here.
