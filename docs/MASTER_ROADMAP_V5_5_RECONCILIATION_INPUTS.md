# Master Roadmap v5.5 — Reconciliation Inputs

**Date:** 11.9.2026  
**Status:** BRANCH-ONLY PLANNING CROSSWALK · NOT MERGED · NOT DEPLOYED

This crosswalk records the decision-changing material that must be absorbed by `SOD1820_MASTER_ROADMAP.md` v5.5. It is not a second roadmap or a new owner.

## 1. Why v5.5 is required

v5.4 correctly established **One Reality Graph · One Research OS · One World, Many Views**, but the 9–10 September work changed the planning order and exposed several missing layers. The biggest change is that AI/Research Context is no longer a late “Raziel feature”: identity-first research composition, the capability fabric and bounded context compilation are foundation services that feed Raziel, Search, Journeys, personal research and future engines.

## 2. Architecture decisions to absorb

- Future target: **One Tree → One Reality Graph → Temporal World Model → Research OS → Contextual/Adaptive projections**.
- Minimal semantic boundary: **Identity / Evidence / Composition / Projection**.
- Dynamic Lens is the default for an ad-hoc clicked/search concept; persistent Topic/Canonical Subject is promoted only when the subject is important and durable.
- Topic is not a folder and navigation hierarchy is not the semantic graph.
- Dataset, Derivation and Research Structure are distinct research roles; do not add a universal first-class DB type until owner/identity qualification proves it is required.
- One identity may appear in Number, Book, World, Journey, 2D/3D/VR and multiple languages without copies.
- Time is first-class: `occurred_at`, `source_published_at`, `discovered_at`, `researched_at`, and `stream_at` where applicable.
- Historical interpretation is preserved while a current/default interpretation may change.
- Public, Indexable and Featured are independent axes.
- Canonical identities are normally retired/merged/superseded, not destructively deleted.

## 3. AI / Research Fabric decisions to absorb

- Raziel = **Research Intelligence / Companion**, not a truth owner, second graph or second memory system.
- Research Context/Context Compiler is **identity-first** and extends the existing Research OS; it does not create a context database.
- Capability families are open-ended. Current examples: Gematria, ELS, governed numeric operators, Books/Sources, Graph, Person/Family, Events/Reality, future engines.
- Engines execute under their canonical owners; the composer only dispatches and composes.
- Existing Universal Finding remains the atomic result envelope; the existing research result-bundle line is extended rather than duplicated.
- Context selection must get smarter as knowledge grows; corpus size must not imply larger LLM prompts.
- Privacy/access is resolved before private evidence enters a result/context bundle.
- `SCAN EVERYTHING; ROOT ONLY WHAT BECOMES GEMATRIA RESEARCH` remains the Gematria corpus boundary.
- PR #428 is a branch-only W2.1 proof for Identity First + Research Plan + Composer/Context Pack. It is not merged/live and must not be mistaken for production state.

## 4. Product / experience decisions to absorb

Stable global homes from the accepted navigation direction:

1. Home / Discover
2. World
3. Heichal
4. Updates / Posts
5. Archive
6. My Workspace

Global capabilities rather than destinations: Search/Command, Raziel, Personal Attention, Account/Workspace entry, Language.

Additional experience decisions:

- Home is a gateway, not a widget warehouse. Final Home module order must be reconsidered after AI-native reconciliation.
- Search/Command resolves **identities and actions**, not only keyword result pages.
- World is an adaptive contextual research space; Tree/graph/list/time/source/visual are renderers/lenses inside it.
- Heichal is deep research mode; Number Page, Gematria, ELS and Person/Life Journey remain first-class research products/capabilities without becoming separate truth systems.
- Beit Midrash remains learning/explanation/study, not the semantic owner of Topics and not another computational engine.
- Archive direction: `זרם המציאות = NOW` · `אוצרות = BEST/CURATED` · `גלריות = ALL/ARCHIVE`; legacy public Pool/Sets is not a required primary destination.
- Reality Stream is a temporal World projection, not Gallery and not a second tree.
- Global Now evolves from posts-only into a typed update projection; exact prominence/ranking/dedup policy is still an explicit OPEN gate before final Home composition.
- Personal Reality / Personal Hints are private/contextual projections over the same identities; submission enters Research Intake rather than auto-publication.
- Contextual Source Gap / Book Acquisition Alert should be a future Research Plan capability: first search owned sources, then recommend missing sources without turning a recommendation into a source fact.

