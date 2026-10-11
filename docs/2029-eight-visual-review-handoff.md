# Eight visual comparisons in the existing App2029

2026-10-11 · GPT · branch-only · IMPLEMENTED / TESTED, not MERGED or LIVE.

The seven earlier options are preserved; option 8 adds the user's latest black,
illuminated reading text and crown-color direction. These are visual comparisons
on the actual ELS, calculator and public-post components, not replacement pages.
The main palette contract remains unchanged pending the user's visual choice.

Review: https://chatgpt.com/space/page_a3aea5b02ac08191ad3bb2a6af98ab4d
This Page contains actual browser captures and a downloadable image comparison,
not an interactive deployed application. Pages rendering was not browser-observed.

## Baseline and preserved requirements

- Branch: `gpt/preview-visual-calibration-20261011`.
- Integrated base: `cf608516e36f2e31e8c1a6092592c4482e3e6328`.
- Remote main verified: `737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`.
  Its countdown removal does not overlap these files. No merge performed.
- Full 27-item report: `c29a9f97-9a0b-46c2-97cd-ce7b4a50d75a`,
  parent `4e8c4d18-a65d-401a-8b5f-c98c54f08589`.
  This visual comparison does not replace or complete that report.
- Restart: `5e799016-2703-4175-a60e-55cacbbe77f0`; latest bounded scope ACK:
  `92db7eb9-d688-42fe-9149-b30d0512b565`.

## Run and review

Use the existing `node scripts/build-integrated-preview.mjs` build and serve
`preview-deploy/dist` with the existing index fallback. The read-only preview
service worker remains intact. Review controls appear only in this build with:

- `/els?visual=8`
- `/2029/gematria?visual=8`
- `/post/mah-kore-nza-hasoara?visual=8`

The selector provides options 1–8; 1–7 retain their earlier palettes and layouts.
Normal production builds exclude the comparison module and its CSS.

Changes: preview-only import in `src/main2029.jsx`, new
`src/components/experience2029/previewVisualReview2029.jsx` and
`previewVisualCalibration2029.css`; review-only collapsed initial recent folder
in `ElsSavedLibrary2029.jsx`; review-only native disclosure for the existing
context strip in `SystemFrame2029.jsx`. Actual engines, research/theme stores,
routes, account actions, matrix/status colors and availability owners retained.

The context disclosure is separate from the introduction toggle. Arrival with
a selection locator, journey or return target opens it; ordinary entry can
expand it explicitly. Existing context fields and exact-return behavior remain.
This is not certification of every historical incoming-context path.

## Verification and limits

- Real Chromium: 72 layouts, 3 actual surfaces × 8 options × 320/390/1440 pixels;
  RTL, no horizontal overflow, retained typed input after canonical initialization.
- Personal overlay: retained account/research sections, bounded height, Escape,
  unchanged URL and exact scroll/focus return. Menu respects reduced motion.
- Context disclosure remains visible when the general introductions are folded.
- Integrated preview build and normal production build pass. Three existing
  read-only service-worker guard tests pass. `git diff --check` clean.
- ELS canonical initialization can populate its initial seed after the host
  input becomes visible. Tests wait for the existing engine's initial state;
  this work does not claim draft retention before initialization completes.
- Guest only; real login/cloud persistence and the full 27 requirements are
  not certified. No user-triggered corpus scan, mapping rerun or paid AI call.
- No push, deployment, merge, product-DB write, schema or ownership change.

Artifacts: `/workspace/scratch/sod1820-preview-continuation-20261011/actual-app/seven/`:
`verification.json`, `verify-seven.py` (now checks eight options), 48 actual
viewport captures, eight comparison sheets, `comparison-self-contained.html`,
`personal-8-390.png`, `menu-8-390.png` and build logs.

Existing originals:
https://github.com/zuriel337/sod1820/blob/cf608516e36f2e31e8c1a6092592c4482e3e6328/docs/2029-integrated-preview-handoff.md
https://github.com/zuriel337/sod1820/blob/cf608516e36f2e31e8c1a6092592c4482e3e6328/SOD1820_DESIGN_CONTRACT_V2.md
https://github.com/zuriel337/sod1820/blob/cf608516e36f2e31e8c1a6092592c4482e3e6328/src/lib/palette.js

## Selected Post continuation · 11 October 2026

The earlier eight-option review above is historical. ZURIEL approved the warm
black/brown/gold Night atmosphere and option 7's Day colors, then explicitly
requested the existing contract update and a working Post Preview. Day colors
do not authorize moving tools to the top. This is a bounded first execution
slice of the existing plan, not a replacement for the full 27 requirements.

