# WORLD_2029_LEGACY_PUBLIC_PARITY_V1 — public legacy content admission contract

Status: prepared on branch; NOT applied to Supabase or deployed.

## Owner clarification — 2026-10-12
The historic SOD1820 website has NEVER exposed personal research. Treat the historic site as a public-content origin, while new internal research is a separate data domain. Do NOT presume that every private research_objects record belonged to the old site. Restore all historically publicly served content by legacy identifiers and publication provenance without moving internal/private research into the public domain. Legacy public publication is sufficient evidence for public presentation in World 2029; no additional research-approval gate may suppress the legacy content itself. Keep direct personal research/private messages excluded.

## Authority
A row/asset demonstrably published on the existing SOD1820 site stays publicly readable in World 2029. This covers posts, galleries, images, topic cards, public gematria and their provenance/source links. A missing World relationship is not a reason to suppress an otherwise published item.

Personal/unpublished research, DMs, private WhatsApp submissions, drafts, person-only and owner-bound records are excluded unless independently proven to have been deliberately published. Do not infer publication from status=approved, canonical, public_candidate, author identity, or a matching number. RLS stays in force.

## Baseline (live read-only, 2026-10-12)
- posts: 1302; home_hidden=true: 25 (home visibility is not publication permission)
- gallery_images: 2561; published=1 AND curator_hidden=false: 2192
- gallery_images: published=2: 292; published=1 AND curator_hidden=true: 52; published NULL: 24; published=0: 1. Do not relabel these without checking the meaning of published=2 and curator intent.
- topic_cards: 215; approved=206; draft=3; merged=5; rejected=1.
- research_objects: 1901; private=1685; public_candidate=216; explicit public=0. The mere absence of public rows does NOT show how much legacy content is missing; it is a distinct dataset.
- Netanyahu title/name filtered: posts 15 (none home-hidden); gallery 49 (47 visible, 1 curator-hidden published, 1 unpublished); topic card 1 draft. This title matching is NOT a complete inventory of related artifacts.

## Required implementation sequence
1. READ-ONLY lineage join from legacy published post/gallery/topic records to their current world projections. Count distinct legacy public source IDs, distinct present World anchors and missing source IDs. De-duplicate by original source ID, not cross-surface appearances.
2. Verify the meaning of gallery published=2 and home_hidden, plus whether topic draft stems from a formerly public record before modifying any flag.
3. Restore missing routing/projection of published legacy sources via existing read adapters. Never bypass RLS, widen raw research_objects access, or copy unredacted private metadata into public views.
4. Test with anon session across Home, Posts, Gallery, Topic, World, Number and source context; ensure private draft/person-only are still denied.
5. Release only with counted pre/post evidence: eligible distinct legacy IDs, restored published IDs, remaining missing IDs, excluded private IDs, regression tests and deploy URL. Never report rows 'entered' without release evidence.

No DB or production change authorized by this document alone.


## Execution continuation — 2026-10-12, branch-only

Baseline reconciled against main `4f8c718c03b9edf6b9b3dd0d5eb943f2d7a2b1c4`; reuse merged PR1043 graph/media fixes. General Supabase connector used only for bounded READ ONLY queries, including transaction-local anon role. Public REST inventory uses only the existing public client key (no service role).

| Measure | Before | After this branch |
|---|---:|---:|
| Anonymous readable post IDs | 1302 | 1302 (no DB writes) |
| Post IDs with active exact graph identity | 306 | 306 |
| Missing exact post identities | 996 | 996 |
| Eligible archive sources (excluding explicit draft/forum/internal origin) | 1291 | 1291 |
| Public gallery source IDs | 2192 | 2192 |
| Images with active exact graph identity | 2037 | 2037 |
| Missing image identities | 155 | 155 |
| Shared public gallery adapter eligible rows | 2498 | 2192 (306 outside current publication/tier gate excluded) |
| Approved topics / public-view topics | 206 / 205 | 206 / 205 |
| Public topics without active node | 3 | 3 |
| Anonymous readable active numbers | 2157 | 2157 |

Implemented existing reader changes: public Gallery default applies published=1/min_tier=0/curator gate, admin hidden-review query remains separate under existing RLS. Stable ID tiebreak for Gallery and source pages. Existing category reader can now fetch the complete eligible archive without a category; Home-hidden is preserved and not treated as a publication permission. Explicit draft/forum/internal origins excluded from facet counts and archive reader. Five uncategorized sources 5056–5060 stay Home-hidden; no promotion or artificial category/node created.

Numbers request: existing source-depth projection exposes `numberHighlights` to both Home/World consumers. Distinct public Topic membership and approvals over seven days are labeled separately. Current top signals include 1820 (7 public topics), 358 (6), 424 and 1202 (5). This is content relevance, NOT visitor/search popularity or research strength. Canonical Traffic demand RPCs deny anon; do not grant access or substitute legacy raw search-log popularity. The JSX/CSS surface wiring is PENDING under the existing visual writer lane. No new owner, store, importer, graph or event pipeline.

Validation: eight adapter/projection tests PASS; 2029 production build PASS; diff check PASS. Companion `scripts/world2029-public-legacy-parity-audit.mjs` enumerates anonymous REST IDs, strict source mappings and a private-research denial probe. Public mapping numbers unchanged; zero backfilled nodes/edges and zero restored IDs claimed.

