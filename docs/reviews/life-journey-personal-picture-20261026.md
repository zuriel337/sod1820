# Life Journey — personal picture

Task: LIFE_JOURNEY_PERSONAL_PICTURE_20261026

Actor: GPT · handoff to ZURIEL

Base: `48af3b5a9b05fcb49a52f1f1b2d0385869ca7aa0`

Branch: `gpt/life-journey-unified-synthesis-pack-v1-20261026`

## Scope and behavior

The existing summary tab becomes **התמונה שלי**, the default map entry. It composes the existing private Person/family projection, canonical name/date findings, source coverage and locally calculated birth maps. The previous standalone family summary is folded under an explicit disclosure in the 2029 variant; Legacy rendering is retained.

One selected person can be focused without changing the authorized family selection. Their name/date, canonical name value, available methods, source coverage, Human Design summary and sky summary appear alongside the separately scoped family synthesis. Unknown/uncompleted results remain explicit rather than being represented as zero or as an absent family relationship. Technical layer details remain under a disclosure; no internal Tarot cards are exposed.

Links open the existing matrix, date, family, convergence and source views. Birth-map links choose the exact person and requested lens. The date link chooses the focused person's existing date representation. Return to the picture preserves person focus. Previously calculated birth results reopen from the existing parent component's session Map without recalculation or new persistence. Editing calculation inputs invalidates that person's result. A revision token discards a calculation that finishes after switching person, editing inputs or unmounting the studio.

The picture is private presentation data only. It is never serialized into the anonymized synthesis pack, a URL, telemetry, model prompt, Research Context or another store. The synthesis still uses verified name/date/family/source evidence; Human Design and sky remain zero-weight auxiliary projections. No reinterpretation or new engine execution occurs on navigation.

## Coordination and owners

Extends Person Foundation v6, Research Workspace v5, existing Experience/Design and local birth adapters. The dedicated `supabase_read_only_user` reader verified current coordination with no overlapping Life Journey/PersonJourney/picture writer. No work-log or product-DB row was written.

Remote branch equaled the base above and remote main was `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b` at startup. Work continues on the explicitly approved isolated branch; main was not imported, rebased or merged.

## Verification commands

```sh
node --test src/lib/research/lifeJourney*.test.js test/life-journey-2029-chain.test.mjs
LIFE_JOURNEY_CHART_SCREENSHOT_DIR=/tmp/life-journey-picture-20261026 node --test test/life-journey-person-context.browser.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
git diff --check
```

Unit coverage includes an unselected person's result not entering the picture, no inherited chart between family members, unknown versus computed zero, and unchanged anonymized synthesis. Browser coverage includes default entry; person/date/lens selection; returning to the same person; reopening an existing chart without starting research; no automatic family search; folded duplicate summary; refresh/exact return; private values absent from requests, telemetry and persisted Context; 320/390/1440px; three presets; 44px controls and readable body text. Captures contain synthetic test data only.

Results: Life Journey suite **59/59 PASS**; expanded browser chain **1/1 PASS**; normal dual build and integrated Preview build **PASS**; auth/read-only guard **5/5 PASS**; hard isolation, Legacy lock, built dependency graph and `diff --check` **PASS**. Captures cover nine personal-picture combinations plus the existing eighteen chart combinations. Eager gzip recovery: **75,759 bytes**, above the required 12,288. The new picture and birth renderers remain lazy. Existing chunk/deprecation warnings remain.

No new engine, graph, Provider, Person/Journey/Research Context store, DB/RLS change, live migration, site flag, public source, ELS or Raziel change. No main merge or Production deployment.

## Requested program reconciliation — 26.10.2026

Task: LIFE_JOURNEY_ELS_HINTS_PROGRAM_RECONCILIATION_20261026

Status: **REVIEWED + PLANNED; implementation is PARTIAL.** The first composition slice is recorded below; remaining requested connections are not implemented. This is an implementation handoff appended to the existing review, not a new product contract, owner, roadmap or canonical store. The implementation/verification claims above describe the earlier personal-picture slice only.

ZURIEL's new direction supersedes the scheduling assumption that ELS should be omitted from the Life Journey design until its engine work ends. **ELS is a central research branch from the outset; execution/integration remains gated independently.** ZURIEL also requested purposeful private hint submission, date-aware investigation and AI interpretation as part of the same program. Neither request authorizes automatic family searches, public submission of private material, or weakening the current Preview boundary.

### Reconciled evidence and owners

