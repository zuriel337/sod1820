# Doc37 — capability, control and runtime reconciliation

Product source reviewed: `caba9eacd4fb8c0e13f2d6f851ecd806ca492f75`.
Evidence-only supplement; this document is not a new feature registry, permission
layer or acceptance gate. Existing runtime owners remain authoritative. Parent
BEFORE: `5ce04c53-2a9e-46ce-a36d-e6be51e7de71`; current coordination rechecked
read-only at `2026-11-02T14:02:13Z`, with no overlapping infrastructure writer.
No test, browser run, source edit or shared mutation was performed for this file.

## Existing controls and launch disposition

`PUBLIC_READING_RELEASE` requires a 2029 build and the exact existing
`VITE_PUBLIC_READING_RELEASE=public-reading-20261101` value. Its path projection,
`publicReadingFeatureLock`, `MaintenanceLock`, transport allowlist and server
authorization have different jobs; their coexistence is not itself duplication.
The profile does not rewrite shared `site_flags`. `CORE_PUBLIC_LAUNCH_2029=false`
and the Production lock remain in force. Preview flags are not user permissions.

| Capability / decision | Launch disposition | Existing controls / canonical source | What still runs or loads; Legacy dependency |
|---|---|---|---|
| Home event documentation | Required; implemented, final exact-Preview receipt belongs to root | `Home2029Page`, `HomeComposition2029`, existing category/source identity and public-post boundary | Primary reader remains. Event/strong-hint lead excludes explicit external series before download; no parallel content tree. Legacy Home unchanged. |
| Top updates card | Public closed; admin marked reading | Existing profile plus verified admin admission; account-keyed child reader | Public does not mount the latest reader. Closing this card does not close series below it or disable shared updates ingestion. |
| Public series, including Dim5 and Messages Righteous | Required; connected through existing reader | Existing shared series catalog and approved categories; publication/date/credit fields | Published series cards remain visible; per-series failure is isolated. A reading identity does not activate historical Follow migration. |
| Or Geula in the approved mixed series | Unclear item-level evidence, not permission to invent classification | Existing intake/publication owners; `../home.md` | Source and material preserved. No verified per-item update-to-series association yet; unrelated announcements must not be blanket-included. |
| Home lower summaries / world-dependent modules | Required content, loaded on approach | `useApproach2029`, `summaryRequested`, `worldOpen && worldRequested` | Seven pulse reads and temporal secondary work wait for approach; cancellation retained. They are deferred, not deleted. Root measures timing effect. |
| World, Number, expression, Gematria | Required public reading | Profile opens `lock_world`, `lock_number`, `lock_gematria`; existing engines/readers and exact-return state | Primary public data, calculations and local research context remain. No new engine/cache; Legacy calculators and compatibility columns remain. |
| Posts, old addresses, galleries, public source readers | Required public reading | `publicReadingPath`, canonical public lookup, existing address adapter and media authorization | Old slug/WordPress policy, canonical/share/back behavior retained. A permitted route is not evidence that every stored item is public. Legacy and rollback routes remain necessary. |
| Now, ticker, context rail | Required, active | Existing `useSystemFeed2029`, `nowOpen`, shared discovery stream | Base stream watcher remains for ticker/Now/context. Detail refresh requires open state; closing aborts and invalidates late results. Shared first-tier convergence reads remain. |
| Old source Companion | Hidden by explicit product decision | Existing `SystemFrame2029` visibility/admission conditions | Context rail stays mounted independently. Hiding Companion does not authorize disabling shared source intake or ticker writers. |
| Account / admin entry | Required restricted account entry; actual owner login still needs acceptance | `/login`, `AuthContext` passive-account path, verified same-user JWT/profile, `MaintenanceLock` | Existing-account password login and minimal identity read only. No automatic credits, referrals, research leads, marketing, avatar claim or cloud-research side effects in this profile. Legacy identity behavior remains outside the profile. |
| Google/Facebook, new-account / broad personal actions | Deferred in this public-reading candidate | Existing route/transport restrictions; service admission independent of session | Not opened merely because login succeeds. Shared account-creation triggers require separate review before enabling these paths. No provider/dashboard change claimed. |
| ELS, Heichal, Books | Public closed; bounded admin screen access | `publicReadingPath({isAdmin})`, explicit `allowAdminView`, live lock resolution and action guards | Verified admin may inspect approved screens; unsupported actions stay disabled. Admin bypass is not model/write/billing permission. Legacy local readiness switches remain compatibility, not a new truth source. |
| Raziel, Life Journey, private workspace, chat/research writes | Deferred / intentionally closed | Public profile action locks, routes and request boundary, existing server ownership | Shared context and a single Raziel controller may remain for navigation; lazy panels do not imply service activation. Existing WhatsApp Raziel is a separate retained service. |
| Smart meter, timeline, source learning, family Follow, recommendations | Deferred, preserved in plan | Existing owners and contracts; no new toggle/store/score | No inference of interest from viewing; no automatic Follow. Do not delete historical research or enable these systems for an activity display. |
| Opening-only newsletter | Required; shared purpose isolation applied | Existing signup component + `site-openings` purpose / `opening-parts-v1` contract; five existing Edge functions | Submit performs contract check; no startup signup request. Existing general newsletters/service messages retain their own consent paths. Positive tests are synthetic; no real test email sent. |
| Availability map / construction notice / privacy / unsubscribe | Required; routes vary by artifact | Existing capability resolver and `publicReadingPath`; signed unsubscribe only in dormant Production artifact | Map reports actual public state, not admin bypass or invented dates. Preview `/unsubscribe` remains service-closed; final artifact must retain signed Legacy unsubscribe. |
| Credits / subscriptions / paid AI | Not part of this public candidate | Existing disabled credit-meter/functional gates plus server controls | The separate credit branch is not the base. UI closure is not a cure for the known DB reserve authorization failure; no paid activation until that is fixed. Legacy/Cardcom unchanged. |
| Client telemetry, Follow probes, research sync | Suppressed in public-reading profile where implemented | `App2029` route effects, `tracking.js`, public `WatchButton` / `PostFollowBox`, research-sync admission | Local navigation/research state and necessary listeners remain. Suppression is not proof that all Legacy analytics or server rollups have stopped. |
| Font warming and shared shell | Required infrastructure; startup waiting removed | `main2029.jsx` nonblocking font warm; existing lazy panel imports | Four local font warm calls continue, with bounded race, but no longer gate `root.render`. Shared shell download/execution still costs time. No attribution of the whole Home delay to fonts. |

