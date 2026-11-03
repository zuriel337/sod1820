# CP1 bounded operational review — read only

Base: `957e4a6a7148f20cadd921303d8c9a86a8b6a7b5`; workspace `/tmp/sod1820-continuity-closure`.
Review date: 2026-11-03. This is evidence for root's narrow fixes, not a new plan or G3 audit.

The four existing operational RPCs and their admin guards exist. The current screen can answer part of the operational questions, but omits cron/security/query timestamps already returned and mislabels some unknown, stale and capped values. No repository, shared setting, data, deployment or permission was changed by this reviewer. No model, test mail, assumed admin JWT/auth.uid or private trace payload was used.

## What an operator minimally needs to answer

| Question | Existing answer/source | Remaining precise gap at pinned base |
|---|---|---|
| Which release/profile is this, what is closed and how do we return to Legacy? | Root's exact deployment/build/release and rollback artifacts | Current ControlPlane does not show release SHA/profile. This review does not prove that the answer is reachable from2029 or that cutover occurred. |
| Is this observation current, old, failed or unknown? | `health.generated_at`, `video.generated_at`, cron last-run and egress observation time | Query time not displayed; query time alone must not make an old sensor look fresh. Some missing values become inactive/zero. |
| What needs attention now in DB, security and jobs? | `health.db`, `health.security`, `health.cron` already returned | Security/cron omitted. Root can project them without another source. Internal source fallbacks limit proof of universal health. |
| Can I inspect a recent action/outcome/cost, with an honest scope? | Trace list plus trace detail RPC | List capped at100 is labeled total7d; current selected detail is not refreshed if ID stays the same. |
| What are the media/AI cost and egress risks? | Existing media, video and usage aggregates and evidence bases | Storage observations stale; current provider billing unknown. Empty recent window is incorrectly described as never observed. |
| Are general2029 errors, traffic/discovery and recommendations operationally covered? | Existing CP1 plan/owners and prior runtime acceptance | Four RPCs are partial; trace outcomes and video indexability do not establish all10 required CP1 lenses. No new dashboard or source was built. |

The existing CP1 plan (lines47–76) still requires ten minimum lenses and says critical2029 operational questions must not depend on Legacy Admin. This review does **not** silently reduce that requirement or accept CP1 in full.

## Four existing RPCs and safe shapes

All four exist in the live source metadata, are security-definer, deny `anon` EXECUTE, allow `authenticated` EXECUTE and perform an existing admin check (with service-role exemption). They were **not** invoked by spoofing admin or setting auth.uid. Source/ACL evidence is distinct from browser authorization acceptance.

- `admin_system_health()` → `{db, cron, bots, communications, media, security, usage, retention, generated_at}`. `cron[]` contains **job_name, active, last_status, last_run_at, failures_24h**. `security` has **unacked, recent_24h**. `generated_at` is RPC query time, not every source's observation time.
- `admin_video_map_health()` → `{contract, owners, ai_policy, summary, source_placements, asset_kinds, series, channel_enrichment, cron, ai, generated_at}`. Video `cron` additionally contains **schedule**. Video `ai` contains **calls_7d, input_tokens_7d, output_tokens_7d, estimated_cost_usd_7d, estimated_cost_ils_7d, cost_basis, models**. `ai_policy.stt_runs_from_cron` is a real boolean; absent is unknown.
- `admin_op_trace_list_v1(7,100)` → array of bounded recent rows; **no total_count**. Helper/RPC maximum500; screen requests100. Rows include trace_id, started_at/ended_at, capability, surface, channel, identity_class, outcome, span_count, linked_ai_calls, linked_ai_cost_ils, cost_certainty.
- `admin_op_trace_v1(trace_id)` → `{trace, spans, rollup}`. Actual private/context payloads were not retrieved. Screen uses operational fields; no new table or source is needed to refresh its existing detail.

`usage.storage_egress_observed_*` includes latest payload, latest_at,24h_bytes,24h_history and basis. History fields: **at, bytes, bot_share, largest_get_bytes, burst_files**. Guard becomes STALE after2h. Basis is **OBSERVED_STORAGE_LOGS**, separate from provider billed Cached Egress. Live24h sum uses `nullif(sum(...),0)`; tracked20260928113000 migration uses `coalesce(sum(...),0)`. Preserve live null as unknown, not zero measured usage.

## Actual readonly observations

Reader verified at `2026-11-03T16:35:12.299005Z`: dedicated connector, database role `supabase_read_only_user`, `transaction_read_only=on`.

