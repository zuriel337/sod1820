# Threat / risk plans — four public write RPCs (DRAFT, read-only; nothing applied)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Scope: increment_post_share, ingest_event, fn_log_name_research, ingest_reading_activity_v1. No SQL, ACL, DB or code change was made.
Evidence tags: **V** live read-only SELECT on linswmnnkjxvweumprav, 7.11.2026 · **C** code of main@394a2ba8 · **P** PR #1259 draft text (head 39f57e3e) · **—** not verified.
Ratings are qualitative judgements (Likelihood × Impact), not measurements. "Observed" means seen in aggregate data; no attack was observed or attempted.
Limits of the evidence: `track_functions = none` (V), so per-function call counts do not exist; gateway logs were not read here.

> **Superseded in part (7.11.2026):** the RP-1 retirement plan is [05](05-retirement-plan-increment-post-share.md); `ingest_event` measurement is [06](06-ingest-event-observe-report.md); the name research log is [07](07-name-research-log-impact-and-retention-30-180.md) and [08](08-retirement-plan-fn-log-name-research.md) (writer reachability corrected there). Live production is now main@cfda877a, not 394a2ba8.

## Cross-cutting findings
- The only server-side protection of a public RPC is inside the function (the anon key is public; the service worker allow-list binds only the browser).
- `edge_rate_limit_check` (V): SECURITY DEFINER, owner postgres, executable by postgres/service_role only (callable from another definer function); window clamped 60–3600 s,
  limit clamped 1..120, key must be 64 hex characters (else it raises), count-per-bucket in `private.edge_rate_limit_buckets`, 1 % random cleanup of buckets older than 2 h.
  It is the reusable building block for a per-address limit; the address must come from `request.headers->'cf-connecting-ip'`.
- **A1 (header trust) is a shared dependency** of every per-address control: PostgREST propagation (M3 / canary) and unforgeability (forged-header probe) must be settled once.
  ZURIEL decision 7.11: the PostgREST proof stays a MUST before any DB migration and is not replaced by the production canary.
- Retention (V): `fn_telemetry_retention_120d` prunes site_visits and visitor_events (and mentions events); nothing mentions name_research_log or post_share_counts.
- Inventory: advisors count 295 anon-executable SECURITY DEFINER functions; ingest_reading_activity_v1 would be the 296th.

---
## RP-1 `increment_post_share(p_wp_id bigint)`
**Facts.** V: SECURITY DEFINER (postgres), EXECUTE for PUBLIC/anon/authenticated; body (466 chars) upserts `post_share_counts` for ANY bigint and returns the new count — no validation,
no rate limit, no dedupe. Table: RLS on, anon SELECT policy, 1,188 rows, sum 96,718, max 777, none ≥ 1,000, **0 rows updated in 7 days**, 0 rows without a matching post.
Sibling `increment_post_share_by_slug(p_slug)` (V): same increment, but only for an existing post; also anon-executable. No other function reads the table except an admin inventory function (V).
C: the only code is the wrapper `incrementShareCount` and `subscribeShareCount` in `src/lib/supabase.js`; **neither has a caller** in the tree, nor have the two RPCs (whole-tree grep, tests excluded).
**Class.** Nominally PUBLIC_BOUNDED_WRITE; the evidence points to INTERNAL_ONLY / RETIRE (S1 class "no active public consumer").
**Threats.**
| # | Threat | L | I | Basis |
|---|---|---|---|---|
| T1 | Forge the publicly readable counter (tampering) | Low–Med | Low | trivial to script; no UI consumer found, so impact is cosmetic today |
| T2 | Unbounded row creation by arbitrary ids | Low | Low–Med | one row per id; V shows no past abuse (0 unmatched ids) |
| T3 | Dead executable surface kept without value | Med | Low | two anon writers, no consumer, no write in 7 days |
**Rating:** Low today. The cheapest risk reduction is retirement, not hardening.
**Options (none applied).** O1 retire both functions after consumer proof (gateway logs 30–90 days for /rpc/increment_post_share*, check the legacy WordPress side), then REVOKE or drop and delete the dead wrappers;
O2 keep and harden (require an existing post, per-address cap via edge_rate_limit_check, per-visitor/day dedupe); O3 accept and document.
**Recommended:** O1. **Evidence still missing:** gateway call logs; product decision on whether share counts return.
**Tests when approved:** anon call → 42501; client build has no reference; rollback = re-GRANT statement; no change to posts/sitemap.
**Gate/owner:** S2/S3 inventory item, ZURIEL approval; DB change — not part of this plan.

