# Release Visual — default-deny, fail-closed egress guard for "Mobile + Accessibility"

> **Prepared for review. Release Visual was NOT run** (neither in CI nor locally), no Production canary, no other CI dispatched. No DB, Storage, ACL, Production data or deployment was touched; the application code and the build under test are unchanged. G4 stays OPEN.
> Decision of the owner (7.11.2026): do not run Release Visual in its current state; prepare a focused fix of the Mobile + Accessibility spec so that it cannot write to the live Supabase project. Round 2 (this version) applies the owner's three corrections: third-party default-deny with an exact allow-list, no "unverified" aborts, and a proof that the guard and the spec hooks are wired correctly for CI on Playwright 1.55.0.

## 1. Requirements → where they are met

| # | Requirement | Where |
|---|---|---|
| 1 | Identify every telemetry write the run triggers | §2 — offline capture + static inventory of every write sink |
| 2 | Block them with a fail-closed guard; never target Production / canonical Supabase | §3 — `tests/fixtures/release-visual-egress.cjs` |
| 3 | Do not bypass the tests or change the app; keep testing the plain build | §3 — test-side only; the build is untouched |
| 4 | A test proving writes are blocked and an unexpected request cannot pass | §4 |
| 5 | No DB / Storage / ACL / Production data / deployment change | nothing of the kind was executed |
| R2-1 | Third-party traffic default-deny; exact allow-list of hosts and resources; no pixel, no unknown endpoint | §3, §6 |
| R2-2 | A blocked-class request that ended in `ERR_ABORTED` / "unverified" must fail the guard unless it is proven denied before the network | §3 (proof ledger), §4 |
| R2-3 | The proof must run on Playwright 1.55.0's Chromium / headless shell, or a contract must prove the hook and the guard are wired correctly in CI | §5 |

## 2. Identification

### 2.1 Measured offline (what the pages actually attempt)
Method: the plain build (`VITE_HOME_2029_ENABLED=true npm run build`, as in CI) served by `vite preview`; Chromium launched behind a **local tripwire proxy**; every non-loopback request answered by a local stub, so nothing left the machine (tripwire count at the end: **0**). 14 navigations covering the routes the spec visits. Tool: [`tools/release-visual-egress-capture.cjs`](tools/release-visual-egress-capture.cjs). Only methods, hosts, paths and body key names were recorded.

| Request | Count (14 navigations) | Class | Source |
|---|---|---|---|
| `POST …/rpc/track_visit` | 26 | **telemetry write** (`site_visits`); body marks `p_is_bot: true` in the headless runner | `src/App2029.jsx:211` → `src/lib/visits.js` |
| `POST …/rpc/ingest_event` | 30 | **telemetry write** (`events`); `p_is_bot: true` (the code comment says the RPC drops bot rows server-side — not verified) | `src/lib/tracking.js` (`emit`) |
| `POST …/rpc/link_identity` | 14 | **identity write** (`p_kind: legacy_seed`); **not** gated by the bot verdict | `src/lib/identity.js:54,124` |
| `POST …/rpc/world_group_source_arrivals_v2`, `fn_method_value`, `fn_method_profile` | 13 / 9 / 5 | reads (in the reviewed inventory) | home / posts / calculator |
| `GET …/rpc/canonical_follow_subject` | 3 | read, not in the shared inventory → the one extra GET read (§6) | post pages only |
| `GET …/rest/v1/{site_flags,posts,topic_cards_public,contributors}` | 26 / 40 / 16 / 3 | reads | pages |
| `GET fonts.googleapis.com/css2` | 13 | third-party stylesheet read → allow-listed (§6) | `2029.html` |
| WebSockets / `sendBeacon` / any other host | 0 / 0 / none | — | — |

An unguarded run therefore sends **≈70 anonymous write calls per 14 navigations** to the canonical project, and the real spec has more navigations. GA is a no-op in CI (`VITE_GA_ID` unset); `meta-capi` is disabled without `VITE_META_PIXEL_ID`.

