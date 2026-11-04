# Implemented and locally accepted; protected hosting still pending

Implementation scope BEFORE: `fa893a43-c29a-4710-92d9-0116a8dbdd2c`, parent
`fd88ee41-bce1-493d-8ba5-fbb3d579e8fe`. Exact tested source:
`83d437ddc55d690a196362c85fe32699ad50d579`, branch
`gpt/2029-home-js-transition-proposals-20261102`, based on product0d4 plus the two
documentation commits. Root authorized this implementation within the existing
protected-Preview scope, without changing the Legacy lock or Production admission.

The nine-file proposal was applied. One narrow hardening was added: absent/null
platform environment or an Edge runtime without `process` returns false instead
of throwing. The focused test executes that branch. No broad fallback or environment
unlock was introduced; a matching generated immutable identity is still mandatory.

## Executed in the dedicated validation window

| Check | Result |
|---|---|
| Actual-source default dormant build | PASS; Vite build1.63s, ordinary chunk-size warning retained |
| Existing artifact, release, SEO, old/new Post boundary and World OG plus new review tests | 57 PASS,0fail/skip/cancel |
| Existing local Chromium worker/service/Legacy replacement test | 1 PASS,0fail/skip/cancel;4.94s test duration, not a performance sample |
| `git diff --check` | PASS |
| Added source-line pattern scan |0private-key/provider-secret/GitHub-token/service-role-claim matches; bounded pattern scan, not proof against every possible secret |
| Legacy boundary comparison against0d4 | No changes to root config, App.jsx, launch flag, Legacy lock or existing SW transport |

Commands:

```sh
node scripts/build-public-reading-production.mjs
node --test test/public-reading-protected-review.test.mjs test/public-reading-production-artifact.test.mjs test/public-reading-release-2029.test.mjs test/public-launch-seo-gates.test.mjs test/public-post-reading-boundary.test.mjs test/world-finding-share-og-2029.test.mjs
node --test test/public-reading-production-artifact.browser.mjs
git diff --check
```

The actual emitted artifact records `sourceDirty:false`, source83d437dd,
`activation.state:dormant`, `protectedReview:null`, `productionReady:false` and
`deployed:false`. The default build was not run under forged Vercel values.
Only isolated tests used synthetic platform identities or generated-receipt fixtures.

The new tests reject Production/custom/development targets, missing/wrong project,
branch, source pin, dirty source, duplicate/absent arguments, canonical/foreign hosts,
different runtime deployment/host/SHA, forged request fields and missing environment.
They exercise the actual adapters with synthetic published Post rows, preserving
legacy/native/encoded/wp URLs, query bytes and canonical/OG URLs while forcing
review noindex. They cover HTTP404 versus503, GET/HEAD restrictions, canonical Host
rejection, robots/XML, credential stripping and card response headers. Fetch is
replaced before every data read; no test request reaches a live source.

Esbuild traces the generated authority module into the Node adapter bundle and
browser/Edge-compatible admission/card wrapper bundles. The card renderer is
explicitly stubbed in that test to avoid image/font network access; this is not a
test of the renderer or proof of Vercel function file tracing. Missing `process`
denies admission. Actual Vercel bundling, system-variable exposure, SSO denial and
hosted routing remain required. Do not relax the gate if any platform value is absent.

The browser check uses the real locally compiled app and workers, an isolated
loopback server, synthetic service responses and independent outbound denial. It
verifies Legacy worker→reading worker→signed-service UI→refresh→byte-exact Legacy
worker replacement. It does not send mail, unsubscribe a real user, use a live
JWT, call a model, modify data, test Production or restore a backup.

## Preserved receipts and remaining work

`validation/unit-and-regression.log`, `validation/local-worker-browser.log` and
`validation/artifact-receipt.json` retain the exact local results. Full generated
artifact remains at `public-reading-deploy/dist/public-reading-artifact.json` in
this worktree; its hash is in the receipt. Only the dependency symlink is untracked;
it is not part of the commit or deployment source.

All heavy local work finished before root resumed its exclusive performance window.
No further build/browser was run while root measured. Root must cherry-pick the
tested source, combine it with the Home graph change, rebuild that exact clean
product SHA and pin it in the prepared per-deployment request. Local acceptance on
this lane's source is not mislabeled as acceptance of a future integrated SHA.

Production remains dormant; canonical aliases and shared settings were not mutated.
Exact hosted artifact acceptance, actual admin use and real DB/media recovery remain
separate. A3 on0d4 was already accepted and was not repeated or called a backup restore.

Subsequent hosted attempts on integrated257 failed before the application build;
the diagnosed configuration replacement and narrow follow-up are documented in
[PLATFORM-CONFIG-MATERIALIZATION.md](PLATFORM-CONFIG-MATERIALIZATION.md). The results
above remain historical local results on83d, not hosted acceptance of the follow-up.
