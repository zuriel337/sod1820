# Kingdom of Numbers — phase 1 review handoff

## Current: spatial gameplay map — 2026-10-10

Task `KINGDOM_2029_SPATIAL_GAMEPLAY_UPGRADE_V1` · actor GPT · owner Experience / System Frame.
User instruction: execute `e214b459-1a7c-4c2c-9e59-8efe2fd16a18`.
Operational BEFORE/ACK: `f3fa8e71-a496-472c-ba14-a41bd49a3ff3`.
Continued the existing clean local `codex/kingdom-of-numbers-preview` at `ca427973`.
Fetched `origin/main` at `8e939d3b092f267e40d74953b9103711322276d2`: ahead 9, behind 0 before this change.
Previous branch work is preserved. Nothing pushed, merged or released to production.

### Implementation delta

- `src/components/kingdom/KingdomMap2029.jsx`: one bounded CPU SVG world. Curved
  garden conservatory, faceted excavated mine and cylindrical light workshop share
  terrain, a watercourse, bridge and paths. World artwork is separate from the existing
  menu icon family. No new icon registry, palette, WebGL world or game state engine.
- All five upgrades alter geometry from replayed `buildingLevel`: garden colonnade
  and pathway; mine lens and factory path; factory prism assembly; garden bloom;
  mine crystal vein. Pending production adds collectible crystals. Locked, selected
  and opened states have live text labels and accessible buttons as well as art.
- Desktop shows the whole world; <=700px shows a crop centered on one selected
  building with all three accessible selectors. Scenery itself is nonsemantic SVG;
  desktop hit targets and labelled controls open the existing challenge sheet.
  Keyboard selection focuses the sheet; return focuses the exact originating selector.
- `Kingdom2029Page.jsx` / `kingdom2029.css`: explicit optional letter inspection.
  Neither the scene/atlas nor GPU chunk loads on initial game entry. Opening the
  panel loads the unchanged shared scene; explicit depth activation loads the GPU.
  Closing the panel or changing buildings unmounts it. Existing failure/reduced-motion
  behavior and resource cleanup remain in the existing renderer owner.
- Short finite discovery/upgrade/pickup feedback plus a dismissible reward card;
  no timers, urgency or permanent animation. Optional no-motion control and OS/frame
  reduced motion disable CSS effects. Rewards apply immediately, independent of animation.
- Canonical ResearchContext handoff remains unchanged in authority. Its return URL now
  includes the selected building; return restores that selection and replayed progress.
  Vetted ten fixtures, all five costs/gates, bounded event replay, XP/light and production
  reducer are unchanged. No product data or research truth writes.

### Existing design contract application / owner handoff

EXTEND_EXISTING: Design V2 §13 and the approved menu family continue to govern this
projection. Presets, semantic colors, Rubik / Noto Hebrew / IBM Plex Mono, 14px floor,
44px controls, RTL and existing System Frame are consumed without edits to shared owners.
The current operational brief distinguishes spatial gameplay scenery from optional
contour-aware letter inspection; the retired cuboid assets are not restored.

Design V2 currently has active palette and intro writers (`ROYAL_PALETTE_FEEDBACK_20261010`
and `UNIFIED_PAGE_INTRO_ICONS_20261009`). Its file is intentionally not edited in this lane.
For that owner to incorporate when its scope closes: Kingdom world geometry reflects
replayed gameplay state; letter depth is optional and not initial gameplay; bounded
feedback cannot gate a reward; every world target has a labelled keyboard alternative;
mobile keeps one world focus. This is an implementation handoff, not a second contract.
Shared Number/glyph/icon/Journey/Frame sources remain byte-for-byte unchanged this turn.
Only the existing spatial browser harness was adapted to the new explicit inspection entry.

### Verification

- 26 browser cases PASS: 15 Kingdom, 5 spatial GPU/fallback, 5 icon library, 1 loading/performance.
  Covers 320/390/768/1440px and all three presets, RTL, target floors, reduced motion,
  full ten-puzzle/five-upgrade loop, visual level geometry, keyboard sheet/return,
  pending pickup, saved replay, unavailable storage and canonical research return.
