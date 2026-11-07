# Release Visual — fail-closed telemetry-write guard for "Mobile + Accessibility"

> **Prepared for review. Release Visual was NOT run** (neither in CI nor locally) and no other CI was run. No DB, Storage, ACL, Production data or deployment was touched; the application code is unchanged. The decision (owner, 7.11.2026): do not run Release Visual in its current state; prepare a focused spec fix that stops it from writing to the live Supabase project.
> RC branch `claude/sod1820-audit-rc-g93w32`. G4 stays OPEN.

## 1. What the owner asked for → what was done

| # | Requirement | Where it is met |
|---|---|---|
| 1 | Identify every telemetry write the run triggers (`track_visit`, `ingest_event`, and any other path) | §2 — offline capture of the spec's pages + static inventory of every write sink in `src/` |
| 2 | Block them with a fail-closed guard (or redirect to a throw-away environment); never target Production / canonical Supabase | §3 — `tests/fixtures/release-visual-egress.cjs`, wired into the inline spec |
| 3 | Do not bypass the tests, do not change app behaviour; the run keeps testing the plain build | §3 — test-side only; reads still reach the same data; build unchanged |
| 4 | A test that proves writes are blocked and an unexpected request cannot pass | §4 — contract test, policy matrix, real-Chromium tripwire proof (+ negative control, mutation checks) |
| 5 | No DB / Storage / ACL / Production data / deployment change | nothing of the kind was executed |
| 6 | Show diff and guard-test results before any run | §4, §6 and the session report |

## 2. Identification

### 2.1 Measured offline (what the pages actually attempt)
Method: the plain build (`VITE_HOME_2029_ENABLED=true npm run build`, as in CI) served by `vite preview`; Chromium launched behind a **local tripwire proxy**; every non-loopback request answered by a local stub, so nothing left the machine (tripwire count at the end: **0**). 14 navigations covering the routes the spec visits (home `/2029` ×3 widths, `/entity-hub-preview/number/1237` ×4, the Bennett post ×3 incl. `?gemcard=1`, `/2029/gematria/viral` incl. typing, `/` and `/the-location-of-the-location`). Tool: [`tools/release-visual-egress-capture.cjs`](tools/release-visual-egress-capture.cjs). Only methods, hosts, paths and body key names were recorded.

| Request | Count (14 navigations) | Class | Source |
|---|---|---|---|
| `POST …/rpc/track_visit` | 26 | **telemetry write** (`site_visits`); body marks `p_is_bot: true` in the headless runner | `src/App2029.jsx:211` → `src/lib/visits.js` |
| `POST …/rpc/ingest_event` | 30 | **telemetry write** (`events`, mostly `surface=page`, `event_type=view`; also `calculator_view`, `first_compute`, `orientation_shown`); `p_is_bot: true` (the code comment says the RPC drops bot rows server-side — not verified) | `src/lib/tracking.js` (`emit`) |
| `POST …/rpc/link_identity` | 14 | **identity write** (`p_kind: legacy_seed`); **not** gated by the bot verdict | `src/lib/identity.js:54,124` |
| `POST …/rpc/world_group_source_arrivals_v2` | 13 | read (in the reviewed inventory) | home |
| `POST …/rpc/fn_method_value` / `fn_method_profile` | 9 / 5 | read (in the inventory) | post pages / calculator |
| `GET …/rpc/canonical_follow_subject` | 3 | read, **not** in the shared inventory → added as the one extra GET read (§3) | post pages only |
| `GET …/rest/v1/{site_flags,posts,topic_cards_public,contributors}` | 26 / 40 / 16 / 3 | reads | pages |
| `GET fonts.googleapis.com/css2` | 13 | third-party stylesheet read | 2029.html |
| WebSockets / `sendBeacon` / other hosts | 0 / 0 / none | — | — |

So an unguarded Release Visual run sends **≈70 anonymous write calls per 14 navigations** to the canonical project (track_visit, ingest_event, link_identity), and the real spec has more navigations than this capture. `GA` is a no-op in CI (`VITE_GA_ID` unset), and `meta-capi` is disabled without `VITE_META_PIXEL_ID`.