### 2.2 Static inventory of write sinks (covered by the same default-deny)
`page_views` insert from `logView` (skipped for bots), `visitor_events` inserts (bot-gated), `POST /functions/v1/meta-capi`, and the rest of the scan of `src/`: **289 distinct RPC names** (272 are not in the read inventory), **25 tables** written at 47 call sites, **21 Edge Functions**, 7 Storage write sites; and **42 distinct hosts** mentioned in `src/`, `2029.html` and `public/*.html`.

## 3. The guard (v2)

`tests/fixtures/release-visual-egress.cjs` + the data file `tests/fixtures/release-visual-egress-allowlist.json`, used by the inline spec in `.github/workflows/release-visual-gate.yml`.

**One route owns every decision** (`context.route(/.*/)`, registered before any page exists):

| Destination | Decision |
|---|---|
| loopback preview | `GET`/`HEAD` pass; anything else is denied |
| canonical Supabase API / Storage | exactly the read policy of the reviewed shared guard (`allowsPublicRead` in `tests/fixtures/public-readonly-egress.cjs`) + the extra GET RPCs of the allow-list file |
| **every third party** | **denied unless an exact allow-list entry matches** host + method + resource type + path (+ exact query) over https, no port, no credentials. There is no "ordinary asset" class: an unknown image, pixel, script, font, stylesheet, frame or endpoint is denied |
| analytics / advertising / session-recording hosts | denied with their own reason; they can never be allow-listed (validated at load) |
| WebSockets / `sendBeacon` | closed with 1008 / returns `false` |

A denial is a `403` with `x-sod-test-readonly-egress: denied-before-network` produced by this route.

**Proof ledger (R2-2).** The route writes the request into a ledger **before it awaits anything** and never continues a request it denied (the module contains no `.continue(` at all — reads use `route.fallback()`). A request in the ledger was paused in the interceptor and could only be fulfilled locally: it never reached the network, whatever Chromium reports afterwards (a late `ERR_ABORTED`, a MIME-blocked `<script>`). The audit then treats a request the policy blocks as **proven** (in the ledger) or a **leak** — whether it ended in a response, `ERR_ABORTED` or any other failure. **The "unverified" category is gone.** `afterEach` → `finish()` waits for in-flight decisions, writes `test-results/release-visual/egress-receipt.ndjson` (uploaded with the existing evidence artifact; each denial is listed with method, host, path, resource type and reason) and throws `release_visual_egress_leak` on any leak. An abort is therefore never a denial; a request that was cancelled before the route ran, or handled by a page-level route, fails with `not_denied_by_this_guard` and a hint.

**Spec changes** (all inside the heredoc): require the module; `test.use({ serviceWorkers: 'block' })`; a combined `beforeEach` (storage guard, then the egress guard) and an `afterEach` that fails closed if the guard is missing; the two `route.continue()` calls in the `posts` mocks became `route.fallback()` (a page-level `continue()` bypasses context routes — demonstrated in §4).

**CI changes:** a blocking step "Prove the telemetry-write guard" before the app starts, running the shared script `scripts/release-visual-egress-proof.sh`; a manual proof-only workflow `release-visual-egress-proof.yml` (§5.4); the pure contract test also joins the always-on Live Contracts gate.

## 4. Proof — results (local, no live network)

