# SOD1820 — W0 2027 LIVE ROUTE / OWNER INVENTORY V1

**Status:** W0 DETAILED LIVE PASS · DOCS ONLY · EXTEND_EXISTING · NOT IMPLEMENTED

**Sources verified for this pass:**
- `origin/main` current head verified at `cf4d8df54cde53a22f5d217d2f79c11f0f734e13`
- `src/App.jsx`
- `src/routes.jsx`
- `SOD1820_MASTER_OWNER_INDEX.md`
- `docs/sod1820-system-frame-contract-v1.md`
- Roadmap v5.4 / Product Map 2027 branch documents

## 0. Decision-changing finding: System Frame DRIFT

The current canonical owner for global navigation/context/bottom controls is `docs/sod1820-system-frame-contract-v1.md`.

That contract still contains presentation-specific commitments that conflict with the 2027 target now approved for Roadmap/Product Map planning, including:
- fixed three-persistent-layer model: Top Navigator + Context Rail + Bottom Control Layer;
- stable One Dock structure / five-slot vocabulary;
- Heichal described as a distinct immersive/spatial world rather than the new target research mode inside World;
- legacy expectation that fast navigation stays in a top bar while Heichal owns spatial exploration.

This is **DRIFT, not permission to ignore the owner**.

W0 therefore cannot be called CLOSED until the System Frame owner is reconciled through `EXTEND_EXISTING` or explicit `SUPERSEDE_EXISTING` semantics with preserved history. Roadmap v5.4 cannot silently override the canonical owner contract.

**OWNER CHECK:** `EXTEND_EXISTING` is preferred if the current System Frame contract can be evolved into an Adaptive Global Shell contract without creating a new global UI owner.

---

## 1. Canonical owner routing used by W0

| Responsibility | Canonical owner | W0 implication |
|---|---|---|
| One Tree / identities / relations | `reality_graph_law` | every focused projection resolves to same identities/relations |
| Research OS / Context / Journey composition | `docs/research-studio-v1-contract.md` | one Context Spine; no page-local parallel context |
| Global frame/navigation/control | `docs/sod1820-system-frame-contract-v1.md` | must be reconciled before W1 shell build |
| Experience lifecycle/governance | `experience_governance_foundation_v1_law` | replacement/retirement must preserve capability and rollout safety |
| Raziel companion continuity | `raziel_companion_layer_law` | one Raziel across all surfaces |
| Research intake | `research_intake_foundation_contract_law` | Create/Upload/WhatsApp/AI inputs converge into same intake semantics |
| Truth/governance/publication | `truth_axes_foundation_law` | tool output / candidate / canonical / published stay distinct |
| Methods | `canonical_methods_registry_law` + `engine_governance_registry_authority_law` | Heichal consumes canonical method identities/execution |
| Notifications/follow | `subscription_funnel_law` | personal attention cannot fork notification ownership |
| Visual language | `SOD1820_DESIGN_CONTRACT_V1.md` | 2027 renderer must extend canonical tokens/language, not create palette owner |

---

## 2. Current route families → 2027 destinations

This inventory classifies **route/capability families**, not every alias. Dynamic/SEO routes require a later exact route ledger before retirement.

### A. Discover / orientation

| Current routes/surfaces | Current capability | 2027 destination | Disposition | Route/SEO obligation |
|---|---|---|---|---|
| `/`, `/home-new`, `/בית-חדש` | landing/discovery | Curated World Gateway | **REPLACE presentation** | preserve canonical homepage identity/SEO copy until explicit SEO gate |
| `/start` | onboarding | Adaptive onboarding / contextual first-run | **ADAPT** | keep addressable or redirect only after inbound/SEO check |
| `/map` | navigation/system map | 2027 Product/World orientation projection | **REPLACE/ADAPT** | route may remain as addressable map projection |
| current Navbar / mega menus | global route discovery | Global Orientation Header + Search/Command | **REPLACE** | no route loss; capability parity required first |
| universal search in Navbar | search + numeric shortcut | Universal Search / Command Palette | **ADAPT/REUSE capability** | search actions must resolve stable entity routes/deep links |
| `/numbers` | convergence tree/navigation | Discover/World renderer | **ADAPT/REPLACE** | preserve externally addressable route until migration decision |
| `/timeline` | temporal discovery | World Time renderer | **ADAPT** | preserve canonical event/time URLs where indexed |

