# SOD1820 — W0 2027 WHOLE-PROGRAM DEEP SCAN — SUPPLEMENT V1

**Status:** READ-ONLY PRODUCT/ARCHITECTURE CHALLENGE · DOCS ONLY · W0 NOT CLOSED · NO PRODUCT WRITE · NO RELEASE  
**Human Gate:** ZURIEL  
**Primary dependency:** `docs/w0-2027-plan-integrity-review-v1.md`  
**Existing Claude challenge:** work_log `7674e7b0-53d7-4a82-8b0d-43453630efc7`

## 0. Why this supplement exists

This pass does **not** repeat the existing Plan Integrity Review. It expands the challenge from World/Shell/Research continuity to the **whole SOD1820 product**: personal workspace, publishing, community, follow/share, multilingual, account/access/credits, onboarding, public SEO surfaces, admin/system operations, AI execution safety and identity-addressability.

Live sources checked for this supplement include current `origin/main` (`cf4d8df54cde53a22f5d217d2f79c11f0f734e13`), `src/App.jsx`, current owner index, System Frame, Research Studio, active Reality Graph / Truth / Intake / Experience / Personal Command Center / Raziel / Graph Privacy / Subscription / Credits / Translation rules, and the proposed v5.4/Product Map/W0 branch documents.

**OWNER CHECK: EXTEND_EXISTING.** No new graph, research store, personal store, notification system, publishing system or AI memory owner is justified by this scan.

---

## 1. Overall verdict

The 2027 direction is strong and materially better than the legacy page-first architecture:

**One World · Many Views · one Research Context · one Raziel · adaptive shell · capability-first UI.**

It aligns unusually well with the active Reality Graph law, which already says the system is one graph and that entity-focused pages are projections/hubs rather than separate products.

However, W0 is not ready to close yet. The remaining work is not “invent more future features.” It is finite reconciliation and coverage:

1. reconcile old presentation locks under their actual owners;
2. map the whole non-research product into the 2027 topology;
3. separate content publication from research promotion;
4. preserve personal-workspace intent, not only its data;
5. add missing cross-cutting product capabilities to the map;
6. define safe AI/action/cost execution semantics;
7. preserve public addresses and direct-tool entry;
8. distinguish Research Admin from System Operations;
9. define identity-addressable renderer gaps without inventing placeholder entities;
10. close W0 as a **specification gate**, then prove it in W1/W2 rather than requiring unbuilt runtime proof first.

---

## 2. Additional decision-changing findings

### WPS-01 — Canonical presentation drift spans FOUR current owners, not one

Already confirmed by the prior review: System Frame and Research Studio conflict with the new UI-neutral direction.

This deeper pass confirms the same conflict is also embodied in active:
- `research_workspace_law` — fixed Header/Navigation/Footer + fixed research side workspace presentation;
- `workspace_layout_standard` — locked three-column layout and explicit prohibition on fullscreen tools.

The newer ZURIEL decision says current Navbar, Bottom Bar, Number UI, Book UI, Heichal UI, User Center and layouts are all drafts and may be replaced A→Z while preserving capability/truth/context.

**Required reconciliation:** presentation-only clauses across **System Frame + Research Studio + research_workspace_law + workspace_layout_standard** must be superseded/extended consistently. Preserve their useful invariants: one workspace, one Context, one-tree saves, capability continuity, responsive parity, no competing bars. Do not preserve fixed columns/dock/header shape merely because earlier documents called them locked.

This is owner drift, not a Foundation failure.

---

### WPS-02 — My Workspace must preserve the Personal Command Center's PRODUCT INTENT

The active `personal_command_center_law` is stronger than a generic “account/saved items” drawer. Its central principle is:

**the user enters to know what to do next.**

It owns the experience idea of:
- continue active research;
- what changed since last visit;
- relevant followed researchers/content;
- new hints connected to the user's research;
- messages needing attention;
- AI-recommended next research action;
- credits/progress in context.

The Product Map correctly makes My Workspace a one-tree projection, but W0 must preserve this **next-action / return-to-life** character. Otherwise a technically clean redesign could regress into a file cabinet of Saved / Profile / Settings.

**Target:** My Workspace = personal research home + attention + next best action, composed from existing owners. It does not become a second World or a second Raziel memory system.

---

### WPS-03 — Create/Intake needs TWO orthogonal paths: Publication and Research Promotion

The current Product Map diagram is too universal if read literally as:

`Create → Intake → Candidate → Review → World`.

Current active laws prove that not all creation is Research Intake:
- Posts have their own content publication owner and may be published as content/representation.
- Forum/community conversation may be public without becoming research truth.
- A DM/account action is not research intake.
- Research Intake governs eligible research/source material and promotion semantics.
- Truth Axes explicitly separates governance from publication/access.

Therefore W0 must encode:

**Content path:** create/edit → content publication/moderation owner → public/private representation.

**Research path:** eligible source/claim/finding → Research Intake → candidate/evidence → Human Gate → canonical transition when approved.

A published Post may contain uncanonical claims. A canonical Finding may exist without being published publicly. Publication ≠ canonicalization.

