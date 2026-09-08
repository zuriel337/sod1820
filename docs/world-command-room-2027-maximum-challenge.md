# SOD1820 — WORLD / COMMAND ROOM 2027 MAXIMUM CHALLENGE

Status: READ-ONLY ARCHITECTURE/PRODUCT CHALLENGE RESULT · BLUEPRINT LINEAGE ONLY · NO PRODUCT IMPLEMENTATION · NO MERGE · NO DEPLOY

## 0. Challenge objective
Try to break the 2027 World / Command Room blueprint before implementation. The challenge assumes all current UI is draft-only. Existing capabilities may be reused, adapted, replaced or retired; canonical identity, truth, provenance, Research Context/Journey continuity, engine behavior, authorization and Human-Gate decisions must survive.

OWNER CHECK: EXTEND_EXISTING. No new graph, truth store, search engine, method engine, Journey system, Book graph or Raziel memory system is justified by this challenge.

## 1. Final verdict
**ARCHITECTURE DIRECTION PASSES, BUT THE BLUEPRINT NEEDS 8 EXPLICIT 2027 EXTENSION CONTRACTS BEFORE SHELL IMPLEMENTATION.**

No Foundation redesign is required. The missing pieces are shell/composition/runtime contracts, not new knowledge primitives.

The design should be treated as a continuously extensible Research OS surface, not as a final fixed arrangement of panels.

## 2. Challenge 1 — Shell rigidity / future devices
### Attack
A fixed Navbar + Bottom Bar + left Raziel + right Inspector would age badly across desktop, tablet, foldable, PWA, browser companion and spatial displays.

### Result
The upgraded adaptive-shell direction is correct, but the blueprint must explicitly separate **capabilities** from **placement**.

### Required extension contract
A capability may be rendered as command-palette action, dock item, rail item, inline affordance, floating companion action or gesture depending on device/context. No capability may depend on one permanent screen location.

Classification: MUST IN BLUEPRINT NOW; implementation later.

## 3. Challenge 2 — Workspace state explosion
### Attack
World can accumulate focus entity, expanded neighborhoods, filters, selected path, open Book, active Heichal tool, ELS locator, Inspector tab, Journey position, Raziel selection, comparison set and review state. Persisting all of this blindly in one URL or Research Context would become brittle and unreadable.

### Result
Need three state tiers:
1. **Durable semantic context** — subject, lens, selection, Journey/path identity, exact research locator when meaningful.
2. **Shareable/reopenable workspace state** — meaningful filters, view mode, selected path/window.
3. **Ephemeral interaction state** — hover, panel width, transient animation, drag position, temporary open/closed decoration.

Only tiers 1–2 participate in exact reopen; tier 3 does not become truth/history.

Classification: MUST IN BLUEPRINT NOW.

## 4. Challenge 3 — World hairball / 100M scale
### Attack
A visually impressive graph becomes unusable at thousands of entities and technically impossible at 100M if the client treats World as a graph dump.

### Result
World must be a **semantic viewport**, never the graph itself.

Required behavior:
- server-side bounded neighborhood queries
- rank-before-render
- semantic LOD / aggregation
- cluster expansion on demand
- pagination/virtualization for list and inspector projections
- no assumption that all neighbors are materialized together
- path queries bounded by depth/cost
- renderer interchangeable: graph/list/timeline/source map/spatial without changing identity.

Classification: MUST IN BLUEPRINT NOW; indexes/query optimization remain evidence-driven.

## 5. Challenge 4 — Tool results contaminating truth
### Attack
Heichal is powerful enough that repeated tool actions could silently turn traces/results into graph truth or create duplicate Findings.

### Result
The World→Heichal→Tools hierarchy survives, but every tool output needs a typed return envelope:
- tool/engine owner
- input snapshot/reference
- method/version/rule version when applicable
- output/locator
- verification state
- provenance
- research stage (trace/calculation/finding/candidate/evidence/unresolved)
- duplicate/owner resolution before durable save.

Tool execution never equals canonicalization.

Classification: MUST IN BLUEPRINT NOW; extends existing Universal Finding/Truth/engine owners.

## 6. Challenge 5 — Raziel becoming the hidden operating system
### Attack
A global AI companion can accidentally become a second router, search index, memory-of-truth, permission layer or hidden action engine.

### Result
Raziel remains a controller, but the UI must make his authority legible.

