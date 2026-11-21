# Slow networks: the worker script before the module hints (21.11.2026)

**Status:** BRANCH-ONLY. Branch `ccr-dcadb071-v1z5ol-slow-net-sw-priority`, draft PR #1466, base main `36c69db02`. Not merged and not deployed. Speed-centre map entry: **S-53**.

## The problem

On a first visit there is no controlling worker. The public bootstrap (`transport.js`) must register `sw.js` and pass the policy checks inside one 10 s deadline. Before that, the document already asked for up to ~70 files:

- 17 entry-graph `modulepreload` links in the markup;
- 51 Home hints added on `/` by `withRoutePreloads2029`.

On a slow line these hints share the bandwidth with `sw.js`. In the lab (Slow 3G, Home), `sw.js` finished only after **10.4 s**. Under real conditions this is how "העמוד לא נפתח" appears (the SW session reproduced it live).

## The fix

One small classic inline loader in `public-reading-deploy/route-preload.js` (`sodHintLoader2029`) applies the same hint list, at the right moment:

| State | When the hints go out |
|---|---|
| Page controlled by the worker (repeat visit) | Immediately, as before |
| First visit | As soon as the registration holds the worker (`installing` / `waiting` / `active`) |
| No Service Worker API | Never (the bootstrap fails closed there anyway) |

- The entry stays the first hint and appears once, with no duplicate requests.
- The Home list is applied through the same loader (`__sodHints`).
- **Not changed:**
  - `transport.js`;
  - the 10 s deadline, policy validation, heal and fail-closed;
  - the server HTML and Article First;
  - the shell budget (PASS).

## Lab

**Setup**

- HTTP/2 + TLS, one shared emulated line (1 KB slices round-robin), fixed latency per response.
- Profiles:

| Profile | Bandwidth | Latency |
|---|---|---|
| Slow 4G | 1600 kbps | 150 ms |
| 3G | 750 kbps | 300 ms |
| Slow 3G | 400 kbps | 400 ms |

- Phone at 390 px. Supabase answered `[]`.
- Medians of 2 runs (3 on a fast line). "before" = main `36c69db02`, "after" = the branch.
- Scripts and raw rows: `lab/`.

### Cold (first visit), before → after

Times are in milliseconds (ms).

**Slow 3G**

| Page | First paint | sw.js arrived | App open |
|---|---|---|---|
| Home | 4746 → **1430** | 10415 → **2310** | 11008 → 11132 |
| Number | 5596 → **1422** | 3434 → **1264** | 14038 → 14400 |
| Gematria | 5508 → **1426** | 3349 → **1292** | 10483 → 10918 |
| Post | 4204 → **1434** | 307 → 390 | 13140 → 13622 |

**3G**

| Page | First paint | sw.js arrived | App open |
|---|---|---|---|
| Home | 2718 → **966** | 5710 → **1513** | 6290 → 6464 |
| Number | 3084 → **950** | 3637 → **808** | 7844 → 8280 |
| Gematria | 3118 → **962** | 1878 → **803** | 5987 → 6336 |
| Post | 2340 → **952** | 1838 → **86** | 7348 → 7820 |

**Slow 4G**

| Page | First paint | sw.js arrived | App open |
|---|---|---|---|
| Home | 1408 → **532** | 2716 → **748** | 3282 → 3354 |
| Number | 1180 → **650** | 1960 → **876** | 4112 → 4198 |
| Gematria | 1374 → **516** | 1714 → **742** | 2944 → 3160 |
| Post | 740 → **512** | 1706 → **736** | 3556 → 3814 |

**Fast line (Home)**

| First paint | sw.js arrived | App open |
|---|---|---|
| 156 → 104 | 217 → 128 | 767 → 809 |

**Other results**

- **Opening:** every run opened, before and after (no "העמוד לא נפתח" in the lab).
- **Errors:** no page errors.
- **CLS:** unchanged or lower (Slow 3G 0.034 → 0–0.015).
- **Bytes before open:** unchanged (the same files, only in a different order).
- **Repeat visit (warm):** equal, before and after.

**The price**

On a first visit on a slow line, the full app opens **2–7% later** (up to about +0.5 s on Slow 3G or 3G), because the hints wait for the worker. This is an exchange:

- the worker's arrival, which used to decide between "opens" and "doesn't open", comes 2.5–4.5× earlier;
- the first paint comes ~3× earlier;
- in return, the full app opens a little later.

**Measurement limits**

- **LCP on slow lines after the change:** in some rows the largest paint is the app's content (later) instead of the early shell, and some rows record nothing (0). LCP is therefore not quoted as a win here. First paint and app open are the reliable measures.
- **The lab does not reproduce the live failure:** before the change it opened in the lab too. The live failure includes a real CDN, a cold function and an unstable line.
- **Small `sw.js` times:** values like 86 / 307 ms on a post come from the log order between the two modes, and are less reliable.
- **Not field results:** these are lab numbers (Speed Law, rule 7).
- **A correction to the first matrix:** the "calculator" rows in it were taken from `/calculator`, which is not the calculator address and answers "post not found". The gematria rows above come from a separate run on `/gematria`.

## Timeout

With `sw.js` first, registration ends within about 2.3 s on Slow 3G. **The deadline stays 10 s**; extending it is not needed.

## Functional check with real data (the integrated build)

**The build:** this branch + `claude/sod1820-no-sw-reading-y5ph01` (`5f9e1d752`) merged locally.

**Clean results**

- The merge is clean.
- `npm run build`, the public artifact, the Legacy-retired gate and the shell budget all pass.
- home-route-preload + production-artifact: 32/32.
- Artifact browser tests: 2/2.

**A test that did not run here:** `home-loading-admission-2029.browser.mjs` needs a prepared "before" build at `/tmp/sod1820-home-before-dist` and does not run in CI. It failed locally for that reason only.

**Phone 390 and desktop 1440, real database:**
- pages: Home, `/number/358`, `/gematria`, a post;
- each page cold and controlled;
- in-app navigation from Home to a post.

| | Result |
|---|---|
| Pages opened | all |
| Controlled after reload | yes |
| Duplicate asset requests | none |
| Page errors | none |

Raw results: `lab/functional-integrated*.json`.

## Not done

- Not merged and not deployed (requires ZURIEL's approval of an exact SHA).
- Not checked on a protected Preview or the live site.