## 5. Design / naming material recovered from branch-only work

These are accepted Human-Gate directions but most are **not merged/live**, so the roadmap must point to them without claiming rollout:

- Horizon + Cosmic 2029 visual direction; Dark Observatory and Light Celestial are two projections of one product.
- Gold = brand/premium/value; Sapphire = action/research; Purple/Indigo = Raziel/intelligence; Glass = secondary action family.
- Opening Horizon states: Available / Next to Open / In Development / Entitlement Required / Future. Entitlement lock is not the same as not-built-yet.
- Shared Action/Icon family and Signature family; do not create per-feature icon systems.
- Living Doorway/Portal Preview = bounded destination-owned preview, not a second state/store.
- Media Viewer = one shared viewer; default opens whole image without crop, then Read/Zoom modes.
- Gematria Visual = structured representation over canonical research data; six template-family direction is preserved.
- Research-rich Post renderer = one Post identity, many renderers; source wording/provenance stay stable.
- Master Crown future direction = blue/gold primary identity; current crown remains Heritage Mark until explicit cutover.

Naming decisions/guards:

- `SOD1820` = system/site name.
- `כי לה׳ המלוכה` = core public identity paired with SOD1820.
- English projection = `KINGDOM RISE`.
- public name is `היכל`, not `היכל הגילוי`.
- `דף המספר` remains; reject `עולם המספרים` / `עולם המספרים והגימטריה` as formal product names.
- do not lock `עץ המספרים` or `עץ ההתכנסויות`; Tree is a World visualization/lens.
- `קוד המציאות` = lens/projection, not a second system; final strategic scope remains open.
- Archive umbrella Hebrew name remains open; inner labels `זרם המציאות / אוצרות / גלריות` are the current accepted direction.
- My Workspace public Hebrew name remains open.
- higher premium tier name remains open.

## 6. Machine experience / distribution to absorb

Human and machine experiences consume the same canonical public reality. The roadmap must explicitly cover Google/search/answer agents/feed consumers without creating “robot content”. Carry forward:

- stable canonical public base for anonymous users, sharing and crawlers;
- dynamic sitemap/canonical/structured data from existing owners;
- Discover large-image readiness and representative-image validation;
- RSS + JSON Feed and an IndexNow publishing hook;
- crawler policy by purpose (search/retrieval vs model training), subject to Human Gate;
- phrase indexability gate; real 404/410; share outbound hygiene;
- hreflang/localized feeds when multilingual projection ships;
- optional `llms.txt` only as a convenience, never as truth/authorization owner.

## 7. Buried operational/release gates found in the scan

- Live recheck on 11.9.2026: `public.set_lead_rank(text,integer,integer)` is still `SECURITY DEFINER`, executable by `anon` and `authenticated`, and contains no auth/role gate. Treat as a **P0 before public widening**, not as a blocker to roadmap/design work.
- Do not raw-merge the old design branches: the main brand/design branch is materially diverged from current main. Reconcile decisions into current owners on a fresh base.
- `research_paths` is still empty in live data; Journey foundation/seed/intent must not be described as a fully materialized modern Journey product.

## 8. Current live baseline used by v5.5

Read-only live check before roadmap edit:

- Nodes: **6,497**
- Edges: **7,118**
- Research Objects: **735**
- ELS records: **135**
- Active Book identities: **6**
- Gematria methods: **37 registered / 32 active / 28 scannable**
- Research Paths: **0**

## 9. Deliberately unresolved before final UI

- Global Now ranking/prominence/dedup policy.
- final Home module order after AI-native experience pass.
- exact public Hebrew name for Archive umbrella and My Workspace.
- exact durable DB/type boundary for Topic, Dataset and Research Structure.
- exact display name/route for a persistent 1820 Research World/Axis.
- model-training crawler policy.
- production Master Crown asset/cutover date.
- exact new Command Center route.
- detailed migration/release timing for 2026-06-15+ `/post/:slug` canonicalization.

These OPEN items are not permission to invent local names or systems during implementation.