Do not physically consolidate these pipelines in the name of “One Tree.”

---

### WPS-04 — The 2027 map is missing important CROSS-CUTTING capabilities

These capabilities exist live or under active owners and need an explicit home before v5.4 is called a whole-product map. They do **not** require new systems.

#### A. Follow / Subscribe / Notification channels
Existing `subscription_funnel_law` already requires one Follow engine across content and channels. Add semantic actions such as:
- `follow`
- `unfollow`
- `manage_notification_channels`

Follow is an action available from World/focused content; channel management belongs in My Workspace. Personal notification state remains distinct from Global Now.

#### B. Share
`share_placement_law` already owns one automatic share family. Add `share` as a global semantic capability. Its future placement may change with the adaptive shell; the share owner/capability must not disappear.

#### C. Multilingual / localization
`content_translation_law v2` says language is a projection and must never fork capability state. The Product Map should explicitly list **Language/Localization as a cross-cutting projection** over World, content, tools and shell copy. Do not build English Heichal/World as a separate product.

#### D. Onboarding / Activation
Current routes include `/enter`, `/start`, `/join`, `/welcome`, auth and install prompts. 2027 needs a small **Onboarding / Activation flow** that introduces the same World and adapts by user state. It is not a separate mini-site.

#### E. Legal / Trust utilities
Privacy, unsubscribe, authentication/security/account recovery are system utility surfaces. They do not need to become graph views. The adaptive shell must support clean utility/transactional modes.

#### F. Install / PWA / Push
These are delivery/surface capabilities, not World semantics. W9 may implement richer continuity, but W0 should record their existing capability/deep-link obligations so redesign does not accidentally remove install/push entry points.

---

### WPS-05 — Premium, Credits and AI/Tool Cost need one ACTION-COST contract

The project already has one-credit-system governance and separate Raziel cost/routing work. The Product Map places credits/entitlements under Account/Access, which is correct but incomplete for tool execution.

For any paid/expensive action (ELS deep output, AI research, future premium engines), W0 should specify:
- whether the action is free / credit-consuming / entitlement-only;
- cost estimate when knowable;
- explicit confirmation where required;
- start / cancel / partial / fail / retry semantics;
- retry idempotency (no duplicate charge/write);
- actual cost/trace provenance where governed;
- insufficient-credit fallback;
- Raziel may not silently consume paid capability merely because it can call a tool.

This extends existing cost/credit/routing owners. Do not create a parallel billing engine.

---

### WPS-06 — AI-native needs an EXECUTION boundary, not only a Truth boundary

Current plan correctly says Raziel cannot canonicalize/publish. It also needs a clearer distinction between:

1. **suggest/navigation** — may be immediate and reversible;
2. **read/tool execution** — permission/cost/input prerequisites checked;
3. **user-state write** — save/pin/draft/candidate requires explicit semantic action and truthful saved state;
4. **governed/admin mutation** — authorization + Human Gate rules apply;
5. **canonical/publication transition** — never autonomous AI.

A Raziel-generated proposal is not automatically a stored Candidate. A command like “show only ELS” may apply immediately; “connect A to B” should open/propose the safe relation flow rather than silently write an edge.

Manual use must remain possible when AI is unavailable.

---

### WPS-07 — Admin Research / “Command Room” collides in NAME with System/Metatron Command intelligence

The owner index already separates:
- Research truth/World/Human Gate;
- System/Command intelligence (Metatron / War Room / diagnostics).

The proposed 2027 product uses “Command Room” for Admin Research. That is semantically dangerous because the project already has a system Command/War Room domain.

**Recommendation:** preserve two domains inside one adaptive shell:
- **Research Admin / World Workbench** — sources, candidates, review, relations, Human Gate;
- **System Operations / Metatron War Room** — product/system diagnostics, evolution, traffic/ops.

They may share shell, account, navigation and authorization. They must not share truth semantics or be mistaken for the same queue.

Final public/internal naming remains Human-Gate product vocabulary; no new owner needed.

---

### WPS-08 — Identity addressability is ahead of actual routing for several first-class types

Live `entity_types` declares route patterns such as:
- `/verse/:ref`
- `/person/:id`
- `/name/:name`
- `/research/:id`
- `/book/:slug`
- `/number/:value`

Current `App.jsx` does not yet expose all of these exact generic identity routes (for example canonical `/verse/:ref` and `/person/:id` are not registered today).

This is **not permission to create placeholder nodes or fake routes**. Reality Graph v4 requires per-type identity qualification/Human Gate.

W0 should record an **addressability matrix**:
`identity type → qualified/live? → canonical external URL today → target focused renderer → fallback if not promoted`.

This prevents the new World shell from assuming every ontology type already has a public entity surface.

---

### WPS-09 — SEO/public content performance must constrain the global shell

The repository has many public/direct routes, including root post slugs, Numbers, Books, Codes, Topics and content pages. Current App intentionally lazy-loads many heavy surfaces.

A 2027 global shell must **not** mean “load the graph + Raziel + all research controls on every Google landing page.”