| Proof | What it checks | Result |
|---|---|---|
| `test/release-visual-egress-contract.test.mjs` (pure; also in Live Contracts) | spec wiring (guard in `beforeEach` after the storage guard, fail-closed `afterEach`, service workers blocked, no `continue()` / `route.fetch()` / `unroute` / HAR / non-GET `page.request` / extra context); **CI wiring** (§5.2); **module invariants** (one owning route, ledger written before any `await`, zero `.continue(`, no "unverified", allow-list is validated data); allow-list entries documented in §6 | **12 / 12** |
| `test/release-visual-egress-guard.test.mjs` (policy matrix, generated from `src/`) | every one of 289 RPCs, 25 written tables, 21 Edge Functions, Auth / Storage writes, analytics hosts × 8 types × 4 methods, odd paths / look-alike hosts / credentials / plain http / other projects; **third parties: 42 hosts × 6 methods × 16 resource types × 10 paths × 4 queries = 161,280 requests — only the two allow-listed shapes pass**; near-misses of both shapes (method, type, path, query, scheme, port, userinfo, trailing dot, sub-/look-alike domains); `validateAllowlist` rejects wildcard / telemetry / canonical / duplicate / POST / unanchored / undocumented entries; never looser than the shared guard on canonical hosts | **13 / 13** |
| `test/release-visual-egress-guard.browser.mjs` (real Chromium behind the tripwire) | Phase 1: 37 write / telemetry / third-party / unexpected requests (19 canonical, 18 third-party incl. unknown pixel, `i.ytimg.com`, production-site image, `cdnjs` script, unknown stylesheet, YouTube iframe, unknown font, near-misses of the allow-list) — **all in the proof ledger**, WebSocket closed 1008, `sendBeacon` refused, **no connection to any battery host reached the tripwire**, 0 leaks. Phase 2: canonical reads and the two allow-listed third-party shapes still pass. 3a: an **unguarded** context sends the write and the unknown pixel to the tripwire (negative control). 3b: a page-level `continue()` lets writes through, the audit flags both, `finish()` throws. **3c: a request that ends in `net::ERR_ABORTED` without the guard having denied it makes `finish()` throw.** 3d: 120 writes aborted by the page within 0–8 ms — none reaches the tripwire; the ones cancelled before the route ran are reported as leaks | **10 checks pass; stable 3 / 3** |
| `test/release-visual-egress-hooks.integration.mjs` | the **exact hook block extracted from the workflow's heredoc** runs under the real `playwright test` runner and browser of the job: a test with denied writes and third parties passes (receipt: 8 proven denied, 0 leaks, tripwire clean); a page-level `continue()` **fails in `afterEach`**; an `ERR_ABORTED` without a denial **fails in `afterEach`** (`not_denied_by_this_guard`) | **3 checks pass** |
| Mutation checks | broken copies of the guard (§5.3) | all caught |

## 5. CI verification (R2-3)

### 5.1 The exact CI stack, locally
Node **24.21.0** (the `.nvmrc` version), the Playwright **1.55.0** library and its own **`chromium_headless_shell-1187`** (Chromium 140.0.7339.16 — what `npx playwright install --with-deps chromium` gives the job, and what `chromium.launch()` uses in headless mode) were fetched into scratch folders (`PLAYWRIGHT_BROWSERS_PATH`; nothing is committed or installed into the repository), and **the committed script `scripts/release-visual-egress-proof.sh` was run unchanged on them: 3 consecutive runs, exit 0 each, ≈30 s per run** — 25 `node:test` tests (12 contract + 13 policy matrix), the browser proof (10 checks), the hooks integration (3 checks). One earlier run on Node 22.23.4 passed as well, and the browser proof also passes on the sandbox's Playwright 1.63 (2 / 2). The Live Contracts audit step (11 test files, now 56 tests) passes exactly as CI runs it, without Playwright installed. This is the closest equivalent of the GitHub job that can be run without dispatching it; it is **not** a run on a GitHub runner.

### 5.2 Wiring contract (pure, runs in Live Contracts)
The contract test pins, so a later edit cannot silently break the CI path: the Release Visual job runs on `ubuntu-24.04`; its install step is exactly `npm install --no-save --no-package-lock @playwright/test@1.55.0` + `npx playwright install --with-deps chromium`; the order install → **proof** → start app → acceptance; the proof step runs `bash scripts/release-visual-egress-proof.sh` and is blocking; the acceptance runs `npx playwright test` on the same install and the job never swaps the browser; the script runs, in order and failing fast, the contract, the matrix, the browser proof and the hooks integration; the hooks integration extracts the hook block **from the workflow** and drives the real runner asynchronously (a synchronous spawn would freeze its in-process servers).

