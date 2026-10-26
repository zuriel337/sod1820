# Writer pages as one Person family, with an identity medallion — visual candidate

Status: IMPLEMENTED / TESTED LOCALLY / BRANCH ONLY. This is a candidate for visual review, not acceptance of the
Person 2029 vision. Nothing here is merged, deployed or released.

- Branch: `claude/writer-person-design-20261024` (Claude visual lane), isolated above
  `gpt/writer-person-projection-20261025` @ `cab54f6ebb0a38ba685945188d8752fe2e10aa7e`. No commit was cherry-picked.
- `origin/main` was `8642f7c93` at start (two commits ahead; Legacy home only, no overlap). Not merged into this branch.
- BEFORE: work_log `ac786626-2268-4a2f-9026-1c9558776a33`, task `WRITER_PERSON_MEDALLION_DESIGN_20261024`.
- Owners read: `project_codex` 24 (`person_foundation_contract`) §§11–15, Design V2, System Frame contract, the
  alignment handoff `writer-person-foundation-alignment-20261025.md`, AGENTS.md, CLAUDE.md.

## What changed

| Area | Change |
| --- | --- |
| Public writer pages (both the general view and the source-catalogue view) | One Person family. The hero now carries the capability language (community member, writer, researcher), the available measurements and the path control, instead of the old five-level rank. |
| Medallion | `ContributorPersonMedallion2029`: public portrait or the name's initials at the centre, a gold/sapphire faceted frame with gentle depth. Clicking the medallion or the "הדרך של …" control opens the path panel. |
| Legacy rank | The public pages no longer show or fetch the 1–5 `research_level_of` rank, "דרגת כותב", "מתוך 5" or the five lights. `/api/public-contributor-rank` is no longer called by public pages. |
| Research standing | An outer ring and a level label render only when the authorized evidence adapter supplies a level for a researcher. Today none does, so no rank is shown and none is invented. |
| Seven axes | Shown progressively, from `view.personProjection`: only measured values, each with a Hebrew scope and source. Unmeasured items are listed once, with a reason, and never as zero. Standing is omitted for non-researchers. |
| Registration | The overview label is now "נרשם לאתר" (was "חבר מאז"). The panel says registration is not community tenure, and historical tenure stays unmeasured. |
| Unresolved binding | The panel states that full connection to the community account and personal area is not complete. |

The medallion's depth encodes nothing. It never encodes rank, score, percentage or threshold. XP is not converted to R0–R7 and five lights were not replaced by eight.

## Meaning, keyboard, screen reader and reduced motion

- The visible name is the page heading. The medallion scene is decorative (`aria-hidden`); the accessible control is the
  button "הדרך של {שם}" with `aria-expanded` and `aria-controls` pointing at a labelled region.
- Enter and Space on the button toggle the panel; focus is visible. Pointer clicks on the medallion do the same.
- Normal motion: a gentle tilt toward a mouse pointer and a short lift when the panel opens.
  Reduced motion: a fixed depth pose, no tilt, no transition, no lift. The open state shows as an outline.
  The same information and the same states are available in both modes.
- Targets are at least 44px; no meaningful text under 14px; colours come from the palette roles (`brandGold`,
  `brandSapphire`, `accentSecondary`, card/ink/border/focus). Gold is identity only.

## Real public examples (live anonymous reads)

| Page | View | Capability (canonical kind) | Measured and shown | Not measured |
| --- | --- | --- | --- | --- |
| `yaniv-levi` | general | כותב (`author`) | cipher records 30, contribution rows 32, posts 7 | activity days, historical tenure, community impact, human recognition (research standing is not applicable: no researcher kind) |
| `tzvi-opoc` | source catalogue | חבר קהילה (`contributor`) | catalogue publications 1,058, with media 148, posts 5 | activity, tenure, impact, recognition, and any publication family without a complete count (listed in the panel) |
| `ariel-ben-moshe` | general | חבר קהילה (`community`) | complete zero for cipher records, contribution rows and posts (kept in the panel, omitted from the compact strip) | activity, tenure, impact, recognition |