- Four reducer tests PASS: ten fixtures against existing engine, gating, replay,
  forged/corrupt data rejection and repeated-answer/upgrade/collect idempotence.
- Both production builds PASS. Source isolation, built graph isolation, Experience
  Context and Number acceptance PASS. Ordinary 2029 manifest excludes Kingdom.
- Existing shared GPU tests PASS after moving their entry behind the optional panel:
  contour/hole picking, letter identity, mobile resize, context-loss/init-failure fallback,
  three presets, Milui fixture and one active GPU. Icon exports/downloads still PASS.
- Evidence: `/workspace/artifacts/kingdom-map/` holds desktop/mobile screenshots for
  initial and evolved maps, full-loop captures and `performance.json`.

### Measured loading / runtime limits

Headless Chromium with SwiftShader, local HTTP, 390×844; one measurement, not a
physical-device benchmark. Map has 102 SVG descendants initially and no canvas.
Initial loaded resources total 443,309 encoded body bytes (includes shared frame).
Opening outlines raises that to 584,221; explicit GPU activation to 725,349.
Bundle sizes raw / gzip / Brotli bytes:

| Chunk | Raw | gzip | Brotli |
| --- | ---: | ---: | ---: |
| Kingdom page + world | 28,920 | 9,191 | 7,983 |
| Optional outlines + atlas | 364,575 | 139,688 | 88,644 |
| Explicit GPU | 550,080 | 141,128 | 114,910 |

Compression columns are independently calculated from final built bytes. Resource
sizes above come from browser Resource Timing. Submit-to-reward next-frame measurement:
17.4ms; GPU button automation-to-ready: 1,150ms. One 95ms initial long task and two
GPU activation long tasks (168/124ms) were observed. These are reported, not hidden
behind an unsupported performance claim. Heap snapshots are in the raw evidence and
are not GPU-memory or leak measurements. Real mobile-device timing/memory acceptance
remains open; no actual-slowdown conclusion is inferred from uncompressed file size.

### Release state

IMPLEMENTED / TESTED / COMMITTED locally. Preview deployment and hosted acceptance
are recorded below when verified. Production remains unchanged. General Supabase
connector used for authorized operational BEFORE/AFTER only; no schema, permissions,
product rows, research values or live laws changed.


## Contour-aware spatial implementation — 2026-10-09

Actor GPT · same task / branch · existing Experience Governance v9 + Design V2.
The user rejected the initial cuboid artwork and authorized continuing the shared
spatial implementation. The single normative definition now lives in
`SOD1820_DESIGN_CONTRACT_V2.md` §13; this handoff contains implementation evidence only.
Earlier cuboid/isometric screenshots/deployments below are historical and rejected.

### Implemented

- Removed Kingdom's cuboids/islands/spires/orbits; preserved game state and mechanics.
- Extended existing Letter Anatomy with optional source-qualified glyph references.
  27 Rubik 700 Hebrew forms derive from pinned Google Fonts revision
  `bd8f81ddb5c74d5c8897b36ad88b440266245103`; font SHA256
  `1b3a7437ba2af80e465e773ed60c5036d1ba6ace492d89046dbcf18fb31e4e88`.
  Exact SVG curves plus sampled CPU contours, ink bounds, advance, holes, source
  occurrence offsets and contour anchors; generator + OFL retained, no font binary.
- One `SpatialGlyphScene2029` consumes those outlines for accessible SVG and lazy
  `GlyphVolume2029` GPU extrusion. Three.js is pinned at 0.180.0. Actual mesh picking,
  limited drag, front/depth keyboard buttons, palette lighting and resize fitting.
  Geometry is display data, never arithmetic or a research authority.
- One active rich focus; event-driven draws without perpetual animation. Renderer
  disposal, context loss, frame/OS reduced motion, save-data and slow-network fallback.
  Existing Experience resolver governs levels; Number remains S1 by default and
  permits S4 only through explicit selected-glyph depth activation (Design §13).
- Milui uses the shared scene with its existing trace/focus/actions and an opening
  expansion whose connector anchors to the actual contour. Removed duplicate letter
  selector, fixed mobile focus layout and raised rebuilt Milui text/control floors.
