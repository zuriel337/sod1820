# W1 Slice 2 — Canonical Controls + Share 2029 Foundation V1

**Task key:** `W1_SLICE2_CANONICAL_CONTROLS_SHARE_2029_FOUNDATION_V1`
**Dispatch:** work_log `81ef997d-b9c5-4683-9b5b-70985bac459c` · **ACK:** `c6995105-bc78-4fa4-ae9c-516f1c77b69c`
**Owners (EXTEND_EXISTING):** `canonical_ui_components_law` v5 · `share_placement_law` · `SOD1820_DESIGN_CONTRACT_V1` + palette · `research_workspace_law` v2 · existing `share.js` / `ShareActions.jsx` / `propagation.js` / `api/og` + `api/card`
**Baseline:** `origin/main = b32ce03dcdf1b285fca2c96f587624f2a924bcc2`
**Release state:** BRANCH ONLY — NOT MERGED · NOT DEPLOYED · NOT LIVE.

No new Contract/Law/System/Store/Engine/Registry/global UI owner. `traffic_intelligence_law` untouched.

---

## 1. The boundary this slice had to respect

`SHARE_ATTRIBUTION_CONTRACT_SYNC` (work_log `1edf4edd`) splits ownership: the SHARE workstream
**produces** telemetry, the ANALYTICS workstream **interprets** it. So the hard rule adopted
here is that **every field analytics reads today is emitted byte-identically**, and richer
evidence is additive only.

That rule is enforced by a test, not by a promise — `test/share-object-foundation.test.mjs`
asserts the serialized payload of both existing producers.

## 2. Scope A — canonical controls

| File | Role |
|---|---|
| `src/lib/controls/controlSpec.js` | Pure spec: 4 roles × 7 states, geometry, ARIA, focus CSS. Zero imports. |
| `src/components/controls/Control.jsx` | The shared primitive. Renders `<a>` when given `href`, else `<button>`. |

- **No hard-coded shared-control palette.** Every colour is read from the palette object
  passed in, so a control is automatically correct in dark, light and the lab skin.
  A test proves it by rendering two synthetic palettes and requiring the output to differ.
- **One touch floor:** `CONTROL_MIN_TOUCH = 44` in a single place (`research_workspace_law`).
  This raises the share buttons from 40px to 44px — a deliberate, visible 4px change.
- **`building` / `locked` are first-class states** that stay focusable and readable, because
  the frame contract requires a future/gated capability to look intentional rather than broken.
- **One focus ring**, injected once per document, using `currentColor` so it is theme-correct
  without knowing the theme. Keyboard modality only.

### Verdict on QuickActions + DocActions (the dispatch asked for a decision)

**Do not merge them.** Evidence gathered live on main:
- `DocActions` contains **no share code at all** (print + save only), so there is no duplicated
  share behavior to consolidate;
- their only overlap is `saveItem`, and both already call the *same* owner (`ResearchProvider`);
- they are different semantic families — entity actions vs document actions.

Merging would create a new global action owner for no gain. They converge at the **primitive**
(`Control`) — shared appearance, states and focus — not at the component. A test locks this in
by asserting `DocActions` stays share-free.

> Correction to the dispatch's gap list: the stale claim is broader than stated. There is no
> `ToolActions.jsx` on main at all. `CLAUDE.md` still describes ToolActions as the canonical
> merged component — that is **STALE DOCUMENTATION**.

## 3. Scope B — Share Object / Intent

`src/lib/share/shareObject.js` — pure, dependency-free, unit-testable. `createShareIntent()`
normalizes: entity identity + canonical URL, source surface, subtype, channel, modality,
media refs, locale, exact-state deep link, and opaque identity/entitlement context.

- **Backward compatible by construction:** every field is optional and legacy prop names
  (`type`, `url`) are accepted alongside the new ones. An empty call yields a valid link share.
- **Available now:** link · rich card · image file.
- **Seams only** (declared, deliberately unbuilt, each naming what it still needs):
  `video_file`, `clip`, `state_capture`, `journey_point`, `research_finding`, `embed`.
  No speculative exporters were written.

## 4. Scope C — attribution-producing UI

`src/lib/share/shareTelemetry.js` is the single emit path. Both producers now route through it:

| Producer | Serialized meta before | Serialized meta after |
|---|---|---|
| `ShareActions` | `platform`, `content_type`, `url`, (`image`) | identical **+** `share_object` |
| `QuickActions` | `platform`, `content_type`, `content_id` | identical **+** `share_object` |

`share_object` is the one additive, namespaced key. No current reader consumes it, so it
**cannot** change existing analytics interpretation. It is **NON-CANONICAL pending Analytics
reconciliation**.

