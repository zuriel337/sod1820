# SOD1820 — W0 2027 GLOBAL SHELL CAPABILITY CROSSWALK V1

**Status:** W0 MACRO PASS · EXTEND_EXISTING · DOCS ONLY · NOT IMPLEMENTED  
**Roadmap:** `SOD1820_MASTER_ROADMAP.md` v5.4  
**Product Map:** `docs/sod1820-product-map-2027-v1.md`

## 0. Purpose

This document begins W0 by separating **capabilities** from the current UI surfaces that expose them.

Current UI is draft material. The goal is not to preserve today's Navbar, Bottom Bar, User Center, Heichal, Raziel shell or page layouts. The goal is to preserve useful capabilities and reconnect them into one 2027 Adaptive Research Experience.

Disposition meanings:
- **REUSE** — semantics/capability already target-ready; presentation may still change.
- **ADAPT** — capability/owner is useful; surface must be reshaped into the new shell.
- **REPLACE** — capability remains, but current experience should be rebuilt.
- **RETIRE** — surface/duplicate may disappear after parity and route/SEO checks.

This is a macro pass, not the final exhaustive component-by-component inventory.

---

## 1. Global shell crosswalk

| Current surface/capability | Target 2027 home | Disposition | One-tree rule |
|---|---|---|---|
| Current Navbar | Global Orientation Header + Search/Command | **REPLACE** | Navbar layout/category structure is not canonical |
| Global product navigation | Adaptive Global Navigation; desktop may project as collapsible Sidebar | **ADAPT** | one navigation capability, many responsive placements |
| Posts navigation entry | Global Navigation → `פוסטים` → `/post` listing | **ADAPT** | `/post` is listing/navigation only; individual posts remain root `/:slug` |
| Current Bottom Bar | Adaptive Command Surface | **REPLACE** | preserve semantic actions, not 5 fixed slots |
| `Research Context` capability | Research Context Spine | **REUSE** | one continuity substrate across all views |
| Current Number Drawer / quick number launch | Search/Command + context action | **ADAPT** | no second number system |
| Current site updates / “Now” launchers | Global Now projection | **ADAPT** | distinguish global Now from personal notifications |
| Current Raziel launch/button | Global Raziel Companion | **REPLACE** | one Raziel, no page-specific copies |
| Current `RazielGlobalShell` prototype | design/capability reference only | **RETIRE/ABSORB** | do not revive its duplicate bottom bar |
| Current contextual sheets/drawers | Contextual Inspector / adaptive sheet | **ADAPT** | same actions, contextual rendering |

### Global Orientation Header target
Minimal responsibilities only:
- SOD1820 / World identity
- current focus/breadcrumb where useful
- Universal Search / Command
- account/avatar and depth/access signal where useful

It must not become a permanent mega-menu.

### Adaptive Global Navigation / Sidebar projection

The global navigation capability is separate from the Orientation Header. On desktop, its preferred 2027 projection may be a **collapsible Sidebar**; on mobile the same capability may render as a drawer/sheet, and keyboard users may reach the same destinations through Command/Search.

A bounded first-level hierarchy may include product destinations such as:

`בית · עולם/Discover · מספרים · ספרים ומקורות · דילוגי אותיות · בית המדרש · פוסטים · גלריות/תוכן where justified · מסעות · היכל`

The exact labels/grouping remain product-design decisions, but **`פוסטים` is a required navigation capability** because the long-lived post corpus remains a first-class public content/source surface.

Posts have a special address rule:

`Sidebar → פוסטים → /post → open item → /<existing-slug>`

The clean hierarchy lives in navigation state, **not** by moving individual posts under `/post/:slug`. Root post URLs are protected by `docs/w0-2027-post-url-immutability-gate-v1.md` and the Route/SEO matrix.

---

## 2. My Workspace / personal domain crosswalk

Current `UserCenter` proves several real capabilities exist, but its left drawer and Bottom-Bar launcher are UI choices, not architectural ownership.

