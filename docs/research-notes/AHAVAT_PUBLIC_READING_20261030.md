# אהבת תורה — עריכה לקוראים, 30.10.2026

## BEFORE

Task: `AHAVAT_PUBLIC_READING_20261030`; actor GPT; recipient ZURIEL.
Base: `7c033c048ed0e66f133b93df665a20a26d6dac23`.
Branch: `codex/ahavat-public-reading-20261030`.
Current remote main checked: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; not imported.

The user requested completing Ahavat Torah as a reader-facing product after the public-language audit. This cut edits the existing book's companion prose, explanatory copy and reading entry points, not a new layout, reader or visual system. Existing Design V2 composition, semantic colors, font rules, one explicit GPU and canonical source/unit identities remain. Experience v10 and coordination v17 were checked live; the owner-index v9 pointer is stale. The binding user Books spatial §20 addendum was read from b352aa39 without importing or activating that branch.

Live coordination read succeeded through `supabase_read_only_user`, transaction read-only. The bounded Ahavat/Books lookup returned two contract-doc-only assignments, no overlapping runtime/content writer. This connection cannot record a live BEFORE/AFTER; this is a local scope record, not a claimed live journal entry.

Scope: existing Ahavat page and explanatory data module; companion JSON editorial fields only; exact-content fingerprint tests when affected, dedicated preservation/public-language/browser tests, this receipt and acceptance evidence. Printed source, PDF, OCR, numeric tables, unknown cells, source anchors, identities, layers, verification/access/publication states and other books remain unchanged. Editorial source caveats that affect understanding remain; development/process wording moves into source details or is rewritten as reader guidance.

Story: enter the existing book → choose a concrete source-bound lesson or letters → read Hebrew explanation with the original PDF → navigate/search/full-screen and return to the same unit. No new API/RPC or data writes. Public-facing prose is not a public access grant. Delivery remains protected Preview, noindex, no publication effect, no main/central merge, no Production/Legacy/DB/RLS/permissions change.

Plan: preserve every source-bearing field and all 267 lesson IDs/pages, add direct lesson entry, distinguish the 267 selected explanations from the 15 original research pages, remove internal project language from primary reading, run complete Books unit tests plus relevant browser/source acceptance at 320/390/1440 in three themes, Language/Auth/build/graph/Legacy gates. No raised budget or weakened assertion. Publish only a protected exact-HEAD Preview after gates; record remaining full-commentary/source/engine/public-release gaps honestly and release local ownership at handoff.

## Implemented scope

Runtime commit: `471ecf87b0b09930c3805df9be126af8fb3f0588`.

- The existing entry now names the book and offers three canonical lessons: the 1,820 count (PDF 6), letters and building a home (PDF 46), and Esther's responsibility to act (PDF 93). All use the existing stable unit/link projection; no second reader or identity scheme.
- The opening metrics distinguish 267 selected explanations on 98 pages from the 99-page original PDF, 98 searchable text pages and 13 topics. The historical 15 original research pages remain unchanged and are explained separately in source details. Neither 267 nor 98 means a commentary on every paragraph.
- Internal project language was removed from entry/catalog headings and six section guides, three short companion notes and one finding explanation. Research next steps, calculation keys, original technical states and the publication pipeline remain accessible in explicit source details rather than leading the ordinary reading path. Preview, noindex, read-only and no-publication-effect guards remain.
- Eight exact companion prose fields were edited. Printed text, OCR, all other companion fields, IDs, source anchors, numerical readings and verification/publication/access metadata were preserved. The test-only editorial receipt reverses only those exact eight after-values; existing historical digest constants are not replaced. A new full-bundle digest check and exact after-value checks reject any additional change.
- No font, CSS, theme/palette, frame, renderer, shared-reader, fullscreen component, other-book or dependency change. Existing explicit single-GPU behavior and fallbacks remain; this cut is not a new-model or universal spatial-contract acceptance claim.

