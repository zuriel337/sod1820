# SOD1820 — G3 2029 GLOBAL CUTOVER FOUNDATION V1

**Status:** BRANCH-ONLY · NOT MERGED · NOT DEPLOYED  
**Human Gate:** ZURIEL · 2026-09-18  
**Owner:** EXTEND_EXISTING `experience_governance_foundation_v1_law`  
**Dependencies:** `research_workspace_law v4` · `canonical_ui_components_law v5` · existing route/SEO owners  
**Principle:** preserve capability + identity + provenance + access + continuity; replace legacy presentation freely.

## 1. Why this exists

World 2029 replaces the whole legacy site over time. Therefore preservation must not be reimplemented page by page.

A redesigned surface must inherit one global cutover contract. A Number page, World, Heichal, Books, ELS, Posts, Community or future surface may change renderer, layout, visual hierarchy and interaction model without rebuilding the underlying capability owners.

No new router, SEO registry, analytics store, share system, Research Context, auth/access system, graph or truth store is created here.

## 2. Global cutover invariant

**RENDERER MAY CHANGE. SEMANTIC IDENTITY MUST NOT DRIFT.**

When a 2029 surface replaces a legacy surface, the following remain owned by their current canonical owners unless explicitly superseded by Human Gate:

1. canonical entity identity;
2. canonical public URL / deliberate redirect semantics;
3. SEO/indexability decision;
4. canonical metadata / structured data;
5. OG/share card generation and share telemetry;
6. analytics / page-view / engagement semantic identity;
7. Research Context / Journey / exact return;
8. personal save/history/pin/follow semantics;
9. auth/access/site-flag state;
10. canonical engine/method/source readers;
11. provenance/truth/governance/publication distinctions;
12. inbound deep links, aliases and query/hash handoff where semantically valid.

Legacy component geometry, local card layout, old accordions, old chrome, old visual hierarchy and obsolete presentation helpers are not protected.

## 3. The shared cutover stack

Every redesigned public 2029 surface must route through the same shared stack:

```
canonical identity
→ route/addressability
→ access/site state
→ canonical data/engine owners
→ Research Context
→ semantic telemetry
→ SEO/indexability/structured data
→ share/OG
→ 2029 renderer
```

The renderer consumes these capabilities. It does not own or duplicate them.

## 4. Route / URL continuity

The exact route ledger in `docs/w0-2027-route-seo-addressability-matrix-v1.md` remains the migration inventory.

Rules:
- Class A identity/SEO routes preserve their address by default.
- POST-A root post URLs `/:slug` remain immutable by default.
- Product routes may change renderer without changing canonical identity.
- Legacy aliases may remain as redirects/adapters when useful.
- No generic `* → /` hiding of moved/not-found/access states in the final 2029 shell.
- Query/hash/exact-return state is preserved when semantically valid.

A public route is not retired because its old component is deleted. Retirement requires replacement parity + redirect/terminal decision + SEO/inbound gate.

## 5. SEO / indexing continuity

A 2029 renderer must consume existing SEO ownership instead of inventing a local system.

Required continuity:
- `applySeo` / canonical metadata flow;
- dynamic indexability decision where the current domain has one (for example Number `is_number_indexable`);
- JSON-LD/structured-data owner;
- sitemap inclusion rules;
- canonical path;
- noindex behavior;
- bot/social representation via existing OG path.

Changing UI does not authorize broadening indexability or creating duplicate canonical URLs.

## 6. Share / OG continuity

Use existing canonical share family:
- `ShareActions`;
- `src/lib/share.js`;
- `/api/card`;
- `/api/og`.

2029 surfaces may choose where/how the control is rendered, but must not fork:
- share URL identity;
- share telemetry semantics;
- card-generation owner;
- social-bot metadata owner.

## 7. Telemetry continuity

Telemetry identifies semantic action/surface capability, not component geometry.

Cutover must preserve:
- page/view semantics;
- engagement semantics;
- acquisition/referral attribution;
- meaningful action telemetry;
- existing historical continuity where dashboards depend on it.

A redesigned Number page remains Number for telemetry. A new button placement does not mint a new business event family.

