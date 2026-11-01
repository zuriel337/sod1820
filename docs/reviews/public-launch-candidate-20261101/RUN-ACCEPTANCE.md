# Reproduction boundaries

Use the exact productcf1f8f1a, not this evidence branch as a product. It differs
only in docs/tests; Preview branch guards intentionally do not admit evidence.
Public tests need no private account or provider/service key. No live A3/model/
email/private upload is part of these commands. Never run full Isolation's
A3 step against the canonical project as a shortcut.

## Isolated SQL

With cached PostgreSQL17 Docker image (no network/host project):

```sh
SOD_CREDIT_PILOT_GUARD=1 bash scripts/run-membership-credit-engine-sql-test.sh
SOD_CREDIT_PILOT_GUARD=1 SOD_CREDIT_PRODUCTION_SHAPE=1 bash scripts/run-membership-credit-engine-sql-test.sh
```

The first runs the unchanged original accounting fixture then the pilot guard.
The second substitutes the read-only-observed canonical credit_grant definition
and updated_at behavior, retaining all assertions. Both rehearse dump/restore
of synthetic data in a second local database. This is not Production restore.

## Local before/after source compilation

Use independent clean source trees atbe8f86ad andcf1f8f1a, same pinned dependencies.
Build before with VERCEL_ENV=preview and
VERCEL_GIT_COMMIT_REF=gpt/2029-public-world-number-acceptance-20261101, after with
VERCEL_GIT_COMMIT_REF=gpt/2029-public-launch-candidate-20261101, using
node scripts/build-integrated-preview.mjs. Preserve each preview-deploy/dist.

static-public-server.cjs takes SOD_STATIC_ROOT and SOD_STATIC_PORT; serve before
at127.0.0.1:4231 and after at127.0.0.1:4251. It is a GET/HEAD-only test server
that removes SW bootstrap solely for the independent public-read broker.

Run product test/public-world-loading-2029.browser.cjs with:
SOD_BASELINE_SHA=be8f86ad55dfbc625d218a5917a97c260331c27b,
SOD_CANDIDATE_SHA=cf1f8f1a35eb90c10a3a84a310f8616b2121f965,
SOD_PUBLIC_PERF_PAIRS=3, SOD_PUBLIC_METRICS set to a new output path,
NODE_OPTIONS=--max-http-header-size=65536. Playwright1.55.0/Chromium154 and
esbuild0.28.2 were reused; no dependency/lockfile change. Network uses the
configured proxy and proper CA trust, not TLS bypass. Performance details and
limitations, including local/hosted build-hash differences, are in PERFORMANCE.md.

## Protected actual deployment

remote-public.cjs/http-acceptance.cjs/native-static-cache.cjs/native-public-smoke.cjs
accept a private access grant on stdin. Obtain it via the authenticated Vercel
connection; never save the grant, auth cookies or browser storage state in Git.
Case receipts identify exact source and worker hashes. Remote functional broker
caches only hashed immutable JS/CSS within a context, preserving all API/HTML
reads. Its initial failure and targeted successful retries are retained.

native-static-cache reads compiled bytes without executing the app. Native
public smoke executes the actual app and worker with a separate deny-only
network-write guard, real public server responses, no Playwright route/mock.
Telemetry, guest preferences and unapproved RPCs are deliberately denied;
these tests cannot accept those actions, account operations or paid behavior.

remote-loading.cjs is a prepared optional harness for matched timing of hosted
assets. It was not executed in this task; no timing claim relies on it. The
recorded matched24-cycle numbers are the local exact-source compilations.

See evidence/isolation-steps.json, isolation-runner.mjs and the filtered
container attestation for the38 offline workflow stages plus supplements.
Final successful logs and the first infrastructure failures remain distinct.
