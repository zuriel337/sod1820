# Validation receipt

Results refer to local actual-source working-tree builds, including root's
separately owned service seam. No Production or public deployment is claimed.
Final clean integrated SHA acceptance remains the root integrator's step.

- Actual Vite 2029 artifact build completed with unchanged Legacy/content gates.
- Dedicated artifact unit tests and the existing profile, SEO, Post publication
  and World sharing regressions pass. Exact counts and final browser result are
  recorded at lane completion below.
- Synthetic unit tests execute the exact emitted worker, including operation
  denial before fetch and signed-service caller/parameter checks.
- Bootstrap tests cover missing worker support, register timeout, stalled ready,
  no controller, redundant installation, wrong policy, late registration and
  late activation. No late resolution can import the app.
- Document/XML tests use actual metadata/sitemap owners with synthetic public
  sources. They cover root/imported/native/encoded/Post aliases, old wp IDs,
  genuine 404/503, publication suppression, closed route noindex, Number/phrase
  indexability, public writer predicates and verified video XML.
- No browser native performance measurements, canonical A3, model/credit calls,
  live signed unsubscribe or real mail tests were performed.

## Preserved unsuccessful attempts

1. The first local browser harness imported `playwright`, which is not installed
   in the repository. Node failed before launching a browser. The harness now
   uses the repository's existing `@playwright/test`; no dependency was installed
   into shared node_modules.
2. The first browser execution then failed waiting for the unchanged signed
   unsubscribe success UI. A diagnostic rerun retained the same failure:
   the page showed the fail-closed bootstrap message, the worker was activated,
   no synthetic Supabase UI call had begun, and no pageerror was observed.
   A second diagnostic exposed `worker_bootstrap_timeout` before any application
   import. The same-URL active Legacy registration had not supplied the new
   policy handshake. This was a real local startup failure, not a passing service
   test or a native timing sample.

## Completion

The bootstrap now explicitly updates an already-active same-URL registration
before checking the policy. The actual Chromium test then passed through Legacy
worker → Production worker admission → unchanged service UI with synthetic
Response → blocked local synthetic POST → refresh under the current controller
→ byte-exact Legacy worker replacement → permitted local synthetic POST.
No pageerrors occurred. A dedicated unit test also demonstrates that a reused
wrong-policy controller is replaced only through the registration update; a
stalled update remains bounded and never imports the app.

The final acceptance commands passed: 49 unit/regression tests and one local
browser lifecycle/service/rollback test. Existing unchanged Legacy/content gates
passed during the actual-source build. `git diff --check` passed. These results
do not erase the unsuccessful attempts above. The browser result is functional
acceptance with synthetic sources, not native performance, real HMAC validation,
a hosted Vercel configuration test or a data restore.

The source lane has a root-owned service seam outside its commit, so the emitted
working-tree receipt truthfully records sourceDirty=true. Root must integrate
the scoped commit and that seam, rebuild the exact clean integrated SHA and
rerun the listed acceptance commands. Hosted activation, exact cutover approval,
full isolated A3 and database/media recovery remain distinct root-level gates;
this lane neither marks them passed nor repeats their tests.
