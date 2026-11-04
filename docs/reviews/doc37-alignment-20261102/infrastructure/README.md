# Doc37 alignment — infrastructure reconciliation

Date: 2026-11-02. Base `979c25aa2a91fa96de3a50db8fc93425a183c694`.
Parent BEFORE: `5ce04c53-2a9e-46ce-a36d-e6be51e7de71`.
Scope: documentation and exact proposed SQL only. Shared database, schedules,
functions, flags, providers and product data were **not changed**.

## Later authorized application — read-only verification

The initial inventory and proposals below retain their original pre-apply state.
After the user's explicit approval of the exact package, root applied the three
cron pauses and view migration `20261102130753_doc37_current_authority_views`.
This lane performed read-only post-verification, recorded in
`post-apply-receipt.json`:

- Jobs125/126/127 are inactive; names, command digests and schedules unchanged.
- `rules_active` now selects87 rules and0 inactive versions.
- Source history still contains122 BEFORE records with explicit parent-linked
  releases; none are projected into `work_log_current`.
- Both views retain their owners/options/ACL and their6/32 columns respectively.
- Migration statements contain no DELETE/TRUNCATE/INSERT/UPDATE. The source
  work-log still spans June–November and rule history remains present. This is
  structural verification, not a before/after full-data backup comparison.
- No newsletter or email deployment acceptance is claimed by this receipt.

The cron/view findings are now **APPLIED BY ROOT / READ-ONLY VERIFIED**. Storage
collector freshness, historic compatibility and separate recovery gates remain
as described below. The child agent did not execute a shared mutation.

## Evidence and boundaries

Canonical project: `linswmnnkjxvweumprav`. SQL used the dedicated read-only
connector; observed `supabase_read_only_user`, `transaction_read_only=on`.
Deployed Edge metadata was read through the ordinary Supabase metadata connector,
without invoking a function. No raw messages, emails, private research, media
objects, credentials, cron authorization headers or secrets were exported.

Existing sources consumed, not replaced:

- `audits/g3-implementation-compaction/G3_2029_CONTROL_PLANE_LEGACY_SHUTDOWN_MATRIX_V1.md`
- `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`
- `audits/g4-gemini-cto-review/GEMINI_CTO_REVIEW_RECONCILIATION_V1.md`
- Current active `nodes` owners: Foundation v7, Coordination v17, Work Log v2,
  Traffic v11, System Suggestions v5, Intake v13, Subscription Funnel **v21**.
  The repository's Funnel v19 pointer is historical; no owner body was edited.
- Previous public acceptance/recovery receipts under
  `docs/reviews/public-launch-closure-20261102/`.

The G3 September counts and the October CTO counts are historical evidence.
Current inventory: **40 cron jobs, 31 active / 9 inactive; 91 deployed Edge
functions, all ACTIVE; 66 with verify_jwt=false**. ACTIVE means deployed, not
proof of recent use. `verify_jwt=false` is not sufficient to declare an endpoint
unprotected: caller-specific auth must be checked individually.

Receipts: `live-readonly-receipt.json`, `edge-metadata.json`,
`foundation-delta-receipt.json`. Cron command text was reduced to target name and
digest. Success of a cron HTTP enqueue does not prove success of the remote Edge
execution or delivery. No actual message/model/social-publishing test was run.

## Reconciliation against G3 and the foundation challenge