Two things were deliberately **not** "fixed", because both would change analytics interpretation
and that decision belongs to the Analytics owner:
1. an image share still emits `meta.platform="image"` — the legacy producer conflates channel
   with modality. The truth is recorded separately in `share_object.channel` / `.modality`.
2. `QuickActions` keeps `landingKey(pathname)` for its slug rather than adopting `shareSlug`'s
   hostname check. Identical in production; different on a non-canonical host — so it was left alone.

## 5. Scope D / E / F

- **D (Premium/rewards):** seams only. `context` is carried **opaquely** and never interpreted.
  No credits, no reward amounts, no tier gates, no referral economics, no rewards table, and no
  assumption that sharing implies a human. `trackShare` was deliberately **not** adopted — it
  carries `award_share_credit`. A test asserts no business-rule vocabulary appears.
- **E (multilingual):** one share identity, one canonical entity. `locale` is normalized and
  affects representation only; a test asserts two locales produce the same canonical URL.
- **F (media):** `resolveModality()` resolves the requested modality against **real** capability
  and reports honest degradation (`degradedFrom` + `reason`). Every modality carries the
  canonical attributed link. The old "video must always be link-only" assumption is treated as a
  default, not a permanent law; `shareVideoToStory` behavior is unchanged.

## 6. Acceptance matrix

| | **Number** | **Post** | **Video (story)** | **3D / spatial** |
|---|---|---|---|---|
| Entry point | `QuickActions` on `EntityPageBase` | `ShareActions` | `shareVideoToStory` via `StoryViewer` / `OrGeulaPage` | `ShareActions` on `Gematria3DPage` |
| entity_type / id | `number` / entity id | `post` / — | story item id | `page` / — |
| Canonical URL | `/number/:n` | `/:slug` | story/post URL | `/spatial-gematria` (+ `/gematria-3d` alias) |
| Share subtype | `share` | `share` | `share_story` | `share` |
| Channel | `copy` | native · wa · tg · fb · x · email · copy | native/link | same as Post |
| Modality | `link` | `link` · `card` · `image_file` | `link` | `link` |
| Source surface | `QuickActions` | caller-supplied | `StoryViewer` / `OR_GEULA_PAGE` | caller-supplied |
| Outbound attribution | `rid` + `src=copy` | `rid` + `src=<channel>` | `rid` + `src` | `rid` + `src=<channel>` |
| Emitted event | `share` / section `share` | `share` / section `share` | `share_story` | `share` / section `share` |
| Arrival evidence | `arrival` w/ `rid` + `landing` | same | same | same |
| Field Traffic Intelligence consumes | `slug` ↔ `arrival.meta.landing`, `meta.platform` | same | brand track key + `share_story` | same |
| Legacy compatibility | `content_id` preserved; slug computation unchanged | payload unchanged | **unchanged — not touched** | payload unchanged |
| Analytics coordination needed | No (additive only) | No (additive only) | No (untouched) | No (additive only) |

**Not yet wired:** `StoryViewer` / `OrGeulaPage` still use `shareVideoToStory` directly and do
**not** emit a `share_object`. That is intentional for this slice — `share_story` is a different
telemetry subtype with its own `storyEvent` producer, and folding it in without the Analytics
owner would risk exactly the interpretation change this slice is built to avoid.

Also intentional: `EntityPageBase` imports `ShareActions` but never renders it (its share is via
`QuickActions`). The unused import is reported, not removed, to keep this diff bounded.

## 7. Verification

- Production build passes.
- `test/share-object-foundation.test.mjs`, `test/canonical-controls.test.mjs`,
  `test/share-attribution-boundary.test.mjs` — pass.
- **Suite regression check:** pristine `origin/main` **with dependencies installed** fails 6
  tests; this branch fails 5, a strict subset → **zero new failures**.
  (An earlier count of "8" was a measurement artifact of running without `node_modules`.)
- **Browser matrix**, real components in an isolated harness, Chromium, 320/360/390/1440 ×
  dark/light = **8/8 pass**: no document horizontal overflow; every control ≥44px in every theme
  and width; channel controls render as real `<a>`; **every outbound link carries `rid` and `src`**
  (asserted after percent-decoding, since the target URL is nested in the channel's query string);
  `disabled`/`loading` inert while `building`/`locked` stay keyboard-reachable; a real Tab paints a
  2px `:focus-visible` ring and a mouse click does not.

`DOCUMENTED != IMPLEMENTED != COMMITTED != MERGED != DEPLOYED != LIVE != VERIFIED.`