### 5.3 Mutation checks (on the CI stack above; the unmutated copy passes all four stages)
| Mutant (a broken copy of the guard or of its data) | Caught by |
|---|---|
| third-party default-deny removed (every https asset allowed) | matrix, browser proof, hooks integration |
| analytics denylist emptied | matrix (reason `telemetry_host`) |
| extra GET read accepts every method | matrix, browser proof |
| audit treats `ERR_ABORTED` as proven | browser proof (3c), hooks integration (C) |
| canonical policy permissive (unknown requests are reads) | matrix, browser proof, hooks integration |
| ledger written after the `await` (proof no longer precedes cancellation) | contract (static) |
| allow-list: stylesheet path widened / font path widened / extra resource type | matrix (shape pin + near-misses), browser proof (font) |
| reads `continue()` instead of falling back | contract (static) |
| third-party denials missing from the ledger | browser proof, hooks integration |
| `sendBeacon` not neutralised | contract, browser proof |

(The first run of the "stylesheet path widened" mutant was **not** caught — only the host list was pinned and no near-miss kept the exact query while changing the path. Both were added: the full shape of every entry is now pinned and the near-miss set covers path-only differences; the mutant is caught.)

### 5.4 Proof-only workflow (not dispatched)
`.github/workflows/release-visual-egress-proof.yml`: manual dispatch only, `contents: read`, one job on `ubuntu-24.04`, the same install commands and the same script — **no app build, no acceptance, no Production canary, no GitHub deployment lookup, no secrets, no artifact**. Dispatching it would verify the proof on a GitHub runner without running Release Visual; it needs the owner's approval first.

## 6. Allow-list register (default-deny)

Source of truth: `tests/fixtures/release-visual-egress-allowlist.json` (validated at load; each entry carries `reason` and `evidence`). Rule: **no entry is added to make a failing run pass without first recording the blocked request — method, host, path, resource type and test, taken from `egress-receipt.ndjson` — and the reason here.** The contract test checks that every entry of the file is listed in this section.

### 6.1 Allowed
| Entry | Exact request | Why it is needed | Evidence |
|---|---|---|---|
| third party `fonts.googleapis.com` | `GET`, resource type `stylesheet`, path `/css2`, query exactly `?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap`, https, no port | `2029.html` loads the numeric font IBM Plex Mono as a progressive stylesheet; without it the numeric text is measured in a fallback font and the overflow / text-zoom assertions measure a different font | `2029.html` lines 15–20; offline capture: 13 requests in 14 navigations, type `stylesheet`; the stylesheet has no `@import` |
| third party `fonts.gstatic.com` | `GET`, resource type `font`, path prefix `/s/ibmplexmono/`, https, no port | the font files named by that stylesheet | `2029.html` line 16; the live stylesheet (fetched read-only 7.11.2026) has 20 `@font-face` blocks and every `url()` is `https://fonts.gstatic.com/s/ibmplexmono/…` |
| canonical GET RPC `canonical_follow_subject` | `GET` / `HEAD` of `/rest/v1/rpc/canonical_follow_subject` on the canonical API only | the follow button state on post pages; not in the shared read inventory; PostgREST refuses GET for volatile functions | offline capture: 3 requests, post pages only; `public-reading-deploy/transport.js` `PUBLIC_READING_GET_RPCS` |

### 6.2 NOT allow-listed — mentioned by the app, denied by this run, and why that is expected
Nothing below is required by an assertion of the Mobile + Accessibility spec as far as it could be established without running it; if a run shows otherwise, the request is recorded here first (§6.3).

