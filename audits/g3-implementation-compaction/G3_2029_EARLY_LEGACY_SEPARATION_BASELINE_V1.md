# G3 — 2029 Early Legacy Separation Baseline v1

**Date:** 2026-09-16  
**Human Gate:** ZURIEL  
**Owner:** existing `foundation_closure_protocol_law` / G3 Implementation Compaction gate  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Main baseline:** `22b18c900ac616d5c021d335efd94b810b753918`  
**Status:** EARLY G3 BASELINE · BRANCH-ONLY · NOT A NEW GATE · NOT RELEASED

## 0. Why this is inside G3

This pass is an **early baseline run of the already-existing** `G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1`, not a new phase/system/registry.

The Roadmap defines G3 as **Foundation runtime / implementation against the frozen current owners** and explicitly requires:

- canonical domain adapters where required;
- implementation against frozen owners, **not legacy UI authority**;
- greenfield product surfaces consuming Foundation owners;
- a mandatory end-of-G3 Implementation Compaction / Archive Pass.

The end gate is still required after replacements are live because retirement decisions need live evidence. This early baseline exists to prevent a different failure: building new 2029 runtime/Experience on an old component merely because that component is already in the repository.

**Rule for this baseline:**

> Existing code/data survives into 2029 only because a current owner consumes it as valid capability/runtime — never merely because it is live or old code already exists.

## 1. Canonical disposition vocabulary — reused, not reinvented

For runtime/artifacts this baseline uses the existing G3 gate vocabulary only:

1. `KEEP_CURRENT` — consumed by a current canonical owner and still valid.
2. `ABSORB_THEN_ARCHIVE` — useful semantics survive, old runtime/body loses authority after replacement.
3. `TEMPORARY_COMPATIBILITY` — required only for an explicit legacy dependency, with a removal condition.
4. `RETIRE_REMOVE` — already replaced/retired; keep only compatibility/provenance until safe cleanup.

Branch-only prototypes are not current runtime authority and cannot become dependencies merely because they exist.

## 2. Live facts at baseline

### 2.1 Frozen owner tree / rule disposition

Live canonical DB currently has the G3 disposition metadata created at G2 closure:

- `KEEP_CANONICAL_OWNER`: 23 active rules
- `KEEP_SCOPED_SEMANTIC`: 49
- `REVALIDATE_DURING_G3`: 11
- `LEGACY_COMPAT_RETIRE_WHEN_REPLACED`: 2
- `DEFER_PRODUCT_DECISION_G5`: 1
- total: 86

Explicit legacy-compat rules are already only:

- `legacy_content_protocol`
- `preserve_linked_row`

The 11 named revalidation rules include `number_page_law`, `no_row_without_number_law`, `raziel_response_contract`, `raziel_whatsapp_access_adapter_law`, `post_og_image_law`, `worlds_color_law`, `identity_architecture_law`, `unified_tags_law`, `source_video_publish_law`, `word_approval_required_law`, `bot_delivery_law`.

### 2.2 Live data/runtime scale

Current canonical DB counts observed during this pass:

- `nodes`: 6,565
- `edges`: 7,091
- `research_objects`: 735
- `research_items`: 9,237
- `user_research`: 106
- `gematria_methods`: 41
- `persons`: 83,455
- `identity_edges`: 87,128
- `els_records`: 135
- `els_finds`: 1
- `research_paths`: 0
- `research_plans`: 0

Interpretation: One Reality / Research / Method / Person / ELS substrates are live. Durable `research_paths` and `research_plans` are semantically owned but are **not a live persisted runtime yet**; a 2029 surface must not fake them.

### 2.3 Current 2029 route boundary

`App.jsx` routes `/2029`, `/world`, `/books`, `/els`, `/heichal` outside the old `<Layout/>`; `GlobalChrome` also suppresses old chrome on those routes. This is good separation at the route/chrome level.

However those routes are still inside global `AuthProvider`, `ResearchProvider`, `UserCenterProvider`, `RouteEffects`, `LegacyRedirect`, `OnboardingGate`, analytics providers. Each must be classified by capability, not inherited blindly.

## 3. Baseline runtime census