- Reviewed Life Journey baseline: `304d7fcefd5405de10e8837b1d30437c20862e7a`; isolated branch `gpt/life-journey-unified-synthesis-pack-v1-20261026`.
- Remote main verified directly: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Its compact Roadmap routes ELS + Raziel/Context into the Golden sequence; the dependency plan's Phase 9 makes replay, sources, Context and resume load-bearing ELS acceptance.
- Live owners: Person Foundation v6, Research Workspace v5, Research Strategy v17, Research Intake v13, ELS Research v9 and Single Engine v2. Experience/Design own projection, not research truth. The existing mandatory visual lane remains unchanged.
- `docs/research-studio-v1-contract.md`, the Universal Finding contract and `docs/w0-2027-personal-publication-access-matrix-v1.md` retain the identity/reference and private/public boundaries. Historical implementation statements in those documents are not treated as a current capability census.
- Approved ELS ancestor `de27c6ea2e4f8474dd0f379c9bd60b36654344ad` and verified Life Journey handoff commit `2e9e20c0f85de2dfa671cb87cf8416115180cec0` are already ancestors of this branch. No import/cherry-pick is needed for that handoff.
- A newer ELS/Raziel integration candidate exists at `b27e930a71b3fdb8accf9cbf03b09058d7214fc0`. It and its screen-system review were inspected read-only; they were not merged/imported or declared the approved Life Journey integration base. Current ELS/Raziel lane ownership and a canonical handoff must govern consumption of newer changes.
- The dedicated read-only reader verified coordination and metadata without reading actual family/hint content. No overlapping active writer was found on this review scope. The active central Raziel safe-actions integration is outside this scope and must not be modified.

### What exists versus what must be connected

| Layer | Evidence on the reviewed baseline | Required next connection |
| --- | --- | --- |
| Person/family | Private Ledger identity, family relations, explicit participant selection and exact return | One personal/family focus over the same authorized references; focus changes must not erase family research |
| Name/date | Canonical methods, Hebrew date expressions, normalized relation checks | Return individual results into the existing shared research projection instead of isolated result screens/repeated work |
| Sources | Existing canonical number/source readers and verse cards | Reuse the readable verse renderer in the central source branch; keep exact references and provenance |
| ELS | Existing automatic-plan adapter, canonical replay and verified `elsSurfaceContext` handoff | Central plan/coverage/result seam; actual execution only after the approved ELS integration is reconciled |
| Private hints | `research_items`, `bucket=hint`; existing helper already carries `occurred_at`, note and source reference | Purposeful private capture, authorized person/date linkage, explicit investigation and result-reference projection |
| Life time | Birth anchors and date/word/interval projections | Project explicitly dated owned hints/observations as life events; do not revive `lifeProfile` local storage or local arithmetic |
| Interpretation | Existing normalized family synthesis; same Raziel/AI routing | Explain verified findings, missing data and alternative readings with references; private processing requires its existing authorization/consent boundary |
| Birth lenses | Local Human Design, sky and source-anchored letter views | Keep them reachable from the same person/family picture, labeled as auxiliary interpretive lenses rather than independent confirmation |
| Continuity | Existing Context and Research Path save/resume consumer | Complete live save/resume acceptance only under separate runtime-write authorization; current Preview remains blocked |

On the reviewed baseline, the synthesis pack explicitly had `no_els=true` and no hint-analysis layer. The first delivery below extends coverage without enabling execution. The existing ELS component remains unreachable through the active Life Journey capability router. A prepared adapter must never be presented as an end-to-end connected experience.

### One inquiry, not one compulsory mega-scan

The target is one authorized inquiry over the selected person/family, with an explicit question such as “מה אני רוצה לבדוק?”. Personal focus, family selection, exact expressions, observed events, sources and findings remain distinct identities/references underneath. One Tree does not mean one table, one undifferentiated result or one mandatory execution of every engine.

The picture should compose:

```text
Life Journey: selected people + research question
  canonical research: names / dates / sources / ELS
  private observations: hints / explicitly dated events
  interpretation: evidence-linked explanation / optional birth lenses
  depth: exact findings / method lists / provenance / replay
  management: profile / family / invitations / save and resume
```

Same selected scope, same Context, same Path and exact return. No new Person, Journey, hint, event, graph, ELS, Context or Raziel-memory store. Internal Tarot remains internal, zero-evidence-weight and unable to modify frozen findings.

### ELS central branch — prepare now, activate only when ready

