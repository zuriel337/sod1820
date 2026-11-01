# Reproduce the public reading acceptance

Product branch `gpt/2029-public-reading-release-configuration-20261101`, exact
4e6239c6d26e00b70ee10b341529491bd5b0b43c. The evidence branch is documentation/test
provenance, not an alternate product version; never deploy it as the release.

1. Read AGENTS/CLAUDE/owner index and live ownership. Default Legacy root/flags/AI
   stay untouched. Do not run the original live A3 or the full Isolation workflow
   against canonical Supabase; it invokes research-run and writes trace rows.
2. `node --test test/public-reading-release-2029.test.mjs test/public-launch-candidate-2029.test.mjs`.
   Run the existing Calculator golden/compare/opening/semantic and route/Legacy
   guards. No relaxed thresholds or removals of original workflow steps.
3. Compile the existing Preview builder with VERCEL_ENV=preview and the exact
   product branch. Verify preview-identity.sha and profile/closed flags. Default
   normal `npm run build` still builds Legacy + 2029; production lock unchanged.
4. Local browser fixture forwards only canonical public reads, converts reviewed
   STABLE RPC POSTs to GET, blocks all product/model/mail/Auth mutations and sockets.
   It serves compiled source with SW bootstrap removed **in the test only**.
   Use test/public-reading-release-2029.browser.cjs and world-stability.cjs, with
   SOD_ACCEPTANCE_ORIGIN bound to the disposable local static server. Fault403 and
   Bennett layout are controlled test responses; real Bennett stays unpublished.
5. Container isolation: fresh local clone of the exact product, copied installed
   dependencies in a task-only writable directory (some existing tests/Vite need
   temporary node_modules files), Docker --network none --read-only --cap-drop ALL,
   no-new-privileges, uid1000 and tmpfs. No Production bindings or credentials.
   Run the existing 38 safe Isolation stages plus the existing mocked A3 suite and
   focused candidate/profile suites. Receipt records only loopback networking.
   This is NOT the full original Isolation/A3 gate.
6. Matched timings: compile cf1f8f1a and candidate separately. test/public-world-loading-2029.browser.cjs
   uses identical immutable real-public response snapshots, identical exact Home
   Post, canonical expression/method, counterbalanced order, 3 pairs per condition.
   Keep the browser run alone (no parallel builds/tests). NODE_OPTIONS=--max-http-header-size=65536
   is required by this environment's proxy response headers. This is a runner
   transport limit, not a product assertion or permission change. Do not use a
   failed/aborted exploratory run as acceptance. Read the full definitions in the
   sanitized timing receipt: first/repeat are one ordered 11-step cycle, not eleven
   independently cold direct navigations. CLS threshold remains0.1, window600ms.
7. Protected deployed checks: obtain a short-lived Vercel grant in the authenticated
   connection; pass origin/accessUrl/sha to harness stdin with terminal echo OFF.
   Never persist the grant, cookies or credentials. remote-public.cjs verifies exact
   identity, worker hash, protection and actual deployed JS. It uses a separate
   read-only broker; no model or write is forwarded. The new branch correctly keeps
   preview-capabilities/preview-raziel unavailable404 rather than opening them to
   satisfy an old full-functional-Preview assertion.
8. native-public-smoke.cjs executes actual compiled client + actual SW with no
   request interception or mock responses. An independent deny-only window safety
   guard blocks risky calls before I/O. It also records one cold real-deployment
   Home sample per viewport; mobile uses CDP150ms/1.6Mbps/4xCPU and a6s observation.
   This is a lab sample, not field p75 or a before/after backend performance proof.
9. http-acceptance.cjs verifies exact identity, old/new Post canonicals, draft404,
   real missing404, canonical XML, cache/noindex/protection and denied Preview API
   mutations. No email, real-account action, model or product write is tested.

Read RECOVERY.md separately. Neither the code snapshot nor synthetic SQL restore
proves database + media disaster recovery. No cutover is authorized by these tests.