### B. Focused knowledge projections

| Current routes/surfaces | 2027 meaning | Disposition | Owner/constraint |
|---|---|---|---|
| `/number`, `/number/:value-or-phrase` and legacy gematria routes | World focused on Number/Phrase | **REPLACE presentation / REUSE identity+engines** | Reality Graph + canonical Gematria owners; high SEO/deep-link sensitivity |
| `/topic/:...` / Topic page | World focused on Topic/Convergence | **ADAPT** | same Topic/Convergence identities; no parallel topic store |
| `EntityPage` / entity routes | generic focused World projection | **REUSE concept / REPLACE experience** | candidate universal renderer; exact current route aliases inventory later |
| `/book...` / `BookHubPage` | Library + World focused on Book/Source/Passage | **REPLACE presentation / REUSE identity** | Book/source identity remains first-class; clean Reading Mode is renderer only |
| `/post`, dynamic post routes, taxonomy routes | source/content projection | **ADAPT** | posts remain content/source owner; semantic links project into World |
| `/archive`, gallery routes | representations/source loci | **ADAPT/CONSOLIDATE** | image/gallery representation ≠ semantic identity |
| `/name...` | Person/Name-focused projection | **ADAPT/REPLACE after capability audit** | person/name identity owner must remain canonical |
| `/verified` | curated verification projection | **ADAPT or absorb as filter** | verification axis must come from truth owner, not page-specific semantics |

### C. Research / Heichal / tool routes

| Current routes/surfaces | 2027 destination | Disposition | Key rule |
|---|---|---|---|
| `/research?tool=*` | Heichal tool mode inside World | **REPLACE shell / REUSE tool capabilities** | query tool IDs are migration input, not future IA requirement |
| `/heichal`, `/היכל` legacy immersive iframe | Heichal research mode | **REPLACE** | legacy visual experience may survive only as optional renderer/experience, not architecture |
| `/code` | Heichal ELS tool entry + ELS discovery bridge | **ADAPT/REUSE engine** | externally valuable route; keep/redirect with exact continuity |
| `/lab/els` | advanced ELS tool renderer | **ADAPT/REPLACE** | same ELS engine/context; no new ELS owner |
| `/beit-midrash` | source/method learning projection + Heichal actions | **ADAPT** | decide in W0 whether educational projection remains distinct addressable view |
| `/cross` / method-comparison routes | Heichal Compare/Method tools | **ABSORB/ADAPT** | same canonical method registry/trace |
| verse/gematria/reverse/other research tools | Heichal tool family | **ABSORB/ADAPT** | semantic action `run_tool`; tool result uses typed output envelope |
| `/lab`, experimental tool routes | experimental renderer registry/input | **REVIEW individually** | no experiment becomes global architecture by existence |

### D. Journeys / continuity

| Current routes/surfaces | 2027 destination | Disposition | Rule |
|---|---|---|---|
| `/journey...` | Research Path renderer | **ADAPT/REPLACE UI** | reuse canonical Research Path foundation |
| `/journey-beta` / experimental journey surfaces | renderer experiments | **RETIRE/ABSORB after parity** | no second Journey model |
| saved/resume/history launchers | My Workspace / Adaptive Commands | **ADAPT** | same Research OS and exact reopen semantics |

### E. Personal / account / attention

| Current surface/routes | 2027 destination | Disposition | Rule |
|---|---|---|---|
| `UserCenter` left drawer | My Workspace | **REPLACE surface / preserve capabilities** | one personal workspace; multiple launchers allowed |
| profile/auth routes | My Workspace → Account/Identity | **ADAPT** | account identity ≠ knowledge identity |
| credits/buy/access pages | My Workspace → Account/Access | **ADAPT** | access ≠ truth; billing remains separate capability owner |
| notifications / unread badges | My Workspace → Personal Attention | **ADAPT** | canonical notification owner only |
| DM/replies | My Workspace → Personal Attention | **ADAPT** | communication not Source Inbox |
| WhatsApp link/identity | My Workspace → Connected Channels | **ADAPT** | same verified identity, same Raziel continuity |
| saved/research collection | My Workspace → Research | **ADAPT** | projection over canonical stores, never duplicate collection owner |
| researcher level/progress | My Workspace → Progress | **ADAPT** | progress is personal projection, not truth ranking |
| current Bottom Bar `עוד` gateway | `open_my_workspace` / contextual commands | **REPLACE launcher shape** | gateway may remain one of many invocations, no second center |