1. Accept a user-reviewed series of selected names, date expressions or hint expressions in **one existing** `els_automatic_research_plan_v1`. Do not concatenate the family into one invented term or create independent per-person research systems. Each expression/occurrence retains its own provenance and dependency identity.
2. Reuse the canonical plan's transformations/deduplication and declared scope/budget/continuation. Selecting people, opening the page or selecting an ELS tab is not execution consent. Do not scan children or other family names automatically.
3. Distinguish not connected, prepared, running, partial/stopped, failed, checked-empty, candidate and canonically verified. Proposed state labels are projection vocabulary, not a new DB enum. A prepared or partial plan must never raise the journey's completion to 100%.
4. Only canonical occurrence replay can confirm `MATCH`. Preserve term/scope/corpus version/skip/dir/start and exact source identity through the existing narrow adapter. AI does not generate authoritative occurrences.
5. Reuse `buildLifeJourneyElsVerifiedHandoff`, the existing `elsSurfaceContext` and `/code?els_return=verified-v1`. Private terms stay in the authorized in-memory/Context carrier, never URL, telemetry or ordinary logs. Preserve the Life Journey return target, focused person, selected family, map/lens and source/finding references through the same Context/Path.
6. Bring verified ELS references, source/verse links, coverage and failure information back into the existing result/synthesis projection. Keep exploratory selection provenance and dependency grouping: reversals, nearby structures and repeated views of one occurrence are not independent confirmations or significance claims.
7. Consume the ELS lane's one selected-occurrence package and canonical actions when its integration is approved. Do not embed/import its full UI here or implement another ELS engine, scanner, Provider or Raziel panel.

### Purposeful private hints and dated life observations

Suggested user-facing explanation:

> “ראית מספר, מילה, חלום או אירוע שחשוב לך להבין? אפשר לשמור אותו במסע הפרטי, לציין מתי קרה ולמי הוא קשור, ולבקש בדיקה מול השמות, התאריכים והמקורות שבחרת. פענוח AI מציע כיווני מחשבה — הוא אינו הוכחה או נבואה, והרמז לא מתפרסם מעצמו.”

The capture should ask what was observed, what the user wants to understand, **when it happened**, and optionally which already-authorized person it concerns. Keep source attachment/reference optional. The observation is user input, not a verified Finding. Family account Claim/Invitation is not a ShareGrant and must not expose a parent's private hints to a newly linked account.

Keep separate actions: save privately; request investigation; request AI interpretation; submit selected material for public research/review. Do not route private capture through `ReportHint`/`community_hints`, turn a hint into a `research_object` automatically, or duplicate an existing hint row when attaching it to a Journey. New explicit user entries may use the existing hint owner/writer after its write gate; Context/Path carry references and bounded approved results, not copied raw narratives.

Temporal processing must retain:

- `occurred_at` (event time) separately from `created_at` (submission time);
- the supplied calendar, precision and timezone when relevant; approximate/unknown dates remain approximate/unknown;
- confirmation of AI-extracted dates, names and expressions before they become research inputs;
- canonical date representations, Hebrew date words and exact intervals where supported; do not invent missing time, infer a sunset boundary or substitute the upload date;
- explicit person/family scope for comparisons with birthdays, anniversaries or other selected events; recurrence or numeric coincidence alone proves no causation, destiny or statistical significance.

The processing sequence is private capture → authorized extraction/user confirmation → explicit bounded date/gematria/source checks → optional user-approved ELS plan → evidence/empty/error projection → requested AI explanation → exact continuation. It is not a new physical pipeline: reuse Intake representations, existing canonical adapters, Universal Findings and current AI routing. Hint text/media are untrusted **data**, never tool instructions, publication permission or authorization to spend/run arbitrary capabilities.

AI output should show what was provided, what the engines actually checked, the supporting references, what remains unknown and possible alternative readings. Reuse existing quota/consent/privacy routing; do not start model calls on open/refresh or silently send family names/raw private material into telemetry, public Context or an unrelated AI session. Without an authorized private-processing route, keep raw private material local and use only approved bounded/anonymized findings for explanation.

### Blocking media/privacy finding

`src/lib/hints.js:uploadHintImage` uploads to `gallery` and returns a public URL. A read-only live metadata check confirmed `gallery.public=true`. Therefore the current uploader **must not** be reused for private Life Journey photos/documents. No actual private image or user row was inspected, uploaded, moved or deleted in this review.

An existing private bucket, `submission-inbox`, was found; its existence alone does not authorize it as a personal-media store. Verify its owner, upload/read path, retention and access contracts before any reuse. Until an existing authorized private-media route is proven, private text/date capture may proceed in its own gated slice and attachments remain unavailable. Do not create a new bucket, change RLS, make `gallery` private or move existing objects as a shortcut.

`research_items` has RLS enabled with own-row policies plus restrictive managed-bucket write policies. The hint helper currently does not retain person association/temporal precision/analysis references; those need a bounded extension and authorization tests under the existing owner, not an assumed working linkage.

### Ordered implementation and acceptance, before final screen arrangement