- Kingdom uses the selected challenge expression. PersonJourney 2029 exposes the same
  scene only after opening the saved-name disclosure behind its existing auth gate;
  no changes to person persistence, Journey paths, research state or private access.
- Offline review at `/spatial-review/` is built only by `preview:kingdom`, never by
  normal product builds. Its `אמא` Milui fixture is the verbatim canonical
  `gematria_method_trace('מילוי','אמא')` read on 2026-10-09 (302). It identifies itself
  as a captured review fixture and cannot save or call live services.

### Validation and limits

- Five geometry tests and four game-state tests PASS. Experience Context and Number
  acceptance checks PASS. Both product builds PASS with existing bundling warnings.
- Browser matrix covers 320/390/768/1440, three presets, full game economy/return and
  unavailable storage; 14 cases PASS in the final release recheck.
- Five additional browser cases PASS in the final release recheck (19 total): GPU selection,
  three presets, resize, context loss/initialization failure, keyboard/reduced motion,
  repeated-letter identity, canonical Milui expansion and one active GPU focus.
  Added pixel-comparison interaction check PASS: dragging the empty ם hole leaves
  orientation unchanged; dragging its visible ink rotates the actual mesh.
- Existing `spatial-letter-anatomy-v1` suite: 13/14 PASS; the Mistater malformed-trace
  test expects PAIR_MISMATCH but receives TRACE_SHAPE_MISMATCH. Reproduced unchanged
  at baseline `faf54356` in an isolated temporary worktree (removed after checking).
  Not caused or repaired here.
- Functional GPU evidence uses headless Chromium / software GPU. Physical-device
  frame-time/memory acceptance is still outstanding; no device performance claim.
- Niqqud/unsupported graphemes retain complete native text and actions, without
  invented contours. Shaped niqqud volumes are NOT IMPLEMENTED.
- Engine trace currently supplies Milui numbers but no canonical letter-name spelling.
  The existing transitional spelling map remains explicitly disclosed; no DB change.
- Saved-name Journey mounting is implemented; real-account acceptance is not claimed.
  Broader Journey choreography and the full Kingdom environment are not yet rebuilt.
- No live Supabase rule/ledger update, main push, merge or production release.
  Scope excludes the active Journey integration and ELS/chrome writers.

Handoff to existing authorized coordinator: retain this task key; implementation is
branch-only. Final commit/preview and final browser results are recorded below when
verified. No dispatch or external message has been sent.

### Verified hosted spatial preview

- Source: `9ee873c1` implementation + `a7ffe34c` published OFL attribution.
- Deployment: `dpl_4sTqByBFf52uBquQtkiLHGduJn5D`, READY, target=null, no aliases.
- Host: `sod1820-72uorcc3i-sod1820-s-projects.vercel.app`.
- Review: `/spatial-review/`; game: `/2029/kingdom`.
- Temporary protected-deployment access was supplied to the user; token is not
  stored in Git. The issued link expires 2026-10-10 21:27 UTC.
- Final local release run: all 19 browser cases PASS. Additional ink-versus-hole
  drag assertion PASS. Nine geometry/game unit tests PASS; Number/Experience checks
  and both product builds PASS. Existing Mistater failure remains disclosed above.
- Fresh hosted mobile browser: HTTP200, real GPU Milui activation, expansion
  א→אלף with canonical fixture value111, navigation to Kingdom, first reward20,
  zero retired cuboids, zero page overflow and zero JavaScript errors.
- Hosted response preserves `connect-src 'self'; form-action 'self'` and noindex.
  All static files include the derivative's OFL notice at `/legal/rubik-outline-OFL.txt`.
- Screenshot: `/workspace/artifacts/kingdom-spatial/hosted-milui-mobile.png`.
- Status: DEFINED / IMPLEMENTED / TESTED / PREVIEW_DEPLOYED. Not merged, not production,
  no live DB/ledger changes. This closes the shared glyph foundation slice, not the
  still-outstanding shaped-niqqud, physical-device and full environment acceptance.

Task: `KINGDOM_OF_NUMBERS_2029_CODEX_MASTER_V1`