### F. Now / notifications / inbox

| Current capability | 2027 semantic home | Disposition |
|---|---|---|
| broadcasts/site updates/live feed | Global Now / Discover | **ADAPT/CONSOLIDATE** |
| personal notifications | My Workspace → Personal Attention | **ADAPT** |
| Zvi / WhatsApp raw research messages | Admin Source Inbox | **ADAPT/REUSE source lineage** |
| candidate needing decision | Review Queue | **ADAPT** |

**Invariant:** one item can generate badges in multiple surfaces, but it has one semantic owner/identity.

### G. Community / contribution / creation

| Current family | 2027 destination | Disposition | Rule |
|---|---|---|---|
| `/community`, `/forum`, chat/comments | Community/Conversation projection | **REVIEW + CONSOLIDATE** | community conversation is not research truth by itself |
| community calculator | Heichal public/basic tool or retire duplicate | **REVIEW duplicate capability** | must not fork Gematria engine/telemetry semantics |
| post editor / creation | Create/Contribution | **ADAPT** | content creation feeds canonical content owner |
| research finding submission | Create/Intake | **ADAPT** | candidate/intake semantics from existing owner |
| ELS save/submit | Heichal result → Intake/Research | **ADAPT** | deterministic result vs interpretation/candidate separation |
| gallery/image contribution | Create/Intake | **ADAPT** | representation/provenance preserved |
| contributor pages | World Person/Contributor + My Workspace contribution history | **ADAPT** | contributor identity is not a separate people system |

### H. Admin / Command Room

| Current family | 2027 destination | Disposition | Rule |
|---|---|---|---|
| `/admin` and current admin tabs | Admin Research / operational admin projections | **REPLACE/ADAPT selectively** | no assumption current admin layout survives |
| research viewer/admin research pages | World Admin layers / Inspector | **ADAPT/ABSORB** | same Reality Graph/Research OS |
| WA inbox/admin intake | Source Inbox | **ADAPT** | source item may stay invisible in World until attached/candidate |
| relation editing / research decisions | Workbench / Review Queue | **ADAPT/BUILD on existing truth owners** | Candidate first → Human Gate |
| system diagnostics/Metatron | Admin System/Operations projection | **KEEP SEPARATE DOMAIN, integrate shell only** | system intelligence ≠ research truth/World identity |

### I. Experimental / immersive / spatial

Current Galaxy, Rooms, 3D, spatial and immersive routes are **renderer experiments**.

Default W0 disposition: **PRESERVE CAPABILITY/LEARNINGS, NOT ROUTE OR UI ARCHITECTURE**.

Spatial/3D remains a future renderer over the same Research State; no current experimental surface becomes the canonical World merely because it looks spatial.

---

## 3. Semantic action consolidation

Every current route/launcher/button should ultimately map to these action families unless W0 proves a missing semantic action:

### Navigation / focus
`search` · `open` · `focus` · `return_exact` · `open_world`

### Explore
`expand` · `filter` · `inspect` · `compare`

### Research
`open_heichal` · `run_tool` · `cancel_tool` · `retry_tool` · `save_result` · `add_to_research`

### Journey
`save_path` · `resume_path` · `branch_path`

### Personal
`open_my_workspace` · `open_account` · `open_personal_attention`

### Contribution / governance
`create` · `submit_intake` · `connect` · `propose_candidate` · `review` · `approve` · `reject`

### AI
`ask_raziel` · `apply_raziel_navigation` · `apply_raziel_filter` · `run_raziel_authorized_tool`

Placement is renderer-specific. Capability/action identity is stable.

---

## 4. Route / SEO migration classes

