# Post documents on the CDN — controlled experiment (17 November 2026)

Tasks: `POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117` and, for the freshness package (three layers that keep a changed, hidden or deleted Post from being served from a kept copy), `POST_DOCUMENT_FRESHNESS_20261117` — section 12. First task (ZURIEL, 17.11.2026: an isolated experiment with Vercel's existing CDN only; no merge, no Production, no domains, no paid service, no shared settings without exact approval). This continues the speed project; nothing here replaces or reopens earlier fixes. The machine-readable twin of the lab numbers is `lab-summary.json`; the experiment is entry `S-47` in `docs/reviews/unified-performance-consolidation-20261031.json` (`current_state_20261117`), which the speed centre in `/2029/control` reads.

## 1. What was true before the experiment (read 17.11.2026, live sources)

| Fact | Value | Source |
|---|---|---|
| Live site | `dpl_H2Vs3UnALoLFwpViK7mYeSx7D1Dw` from `main` `d87ced78b` | Vercel alias read |
| Where the page server runs | `iad1` (Washington, US East), 100% of 214,143 document requests | Vercel deployment + observability `function_region` |
| Where the database runs | Supabase `ap-northeast-1` (Tokyo) | Supabase project record |
| Edge regions that answer document requests (7 days) | cle1 115,786 · sfo1 42,095 · iad1 14,202 · fra1 9,346 · sin1 8,447 | observability `edge_region`, route `/api/public-document` |
| How a document is answered today | every time by the function: `Cache-Control: no-store`, **0 HIT of 214,102** edge requests in 7 days | observability `cache_result` |
| Server time per document (7 days) | warm p50 255 ms · p75 483 ms · p95 719 ms; cold (264 starts) p50 752 ms, p95 1,395 ms | `function_duration_ms` by `function_start_type` |
| Who asks for documents (7 days) | `meta-externalagent` 49.4%, no bot name 30.7%, claudebot 5.3%, applebot 3.9%, facebookexternalhit 3.2%, googlebot 3.0% | observability `bot_name` |
| Field (own RUM, 7 days, Post pages, phones) | first byte p50 1,085 ms / p75 1,485 ms; server wait p50 882 / p75 1,319 ms (43 samples with the breakdown) | `events.performance.web_vital` |
| Field (desktop, Post pages) | first byte p50 1,360 / p75 2,383 ms; wait p50 686 / p75 1,598 ms (10 samples) | same |

A reader in Israel goes to a nearby edge, the edge goes to Washington, Washington asks Tokyo, and the answer travels back the same way, on every visit. The CDN removes the last three legs for a repeat visit in the same region.

## 2. What was changed (branch `ccr-dcadb071-v1z5ol`, not merged)

`public-reading-deploy/api/public-document.js` (`POST_DOCUMENT_CDN_CACHE`):

- **Only** an admitted public Post document: answer 200, its own address, no query string, method GET/HEAD, the metadata owner admitted a public, unsuppressed Post (read with the anonymous key), and the article-first step reached a **final** answer (`served`, `served-new`, `not-eligible`, `off`, `not-proven`, `new-guarded`).
- It then adds `Vercel-CDN-Cache-Control: max-age=300, stale-while-revalidate=60` (3600 in the first run of this experiment; shortened by the freshness package, section 12), `Vercel-Cache-Tag: post-document,post-document-<id>` and `X-Sod-Document-Cache: post-cdn-v1`.
- Never kept: an answer that carries the edge's reserved marker (`?__sod_fresh=1` or the header `x-sod-doc-fresh`, section 12), and any address with a dot.
- Browsers keep `Cache-Control: no-store` exactly as before (the service worker, back/forward and reload are unchanged); `Vercel-CDN-Cache-Control` is read by Vercel's CDN only and never reaches the browser.
- Everything else (Home, Community, Number, World, account and admin pages, 404, 503, redirects, query strings, the direct function address) is byte-for-byte as before.
- No new server, store, table, detector, setting or paid service.

Test: `test/post-document-cdn-cache.test.mjs` (wired into `live-contracts-2029`): the exact admission, every excluded case, `warming` and `failed` never kept, and a request carrying cookies, `Authorization` and another language produces the identical body and headers.

The protected Preview allowlist (`public-reading-deploy/review-admission.js`) admits this exact branch for Preview only, same pattern as `2011a9dc1`.

## 3. Isolated environment: protected Preview `dpl_62g74MmMWj4UK1Z5P9zAdjSFcDPs` (commit `4889ddfb8`)

Not routed to any domain; behind Vercel authentication; built with `--protected-review` for the exact SHA.

| Check | Result |
|---|---|
| 9 representative Posts (7 imported at their original Hebrew address, 2 `/post/…`), 3 requests each | 17 of 18 repeat requests answered by the CDN (`HIT`); the one `MISS` is correct (see next row) |
| First request on a cold instance | answered `x-sod-article-first: warming` (no article) — **seen on the first Preview, where the CDN then served that copy**; fixed in `4889ddfb8`: such a document is never kept; on the fixed Preview the warming answer was a `MISS`, the next request built the full document and was the one kept |
| Same bytes for everyone | identical title and ETag across the three requests of each Post; the only cookie is the existing generic `vb=browser` label, added per request by the middleware after the cache |
| Not kept (two requests each, both `MISS`, no cache marker) | `/`, `/gematria`, `/post/chosen-one?fbclid=…`, a missing Post (404), `/login`, `/2029/control`, `/api/public-document?path=…` |
| Robots / canonical | unchanged per host (`noindex` on the Preview host, as before; on the canonical host the existing `index, follow` stays) |
| Expiry after 5 minutes | three Posts: first request after expiry `STALE` (the kept copy, served at once), the CDN refreshed in the background in about 1 s, the following requests `HIT` with a new date |
| Refresh by tag (`post-document-5077`, Preview only) | the call ran (Vercel event `uev_tgPQ7hyVnK2vQBXCry0wBudS`), but it waited ~6.5 minutes for a permission prompt, by which time the copies had expired on their own — **its separate effect is not proven** here |

Vercel's documentation (read 17.11.2026, `/docs/caching/cdn-cache/purge`): the cache key includes the unique deployment URL, "since each deployment has a different cache key, you can promote a new deployment … without affecting the cache of the previous deployment" — a new release never serves a copy made by an older one (whose page would name script files that the new release does not carry). The CDN cache is kept per region and rarely requested copies may be evicted early. Purging is not billed.

## 4. Controlled lab: what the reader sees (same artifact, same Posts, same network; only the server wait differs)

Arms: server wait 880 ms (field median for Post documents on phones) vs 60 ms (a CDN answer). Phone, Slow 4G, 4× CPU, cold profile, alternating blocks, third-party scripts loaded, beacons blocked, database reads replayed. Times in ms from navigation start.

**As the live site serves Posts today (article in the first document; Posts O1, O3, V1, M1; 24 runs per arm):**

| | without CDN | with CDN | difference |
|---|---|---|---|
| First byte p50 / p75 | 936 / 958 | 119 / 144 | **−817 / −814** |
| First paint (FCP) p50 / p75 | 1,420 / 1,484 | 640 / 712 | **−780 / −772** |
| Article readable p50 / p75 | 3,333 / 3,493 | 2,556 / 3,071 | **−777 / −422** |
| LCP p50 / p75 | 5,222 / 5,972 | 3,974 / 5,220 | **−1,248 / −752** |
| CLS (worst run) | 0.0018 | 0.0018 | none |
| Article adopted by the page / page errors | 24 / 0 | 24 / 0 | — |

**Today's document without the article (Posts O1, O3, O4, O5, N1; 30 runs per arm):** first byte −820, FCP −728, readable −786 (p75 −824), LCP −1,414 (p75 −860), CLS 0 in both.

The LCP element is the cover image in every run; the image itself is unchanged, it simply starts earlier.

## 5. How much traffic the CDN would answer (Vercel observability, 16.11.2026, one full day)

Estimator: for each (address, edge region, hour), every request after the first is a CDN answer, which approximates "fresh 5 min, then served while refreshing for up to an hour". 29,573 document requests that day, all answered by the function.

| Population | Requests | Share a CDN would answer (hourly) | (5-minute variant) |
|---|---|---|---|
| All document requests | 29,573 | ≈19.6% (lower bound 17.0%) | ≈10–12.5% |
| `/community/chat` and `/` only (not Posts) | 5,616 (19%) | 88.8% | ≈51% |
| Everything else: Posts and junk addresses | 23,957 (81%) | **≈3.2–4.5%** | lower |
| Through fra1 (where Israeli readers arrive) | 1,658 | ≈48% (bounds 46–64%) | ≈20% |
| fra1, the 4 most-read Posts | 159 | ≈70% | — |

What this means for the change as tested (Posts only):

- **The benefit per CDN answer is large (section 4), but with today's traffic only a few percent of Post requests would get it.** Most Posts are read rarely in a given region within an hour; the exception is a Post that many people open at once (a share, a newsletter), where most readers after the first would get the fast answer.
- Almost all repeat traffic is on two non-Post addresses: `/community/chat` (3,878 requests; the Meta AI crawler and a steady ~13/hour "human" poll from fra1, gru1, iad1, bom1, cdg1) and `/` (1,738; mostly `facebookexternalhit`). Their documents are also the same for everyone, but they were not tested here and are not kept by this change.
- Links from Facebook carry a unique `?fbclid=` value, so even if query strings were kept, each click would be its own cache entry; those readers get no benefit either way.
- Much of the long tail is not content: old WordPress addresses (`/wp-json/oembed/1.0/embed`, `/wp-login.php`, `/feed`), scanner probes, `/community/null`, and old script files under `/assets/` requested mostly by Meta's crawler. Each still runs the function (to answer 404); an edge-level 404 for these would remove that work without any cache.
- Method limits: one day; the query API returns at most 500 groups, so the long tail was estimated from two sampled hours (one complete, one partial) plus exact series for the heavy addresses; an empty bot name does not prove a human; evictions and deploys not modelled.

## 6. Cost

- **No new paid service and no new setting.** Every page request is already an edge request and already transfers the same bytes; CDN answers change neither.
- **Less server work, in proportion to the CDN share:** the document function ran 214,143 times in 7 days (33.4 GB-hours, 45 CPU-minutes); each CDN answer is one invocation and one database read (Washington→Tokyo) that does not happen. A background refresh adds at most one invocation per Post per region per 5 minutes, only while that Post is being read.
- **Purge is not billed** (Vercel documentation); a purge temporarily raises function work.
- Plan quotas are not exposed by the API; not checked.
- Separate finding, outside this experiment: `/api/card` (share-card images) ran 25,885 times in the same week and used about 9.5× the CPU of the document function and 44% of all outgoing bytes (about 230 KB per answer).

## 7. What it does not affect

- **SEO:** the same HTML, title, canonical and robots for every reader including crawlers; redirects (308), 404 and 503 are never kept; the sitemap and robots.txt are unchanged. Crawlers get faster answers.
- **Images:** unchanged (only the HTML document is kept).
- **Service worker:** browsers still receive `no-store`; the page's worker identity check uses the deployment's own source SHA, and a kept copy is never served by another deployment.
- **Sign-in and personal data:** the document handler reads no cookie, no `Authorization` header and no account; the Post is read with the anonymous key only; by Vercel's own rules a request carrying `Authorization` and a response carrying `Set-Cookie` are not cached, and the test proves the kept bytes do not depend on anything the reader sends. Signed-in state is applied by the page after it loads, as today.
- **Article first:** only final article-first answers are kept; a `warming` or `failed` document is served as before and never kept.

## 8. Freshness policy

> **Superseded by section 12 (freshness package, 17.11.2026).** The policy below describes the first run (copies kept up to an hour while refreshing, purge by hand). It is kept as the record of what was measured then.

- A kept Post is fresh for **5 minutes**. After that, the first reader in that region gets the kept copy once while the CDN refreshes it (about 1 s, measured); everyone after gets the new one. A copy that nobody requests for an hour is not used again.
- An edited or hidden Post therefore reaches readers within about 5 minutes; in the worst case one reader per region sees the previous version once after a quiet period.
- When a change must reach readers at once, the Post's tag `post-document-<id>` (or `post-document` for all Posts) is purged in Vercel (dashboard, CLI or API, Production target). That is a Production action and needs ZURIEL's approval; its separate effect was not isolated in this experiment (section 3).
- Query strings (for example `?fbclid=` on links from Facebook) are never kept in this version; those readers are answered exactly as today.

## 9. Supervision after a release (existing sources only)

- `/2029/control` → "מהירות וביצועים": the Post surface (`by_surface`), the build breakdown (`by_build`, the release's entry file tied to its commit as before) and the first-byte parts (`nav_timing_p75`) show the field effect per release; the hourly regression watch (`fn_web_vitals_watch`) already compares the Post group (24 h vs the 7 days before) for LCP, CLS and INP.
- Vercel observability (`cache_result` for route `/api/public-document`) shows the real CDN share; a HIT is not visible to the page itself, but a document wait under ~150 ms in the field breakdown is.

## 10. Not done / not verified

- Nothing was merged, deployed to Production, aliased, purged in Production or changed in a shared setting.
- The separate effect of a tag purge (section 3).
- Field measurement with real readers in Israel: only possible after a release; the lab numbers above are a controlled simulation of the server wait, not field data.
- Region change: **not justified now.** Moving the function next to the database (Tokyo) would move it away from readers; moving it toward readers (Frankfurt) would move it away from the database; moving the database is a migration. The CDN removes both distances for repeat reads without moving anything.

## 11. Recommendation (one decision)

> **Updated in section 12.11.** The recommendation below was made before the freshness package; it is kept as written then.

**Enable it for Post documents exactly as tested** — `max-age=300, stale-while-revalidate=3600`, only admitted public Posts with a final article-first answer, no query strings, browsers unchanged — **and in the same release measure it, without expecting a large change in the Post averages.**

- Proven: about 0.8 s faster first byte, first paint and readable article, and up to 1.2 s faster LCP, for every reader the CDN answers; no layout shift, no personal data in a kept copy, edits reach readers within about 5 minutes.
- Expected reach today: a few percent of Post visits overall, most of the visits to a Post that is being read by many people at the same moment, and the Israeli readers of the most-read Posts (≈70% in fra1).
- Cost: none added; slightly less function and database work.
- Not part of this decision, measured as the next candidates: the same mechanism for the `/` and `/community/chat` documents (≈19% of all document requests, ≈89% repeat within the hour; needs its own Preview check), and an edge 404 for old WordPress and scanner addresses.

## 12. Freshness package — step 1 (ZURIEL 17.11.2026: three layers, isolated branch and test environment only)

Task `POST_DOCUMENT_FRESHNESS_20261117`. The goal: a changed Post reaches readers at once, and a hidden or deleted Post is not served from a kept copy even when the purge is late or fails. Only existing mechanisms are used:

- Vercel's CDN and its purge API;
- the existing Routing Middleware;
- Supabase statement triggers, plus `pg_net` and Vault (both already installed);
- the `analytics_cache` row store;
- the 15-minute `fn_health_watch`;
- `system_suggestions` through `suggest_add`;
- the speed centre in `/2029/control`.

No new table, column, service, store or detector type. Nothing here is applied to the live database, merged or deployed to Production.

Kept copies now live **at most 6 minutes**: fresh for 5 minutes, then served for up to 60 seconds while refreshing (`max-age=300, stale-while-revalidate=60`). Measured on the Preview: a copy was still served at 5 min 20 s (`STALE`), and a new page was built at 6 min 15 s (`MISS`).

### 12.1 The three layers

| Layer | Where | What it does | If it fails |
|---|---|---|---|
| **1. Purge on every change** | Database: `fn_post_document_change` (statement triggers on `posts` for INSERT, UPDATE, DELETE and TRUNCATE), then `pg_net`, then `POST /api/post-document-cache`, then Vercel `dangerouslyDeleteByTag` | A change to any of the 14 columns the document is built from (id, slug, source, link, wp_id, title, excerpt, content, image_url, date, modified, tags, categories, author) is logged **in the same transaction** (`analytics_cache` row `post_documents:changes`). It asks Vercel to delete the copies tagged `post-document-<id>`; when more than 16 Posts change at once, all Posts are purged (`post-document`). A change that cannot be logged does not happen: the transaction fails. Changes to other columns (home placement, scores, Facebook fields, theme, thumbnail…) do not change the document and purge nothing. | Every 15 minutes the health watch checks every purge's answer (`net._http_response`) and retries a failed purge once. A second failure becomes an urgent finding in `system_suggestions` and in the speed centre. Readers stay protected by layer 2. |
| **2. Edge gate** | The existing Routing Middleware (`middleware-core.js` + `post-document-freshness.js`) | A kept copy may be used only while this edge instance holds a list of recent changes, read at most 5 s ago, that does not name the Post. These requests are built fresh, using the reserved marker `?__sod_fresh=1` plus the header `x-sod-doc-fresh` (such answers are never kept): a Post changed in the last 20 minutes; every Post while the list is missing, old or unreadable. The list (`post_document_recent_changes_v1`: hashed address keys, a count and an end time only) is read in the background, directly from the database, the same way the middleware reads its other policies. It is read only while the same Post is requested again on that instance within 5 s. | Fail closed: no list, no kept copy. |
| **3. The page** | `Post2029Page.jsx` | When the page's own live read says the Post is not public (hidden, deleted or moved), the document's article is removed and the page shows its "not found" state. Only a failed read keeps the server's article. Report: `window.__sodArticleFirst = {result: "replaced", reason: "not-public"}`. | Covers JavaScript readers only. The guarantee comes from the server-side layers above. |

Why 20 minutes: a copy made before a change lives at most 6 minutes, and the change is counted from its statement time. Every copy made before the change has expired before the Post leaves the list, even after a transaction that stayed open up to 14 minutes.

### 12.2 Every update path

Tested on local Postgres with the live writer bodies (`tests/sql/run-post-document-freshness.sh`, CI `speed-centre-sql-gate`). The six live functions that write `posts` were copied read-only from the live database and checked by the md5 of their bodies: `admin_save_post`, `sys_save_post`, `admin_restore_post_revision`, `admin_set_post_home_hidden`, `admin_reset_post_position`, and `fn_snapshot_post_revision` with its trigger (`tests/sql/live/posts-writers-20261117.sql`). With the migration applied on that copy:

| Path | Result |
|---|---|
| Editor: edit (`admin_save_post`), publish new, hide (tag `טיוטה`), restore a revision, reset position | Logged in the same transaction. A purge was requested for exactly that Post (URL, key header and tag checked) and its address keys were listed for the edge. The hidden Post is listed. |
| Agents: `sys_save_post` edit and publish | Same. |
| SQL: direct INSERT, UPDATE and DELETE (deleted Post listed) | Same. |
| SQL: slug change | Both addresses listed. |
| SQL: bulk insert of 20 Posts | All Posts built fresh for 20 minutes, and `post-document` purged. |
| SQL: TRUNCATE | Same as the bulk insert. |
| Non-document changes (home_hidden, verified, convergence_score, Facebook fields, theme, axis_pin, ai_touched, thumb_url, title set to itself) | Nothing logged, nothing purged. |
| No purge key configured | The change is still logged and listed, so the edge still protects. Purge status `not_configured` and one medium finding. |
| Network down (`pg_net` fails) | The write still succeeds. Status `request_failed`; the Post is listed. |
| The log cannot be written | The Post change itself is refused (`check_violation`) and the content is unchanged. |
| Watch outcomes | Purge confirmed → `ok`. Failed purge → `retried`. Failed again → one urgent finding, not duplicated. No answer within 10 minutes → `retried`. |
| Edge and database keys | Identical for 12 addresses: Hebrew, percent-encoded upper and lower case, and `/post/…` (`tests/sql/post-document-keys-check.mjs`). |
| Rollback | Restores the exact previous definitions of `admin_2029_analytics` and `fn_health_watch` (md5 checked) and removes the triggers and functions. Both files refuse to run out of order or twice. |

### 12.3 Protected Preview

The Preview has no domain and is behind Vercel authentication. It reads the live database read-only. The migration is not applied there, so the real list does not exist.

Deployments: `dpl_EXt7XGqv6SMhuwMFdRFn4RLBxc9K` (`0985f3e3b`) and the final `dpl_7VbxX2VmwQqFrFZp7RAYLHDeoDyQ` (`5f91c5623`). On this branch's Preview only, a tester can hand the edge a list in the header `x-sod-test-post-changes`. The header is ignored everywhere else (unit test).

Results on the final Preview; the same results were seen on the first:

| Case | Answers |
|---|---|
| No list (the real list cannot be read), the same Post asked 5 times plus another Post 3 times | 8 of 8 built fresh (`MISS`, gate `stale`): **fail closed** |
| Clean list | `MISS`, then `HIT` (kept) |
| **This Post on the list** (hidden, deleted or edited), while a kept copy exists | 3 of 3 built fresh (`MISS`, gate `changed`). Right after, "another Post changed" got the kept copy (`HIT`, age 2 s): the fresh answers were never kept and did not replace it. |
| The imported Post at its Hebrew address on the list | Built fresh (`changed`). |
| List too old, bulk change (`all_until`), unreadable list | Built fresh (`stale`, `all`, `stale`). |
| Purge `post-document-5077` | Answered 200 in 0.24 s. The next readers got a page built in the foreground (`REVALIDATED`, age 0), never the deleted copy, and then it was kept again (`HIT`). Vercel's documentation: after a delete, "subsequent requests … will serve REVALIDATED and therefore block while revalidating". |
| A reader adds `?__sod_fresh=1` | Never kept, and gets no kept copy; the canonical address is unchanged. |
| A reader sends `x-sod-doc-fresh: 1` | What the CDN serves is unchanged (the kept copy, `HIT`). |
| Crawler (Googlebot) | Changed Post: built fresh, and the edge's existence check is read again. Clean: kept. Missing Post: the edge's 404. |
| A missing Post for browsers | 404, never kept. |
| Not a Post (`/gematria`, `/2029/posts`) | Untouched: no gate, not kept. |
| Endpoint | GET 405 (no list is served there). Invalid tags 400. Without Vercel authentication: 302 to sign-in. |

### 12.4 Measurements

All from the test machine, through edge region `cle1` to the function in `iad1` and the database in Tokyo. These are not field data.

| Measurement | Result |
|---|---|
| First byte, kept copy (`HIT`), 2 Posts × 12, alternating with the next row | p50 154–160 ms, p75 163–178 ms |
| First byte, built fresh (Post on the list, or no list) | p50 508–842 ms, p75 538–885 ms |
| Purge request | 0.18–0.24 s; the very next request was already a fresh build (tested from one region) |
| Copy life | Served while refreshing at 5 min 20 s (`STALE`); built fresh at 6 min 15 s (`MISS`) |

Lab numbers for the reader (first paint, readable article, LCP) are in section 4; they did not change.

### 12.5 Security checks

- **Purge endpoint.**
  - POST only.
  - Production requires `SOD_POST_DOCUMENT_PURGE_KEY`, compared in constant time. A missing key answers 503 `purge_not_configured`; a wrong key answers 401.
  - Tags must match `post-document` or `post-document-<1–12 digits>`, 1 to 16 of them; anything else is 400.
  - It returns no data. Every answer is `no-store` and `noindex`.
  - On the protected Preview, Vercel authentication guards it.
  - With the key, the worst misuse is extra origin work (deleting kept copies), the same as an expired cache.
- **Public list.** `post_document_recent_changes_v1` returns hashed address keys (the first 16 hex digits of SHA-256), a count and a time. It never returns an id, slug, title or content (SQL test). A key only tells someone who already knows a Post's address that it changed in the last 20 minutes.
- **Privileges** (SQL test):
  - list: anon, authenticated, service_role;
  - `admin_post_document_bypass_all`: administrators, service_role and a database-owner session only (others are refused);
  - the watch: service_role;
  - the trigger and key functions: no public execute.
- **Readers cannot steer the cache.** The marker and the header from outside neither get nor disturb a kept copy (Preview). The test-list header works only on this branch's Preview.
- **Same bytes for everyone.** Kept bytes are identical for every reader; cookies, `Authorization` and language do not change them (existing test). A copy is never served by another deployment (the cache key includes the deployment).
- **Not created** (no approval): the Vault secret `sod_post_document_purge_key`, the Vercel Production variable `SOD_POST_DOCUMENT_PURGE_KEY`, and the migration on the live database.

### 12.6 What can still show an old Post: exact windows and fixes

| Case | Window | Who can see it | Fix |
|---|---|---|---|
| Purge works (normal) | From the commit until Vercel deletes the copy: `pg_net` sends after the commit, then the purge request (0.18–0.24 s measured). Propagation was measured in one region only, where it was immediate. | A reader in a region that holds a copy of that Post | — |
| **Purge late or failed** | **At most 6.5 s after the commit** (5 s list lease + at most 1.5 s list read). After that, no copy of that Post is used for 20 minutes, longer than any copy lives. | Only a reader on an edge instance that is serving repeated reads of that same Post, read its list before the change, and sits in a region that holds a copy. Everywhere else the Post is built fresh anyway. | A 2 s lease (at most 3.5 s, more list reads), or a check per request (one more database read and its distance on every repeat read; not recommended). |
| JavaScript readers inside that window | The article is removed as soon as the page's own read answers (about 0.5–1.5 s after load) if the Post is hidden or deleted. The page also replaces the title and description and marks itself `noindex` (browser test). Clients without JavaScript (crawlers, link previews) see the copy as it was. | — | — |
| Writes that bypass row triggers (`session_replication_role = replica`, `DISABLE TRIGGER`, a restore with triggers off) | Up to 6 minutes (copy life) | Readers in regions with copies | After such maintenance run `select admin_post_document_bypass_all(20, '<reason>')` and purge `post-document`. Both are in the package. |
| A transaction open more than 14 minutes between the change and its commit | The 20-minute window may end less than 6 minutes after the commit | Rare: the live writers are single statements | — |
| Outside this package (as before) | Share-card images `/api/card`: CDN 1 hour plus 1 day stale, built only from their URL's text. The sitemap: its own CDN rule, addresses only. | — | A purge tag for cards if ever needed. |

Zero old content is therefore **not** promised. The proven bound for a failed purge is 6.5 seconds, on repeated reads only.

### 12.7 Cost, and a correction made during the test

The first build (`0985f3e3b`) read the list through the site's own endpoint (a function call plus a database read) on every Post request whose list was older than 2 s.

On this site's traffic that was wrong: about one Post request per minute per region, and two thirds of all document requests come from crawlers reading different Posts (Meta's AI crawler: 15,031 of 29,573 on 16.11). An instance's list is almost always older than the lease, so nearly every request was built fresh anyway, while still costing one more function call and database read.

Corrected in `348d55ea6` and `5f91c5623`:

- **Quiet traffic and crawlers:** no extra call at all. Each request is built fresh, exactly as today (unit test: 20 lone requests and 300 different Posts make 0 reads).
- **A Post read again and again** (after a share): at most one list read per 2 s per edge instance, a single-row primary-key read straight from the edge, with no site function.
- **Per change:** one purge call (Vercel does not bill purges; the call itself is an ordinary function invocation) and one `pg_net` request.
- **Health watch:** a few more reads every 15 minutes.
- **Reach today:** kept copies are now used only for repeated reads of the same Post within seconds on the same edge instance. Average Post first byte will barely move; the benefit goes to the Post that many people open at once. Vercel does not show which edge instance served a request, so this cannot be estimated more precisely before a release.

### 12.8 Speed centre ("מהירות וביצועים", `/2029/control`)

The existing reader `admin_2029_analytics` (patched by the migration; no new source) returns `web_vitals.post_document_freshness`. The centre shows:

- the last watch: changes in 24 hours, purges confirmed / failed / pending, retries, changes without a purge, and when it ran;
- a failed purge as **urgent**, even after its suggestion was dismissed, but listed once while the suggestion is open;
- a watch that has not run for 45 minutes, or has not run yet, as attention;
- a missing purge key as attention;
- "not active in the database" while the migration is not applied, never a zero.

Tests: `test/speed-centre-2029.test.mjs` and the browser test `test/speed-centre-2029.browser.mjs` (12 cases).

### 12.9 What a release would need (not approved)

1. **Database change (approval):** apply `supabase/migrations/20261117160000_post_document_freshness.sql`. The rollback is `supabase/proposed/ROLLBACK_20261117160000_post_document_freshness.sql`.
2. **Secret (approval):** one random value stored twice, as the Vault secret `sod_post_document_purge_key` and as the Vercel Production variable `SOD_POST_DOCUMENT_PURGE_KEY` (sensitive).
3. **Merge and deploy** by the procedure (approval).

Order: each part is safe alone.

- Code without the migration: no list, so every Post is built fresh, as today (shown on the Preview).
- Migration without the code: purges fail and are reported; there are no kept copies to protect.
- Without the secret: purges are `not_configured` and reported, and the edge still protects.

Suggested order: migration and secret, then the deploy.

### 12.10 Not done or not verified

- No live database change, merge, Production deploy, purge in Production or secret.
- The whole chain on the live database (a real change → `pg_net` → purge → the edge reading the real list). It needs the migration. Its parts were verified separately: the database locally with the live writers; the edge, the purge and re-keeping on the Preview with a test list.
- Purge propagation in regions other than the test region.
- How often repeated reads hit the same edge instance in the field.

### 12.11 Recommendation (updated)

**Approve it only if a fast first byte for a Post that many people open at once matters to you now.** If so, enable it with all three layers together; never the CDN cache alone. Then measure the reach in the field.

- For readers who get a kept copy: about 0.35–0.7 s faster first byte (12.4), and the reader-side gains of section 4.
- A hidden or deleted Post: never served from a kept copy once the purge has run; if the purge fails, at most 6.5 s on repeated reads of that Post, and the page itself removes the article for JavaScript readers.
- Cost: no added calls for quiet traffic or crawlers; tiny reads only while a Post is read repeatedly.
- With today's traffic the average will barely change; most of the gain is for a Post that is being shared.

### 12.12 Posts built from information units (#5107 shape) — checked 17.11.2026

**Finding.** A Post built from units is never given its article in the first document. The article-first policy excludes the reality-map series, Posts with registered unit updates and the special readings; #5107 is all three. Read on the live site (read-only): `x-sod-article-first: not-proven`, and the newest unit's text appears 0 times in the document.

So the document the CDN may keep holds only the Post's head: title, description from the excerpt, share image and dates. The units reach the reader from the page's own live read after it loads.

Consequences, each pinned by a test (`test/post-document-units-2029.test.mjs`, CI `release-contracts-2029`; database cases in `tests/sql/post_document_freshness_v1.sql`, CI `speed-centre-sql`):

| Scenario | Result |
|---|---|
| Add, remove, edit (text, number, image, link) or reorder units, written the way the 16.11 unit was (`posts.content` only, `posts.modified` unchanged) | Logged and purged through SQL, the editor (`admin_save_post`) and the agents (`sys_save_post`). The document the origin answers is **byte-for-byte the same** before and after, so a kept copy cannot show an old unit even if the purge failed. |
| Unit link `?unit=<id>` | Never kept (query string); its share card is computed per request. |
| Whole unit Post hidden or deleted, purge failed, a kept copy exists | The edge lists it as changed. The origin answers 404, which is never kept, with nothing of the Post in the answer. |
| "מה התחדש בפוסט" | Computed from the live row: an update shows only when `posts.modified` equals its registered version and its fragment is in the live content. It is not part of the kept document. |
| "עכשיו", unit anchors, source data | Live reads in the page; not part of the kept document. |
| Article first | Not applicable to unit Posts. Where it does apply, the proof is bound to the exact content, so a unit change takes the Post off the proof and no stale article is served. |

**Unit editor.** `PostUnitEditors2029` keeps its choices in the browser only (`postSemanticDesign2029.js`, localStorage) and writes nothing. There is no single-unit save path. A unit is published only by writing `posts.content`, as on 16.11 with approval, and that path is covered above. This is reported as a dependency; no new editing system was built.

**Conclusion.** Units need no definition of their own in the CDN package; it already covers them.

Not run: a browser run of the full elections page on a copy of its real content. The page's unit rendering reads the live row and does not pass through the CDN.

## 13. The Home and the community chat on the CDN — experiment (ZURIEL 17.11.2026 "מאשר, תתחיל בסעיף 3"; branch and protected Preview only)

### 13.1 Why these two

On 16.11, `/` and `/community/chat` were about 19% of all document requests (5,616 of 29,573). About 89% of them repeated the same address within the hour in the same region (section 5). Every one of them was built by the function.

- `/community/chat` (3,878): the Meta AI crawler, plus a steady ~13 requests an hour from five regions.
- `/` (1,738): mostly `facebookexternalhit`.

Facebook clicks carry a unique `?fbclid=` and get no benefit (section 5).

### 13.2 Why a kept copy cannot be stale

| Question | Answer and evidence |
|---|---|
| Is the document the same for every reader? | Yes. On the live site the documents of `/` (27,705 bytes) and `/community/chat` (22,282 bytes) were byte-identical with and without a member's cookie and `Authorization` header (17.11, 18:36 UTC). The handler reads no cookie, no `Authorization` header and no account. |
| Can anything outside a deployment change it? | No. For these two addresses without a query string, the metadata owner (`api/og.js`) reads nothing: no Post, no `site_flags` (it reads them only for the launch-gated areas: world, books, journey, number, heichal, raziel, code), and no community row (only `?thread`, `?reply` or `?path` make it read). The unit test runs the real owner and the real article step with the network replaced by a recorder: **zero reads** for both pages. Page state (`publicReadingPath`, `publicTemporarilyClosed`) is code. The article step answers `not-eligible` (no Post). |
| Can another release see the copy? | No. The platform keeps every deployment's copies apart (Vercel documentation, section 3), so a release or a rollback never serves another deployment's copy. |
| Does the edge still check every reader? | Yes. The middleware (bot rules, country policy, challenges, the `vc`/`vb` labels, logging) runs on every request before the cache. The labels are added per request, after the cache (section 3, Post experiment). |

### 13.3 What changed (`public-reading-deploy/api/public-document.js`)

`PAGE_DOCUMENT_CDN_CACHE` sits next to `POST_DOCUMENT_CDN_CACHE`. It uses the same module, the same three headers and no new system:

- `Vercel-CDN-Cache-Control: max-age=300, stale-while-revalidate=3600`;
- `Vercel-Cache-Tag: page-document,page-document-home` (or `page-document-community-chat`);
- `X-Sod-Document-Cache: page-cdn-v1`.

**Admitted:** exactly `/` and `/community/chat`, GET or HEAD, status 200, public state, no query string, no Post, article step `not-eligible`.

**Not admitted:** everything else, including `/2029`, `/community`, a trailing slash, `?fbclid`, `?p=`, `?thread`, 404, 503, other hosts and the function's own address. Browsers keep `Cache-Control: no-store`.

The refresh after 5 minutes changes nothing in the bytes. The background refresh only keeps the copy warm, at most one function call per page per region per 5 minutes while it is being read. The tag allows a manual purge (Vercel dashboard or API) if a copy ever has to go at once. The site's purge endpoint stays Post-only.

**Tests:** `test/post-document-cdn-cache.test.mjs`, 9 of 9 pass:

- the two kept pages;
- 10 cases not kept;
- the same bytes for every reader;
- the real owner reads nothing;
- the exact decision, including `__proto__` and `constructor`.

The 19 test files that load the document function: 188 of 189 pass. The one failure needs `@playwright/test` in this container and fails the same way on clean `main`.
