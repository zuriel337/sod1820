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

## Number-page continuation · 11 October 2026

Task `WORLD_2029_GROUP_STREAM_1001_RELEASE_CONTINUATION_V1`, from work-log handoff
`caf0a47d-dd65-484f-8179-6461937c1829` and its Page mockup. Same Preview branch.
The mockup guides composition; live data, media, palette, logo and navigation stay
with their current owners. This is a bounded Number slice of the full 27 items,
not acceptance of the entire plan.

Changes in this slice:

- The 878 anchor explanation only becomes an expression when it exactly matches
  a loaded method-family phrase. The active result comes from the method profile
  or verified trace; an anchor explanation never enters the calculator.
- Regular published, verified phrases load in pages of 30 with a live count;
  the visible expression grid can advance beyond 30. Source and media previews
  reveal the remaining loaded items progressively. Expression and source cards
  open the existing contextual selection/inspector.
- The verse RPC is read through the guarded Preview, and loaded versus total
  is shown separately. For 2029, the live read returned six of eight and the
  explicit continuation loaded all eight.
- Prime Lens uses `number_math_profile` for a bounded exact prime ordinal and
  neighbor gaps. For 787, index 138 opens the generic Number 138 page, where
  `צמח` is available through the normal expression data. The numeric relation
  is not promoted into a verified research finding.
- The page wires its existing Heichal action. Saved public ELS and a new ELS
  investigation are separate explicit entries. Preview worker still blocks
  writes and user-triggered heavy work.

The canonical 27-item record is preserved in full at
`c29a9f97-9a0b-46c2-97cd-ce7b4a50d75a`. This scope's coverage is:

| Item | Status after this Number slice |
| --- | --- |
| 1 World discovery breadth | Open; earlier World implementation retained |
| 2 Compact Home | Open; existing Home retained |
| 3 Now, treasures and time | Open; existing temporal components retained |
| 4 Sod HaHashmal and Zvi | Open visual acceptance |
| 5 Full source library | Open World acceptance; Number's loaded sources now progressive |
| 6 New source stream | Open live source acceptance |
| 7 Human choice of authors | Existing curation retained; open acceptance |
| 8 Original source reading | Number source inspector added; full source opening remains open |
| 9 Human Hebrew labels | Number title kept numeric; wider copy audit open |
| 10 One focused screen | Existing single contextual inspector retained; visual acceptance open |
| 11 Brand palette | Current approved Design V2 tokens inherited; visual acceptance open |
| 12 Compact opening, real media, number focus | Number identity and real media retained; full composition acceptance open |
| 13 Authored interpretation | Existing attributed content retained; consistency open |
| 14 One journey | Existing path continuation retained; account persistence open |
| 15 878 teaching journey | Preset and branches retained; full journey remains open |
| 16 Spatial methods | Existing shared stage retained; M3 acceptance open |
| 17 Prime Lens | Generic bounded prime ordinal and Number re-entry implemented; Heichal/Beit Midrash depth open |
| 18 Explained updates and pulse | Open |
| 19 Explained connection depth | Existing relation cards retained; product acceptance open |
| 20 Historical branches and source media | Existing mapped material retained; breadth open |
| 21 Exact return | Existing path retained; full Post → source → back acceptance open |
| 22 Raziel research continuation | Existing action retained; live learning unproven |
| 23 ELS | Saved library and new search linked separately; account access acceptance open |
| 24 Number Kingdom | Existing game retained; placement open |
| 25 Community and personal area | Open; real account/cloud acceptance unproven |
| 26 Approved visual reference | Current Page mockup read; missing original HTML still open |
| 27 Prior source mappings | Historical record and appendices preserved as pointers; missing originals open |

No merge, production release, product database mutation, authorization change,
corpus rerun or paid AI execution is part of this Preview.

## Post hierarchy and legacy gematria continuation · 11 October 2026

User priority: actual Bennett/elections Posts, the legacy gematria color language,
and independent phrase/value clicks before continuing the broader construction.
The selected Design V2 Night/Day palette remains unchanged. Actor GPT; owner
publishing_content with the existing Experience/Frame/Number consumers.
CLAIM `90df940e-8678-4eb0-984e-9c1c3038610b`; isolated continuation ACK
`6280e96b-332f-4607-a50f-8733d3cdce3c`.

Remote visual-calibration advanced during this work. To preserve the Number
continuation without overwriting its branch, this slice is stacked from
`b25317630fe1c9a16617cbe96a2c28c19c5b7586` on
`gpt/preview-post-hierarchy-20261011`. Main remains
`737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`; no main merge performed.
The new commit changes only the Post consumer/projection, existing gated Preview
CSS, focused Post tests and this handoff; inherited Number changes are not
claimed as new work in this slice.