W0 should set experience budgets:
- lightweight orientation/context baseline;
- heavy World graph on demand;
- Raziel deep UI lazy;
- tool engines lazy;
- clean content/reading renderers remain fast and crawlable;
- canonical URLs/metadata preserved;
- shell hydration failure must not erase readable public content.

The program should measure actual first-slice LCP/interaction/memory/query cost rather than use “2027” as a quality claim.

---

### WPS-10 — Public content, Reader Mode and World semantics need an explicit relationship

“One World, Many Views” should not force every user to see graph controls.

Add a general principle:

**Reader/Focused Mode is a first-class renderer of World identity/content.**

Post, Book, Number and source pages may default to calm task-specific views, while World expansion remains one action away. Orientation persists; deep tools remain optional.

This keeps SEO/readability simple while maintaining one-tree semantics underneath.

---

### WPS-11 — Existing user state is large enough that migration parity is a product gate

Live canonical DB at this pass contains approximately:
- 6,486 nodes;
- 7,084 edges;
- 1,288 posts;
- 2,558 gallery images;
- 8,986 `research_items`;
- 703 `research_objects`;
- 278 user notifications.

`research_paths` foundation exists but currently has 0 path rows, so Journey's new UX is early while personal research membership is already substantial.

Implication: My Workspace and shell migration cannot be judged only by a 1237 demo. W0/W1 must include **existing personal-state parity** so saved research does not disappear when legacy drawers/bars are retired.

No destructive migration is authorized.

---

### WPS-12 — The World program should carry old roadmap obligations rather than silently replace them

The proposed W0→W9 program is primarily an Experience program. It must not make unrelated/open product obligations disappear.

At minimum, v5.4 carry-forward must place or preserve:
- Method Inspector/Trace integration;
- entity-aware Search/SEO;
- multilingual projection;
- current bot/traffic experiment follow-up;
- Premium/access/security prerequisites;
- remaining Raziel capability-routing/cost/continuation gaps;
- research-path writer/consumer work where still relevant;
- route/identity addressability gaps;
- any current content/authoring obligations verified open.

The crosswalk should be finite and evidence-based; do not reopen completed legacy corpus scans.

---

## 3. What is NOT a blocker for the first bounded product proof

The scan does **not** require completing all future capabilities before W1/W2.

Not blockers for an initial branch-only proof:
- full 3D/spatial renderer;
- multi-user collaboration;
- browser extension/desktop companion;
- full Premium commercial packaging;
- exhaustive private graph rollout while no relevant private graph projection is needed;
- every entity type getting a public route;
- rebuilding every legacy page.

The requirement is to give each capability an honest architectural home and preserve its owner/route/state obligations.

---

## 4. Recommended W0 closure package

Before W1 broad implementation, close these finite documents/decisions:

1. **Owner Reconciliation Delta** — System Frame + Research Studio + `research_workspace_law` + `workspace_layout_standard`; presentation locks only, history preserved.
2. **Exact Route / Alias / SEO Ledger** — including root post slug sensitivity and tool deep links.
3. **Identity Addressability Matrix** — first-class type vs actual live route/renderer.
4. **Personal Capability Owner Matrix** — My Workspace, with Personal Command Center next-action intent preserved.
5. **Publication vs Research Intake Matrix** — content/community/research paths explicitly separated.
6. **Cross-Cutting Capability Map** — Follow, Share, Language, Onboarding, Legal/Trust, Install/Push.
7. **Access / Privacy / Authority Matrix** — ownership, paid entitlement, publication/privacy, role and Human-Gate separated.
8. **Action Execution + Cost Contract** — manual/AI, read/write, confirmation, cancellation, retry/idempotency and credit behavior.
9. **State / Exact-Reopen Adapter Map** — current Context fields, URLs/snapshots, same-session return vs saved reopen.
10. **Semantic Telemetry + Performance Acceptance** — action vocabulary, actual bounded workloads, public-shell budgets.
11. **Old-Roadmap Carry-Forward Table** — no open obligation silently lost.
12. **Independent Claude challenge** → GPT live reconciliation → ZURIEL decisions only where conflict remains.

Then W0 can close as a specification/owner gate. W1/W2 prove the executable read-only shell/golden slice. Later write/AI/paid slices prove their own release acceptance.

---

## 5. Exact Claude continuation

Do **not** create a second independent task. Claude should consume existing handoff `7674e7b0-53d7-4a82-8b0d-43453630efc7` plus:
- `docs/w0-2027-plan-integrity-review-v1.md`
- this supplement
- proposed v5.4/Product Map/W0 branch docs
- current main owners named above.

Claude's job remains READ-ONLY: try to disprove the W0 architecture, identify any capability/owner lost by the proposed reconciliation, and return one finite owner/reconciliation verdict. No code/schema/canonical owner write/merge/deploy.

---

## 6. Final verdict

**Direction: PASS.**  
**Whole-product coverage: PASS WITH FINITE GAPS.**  
**One-tree semantics: PASS.**  
**Owner consistency: NOT YET PASS.**  
**W0: NOT CLOSED.**

The right next move is reconciliation, not another expansion of the vision.