## Shared icon library follow-up — 2026-10-09

User request: arrange the existing product icons in the approved menu family and
add suitable, high-quality symbols for the spatial system and Kingdom.

- `NavigationIcon2029` now owns 44 catalogued shapes: the original 16 menu symbols
  plus 28 research, spatial, Kingdom and work-action extensions. Descriptive catalogue
  metadata lives alongside the artwork, not in a second SVG collection.
- Specific aliases now resolve graph→graph, layers→layers, spatial→depth, dna→dna,
  gallery→gallery, signal→signal, portal/door→kingdom, spark→discovery and
  Raziel action→conversation (not a portrait). Unknown
  explicit names produce a help symbol + fallback marker instead of a tools grid.
- `WorkIcon` no longer owns artwork/CSS; like ResearchIcon and SignatureResearchIcon
  it delegates to the menu family. Existing global menu artwork remains unchanged.
- Kingdom consumes garden/mine/combinations, gateway, discovery, upgrades and journal.
  Spatial controls consume Milui, depth, front and rotate icons. Method-stage actions
  replace arbitrary star/diamond text with conversation/Heichal icons. PersonJourney
  entry consumes the shared Journey symbol. These are action symbols, not replacement
  portraits for Raziel or Brand artwork.
- Hebrew Alef icon geometry comes from the same pinned Rubik outline. Its small
  generated asset prevents importing the full spatial atlas/GPU into global chrome;
  the existing font extraction script regenerates it reproducibly.
- `/icon-library/` is an offline review/export page with theme switching, Hebrew
  search, category filters, 16/24/40px comparison and downloads. Exports are generated
  from the actual React owner: 44 SVGs, catalogue and OFL in one deterministic ZIP.
  No new product navigation route/store/schema. `preview:kingdom` builds both review
  pages; ordinary product builds do not include either review fixture.
- Optical SVG bounds checked against viewBox clearance; ZIP CRC and all 44 exported
  payloads match. Both product builds, game-state tests and Number acceptance PASS.
  All 24 library/game/spatial browser cases PASS; hosting is verified separately.
- Design V2's existing icon-family section carries the normative extension. Repository
  contracts only; no live database rule/work-log update, merge or production change.

Hosted icon-library acceptance: source `010964c9f93b46938870bb4f39c0ee667f7d22da`,
deployment `dpl_5JAer38ETPgZpBteFoGHQmufgTFw`, READY / preview / target=null / no aliases.
Host: `sod1820-f34fxi2d1-sod1820-s-projects.vercel.app`, catalogue `/icon-library/`.
Temporary share link supplied directly; expires 2026-10-10 21:48 UTC, no token in Git.
Fresh hosted mobile browser: HTTP200, all44 icons, Hebrew search/selection, successful
`milui.svg` and 37,859-byte `sod1820-icons.zip` downloads; Kingdom renders garden/mine/
combinations, zero overflow and zero JavaScript errors. Self-only API CSP retained.
Screenshot: `/workspace/artifacts/icon-family/hosted-library-mobile.png`.
Local downloadable copy: `/workspace/artifacts/icon-family/sod1820-icons.zip`.
Final catalogue rerun after the save/Raziel-action refinement: all5 tests PASS.

Canonical brief: `work_log.id=48e2c9f4-f83c-42be-9995-769788f64ccc`
Actor: GPT · Date: 2026-10-09
Branch: `codex/kingdom-of-numbers-preview`
Baseline: `origin/main` at `8e939d3b` (clean, no divergence at start)

This is implementation evidence for the existing task, not a new contract or owner.

## Review the game

```sh
npm run preview:kingdom
# Open http://localhost:4173/2029/kingdom
```

The command builds a separate output in `dist/kingdom-preview`, serves the existing
2029 entry on port 4173, and blocks live service connections with a preview-only
CSP. No production credentials or live writes are required. Stop with Ctrl-C.
This is a local working preview, not a hosted deployment or production release.

Normal builds exclude the page and route. `VITE_KINGDOM_PREVIEW=true` is an
explicit build-time opt-in. The `/2029/kingdom` route remains a preview proposal;
no global navigation, route registry, hosting rewrite or public availability is
promoted by this change.