Evidence: `writer-person-medallion-evidence-20261024/` — 27 closed captures (3 pages × 320/390/1440 × day/parchment/night),
9 open-panel captures, one fixture capture of the registration wording, and `results.json`. The pages, the public
reader and the Supabase reads are real; `/api/*` is stubbed (the overview and interaction APIs are not available in the
local server), and the product's telemetry writes (`link_identity`, `track_visit`, `ingest_event`) are blocked.

## Verification (own run)

- `node --test` over contributor2029, community and userCenter: 103 pass. New: `contributorPersonView2029.test.js`
  (9 cases: language by capability, measured-only, unmeasured with reasons, measured zero kept, standing only from the
  adapter and only for researchers, registration is not tenure, unresolved binding, no rank vocabulary, initials).
- Projection tests (Person Profile, People Directory) pass; `node scripts/test-legacy-production-lock.mjs` passes;
  `npm run build` (Legacy + 2029) passes; `git diff --check` passes.
- New browser test `test/writer-person-medallion-2029.browser.py`: 27 real-data cases, no horizontal overflow, labels by
  canonical kind, no legacy-rank text or request, toggle and region semantics, keyboard Enter/Space, visible focus,
  reduced-motion static pose and no lift, 3D depth present in normal motion, text ≥14px, fixture registration wording,
  return link. 0 page errors; 0 unexpected writes.
- Updated: `public-contributor-routes`, `public-contributor-actions`, `writer-personal-chain` (public-page portrait
  assertions) and the two review fixtures (they now attach the Person projection). Retired:
  `public-contributor-rank-2029.browser.py` (it asserted the removed public rank display).
  Passing: routes, actions, general, writer-community-reuse, writer-follow-safety, personal-chain (see flake below).

### Known test state (not caused by this change)

- `public-contributor-2029-loader.browser.py`: its route table lacks `writer_public_contributions_page_v1`, which the
  publication reader added; it fails the same way on the base commit.
- `public-contributor-catalog-2029.browser.py`: asserts strings that the base UI no longer has (a community heading in the
  default section; a longer paired-media sentence). Fails on the base commit.
- `writer-personal-chain-2029.browser.py` is intermittent at the page-editor save step on the base commit as well
  (base: 1 pass, 1 fail; this branch: 2 pass, 1 fail). The public-page portrait assertions in it pass here.

## Gaps and dependencies (reported, not solved locally)

1. **Person binding** is still `unresolved`; `personRef` is null. The panel says so. Canonical binding needs the
   privacy-safe resolver (see `person-public-resolver-metrics-privacy-proposal-20261023.md`).
2. **Research Standing** is unmeasured; the medallion has the slot but no data. R0–R7 needs the calibrated evidence adapter and the Human Gate.
3. **Capability labels follow `contributors.kind`.** `tzvi-opoc` has a writer page but `kind=contributor`, so his page says
   "חבר קהילה", not "כותב". Setting his kind belongs to the owner.
4. **Free-text role** from the dossier (for example "חוקר רמזים") is still shown verbatim under the name. It is the person's
   own text, not a capability, and was not changed.
5. **Activity days, historical tenure, community impact** have no public reader; they appear only under "עדיין לא נמדד".
6. `GET /api/public-contributor-rank` remains deployed and the private personal progress page still uses
   `ContributorRankSeal2029` with the legacy rank. Both belong to the personal-area stage.
7. No hosted Preview was verified for the exact SHA from this session (no deployment visibility from the tools used).
8. Browser evidence uses the local build with real public data, not a hosted browser pass.

## Files

New: `ContributorPersonMedallion2029.jsx`, `contributorPersonMedallion2029.css`, `contributorPersonView2029.js`,
`contributorPersonView2029.test.js`, `test/writer-person-medallion-2029.browser.py`, this document and the evidence folder.
Edited: `PublicContributor2029Page.jsx`, `PublicSourceCatalog2029.jsx`, `publicContributor2029.css`,
`ContributorPublicExtras2029.jsx` (wording), `ContributorReadingController2029.jsx` (returns the existing `overview`),
three browser tests and two review fixtures. Retired: one browser test. Not touched: the loader, the projection
adapter, `api/*`, the personal-area page, DB/RLS/privacy/flags.