Baseline: `dd233ac339fa8ee046664fcd2473c1f9bb170d61` on
`gpt/preview-visual-calibration-20261011`; remote main reverified as
`737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a` before implementation/release.
ACK: `75e49382-11be-43d0-bed1-a33598c8f536`; bounded extensions:
`d6512148-d927-42fa-8008-1575343764f2` (NumberCore palette inheritance),
`3fe8b3d0-a251-48cd-b9c4-9422b1f3a18a` (preview context disclosure gate).
The concurrent personal research writer `aa554bd6-791a-46cc-938a-e0beb283fa45`
excludes shared Frame, providers and engines; its files are not edited here.
Older cumulative visual scopes were released by
`f0b8d21c-6ecc-4d13-b0b4-1c9fc9aafbde`. No ownership records changed.

Changes:
- `SOD1820_DESIGN_CONTRACT_V2.md`: ratified selection and global compactness;
  replaces the navy Night reference and brown-only-in-Parchment restriction.
- `src/lib/palette.js`: same canonical 2029 dark palette now supplies black,
  cream and shared surfaces. Legacy palettes and matrix/status colors intact.
- Existing preview review mount: ordinary entry uses selected Night/Day through
  the existing theme store. Day preference survives navigation and reload.
  Explicit `?visual=1..8` comparison controls remain available. Original eight
  screenshots/source are preserved at the baseline commit and comparison Page;
  the current token refinement is not claimed to be the original eight images.
- `Post2029Page.jsx`: lighter naturally wrapping heading, one collapsed metadata
  row, all categories/date/excerpt/source integrity in expandable details;
  original source body/media stay readable. Hero numbers and authored
  `data-gem` words/numbers open the existing Number window directly.
- `post2029ReadingProjection.js`: verified Bennett/election phrase text is now
  actionable along with its result. Engine verification gates remain intact;
  no saved source text, number calculation or content truth rewritten.
- `NumberCore2029.jsx`: embedded core inherits the Frame palette instead of a
  fixed Legacy Lab palette. Existing profile/trace/spatial owners unchanged.
- `Posts2029Page.jsx` + preview CSS: existing public reader fills compact rows
  with original titles/front images, author/categories/dates and number signals.
  No generated replacement media, mock records or new publication.
- The short mobile context cue is retained. Source/View/Method context remains
  expandable, including ordinary Preview entry without comparison parameters.

Review routes (ordinary selected mode): `/2029/posts`,
`/post/mah-kore-nza-hasoara`, `/post/bennett-melach-631-78`,
`/post/flydubai-fz1073-363-14000-remzei-geula`.

Acceptance evidence:
- 24 actual-public layouts: four surfaces × Night/Day × 320/390/1440 widths;
  no horizontal overflow; Post header below 300px at every tested width.
- Keyboard phrase/legacy number → existing window → Escape retains exact URL,
  scroll and trigger focus; embedded Number core uses the same dark palette.
- Metadata expands; Day persists across Post navigation/reload; choosing Day
  does not move desktop tools above. Reduced-motion preference exercised.
- 30 focused Post/Number/return/connections/guard tests pass; System Frame acceptance
  passes. Integrated and normal builds pass. Final live evidence and exact
  deployed commit are recorded in the short AFTER receipt.
- Three failures in `test/post2029-living-tree-infra.test.mjs` reproduce unchanged
  in the clean baseline `dd233ac339fa8ee046664fcd2473c1f9bb170d61`: outdated full
  wireframe expectation, FZ1073 expecting 6 connections instead of existing 8,
  and an old Bennett fixture expecting a contextual group without verification.
  This continuation does not claim the whole historical suite is green.

Evidence directory:
`/workspace/scratch/sod1820-preview-continuation-20261011/post-selected/`
(`verify.py`, `verification.json`, viewport/window screenshots;
`live-verification.json` added after deployment).

Still open under the existing plan: canonical quality assessment hookup,
remaining Home/World breadth and source/author/topic/time/media acceptance,
all future journey/Prime Lens/Raziel/community/personal depth requirements.
The missing approved `sod1820-one-journey.html` and six original source
appendices remain missing; no corpus rerun substitutes for them. The full
27-section report remains in work_log
`c29a9f97-9a0b-46c2-97cd-ce7b4a50d75a` (parent
`4e8c4d18-a65d-401a-8b5f-c98c54f08589`). Guest/real public readers only; no real
account/cloud-save acceptance, paid AI, corpus scan, product-DB write, merge
or production deployment. Preview write guard retained.

Original selected comparison and full baseline source:
https://chatgpt.com/space/page_a3aea5b02ac08191ad3bb2a6af98ab4d
https://github.com/zuriel337/sod1820/tree/dd233ac339fa8ee046664fcd2473c1f9bb170d61
https://github.com/zuriel337/sod1820/blob/dd233ac339fa8ee046664fcd2473c1f9bb170d61/docs/2029-eight-visual-review-handoff.md
https://github.com/zuriel337/sod1820/blob/cf608516e36f2e31e8c1a6092592c4482e3e6328/docs/2029-integrated-preview-handoff.md
