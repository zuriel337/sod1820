# Number / Expression 2029 — V2 Night & launch-readiness reconciliation (13.10.2026)

**Status:** BRANCH_ONLY review candidate; no G4 merge, no live DB write, no production deploy, no route/SEO cutover.
**Base:** main `96bd0b30cf402917fd4ff2c40dca7e90bfbeeb6b`.
**Owners:** `SOD1820_DESIGN_CONTRACT_V2.md` / `canonical_colors_law` / `canonical_ui_components_law`, shared `ShareActions`, `WatchButton`, `ResearchProvider`, Research Context, existing analytics/SEO owners.
**Priority:** public Home/World G4 launch remains independent; Number full Golden is a later route-family gate.

## This isolated slice — implemented
1. Align only canonical **2029 Night** palette in `src/lib/palette.js` to warm black-brown neutrals and update its exact V2 reference. Preserve the blue action, cyan discovery, violet depth and Gold brand roles. No extra theme or surface owner; Day/Parchment and legacy palette unchanged. Review the precise shades visually before merge.
2. Improve **Number Quick Inspect** text and touch-target floors in its existing CSS: 14px metadata, 16px action buttons, 44px search/back/action targets, mobile CSS retained. No duplicated Number drawer or engine.
3. Add focused contract regression in `test/number-2029-night-and-inspect-contract.test.mjs`.

## Scan — open work to be routed to existing owners (not yet implemented)
| Priority | Gap / release evidence | Owner and boundary |
|---|---|---|
| P1 | Number page `/2029/number/:value` is deliberately `noindex` and marked `DESIGN PREVIEW`; confirm the future canonical public `/number/:value`, existing legacy SEO parity, crawler behavior, sitemap/index admission and 404/redirect rules *before* any Number cutover. | Existing SEO + route-family cutover owner. **Do not remove noindex now.** |
| P1 | Shared System Frame `InspectProjection` has a disabled `עקוב` control; Number/Expression follow identity already exists (`number:<root>` and aliases). Reuse `WatchButton` / `canonical_follow_topic`, preserve the separate email/push consent, with a signed-in and guest state test. | Follow identity + canonical WatchButton; SystemFrame currently overlaps G4 PR #1069 / World #1072. |
| P1 | Shared Inspector `ShareActions` is currently provided `type/title` without canonical number destination/ID; fallback is present URL, which can differ from selected Number. Supply canonical URL, entity ID, source surface and supported exact-state handoff; verify link/copy/native and arrival analytics, not raw assets as arrivals. | ShareActions + Share Object + Frame owner; must reconcile G4 writer before editing Frame. |
| P1 | Number page/method core shows many tiny labels (8–12px) in `numberCore2029.css` and `number2029.css`. Comprehensive corrections require 320/390/1440px browser review and CLS/layout checks on *current integrated G4* rather than a massive blind CSS override. | Number page/core + Design V2; those files are changed on G4 PR #1069. |
| P1 | Number `save/add_to_research` needs failure-honest state, recovery after reload and exact method/expression/return continuity; action naming should be one canonical telemetry vocabulary. | ResearchProvider + Research Context + product Analytics |
| P1 | Before opening public World, complete its authorized source reader HTTP/privacy evidence, P0 #999 independent approval, exact-head checks and rollback; Number visual work is not approval for G4 rollout. | G4 integrated release, security and Human Gate |
| P2 | Number-specific analytics: page/view, search, expression/method choice, source open, save/follow/share/arrival, errors, release SHA, bots vs browser sessions; do not conflate raw `site_visits` with people. | Existing 2029 Control Plane and Analytics rail |
| P2 | Public media: preview thumbnails vs original sharp reading, no crop of approved original, responsive mobile and source provenance. | Existing media profile/identity owner |
| P2 | Number Life richness/coverage, source-truth strength, and human-use activity are separate measures. Never render activity as verified evidence/Gold. | NumberCore + Truth/Research ranking owners |

## Required acceptance before merging this slice
- Current main + applicable G4 branch overlap check (especially V2 contract with Home #1074).
- `node --test test/number-2029-night-and-inspect-contract.test.mjs` and 2029/Legacy builds.
- Hosted Day/Parchment/Night screenshots and interactions for Number full page + Quick Inspect at 320/390/1440, keyboard/focus/reduced motion; no overflow, clipping or regressions.
- Verify changes in palette are global to 2029 Night (by design) but do not mutate production, research engines or Legacy UI.
- Obtain user visual approval for exact black-brown shade before merge.
