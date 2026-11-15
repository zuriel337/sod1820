# Publication request — merged #1345

Prepared 15 November 2026. **Awaiting publication approval; not executed.**
The user's overnight instruction authorizes preparation, with release decisions collected for later.

## Reviewed artifact and current site

- PR #1345 head: `9c594d0c09fc20b52e64052c1ac48f5d365f0275`, all 13 checks green, including the ready-for-review rerun `43660791075`.
- Approved squash completed: `main` commit `3843af126f21ae58cf033fe808eaa2821b7a3362`.
- Both trees: `9a0c578f2bf119423482c72675cda9cd9c9c0fdb` (verified by Git).
- Last read of all three production aliases: `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj`, source `4b9a8687eea94afcf2466046708903b512d44f38`. They were unchanged by the merge.
- Build request: `production-request-3843af12.json`. It pins the reviewed SHA and uses the existing public-production-candidate builder on Vercel. It was not submitted.

This publishes earlier discovery of the existing Post backdrop, current public titles/paths and bounded campaign/referrer fields in the manual GA event, and the existing book redirect counting fix. It contains no SQL, Edge deployment, GA dashboard configuration or visitor identity schema change.

## Execution after approval

1. Read `main`, the three aliases, deployment source and the approved files again. Stop on unexpected changes. A later main commit is not automatically included by this request.
2. Confirm `git.deploymentEnabled=false`; submit the exact prepared request. Do not substitute an ordinary dormant build, fake platform environment, or change the ignored-build rule beyond this exact reviewed candidate.
3. Wait for READY. Verify deployment source SHA, project/build identity and admitted public artifact before moving aliases. If Vercel updates an alias during production creation, verify its actual state and record that transition; do not describe this as an isolated preview.
4. Verify all three aliases (`sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app`) point to that same artifact, then run the existing post-deploy canary against the actual current deployment at its unchanged 15,000 ms threshold. Preserve all previous results and the existing daily run budget.
5. Read-only browser checks on mobile and desktop: list → two different Posts; original source and backdrop preserved; one backdrop fetch; current public title/path and campaign/referrer fields in outgoing manual events; `/books/<slug>` redirects and only its destination counts. Keep audit telemetry local, as in the existing fixture/capture tooling.
6. Record the deployment ID, source SHA, aliases, canary and browser evidence in the existing passive journal. Do not claim GA4 report ingestion or field p75 improvement from these checks.

The approval bundle should include conditional rollback to the freshly verified previous **2029** deployment above if the canary or acceptance fails. Rollback changes aliases only; preserve the failed deployment/canary history and reconcile the GitHub deployment record with actual aliases. Do not select a historical Legacy artifact or weaken the check. If that prior deployment has changed, stop and reconcile the request.

## Subsequent measurement

Compare the existing RUM cohorts after sufficient comparable production traffic. The controlled lab numbers in README are not field measurements. GA Enhanced Measurement duplicates/search events and report ingestion remain separate. The independent reader-concurrency branch prepared tonight is **not** included in this request.