---
## RP-2 `ingest_event(…14 caller-controlled parameters…)`
**Facts.** V: SECURITY DEFINER (postgres), EXECUTE for PUBLIC/anon/authenticated, body 1,295 chars: drops calls with `p_is_bot=true`, calls `resolve_person(p_sod_id, p_app_context, p_via)`,
inserts into `events` with `is_bot=false`. No size check, no rate limit, no allow-list, no auth check (P, confirmed by V).
**Side effects not covered by the PR note (V):** `resolve_person` (definer, not callable by anon directly) takes an advisory lock per sod_id and, for an unseen sod_id, inserts into `persons`, `identity_edges`
and `sod_id_registry`; for a seen one it updates last_seen in all three. Sizes: persons ≈142.6k, identity_edges ≈206k, sod_id_registry ≈138k; new persons 632 in 24 h and 4,021 in 7 days.
So one forged call can create up to four rows in four tables, not one.
**Volumes (V):** events 284 in 24 h, 23,755 in 7 days; 30-day top pairs: page/view 31,126; page/engagement 20,419; or-geula/story_impression 11,119; gematria/compute 10,035; arrival/source 8,671;
post_experience/scroll_depth 5,766; … performance/web_vital 1,080. Largest props in 30 days: **1,207 bytes (performance/web_vital)**; in 7 days 967; in 24 h 883.
→ a flat 1,024-byte cap would already have rejected legitimate web_vital events seen in the last 30 days.
**Callers (C):** events.js, engagement.js, webVitals2029.js, identity.js, runtime error capture, plus the public-reading worker (its allow-list for performance/issue_report is browser-side only).
**Interplay:** PR #1259 recreates the body with one `GUARD` line (reserved surface='gematria' + three compute types). Two writers on one function body must be sequenced.
**Threats.**
| # | Threat | L | I |
|---|---|---|---|
| T1 | Row injection / volume cost (120-day retention) | Med | Med |
| T2 | Identity pollution: forged sod_id mints persons/edges/registry rows; attribution to another sod_id if one leaks | Med | Med |
| T3 | Forged provenance inside props (actor_class, beacon) trusted by a projection | Med | Med |
| T4 | Self-declared `p_is_bot` lets a client opt out of logging (measurement only) | High | Low |
| T5 | Large jsonb in p_utm/p_props limited only by the gateway | Low–Med | Low–Med |
| T6 | Advisory-lock serialization on one hot sod_id | Low | Low |
**Rating:** Medium — the broadest generic writer; observed volumes are small, which makes an abuse spike easy to detect (monitoring is itself a control).
**Plan (sequenced; each step needs its own approval and a regression matrix like the 242-case one in the PR):**
0. Read-only: complete the caller inventory (full 30-day pair list incl. the long tail; gateway logs for direct callers); measure per-session events per minute (needed to size any per-address limit).
1. Per-pair size caps from observed maxima (not a flat 1,024).
2. Per-address limit with edge_rate_limit_check — only after A1 is settled; size it from the per-session burst data (page + engagement + web_vitals fire several events per page).
3. Allow-list of (surface, event_type): unknown pairs are counted and dropped, as in reading_activity_outcomes.
4. Bound identity minting (only accept sod_id of the expected format; cap new sod_ids per address per hour).
5. Dedicated RPCs for high-value event families and then revoke PUBLIC EXECUTE.
Risk of the change itself: silent telemetry loss → measure drop rate per pair, canary, rollback = previous body (md5 `ed1d68fe…` per P).
**Open questions:** are there callers outside this repo (WordPress, other apps)? What is the intended retention of persons/identity_edges?