Source anchors at the pinned product SHA: `src/lib/publicReadingRelease2029.js`,
`src/lib/publicLaunch2029.js`, `src/components/MaintenanceLock.jsx`,
`src/lib/AuthContext.jsx`, `src/App2029.jsx`, `src/main2029.jsx`, and the
Home/SystemFrame/useSystemFeed source and tests cited in the lane receipts.
Implementation above is not a substitute for root's final browser receipt.

## Shared flag snapshot, not a proposed rewrite

Read-only observation: `2026-11-02T13:56:00.454695Z`, canonical project
`linswmnnkjxvweumprav`, **27 existing rows**. For `lock_*`, `enabled=true`
means **locked**, not open. `mode=anon` locks guests under the normal resolver;
the public-reading profile independently keeps unaccepted operations closed.

| Observed value / mode | Existing flag names |
|---|---|
| true / all | `lock_books`, `lock_convergence_tree`, `lock_cross`, `lock_cross_channel_companion`, `lock_forum`, `lock_guided_spatial`, `lock_heichal`, `lock_life_journey`, `lock_number`, `lock_post_listen`, `lock_private_research_corpus`, `lock_proactive_research_pulse`, `lock_raziel_site`, `lock_raziel_voice`, `lock_research_audio_brief`, `lock_research_to_media` |
| true / anon | `lock_galleries`, `lock_research` |
| false / all | `lock_els`, `lock_world` |
| false / anon | `lock_reality` |
| true, effect flag | `fx_analytics`, `fx_home_convergences`, `fx_number_dossier`, `fx_number_journey` |
| false, effect flag | `fx_now_feed`, `fx_number_lookup_page` |

`lock_gematria` is an existing profile key, not a row in this snapshot. Six `fx_*`
rows have no verified current consumer in the prior bounded audit; that is an
evidence gap, not deletion authority. In particular, `fx_now_feed=false` does
not prove Now is stopped. Legacy `ELS_PUBLIC`/tool-readiness compatibility is
separate from the public-reading route/operation policy. Do not globally change
these shared values to imitate Preview or admit an admin.

## Applied changes versus retained compatibility and proposals

The later receipts below supersede **pre-apply** wording in the initial
infrastructure/mail inventories. No proposal is silently relabeled as live.