| Personal capability | Target home | Disposition | Rule |
|---|---|---|---|
| Open personal center | `open_my_workspace` capability | **REPLACE surface** | one workspace; many launchers allowed |
| Saved research / collection | My Workspace → Research | **ADAPT** | view over existing research membership/owners |
| “My research” entry | My Workspace → Research / Journeys | **ADAPT** | must not embed/copy the canonical Research OS |
| Journeys / resume | My Workspace → Journeys | **ADAPT** | same Research Path identities |
| Recent / continue | My Workspace → Resume | **ADAPT** | exact reopen from governed context/history |
| Notifications | My Workspace → Personal Attention | **ADAPT** | personal notification owner remains canonical |
| Direct messages / replies | My Workspace → Personal Attention | **ADAPT** | communication view, not World truth |
| WhatsApp linked identity/channels | My Workspace → Connected Channels | **ADAPT** | identity/channel continuity, no second Raziel |
| Contributions | My Workspace → Contributions | **ADAPT** | references canonical submitted/created objects |
| Created/published content | My Workspace → Creation history | **ADAPT** | Post/Content identity stays canonical elsewhere |
| Profile / identity | My Workspace → Account | **ADAPT** | account state ≠ World knowledge |
| Researcher level / progress | My Workspace → Progress | **ADAPT** | projection over existing progression owner |
| Credits | My Workspace → Account/Access | **ADAPT** | billing/credit owner, not research truth |
| Premium/entitlements | My Workspace → Account/Access | **ADAPT** | Access ≠ Truth |
| Privacy/preferences | My Workspace → Settings | **ADAPT** | no duplicate settings stores |

### Decision
**My Workspace is a projection, not a new system.**

Avatar, Command Surface, Raziel and mobile account controls may all call `open_my_workspace`; they must not evolve into separate personal areas.

---

## 3. Knowledge / focused projections crosswalk

| Current area | 2027 meaning | Disposition |
|---|---|---|
| Home | Curated World gateway | **REPLACE** |
| Number page | World focused on Number/Phrase | **REPLACE presentation / REUSE capability** |
| Topic/Convergence | Focused World semantic projection | **ADAPT** |
| Book Hub / Book detail | World focused on Book/Source; Library + Reading renderers | **REPLACE presentation / REUSE identities** |
| Posts | Source/content projection connected to World; Sidebar entry via `/post`; individual identity remains root `/:slug` | **ADAPT presentation / PRESERVE URL identity** |
| Galleries/images | Representation/source loci | **ADAPT** |
| Person/Name surfaces | Focused identity projection | **ADAPT/REPLACE by quality** |
| Timeline/events | Temporal World renderer | **ADAPT** |
| Explorer | Bounded Discover/Faceted projection | **REUSE substrate / REPLACE experience as needed** |

No current page template is protected merely because it exists. **Exception in kind, not presentation:** externally indexed individual Post addresses are protected as durable identity/SEO routes even while their renderer may change.

---

## 4. Heichal / tools crosswalk

| Current capability/surface | 2027 home | Disposition |
|---|---|---|
| Current `/heichal` full-screen gateway | Heichal research mode inside World | **REPLACE** |
| Gematria calculator | Heichal tool | **REUSE engine / REPLACE or ADAPT UI** |
| registered gematria methods | Heichal tools + Method dimension | **REUSE** |
| Method Trace | Heichal Inspector / Context Inspector | **REUSE capability** |
| ELS search engine | Heichal tool | **REUSE engine** |
| ELS work areas/pages | Heichal ELS renderer | **ADAPT/REPLACE** |
| Verse/biblical context | Heichal tool + World source projection | **ADAPT** |
| compare/reverse/numeric operators | Heichal tool family | **ADAPT** |
| Book/source inspection tools | Heichal | **ADAPT** |

Invariant:
**World focus → Heichal → Tool → typed result → World.**

---

## 5. Notifications / Now / Inbox hierarchy

| Capability | Semantic owner/home | Must not become |
|---|---|---|
| Personal notification | My Workspace → Personal Attention | global Now feed |
| DM/reply/account alert | My Workspace → Personal Attention | research Source Inbox |
| Site-wide current update | Discover / Global Now | personal notification state |
| Zvi/WhatsApp/raw source intake | Admin Research → Source Inbox | public/global Now by default |
| Candidate needing decision | Review Queue | ordinary notification only |

Multiple badges/surfaces may point to the same item. One item must retain one semantic identity/owner.

---

## 6. Create / Intake / Contribution crosswalk

Current and future editors/inputs must converge on one semantic flow:

`create/upload/message/finding → intake → typed draft/source/candidate → review/human gate when required → World`

Macro families to inventory in detailed W0:
- post authoring
- gallery/image contribution
- research finding submission
- ELS save/submit
- book/source extraction
- contributor submissions
- WhatsApp/Raziel intake
- admin candidate creation

UI editors may differ by task; semantic intake/truth lifecycle must not fork.

---