| Existing finding / component | Current evidence | Disposition / launch relevance |
|---|---|---|
| Old agent coordination recovery | Jobs125/126/127 active every minute; 4,320 SQL invocations/24h; zero pending active dispatch rows | **STILL EXISTS / RETIRE SCHEDULE ONLY after authorization**. v17 supersedes automatic reporting/wake duties. Preserve jobs/history/functions. Precise reversible proposal supplied. |
| GPT result emitter | Live `agent_dispatch_emit_gpt` body is `BEGIN RETURN NULL; END` | **FIXED containment**; do not reactivate historical transport. Recovery still polls. |
| `rules_active` presents archived authority | View does not filter is_active; 271 rows, 184 select an inactive version | **STILL EXISTS / INTEGRATE into existing view**. Correct selection to latest active version, preserving names/ACL/owner. Existing active owner routing already bypasses this view. |
| `work_log_current` presents released BEFORE | Explicit later parent-linked releases still leave 23 BEFORE rows in current; separate broader same-task heuristic finds55 older active-looking rows | **STILL EXISTS / BOUNDED FIX proposed**. Remove only explicitly parent-released BEFORE from current. Do not infer all55 are obsolete or treat recent-history membership as active ownership. |
| Meaning Lab periodic workers | lab-reflect106 and wa-mora117 both inactive | **FIXED scheduled execution**. Deployed functions remain; external/on-demand callers not disproven. No blanket function deletion. |
| Post verification-looking convergence promotion | posts.trg_convergence_promote is disabled | **FIXED writer containment**. Preserve rows/function/migration history; no need to run a live post write. |
| Stable Zvi writer/source binding | Live contribution approval trigger compares stable contributor/user IDs; no historical credit-label matching | **FIXED compared with October CTO finding**. Existing approved identity binding is retained. |
| Graph vocabulary enforcement | Edges/identity_edges have no CHECK vocabulary constraint; relation_evidence has only status CHECK in inspected constraints | **STILL EXISTS foundation debt**. No alias migration or invented relation merging. Existing public read candidate does not add a writer; separate owner-qualified writer change remains necessary before expanding graph writes. |
| Synthetic ticker writers | Post/anchor/finding/publishedELS ticker triggers still enabled | **TEMPORARY COMPATIBILITY**. Legacy and existing channels still consume their output. Hiding source rail or changing Home is not retirement proof. |
| WhatsApp source ingestion | wa-channel-ingest102 every5min; wa-webhook and existing workers deployed | **KEEP CURRENT**. Required for source material and Legacy. Raw ingestion must not automatically become published series membership. |
| Research-intake schedule | wa-channel-research-intake128 inactive | **ALREADY PAUSED**. Preserve ingestion/source data and deployed function. Do not activate merely because the public series UI changes. |
| WhatsApp Raziel/outbox | wa-raziel114 and wa-system-outbox154 every2min; stuck-message checker39 every15min | **KEEP CURRENT / separate channel**. Closing public web Raziel is not authorization to disable established WhatsApp service. |
| Old WhatsApp polling/bot aliases | jobs6/7/22/24/26/27 inactive | **ALREADY PAUSED**. Deployment existence is not evidence of scheduled cost; no deletion. |
| OCR extraction and semantic wiring | gallery_images.feed_after_ocr enabled; calls feed_image_to_search and wire_image_meaningful, which can insert image/number nodes and contains edges | **TEMPORARY COMPATIBILITY / STILL EXISTS**. Extraction and automatic semantic promotion differ. No shutdown without source/writer replacement proof; no media edited in this task. |
| Fixed-method Gematria trigger | trg_gw_enforce_engine active; writes14 fixed compatibility columns plus all_values | **TEMPORARY COMPATIBILITY**. Existing canonical engines/legacy writers rely on field parity. Do not remove for public load optimization. |
| Thumbnail generation | gallery110/post111/channel112 crons active, same gen-thumb target with different source jobs | **KEEP CURRENT**. Same function is not redundant work proof. Preserve originals and derivative identity. |
| Video enrichment | video-map-enrich132 active every30min | **KEEP CURRENT**. Used by published source/media projections, separate from fetching offscreen media in browser. |
| Storage egress sensor | Last analytics_cache observation2026-10-06 06:59:12UTC;182 retained observations,0last24h; no collector in current cron/Edge inventory/source search | **STILL EXISTS / MISSING COLLECTOR INTERFACE**. Existing health owner reads cache; missing observations must remain stale/unknown, never0. No new monitoring system or fabricated refresh. |
| Dedicated opening-only email | newsletter signup/source path + welcome-backfill118 and general newsletter can currently select general subscribers | **LAUNCH DEPENDENCY** addressed by mail lane. Purpose isolation must cover signup, scheduled welcome and later bulk send; cosmetic source label is insufficient. |
| Research nurture | research-nurture121 active daily; source reads research_leads, not subscribers | **KEEP CURRENT / separate consent path**. Opening-only subscription alone must not create a research lead; identity lane blocks automatic research/marketing effects. |
| Page/reply email | jobs119/120 active | **KEEP CURRENT** for existing opted service workflows. Not a reason to grant messaging permission at login. |
| Social publication | share-to-facebook122 active every30min | **KEEP CURRENT**. Public reading/share UI is not permission to auto-publish. No live publisher invocation. |
| Security/health audits | security3, RLS30, Edge34, health45, watchman113 active | **KEEP CURRENT** independently of Legacy UI. SQL success is not provider health proof. |
| Traffic/GSC/KPI | traffic47, GSC109, KPI155/156 active | **KEEP CURRENT** existing rollups/history. Public-reading client suppresses collection; do not enable marketing to populate a Home activity meter. |
| Telemetry/history retention | cron54, work-log138, telemetry145 active;145 took78.4s in one daily run | **KEEP CURRENT pending workload evidence**. Once-daily wall time is not Home-request latency. Preserve existing retention authority; no new purge system. |
| Historical queues | wa_deep_queue102done, no pending; media_migration_queue4357done/80missing/8giant, lastupdatesJune | **HISTORY / NEEDS EVIDENCE before retirement**. No new launch-blocking queue replay justified; no blanket deletion. |
| discovery_events/raw_gematria/insights/research_candidates/journey_seeds | No triggers with matching writer names in bounded trigger census; historical G3 classification preserved | **NEEDS EVIDENCE if retirement proposed**, not proof of zero writers. No new public-path dependence added here; defer destructive review. |
| tmp/test/oneoff deployed functions | Historical audit names remain in deployed inventory | **NEEDS CALLER/LOG EVIDENCE**, not removable solely by name. No current launch call or demonstrated load tied to them in this pass. |
| Legacy public renderer / root | Still required as live site and rollback target | **TEMPORARY COMPATIBILITY**. No cutover or Legacy removal permitted by this task. |
| URLs and Exact Return | Existing accepted public route/return receipts retained; later address decision supersedes older pilot-only CTO wording | **REPLACED planning / preserve acceptance**. Rerun affected paths only after shared candidate changes. |
| Backups, DB/media restore and hosted release configuration | Separate previous recovery access request and dormant artifact acceptance | **SEPARATE TRANSITION GATES**, not satisfied by source cleanup or this inventory. |

