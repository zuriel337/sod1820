# Central acceptance: Claude Home ELS entrance card — 2026-10-31

Task `CENTRAL_HOME_ELS_CARD_ACCEPTANCE_INTEGRATION_20261031`.
BEFORE `b6d95688-c66c-4560-a840-7f2af448ad01` (passive GPT → ZURIEL).
Source final release `fa8e0a9f-d0d2-4b7d-b12b-d901e7236440` verified live through
the dedicated readonly connector. Existing whole-Home ownership stays with its owner;
this is released-component acceptance, not a new Home design assignment.

## Exact lineage and integration

Central branch: `gpt/2029-central-home-els-card-integration-20261031`.
Central base: `f4aedfe3ed2dc34dde184e978c396b10f8186f9a`.
Source: `ccr-4f7f2318-32ormn` at `1027c3249e9cf72207e9dc0a1958c85fb97c65ee`.
Source base: `d52ff6b834fbbaf69d2fa79177750c4bdf73c2ad`.

The source contains exactly two commits above its base. Ancestry and `git cherry`
confirmed both were new to central. Home2029Page and HomeComposition2029 were
byte-identical between the source base and central f4, so the released card needs
no wholesale import of the pending World branch. Two exact `cherry-pick -x` steps
applied cleanly, preserving authors and source IDs:

- a8daed3301d2d7d8d761856181372a6fd322333e → 8b3a1cb01 (full SHA in JSON).
- 1027c3249e9cf72207e9dc0a1958c85fb97c65ee → 3aad6ae42 (full SHA in JSON).

All four runtime files are **byte-identical to the approved source**. The new
component/CSS, optional `elsEntry` slot and one Home import/prop are the only runtime
changes. Central Frame, Providers, Raziel/ELS implementation, World, Supabase readers
and Preview guard retain f4 fingerprints. No old source file replaced a newer page.

## Adopted appearance and behavior

The user's final choice and final live release supersede the source receipt's older
pending wording: keep the dark luminous card in **Day, Parchment and Night**.
The discarded uncommitted theme-following experiment is absent. No button changed.
Title, subtitle `AI · מנוע חיפוש עוצמתי`, illustration label and `/code` action remain
exactly as supplied. The decorative letter matrix is not a verified finding.
Night roles come from the existing palette owner; no local palette/store is added.

The card uses the existing `useFeatureState("lock_els")`, has no engine/AI/scan
background work, and retains its one lightweight transform animation. Pause,
off-screen/hidden-tab gates and reduced motion are preserved. No model, provider,
engine, real scan or video/WebGL is attached to the Home. The new central base
already contains matrix-reading modules from the cumulative ELS handoff; that is
not permission or a requirement to wire them into this decorative card.

## Actual checks

- Card static tests **11/11**. Related Home/date/context selection **23/23**, including
  those 11; totals overlap. Home System Pulse and System Frame checks pass.
- Actual built-app original browser assertions: **12 viewport/theme combinations**
  (320/390/768/1440 × Day/Parchment/Night), **zero failures**; keyboard, 44px targets,
  real self-hosted fonts, contrast, stable card geometry and dark treatment verified.
- OS reduced motion at390/1440, pause/restart, off-screen and hidden-tab pause,
  five availability scenarios (open/blocked/registered-only/missing/loading→open),
  exact CTA route and no horizontal overflow pass.
- Fresh-navigation before/after request comparison: **120 → 121**, exactly
  `GET /rest/v1/site_flags +1`. No added engine/scan/AI/Edge request.
- Browser external HTTP/WebSocket I/O was intercepted by the new test-only helper;
  declared synthetic content fixtures, **zero forwarded external traffic**, zero
  Edge attempts. This is real component/application acceptance, not live data,
  model quality, hosted latency or a Production check.
- Real Legacy and 2029 builds pass with actual lockfile dependencies; no stub.
- Built graph/lazy passes: eager JS gzip **437,845 bytes**, **20,897 recovered**
  against the unchanged 12,288 minimum. Isolation, cheap hardening, Legacy lock pass.
- Existing Preview Auth Guard **9/9** passes. It is existing branch-policy evidence,
  not acceptance of an unregistered new candidate Preview (see below).
- Same-profile local Home-enabled review builds: Home JS gzip17,634 →19,386,
  CSS3,375 →5,013, combined **+3,390 bytes**. No new runtime media/font asset.
- Source doc screenshots/performance tables are received as historical evidence;
  its LCP/CLS/frame results are not relabeled as this central SHA's measurements.

Two browser/static harness adaptations were necessary, with product code unchanged:

1. The subtitle test retains exact approved wording and its historical caveat in
   the source handoff. It no longer requires a sentence removed from the newer
   central ELS page; engine/import/zero-call assertions remain.
2. The source request collector registered after initial mount and immediately
   reloaded, mixing pending work from two navigations. It now observes one fresh
   navigation from before load, then settles it, retaining the strict only-one-
   site_flags and no-engine assertions. Initial run's12 visual combinations and
   all interaction/availability cases passed but this mixed comparison failed;
   the corrected full rerun has zero failures. No budget/assertion lowered.

Review build only: existing `VITE_HOME_2029_ENABLED=true`, no unlocked capability
bypass and no CORE_PUBLIC_LAUNCH change. Normal build flags remain unchanged.
The local fallback index.html is a generated test-server copy of2029.html in /tmp;
no Preview builder was run, and nothing was hosted.

Browser artifacts: `/tmp/home-card-central-browser-final/`.
Offline I/O report: `/tmp/home-card-central-offline-final.json`.
Reproduction (after making local Home-enabled before/after builds):

```bash
DIST=/tmp/home-card-central-review-dist \
LOCKED_DIST=/tmp/home-card-central-review-dist \
BASELINE_DIST=/tmp/home-card-central-before-dist \
EVIDENCE_DIR=/tmp/home-card-central-browser-final \
HOME_CARD_OFFLINE_REPORT=/tmp/home-card-central-offline-final.json \
node --import ./test/helpers/home-els-card-offline-preload.mjs test/els-home-card-2029.browser.mjs
```

## Open items and owner boundaries

- The source listed three old guards. On current central, public-language3/3 passes;
  the Home branding source-string test and old connected-Golden Post layout check
  still fail identically on untouched f4. Neither is caused by this card, neither
  was weakened. The prior17 ELS/Raziel static failures remain separate.
- Hosted performance/real GPU/iOS/real phone and Home's upstream CLS remain unverified.
- A fresh owner scan found an active shared-builder writer: BEFORE
  `f89f7394-1a1b-4fce-ad9f-c0cfe5e82692`, task COMMUNITY_QUICK_OWN_AVATAR_20261031.
  Therefore scripts/build-integrated-preview.mjs and its guard tests were left
  unchanged. Before any future authorized hosted review, its existing owner must
  register this exact new central branch under the restrictive read-only policy
  and reconcile the pending builder work. Do not use the current default branch
  fallback or copy historical write exceptions. This does not block receiving the
  card code, and no hosted Preview was requested or produced by this acceptance.
- Worldd52, later Claude river colours, Ticker and private personal-activity reader
  gaps are not silently closed by this card. Existing sessions keep their scopes.

MERGE_TO_MAIN:NO · HOSTED_PREVIEW:NO · EDGE_DEPLOY:NO · PRODUCTION:NO · PRODUCT_DB_RLS:NO.