W0 must not delete or rename routes merely to make the new shell elegant.

### Class A — high continuity / likely stable public address
Examples: homepage, Number/entity addresses, Post, Topic, Book, ELS public entry.

Rule: preserve URL or provide deliberate canonical redirect/deep-link adapter after search/inbound audit.

### Class B — product navigation address
Examples: `/map`, `/archive`, `/community`, `/broadcasts`, `/beit-midrash`.

Rule: may be consolidated into World/Discover projections, but retirement requires capability parity + inbound/SEO check.

### Class C — tool/workspace address
Examples: `/research?tool=*`, `/lab/els`, compare/lab routes.

Rule: may become deep-link state into Heichal, but exact tool/context reopen must survive.

### Class D — admin/experimental/noindex
Admin, preview, lab, theme, prototype/3D experiments.

Rule: can be replaced aggressively after verifying there is no unique capability or coordination dependency.

---

## 5. W0 state model

### Durable
- canonical knowledge/truth state under existing owners
- saved Research membership
- Research Paths/Journeys
- governed candidates/drafts/intake state
- user account/preferences/access under account owners

### Shareable / exact reopen
- focused stable identity
- bounded Explorer dimensions
- selected source/path/locus
- ELS exact occurrence
- Heichal tool identity + safe parameters where allowed
- return target

### Ephemeral
- panel/rail width
- whether Raziel is hovered
- animation/zoom interpolation
- temporary menu/dropdown
- transient layout choice unless explicitly promoted to preference

**Do not stuff ephemeral shell state into Research Context.**

---

## 6. Surface matrix — target behavior

| Semantic region | Desktop | Tablet | Mobile | Future external |
|---|---|---|---|---|
| Orientation | compact global header | compact header | minimal identity/search | app/browser identity strip |
| Search/Command | omnibox + keyboard palette | omnibox/palette | search/command sheet | command entry |
| World | graph/list/path/source split views | adaptive one/two pane | task/list/path-first | richer desktop/spatial renderer |
| Heichal | in-place tool workspace | focused tool pane | full focused tool mode | supported authorized tool surface |
| Raziel | presence/companion/deep | collapsible panel | full-height sheet | same companion identity/context |
| Inspector | side contextual | collapsible | sheet | optional contextual inspector |
| Commands | keyboard/context toolbar/dock as needed | adaptive | bottom/task commands | surface-specific controls |
| My Workspace | workspace/panel | workspace | full screen | selected personal/account views |

No desktop capability may exist only as a mouse drag. No mobile capability may fork semantics.

---

## 7. W0 risk register / blockers before PASS

### BLOCKER A — System Frame canonical-owner drift
Must reconcile `docs/sod1820-system-frame-contract-v1.md` against Roadmap v5.4 target before W1 implementation.

### BLOCKER B — exhaustive alias/route ledger
Need machine/readable or finite manual ledger of exact `<Route path>` registrations, dynamic SEO owners, redirects/aliases and noindex/admin routes before retiring surfaces.

### BLOCKER C — personal capability owner crosswalk
UserCenter exposes many capabilities. Each must resolve to existing data/API owners before redesign so My Workspace does not accidentally create a new store.

### BLOCKER D — community/contribution semantic boundary
Need decide which conversation/submission actions are merely social, which enter Research Intake, and where Human Gate begins.

### BLOCKER E — long-running tool contract
ELS/AI/deep engines need consistent states: queued/running/partial/succeeded/failed/cancelled/retryable, with provenance and cost/trace where applicable. Do not invent lifecycle inside each tool UI.

### BLOCKER F — telemetry vocabulary
Current route/page telemetry can remain for compatibility, but W1 must add semantic action/context telemetry independent of component placement.

---

## 8. Current W0 verdict

**Topology:** PASS

**One-tree architecture:** PASS

**Live route-family crosswalk:** COMPLETE at family level

**W0 overall:** **NOT CLOSED**

Required next gates:
1. reconcile System Frame owner drift;
2. finish exact route/alias/SEO ledger;
3. personal capability owner matrix;
4. long-running tool + telemetry contracts;
5. independent architecture challenge.

No product code, schema, canonical promotion, merge or deploy is authorized by this document.
