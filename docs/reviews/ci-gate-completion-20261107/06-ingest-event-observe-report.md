# `ingest_event` — observe-mode measurement of every (surface, event_type) pair (DRAFT; READ-ONLY; no GUARD, allow-list or code change)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Method: "observe mode" here = measurement only, from existing data: `public.events` (30 days) and the Supabase gateway logs. Nothing was added to the database. Evidence tags: **V** live read-only (6–7.11.2026) · **C** repository main@cfda877a · **G** git history.

## Decision recorded (ZURIEL, 7.11.2026)
Keep the **narrow measurement in the worker** (only `performance` and `issue_report` are admitted by `public-reading-deploy/transport.js`). **No** RPC widening, **no** GUARD change, **no** blocking allow-list. Consequence accepted by this decision: category B below (77 pairs; page views, engagement, number/home views, arrival sources and the like) stays near zero after the cutover. Open question for the owner: which admin or traffic dashboards still read those surfaces and therefore show a drop that is a measurement choice, not a traffic change (not enumerated here).

## 0. Correction to the SHA record
At the start of the session the three domains were on `dpl_5BhNvF9H3KhKw2WgJd7pgbkByXuZ` (394a2ba8). **Now (V, Vercel alias read 7.11.2026) all three domains point to `dpl_12JhDbtTkEiENigf3Wzy4sproY7E` = main@cfda877a** (alias updated 6.11 ~14:27 UTC, not by this session). The difference 394a2ba8 → cfda877a is two files (`ElsNativeClassic2029.jsx` and one test). Earlier "live = 394a2ba8" statements were true until ~14:27 UTC on 6.11.

## 1. Census (V, last 30 days: 105 pairs, 123,397 rows; "cutover" = 4.11 12:30 UTC, a conservative bound — the build was created 11:28:55 and the aliases moved between about 11:30 and 12:11 UTC, so the "before" bucket can include up to an hour of post-switch traffic)
| Category | Pairs | Rows before cutover (30 d window) | Rows after cutover | Rows after the last deployment that still contained the old emitters (5.11 19:29 UTC) |
|---|---|---|---|---|
| A. Allowed by the public-reading worker (`performance/web_vital`, `issue_report/issue_report`) | 2 | 117 | 967 | 514 |
| B. Emitter literal exists in current source, but the worker refuses the surface | 77 | 85,373 | 213 | 46 |
| C. No emitter literal in current source (legacy-only) | 26 | 36,654 | 68 | 12 |
**Finding 1 — measurement collapse:** after the cutover only the worker-allowed surfaces keep arriving; category B fell from ~3,100 rows/day (85,373 rows over ~27.3 days) to ~79/day (213 rows over ~2.7 days). The only thing narrowing production telemetry is the **browser-side** allow-list in `public-reading-deploy/transport.js` (performance with per-client sample de-duplication; issue_report with a closed schema; everything else is denied in the browser). The database function accepts any pair. Examples: `page/view` 31,020 rows before the cutover → 96 after; `gematria/compute` 10,035 rows in 30 days, **0 after** the cutover (the gap PR #1259 addresses).

## 2. Do late events come from old bundles? (hypothesis test)
- G: the old emitters (`post_experience`, `post_exp`, `story_impression`, `layout_present`, `error_boundary`) were present in the tree of the cutover build `1bc8260a` and of the legacy `d1837efc`, and left main with `623b8d38a` ("Remove the Legacy runtime") inside PR #1239 (`a5ef82cc`). At live `394a2ba8`/`cfda877a` none of the literals exists.
- V (Vercel): the first production deployment without the emitters was created 5.11 19:29:27 UTC (`dpl_HcnMTEH7…`, a5ef82cc). Every later deployment lacks them. (Alias switch time is not readable; the true switch may be later by minutes to an hour.)
- V: rows of the 8 pairs that still arrive after the cutover, by window:
  | Window | Rows | Sessions | Reading |
  |---|---|---|---|
  | before cutover | 1,733 | 350 | normal |
  | cutover → 5.11 19:29 | 56 | 19 | emitters were in the live build → explained by live code |
  | +0…6 h after | 5 | 3 | may still be live code (alias time unknown) or open tabs |
  | +6…24 h after | 7 | 1 | one session, last row 6.11 12:19 → a long-lived tab on an older bundle |
  | > 24 h after | **0** | 0 | nothing for the following ~17 h until the check |
- Row signature after the last deployment: the same props keys as before (`post_slug`, `visitor_id`, `experiment`, `variant`, `sidebar`; or `slug`, `layout`, `component`), same path shapes — i.e. the legacy emitter, not a new one.
**Result:** consistent with stale open tabs/cached bundles, decaying to zero within about a day; **not proven** (no bundle identifier is stored in the event). 12 rows, ≈4 sessions in total after the last emitter-bearing deployment. No evidence of an external caller.

## 3. Who else calls it (V, gateway)
- Last 24 h: 3,447 POSTs, all `anon`; 91.5 % from a loopback page (CI and agent browsers) — dropped by the client-set `p_is_bot`; real-user addresses: max 7 calls/min per address, p99 3.
- No `service_role` caller and no non-browser user agent except one call on 10-27; no Edge Function references it (subagent scan of all deployed bundles + repo); DB-internal references: two admin/watch functions, not anon-executable.

## 4. Observe-mode conclusions for the later design (none applied)
1. A blocking allow-list built from today's code would be a **no-op for traffic that already stopped** and would only matter for direct callers; it must start as count-and-drop (design text: a counters table keyed by minute/surface/event_type/outcome, like `reading_activity_outcomes`) so unknown pairs are visible before refusal.
2. Per-pair caps: web_vital needs ≥1,207 B (30-day max); error_boundary 892 B; arrival/source 725 B; share/share 710 B; all others ≤ 700 B.
3. Per-address limit sized from real users (max 7/min): 30/min would leave 4× headroom and would stop test/CI runners (max 81/min) from writing to production.
4. Category B (77 pairs) is a **product/measurement decision**, not a security one: either keep the worker allow-list narrow, or widen it deliberately with a bounded server-side contract (the PR #1259 pattern). Today's silence is not an error in `ingest_event`.
5. Sequencing: PR #1259 recreates the `ingest_event` body (GUARD line); any change here must wait for or be folded with it (one writer per function body).

## 5. Not measured
Bundle version per event (not stored); gateway days other than 10-27 and 11-06 for the role/user-agent split; callers outside the gateway window; whether the 5.11 alias switch happened later than deployment creation.