| Domain / artifact family | Current evidence | Early disposition | 2029 rule / removal condition |
|---|---|---|---|
| Active G2 owner tree | 86 active, owner-qualified rules | `KEEP_CURRENT` | Semantics remain authority unless superseded through owner gate. |
| `nodes` + `edges` / Reality Graph | live graph; 6,565 nodes / 7,091 edges | `KEEP_CURRENT` | One Reality Graph remains canonical substrate. UI/layout never owns graph semantics. |
| `research_objects` + revisions / Universal Finding adapters | live research objects; `entityHubProjection` converts governed rows to typed findings | `KEEP_CURRENT` | 2029 reads these through current Truth/Research owners. |
| `research_items` / `user_research` | live personal research state | `KEEP_CURRENT` | Personal/Research capability survives; legacy UserCenter presentation does not. |
| `ResearchProvider.jsx` core Context/workspace substrate | current shared provider; active session Context + save/research/history/collections/journeys | `KEEP_CURRENT` with mandatory G3 decoupling | Keep one Research OS. Move route-specific compatibility assumptions out of core as adapters when touched. |
| `ResearchProvider.jsx` direct route coupling to `/number/*`, `/lab/els`, `/research?tool=els` | explicit hard-coded route/locator integration remains in core provider | `ABSORB_THEN_ARCHIVE` for the route-coupling slices | Preserve semantic Context transitions; replace hard-coded legacy route knowledge with current owner-qualified adapters/route targets. |
| Gematria execution: `gematria_api`, `gematria_method_trace`, `gematria_methods`, `canonicalGematria.js`, `gematriaTrace.js` | live registry-driven server execution; adapters explicitly refuse to recalculate | `KEEP_CURRENT` | This is canonical 2029 execution substrate. Legacy calculators/pages may consume it but cannot redefine it. |
| Legacy gematria page/layout (`number_page_law`, old `/number` presentation components) | rule is `REVALIDATE_DURING_G3`; existing UI has historical presentation assumptions | `TEMPORARY_COMPATIBILITY` for current public route; target presentation `ABSORB_THEN_ARCHIVE` | Keep addressability/SEO until greenfield Number/Phrase projection is verified. Preserve capabilities, not geometry. |
| Entity/World adapters: `entityHubProjection.js`, canonical explorer facets, topic convergence adapter | read `nodes`, `research_objects`, Registry, canonical Gematria and approved topic public model | `KEEP_CURRENT` | Valid projection/adaptation layer. World Experience can be rebuilt around it. |
| Current `World2029Page.jsx` composition | G3 projection over live adapters, but composition/visual semantics not Human-Gate final | `ABSORB_THEN_ARCHIVE` | Reuse adapters/capability semantics; rebuild final World experience after clean frame. |
| Book identities in `nodes(type=book)` + `bookResearchProjection.js` | 30 Book nodes live; 2029 page reads live Book identities + Research Objects, keeps Witness/Locator distinctions | `KEEP_CURRENT` | This is 2029 Source/Book substrate. |
| Legacy `/book` `BookHubPage` | current production compatibility product | `TEMPORARY_COMPATIBILITY` | Retire only after `/books` greenfield source experience + deep links/SEO are verified. |
| Current `Books2029Page.jsx` | honest G3 projection; private intake explicitly pending | `ABSORB_THEN_ARCHIVE` as prototype composition | Keep `bookResearchProjection` and identity semantics; final Experience may replace page entirely. |
| ELS canonical engine/corpus/identity (`els_single_engine_law`, `fn_els_search`, canonical engine assets) | one-engine owner active; live ELS rows/functions | `KEEP_CURRENT` | Same engine/corpus/coordinates feed every future renderer. |
| `ElsWorkAreaPage`, `/lab/els`, old tool/work-area presentation | existing older Work Area / route | `TEMPORARY_COMPATIBILITY` | Keep only until new callable ELS adapter + renderer is verified. Never treat layout as 2029 authority. |
| `Els2029Page.jsx` | intentionally placeholder; explicitly states renderer not connected | `ABSORB_THEN_ARCHIVE` | Preserve owner semantics, replace placeholder with actual 2029 renderer. |
| Raziel semantic owners + live DB RPC family (`fn_raziel_*`) | active Companion v2 / Routing v2 plus live functions | `KEEP_CURRENT` at semantic/capability layer | One companion, one governed Research Context; runtime pieces still revalidated individually. |
| `AskRaziel.jsx` current UI + response-envelope assumptions | imports legacy theme, uses `raziel_response_contract` (REVALIDATE), hard-codes WhatsApp number/comment with `wa-christina` lineage | `ABSORB_THEN_ARCHIVE` | Build continuous 2029 Research Presence over current owners. Remove stale channel/UI assumptions after replacement. |
| Raziel WhatsApp/channel adapter | active rule explicitly `REVALIDATE_DURING_G3` | `TEMPORARY_COMPATIBILITY` until current channel runtime is requalified | Channel changes must not create second Raziel identity. |
| Person substrate: `persons`, `identity_edges`, Person Foundation | live large identity graph + active Person Foundation v6 | `KEEP_CURRENT` | Person/Life remains one Reality projection with privacy boundary. |
| Legacy Person/Life/Journey screens | mixed historical UI/runtime; target 2029 Person/Life adapter not fully wired to Heichal | `TEMPORARY_COMPATIBILITY` / `ABSORB_THEN_ARCHIVE` by screen | Preserve identity/history/evidence; rebuild projection. |
| `research_paths` / `research_plans` durable runtime | tables exist but both currently 0 rows | **NOT YET A LIVE CURRENT CAPABILITY** | Do not fake Journey-path/Research-plan persistence. G3 must implement/replay before relying on it. |
| Auth / Supabase Auth / RLS substrate | current identity/access substrate used across product | `KEEP_CURRENT` capability | 2029 may reuse canonical auth/access; old account UI/ladder must not define 2029 IA. |
| `UserCenterProvider` / legacy UserCenter presentation | App still wraps 2029 routes in provider; 2029 pages do not appear to consume `useUserCenter` directly | `TEMPORARY_COMPATIBILITY` pending dependency proof | My Workspace is the target projection. Remove provider from greenfield root when dependency scan proves safe. |
| Follow/subscription/attention semantic backend | current `subscription_funnel_law` owner; Follow ≠ relevance ≠ Raziel suggestion | `KEEP_CURRENT` semantics | Replace legacy buttons/placement without changing explicit consent truth. |
| Legacy WordPress/posts/gallery maintenance paths + `legacy_content_protocol` | explicitly legacy-compat owner | `TEMPORARY_COMPATIBILITY` | Preserve source/provenance and live old-site maintenance until greenfield publishing/media path replaces it. |
| Canonical Post/image nodes created from legacy source material | graph identities/provenance can be consumed by 2029 | `KEEP_CURRENT` data identity | Source origin may be legacy; representation is not legacy authority. |
| SEO helpers / sitemap / OG/card pipelines | shared current capability; `post_og_image_law` revalidate | `KEEP_CURRENT` capability + bounded G3 revalidation | Rebuild brand/representation templates without creating second SEO/share truth. |
| `/logo.png` | current code asset; Human Gate defines it as **Heritage Mark**, not future Primary | `KEEP_CURRENT` as heritage/provenance only | Forbidden as default Primary brand in 2029. Primary Master Crown uses separate locked identity. |
| Primary Blue-Gold Master Crown | Human-Gate identity locked on brand branch; exact locked binary not on current main canonical static path | branch/provenance only, **not current runtime** | Must be mechanically placed/verified before clean greenfield frame can claim Primary identity. |
| `Layout`, `Navbar`, `Footer`, `BottomBar`, old `GlobalChrome` | current legacy production chrome | `TEMPORARY_COMPATIBILITY` | Serve legacy production only until cutover. Must not define 2029 navigation/geometry. |
| `Sod2029Shell.jsx` + `sod2029*.css` current G3 shell | outside old Layout, but imports `/logo.png`, `SpaceBackground`, `AskRaziel`; current Human review rejected this lineage as final frame | `ABSORB_THEN_ARCHIVE` | Preserve closed System Frame capabilities only; rebuild clean greenfield frame without old presentation inheritance. |
| `SpaceBackground` as automatic 2029 environment | old shared visual primitive currently imported by shell | `ABSORB_THEN_ARCHIVE` as default shell dependency | 2029 environment role must be explicit (`dark_observatory` / light / lab / spatial), not inherited wallpaper. |
| Retired legacy 3D/Sulamot/Galaxy/Room renderers | Human-Gate retired; files now redirect/inert `SEO_GATE_RETIRED_ROUTE` stubs | `RETIRE_REMOVE` | Keep redirect stubs only until route/SEO compatibility cleanup; never use as 2029 spatial implementation. |
| Analytics / traffic measurement owners | current semantic telemetry substrate | `KEEP_CURRENT` | Event identity survives placement changes; old UI event placement does not. |
| Site/capability flags | canonical availability owner | `KEEP_CURRENT` | 2029 controls must consume canonical state, not local `live:true` inventions. |

