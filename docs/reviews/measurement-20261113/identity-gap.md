# Measurement package: the decision already taken, against what the code sends

**The decision (ZURIEL):** measure pages and arrival sources; a **browser identifier** for guests and an **account identifier** for signed-in members; detail for the administrator.
The older position "the public measurement is anonymous by default" (`abb2f3907`, "the anonymous public event stream is a privacy decision in code") is **not** restored by this package, and this package does not add anything that would make it harder to follow the decision.

What was read: the branch at its final HEAD, the tests that pin the shapes, and a probe of the built worker (synthetic request, no network).
File:line references are to this branch.

## 1. What the code sends today

| Request | Body | Identity in it | Who writes it | How the worker forwards it |
|---|---|---|---|---|
| `track_visit` | `p_path` (normalized label), `p_referrer` (external host, first visit of a page load), `p_visitor`, `p_device`, `p_is_bot` | **`p_visitor` = the browser id** (`sod_vid`, a random UUID in `localStorage`; `src/lib/visitorId.js:11-20`, sent at `src/lib/visits.js:52`) | `src/App2029.jsx:171-211` through `trackVisit` | `public-reading-deploy/transport.js:307-309`: shape check (`readingVisitBody`, `p_visitor` is 8 to 64 characters of `[0-9a-z-]`, `src/lib/publicReadingTelemetry2029.js:34-44`), a window of the public site, 120 per window per 10 minutes. |
| `ingest_event` page engagement | `p_sod_id: null`, `p_session_id: null`, route, three timing counters | **none** (`getSodIdFn`/`sessionIdFn` return `null` at `src/App2029.jsx:210`; the validator requires `null`, `publicReadingTelemetry2029.js:50`) | `src/lib/engagement.js` | `transport.js:311-316`, 240 per window per 10 minutes. |
| `ingest_event` actions, content views, arrival | `p_sod_id: null`, `p_session_id: null`, closed fields | **none** (`src/lib/events.js:110`; validator `publicReadingTelemetry2029.js:131`) | `emit()` → `emitPublicReadingAction`; `emitPublicArrivalOnce` (`events.js:120-132`) | `transport.js:320-322`, 60 per window per 10 minutes. |
| anything with a member's session | the member's `Authorization` header | the member's token | the Supabase client | **replaced by the public anon key** for all three families (`transport.js:305`, `anonymous()`); pinned by `test/public-reading-analytics-worker.test.mjs` ("Bearer member-session-token" in, anon key out). The database therefore sees the role `anon` and `auth.uid()` is `null`, even for a member. |
| identity links (`link_identity`, `link_visitor_identity`, `claim_research_lead`) | called by `AuthContext.jsx:105-111` and `src/lib/identity.js:146` | browser id + account id | the client on sign-in | **refused (403)** by the worker: verified by a probe of the built worker in this package (a member token, a window of the public site). So the public build records **no browser-to-account link**. |

## 2. Gap table

