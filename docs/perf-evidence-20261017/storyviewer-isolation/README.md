# Story viewer and report form — on demand for 2029 consumers only, Legacy unchanged

task_key `CLAUDE_PERF_2029_STORYVIEWER_LEGACY_ISOLATION_20261017` · branch `claude/perf-entry-cost-20261017`, continued from `320cbfc469976f59a1294e9a93a9edb3063917fa` (verified: local = remote, tree clean). Product commit **`5f52ab00`**. State **BRANCH-ONLY**: no merge, no deployment, no PR, no CI, no Production/Legacy-behaviour/DB/RLS/switch change. D2/D5 not touched.

> **Recovery path completed in [`../recovery-path/README.md`](../recovery-path/README.md) (commit `6d52e5d7`)**: an explicit, click-only "רענון הדף" when no reliable retry URL exists or the retry failed, tests for a failed dependency file and a URL-less error, and the test servers under `permitLocalServer`. The limits below about Safari / dependency failures are updated there.

## What the central review found, confirmed
`src/components/OrGeulaStoryColumn.jsx` is shared: `src/legacy/legacy.jsx` imports `MergedStoriesRail` and `LandingDiscoveryStories` from it (lines 4471, 5018, 5158, 5343). My D3 commit `d9b45ebc` had made `StoryViewer` lazy **inside that shared file**, so Legacy consumers got a lazy viewer with an empty `Suspense` fallback and no failure handling, and the Legacy chunk graph changed (a 61st start-up file).

Two further defects of D3, found while testing the failure case, both mine:
* a failed load of the `ContactGateway` chunk (report form) **unmounted the whole 2029 frame** (root empty), because `React.lazy` rejections had no boundary;
* the same for the viewer, and a plain retry could never work: Chromium remembers a failed module fetch for the life of the document (probe: same URL after the network recovers → fails again; same file under `?retry=1` → loads).

## Change
| file | role |
|---|---|
| `src/components/OrGeulaStoryColumnCore.jsx` (renamed from `OrGeulaStoryColumn.jsx`, history kept) | the implementation, unchanged except that the viewer is **injected** (`Viewer` prop on `MergedStoriesRail`, `LandingDiscoveryStories`, default export) and the file no longer imports `StoryViewer.jsx` |
| `src/components/OrGeulaStoryColumn.jsx` (new, same path Legacy imports) | Legacy-facing: same export names (`MergedStoriesRail`, `LandingDiscoveryStories`, default, `BRAND_OR_GEULA`, `BRAND_TZOFON`), **static** `import StoryViewer` bound as `Viewer`; no `lazy`, no `import()` |
| `src/components/experience2029/OrGeulaSourceShortcut2029.jsx` | 2029 binding for the Companion shortcut (`CompanionPanel2029.jsx` imports it) → on-demand viewer |
| `experience2029/StoryViewerOnDemand2029.jsx` | the on-demand viewer: nothing shown for 250 ms, then a closable "opening…" status (Escape / backdrop / ✕); failure → message with **נסו שוב** and **סגירה** |
| `experience2029/OnDemandComponent2029.jsx` + `onDemandLoader2029.js` | shared boundary (new lazy + new boundary per attempt) and loader (one shared request, failure forgotten, retry under `?retry=n` using the failed URL from the error text — same-origin `.js` only) |
| `experience2029/SystemFrame2029.jsx` (+1 css rule) | the report form uses the same boundary: slow → the panel's loading state; failure → message + **נסו שוב**, the panel's own close stays |
| `experience2029/storyViewerRegistry2029.js` | the Legacy build hands its static viewer to the 2029 shell that Legacy also contains (below) |

**Why a registry:** the Legacy build bundles the 2029 pages (`/world`, `/היכל`, …) and so the 2029 shell. A dynamic `import()` of the viewer in that shell made the viewer both static (Legacy rail) and dynamic (2029 shell) in the Legacy build, which made the chunker split an extra start-up file. `__SOD_2029_BUILD__` removes the dynamic import from the Legacy build; the Legacy-facing file registers the already-present static viewer; the 2029 build removes the registry lookup and keeps the dynamic import. A static import in 2029 code could not be used: the viewer module is not tree-shaken (measured: `INEFFECTIVE_DYNAMIC_IMPORT`, the viewer stayed in the shell).

## Bundle measurement (same method for all three: `vite build`, gzip = zlib default level)
Arms: **base** `8c8e9df9` (unified candidate), **D3** `320cbfc4`, **now** `5f52ab00`. Raw numbers in `bundle-measure-2029.json`.

2029 build, `Sod2029Shell` (loaded on every 2029 route):

