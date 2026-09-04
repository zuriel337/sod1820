# SOD1820 Research OS — Canonical Lock v1

**Status:** LOCKED · 2026-09-04  
**Scope:** Hall / Research Workspace / saves / history / journeys / all research-capable entities.

## 1. One Research OS

SOD1820 has **one** research system. The Hall is a projection/workspace over the existing Reality Graph and canonical stores; it is not a second database, second save system, or isolated product.

Existing stores are preserved and reused:
- `research_items` — workspace membership: cart / library(saved) / pinned / searched / hints and future compatible buckets.
- `user_research` — existing user state, especially history / collections / journeys. Existing history is migration input and must never be silently discarded.
- `journey_saves` — journey continuity where already used.
- `research_objects` — durable research assertions/evidence when explicitly promoted; never a replacement for saved/workspace membership.

Do **not** create another saved-items, history, collections, journey, or research workspace store without a separate architecture gate.

## 2. Universal Research Bus

Every research-capable surface must converge on one user action and one envelope:

**➕ Add to Research**

Canonical entity families include, at minimum:
`number | phrase | verse | post | person | name | book | source | code | els_finding | image | date | topic | convergence | insight | relation`.

A tool may keep its source-native truth/state, but when a user adds something to research it emits a Universal Finding/reference into the existing Research Workspace. It must not invent a tool-specific parallel “saved” concept.

Minimum envelope:
- stable `entity_type`
- stable `entity_ref`
- human title
- canonical/openable link or reopen target
- source/tool identity
- created/saved timestamp
- metadata sufficient to reopen the relevant context
- optional provenance/verification snapshot when required by the Universal Finding contract

## 3. Preserve old → enrich future

Legacy/current user data is **not test debris** and is not deleted during the Hall transition.

Current concepts map forward:
- `saved` → `research_items.bucket=library`
- `cart` → active Research Workspace
- `pinned` → pinned Workspace item
- `user_research.history` → Continue / Research Timeline
- `collections` → Research Cases/Collections (same underlying user state until a gated migration)
- `journeys` + `journey_saves` → Research Journeys / exact resume
- `searched` → Personal Knowledge Trail; not the same as an intentional save

Migration rule: **adapter first, destructive migration never by default**.

## 4. History is a research trail, not a page-view list

The future History UI must be able to answer:
1. What did the user encounter?
2. What did they intentionally save?
3. Did they reopen that exact item?
4. What did they explore from it?
5. What new entity/relation did they discover?
6. Did the trail become a collection/journey/research assertion?

Existing `user_research.history` remains readable while richer events are added. New telemetry must not require rewriting old history.

## 5. Product success funnel

The Hall's primary research-depth funnel is:

**DISCOVER → SAVE → REOPEN → EXPLORE → DISCOVER-NEXT → RETURN**

Required future telemetry uses stable entity identity, so `save → reopen` can be measured exactly rather than inferred from URLs/text.

Admin analytics should eventually expose:
- users who saved
- saves per saver
- exact-item reopen rate
- reopen after 1d / 7d / 30d
- downstream exploration from saved items
- second-save / related-discovery rate
- journey/collection creation from saved items
- Raziel-assisted return/discovery lift

Do not mix admin/test-user activity into public product conclusions when a reliable exclusion is available.

## 6. Raziel's role

Raziel is an intelligence layer **over the same Research OS**:
- may explain, rank, suggest related entities/edges, and surface changes since last visit;
- may propose “continue this research” from saved/history context;
- must not create canonical graph truth silently;
- canonicalization/promotion remains behind the existing AI/human gate and provenance rules.

Example product behavior:
“506 was saved 12 days ago · 4 related items were added since · continue from your last point · 2 Raziel suggestions.”

## 7. Hall access during construction

Until public opening:
- Public: construction state + links to live tools.
- Admin: full working Hall/Research Workspace.
- Preview: visitor-equivalent view for release checks.

Closing the Hall publicly must not disable live tools or destroy research state.

## 8. Known gaps to close — in order