## 4. High-risk silent-inheritance findings

### H1 — current 2029 shell is not a clean greenfield boundary

The 2029 routes correctly bypass old `<Layout/>`, but `Sod2029Shell` still imports/presents legacy or transitional primitives (`LOGO_URL` → `/logo.png`, `SpaceBackground`, `AskRaziel`). Therefore **route separation exists; Experience dependency separation is incomplete**.

Disposition: `ABSORB_THEN_ARCHIVE` current shell after closed capabilities are re-expressed in a clean implementation.

### H2 — Research OS core still knows old route shapes

`ResearchProvider` is legitimately a current Research OS substrate, but it also embeds explicit routing to `/number`, `/lab/els`, `/research?tool=els`. The semantic Context transition is current; the route knowledge is compatibility.

Action boundary: do not replace Research OS. Split/redirect the route-specific adapters as greenfield routes become real.

### H3 — Raziel current UI/runtime surface contains stale channel lineage

`AskRaziel.jsx` hard-codes the current WhatsApp number and comments it as `wa-christina`; current owner/coordination history has moved Raziel to the one-companion 2029 lineage and the old response contract is already marked `REVALIDATE_DURING_G3`.

Disposition: preserve underlying governed Raziel capabilities; replace the UI/channel adapter rather than copy this component into the new frame.

