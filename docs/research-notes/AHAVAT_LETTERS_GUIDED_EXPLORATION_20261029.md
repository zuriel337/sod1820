# Ahavat Torah — guided letters continuation

## BEFORE · GPT → ZURIEL · 29 October 2026

Base `65c7759430e8c66bbfb5c6eae7d809f405473a3d`; isolated branch `codex/ahavat-letters-guided-exploration-20261029`. User requested further batches after reviewing the preceding Preview. Continue only the expressly approved GPT visual-writer exception for the Ahavat letters cut; no global policy/law change or other-book redesign.

Live readonly coordination verified `supabase_read_only_user`, read-only transaction, Experience v10 / coordination v17. No overlapping runtime/visual task; two older contract-document tasks exclude this scope. Site main observed `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; no automatic import/merge of main or central books. This is a local receipt, not a live journal claim.

EXTEND_EXISTING: Experience v10, Design V2 and binding user Books spatial requirements (branch addendum 1.1, not imported/activated). Source and reading IDs stay with existing adapters; no second reader, palette, route, registry, calculator or engine.

Three bounded batches:

1. Previous/next printed letter-form navigation, keeping finals and shin/sin distinct, and existing URL/source state.
2. Source-bound parasha learning: choose/step a row, inspect printed count and Hebrew companion explanation, open its exact PDF and return to the same selected reading. No invented readings or source quotations. Missing values remain null, never zero.
3. Keyboard/touch camera controls in the existing explicit lazy letter model; no automatic GPU, no other-mode restyling, same fallback/resource/focus behavior.

Intended runtime paths: existing Ahavat page, letters study component/CSS, existing spatial renderer, new letters-only parasha presentation if needed. Dedicated tests and this receipt. `src/data/`, `public/book-data/`, PDFs, BookSourceReader, SystemFrame, Legacy, World/Post, DB/RLS/permissions, main and Production stay unchanged. Protected Preview only after gates. Journal cannot be written through this readonly connector; no live BEFORE/AFTER fabricated.

## AFTER

IMPLEMENTED / LOCALLY TESTED / BRANCH-ONLY. All local gates passed; protected Preview and its independent hosted receipt may now be created from the exact pushed delivery SHA. No integration, Production release or complete-book claim. Visual adoption remains ZURIEL's Human Gate.

## Implemented batches

- `1ccc56c7`: previous/next source letter forms. Navigation stops at source boundaries and preserves finals and shin/sin. Exploring does not force a PDF scroll.
- `b96255ac`: parasha companion, source count and printed numeral, previous/next parasha in the selected book, explicit source action. Uses existing row values only. In focused study the selected detail owns that existing unit's one canonical DOM anchor; the corresponding table row does not duplicate it. Full-book/count-reader anchors retain their previous behavior.
- `b05ddaed`: five keyboard/touch-compatible camera controls, only for the letter model. Existing OrbitControls and disposal are reused, with bounded zoom, no automatic movement and disabled controls when unavailable/lost.
- `550caf0438996589ed4bb70710362dd93db1da8f`: stable letter camera options and nine-context guided acceptance. The same canvas survives parasha selection, source opening and fullscreen. Reload restores the reading identity but does not automatically restart GPU.

Product story: printed form → book → chosen parasha → printed value / separately labelled companion explanation → exact source page → return to the same selected detail. No new quotation, source reading, inferred value or engine-verification assertion.

## Preserved source / scope

Source `book:hebrewbooks:5635`, 99-page PDF SHA-256 `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`. `src/data/` and `public/book-data/` are unchanged from base. All 28 forms, 54 parashot / 1,512 rows, 24 unresolved row values and two unresolved cumulative checkpoints remain. No change to the existing 267 companion units, original PDFs or editorial-note identities.

The parasha explanation is new companion prose about the existing printed count structure, not a quotation or a verified independent count. A missing numeric value is text, never zero. Displaying approved material is not blocked by an unrun engine.

## Local acceptance

- Full non-browser Books selection: **407/407**, no skips.
- New guided browser matrix: **9/9** width/preset combinations inside one test, no skips; actual native PDF pages **35/36/37**, source-return focus, reload, fullscreen, five camera actions, persistent canvas, disposal, final/shin boundaries and null-row rendering.
- Language **3/3**, Preview Auth Guard **4/4**; Legacy lock, isolation and hardening: PASS.
- Normal 2029, two-flag Preview and actual `preview-deploy` builds and their graph/weight gates: PASS. Integrated eager JS gzip **377,236 bytes**, eight eager / 151 reachable records. No raised budgets or weakened existing tests.
- Existing browser regressions: **16/16**, no skips, fresh full serial run. Includes all original letter/fallback/motion/native-PDF checks; count source models; the previous focused letters matrix; unit return; people/roots/megillot; spatial tables/desktop no-overlap; all eight unified readers; and both books' nine-context width matrix plus both original native PDFs. Combined with the new guided test: **17/17 browser tests**, with nine width/preset combinations in the new guided test. No deployment claim is inferred from local tests alone.

### Motion-harness synchronization finding

The first regression run timed out at the existing motion test line 118 (manual frame-true expectation). Its isolated replay passed unchanged. Inspection shows the frame owns `data-frame-reduced-motion` through React state from its OS media listener, while the test immediately overwrites that attribute: a pending canonical true→false commit can overwrite its manual true. The interrupted preflight is not counted as green (nine passes, one failure, five cancelled at interruption).

Bounded QA scope addition, commit `01af754f`: `test/ahavat-letter-spatial-acceptance-2029.browser.test.mjs` additionally awaits the canonical frame's initial true state and completed OS→false transition before simulating the independent frame choice. All original renderer expectations, three preference transitions, timeout budgets and fallback/resource assertions remain unchanged. No SystemFrame or product motion policy is changed. The fresh full serial run passed **16/16**, including this unchanged-behavior motion test; the interrupted preflight and isolated diagnostic are not counted as final acceptance.

## Delivery paths and continuity

Eleven changed paths from the approved base:

- `src/pages/AhavatTorahSystem2029Page.jsx`.
- `src/components/books2029/AhavatLetterStudy2029.jsx`.
- `src/components/books2029/AhavatLetterParasha2029.jsx` (new).
- `src/components/books2029/ahavatLetterStudy2029.css`.
- `src/components/books2029/AhavatTorahSpatialScene2029.jsx`.
- `test/ahavat-letter-guided-exploration-2029.test.mjs` (new).
- `test/ahavat-letter-guided-exploration-2029.browser.test.mjs` (new).
- `test/ahavat-letter-spatial-acceptance-2029.browser.test.mjs` (five synchronization lines added; no original expectation removed).
- This BEFORE/AFTER receipt.
- [Desktop camera/source screenshot](ahavat-letters-guided-20261029/desktop-camera-and-source.png).
- [Mobile camera controls](ahavat-letters-guided-20261029/mobile-camera-controls.png).

Runtime checkpoint `550caf0438996589ed4bb70710362dd93db1da8f`. Subsequent changes are QA synchronization and the final receipt/screenshots only. Exact delivery HEAD, full six-commit range, remote equality, clean-tree proof and protected deployment receipt are supplied to ZURIEL separately (no share credential or self-referential commit hash here). No cherry-pick, base replacement, central or main merge.

Reproduction logs and all nine guided screenshots: `/workspace/artifacts/ahavat-letters-guided-20261029/`. Hosted verification runs separately without mocks, retaining TLS checks and SSO protection; its receipt is outside Git so the tested/deployed delivery SHA stays immutable.

Local writing ownership ends at delivery of the clean pushed branch. No other agent was activated and no GPT-directed ACK/report was sent. The journal remains readonly: no live AFTER or live release record is fabricated. Remaining source gaps (24 row values / two checkpoints), unrun canonical engine, non-exhaustive 267 companion units and physical-device/Safari coverage remain explicit. Other structures/books do not inherit universal spatial acceptance from this letters cut. Legacy, main, Production, DB/RLS/permissions, publication and shared SystemFrame remain unchanged.

Local fixtures use the real hash-matched PDF but stub auth/data transport and block remote fonts. Chromium/SwiftShader and viewport/keyboard tests are not physical-device/Safari proof. Hosted verification is a separate no-mock/TLS-preserving receipt after deployment. The live journal is readonly; no live AFTER has been written or claimed.
