# אהבת תורה — מרכוז פעולות, 30.10.2026

## BEFORE

Task: `AHAVAT_CENTERED_ACTIONS_20261030`; actor GPT; recipient ZURIEL.
Branch: `codex/ahavat-centered-actions-20261030`.
Base: `ee18875eb3aeec5c319e286458eb00cc8233cb6a`.
Remote source matched this SHA; central Books remains `40382ae21b9ca2d6ca38f58c387542b993d18f69`, main `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; neither imported.

Human Gate for this bounded application: «במקביל תחפש אם ניסחתי איזה חוק שאני רוצה כפתורים שיהיו ממורכזים ולהכיל אותם גם כאן». This explicitly extends the existing centering direction to this book's action rows, not a new visual design or a general transfer of the mandatory Claude visual lane. No shared primitive, global layout, source prose alignment, typography, theme, model or source identity is redesigned.

Live read-only coordination was checked before writing. Relevant current assignments are contract-document-only; no overlapping Ahavat CSS, runtime or test writer was found. `work_log_current` remains read-only; this file is a local BEFORE, not a claimed live journal entry. All reports go to ZURIEL, no GPT dispatch/ACK or agent activation.

## Existing direction found

- Live `project_codex` id **37**, `sod1820_reality_stream_os_master_v3_20261016_draft`, updated 29.10.2026, contains the explicit Heichal entry decision: «יש למרכז ... כפתורי הפעולה ושערי התחומים, בתוך רוחב תוכן תחום עם מרווחים מאוזנים». It also excludes `justify-content:space-between` in that entry. Its stated scope is **Heichal entry only**, not all site buttons; the surrounding master document is DRAFT, not a newly activated universal button law.
- Active rule `22d840bd-fcb5-4f2f-a7dc-6bdc7fb71c5c`, actual rule version **21** (label still says v19), requires the stream Follow control to be «קומפקטי, ממורכז, שורה אחת ... לא צמוד-ימין». This is a scoped Follow rule, not authorization to change Follow or introduce it in Books.
- Current Design V2, active canonical UI v11 and coordination v17 preserve semantic tokens, RTL, readable labels, ≥44×44 targets and existing component/visual ownership. No general requirement to center every reading card, table, input or navigation item was found in the bounded owner search.

The present user instruction applies **placement of action rows and centered control labels** to Ahavat only. Long labels may wrap on mobile; the Follow-specific single-line rule is not copied onto unrelated book actions. Reading prose and source tables retain their reading alignment.

## Scope and acceptance plan

Edit only existing Ahavat CSS (`src/pages/ahavatTorahSystem2029.css` and `src/components/books2029/ahavatBookPresentation2029.css`), focused tests and this receipt. Center existing entry, explanation/source, comparison and simple reader-footer actions; keep the existing mobile reflow, native PDF toolbar, page-number navigation and source-return identity. No new action/component/store or conditional data path.

Verify 320/390/1440 × Day/Parchment/Night: actual action-row geometry, label centering, target size, wrapping/no horizontal overflow, RTL reading alignment, source selection, refresh and exact return. Test original PDF separately from mocked UI services; state that distinction. Run the complete non-browser Books suite, relevant existing browser regressions, Language/Auth, 2029 normal/Preview builds and graph/weight, isolation/hardening and Legacy code lock. No weakened assertion or raised weight budget.

No book data, OCR, numbers/nulls, PDF anchors, shared reader/frame/fullscreen primitive, other book, DB/RLS/permissions or access/publication change. No main/central merge or Production. A protected Preview may be created only after passing gates; it is not permanent public release. The previously reported live deployment-pin discrepancy is not repaired by this cut.

## Read-only public-entry check

The existing active book identity is `18fdaa95-86cd-4100-82ad-59ee8c690b9a`, `book:ahavat-torah`, slug `ahavat-torah`. It differs appropriately from the printed source/witness identity `book:hebrewbooks:5635`; no identity was created or rewritten. A separate anonymous **GET** using the application's existing public client returned **HTTP 200 and that exact Book row** under current RLS. This is evidence for the public Book identity only, not publication of every research row or permission to change live routing.

`Books2029Page → BookSourceReader2029` already resolves this identity through `fetchBookEntityBySlug`. The deep Ahavat experience is still mounted as `surface=ahavat-torah-system` only behind `VITE_BOOK_PUBLICATION_REVIEW_PREVIEW`. The integrated protected Preview deliberately enables this flag. Removing the flag, widening DB access or making the Preview fallback a public synthetic identity is not the integration plan.

Permanent public delivery requires the site-owner's separately scoped integration of this lineage into the existing Books entry and normal release gates. This cut does not change the shared reader, public route, feature flag, noindex, launch lock or publication/access status. The current evidence does **not** justify describing missing public `Book` SELECT permission as a blocker, or importing the older Bentov findings CHECK/RPC issue as an Ahavat reader requirement.

## AFTER — implementation complete, reader acceptance blocked

Runtime commit: `aed77b464e749ea63a381d4f5c3d88280e9bb71e`.
The subsequent delivery commit adds only this receipt and failure observations to the existing comparison browser test; it changes no runtime/source asset.

### Implemented and verified

- Existing Ahavat entry, explanation/source, comparison, letter-journey and simple reader-footer action rows center. Control labels center; long action labels can wrap, and targets stay ≥44×44px. Book prose, tables, navigation grids, source identity, themes and shared primitives are unchanged.
- **427/427 non-browser Books tests**, no skips/cancellations.
- New centered-action browser case: **1/1**, covering **9/9** contexts (320/390/1440 × Day/Parchment/Night), 24 visible book-entry rows and five focused-letter action rows per context, plus selected lesson/finding actions. Actual per-flex-line geometry, labels/target sizes, reading RTL alignment, keyboard source return, refresh, no auto GPU and no horizontal page overflow passed. This matrix uses local service stubs and aborts PDF/font requests; it is **not native-PDF or real-font acceptance**.
- Language **3/3**, Auth Guard **4/4**, isolation, hardening and repository Legacy code lock passed.
- Normal, two-flags and actual integrated Preview builds and graph/weight gates passed in an isolated build worktree at the runtime commit. Eager gzip JS: **379,579 / 376,905 / 377,222 bytes**. No budget, dependency or assertion was relaxed.
- The first draft of the new browser case failed because its browser callback did not receive the selector list. Passing that list explicitly fixed the test fixture; its assertions were not removed or weakened. Both logs are retained.

### Blocking native-source evidence — no new Preview

The five-file existing browser regression batch failed in `ahavat-letter-source-comparison-2029.browser.test.mjs` on the **initial** native physical page 36 at desktop after all six mobile contexts passed. On observing the failure, the batch was stopped: **one failed / four cancelled**, not five accepted cases. A few visual-workspace contexts had run before interruption; they are not counted as completed acceptance.

A separate cold 1440/Day diagnostic loaded page 36 correctly for **both** the approved base and current CSS. Final iframe geometry was identical (341.8125×436.859375px); this neither identifies a cause nor proves absence of a timing regression. The existing comparison test was then extended with **failure-only observations and screenshot capture**, preserving its 120×150ms poll limit and exact native geometry predicate, without retries or a URL/counter fallback.

That single instrumented rerun passed eight contexts but failed again on initial page 36 at **1440/Night**. The retained screenshot shows the **title page**, not the requested page. Native state was `success`, 99 document pages, viewport height 379px, but the requested page's rect.y was **12,429.051724137931px**, far outside the viewport. The UI still requested page 36. This is a real source-navigation acceptance failure in the local original-byte fixture, not an acceptable rounding tolerance or an empty-data state. Do not replace this assertion with an iframe URL, most-visible-page counter, screenshot label or an automatic test retry.

No product fix or root cause is claimed. Whether this is a pre-existing native-viewer/fixture lifecycle issue or a regression remains unresolved. The other four regression files have **not** completed cleanly in this cut. No new protected deployment, share URL, public release or full reader acceptance is claimed; the earlier Preview is not relabelled as this branch's updated product. Next source-reader work must reproduce the requested-page/title-page mismatch and restore exact physical anchors before completing the remaining regression gates. Do not add a second reader, source identity or browser-specific navigation hack as a cosmetic workaround.

### Preservation, dependencies and handoff

All changes are confined to two Ahavat CSS files, one new browser test, failure-only diagnostics in the existing comparison browser test and this receipt. The complete `public/`, `src/data/`, shared reader/fullscreen/frame, other books, build scripts and package/lock files have no diff from the base. The original 99-page PDF SHA-256 remains `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`. No 267-unit IDs, source anchors, author text, OCR, numbers/nulls, access/publication states or engine labels changed.

External evidence: `/workspace/artifacts/ahavat-centered-actions-20261030-lSqJa7/`, including centered-entry screenshots, unit/gate/build logs, failed/cancelled batch, cold base/current observations, instrumented rerun, actual source-failure JSON/screenshot and a **prepared but never run** remaining-browser/hosted runner. These diagnostic runners are not passing acceptance evidence. No browser auth state or share token is stored in this receipt/evidence.

No dependency was installed or changed. Existing shared dependencies were used through task-local symlinks, removed at handoff after validation. No main/central merge, Production, alias/protection mutation, DB/RLS/permissions or publication. The previously observed external deployment-pin discrepancy remains separate and unresolved; a passing code lock is not proof of live alias pin identity.

Final branch/HEAD, complete range, remote/clean verification and local ownership release are in the external handoff. Files/scope are released to ZURIEL at this checkpoint; the live journal is read-only, so no live BEFORE/AFTER/release is claimed. Status: **IMPLEMENTED / PARTIALLY_TESTED / BLOCKED_FOR_PREVIEW_AND_READER_ACCEPTANCE**, not PR_READY, MERGED, LIVE or complete-book acceptance.