LIVE sample (existing production, not this branch): unauthenticated browser renders /world, public source rail, 205 topic total, preserved 878 Journey lock. Seven visible img elements loaded successfully (including the four source discovery doors and flight cover). World -> elections post5107 renders complete source text and cover; Number631 link opens the existing Number route. The two un-mapped aircraft images return HEAD200 image/png and image/jpeg. Terminal /world returned403 while cloud browser succeeded; therefore do not infer production outage. Exhaustive rendered-route, mobile/return/SEO and all asset-byte verification remains OPEN.

Release: NOT MERGED, NOT DEPLOYED. Keep PR draft. Full parity cannot close until reader UI wiring, all-ID route coverage, governed mapping decisions and deployment evidence. Preserve the existing 85 orphan-image-node decision; no relink/deactivation performed.


## Owner-selected metrics and 2029-only activity — 2026-10-12 18:38 Israel

ZURIEL selected all three separate dimensions: content richness (sources/images/topics), research strength/quality and manual Gold/Diamond, and weekly number popularity (opens/computations). Requested the main activity meter cover number-page openings, pages opened, Gematria computations, and intake from Community/WhatsApp/email. Scope is 2029, not the old UI.

### LIVE bounded READ ONLY findings (rolling seven days)
- Canonical events `surface=page,event_type=view,path=/2029 or /2029/*`:247 views, including50 number opens across14 distinct number pages. Six of50 are known admin activity;44 have no matched admin role (NOT a proof that all are human). Raw site_visits for numeric2029 routes:7212 rows,7162 flagged bots. Never promote that raw total into public popularity.
- Number routes:718=12,1073=7,631=6,73=4,363=3,878=3; these are recorded opens, not unique people.
- Other /2029 pages:Home106,Posts36,Gematria26,home-preview18,calculator7. Preview/admin traffic should be separate in final public projection.
- Existing Calculator2029 telemetry:first_compute5,result_selected43. First_compute only fires once per mounted calculator; result_selected includes method changes. Neither measures total computations.1153 legacy Gematria computes have no2029 path; excluded.
- Shared URLs /world,/post,/topic,/els historically lack a renderer marker. Do not guess runtime from the URL. Existing admin_2029_analytics with null prefix includes legacy events, so its unfiltered summary is not a2029-only measurement.
- Canonical intake owners (admin-only decomposition):wa_msg_ext98 records ingested this week;65 have original message timestamps this week,33 are older-message backfill. wa_bot_log9 distinct processed message IDs (no overlap with those98); stages are not a unique-received-message total. Research Contributions:2 pending from whatsapp_dm. inbound_emails0 received this week (zero rows is not connector-health proof). Public live/unexpired channel updates16; public published comments0. No inbox body, address, phone or user-search term read/displayed.
- Old activity_pulse/site_pulse_today use raw site_visits, UTC-day casts and old /number,/code path predicates. Labels of investigations are not canonical computation/search counts. They stay out of Home2029; no old ticker reactivated.

### Implemented branch-only capabilities
- Compile-time VITE_RUNTIME_TARGET in the existing dual Vite build. Existing events emitter and engagement payload attach runtime_target=2029 only to2029 builds, including shared URLs. Same collector/store/RPC; no identity, bot-classifier, retention or historical-data rewrite.
- Existing Calculator2029 compute path emits one canonical_compute after a successful current, nonempty canonical profile, excluding share restoration and preview-only/invalid results. Existing professional/comparison useCalculatorRow emits after an accepted current server result; cached re-renders/method selection do not emit. Metadata is expression length and method count only, no expression/value/private root. Existing first_compute funnel retained unchanged.
- Existing Home pulse extends safe public aggregates with comments:status=publish and channel_updates:live/unexpired over7days; errors/null counts remain unknown, not zero. No raw Community chat/DM/email/WA inbox feed in public Home.
- Existing source-depth numberHighlights carries exact Topic-owned ratings with Topic identity; ratings are not assigned to the Number or combined with popularity. Existing convergence_meter/Number tier reader is the Gold/Diamond owner.
- Existing parity SQL extended with repeatable2029-only page/number/compute and admin-only intake-stage queries. Not an importer or new analytics system.

Validation:13 targeted tests PASS; existing Home Pulse acceptance PASS; Legacy+2029 builds PASS; source hard-isolation PASS. Live telemetry evidence after publication still required; new canonical_compute/runtime_target events will be forward-only and cannot repair past gaps.

### Recommended existing Control2029 decomposition
1. Public product activity: page/number opens, successful computations, published reactions/contributions; each has its own window and source, excludes known admin/preview/bot activity.
2. Admin intake: unique arrived source IDs by channel, pending/processing/failed/published states, oldest waiting item and time from arrival to publication. Never add overlapping representations as messages.
3. Public content richness/strength: exact distinct public source/image/topic IDs plus separate Topic quality, convergence score and human-curated tier counts. Popularity never establishes truth.
4. Existing Traffic/reliability detail: reading engagement and exact-return completion, first-action funnel, failed public reads, server response latency and source freshness. These reveal whether visits become successful research.

Remaining: visual Home/World/control integration under existing visual writer lane; extend/review existing admin analytics query to consume explicit runtime_target and preserve legacy raw signal as separate provenance; governed safe public popularity aggregate; end-to-end success/error/cache/duplicate telemetry verification; exact-head CI and deployment. No production/DB/RLS/permission change and no claim that all channels are integrated/live.