The hierarchy is now:

- Bennett identifies itself as Bennett, with a thin title and one expandable
  metadata row. The documented event precedes the compact 631 equalities.
  A duplicate large 631 panel is removed. Parent navigation points to the real
  elections Post through `/post/sharshar-elections-redemption-hints-draft`;
  source dates and chronology remain distinct.
- Elections moves the existing 631 block once to the start of the reading body,
  followed by its Bennett continuation. Secondary 26/271/2701/1820/66 sections,
  the later 77 passage, external sources and seven historical connections remain.
  Duplicate visible opening titles and oversized inline typography are compacted
  in the Preview projection. Authored database content is not rewritten.
- Bennett's short composition no longer removes access to its complete source:
  “הפוסט המלא” reveals the existing authored text, including 78, 756 and the
  additional salt/covenant/dead-sea material. A saved deep locator opens this
  disclosure before restoring the source anchor. Existing locator identities
  remain stable; the obsolete introductory heading now maps to the actual event.
- Values use Crown gold at Night, accessible dark gold `#8a6410` at Day;
  expressions retain readable text with a fine gold dotted underline. Both have
  keyboard/touch access to the same existing Number window. Original WordPress
  colored spans and media remain; explicit complete equality lines gain separate
  operand triggers. Existing `/number/...` links open in place on ordinary click,
  retaining their href for modified-click navigation.
- Verified curated equality buttons keep expression/method/value context. A
  historical source claim that has not passed live verification opens the phrase
  and the number independently; its claimed result is not seeded as a verified
  phrase calculation. No new calculation engine, drawer, store or graph exists.

Real acceptance routes, not fabricated Posts:

| Existing Post | Route / source identity |
| --- | --- |
| Bennett | `/post/bennett-melach-631-78`, public Post 5113 |
| Elections | `/post/sharshar-elections-redemption-hints-draft`, public Post 5107 |
| Authored existing gematria/media | `/post/flydubai-fz1073-363-14000-remzei-geula`, public Post 5112 |
| Historical elections, 2021 | `/post/רמזי-הבחירות-הרביעיות-יא-ניסן-יום-הולד`, public Post 906 |

Local acceptance: 24 real layouts (four Posts × Night/Day × 320/390/1440),
48 Number-window interactions, exact URL/scroll/focus return, source disclosure,
deep-locator arrival and elections→Bennett→elections navigation. Headers stay
below 300px, touch values are at least 44px, no horizontal overflow. 35 focused
Post/Number/return/guard tests pass; normal/integrated builds and Frame acceptance
pass. The inherited Number Preview and numberMathProfile checks also pass. Live
deployment SHA and live acceptance are recorded in the short AFTER, after READY.

Evidence: `/workspace/scratch/sod1820-preview-continuation-20261011/post-hierarchy/`
contains `verify.py`, local/live JSON receipts, logs and actual viewport captures.
The three historical `post2029-living-tree-infra` baseline failures described
above remain outside this bounded change; the full historical suite is not
claimed green. This is public/guest acceptance, not real account/cloud-save
certification or exhaustive acceptance of every WordPress layout.

All 27 requirements remain in full at
`c29a9f97-9a0b-46c2-97cd-ce7b4a50d75a`, parent
`4e8c4d18-a65d-401a-8b5f-c98c54f08589`; this handoff is not a replacement plan.
Missing approved `sod1820-one-journey.html` and the six source appendices remain
open. Source streams, complete World/Home acceptance, quality assessment and
future journeys/Raziel/community/account requirements continue under that plan.

Exact inherited sources and legacy visual evidence:
https://github.com/zuriel337/sod1820/blob/b25317630fe1c9a16617cbe96a2c28c19c5b7586/docs/2029-eight-visual-review-handoff.md
https://github.com/zuriel337/sod1820/blob/4b1488498e5b80484b879b74706fbb3628c94978/SOD1820_DESIGN_CONTRACT_V2.md
https://github.com/zuriel337/sod1820/blob/4b1488498e5b80484b879b74706fbb3628c94978/src/legacy/legacy.jsx
https://github.com/zuriel337/sod1820/blob/4b1488498e5b80484b879b74706fbb3628c94978/src/theme.js
https://github.com/zuriel337/sod1820/blob/4b1488498e5b80484b879b74706fbb3628c94978/src/pages/PostEditorPage.jsx
https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm

No ownership change, production deployment, merge, new publication, product DB
write, corpus rerun or paid AI call. Guarded Preview deployment remains the
only authorized release target.