1. **Universal entity coverage:** phrase/number dominate current `research_items`; verse exists but is sparse. Posts, books/sources, people/names, codes, images and other worlds need the same Add-to-Research contract.
2. **ELS bridge:** ELS source-native state must project into the same Research Workspace/Universal Finding flow; no duplicate ELS saved universe.
3. **Exact reopen telemetry:** add stable save/reopen/explore identity so retention around saved knowledge is measured directly.
4. **History adapter:** render existing `user_research.history` in the future Continue/Timeline UI, then enrich with new typed events.
5. **Collections/Journeys UX:** reuse existing state and make it useful; do not replace it merely because current adoption is low.
6. **Raziel continuity:** suggestions operate on saved/history/journey context and return to the exact canonical entity/context.
7. **Coverage audit:** every research-capable route/tool must declare its entity adapter and reopen behavior before the Hall is public.

## 9. Release gate for the Hall

The Hall is not “ready” merely because its page renders. Public release requires:
- one Research Workspace, no parallel saves;
- old saves/history remain visible;
- number + phrase + verse + post + code/ELS + person/name + source/book can enter research through the same bus;
- saved items reopen correctly;
- at least one Continue/History path restores context;
- admin/preview/public states behave separately;
- analytics can distinguish save and exact reopen;
- no source-native research truth is silently replaced by UI metadata.

## 10. Universal Lens / Journey Projection Direction — ZURIEL clarification, 2026-09-04

The Research OS must support **one entity/research state viewed through many lenses**, not one product per page type.

Approved direction:

- Number, Topic/Convergence, Time/Chronology, Journey/Path, Source/Book, Person/Name, Verse, Event, ELS, Language/Representation and Depth are **entry points / projections** over the same Reality Graph and Research OS.
- A Number Hub is the first rich Golden Case, not a separate Number Research OS.
- Topic scale may grow to thousands; browse/search/filter/rank/pagination must extend existing topic/graph primitives rather than create a second Topic truth store.
- Chronology is a projection. Event/occurrence time, source/publication time, research/discovery time and Human-Gate decision time must remain distinguishable when known.
- A durable Journey/Research Path, if it has valid identity and governance, must be re-enterable from participating entities, Topics, Search, Workspace, Sources and future ELS lenses **without copying its truth into each surface**.
- Subscription/depth controls access, tools and presentation only. **Premium ≠ truth; Private ≠ Paid; Canonical ≠ Published; Depth ≠ Truth.**
- Search should resolve into the same entity/topic/path identities rather than become a parallel flat-results truth system.

### Journey terminology must remain disambiguated

At least three existing/future concepts must not be merged merely because they are called a journey:

1. **Number Knowledge Journey** — existing number-root/branch journey projection, e.g. `fn_number_journey(1237)`.
2. **User / Workspace Journey** — personal research continuity/history stored through the existing Research Workspace/user state.
3. **Research / Discovery Path** — an ordered or branchable path through entities/findings/relations/topics/sources that may later become independently addressable.

The exact identity/governance contract for #3 is **not declared closed by this clarification**. It is under the dedicated Universal Entity · Topic · Journey Foundation/Projection challenge. No new Journey table/store/system is authorized unless existing primitives are proven insufficient and ZURIEL approves the resulting Foundation decision.

### 1237 Golden Case direction

Number 1237 is the first intended stress test because it already contains both legacy/live graph knowledge and newer Research OS material, including an existing approved Number Journey and new Research Objects.

The candidate sequence:

`112 → 358 → 676 → 1120 → 1237 → 2137`

is a **research stress test only**. This lock does not make it a canonical/published Journey. If it later receives valid Journey identity and Human-Gate approval, it should be discoverable/re-enterable from all participating entities and relevant Topics without duplicating truth.

The detailed additive direction and guardrails are recorded in:
`docs/universal-lenses-projection-direction-v1.md`.

**Build direction, subject to the current Foundation challenge:** Universal Entity Projection contract → 1237 Golden Case → Topic mini-case (`התגלות`) → Journey/Path identity only if needed → faceted search/tree/chronology → richer Experience/depth/premium/spatial projections.

## 11. Non-negotiable principle

**One Tree · One Research OS · Many Lenses.**

The Hall does not own the knowledge. It lets a person move through the same knowledge graph, collect references, resume trails, and discover relationships across tools.

**Foundation → Projection → Experience.**