1. **Shared composition/coverage first:** one personal/family inquiry projection with ELS and hints as first-class branches; reuse individual results and retain provenance/negative/partial outcomes. Pure consumer code and tests only; no shared Provider/engine fork.
2. **Private hint/date slice:** explicit purpose, save/investigate split, owned hint references, confirmed temporal data and reuse of canonical date/name/source capabilities. Close writer/receipt/privacy gates before live saves; media remains separately gated.
3. **ELS consumer integration:** reconcile the ELS lane's approved base and canonical package; connect the existing multi-expression plan, verified handoff, result return and source/verse projection. Preparation belongs in step 1, not after visual polish.
4. **Evidence-linked explanation:** wire the existing AI/Raziel path to the authorized composed results, with visible unknowns/alternative readings and internal-only reflection checks. No parallel personal interpreter or memory.
5. **Screen arrangement last:** one clear entry, personal/family focus in the same tree, a prominent ELS branch, a purposeful hint entry, progressive disclosure for full gematria/trace, readable verse cards and management/sharing below. Reuse existing renderers and the current visual lane; no mandatory heavy 3D.
6. **End-to-end acceptance:** private hint → confirmed event/date → canonical checks → optional ELS verification → explanation → number/source/ELS → exact Life Journey return. Cover same-person refresh, family focus without losing prior research, empty/partial/failure/cancel, unknown dates, unauthorized refs, linked-account isolation, receipt/retry/idempotence, no duplicate hints, no raw private URL/log/telemetry leakage and no automatic family/AI/ELS work. Normal + Preview builds, guards, lazy graph/weight and mobile/desktop in all three presets remain release gates.

This reconciliation changes the intended scope/order, not current runtime availability. No live product write, model call, Preview update, main merge, Production change or ELS branch import was performed. Existing baseline adapter/privacy tests run during this review: **11/11 PASS**; these verify existing seams, not completion of the newly requested features. Passive handoff is to ZURIEL; no work-log write or agent activation was performed.

## Delivery: shared ELS/hint coverage — first composition slice

Task: LIFE_JOURNEY_ELS_HINTS_COMPOSITION_SLICE1_20261026

Base: `74ad4dc556323fb41bd720e25a7dbfe6229b41a3` · same isolated branch.

Implemented without a visual redesign or changes to engines, Provider, hint writer or the Preview guard:

- The existing private synthesis projection now explicitly includes central ELS readiness and owned-hint coverage. ELS names the existing `els_automatic_research_plan_v1` contract and remains non-runnable/not connected. Neither readiness nor an observation can become verified evidence.
- The 2029 guide includes those two pending branches and no longer declares the whole journey complete after the original eight steps. It can continue into available branches without routing a disabled ELS/hint stage to a fake destination. Legacy retains its existing eight-step guide.
- The existing authenticated, `fallbackLocal:false` hint read is lifted from the list to its keyed Person parent and shared with the picture. There is one read per mounted principal, no second hint store, no persistence and no duplicate `research_items` creation. Account changes/unmount discard old and late results; errors remain errors rather than becoming empty observations.
- A bounded pure hint-reference projection deduplicates existing IDs and separates absent, invalid/ambiguous and explicit civil-day dates. Only `occurred_at` may supply event time; `created_at` is never a substitute. Explicit ISO civil dates reuse the existing canonical Gregorian/Hebrew representation. Instants/partial dates require clarification; no timezone/sunset assumption is invented.
- The hint list explains its private observational purpose and displays the known date or the missing/review status. No person association is inferred. The anonymous synthesis pack receives counts/status only, never hint IDs, titles, narratives, URLs or dates. Hints do not modify the current family evidence or explanation.

Not implemented by this slice: new hint capture/saves, per-person hint association, private attachment uploads, hint AI interpretation, temporal comparison research, ELS execution/result ingestion, reuse of individual Name/Date result payloads, or the final entry/tree visual rearrangement. Existing ELS/Raziel work is not imported. Live account writes/models remain blocked in Preview.

Verification commands:

```sh
node --test src/lib/research/lifeJourney*.test.js src/lib/research/researchPathContinuity.test.js test/life-journey-2029-chain.test.mjs test/life-journey-hint-reference.test.mjs
LIFE_JOURNEY_CHART_SCREENSHOT_DIR=/tmp/life-journey-layers-20261026 node --test test/life-journey-person-context.browser.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
git diff --check
```

Results: **77/77** targeted tests and **1/1** expanded browser chain PASS; both builds, auth/read-only guard **5/5**, isolation, Legacy lock, built graph and diff check PASS. Eager gzip recovery **75,515 bytes** exceeds the required 12,288; ELS execution and Raziel submit/Plan remain unactivated/lazy. Browser verification uses synthetic hint/backend transports, covers 320/390/1440px in all three presets, shared-read count, explicit/unknown/ambiguous dates, principal switch, denied read, refresh, save/finding exact return and no new model/family/ELS work. No real user hint content or live account save was used. Existing chunk/deprecation warnings remain.

Status for this bounded slice only: **IMPLEMENTED + TESTED + branch-only PR_READY**. No DB/RLS/site-flag write, engine/Provider/store addition, main merge or Production release. Next program work remains the gated private hint/date capture and individual-result continuity, before final visual arrangement.