| Source | Aggregate observation | Meaning / limit |
|---|---|---|
| Root traces7d |822; latest16:30:04.95Z |100 visible rows are not the total. Snapshot count must not be hardcoded into UI. Exact error/failed outcomes counted0, which is not proof of zero provider/browser/uninstrumented errors. |
| Security |66 unacked;3 in24h; latest05:07:00.029452Z |Real current aggregate; no alert details or acknowledgements read/written. |
| Hourly Storage observations |181 rows; latest2026-10-06T06:59:12.477772Z;0 in24h;~681.7h old |Verified stale observations, not failed DB connectivity or zero usage. |
| Old observed fallback |1 row; latest2026-09-28T08:20:48.970657Z;0 in24h |No fresh fallback under the other canonical key prefix. |
| Egress deadman |4 `sensor_stale` entries in24h; latest15:00:00.137128Z |Existing monitor detects stale observations. Does not generate fresh observations or prove alert delivery. |
| health-watch |Active, every15min; last16:30:00.099502Z succeeded |Scheduler ran; not proof of outbound delivery or collection. |
| security_spike_hourly |Active, minute7 hourly; last16:07:00.033897Z succeeded |Scheduler evidence only. |
| traffic-daily-refresh / video-map-enrich |Active; minute25 hourly / every30min |Configuration metadata; no writers invoked by reviewer. |

Only bounded metadata/aggregate/source definitions were read. No cron command, credential, email, IP, private trace body or subscriber data was retrieved.

## Narrow, actionable projection gaps

At `src/pages/ControlPlane2029Page.jsx`:

- **Lines90–134:** expose existing health/security/cron and query timestamps; describe project-wide aggregates honestly, not as2029-only.
- **Line133:** label returned traces as a capped recent list; show loading/error as unknown. No total-count RPC is available.
- **Lines153–155 and207:** say last observed snapshot with date/age; a stale historical observation plus no24h rows must not say no first observation or zero last-hour usage.
- **Line215:** `videoCron.active ? active : inactive` maps missing to inactive. Render true/false/unknown.
- **Line228:** `videoAi.calls_7d || 0` maps missing/error to zero. Preserve legitimate measured0 while treating absent as unknown.
- **Line229:** absent `stt_runs_from_cron` must not be called manual-only.
- **Lines67–88:** Refresh retains current selectedId; detail effect does not refetch sameID. A failed or changed list can leave old detail. Refresh through the existing fourth RPC, clear invalid selection/detail and ignore late results.

Existing `n/num` null-to-dash correction is already implemented; it is not reopened.

Existing live health-function exception handlers return security0/0 or cron[] on some internal failures. Today's direct source reads succeeded, so this is a **contract limitation**, not proof today's security data failed. A UI cannot manufacture per-source success from these fallbacks. Any shared-source contract change must be prepared separately; none was made.

## Egress producer: what is and is not established

Canonical owners: `traffic_intelligence_law v11` and `system_suggestions_law v5` (owner index216–217). Existing store is analytics_cache; existing reader is admin_system_health; existing stale monitor is fn_health_watch / health-watch.

Only those two public SQL function bodies reference the canonical egress prefixes. They read observations; the watcher writes stale alerts, not hourly measurements. No cron name or command references egress/storage. Bounded tracked scripts/Edge/workflow search did not identify the writer. The prior infrastructure receipt already records a **missing collector interface**. This does **not** prove that no external collector exists.

Exact next action: locate the **existing authorized Storage-log collector** configuration and last run, then prepare repair/reconnect and rollback for that same collector. Verify a genuinely fresh hourly entry with its original basis. Do not invent observations, update timestamps, add another store/daemon, or re-enable unrelated jobs. Fresh quota/cost assurance remains unavailable; the prior receipt treated this as nonblocking unless such assurance is needed for cutover.

## Acceptance boundary and user action

- Real source metadata/ACLs and aggregate reachability: verified readonly.
- Existing `scripts/test-2029-control-plane.mjs`: source/helper assertions, even though CI step says “Native”. Earlier controlled-auth fixtures are not a real signed-in admin acceptance.
- Real logged-in admin ControlPlane UI on the exact final preview: **not performed here**. No credentials/session were assumed.
- After root's narrow fixes, if root has no real admin session, the only user action for this slice is: **open `/2029/control` while already signed in as admin, press Refresh, verify query time/security/cron and truthful stale/capped states, open one existing trace, and report success/error without private payload**. No model, mail, save/edit or other write is needed. This alone does not waive other unresolved CP1 lens coverage.
- User's two-account basic operations already passed; no retest requested.
- User accepted current DB/media backup-verification risk; historical H1/current freshness uncertainty is **not a preparation blocker** here.
- No deployment, merge, domain change, source-setting change, account impersonation or live test write was performed.

Sanitized machine-readable details: `/tmp/finalprep-cp1-review.json`. Root is the sole integrator; findings are pinned to957e4a6a and may be superseded by its later narrow fixes.
