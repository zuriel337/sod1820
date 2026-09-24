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

## Addendum — real-corpus calibration pass

Assignment: `work_log.id=42e9c1f7-ad7e-4726-a71b-1169b8d6adf8`,
`task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_CORPUS_CALIBRATION_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.
Same PR #636 branch, amended in place on top of `8c9f7a3e`; no new parallel branch/PR, no live
DB apply, no import, no OpenWeb touch, no merge/deploy.

A real-corpus rehearsal against the actual 41,080-row OpenWeb export (not committed to this repo
— contains PII) found the first-pass gate above over-indexed: `2,860` of `41,080` rows resolved
`index_eligible=true`, and of the `2,317` rows whose only eligibility reason was
`verse_or_entity_reference`, `2,196` had no other corroborating signal at all — a bare keyword hit
was standing in for a real research relation. Four concrete false-positive classes were observed:

1. Ordinary Hebrew **`השמות`** ("the names") matching the book **שמות** (Exodus) as a bare
   substring — JS's `\b` never fires between two Hebrew letters (they aren't `\w`), so the old
   plain-substring regex had no real word boundary at all.
2. External news URLs whose path happens to contain an internal-looking segment (e.g.
   `cnn.com/world/...`) matching the same `/world/` pattern used for internal
   `sod1820.co.il` entity links.
3. URL query params, article IDs, and video timecodes (digits inside a URL) reading as a numeric
   operand for a gematria/numeric relation when a `גימטריה` mention happened to sit in the same
   message.
4. Mere vocabulary mention/rejection (`גימטריה לא תופס אצלי`) or a bibliographic citation
   (`רמז ע"ו`) triggering on keyword presence alone, with no actual relation, operand, or
   interpretive connection behind it.

### Fix: split cheap prefilter from final eligibility

`evaluateIndexEligibility` in `classificationSeam.mjs` now returns two explicitly separate tiers
in the same return shape, both carried into the existing `decision_ledger` candidate JSON (no new
table/store):

- **`scan_candidate` / `candidate_reasons`** — the original cheap regex/keyword prefilter,
  unchanged in what it matches. A hit here is a candidate signal only; it is never read as
  eligibility by itself, by either this module or the SQL read seams.
- **`eligible` / `reasons`** (embedded as `index_eligible` / `index_eligibility_reasons`, same
  field names as before — the SQL gate in the migration needed no change) — now requires an
  actual reconstructable structured unit:
  - (a) an explicit numeric/gematria relation: the `גימטריה` keyword **and** a numeric operand,
    checked only after URLs are stripped out of the text (`stripSources`) — a query param or
    timecode can no longer stand in for an operand;
  - (b) a cipher/method/ELS mention **and** an identifiable input indicator (`במילה`, `בפסוק`,
    `בשם`, …) — a bare method name with nothing it operates on no longer qualifies;
  - (c) a verse/entity reference (keyword or a *validated* internal link) **plus** an authored
    interpretive-connection phrase (`מרמז`, `מסמל`, `קשור ל`, …) — sole entity/link mention alone
    is now `scan_candidate`-only, matching the corpus finding above.
- Hebrew book/entity keywords are now matched with a manual Hebrew-letter lookaround boundary
  (`(?<![א-ת])word(?![א-ת])`) instead of a bare substring/JS `\b`, so `השמות` no longer
  false-matches `שמות`.
- `extractInternalLinks` now validates the host of any full URL before treating its path as an
  internal reference: a bare relative path (`/number/1237`) or a full `sod1820.co.il` URL counts;
  any other host has its URL stripped to nothing first, so an external site's own `/world/`,
  `/person/`, etc. path segment can never match.

`community_search_facts` and `fn_raziel_community_intel_scoped` needed no SQL change — they were
already gating on `candidate->>'index_eligible'` only, never on the new `scan_candidate` field,
which satisfies the requirement that the read seams stay gated on final eligibility only.

No historical classification/backfill/import was performed in this task — only the gate's
semantics and its test coverage changed, per the assignment's explicit boundary.

### New tests

`scripts/test-g3-community-core-2029-phase2.mjs` gained regression coverage for the exact FP
classes above (`השמות`, external `/world/` URL, URL-embedded digits, mere-mention rejection,
bibliographic reference), plus explicit tier-separation cases (sole entity/link mention →
`scan_candidate:true, eligible:false`; entity/link + interpretive connection → `eligible:true`)
and a `decision_ledger` candidate-shape check asserting `scan_candidate`/`scan_candidate_reasons`
are present and distinct from `index_eligible`/`index_eligibility_reasons`. All prior true/false
positive cases in that file were re-verified against the new logic; only the sole-internal-link
case (`g9`) changed expected outcome, matching the corpus finding.

### Build/test evidence (this session, on this branch)

```
npm run test:g3-community-foundation-runtime                # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                  # 33 pass, 0 fail (8 new)
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction  # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor     # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter     # 12 pass, 0 fail
npm run test:g3-community-core-pr636-dry-run-cli            # 3 pass, 0 fail
npm run build:2029                                          # ✓ built in 1.08s (same pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT warning
                                                              #   on src/lib/auth.js, unrelated)
```

Total focused Community suite: 88 pre-existing + 8 net-new = 96 tests, 0 failures.

### Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply of the (unmodified) migration file — still never run against the
  canonical project from this task.
- No historical backfill/re-classification of already-approved contributions against the
  calibrated gate — out of scope per the assignment; they resolve `index_eligible=false` until
  (re-)classified, same default as before.
- The real 41,080-row OpenWeb corpus itself is not committed to this repo (contains PII) and was
  not touched, imported, or written to any live store from this task.