## Measured effect and scope of inference

The three agent jobs each ran1,440 times in the sampled24h. Mean SQL wall time:
125=0.0161s,126=0.0277s,127=0.0288s, about104.5aggregate seconds/day. Pausing
them removes4,320 scheduled invocations/day at this cadence. These are server
scheduler observations, **not a measurement of browser performance or provider
CPU billing**. They do not explain the roughly5s mobile Home startup.

The Home cold/warm evidence and admission attribution belong to the central and
runtime lanes. No parallel browser/performance measurement ran here. SQL proposal
fixtures completed before the root's exclusive performance window.

## Exact proposed shared changes

1. `proposed-pause-obsolete-coordination.sql`: only cron125/126/127 active=false;
   checks job name+command digest, zero pending dispatch, and active v17 authority.
   Reversible active=true instructions included. No history deletion or function
   removal. If identities, authority or queue state differ, abort.
2. `proposed-current-views.sql`: preserve existing view names/columns/owner/ACL;
   rules select active versions; current journal omits only parent-linked
   explicitly released BEFORE rows. Original definitions are in
   `rollback-rules_active.sql` and `rollback-work_log_current.sql`.
   Before apply, compare current definitions and ACLs with the receipt and abort
   on drift. No blanket latest-task or text-only ownership inference.
3. Storage observation: no executable collector proposal is honest until the
   existing collector/provider-log access is located. Required interface is a
   bounded aggregate of actual Storage response bytes/time/cache class from the
   authorized provider log source into existing analytics_cache, with source
   window and computation time. No private object paths in public output, no
   fake timestamp, no claims about billed cached-egress without provider billing.
   Reconnect an existing approved collector if found; otherwise present its exact
   credentials/access/run schedule proposal separately. Do not start a new daemon.

All three remain **NOT APPLIED**. Cron/view proposals are distinct from changes
to product DB/RLS and from the mail-purpose migration proposed by the mail lane.
The September G3 matrix is planning evidence, not standalone mutation authority.

## Verification performed

`replay-proposals.mjs`: **16 passed,0 failed**, PGlite0.5.14 in-memory PostgreSQL,
synthetic rows only. Verified active-only authority, inactive-newer version,
explicit release, independent parallel claim preservation, row-history and
column preservation, unchanged anon denial, idempotency, view rollback, scoped
job pause/rollback, active queue rejection, job identity drift, authority drift
and no collateral job changes. `cron.alter_job` is an explicit test double because
the embedded engine has no scheduler; this does **not** prove a live cron change.

Invocation (dependency pinned outside repo):

```sh
PGLITE_MODULE=/tmp/doc37-infra-sql-20261102/node_modules/@electric-sql/pglite/dist/index.js node docs/reviews/doc37-alignment-20261102/infrastructure/replay-proposals.mjs
```

No deployment, messages, AI calls, real subscriber changes, research mutations,
private exports, function invocations, or branch deletions occurred. Existing
current journal remains a mixed current/recent evidence view; readers must not
call every returned row an active assignment even after the bounded proposal.

## Bounded conclusion

Opening-only mailing is a direct dependency of the newly approved launch form.
Coordination polling and misleading current views have concrete reversible
maintenance proposals. The stale egress collector is an observability gap and
prevents fresh egress/billing claims. Historic islands without demonstrated
public-path impact stay documented for maintenance. This inventory does not
reopen unrelated accepted public route gates or declare full graph/ELS/Heichal
acceptance. Real backup recovery and final publication acceptance remain separate.