## Remaining material and release scope

The 24 unresolved letter/parasha numeric readings and two cumulative checkpoints remain unresolved, not zero. Selected explanations are not an exhaustive paragraph-by-paragraph commentary. No canonical engine was run and no engine verification is claimed. These gaps do not hide the approved source material or prevent reading the full PDF in authorized Preview.

Reader-facing language is not a public permission grant. This delivery does not merge into central/main, enable public routing/indexing, publish findings, change DB/RLS or change Production. A permanent public entry requires a separately scoped site integration/release decision. Physical-device and Safari acceptance are not claimed.

### External deployment identity drift

Before any push/deployment in this cut, direct read-only alias lookups for `sod1820.co.il`, `www.sod1820.co.il` and `sod1820.vercel.app` resolved to `dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`, READY/Production, metadata SHA `8bc5980fe80fdee30652c8f2364608b5916180e3`. Current main's emergency instructions instead name `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq` / `99249526e91f1d720fae1aa43e82bbbe51ee5c45`. The old deployment-alias list returned empty; direct per-domain lookups provided the actual resolution.

This is an unresolved external identity discrepancy, not proof of a 2029 runtime cutover. The deployed commit is unavailable in this Books checkout; no live behavior or cause was inferred from it. No alias, promotion, rollback or Production remediation was attempted. ZURIEL was informed in this conversation. The repository Legacy lock test checks code/routing guards and passes; it does **not** certify that live aliases match the declared deployment pin. Preserve this distinction in release review.

## AFTER — local implementation and acceptance

All **427/427 non-browser Books tests** passed, no skips/cancellations. **40 final browser cases** passed: the new public-reading case covers all nine width/theme contexts; 39 existing regression cases across 20 files passed in one clean sequential runner. These are two accepted partitions (1 + 39), not one single Node test invocation. The 78-unit and 189-unit reading matrices together cover all 267 selected lessons at 320/390/1440 in all three themes. All eight edited fields also have dedicated nine-context selection/source-return checks. Other regressions cover letters, comparisons, atlas, count models, source tables, roots, proofreading, printed notes, parasha counts, native PDF return/completion, unified reader and wide layout.

Language **3/3**, Auth Guard **4/4**, isolation, hardening and repository Legacy code lock passed. Normal 2029, two-flags and actual integrated Preview builds passed. Eager JS gzip: **379,579 / 376,886 / 377,238 bytes**, respectively. No budget, dependency, assertion strength, publication or access gate was relaxed.

The initial prose draft had three failing unit cases: an important bibliographic qualification had been removed; an old closing-checkpoint hash needed the exact editorial replay; a renamed public heading still had an old expectation. The qualification was restored in reader language, old digest constants were retained with the exact eight-field replay and a new whole-bundle preservation test, and the two affected heading expectations were updated without removing coverage/status checks. A second draft had one remaining old-heading expectation. Both failed runs remain in external logs; the final 427-case run passed. Browser acceptance required no retry or assertion weakening.

Local runtime acceptance is pinned to `471ecf87b0b09930c3805df9be126af8fb3f0588`; the delivery commit adds documentation/evidence only. The source/code/test diff from that runtime commit must remain empty. Exact final HEAD, complete commit range, files, remote/clean verification, any protected Preview and hosted acceptance, post-deployment alias observations and final local ownership release are recorded after this receipt in `/workspace/artifacts/ahavat-public-reading-20261030-TlBsKL/handoff.json`. No hosted result is pre-claimed here. No main/central integration or public release is authorized by a passing local suite.

The final broader live ownership lookup found unrelated released shared-frame work, a Sefer Habahir-only content scope and the two contract-doc-only scopes; no overlapping Ahavat writer. Coordination remains v17 and Experience v10. The live journal is read-only: no live BEFORE/AFTER or live release is claimed. Report and final handoff are to ZURIEL only.
