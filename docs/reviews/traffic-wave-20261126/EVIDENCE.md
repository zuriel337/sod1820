# Suspicious traffic wave, 26.11.2026 (UTC; Israel = UTC+2) — preserved evidence (read-only capture)

Captured 26.11.2026 02:15–02:30 UTC from: `public.events`, `public.site_visits`, `public.traffic_daily`, `public.posts` (Supabase `linswmnnkjxvweumprav`, SELECT only) and Supabase `edge_logs` (ClickHouse logs view; retention ≈ 24 h, so these rows disappear first).
No IP address is stored in this file: counts by ASN organisation / country / TLS fingerprint only. Nothing was written to any system.

## 1. Shape of the wave (events, canonical)
| Fact | Value |
|---|---|
| Start | first arrival 00:37:22 UTC (02:37 IL) |
| Still running | at 02:17:16 UTC; 100 arrivals in the previous 15 min (≈6.7/min); inter-arrival median 7.1 s, p90 18.6 s, max 31.8 s |
| Arrivals 00:35–02:15 UTC | 677 `source` events = 676 sessions, 676 distinct visitor ids (every session a new visitor) |
| Claimed source | `google` 671, `direct` 6; `tagged=false` |
| Pages | 635 distinct `/post/…` slugs in the window of 1,330 posts (≈48%); exactly 1 page view + 1 content view per session (avg 2.00; baseline 25.11 google sessions: 2.16 with 1.57 page views) |
| Order | 78.2% of consecutive arrivals are in ascending Hebrew-alphabetical slug order (538 of 689 pairs); first slugs start with "אב/או…", last observed with "סי…" ⇒ a walk through the post list in alphabetical order (several concurrent workers explain the 22% out-of-order) |
| Behaviour | median session duration 1.4 s (baseline 22.8 s); 9 of 671 sessions have an `engagement` event (baseline 71 of 136 = 52%) |
| Browser claim (client `app_context`) | chrome 52.8%, firefox 47.2%; `device` NULL, `ref_host` NULL, `via` NULL, `is_bot` false on every row |
| Rows written | 3,355 `events` rows ≈ 1.97 MB (before indexes) |

## 2. Network-level evidence (Supabase edge_logs, requests made by the wave's browsers to the Supabase API)
| Fact | Value |
|---|---|
| User-Agent on every API call of the wave | `Mozilla/5.0 (X11; Linux x86_64) … HeadlessChrome/145.0.7632.6 Safari/537.36` (3,252 `ingest_event` POSTs, 00:37–02:18 UTC) |
| Source addresses | 701 distinct IPs, 135 ASN organisations, 99.7% US consumer ISPs (3,242 of 3,252 requests) (Verizon Business, Charter, AT&T, Comcast, Optimum, Cox, T-Mobile, Google Fiber, SpaceX/Starlink, CenturyLink, Windstream, …) = rotating residential-proxy pattern. 2 stray single-IP countries (HN 5 requests, BF 5 requests) |
| Cloudflare client trust score | 1 (lowest) on all |
| TLS fingerprint (JA4) | 2 values for 701 IPs (`t13d1516h2_8daaf6152771_d8a2da3f94cd` and one more) ⇒ one automation stack |
| `Referer` header on the API calls | `https://www.google.com/` on 100% (real users in the same logs send `https://sod1820.co.il/`). A page opened from a Google click would send the SITE as referer on its own API calls; a globally injected Referer header does not |
| Volume | 16,259 API requests by this UA in 103 min (4,631 RPC POST + 3,024 REST GET + 8,604 OPTIONS preflights) ≈ 31% of all API requests in the window (51,611 incl. other sources); ≈24 API calls per session |
| Rate | steady ≈ 320 ingest POSTs and ≈ 70 distinct IPs per 10 minutes from 00:40 UTC on (per-10-min: 306, 344, 336, 325, 305, 322, 336, 314, 319, 281*) (*partial bucket) |
| Not part of the wave | `HeadlessChrome/158.0.8127.36` from "Anthropic, PBC" (150 requests, 12 IPs, referer `http://127.0.0.1:4413/`) = internal test browsers; excluded from every number above |

## 3. Why the system did not classify it as a bot (code read at origin/main f6f1051d3 and live function source)
1. Edge `middleware-core.js`: BAD_BOT includes `headless`, so a page request with that UA gets 403. The wave's pages were served, therefore the DOCUMENT request did not carry a `headless` UA, while the same browser's API calls did. (Unresolved: how the document UA differs. Vercel request logs for the document are not available through the tools used; edge Web Analytics returned no data.)
2. Client `is_bot` is false and `device`/`via`/`ref_host` are NULL on all rows; `ingest_event` does not look at the API-call UA.
3. `fn_human_entrances` marks `suspected_bot` only when `source='direct'` (no country, 1 view, no interaction) or direct numeric landings. The wave claims `source=google`, so it can never be suspected.
4. `engaged = (views >= 2)`. One post visit emits a page view and a content view, so every wave session counts as engaged. `traffic_daily` 26.11 (running day): entrances 336, engaged 331, bounces 5; 25.11: 266 / 130 / 132.

## 4. Cost (read-only estimate)
* Database: 3,355 event rows ≈ 2 MB, 3,024 REST reads of `posts` (avg content 20.4 KB ⇒ ≈ 60 MB egress), ≈7.7K RPC/REST origin calls at ≈ 0.27–0.31 s each. Negligible against the plan; no WARNING/ALERT signal.
* Vercel: Web Analytics returned no data; no firewall anomaly (`get_active_attack_status`: none); runtime function logs: 1 unrelated `/api/card` error. Page/asset bandwidth is not measurable with the available tools.
* If the walk continues at the same rate to the end of the alphabet: ≈ 700 more posts ≈ another ≈ 105 minutes (≈ 04:00 UTC).
* Real cost is to measurement: GA4/`traffic_daily` entrances and "engaged" counts for 26.11, source attribution to Google, and post-demand ranking.

## 5. Queries (re-runnable)
* events wave: `public.events where ts between '2026-11-26 00:35+00' and '2026-11-26 02:15+00'` (surfaces `arrival`, `page`, `content`, `entry_2029`, `performance`).
* order test: pairs of `props#>>'{measurement,page_path}'` for `event_type='source'` ordered by `ts`, compared with `collate "C"`.
* edge logs: `source='edge_logs'`, `log_attributes['request.headers.user_agent'] like '%HeadlessChrome/145.0.7632.6%'`, fields `request.cf.country`, `request.cf.asOrganization`, `request.cf.botManagement.ja4`, `request.cf.clientTrustScore`, `request.headers.referer`, `request.path`.

## 6. Status at the last capture
At 02:21:37 UTC (04:21 IL): 721 arrivals since 00:35 UTC, 661 distinct posts, last arrival 02:21:35, 65 arrivals in the previous 10 minutes: still running.
Not preserved here (and why): raw IP addresses and per-request rows. They are personal data and are not needed for the conclusions; only counts by ASN organisation, country and TLS fingerprint are kept. The Supabase edge logs hold the raw rows for about 24 hours.
