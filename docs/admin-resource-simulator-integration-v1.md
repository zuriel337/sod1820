# Admin resource simulator integration v1

Status: BRANCH IMPLEMENTATION / DRAFT REVIEW. No live deployment, DB apply or main merge is performed by this change.

## Behavior

An admin opens the existing `/2029/control` route and selects **סימולציה ומשאבים**. The private standalone TikTok lab's planning model now runs natively inside the existing 2029 frame, with editable workload assumptions, retention, cache/traffic, processing, quotas, rates, 12–24-month projections, sensitivity, named scenarios and JSON export/import. The standalone lab's version-1 JSON files import directly. The monitoring panel remains available beside it.

The model is a planning calculator, not a new operational, billing or media owner. Auth is still owned by `useAuth`/`isAdmin` and the canonical admin RPC authorization. `ResourceSimulator2029` receives the parent screen's already-read `admin_system_health()` response; it makes no new API/RPC calls and introduces no DB schema, table, server worker or production credential. Refresh delegates to the existing parent loader. The component loads lazily only after an administrator selects the simulation view.

## Measured stock is not monthly billing

- `media.storage.total_bytes`: current object-storage stock, decimal GB; optional explicit action uses this value **as an assumption** for monthly average existing storage. Source, measurement timestamp and `snapshot_assumption` classification are retained in state, saved snapshots and JSON.
- `db.database_bytes`: current total database stock, displayed separately; never imported into file-storage quota or the example data/log meter.
- `storage_egress_observed_24h_bytes`: observed daily traffic only; never multiplied into a claimed provider invoice or allocated automatically between cached/uncached pools.
- `supabase_cached_egress`: current provider meter retains its exact/estimated/unknown basis. Missing values remain unknown.
- historical billing remains historical and is never substituted for the current cycle.
- quotas, fixed fees, compute load and rates are editable planning assumptions until explicitly supplied. No account plan inference.

The shared 2029 semantic CSS variables own the palette and light/dark behavior. This integration ports the lab's card/chart/input layout without a second palette or shell. Scenario persistence is browser-local planning state, not a second operational store. It is not synced across devices; JSON is the portable transfer path.

## Recommended next additions (recommendations only)

1. **Attention / human decisions queue.** Compose existing System Suggestions, Command Center and owner-native pending/error states. Show owner, age, evidence, and the next existing authorized action. Keep research verification and publication gates explicit.
2. **Freshness and provenance on every metric.** Expose last measurement time and EXACT / OBSERVED / ESTIMATED / UNKNOWN, with independent loading/error states. Source failures must not become zeros or erase unrelated panels.
3. **Cleanup before/after projection.** Present existing `admin_retention_preview()` effects alongside the same planning model: what can be archived, dependency/provenance blockers, predicted freed storage and cost sensitivity. Purge remains separately authorized; no new cleanup ledger.
4. **Media ingestion pipeline view.** Compose existing video-map health, cron, queue/outbox and trace evidence into received → downloaded → processed → ready/failed. Identify retries, missing thumbnails, large assets, duplicate candidates and per-stage costs using available owner facts.
5. **Budget and viral-load planning.** Compare real measurements with saved workload assumptions and a manually supplied budget. Missing provider billing stays unknown; recommendations do not activate upload automation or change quotas.
6. **Release readiness and drift.** Surface branch / merged / deployed / live / verified separately, using existing release/work-log evidence and decision gates. Avoid marking a deployment live from repository main alone.

These recommendations extend the existing Internal Control Plane program in `docs/2029-implementation-dependency-plan-v1.md`; they are not implemented by this slice.

## Verification scope

- pure-model tests cover shared quotas, average versus end stock, cohort expiry, growth, retries, separate cache pools, proxy hops, credits and sensitivity;
- integration tests cover null preservation, units, source/time provenance, explicit snapshot assumption, old lab export compatibility and route/parent-data isolation;
- native Control Plane and 2029 isolation checks remain required;
- full build and reachable 2029 graph verification;
- live provider/RPC completeness is not inferred from local tests.

Local verification passed: 18 model/integration tests, the existing Control Plane, isolation, canonical wiring, system frame and built-graph checks, plus both production bundles. Browser interaction/visual verification could not be completed: the cloud browser could not reach the local fixture and blocked the error-page tab. This change does not claim browser or live-RPC verification.