Required contract:
- Raziel reads the same explicit Research Context and authorized capabilities as the user surface.
- Every action proposal resolves the existing capability owner.
- Write/promote/publish actions surface a visible Human-Gate step.
- AI can alter workspace state (focus/filter/tool/open) without altering canonical truth.
- external/browser/desktop companion receives bounded context handoff, never unrestricted page/account memory.
- privacy-sensitive page context is not exported to an external companion by default.

Classification: MUST IN BLUEPRINT NOW.

## 7. Challenge 6 — Premium depth becoming a second truth hierarchy
### Attack
“Deep Premium sees less filtered material” could drift into Premium = truer, or expose private/admin raw candidates.

### Result
Access must be modeled as **authorized projection depth**, orthogonal to truth.

Recommended layers:
- Public: curated public-safe
- Premium: deeper approved/canonical research, journeys, comparison/provenance depth
- Deep Premium: explicitly allowed lower-confidence/extended evidence and advanced tools, but not private/admin raw by default
- Admin: private candidates, unresolved, contradictions, raw intake, review/workbench

Server-side readers enforce the boundary before payload delivery. No client-hidden full graph.

Classification: MUST IN BLUEPRINT NOW.

## 8. Challenge 7 — Books / long-form reading vs global shell
### Attack
A permanent command-heavy shell destroys deep reading. A separate Book app breaks Research Context and creates a parallel product.

### Result
Book stays first-class World identity, but the shell supports **Reading Mode**:
- minimal chrome
- Raziel presence recoverable but non-intrusive
- context spine remains active invisibly
- annotations/source loci/Heichal can be summoned on demand
- exact return to prior World/Number/Journey state
- edition/witness/source identity remains separate from Book identity.

Classification: MUST IN BLUEPRINT NOW.

## 9. Challenge 8 — Mobile / accessibility / non-pointer operation
### Attack
Graph + drag/drop + side panels fail on touch, keyboard, screen reader and reduced-motion environments.

### Result
Every core operation needs a non-graph equivalent.

Required:
- command palette / searchable actions
- keyboard navigation between focus/relations
- structured list/path alternative to graph
- connect action as button/form equivalent to drag-drop
- focus management for drawers/sheets
- screen-reader relation summaries
- reduced motion and no critical information encoded only by animation/color
- mobile task mode: one focus + one action sheet, not compressed desktop.

Classification: MUST IN BLUEPRINT NOW.

## 10. Offline/PWA challenge
### Attack
Offline writes can create stale truth conflicts; no-offline support makes installed research sessions fragile.

### Result
Safe 2027 posture:
- offline/read cache may preserve recently opened public/authorized projections and user workspace state where allowed
- drafts/notes may queue locally if they are explicitly noncanonical
- canonical/promote/publish writes require live authorization/revalidation before commit
- cached data displays freshness/provenance and cannot masquerade as current live state.

Classification: EXTENSION POINT NOW; not required for first World slice.

## 11. Multi-user / collaboration challenge
### Attack
Future collaborative research could force redesign if selection/presence/comments are mixed with canonical graph identity or if multiple researchers get parallel truth systems.

### Result
Current single-Human-Gate architecture can safely extend if collaboration is treated as workspace/contribution provenance, not alternate canonical truth.

Future-ready seams:
- actor identity on proposals/actions
- shared path/revision ownership/permissions
- comments/discussion separate from truth state
- presence/selection ephemeral
- forks/revisions use existing Path/Revision model patterns
- canonical transition remains governed.

Potential future multi-tenant canonical authorities remain a separate strategic domain and are NOT required now.

Classification: EXTENSION POINT NOW.

## 12. 3D / spatial challenge
### Attack
A spectacular 3D World could reintroduce a second coordinate/graph truth and become impossible to use for ordinary research.

### Result
3D is renderer only.
- no canonical x/y/z truth required
- same entity/relation/path identities
- same context spine
- exact switch 2D/list ↔ spatial
- spatial layout may be recomputed/changed without semantic migration.

Classification: CLOSED by existing direction; keep explicit.

## 13. External companion challenge
### Attack
Raziel outside sod1820.co.il (browser extension/desktop surface) could leak context, duplicate memory, or create inconsistent navigation/action behavior.

### Result
Future external surface must use a **context handoff/session contract**:
- explicit authenticated account
- least-privilege current-context payload
- user-visible indication of what context is shared
- no automatic transfer of private/raw Admin material
- same capability/action owner semantics
- deep link/return into exact SOD1820 state.

