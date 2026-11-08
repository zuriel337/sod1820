# Full series follow — phase 1 prepared in the branch (nothing is applied to any database)

Date 2026-11-08 · ZURIEL decision 3: restore full follow, **including the migration and a re-pin of `WatchButton.jsx`, only after tests and an explicit approval before Production.**
Status: PROPOSAL, BRANCH-ONLY. No migration was run, no pin was changed, `WatchButton.jsx` is byte-identical to `origin/main`.

## Live findings (read-only, 2026-11-08)
| Object | live md5 | migration guard expects | match |
|---|---|---|---|
| canonical_follow_topic, follow_topic_aliases, canonical_follow_subject, notify_on_post_publish, resolve_topics, dispatch | as expected | as expected | yes |
| **watch_toggle(text,text,boolean,text)** | `807aaccbb3b7f8d8ed412eb0b3dbea3e` | `fa41495b802bbd75155fc1ab74c5cb39` | **NO — drift** |

The drift: the live `watch_toggle` contains the Community-thread branch (`p_source = 'community_thread'`, #1191, see `docs/reviews/community-option2-save-follow-20261104.md`). The migration **does not replace `watch_toggle`** — the hash is only a "base unchanged" guard — so the guard is stale, not the function wrong.
`canonical_follow_subject('series', …)` returns `''` for every series today (so every series bell is inert).

## What the migration changes (`supabase/migrations/20261031091248_follow_content_series_only_v1.sql`)
1. `canonical_follow_subject`: adds the `series` entity type.
2. New helper `post_content_series_keys_v1(text[],text[],text)` (execute revoked from public/anon/authenticated).
3. `notify_on_post_publish()` rewritten to notify series followers by exact series membership.
4. `trg_posts_notify` becomes `AFTER INSERT OR UPDATE OF tags` — **behaviour change: tagging an existing post (like the five posts tagged on 6.11) may notify that series' followers** (the function keeps its 2-hour `date` window, so old posts such as 92/5003/5004/5018 would not notify; a recently dated post tagged later would).

## Proposed sequence (each step needs your explicit OK)
1. Regenerate the migration with the new `watch_toggle` md5 in `scripts/generate-follow-content-series-only.mjs` (guard only; no function body change) and show you the diff.
2. Apply to a **Supabase branch** (not production), run: guard passes; `canonical_follow_subject('series','reality-map')` returns `series:reality-map`; follow/unfollow through `watch_toggle` keeps one `subscribe_events` row; a tagged post inside the 2-hour window dispatches once and an old post dispatches none; category follows unchanged.
3. `WatchButton.jsx`: apply `watchbutton-bell-variant.patch` (adds `variant="bell"`, imports `BellGlyph`) and re-pin in `test/world-gallery-entry-follow-chain-2029.test.mjs`: `8502baa9…e838a` → `d9e0a5f6880075d76bd91aeda3f2b8bee55c5243c31cd8a960f5e6bf684cbafb`; restore the live-bell CSS (`.h29-bell.is-on`, `.h29-bell-note`, using tokens, no hex); switch `SeriesBell2029` back to `variant="bell"`.
4. Production: migration via `apply_migration` after your approval for the exact migration file hash; then the code deploy per the CLAUDE.md procedure (separate approval).

## Rollback
- Database: `rollback-pre-state.sql` (live definitions captured today: `canonical_follow_subject`, `notify_on_post_publish`, original `AFTER INSERT` trigger; drops the helper). Rows written by real follows during the window are ordinary follow rows and are not removed by it.
- Code: revert the single code commit; until then the bells stay inert (current behaviour), so a code revert alone is safe.

## Risks
- A migration generated against a base that moved again between review and apply: the guards fail closed (that is their purpose); re-run the md5 table above immediately before applying.
- The trigger widening to `UPDATE OF tags` (point 4 above) affects editorial tagging from the admin; confirm that is wanted.
- Re-pinning a byte-pinned canonical component needs owner review of the patch (small: one added variant branch).


## Phase 1 status (ZURIEL approved 8.11.2026: prepare migration + re-pin, isolated environment, tests, diff, rollback; NOT production)
Done in the git branch only:
- `scripts/generate-follow-content-series-only.mjs`: the guard now expects the live `watch_toggle` md5 `807aaccb…` (the community migration `20261104135237` output) instead of `fa41495b…`. Regenerated migration diff = **one line** (the hash). `--check` passes.
- Release package `docs/reviews/follow-series-release-20261031/`: `manifest.json` (`preimage_md5.watch_toggle`, `candidate_sha256` → `6556916bb2fb…`) and `preflight.sql` updated to match; `rollback.sql` unchanged (it guards post-images, not `watch_toggle`). `live-preflight-readonly.json` is a dated evidence snapshot and was left as is.
- `WatchButton.jsx` + pin: bell face added (patch above), pin in `world-gallery-entry-follow-chain-2029.test.mjs` moved `8502baa9…` → `d9e0a5f6880075d76bd91aeda3f2b8bee55c5243c31cd8a960f5e6bf684cbafb`; `SeriesBell2029` back on `variant="bell"`; live-bell CSS restored without hex colours.
Not done:
- **Isolated Supabase branch:** `create_branch` asked the user to confirm cost and got no answer within 60s; not retried. No branch exists, so the migration was **not executed anywhere** (not even on a branch).

## Findings that need a decision before any apply
1. **The reviewed migration covers only 3 series** (`mah-kore-habora`, `dimension-five`, `sod-hashmal`; `REVIEWED_FOLLOW_SERIES`). `reality-map` and `messages-from-righteous` are deliberately outside it (the release test asserts they stay pending). After applying it, only those 3 bells could become live; the flagship and "מסרים" bells stay inert until a separate reviewed extension adds their identities (membership: tag `מפת המציאות`; category `רמזים מצדיקים`) to the SQL helper and the manifest.
2. **Ordering:** the file keeps its CLI timestamp `20261031091248`, earlier than the already-applied `20261104135237` (which created today's `watch_toggle`). With the Supabase CLI it would be rejected as out-of-order; with `apply_migration` it gets a new timestamp. Apply only after the preflight table (README top) is re-run live.
3. The trigger widening to `UPDATE OF tags` (see above).

## Rollback and recovery
- Preferred: the already-reviewed `docs/reviews/follow-series-release-20261031/rollback.sql` (guarded on post-images; never deletes follow data). 
- Alternative captured today from the live DB: `rollback-pre-state.sql`.
- Code: revert the code commit; bells return to inert.

## Stage split (ZURIEL 8.11.2026 — final order)
**Stage 1 (Home + "עכשיו" + the video) ships WITHOUT any follow-series migration artifact.** On the integration branch the migration SQL, its release manifest/preflight, the generator guard change, the `WatchButton.jsx` bell variant and its re-pin were reverted to `origin/main`; `SeriesBell2029` is back on the existing `mini` variant. Nothing here is applied anywhere.
**Stage 2 (after Stage 1 is live and verified):** re-apply Phase 1 with `git revert <the revert commit>` (the Phase 1 commits are in this branch's history: `456c3c6d3`), then the isolated Supabase branch, the diff and rollback review, and a separate approval for Production. The Phase 1 notes above remain accurate for Stage 2.

