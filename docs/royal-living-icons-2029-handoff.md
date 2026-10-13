# SOD1820 — Royal Living Icons & Motion · 2029
Date: 2026-10-14
Status: APPROVED DESIGN DIRECTION · DOCS ONLY · NO FRAME/ICON CODE CHANGES · NO MERGE/PRODUCTION
Authorities: SOD1820_DESIGN_CONTRACT_V2.md, docs/sod1820-system-frame-contract-v2-addendum.md, NavigationIcon2029.jsx. This is an implementation handoff, NOT an alternative contract.

## Visual direction
Royal Living Interface: royal thin-line gold for global navigation, research blue exclusively for research/Number at Night, restrained violet for Raziel, teal for personal journeys, warm amber for communication. Use existing palette semantic tokens, not per-icon hardcoded colors. All Day/Parchment/Night states remain valid; Night outside Number keeps black-brown and muted gold. Do not render every icon in different colors at rest: semantic accents emerge on meaningful interactions.

Optional families within the ONE canonical icon catalog: Royal Gold (base); Quantum Research (number/ELS/research); Mystic Light (Raziel/discovery only); Living Identity (workspace/community); Royal 3D (large gates only; never navigation glyphs). Common stroke, grid, corner treatment, optical weight across families.

## Canonical mapping
Account=user outline; profile=settings; public page=crown outline; research=research/circuit; progress=ascending trace; journey=existing journey path; hints=puzzle; contributions=connected hands/nodes; messages=conversation/mail with accurate unread semantics; credits=coin/ledger (NOT Diamond grade); my ELS=ELS; Raziel=existing raziel glyph (NOT ✦ to ELS).
Chat: explicitly conversation (current ◉ falls back to tools). Number page: 123; Calculator: distinct operators/calculation shape. ELS: preserve 3x3 matrix with one subtle connecting skip stroke, no microscopic letters. Follow bell: exactly one owner; reconcile open PRs. Presets: sun / parchment-page / moon, preserve IDs light/parchment/dark. Prefer explicit semantic name prop over fragile unicode glyph mapping.

## Interaction and motion
Rest: crisp muted line. Hover (fine pointer only): subtle color and lift within 150ms. Touch/press: one 180–250ms flash/transform; no sticky touch hover. Selected: semantic accent and understated halo PLUS noncolor marker and aria-current/pressed. Keyboard: visible focus ring and activation parity. Meaningful new event: at most one pulse; no perpetual blinking. Respect prefers-reduced-motion; instantly communicate state, no scale/travel/pulse. Prefer transform/opacity over costly paint, no new icon animation runtime dependency. 44x44px minimum hit targets, RTL/LTR support, proper ARIA for buttons/links. No false active state for locked/readonly elements.

## Sequencing and safeguards
1. Unified 2029 preview PR #1092 and frame/performance PRs finish independently; preview READY does not equal browser/release approval.
2. Shared shell/icon owner verifies exact accepted integration SHA after conflict ownership resolution. Existing colliding PRs include #1074 #1083 #1086 #1092 in NavigationIcon2029.jsx; SystemFrame2029.jsx also touched by #1044 #1083 #1086 #1087 #1088 #1092 #1093. Recheck live ownership.
3. Single owner adds missing SVG to canonical catalog and maps chat, calculator, ELS, Raziel, workspace and preset icons. Do not create second nav engine/style contract. Preserve legacy untouched.
4. Test in real browser widths 320/390/980/1100/1440, 3 presets, mouse/touch/keyboard, focus, reduced motion, RTL/LTR, accurate accessibility and no performance regression. Verify direct routes, back, refresh and one shared workspace.
5. Preview only, then release via existing gates; no merge/deploy without gating.
