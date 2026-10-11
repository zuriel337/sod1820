# Frozen Home integration — 2026-10-12

Original Claude base: `63705d0edd46f40676767b54f5664cd559910aaf`.
Category correction parent: `e9f35853e6fe7bf8e160235f6e64aa2d19bfe776`.
User authorized release of the ready Home/rails after verification. This is not a blanket release of all outstanding branches.

## Integration

Clean merge of category identity correction; adopted Home, four update rows, bottom dock, dark glass, logo/toggle, phone corrections and post convergence display remain original Claude components. No visual redesign.

Added independent `VITE_HOME_2029_ENABLED=true` switch for the adopted Home. Do NOT use `VITE_INTEGRATED_PREVIEW=true` for production: it disables RouteEffects telemetry and enables review/demo tooling. Candidate production build is `VITE_HOME_2029_ENABLED=true npm run build`; current review build still uses the integrated preview switch. No production setting changed.

## Verified

- Main currently `737ee9aa`; source branch includes 348 changed paths beyond main (before this integration note), including pre-existing Edge Functions, migrations and ELS/Person work. This is not a small Home-only main diff.
- Frame, World, Topic, My Workspace and researcher corpus acceptance PASS; nine category/feed/date tests PASS; integrated legacy + 2029 builds PASS.
- Google and email providers are enabled according to the public Auth settings endpoint. Existing `signInWithGoogle` exists, but the new frame login form has no Google button. Its existing helper returns to `/`, not the initiating 2029 page. No real account login was exercised.
- Browser dependency gap resolved by isolated Playwright 1.56.1 installation. Chromium launch is blocked by runtime OS permission (`socket() Operation not permitted`), before navigation. The Home→World→Flight test did NOT pass/run its cases. Original Claude's browser evidence remains his report, not GPT execution.

## Release blockers and existing owners

1. PR999 remains open/unmerged at e5a27331; latest scoped security receipt is NO_GO with missing authorized HTTP evidence. Do not claim the security gate closed or bypass it. Existing security operator retains that task.
2. Reconcile the full branch/main release scope (including migration dependencies), not merely the final 4–6-file integration delta. No main merge or production deployment performed.
3. Browser acceptance of the exact unified tree and user's glass acceptance remain outstanding.
4. Google UI/return flow: original Claude adds the button using the existing auth function; GPT handles bounded return URL/verification. Preserve the existing account identity. No provider/permission change needed merely to enable Google—it is already enabled. User must complete actual account authentication if required.
5. ELS advanced and Life Journey are independently owned. Life PR1032/1028 exact reviewed head b3df89b9 is branch-only and requires its ownership-gated migration BEFORE client activation, final main-target CI and deployed authenticated tests. Do not silently fold it into this Home release or label it live. Existing frame already links ELS and has a Life Journey workspace entry; that does not prove the latest versions are connected.

Passive handoff only, through user relay. Original Claude may resume only the specifically coordinated next scope after integration receipt. Shared styling remains frozen during release verification. Mail thread/media producer remains a separate unfinished branch.
# Google handoff and release triage follow-up

Integrated original Claude `7abcdd9fd853873407d185e6cfa491d119e463ee`, a direct child of the unified `8f4aee20` base. The UI remains Claude's; GPT completed the existing auth helper's local return path validation. Paths preserve the query, drop fragments and reject external/protocol-relative/malformed/control-character targets. Unverified integrated/Vercel previews stop before the Supabase OAuth call and explain that email login remains available. No provider, allow-list, identity, permission or database changes.

The helper's `SITE_URL` already uses `window.location.origin`, not a hard-coded production host. A server-side redirect fallback remains possible if Supabase does not allow the requested return URL. Production redirect configuration and a real Google account round trip still require verification; neither is claimed here.

Validation: integrated legacy + 2029 build, five acceptance scripts, and 15 date/feed/category/OAuth tests passed. This does not constitute a real Google sign-in or a browser pass on this exact commit.

Precise divergence at `8f4aee20`: **0 commits behind / 190 ahead**, 349 changed files. File count is not a release blocker and does not mean 300 commits behind. Mail, split meter and separately owned ELS/Life expansions need not delay a dependency-clean Home release.

Concrete GitHub CI failures on that unified base, to close before release:

- `els-core-compatibility`: 66/67 passed. `test/els-native-ui-browser.test.mjs:608` finds a 40x46 dock target at 320px; minimum is 44x44. Original Claude owns the responsive fix; preserve the approved dock.
- `Mobile + Accessibility Acceptance`: 17/19 passed. Both post flow cases expect three context-map entries but see four. The workflow also expects contextual inspection before lazy calculation. The current Post page opens the number drawer directly, so updating only the entry count is insufficient. Resolve intended behavior with original Claude and retain meaningful expression/method/result, lazy trace and exact-return coverage.
- `hard-isolation`: stops at `test-entry-contextual-learn-2029.mjs`, whose expected `shell.openInspect` call is absent from Post. Same interaction contract must be reconciled; do not delete the assertion merely to turn CI green.

Release remains blocked by these concrete checks; no main merge/production release performed. Earlier broad release concerns below are historical triage, not proof that every unfinished workstream blocks Home. After the focused fixes, refresh current production canary, exact candidate CI and live dependencies as required by `deploy_on_request` v3.