### 2.2 Not observed in the capture but present in the code (covered by the same default-deny)
`page_views` insert from `logView` (skipped for bots; would be sent by a non-bot), `visitor_events` inserts (`trackEvent`, bot-gated), the Meta Conversions API call `POST /functions/v1/meta-capi`, and the other write sinks found by the static scan of `src/`: **289 distinct RPC names** (272 are not in the read inventory), **25 tables** written at 47 call sites, **21 Edge Functions** (incl. `meta-capi`, `ai-analyze`, `post-save`, `media-upload-intent`) and 7 Storage write sites. The policy matrix test generates a request for each of them from the source tree.

## 3. The guard

`tests/fixtures/release-visual-egress.cjs` (new), used by the inline spec in `.github/workflows/release-visual-gate.yml`:

1. builds on the **reviewed shared read-only guard** `tests/fixtures/public-readonly-egress.cjs` (already used by the G4 / Isolation specs): default-deny at context level — only explicit reads leave the browser (GET/HEAD of REST data, POST of an RPC in the read inventory, public Storage reads, ordinary third-party asset reads); everything else gets `403` + `x-sod-test-readonly-egress: denied-before-network`; WebSockets are closed, `sendBeacon` returns false;
2. denies analytics / advertising hosts for every method and resource type (an `<img>` pixel is a write to a third party);
3. allows **one** extra read: `GET`/`HEAD` of `canonical_follow_subject` (PostgREST refuses GET for volatile functions; the public worker lists it as a GET read). Pinned by the contract test — widening needs a deliberate test change with evidence;
4. **audits outcomes independently of the policy**: a request the policy blocks must have been answered with a denial marker; a response without it, or a non-`ERR_ABORTED` failure, is recorded as a **leak**; `afterEach` calls `finish()`, which writes `test-results/release-visual/egress-receipt.ndjson` (uploaded with the existing evidence artifact), logs one line per test and **throws on any leak**. `ERR_ABORTED` cancellations are reported as `unverified`, never counted as blocked.

Spec changes (all in the heredoc): require the module; `test.use({ serviceWorkers: 'block' })`; a combined `beforeEach` (storage guard, then the egress guard) and an `afterEach` that fails closed if the guard is missing; the two `route.continue()` calls in the `posts` mocks became `route.fallback()` — a page-level `continue()` **bypasses** context-level routes (demonstrated by the proof, §4), `fallback()` hands the request to the guard and ends at the same network read as before.

New blocking step in the job, before the acceptance step: "Prove the telemetry-write guard (fail-closed; no live network)". The pure contract test also joins the always-on Live Contracts gate.

## 4. Proof — results (all local, no live network)