## 8. Research / personal continuity

Per `research_workspace_law v4`, moving to 2029 must not orphan:
- active subject/root;
- selected expression/method/lens;
- Journey position;
- exact return;
- saved items;
- history;
- personal research membership;
- authorized personal context.

No new 2029 workspace/context store is allowed.

## 9. Access / authorization continuity

Presentation cutover never weakens access.

A new renderer must consume:
- existing auth identity;
- canonical authorization predicates;
- site flags/capability state;
- entitlement state when live;
- privacy/publication boundaries.

Client hiding is not authorization.
Legacy page removal does not authorize a broader query.

## 10. Capability parity model

Before retiring a legacy renderer, classify each legacy capability:

- **PRESERVE THROUGH EXISTING OWNER** — still needed; 2029 consumes same capability.
- **REHOME** — capability remains but belongs on a different 2029 surface.
- **REPLACE PRESENTATION** — same semantics, new renderer.
- **RETIRE LEGACY-ONLY PRESENTATION** — no unique capability remains.
- **BLOCKED / OWNER NEEDED** — cannot cut over yet.

Do not preserve a legacy component merely because it exists.
Do not delete a capability merely because its old UI is ugly.

## 11. Surface roles

The current 2029 product roles remain:
- **Number/Expression** — exact profile/detail of the active Number/Expression.
- **World** — breadth, context and connections around the active Anchor.
- **Heichal** — deep action/research execution.
- **Books/Sources** — exact witness/source/locator.
- **ELS** — specialized cipher/search/replay.
- **Raziel** — one companion over the current context.
- **Workspace/Journey** — saved/personal/path continuity.

A legacy capability may be rehomed to the semantically correct surface instead of copied into every replacement page.

## 12. Cutover acceptance gate for every public surface

A public legacy renderer may be retired only when all applicable rows are PASS:

| Gate | Required |
|---|---|
| Identity parity | same canonical subject/entity |
| Route parity | preserved canonical URL or deliberate redirect |
| SEO parity | canonical/index/noindex/metadata/JSON-LD |
| Sitemap parity | discovery/index path preserved where applicable |
| OG/share parity | existing share owner + canonical URL |
| Telemetry parity | same semantic page/action family |
| Research continuity | context/history/save/exact-return preserved |
| Access parity | no auth/privacy/site-state regression |
| Data parity | canonical owners/readers, no local duplicate |
| Deep-link parity | query/hash/tool/selection survives where applicable |
| Mobile/accessibility | replacement usable without legacy fallback |
| Failure states | loading/empty/error/access moved honestly represented |
| Capability parity | unique legacy capability preserved/rehomed/explicitly retired |
| Isolation | 2029 does not accidentally load legacy presentation/chrome |
| Regression gates | build/visual/isolation/SEO pass on exact head |

## 13. Whole-site migration order

This foundation changes the migration strategy:

1. establish shared cutover adapters/owners;
2. make 2029 shell consume them;
3. redesign surfaces independently;
4. run per-surface parity matrix against the same global gate;
5. cut over routes one surface family at a time;
6. retire legacy presentation only after parity;
7. remove leftover legacy code in a later cleanup pass.

This is not “page-by-page architecture”. Pages may still ship independently, but their preservation rules are inherited from one foundation.

## 14. Number as first consumer, not special case

Number 2029 is the first strong consumer of this foundation.

Its cutover must preserve existing `/number/:phrase`, SEO/indexability, JSON-LD, sitemap, OG/share, telemetry, Research history/context and `lead_rank` curation.

Those rules are not Number-specific. Number merely proves the global mechanism before the rest of the site consumes it.

## 15. Non-goals

This pass does not:
- cut over any public route;
- merge/deploy Number;
- retire Legacy;
- change canonical URLs;
- create a new SEO/router/analytics/share/context system;
- perform repository-wide visual migration;
- merge or deploy anything without explicit ZURIEL authorization.

## 16. Release rule

Foundation may be merged before individual redesigned surfaces only after Human Gate approval.

A surface cutover requires its own exact-head acceptance evidence, but it must consume this shared contract rather than redefining preservation locally.