### H4 — current 2029 Heichal still exits into compatibility routes

The current Heichal prototype links Gematria work to `/research?tool=gematria`, ELS to `/els`, Books to `/books`, World to `/world`. The latter three are target-family routes; the `/research?tool=gematria` dependency proves the Number/Gematria deep mode still needs a canonical greenfield adapter before Heichal can be considered clean.

### H5 — greenfield semantic runtime is ahead of durable journey/plan persistence

`research_paths=0` and `research_plans=0` live. The Strategy/Journey contracts are real, but durable runtime must not be implied by UI labels such as “resume journey” or “compiled plan” until replay/persistence is implemented and verified.

## 5. Current-state DRIFT found during the pass

### D1 — Owner Index coordination version is stale

Current `SOD1820_MASTER_OWNER_INDEX.md` points Agent Coordination to `inter_agent_coordination_law v11`, while live canonical DB has **v12 ACTIVE**.

Do not resolve routing from the stale version string. Live owner wins. This artifact reports the drift; owner-index correction should be a bounded current-state synchronization write, not mixed into product implementation.

### D2 — Roadmap dispatch state is stale against live DB/runtime

Current Roadmap still says event-driven dispatcher `NOT IMPLEMENTED`. Live DB now has work_log dispatch triggers and active recovery/reconcile cron jobs, and work_log provenance records a released/verified GPT→Claude automatic wake chain on 2026-09-15. GPT result-wake remains deferred.

This is current-state documentation drift, not permission to infer full bidirectional automation.

### D3 — `reality_graph_law` label/version text mismatch

Live active row is `rule_version=8` while its label still begins `Reality Graph Law v7`. Treat the row/version as authority; label cleanup is current-state hygiene.

## 6. Branch-only / prototype rule

The following cannot be treated as current 2029 runtime merely because a branch/PR exists:

- rejected System Frame PR #477 — provenance only;
- World Golden PR #476 — exploratory branch-only, not target authority;
- brand evolution PR #410 — contains locked Primary identity/spec but has not performed global production cutover;
- Universal Intake PR #464 — branch-only implementation proof until merged/released;
- any Number Golden branch — reference/prototype until its current owner/runtime is integrated and released.

## 7. Immediate G3 build boundary derived from the census

Before another visual Golden becomes architecture, G3 should implement against this boundary:

1. **KEEP the new substrate**: owner tree, Reality Graph, Research OS truth/data, canonical Gematria registry/execution, Book identity/source adapters, ELS canonical engine, Person identity/privacy, Follow consent semantics, canonical auth/RLS, analytics truth.
2. **EXTRACT compatibility from current shared substrate**: route-specific `/lab/els`, `/research?tool=*`, old Number-route presentation coupling, stale Raziel channel/UI assumptions.
3. **BUILD a clean greenfield System Frame** consuming only owner-qualified current capabilities.
4. **REPLACE projections one family at a time**: World → Number/Phrase → Books → ELS → Heichal → Person/Life / Workspace.
5. **KEEP legacy production operational** until explicit cutover; compatibility is not target architecture.
6. **RERUN the full artifact-level census at end of G3** and only then execute `RETIRE_REMOVE` where replacement is live and verified.

## 8. Do-not-do

- Do not rewrite canonical Gematria/ELS/Graph engines merely to make their code “new”.
- Do not copy old UI because its engine happens to be valid.
- Do not create a second Research OS, Graph, Context, Raziel, Book Store, Engine registry, archive system or migration registry.
- Do not bulk-delete legacy routes/data before replacement replay.
- Do not promote branch-only prototypes into current state by documentation.
- Do not let `/logo.png`, legacy chrome, UserCenter, BottomBar, old Work Area or 3D stubs define the 2029 frame.

## 9. Specialist challenge

Because this pass crosses architecture/runtime/security/transition boundaries, independent `CLAUDE=REQUIRED` READ_ONLY challenge is decision-changing. Claude must challenge this baseline against current main + canonical DB and return only blockers/material corrections. GPT remains sole writer for this artifact.

## 10. State

**GPT BASELINE DRAFT COMPLETE · CLAUDE READ_ONLY CHALLENGE PENDING · NO PRODUCT IMPLEMENTATION / NO RELEASE.**
