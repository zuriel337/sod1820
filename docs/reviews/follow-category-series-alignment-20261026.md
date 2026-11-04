# 2029 Follow alignment: categories and approved content series

Status: branch-only technical candidate. Product database changes are **not applied**. Not integrated, not Production, and no claim of live series notifications.

Task: `FOLLOW_CATEGORY_SERIES_ALIGNMENT_20261026` · actor GPT · owner `subscription_funnel_law v19` · report to ZURIEL only.

## Baseline and provenance

- Branch: `gpt/follow-category-series-alignment-20261026`.
- Base: `53dbbb303b6906ff8dbf514128f0dbb3067d48b5`, the isolated writer/Workspace/Follow candidate behind draft PR #1159. Its integration is a dependency; these changes do not integrate that candidate into central.
- Central observed: `c121dab3badb9297ab3abdbfe88d35189cfa1285`; main observed: `8642f7c93c9b653b7a42faaa2809362f3cd280e0`. Neither was changed.
- PLAN37 (`project_codex.id=37`, updated `2026-10-21T18:33:08.650106Z`) decisions `DEC-SERIES-003/004/005/006` define the approved distinctions.
- Shared series projection and public-post boundary were adopted selectively from `780db978a9dce428aef31d9b68cf5437170b1677`, branch `gpt/home-world-series-projection-20261023`. No cherry-pick, merge, Home/World edit or unrelated commit was performed.
- The existing descriptor list was extracted to `contentSeries2029Identity.js`. Projection exports remain compatible. These are bounded compatibility descriptors, not a new registry, graph identity, publication authority or storage system. Owner-qualified graph IDs remain the content owner's responsibility.
- BEFORE `ed1dbadc-6372-4abf-8ff6-65c09bae26de`; exact local SQL fixture refinement `71425e82-3e79-4e95-adde-a800f5948534`. Previous Follow scopes were released. The historical Posts visual task's latest record `ee6815e5-d221-441f-9df9-a597641a2f8d` is passive/no new dispatch. This cut changes data wiring and destinations only; no CSS or visual composition.

## Resulting behavior

| Selection | Exact membership compatibility rule | Follow intent |
| --- | --- | --- |
| רמזים חזקים | Existing category plus approved alias רמזי הגאולה | `cat:רמזים חזקים`, both old namespaces remain aliases |
| מה קורה הבורא | Exact tag, exact author אלון לוי | `series:mah-kore-habora` |
| מימד חמש | Exact category, exact publisher field בדרך לנצח; text/audio/video all allowed | `series:dimension-five` |
| סוד החשמל | Exact category OR exact tag; preserve per-item author | `series:sod-hashmal` |

Category, series, writer, topic and channel remain distinct. Existing `cat:מימד חמש` and `cat:סוד החשמל` preferences are not migrated to series or broadened. A saved unresolved name such as `cat:סרט` is not merged by similarity. No historical preferences, source metadata or subscribe-event provenance are rewritten.

The existing Posts2029 surface now reads a bounded anonymous catalog, with 24 items/page and stable ordering. `/2029/posts?category=…` includes approved category aliases; `/2029/posts?series=…` uses the shared exact membership. Invalid/ambiguous filters fail closed instead of showing the unfiltered catalog. Switching filters rejects late results from the previous scope. Missing counts/read failures are unavailable, not fabricated zero.

Post category chips and 2029 Follow-center category/series links stay in 2029. The existing generic Follow group renders a separate “סדרות” group and exact source-topic reasons. The default `topicLabel()` route used outside 2029 remains compatible. Existing `post_new` notifications carrying `/<slug>` are interpreted as `/post/<slug>` inside the 2029 model only, without editing stored history.

## Unapplied server candidate

CLI-generated migration: `supabase/migrations/20261026012207_follow_category_series_alignment_v1.sql`.

It extends the existing canonical topic/alias/subject functions and single post trigger. The same JavaScript descriptors generate its internal pure series matcher; `node scripts/generate-follow-category-series-alignment.mjs --check` prevents drift. The matcher is not exposed to anon/authenticated RPC callers. Existing dispatcher and preference/identity functions are not replaced.