---
## RP-3 `fn_log_name_research(p_doc jsonb, p_ms integer)`
**Facts.** V: SECURITY DEFINER (postgres), EXECUTE for PUBLIC/anon/authenticated; inserts one row into `name_research_log`: `name_norm = left(p_doc.input.components.full, 80)` — **the typed full name** —,
name length, language, flags (surname / birthdate / question as booleans only), track counts, `elapsed_ms`, and `track_status` aggregated from the client-supplied tracks array.
Table: RLS on, no policy, anon has no privilege; 1,294 rows since 2026-07-28; 936 distinct names; 672 rows with a surname; 0 with birthdate or question; 52 rows in 7 days, 0 in 24 h;
largest track_status 1,186 bytes; largest elapsed_ms 105,335. Readers (V): only `fn_name_research_stats` (anon-executable) which returns aggregates and **no names**; no admin function reads the table.
Retention: none (V). C: called fire-and-forget by `NameMultiSearch` (rendered by the community calculator) after each search, including deep-link auto-runs from a `?name=` parameter.
**Class.** PUBLIC_BOUNDED_WRITE carrying personal data. Foundation MUST G3-E (privacy lifecycle: consent, retention, export, erasure) applies.
**Threats.**
| # | Threat | L | I |
|---|---|---|---|
| P1 | Personal data (names of people, possibly third parties or minors) stored with no consent text, no retention, no subject key → export/erasure impossible | High (it happens every search) | Med |
| P2 | Access: only DB roles/service role can read names today; any future reader or dump exposes them | Low | Med |
| P3 | Row/size abuse: unlimited rows; the tracks array is unbounded except by the gateway | Low–Med | Low |
| P4 | Forged quality metrics in the stats reader | Low | Low |
| P5 | A crafted `?name=` link makes a visitor's browser log an arbitrary name | Med | Low |
**Rating:** Medium for privacy, Low for abuse.
**Plan (no dependency on A1 for steps A–C):**
A. Data minimization: stop storing the name text (keep length, language, flags, counts); decision on the existing 1,294 rows (keep / redact / delete) is a separate explicit approval.
B. Retention: add the table to the existing telemetry retention (e.g. 90–180 days; period is a policy decision).
C. Input caps: bound the tracks array length and string lengths, clamp elapsed_ms.
D. Per-address limit via edge_rate_limit_check (after A1). E. UI transparency line that searches are logged for quality (product/legal wording).
F. If a distinct-name metric is needed, store a salted hash, not the name.
**Tests when approved:** a logged row contains no name; an oversized p_doc is rejected; retention removes rows older than N days; fn_name_research_stats output unchanged.
**Evidence still missing:** owner policy for retention and for the existing rows; whether any off-repo dashboard reads name_norm.

---
## RP-4 `ingest_reading_activity_v1(p_event_type, p_path, p_app_context, p_props)` — proposal in PR #1259 (head 39f57e3e), NOT in the database
**Facts.** V: no such function or table exists on the live project. P: 7 ordered controls (trusted address, per-address 60/min, size bounds, closed schema, account-id guard,
global 120/min, exactly-once key table) + counters; owner definer; `set search_path = public, pg_temp`; EXECUTE anon, authenticated, service_role (not PUBLIC).
The PR session has added three draft documents (threat model, ingest_event risk note, RPC inventory) and a decision document after my previous read (commits 14:06–14:24 UTC, 6.11): the PR scope has an active writer.
**This plan is an independent review, not a duplicate of the PR threat model.** Points I would hold the PR to:
1. **A1 is the linchpin.** The address limit and the fail-closed `no_address` path both rely on `cf-connecting-ip`. The canary shows presence, not unforgeability; the PostgREST run proves propagation only.
   MUST (ZURIEL 7.11): PostgREST proof before any migration; add a forged-header probe (read-only logs) for unforgeability. Status: `scripts/run-reading-activity-postgrest-test.sh` exists, the test file does not.
2. **No daily bound.** At the ceilings the function accepts up to 172,800 rows/day; observed real peak is 22/min. A lower global cap (e.g. 60/min) or a daily cap is a small SQL edit in the proposal.
3. **Least privilege.** `service_role` EXECUTE on the RPC is unnecessary (the beacon is anonymous).
4. **Bypass through ingest_event** (RP-2): the GUARD blocks only surface='gematria' + the three reserved types. Any projection must pin surface, type AND join `reading_activity_ids`.
5. **Inventory and S2:** classify as PUBLIC_BOUNDED_WRITE and record it in the owner inventory (295 → 296) before the DB step; the draft states it cannot yet be recorded as meeting S2.
6. **Rollback is written but not drilled.** Require a drill on a disposable replica before approval.
7. **Single writer.** Sequence the ingest_event body change with RP-2 so two changes do not edit the same function.
**Rating:** Medium until A1 is proven; Low–Medium after the PostgREST proof, a daily/lower cap and the inventory entry.