Classification: EXTENSION POINT NOW.

## 14. Failure/recovery challenge
### Attack
Complex research sessions will fail mid-tool, mid-Raziel continuation, during graph expansion or during candidate save.

### Result
The shell must distinguish:
- workspace operation status
- tool execution status
- durable-save status
- canonical-transition status

Never show “done” merely because UI animation completed. Retry/continuation must be idempotent where durable writes occur. Failed tool runs remain traceable when useful but cannot create half-canonical relations.

Classification: MUST IN BLUEPRINT NOW; implementation inherits existing AI completion/write governance.

## 15. Commands/actions challenge — avoid duplicated controls
### Attack
The same action (“add to research”, “open Heichal”, “ask Raziel”, “connect”, “compare”) can appear in Navbar, dock, inspector, context menu, keyboard palette and mobile sheet, producing duplicate semantics.

### Result
Define one **capability/action vocabulary** and allow many render placements. The vocabulary is not a new truth registry; it resolves existing owners/capabilities.

Each action declares conceptually:
- action id/intent
- required context shape
- authorization/role requirement
- execution owner
- whether it changes workspace, user research, candidate state, or canonical state
- preferred surfaces by device/context.

Classification: MUST IN BLUEPRINT NOW.

## 16. Personalization challenge
### Attack
A fully adaptive UI that “learns” the user can become unpredictable, hide important controls or create impossible support/debug states.

### Result
Personalization may reorder/suggest, but the user must always have:
- stable command/search entry
- reset/default workspace
- visible current context
- ability to pin preferred tools/actions
- no AI-driven disappearance of truth or required Human-Gate controls.

Classification: EXTENSION POINT NOW.

## 17. Instrumentation challenge
### Attack
A 2027 adaptive shell without telemetry makes it impossible to know whether users get lost, whether Raziel helps, or which transitions fail.

### Result
Instrument semantic actions rather than specific legacy buttons:
- focus_entity
- expand_relation_family
- open_heichal
- run_tool
- save_finding
- reopen_exact_state
- ask_raziel
- apply_filter
- begin/continue_journey
- human_gate_decision

Page/UI placement may change without destroying longitudinal product telemetry.

Classification: MUST IN BLUEPRINT NOW as projection telemetry contract; preserve privacy/Clean semantics.

## 18. W0 changes required by this challenge
Before visual implementation, W0 must produce:
1. Capability inventory independent of current component names.
2. Action vocabulary crosswalk.
3. State-tier map: durable/shareable/ephemeral.
4. Surface-placement matrix: desktop/tablet/mobile/reading/admin/spatial/future companion.
5. Access/depth matrix: Public/Premium/Deep/Admin.
6. Renderer parity requirements: graph/list/path/timeline/source/spatial.
7. Failure/completion/retry semantics for tool and candidate actions.
8. Accessibility parity checklist.
9. Telemetry semantic-action map.
10. Legacy route/SEO migration obligations, independent of UI preservation.

## 19. Revised implementation gate
Do NOT begin a large shell build until W0 closes the ten items above.

After W0, the correct first product proof remains one vertical Golden Slice, but it should prove all foundational interaction seams:
**1237 → World focus → bounded expansion → Book/Source or Heichal → tool/ELS → typed result → Journey/save → Raziel explanation → exact reopen → Admin candidate review.**

If this passes desktop + mobile task mode + keyboard/list alternative, the architecture is sufficiently future-proof to expand.

## 20. What is deliberately NOT being built now
- no new shell store
- no new command database
- no new graph
- no second Search system
- no new Raziel memory system
- no new Premium truth lifecycle
- no canonical spatial coordinates
- no collaborative canonical authority system
- no full offline canonical-write system

These remain existing-owner extensions or future domains only if live evidence later proves them necessary.

## 21. Final challenge verdict
**2027 TARGET = PASS WITH EXPLICIT EXTENSION CONTRACTS.**

The architecture is strong enough to proceed without Foundation redesign. The main risk was not missing backend primitives; it was freezing a 2026 screen composition too early. The adaptive-shell upgrade correctly removes that risk.

The highest-quality path is now:
**Foundation closed → W0 capability/action/state/access/surface contract → one Golden vertical slice → adversarial verification → expand by projection.**

The system should never claim to be “finished forever.” Its quality comes from stable identity/truth/provenance underneath and replaceable/adaptive surfaces above.