## Implemented

- Gate, CSS isometric map, three buildings, ten Hebrew numeric challenges,
  five upgrades, one internal resource (אור), gameplay XP, and a discovery journal.
- Correct answers reward once. Upgrades enforce prerequisites, discovery counts
  and affordability. Unlocking/upgrading the factory turns subsequent discoveries
  into finite collectible production; collection cannot be repeated for a reward.
- Versioned browser-local demo progress is restored by replaying bounded valid
  actions. Corrupt storage and unavailable storage have safe fallbacks.
- Existing `ResearchIcon`, `SystemFrame2029` (registered `journey` surface), palette,
  typography and theme store. No edits to the active shared-chrome writer's files.
- Existing Number expression/method URLs and frame navigation provide research
  handoff and return; Books and ELS use their existing routes. No parallel engine.
- All presets, RTL, keyboard activation, live feedback, 44px controls and reduced
  motion. Mobile uses compact building rows; desktop has a wide spatial map.

The local preview intentionally blocks online research/auth/analytics traffic.
Research navigation is tested as a route/context handoff, not as a live research
result fetch. Its target pages retain the existing online owners.

## Numeric evidence

All ten operands were checked read-only against canonical project
`linswmnnkjxvweumprav` on 2026-10-09 with `fn_method_profile(phrase,'value')`.
Every selected method was active, definition version 1. The active
`gematria_engine_law` was v2. Operands are exact unpointed Hebrew expressions.

| Expression | Method | Result |
| --- | --- | ---: |
| אב | רגיל | 3 |
| לב | רגיל | 32 |
| אור | רגיל | 207 |
| חיים | רגיל | 68 |
| שלום | רגיל | 376 |
| מלך | סידורי | 36 |
| אחד | רגיל | 13 |
| אהבה | רגיל | 13 |
| תורה | סידורי | 53 |
| ברכה | סידורי | 38 |

Replay the fixture evidence using SELECT only:

```sql
select f.phrase, p.method_key, p.computed_value,
       p.lifecycle_active, p.definition_version
from (values
  ('אב','רגיל'), ('לב','רגיל'), ('אור','רגיל'), ('חיים','רגיל'),
  ('שלום','רגיל'), ('מלך','סידורי'), ('אחד','רגיל'), ('אהבה','רגיל'),
  ('תורה','סידורי'), ('ברכה','סידורי')
) f(phrase,method)
cross join lateral public.fn_method_profile(f.phrase,'value') p
where p.method_key=f.method;
```

The UI reuses `METHODS` from `src/lib/gematria.js` and fails closed when a fixture
no longer agrees. It does not claim current server validation of a player's answer.
The fixture verification date and gameplay/research distinction are visible in
the journal. Equal numbers do not establish a historical or interpretive claim.

## Verification

- `npm run test:kingdom`: 4 tests pass, including all ten engine fixtures,
  invalid/duplicate/locked actions, the complete economy and corrupt save replay.
- Playwright: 14 cases pass: 320/390/768/1440px × Day/Parchment/Night; complete
  ten-challenge/five-upgrade flow; unavailable local storage. Tests include RTL,
  no horizontal overflow, minimum control dimensions, reduced motion, keyboard
  entry, wrong answers, hints, reload persistence, journal and research handoff.
- Targeted follow-up: the complete game → Number → canonical exact-return flow passes after wiring the destination context in the game adapter.
- `npm run build`: legacy and 2029 builds pass; the default production manifest contains no Kingdom page.
- Existing isolation source/built-graph, System Frame and calculator Golden checks pass.
- Screenshots: `/workspace/artifacts/kingdom/` (local review artifacts).

Browser runner: `@playwright/test@1.55.0`, installed outside the repo. The downloaded
Chromium 140 rendered even a plain Hello page with no text in this environment;
using `/usr/bin/chromium` restored text rendering. No product workaround was added.

To run browser acceptance against the local preview, install Playwright in your
normal test environment and run:

```sh
npx playwright test tests/kingdom2029-preview.spec.cjs
# Optional environment-specific executable:
KINGDOM_CHROMIUM=/usr/bin/chromium npx playwright test tests/kingdom2029-preview.spec.cjs
```

