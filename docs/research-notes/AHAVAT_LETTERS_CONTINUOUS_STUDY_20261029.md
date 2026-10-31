# Ahavat Torah — continuous source-bound letter study

## BEFORE · GPT → ZURIEL · 29 October 2026

Approved continuation base `49bd5f06e54157179f6ea6b01b996861bc7940f7`; new isolated branch `codex/ahavat-letters-continuous-study-20261029`. Prior Preview was delivered; this request to continue is not certification of human visual review/adoption. Continue the user's bounded GPT writer exception for the Ahavat letters cut only.

Live readonly coordination: canonical `supabase_read_only_user`, read-only transaction; Experience v10 / coordination v17. No overlapping runtime writer; two older contract-document tasks exclude this scope. Main observed `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; remote source branch matches the base. No automatic main/central import, merge or cherry-pick.

EXTEND_EXISTING Experience/Design V2 and binding user Books spatial requirements (addendum 1.1 branch artifact, no DB activation). Intended cut: all 54 source parashot across book boundaries; preserve the selected parasha on focused letter changes; direct overview/detail return links. Reuse the same reader, existing unit IDs, PDF and explicit lazy model. No new store, route, registry or numeric authority.

Write scope: Ahavat page, existing letters study/parasha components and scoped CSS, a small source-row presentation lookup if needed, dedicated tests and this receipt. Source datasets/PDFs, shared reader/frame, Legacy, World/Post, DB/RLS/permissions, main, publication and Production remain untouched. No model starts automatically. Missing readings remain null.

Validate full Books tests, focused nine-context browser/source continuity and existing reader/model regressions, Language/Auth, 2029 builds/graph/weight and Legacy lock. Only then may a protected Preview be created from the pushed delivery HEAD. Journal access is readonly; this is a local BEFORE, not a fabricated live claim.

## AFTER

Runtime accepted at `9adc82d9ca7fd00e971dd7d154c57ea5ab296c76`; delivery adds only this receipt, the compact evidence record and two browser screenshots. Branch `codex/ahavat-letters-continuous-study-20261029`; Base `49bd5f06e54157179f6ea6b01b996861bc7940f7`; full range is Base..delivery HEAD, five linear commits (four implementation/acceptance commits and one final receipt commit). No merge or cherry-pick. No integration, visual adoption or complete-book claim.

### Three delivered implementation batches

1. **Continuous source journey** (`6e0dc13f`): the focused letters reader can traverse all 54 parashot in printed source order, crossing all four book boundaries. An explicit current-book/all-Torah choice is retained in the URL (`letterJourney`); the classic and count readers keep their existing book-scoped behavior. The actual selected book, source row, printed value, canonical reader unit and PDF page follow the selection together. No wrap at either end.
2. **Keep the selected parasha** (`514b353b`): changing a letter through the focused alphabet or previous/next control retains the same parasha and looks up that letter's actual source row and PDF page. The tiny presentation lookup returns the existing row object; it does not create another data/identity authority. All 1,512 existing rows, including 24 unread numeric cells, are covered by the identity test.
3. **Overview/detail return** (`5861cfc7`, reload acceptance `9adc82d9`): direct links join the overview and the currently selected canonical row. Reloading the overview fragment restores the intended view and an enabled keyboard focus target. The selected detail remains the sole DOM owner of its canonical source anchor. Modified link clicks retain normal browser behavior.

### Coverage and unchanged boundaries

This is a reading-continuity improvement, not a new transcription, independent count or claim of complete book commentary. The existing 28 printed letter forms / 54 parashot / 1,512 source rows are reused. The 24 null row values, two null cumulative checkpoints, source discrepancies, 267 selected companion units, 99 initial page guides and 98 OCR pages are not rewritten. The physically blank page remains blank.

No changes to `src/data/`, `public/book-data/`, PDFs, the shared reader/fullscreen button, shared renderer or other books. No new route, surface, registry, state provider, theme, palette, engine or DB law. Design V2 typography/color/target tokens are extended only in the existing scoped stylesheet. One GPU scene still loads only after explicit activation; source selection does not remount it.

Original Ahavat Torah PDF: 99 pages; SHA-256 `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`. Physical-page acceptance reads the Chromium PDF viewer's actual page geometry; a URL or page selector alone is not evidence. Local tests serve these exact PDF bytes, with application service responses stubbed. Final hosted acceptance must use the real remote PDF, verified TLS and no request interception.

### Acceptance evidence

External logs and screenshots: `/workspace/artifacts/ahavat-letters-continuous-20261029/`.

- Full non-browser Books suite: **411/411**, no skips (`books-nonbrowser.log`).
- Public language **3/3**, integrated Preview Auth Guard **4/4** (`language-auth.log`).
- Normal 2029 build and graph: PASS; eager gzip **379,579 bytes**, seven eager / 109 reachable manifest records.
- Two-flag Preview build and graph: PASS; eager gzip **376,887 bytes**, seven eager / 144 reachable records.
- Actual `preview-deploy` integrated build and graph: PASS; eager gzip **377,243 bytes**, eight eager / 151 reachable records. No budget increase or graph exemption.
- Legacy Production Lock, source isolation and cheap hardening: PASS. Legacy deployment/aliases independently inspected at pinned `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq` / `99249526e91f1d720fae1aa43e82bbbe51ee5c45`.
- Nine-context continuous browser matrix: **9/9** at 320/390/1440 × light/parchment/dark, one mandatory test passed without skips (`continuous-browser.log`, 369 seconds). All four book boundaries were traversed in both directions in every context; scope/reload, exact source-unit uniqueness/page, letter retention, overview/detail focus, lazy activation, same canvas through source return and context disposal passed. The extra null-cell case remained unread rather than zero.
- Existing reader/model browser regressions: **17/17 final per-case acceptance**, not one clean monolithic run. Ten cases passed in the first serial batch. Its focused visual case then failed at the initial native-PDF page-35 geometry wait (before exercising the UI). The runner was stopped, cancelling the remaining cases; those cancellations are not counted as passes. The unchanged isolated rerun passed **all nine visual contexts** in 178 seconds (`visual-diagnostic.log`), with no enlarged timeout, skip or assertion change. The original failure log is retained; its underlying transient cause is not established. All **6/6** remaining cases passed in the resumed serial batch, with no skips or cancellations (`reader-regressions-resumed.log`, 582 seconds). This includes exact reader-unit search/reload/return, source tables, spatial tables, all eight unified readers, the two-book wide matrix and both real native PDFs. Together with the new continuous test, **18 browser cases** are accepted.
- Protected Preview / hosted acceptance: all local gates now permit an exact pushed-HEAD Preview. Its immutable deployment ID, HEAD, READY/target=null, temporary access expiry, real remote PDF/hash check and no-interception nine-context results will be recorded separately in `/workspace/artifacts/ahavat-letters-continuous-20261029/handoff.json` after deployment; this committed receipt does not pre-claim them. No production promotion or domain reassignment is authorized.

Builds use an owned detached worktree, not the running Vite test root. No test threshold, skip condition, source budget or guard was weakened.

### Known gaps and handoff state

No claim that this completes Ahavat Torah as a whole, all spatial-contract acceptance for other cuts, canonical engine verification, integration or public publication. The user has not yet confirmed adoption of the visual composition. Source gaps are retained as gaps, not zeroes.

Live coordination was rechecked during acceptance: only the two non-overlapping contract-document claims remain in the bounded scope query. `current_user=supabase_read_only_user`, `transaction_read_only=on` was independently reconfirmed. The journal is still readonly. This is the local AFTER for delivery to ZURIEL; writing ownership of this cut is relinquished at completed handoff, not through a fabricated live journal mutation. Exact remote/clean and final deployment verification belong to the external final receipt. No live AFTER, dispatch or ACK is claimed.

The [compact acceptance record](./ahavat-letters-continuous-20261029/acceptance.json) lists all eleven changed paths and reproducible commands. Retained local screenshots: [desktop source and model](./ahavat-letters-continuous-20261029/source-and-model-1440-parchment.png), [mobile model](./ahavat-letters-continuous-20261029/model-390-parchment.png). These are real native-PDF-byte local tests with service stubs/font requests blocked; they are not physical-device or final hosted screenshots.