| Proof | What it checks | Result |
|---|---|---|
| `test/release-visual-egress-contract.test.mjs` (pure, runs in Live Contracts too) | the spec installs the guard in `beforeEach` after the storage guard; `afterEach` fails closed and disposes; `serviceWorkers: 'block'`; no `continue()` / `route.fetch()` / `unroute` / HAR / non-GET `page.request` / extra context; the proof step precedes and is blocking; the allow-list and the single `continue()` are pinned | **8 / 8 pass** |
| `test/release-visual-egress-guard.test.mjs` (policy matrix, generated from `src/`) | every RPC the app can call (289) is blocked unless in the read inventory (POST and GET; PUT/PATCH/DELETE always); every written table (25) and Edge Function (21) incl. `meta-capi`; Storage write sites (7); Auth/Storage writes; analytics hosts × 8 resource types × 4 methods; odd methods, encoded / double-slash / trailing-slash / upper-case paths, credentials, plain http, look-alike hosts; the accepted read classes pinned; the extra GET exact; never more permissive than the shared guard | **11 / 11 pass** |
| `test/release-visual-egress-guard.browser.mjs` (real Chromium behind the tripwire) | Phase 1: 27 write / telemetry / unexpected requests (+ WebSocket, `sendBeacon`, `EventSource`) → every one answered `403` with a denial marker, **no connection to any battery host reached the tripwire**, audit 0 leaks. Phase 2: explicit reads still pass. Phase 3a: an **unguarded** context sends the write to the tripwire (the tripwire can see leaks). Phase 3b: a page-level `route.continue()` lets two writes through, the audit flags both, `finish()` throws | **7 checks pass; stable: 6 / 6 runs on Playwright 1.63 and 3 / 3 on Playwright 1.55.0** (the version CI installs; driven here with the sandbox's Chrome binary, since the 1.55 browser download is not available — CI uses its own headless shell) |
| Mutation checks (broken copies of the guard) | M1 shared guard not installed · M2 telemetry denylist emptied · M3 extra-read handler continues every method · M4 audit blind to unmarked responses · M5 policy classifies unknown requests as reads | **5 / 5 caught** (browser and/or matrix fail) |
| Real Playwright Test runner integration | the **exact hook block extracted from the workflow's heredoc** (only the port changed) run under `playwright test`: a test with denied writes passes (5 blocked, 0 leaks); a test with a page-level `continue()` **fails in `afterEach`** with `release_visual_egress_leak` and the bypassed write shows in the tripwire | as intended on **1.63 and on 1.55.0** |
| Existing tests that read the workflows | `g3-reliability-preclose`, `ci-workflow-references-exist`; the Live Contracts audit step as CI would run it (11 files, 52 tests, no Playwright installed) | all pass |

**Compatibility finding, fixed before commit:** Playwright 1.55 forces even loopback traffic of a proxied Chromium through the proxy (`PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK`, confirmed in `playwright-core`), and the `bypass` option did not help; the first version of the proof, written on 1.63, therefore failed at `page.goto` under 1.55. The tripwire now **forwards the proof page itself** and nothing else, which behaves the same on both versions, and the leak check looks at the hosts the battery targets (a full Chrome build adds its own update / sign-in traffic to the tripwire; it is counted and printed, not hidden).

The 1.63 runs used a scratch-only shim that points `@playwright/test` at the pre-installed Playwright library; the 1.55.0 runs used the real `@playwright/test@1.55.0` installed in a scratch folder. Nothing of this is committed.

## 5. Residual risks and what was NOT verified

* **The full spec has not been run with the guard.** If a page needs a read RPC that is neither in the shared inventory nor the one extra, it will receive a 403 and an assertion may fail. The per-test receipt (`egress-receipt.ndjson` + one console line per test, listing blocked requests) shows exactly what was denied, so the allow-list can be extended with evidence. Reads observed offline are all allowed.
* **Accepted read class (unchanged from the shared guard):** `GET`/`HEAD` of ordinary third-party assets (image, media, font, stylesheet, script, document) to hosts other than the analytics denylist — e.g. Google Fonts. A third-party image pixel to an unknown host would pass; the denylist closes the known analytics hosts.
* Reads still reach the live Supabase project (read-only by design, as in the G4 specs); the guard's "read-only" property rests on test code, not a platform control; the canonical database was not measured before / after.
* The audit depends on Playwright's `response` / `requestfailed` events; `ERR_ABORTED` cancellations are only reported (`unverified`).
* `HTTPS_PROXY` handling of the shared guard (allowed reads fetched through the proxy when set) is irrelevant on GitHub runners and was removed from the local proofs.
* The Production Canary Gate job (read-only: GitHub Deployments/statuses + one read RPC) is unchanged and can be run separately.

## 6. Files

New: `tests/fixtures/release-visual-egress.cjs`, `test/release-visual-egress-contract.test.mjs`, `test/release-visual-egress-guard.test.mjs`, `test/release-visual-egress-guard.browser.mjs`, `docs/reviews/audit-remediation-20261106/tools/release-visual-egress-capture.cjs`, this file. Changed: `.github/workflows/release-visual-gate.yml` (inline spec + one proof step), `.github/workflows/live-contracts-2029.yml` (one test path added to the audit step), README row, `G4-RUN-RESULTS.md` (measured update).

## 7. Next step (needs approval)

Review the diff; then, if approved, dispatch Release Visual on the updated RC (the proof step runs first; the receipt shows every denied request). Until then Release Visual stays unrun.