The migration guards exact live function preimages and the existing trigger definition, aborting transactionally if another session changed the base. It preserves existing ACLs, recipient/event dedupe, mute, explicit Follow and separate channel consent. It creates no table, RLS policy, dispatcher, mail sender or parallel Follow mechanism.

Events are recent public inserts or an explicit transition out of draft/forum for a recent row. Category/author/title/tag reclassification of an already-public item is not a publication. Historical imports do not broadcast. The existing two-hour date window is retained; an old draft needs a valid publication timestamp/workflow. Content-body revisions, scheduled publication and meaningful-update events outside this contract are not invented or enabled here.

One post/recipient/event still yields one in-app notification even if category, writer and series all match. The existing reason stores one matching topic; this cut does not invent an all-reasons audit or rewrite prior reasons.

## Verification

- 49 focused Node cases passed across identity, shared projection, catalog, Follow controller/model, strict inbox acknowledgment, consent and WatchButton compatibility. The latest exact-membership hardening also passed all 16 new catalog/projection cases.
- 44 assertions passed against disposable, network-isolated PostgreSQL 17 using nine read-only live function preimages and entirely synthetic users/data. Tested old/new alias reads, explicit reconciliation/unfollow, no migration preference rewrite, series dispatch, tag-only membership, text/audio, wrong author, whitespace exactness, draft/forum, publication transition, edit/import suppression, recipient/event dedupe, mute, account isolation and no channel activation. Reapplying against a changed base correctly aborts.
- New actual-App2029 browser suite: 42 scenarios, 320/390/1440 × day/parchment/night, real adapters over intercepted synthetic HTTP. Native navigation, anonymous reader token, pagination, exact filters, late-response isolation, unknown filter, older-server failed unfollow and series/category independence passed, with zero page errors/unexpected requests/live writes.
- Existing Follow/Workspace account and acknowledgment regression: 38 scenarios passed with zero page errors/unexpected requests/live writes.
- Legacy and 2029 builds passed. Production lock, cheap hardening, containment and public language checks passed. Final isolation/World gate results are recorded in the delivery evidence.
- Anonymous real HTTP GETs independently confirmed the public filters: 7/31/133 matching series items, loading 7/24/24 rows. Observed single-run durations 376/365/356ms; payloads 8,262/24,073/30,269 bytes. These are point observations, not a performance guarantee. Native Node fetch was unavailable in this execution environment; the public HTTP probe used Python's standard HTTPS client, and the browser suite verified the SDK URL/token behavior separately.

Evidence: `/workspace/artifacts/follow-category-series-alignment-20261026/` (`browser/`, `center-regression/`, anonymous probe and final review metadata). Browser data is synthetic; public HTTP measurements are real aggregate results. No hosted signed-in account acceptance is claimed.

## Release order and remaining boundaries

1. Integrate the base candidate deliberately through its central owner; do not replay its commits or declare this branch central.
2. Content/Follow owners review the three constrained compatibility keys and exact membership together. When integrating the separate Home/World series branch, keep the extracted descriptor source and compatible projection exports; do not restore a second list.
3. Obtain independent canonical-engine/security challenge for the SQL candidate. An actual Claude execution/dispatch tool is unavailable here; no specialist review was fabricated or autoactivated.
4. Re-read current DB definitions, run local tests and apply the server candidate only under a separate exact live-DB release authorization. There is no live migration, backfill or permission change in this delivery.
5. Verify producer readiness before enabling new series Follow entry controls. Existing saved-series presentation and native browsing can be reviewed; no new Follow button promises a producer that is still absent live. An older server that cannot remove the newly normalized alias leaves the preference visible and reports the unconfirmed cancellation.
6. Claude retains placement/final visual ownership for additional Follow controls on category/series surfaces, reusing `WatchButton variant="2029"`. No new button, palette, icon taxonomy or design engine is needed. Complete guest/account/idempotency/channel/privacy acceptance after server adoption, using controlled accounts and no unsolicited delivery.

Membership/Cardcom/Checkout/Entitlements/prices remain outside this cut. No main/central merge, Production change, site flag, live preference mutation, source reclassification or notification was performed.
