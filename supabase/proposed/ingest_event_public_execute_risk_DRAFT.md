# Existing risk — `public.ingest_event` is executable by PUBLIC — DRAFT NOTE

**Pre-existing. NOT introduced or changed by PR #1259 (apart from the one `GUARD` line). This note changes no ACL and proposes no change in the PR.**
Evidence tags: **V** live read-only query, 6.11.2026 · **P** proposal text · **—** not verified.

## What is true now (V)
- ACL is `NULL` in `pg_proc` = the default, i.e. **EXECUTE for PUBLIC** (so `anon` and `authenticated` can call it through `/rest/v1/rpc/ingest_event`).
- `SECURITY DEFINER`, owner `postgres`, `search_path=public`.
- 14 parameters, all caller-controlled: `p_sod_id, p_surface, p_event_type, p_path, p_ref_host, p_via, p_app_context, p_device, p_session_id, p_journey_id, p_depth, p_utm, p_props` (free `jsonb`), `p_is_bot`.
- The body (1,295 chars, md5 `ed1d68fe…`) has **no rate limit, no size check, no surface/event allow-list, no authentication check**. It calls `resolve_person(p_sod_id, …)` with a caller-supplied `sod_id` and inserts the row (always with `is_bot=false`).
- The live advisors list it among the **295** `SECURITY DEFINER` functions executable by `anon` and by `authenticated` (WARN).
- Legitimate public callers exist in the repository: `events.js`, `engagement.js`, `webVitals2029.js`, `identity.js`, `runtimeErrorCapture`, and the public-reading service worker. The worker's allow-list is **client-side** and does not bind a direct caller.
- Largest `events.props` seen in 7 days: 967 bytes; none above 1 KB (V).

## Risks (reasoning from the above; not observed attacks)
1. **Row injection:** any client can write arbitrary rows to `events` for any surface/event type, with no volume limit, until storage or the gateway stops it.
2. **Forged attribution:** a caller can supply any `sod_id`/`session_id`, polluting person-level analytics and `resolve_person` effects (its behaviour was not examined here, —).
3. **Forged provenance in `props`:** a caller can write `props` such as `actor_class` or `beacon` on a row of their choosing. Projections that trust `props` fields without pinning surface, event type and, for compute, a join to `reading_activity_ids` can be polluted. (The `GUARD` line closes only `surface='gematria'` + the three reserved types.)
4. **Cost:** unbounded writes to a partitioned table that is retained 120 days.
5. **Scanner visibility:** it is one of 295 anon-executable definer functions, so it is not unusual here, but it is a high-volume generic writer.

## What I did not do
No ACL change, no rate limit, no schema change, no PR scope expansion. No attempt was made to call the function.

## Options (for ZURIEL; each needs its own approval and a caller inventory first)
1. **Leave as is** and document it as a known pre-existing exposure (current state).
2. **Bound it without breaking callers:** add a per-address limit and a size cap inside the function (observed props maximum 967 bytes), keeping PUBLIC execute.
3. **Allow-list surfaces/event types** inside the function from the callers above.
4. **Move callers to dedicated RPCs** (as this PR does for compute) and then revoke PUBLIC execute from `ingest_event`.
Any of 2–4 changes live behaviour for existing callers and belongs to a separate change under the existing owner, with its own regression tests; this PR should not carry it.