| | raw B | gzip B |
|---|---:|---:|
| base | 235,306 | 70,416 |
| D3 | 207,439 | 62,112 |
| **now** | **210,509** | **63,190** (−7,226, −10.3 % vs base; +1,078 vs D3 = the status/retry UI and boundary) |

On-demand chunks (not in `2029.html`, not in the start-up graph — asserted by test): story viewer 7,605 raw / 3,027 gzip; report form 21,320 / 7,065.

Legacy build, start-up graph of `index.html` (scripts, preloads and everything they import statically; `tools/legacy-entry-graph.mjs`):

| | files | raw B | gzip B |
|---|---:|---:|---:|
| base | 60 | 2,354,977 | 687,984 |
| D3 | 61 | 2,355,271 | 688,222 |
| **now** | **60** | **2,355,004** | **687,978** |

Chunk-level comparison of the Legacy build, base vs now (`tools/compare-builds-normalized.mjs` and a per-chunk static/dynamic import diff): the only graph differences are in the 2029 shell chunk that Legacy contains — it no longer statically imports `community` and `interactionCorrelation` (they travel with the form) and dynamically imports the new `ContactGateway` chunk. Legacy consumers' viewer: still in the `index` chunk, no `StoryViewer-*` chunk.

**Bytes only.** No READY/LCP/browser-work figure was taken; first open of the viewer costs one request (3 KB gzip), first open of the form one request (7 KB gzip).

## Tests (new: `test/story-viewer-isolation-2029.test.mjs`, 10/10, 0 skipped; Chromium 141, loopback only, synthetic channel rows, every other host aborted)
* contract (source): the shared implementation never imports the viewer; the Legacy-facing file binds the static viewer and keeps `legacy.jsx`'s import line valid; the 2029 binding; no 2029 module imports the viewer, the form or the Legacy-facing rail statically;
* loader: one shared request, failure forgotten, retry URL only from a same-origin script (cross-origin, `.json`, no URL → none);
* real **2029 build**: viewer and form are single chunks outside the shell and outside the start-up graph; real **Legacy build**: the viewer is in the start-up graph, no separate chunk;
* browser, built 2029 app, 1440×900: **story viewer** — first open (no request before the click, one after, no second request on reopen); slow load (nothing for 100 ms, then the status; Escape closes it; the chunk arriving later does not reopen the story; the next open waits and shows it); failed load (error with retry/close, app intact, close works, a second failed open works, retry after the network recovers opens the story and asks again); **report form** — first open, slow (loading state, closing, no late reopening), failed (message + retry, frame intact, close, retry opens the form);
* browser, built **Legacy** app `/world` (2029 shell inside Legacy): the story opens from the registered static viewer with no viewer request;
* browser, harness bundling the **Legacy-facing rail**: the viewer opens at once, one script, no request between click and viewer.

Old-failing / new-passing: the same browser tests against `320cbfc4` (D3): first open passes; **slow-load status, failed story load and failed form load fail** (app unmounted / no status / no retry).

Other: `npm run build` (Legacy + 2029) ok; `test:2029-bundle-budget` 5/5; `test-2029-system-frame`, `test-entry-contextual-learn-2029`, `test-issue-report-canonical-emitter`, `test-2029-control-plane` pass (the first two now assert the new wiring: `createOnDemandLoader` / `<OnDemandComponent2029 load={loadContactGateway}`); `companion-2029-public-source-shortcuts` reads the Core file and passes except test #8, which **fails identically on the unchanged base** (already listed in earlier evidence); D1 tests 6/6 and `early-primary-read` 11/11 still pass.

## Not tested / limits
* **Chromium only.** The retry takes the failed URL from the error text: Chromium and Firefox name it, Safari's message does not. Without a URL the loader asks the same importer again — which in a browser that also remembers failures fails again (then the person still has the close action, and a reload). Firefox/Safari not run.
* A failure inside a **dependency** of the viewer/form chunk (not the chunk) can still not be retried in place.
* `NumberDrawer2029` (pre-existing lazy import in the same frame) has no such boundary; not changed, not tested.
* Observation, not changed: the Companion's expanded source shortcut lives in the expanded capsule; the slim instance unmounts when the capsule expands, so a story can only be opened from the expanded instance — the tests hover first.
* No real corpus, no signed-in user, no phone, no hosted Preview; no user-timing or LCP claim; D2/D5 not touched.

## Ownership
BEFORE `1bbcb809-808b-49fb-946b-4bf51f9cec4b` (written before the change; scan of `work_log`: no overlapping active writer). AFTER row released the scope (id in the delivery message).