| Finding | Current state / evidence | Dependency and next action |
|---|---|---|
| Three old agent schedules | **Applied by root, read-only verified:** cron125/126/127 paused; names/schedules/command digests retained; `post-apply-receipt.json` | Removes 4,320 scheduled invocations/day at the sampled cadence. Approx.104.5 aggregate SQL wall-seconds/day is not browser time or billed CPU. Preserve history; no further cleanup needed for launch. |
| Historical authority shown as current | **Applied:** `20261102130753_doc37_current_authority_views`; active rules87, inactive versions0; explicitly parent-released BEFORE hidden from current view | Columns/owner/ACL retained, no history deletion. Readers still must distinguish recent records from active ownership; do not auto-close unrelated claims. |
| Opening-only email isolation | **Applied:** `20261102130833_newsletter_opening_parts_consent`; signup v19, send-newsletter v16, welcome-backfill v8, send-reengage v3, nl-track v3; `../mail/shared-apply-receipt.json` | Existing unsubscribe v9 unchanged; subscriber count unchanged. Once new cohort exists, rollback must retain purpose exclusions. Existing-address preference change needs a verified flow; no anonymous reactivation. |
| Old G3 Meaning Lab schedules / convergence promotion / Zvi binding | **Fixed by earlier work:** lab-reflect106 and wa-mora117 inactive; post promote trigger disabled; stable contributor/user identity replaces credit-label matching | Preserve evidence; do not rerun live writers or delete deployed functions merely because schedule is off. |
| WhatsApp/source intake and channel publication | **Retained:** ingestion102, Raziel114, outbox154, stuck-check39; research-intake128 paused | Serve existing channels/Legacy. Web service closure does not retire these consumers. No outbound messages/model calls tested here. |
| Ticker writers, OCR semantic wiring, fixed Gematria compatibility, thumbnails | **Temporary compatibility:** existing triggers/jobs retain consumers | Different thumbnail cohorts are not duplicate work. Extraction and semantic promotion differ. Remove only after canonical replacement/parity evidence, outside public-read cleanup. |
| Security checks, traffic/GSC/KPI, service mail, social publication, retention | **Retained existing service** | Public UI changes do not prove these jobs obsolete or authorize mailing/publishing. Daily SQL duration is not evidence of Home causality. |
| Stale Storage egress observation | **Open / missing collector interface:** latest cache observation2026-10-06T06:59:12Z;182 historical rows,0last24h | Locate existing authorized provider/collector and reconnect with exact proposal. Report stale/unknown, not zero egress; no new daemon or fake timestamp. Nonblocking unless fresh quota/cost assurance is needed for cutover. |
| Graph vocabulary constraints / historical queues / named tmp functions | **Open foundation debt / insufficient retirement evidence** | No new public writer depends on changing these. Keep migration/research history; separate writer-governance review before expansion. Not a launch blocker solely due to age/name. |

## Legacy measurement boundary

The six existing SQL RPCs `get_category_videos`, `site_pulse_today`,
`one_tree_stats`, `hot_posts_live`, `top_primary_values` and
`forum_feed_contributions` were inspected, not invoked. Their definitions are
read-only, but that alone does not prove every returned row satisfies the 2029
public-content boundary: draft/forum/category filters differ, some definer
aggregates omit visibility checks, and the forum projection includes published
parents with an approved reply. The deployed `live-whatsapp-feed` reader similarly
has no `status=live` predicate; its source comments do not establish per-item
publication authority. No raw private results were retrieved in this review.

Therefore a harness that blocks these unproven reads cannot be reported as a
complete native Legacy benchmark, nor can this audit claim an actual data leak.
Do not change Legacy permissions or relax the harness merely to obtain green
timings. Validate the specific public cohorts under their existing owners if a
complete comparative Legacy measurement is still required.

## Remaining transition dependencies

| Item | Launch relevance / next action | User action |
|---|---|---|
| Exact final candidate acceptance | Root must attach matched cold/warm SW timings, CLS, errors and affected path/permission checks to the final source SHA; this file adds no new run | None for routine fixes. Separate cutover approval only after acceptance. |
| Approved Or Geula mixed-series case | Missing verified item association; preserve source, show only proven public categories; see `../home.md` | Product/source owner confirmation only if existing approved metadata cannot resolve an actual item. Do not invent assignment. |
| Actual administrator login | Synthetic identity/denial evidence is in `../identity/README.md`; does not prove the owner's live login | Authorized owner sign-in to final protected Preview when available; no password/key in chat. |
| Actual DB and media backup restore | **Separate transition gate.** Need dated backup coverage, accessible media manifest and named authorized isolated destination; website rollback is not data restoration | Confirm access/location and destination through trusted connected tools. No assumption that backups are absent, no restore into Candidate/shared workspace by default. See `../../public-launch-closure-20261102/recovery/RESTORE-REQUEST.md`. |
| Final Production artifact, SW/cache, legacy URLs/services and rollback | **Separate transition gate.** Refresh affected acceptance for final auth/mail/profile; retain exact Legacy deployment/aliases and CORE=false until approval | Exact 2029 cutover SHA + deployment ID approval later. No live promotion now. See `../../public-launch-closure-20261102/production/ACTIVATION-AND-ROLLBACK.md`. |
| Credit DB authorization | **Blocks paid AI activation, not closed public reading.** Known direct non-pilot `credit_reserve_v1` test charged15 despite AI allowlist; DB guard and regression verification required | No billing activation under this candidate. Separate recorded credit task remains responsible; see evidence at `fcc135e884bf4e706218212a66ad47a9acafa2f8`, `docs/reviews/raziel-credit-safe-production-20261101/README.md`. |

Replaced decisions are explicit: whole-updates concealment becomes **top card
only**; approved compact royal design is part of launch, not postponed; approved
sources reuse the existing series/stream identity rather than a separate tree.
Smart meter/timeline and unaccepted service actions remain preserved future work.
Historical issues without demonstrated launch, correctness, authorization or load
impact remain maintenance follow-ups. This document neither declares Isolation/A3
complete nor reopens accepted gates without an affected dependency.
