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
