# SOD1820 — Horizon + Cosmic UI System 2029 V1

Status: HUMAN-GATE LOCKED DESIGN PROJECTION · BRANCH ONLY · NOT MERGED · NOT DEPLOYED

Owner: `SOD1820_DESIGN_CONTRACT_V1.md`

OWNER CHECK: `EXTEND_EXISTING`.

This document locks the Horizon + Cosmic visual projection chosen by ZURIEL across navigation, dark/light modes, action controls and premium presentation. It extends existing owners only; it does not create a new palette, control system, access system, navigation system or theme store.

Dependencies remain: `canonical_colors_law`, `src/lib/palette.js`, `src/lib/chromeTheme.js`, `src/lib/worlds.js`, `canonical_ui_components_law`, `content_translation_law`, `site_flags_lock_law`, `platform_tiers_law`, W0.5 Visual Foundation, and the Master Crown identity.

## 1. Visual DNA

The Master Crown is the source motif. Interface projections reuse its visual DNA without literally copying the crown into every control:

- royal/champagne gold = brand, premium, major orientation and ceremonial emphasis;
- sapphire/deep blue = active digital/research interaction;
- cosmic navy = depth/environment in dark mode;
- celestial cream/light sky = light-mode projection of the same identity;
- Horizon line/ring = orientation, active path, opening state, focus and progress motif;
- restrained glow = state/atmosphere only, never truth rank or verification.

Gold remains brand language, not truth rank. World/domain colors remain classification semantics and must not be reused casually for generic controls.

## 2. Dark + Light are one product

Dark mode = `Dark Observatory / Cosmic`: deep navy-black environment, sapphire depth, glass-dark surfaces, warm-light text, restrained gold accents.

Light mode = `Light Celestial`: warm cream / pale sky / white-gold surfaces, deep sapphire typography/actions, champagne-gold accents, faint celestial haze.

The modes may differ in luminance/material projection but not in information architecture, action hierarchy, access semantics or brand identity.

## 3. Brand placement

Primary header/brand lockup uses the same fixed Master Crown. The preferred brand stack is vertical when space permits:

`Master Crown`
`כי לה׳ המלוכה`
`KINGDOM RISE`
`sod1820.co.il` (optional smallest line)

Compact/mobile reductions may remove the URL and English line before reducing to crown-only. Crown-only is reserved for very constrained icon/fav/app states.

## 4. Horizon navigation

Global/deep navigation uses a bounded Horizon path motif rather than arbitrary decorative lines.

Canonical visible sequence pattern:

`עכשיו → הבא → בהמשך`

Each stop uses a point/ring state plus text. The line is orientation, not a fake progress percentage.

Recommended projection:

- current/active = filled sapphire core + gold Horizon ring;
- next = gold outline/ring with visible label;
- later = dim neutral/gold outline;
- building = ring + building label/icon;
- entitlement-required = ring + lock/entitlement cue;
- completed/past journey point when semantically relevant = stable gold-soft point, not a success claim.

Sidebar/rail may use the same path language vertically: one line, bounded nodes, active Horizon ring. It must not become a separate navigation identity.

## 5. Canonical action hierarchy

One shared action family, differentiated by semantic role rather than random colors.

### Premium / Upgrade / Open Gate
Champagne/royal gold is reserved for premium and ceremonial primary gate actions.

Dark: gold/champagne fill or controlled gradient, dark text, restrained glow.
Light: champagne-gold fill, deep brown/navy text, small gold edge.

Premium must feel intentional and valuable, never ad-like, neon-yellow or promotional clutter.

### Primary Action
Sapphire/deep-blue action. Used for primary non-premium actions such as Explore/Open/Continue/Start.

### Secondary / Glass Action
Share, Save, Follow and similar helpers default to dark/celestial glass surfaces with restrained border and semantic icon.

### Research Action
Add-to-Research uses the same shared control family but may lean toward the existing research blue role. It does not create a separate research brand.