## Boundaries and next handoff

Owner verdict: EXTEND_EXISTING — Experience/Design V2/System Frame, Gematria
Engine/Method Registry, Research OS navigation. No new owner, icon registry,
calculator, ELS implementation, research store or analytics system.

Live coordination was read through the general Supabase connector (not a
technically read-only credential), using SELECTs only. Relevant current writers
were checked before implementation and again at completion. The existing
SystemFrame header/rail writer was excluded; no overlapping Kingdom/App2029
writer was found in the bounded live scan. No claim, ACK or AFTER was written to
Supabase because this session preserves the user's no-live-database-write boundary.
The canonical task therefore still reads PLANNED; this file does not imply that
an authorized coordinator received or recorded an AFTER.

Release advice: HOLD_FOR_PHASE_1_REVIEW. Implemented and locally tested;
not merged, deployed, or LIVE. No main push or database changes.

Before phase 2, review the route and game direction, obtain approval for server
persistence, and resolve the existing authorized server owner for transactional,
idempotent rewards, account-scoped access and rate limits. Local demo actions and
balances are editable by the browser and must never be imported as trusted server
balances, account credit, researcher mastery or research truth. No automatic
migration of local demo progress is provided. Social sharing, account persistence,
production analytics and the advanced zones remain deferred as in the brief.

Handoff to: existing authorized coordinator / ZURIEL for prototype review.

## Hosted review follow-up — 2026-10-09

After the user reported that the localhost link was inaccessible, the tested
static output from commit `90b9e5a7687531377063561fca431f004610c0f1` was uploaded
as a Preview to the existing Vercel project `sod1820` (team
`team_vtfWHZfKvdbob8gvynQb5N89`, project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`).
This supersedes the initial local-only deployment status above.

- Deployment: `dpl_3LugfJCw1PUcbAm1tPidMMWCsCwa`, READY, preview (`target=null`).
- Host: `sod1820-fl0x5w1xb-sod1820-s-projects.vercel.app`, path `/2029/kingdom`.
- Build: static Vite/React output, about 3 seconds; no server functions supplied.
- Protection remains enabled; a deployment-scoped share link valid for seven days
  was supplied directly to the user, without storing its token in Git.
- A fresh mobile browser opened the shared URL with HTTP 200, entered the kingdom,
  solved the first challenge and received 20 demo light; zero JavaScript errors.
- Response CSP `connect-src 'self'; form-action 'self'` preserves the live-service
  boundary. No custom production alias, main push, merge or database write.
- Hosted browser screenshot: `/workspace/artifacts/kingdom/hosted-mobile.png`.

## Icon-family correction — 2026-10-09

The user explicitly superseded the original icon mapping: use the newly approved
menu family throughout the site. Kingdom now imports `NavigationIcon2029`
directly. Existing `ResearchIcon` and `SignatureResearchIcon` consumers delegate
to that same owner; the old SVG collection, tone skins, orbital frame and their
component-level motion import are removed. The current repository consumers of
that older family are Kingdom and EntityHubPreviewPage. Existing menu artwork
and its default CSS sizing remain unchanged; explicit sizes serve game buildings.
The current Design V2 document records this instruction for future consumers.
This replaces the older brief's preference for the original ResearchIcon artwork.

Icon correction verification: dual builds and the existing isolation/frame checks
pass, all 14 Kingdom browser cases pass, and a browser inspection of Entity Hub
found 26 compatibility icons / 26 shared menu SVGs, zero old `.rf-icon` or
`.sig-icon` elements, and no empty glyphs.

Updated hosted icon preview: `dpl_FoBFUA3myJDkbRWHyPPC7AFnPJqW`, source commit
`2090e93d372e663a6f35958a4baad28fbbc64e0e`, READY / preview, no production aliases.
Host: `sod1820-qqjgkkrex-sod1820-s-projects.vercel.app`. Fresh mobile verification
returned HTTP 200, 16 shared game icons, zero old icons, a successful 20-light
first reward and zero JavaScript errors. The deployment-scoped seven-day share
link was supplied directly to the user; no share token is stored in this document.