## 7. Account / Access crosswalk

Target home: **My Workspace → Account / Access**.

Capabilities to preserve and reconcile:
- authentication/session
- profile/identity
- credits
- subscription/Premium entitlement
- privacy/preferences
- connected channels/devices
- notification preferences
- security/account actions

Rules:
- Account state ≠ Research truth.
- Access tier ≠ mathematical truth.
- server-side authorization bounds data.

---

## 8. Admin / Human Gate crosswalk

| Current/future capability | 2027 home | Rule |
|---|---|---|
| raw source intake | Source Inbox | may exist without graph visibility |
| candidates/unresolved/contradictions | Review Queue / World layers | hidden by default where appropriate |
| relation editing | Workbench / Relation Composer | candidate first |
| canonical promotion | Human Gate | explicit ZURIEL decision |
| diagnostics | Admin Research authorized projection | never leaked to public/deep client payload |

Admin is a deeper projection of the same World, not another graph.

---

## 9. Action vocabulary — macro draft

Global actions should be semantic and placement-independent:

`search` · `open` · `focus` · `inspect` · `expand` · `filter` · `compare` · `run_tool` · `open_world` · `open_heichal` · `open_my_workspace` · `open_notifications` · `open_account` · `add_to_research` · `save_path` · `resume_path` · `create` · `submit_intake` · `connect` · `propose_candidate` · `review` · `approve` · `reject` · `ask_raziel` · `return_exact`

Detailed W0 must map each current launcher/button/route to one of these or justify a new semantic action.

---

## 10. State placement — macro draft

### Durable
- saved research membership
- Research Paths/Journeys
- governed candidates/drafts
- account/preferences where owned

### Shareable/reopenable
- focus entity
- bounded filters
- path/window
- exact ELS locus
- return target

### Ephemeral
- drawer width
- hover
- open dropdown
- animation
- temporary panel placement

Ephemeral UI state must not become Research Context truth.

---

## 11. Surface matrix — macro draft

| Capability | Desktop | Mobile | Future external |
|---|---|---|---|
| Global navigation | collapsible Sidebar / rail + Command access | drawer/sheet + Command access | same destination/action vocabulary where supported |
| Search/Command | header + palette | top/search sheet | browser/desktop command entry |
| Raziel | side presence/companion | full-height sheet | same companion identity/context |
| Commands | dock/palette/context toolbar | bottom/task sheet | contextual controls |
| Inspector | side panel | sheet/full task view | contextual view if supported |
| My Workspace | workspace/panel | full screen | selected account/research views |
| World | graph/list/path mix | list/path/task-first | future spatial/desktop rich renderer |
| Heichal | in-place research workspace | focused tool mode | authorized tools where supported |

Capability semantics remain identical across surfaces.

---

## 12. Macro disposition summary

### REUSE substrate/capability
- Reality Graph / stable identity
- Research OS / Research Context
- bounded Explorer readers
- Journey/Research Path foundation
- ELS engine + exact continuity
- canonical Gematria engines/methods/trace
- auth/access/security owners
- existing personal data owners where governed

### ADAPT
- Topic/Book/Post/Person/Timeline projections
- **Post listing/navigation may move into the new Sidebar/Discover hierarchy while root individual post URLs stay fixed**
- personal notifications/messages/channels
- contributions/progress/credits/account capabilities
- site Now/update capability
- contextual inspectors/sheets

### REPLACE presentation
- Navbar
- Bottom Bar
- current Heichal gateway
- current Number-page layout
- current Book-page layout
- current UserCenter drawer as the only personal-space form
- current Raziel page/launcher pattern
- Home widget architecture

### RETIRE candidates after parity/deep-link audit
- duplicate Raziel shell bars
- duplicate launchers that own no unique capability
- dead/legacy page shells whose capability has moved to canonical projection

No RETIRE action is authorized by this document alone.

---

## 13. What remains before W0 PASS

This macro pass closes the **topology** but not the exhaustive inventory.

Detailed W0 still must:
1. enumerate actual current routes/components/capabilities
2. resolve each to its live owner
3. map every meaningful action to semantic vocabulary
4. identify duplicate surfaces with unique capability vs pure duplication
5. inventory route/SEO/deep-link obligations
6. define long-running-tool retry/cancel/failure semantics
7. define telemetry vocabulary
8. complete access matrix by capability
9. complete accessibility/keyboard parity rules
10. run independent architecture challenge

Until then: **W0 ACTIVE, not CLOSED.**