| Host (where the app mentions it) | Used for | Why it stays denied |
|---|---|---|
| `i.ytimg.com` (`HomeComposition2029.jsx:299`, `supabase.js:206`) | video poster fallback on the home composition | the `Media` component falls back to a "▶" glyph; no assertion reads the poster |
| `sod1820.co.il`, `www.sod1820.co.il` | canonical links; content images | links are not fetched; the spec's post fixtures are synthetic and carry no images |
| `launcher.spot.im`, `images.spot.im` | OpenWeb comments widget and avatars | loaded only by the community chat component, not on the spec's routes |
| `cdnjs.cloudflare.com` | `three.js` for `public/heichal.html` | `/heichal` is not visited |
| `d2ol7oe51mr4n9.cloudfront.net` | early-access video | not on the spec's routes |
| `www.youtube.com`, `www.youtube-nocookie.com`, `player.vimeo.com`, `youtu.be` | embeds after an explicit user action | the spec asserts that no video is requested before intent |
| `www.googletagmanager.com`, `www.facebook.com`, `connect.facebook.net`, `www.tiktok.com` | share links / analytics | analytics hosts can never be allow-listed |
| any other host | — | default-deny |

### 6.3 How to extend
1. Take the blocked request from the receipt (`egress-receipt.ndjson`, one line per test, each denial with method, host, path, resource type and reason) and the failing assertion.
2. Add the entry to the JSON file **and** to §6.1 with the exact request, the reason and the evidence. The contract test fails if this document does not list it; the matrix test pins the host list, so the change is explicit in review.
3. Never add a wildcard, a port, a non-GET method, a telemetry host or a catch-all path — the validator rejects them.

## 7. Residual risks and what was NOT verified

* **Requests cancelled before the guard route runs** cannot be proven denied and therefore **fail** (by the owner's rule). Measured with the real app offline behind the tripwire (nothing left the machine): spec-like navigation (`networkidle` / 4.5 s waits) — **99 navigations, 539 writes proven denied, 0 unproven**; worst case (navigate again right after `commit`) — **81 navigations, 82 proven, 3 unproven (all `ERR_ABORTED`, 0 ms after the request)**; adversarial abort loop — 48 of 120 unproven. None of them reached the tripwire. If a real run fails this way, the receipt names the request; the options (a CDP-level proof or an in-page shim) need approval.
* **The full spec has not been run with the guard.** If a page needs a read outside §6.1 (for example a poster image), that request is denied and an assertion may fail; the receipt shows it and §6.3 applies.
* Canonical reads still reach the live Supabase project (read-only by design); the "read-only" property rests on test code, not on a platform control; the canonical database was not measured before / after.
* The audit depends on Playwright's `request` / `response` / `requestfailed` events.
* The proof has run on the exact Playwright / Chromium build of CI, but not on a GitHub runner (§5.4).
* The Production Canary Gate job (read-only: GitHub Deployments / statuses + one read RPC) is unchanged and can be run separately.

## 8. Files

New: `tests/fixtures/release-visual-egress.cjs`, `tests/fixtures/release-visual-egress-allowlist.json`, `test/release-visual-egress-contract.test.mjs`, `test/release-visual-egress-guard.test.mjs`, `test/release-visual-egress-guard.browser.mjs`, `test/release-visual-egress-hooks.integration.mjs`, `scripts/release-visual-egress-proof.sh`, `.github/workflows/release-visual-egress-proof.yml`, `docs/reviews/audit-remediation-20261106/tools/release-visual-egress-capture.cjs`, this file. Changed: `.github/workflows/release-visual-gate.yml` (inline spec + one proof step), `.github/workflows/live-contracts-2029.yml` (one test path in the audit step), README row, `G4-RUN-RESULTS.md` (measured update).

## 9. Next step (needs approval)

Review the diff. Then, optionally, dispatch `release-visual-egress-proof.yml` (proof only) to verify §5 on a GitHub runner; then Release Visual on the updated RC. Until then Release Visual stays unrun.