### Ghost / Minimal
Filters, tertiary actions and low-priority navigation use minimal/ghost presentation.

### Icon Action
Compact share/save/follow/fullscreen/copy/media actions reuse the same semantic states and minimum touch target.

## 6. Action-specific projection

### Share
Default = glass control with share icon. Active panel/channel selection may use sapphire focus/selection. Social platform colors are not allowed to dominate the product surface; platform identity may remain in small recognizable glyph/detail where needed.

### Save
Default = outline/bookmark glass state. Saved = filled/stronger icon + restrained gold Horizon ring or enlightened surface. Saved state must be recognizable without color alone.

### Follow / Watch
Default = glass/orbit-style icon. Following = active Horizon/orbit ring plus text/state cue. Follow remains semantically distinct from Save.

### Add to Research
Default = shared glass/blue action. Added/active = sapphire/research emphasis with a clear text/icon state. It remains distinct from Save and Follow.

## 7. Control states

All reusable actions support at least:

- default;
- hover;
- pressed;
- keyboard focus-visible;
- active/selected;
- loading;
- disabled;
- building/coming-soon;
- identity-required;
- premium-required;
- credits-required where governed later;
- success/completed only where a real action completed.

Locked/building controls must look intentional, not broken. Avoid reducing opacity until the control becomes unreadable. Use label/icon/shape in addition to color.

Focus-visible uses a Horizon-style ring consistent across dark/light and must meet accessibility requirements.

## 8. Palette relationship

No new canonical palette is created here. Existing semantic palette owners remain authoritative.

Target brand relationship:

- existing royal gold family (`#D4AF37`, `#F6E27A`, related gold roles) remains canonical brand continuity;
- champagne/light-gold treatment may be used as a material projection of existing gold roles, not a new semantic meaning;
- existing research blue (`#2F6DF6`) stays functional/research interaction reference;
- crown/brand sapphire may use deeper visual material treatment around existing blue semantics but may not silently replace research/status/world color meanings;
- dark environment remains cosmic/navy;
- light environment remains cream/celestial, not sterile white and not a separate product.

## 9. Cards and surfaces

Dark cards: deep glass/navy surfaces, low-contrast gold/blue edge, environmental imagery allowed at experience moments.

Light cards: warm white/cream surfaces, subtle gold edge/shadow, sapphire actions, optional pale celestial atmosphere.

Dense reading/research surfaces reduce atmospheric effects substantially. Entry/hero moments may carry richer cosmic/celestial environments.

## 10. Motion

Allowed: subtle Horizon trace, orbit/ring illumination, small gem/light activation, restrained hover elevation/glow, short transition between navigation states.

Avoid: constant spinning, excessive parallax, glow everywhere, motion implying truth/importance, or required autoplay. `prefers-reduced-motion` receives static equivalents.

## 11. 2029 quality target

The product should feel like one royal-cosmic knowledge system, not a collection of themed pages. Consistency comes from semantic roles, repeated Horizon geometry, one Master Crown lineage, restrained material language, and one control family.

The visual richness hierarchy is:

`Entry / Brand Moment` → richest atmosphere
`Discovery / Navigation` → bounded atmosphere
`Research / Reading` → quietest surface

## 12. Human-Gate lock

ZURIEL locked this direction on 2026-09-09:

- Master Crown harmony governs the visual language;
- Horizon + Cosmic is the dark-mode direction;
- Light Celestial is the matching light-mode projection;
- Premium = gold/champagne role;
- Primary non-premium action = sapphire/deep blue;
- Share / Save / Follow = shared glass family with distinct semantic active states;
- Add-to-Research = shared family with research-blue emphasis;
- now/next/later and navigation nodes use the Horizon path/ring language;
- do not create per-feature palettes or visually unrelated buttons.

Changes to these identity-level relationships require a new explicit Human Gate. Implementation details may be refined through the existing Design/UI owners and release gates.
