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