| # | Requirement | Status | Where | What exactly is missing |
|---|---|---|---|---|
| 1 | Measure **pages**: every real page view, for guests and members | **Implemented** by this package | `src/App2029.jsx:171-211`, `src/lib/visits.js:40-58`, `transport.js:307-309`; proved by `test/measurement-visit-once-2029.browser.mjs` (4 profiles) and `test/measurement-page-view-once-2029.test.mjs` | The stored page is the **normalized family** (`/post/:item`, `/number/:value`), not the specific post or number. Which public item was opened is recorded only for post views through `content/view` (`item_id`). A route label that names the item is the separate expansion X1 of the closure list. Raw `history.pushState` calls inside a reader (`BookSourceReader2029.jsx:144`, `AhavatTorahSystem2029Page.jsx:173`) are not router navigations and are not page views. |
| 2 | Measure **arrival sources** | **Partly** | external referrer host: `visits.js:44,52`; source and campaign tag once per browser session: `events.js:120-132`, `visits.js:46` | (a) The arrival row has no browser id and is not linked to the visit, so "visitors per source" cannot be computed from `events`. (b) Only `?src=`/`?via=`/`utm_source` and the referrer host are read; `utm_medium`, `utm_campaign`, `utm_content` and click ids are not (X2 of the closure list, and advertising or GA4/Meta work). (c) The referrer host is sent on the first visit of every **page load**, and a browser keeps `document.referrer` on refresh, so a refresh repeats the original source. (d) The admin reader `arrival_sources` reads `visitor_events`, not `events` (`20260930153000_g3_telemetry_retention_120d_v2.sql:231-254`): nothing from the public build reaches it. |
| 3 | A **browser identifier** for guests | **Partly** | visits only: `visits.js:52`, `publicReadingTelemetry2029.js:34-44` | Engagement, actions, content views and the arrival row carry no browser id (`App2029.jsx:210`, `events.js:110`, validators `:50` and `:131`). A visitor's visits cannot be joined to what they did. **Not built here**, see D2. |
| 4 | An **account identifier** for signed-in members | **Missing** | nowhere | (a) No code path sends it. (b) The browser cannot send it safely: the public anon key lets anyone post any id, so a client-supplied account id is a claim, not a measurement. (c) The worker rewrites every measurement request to the anon key (`transport.js:305`), so the database cannot derive it from the session either. (d) `track_visit` stores only `path, referrer, visitor, device, is_bot` (`scripts/traffic_two_meter.sql:23-34`; the live function may differ, read it before relying on this). (e) The identity-link calls are refused (table above). It needs the worker to verify the member (`verifyReadingPrincipal` exists, `admin-request.js:5`) and forward the member's token to a database function that stores `auth.uid()` itself: a database and worker change, see D3. |
| 5 | **Detail for the administrator** | **Partly** | readers listed in `readers-and-comparability.md` | The readers of `site_visits` (`visits_stats`, `admin_real_traffic`, `admin_live_visitors` with its trail) work and are **more correct** after the fix. The new terminal's reader `admin_2029_analytics` (`OperationalMetrics2029.jsx`) lists a person only if the person has a `page/view` row in `events`, and the public build writes none (closure list C3, P0). No reader reads the new `events` surfaces (`arrival`, `share`, `join`, `content`, `calculator_2029`, `entry_2029`, `journey_2029`) yet (M1). |
| 6 | Pages and arrival sources are the **only** subject | **Holds** | `readingActionSpec` (`publicReadingTelemetry2029.js:95-110`) | Nothing outside the closed event lists is admitted; free text (expressions, queries, slugs, share ids) never leaves the browser. |

## 3. What was implemented, and what was deliberately not

**Implemented because it is small, local, safe and inside the decision:** nothing new beyond the visit and the browser-id that already exist.
The one gap that is cheap to close in this package's files, the browser id on `ingest_event`, was **not** built, for three reasons that are all visible in the repository:

1. `ingest_event` resolves a person for the `p_sod_id` it receives (`v_person := public.resolve_person(p_sod_id, p_app_context, p_via)` in the function body recorded at `20260909130000_bot_observability_ingest_cleanup_v1.sql:44-56`; that is the 13-argument overload that migration dropped, so the current 14-argument body must be read live before relying on it) and the KPI and Traffic Intelligence readers count people by it (`20261008170750_g4_kpi_funnel_aggregation_v1.sql`). Sending an id from every public browser would therefore very probably **create person rows and change `daily_kpi`**: a database-visible decision, not a client detail.
2. Two ids exist: `sod_vid` (the browser visitor that `track_visit` carries) and `sod_id` (the identity spine that `ingest_event` expects). Which one the events should carry decides whether visits and events can ever be joined (`src/lib/identity.js`, "IDENTITY_UNIFICATION_V1").
3. The validators and the worker tests state "no identity" on purpose; changing them is changing a contract that the decision has to name.

**Presented separately (no code written):**

| Id | Decision or change | In one line |
|---|---|---|
| D2 | Browser id on engagement, actions, content views and arrival | Say which id (`sod_vid` or `sod_id`) and accept that the database then creates a person for each public browser; then three validators, one emitter and one engagement call change. |
| D3 | Account id for members | Needs a database function that records the signed-in user on the server, and the worker forwarding the member's token for that one call; the browser alone cannot do it safely. |
| D4 | Page views as `events` rows with identity and session (closure list C3) | Either the public build writes `page/view` with a browser id and session so the new terminal's reader and Traffic Intelligence see it, or `site_visits` is declared the canonical source and the readers change. This package makes `site_visits` correct; it does not choose. |
| D5 | Readers of the new `events` surfaces | `arrival_sources`, share and join reports, hot posts, AI usage still read `visitor_events` and `page_views`; they need to read `events` (M1, database or report work). |
| D6 | Wider arrival detail | `utm_medium`, `utm_campaign`, `utm_content`, click ids, a full referrer: collection expansion (X2), advertising and GA4/Meta, each its own decision. |
| D7 | Publishing activity to the public | Not touched by this package and not proposed. |
