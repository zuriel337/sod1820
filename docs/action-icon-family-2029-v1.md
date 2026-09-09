# SOD1820 — Action Icon Family 2029 V1

Status: HUMAN-GATE DIRECTION LOCKED · BRANCH ONLY · NOT MERGED · NOT DEPLOYED

Owner: `SOD1820_DESIGN_CONTRACT_V1.md`

OWNER CHECK: `EXTEND_EXISTING`.

This document defines one visual action-icon family for the Horizon + Cosmic 2029 projection. It reuses the existing visual/design, canonical UI controls, WorkIcon and Signature families. It does not create a new icon registry, palette, control system or navigation owner.

## 1. Family principle

Every first-class action icon belongs to one family. Differences express semantic role and state, not a different illustration style per feature.

Shared geometry:
- 24x24 base grid;
- 1.8–2px primary stroke at functional size;
- rounded line caps/joins;
- restrained 2.5D depth only in hero/signature projections;
- one dominant glyph + optional bounded Horizon ring/orbit state;
- no cartoon look, no unrelated skeuomorphic set, no emoji as canonical UI icon;
- 44x44 minimum touch target for first-class interactive controls.

Functional icons are quiet. Signature/hero versions may gain depth, glow and atmosphere while preserving the same glyph identity.

## 2. Color hierarchy

Color ownership remains semantic:
- Gold / Champagne = Master Brand, Premium, ceremonial value;
- Sapphire / Research Blue = primary digital action and research;
- Purple / Indigo = Raziel, intelligence, insight and bounded aura;
- Glass / neutral = secondary actions;
- World colors = classification only, never generic button colors.

Purple is not a new global action color. It enters through Raziel/intelligence states and subtle aura transitions only.

Raziel target role:
- Royal Purple core: `#5B3FD6`;
- Purple light: `#7A4CE0`;
- Purple halo: `rgba(122,76,224,0.28)`;
- optional blue-light edge: `#6CB6FF`;
- fixed gold point/core detail: `#D4AF37`.

## 3. Canonical glyphs

### Share — Constellation Share
Canonical glyph: three connected nodes / constellation, not a generic oversized export arrow.
Meaning: one finding branches outward to other people/channels.
Default: glass/neutral.
Hover/focus: Sapphire edge with very subtle Blue→Indigo aura.
Open panel/selected: Sapphire emphasis; platform colors may appear only as small recognizable channel details, never as the main product button background.

### Save — Illuminated Bookmark
Canonical glyph: clean bookmark silhouette with a small central light/diamond notch detail.
Default: outline glass.
Saved: stronger/filled core + Gold Horizon ring.
Saved must remain recognizable by fill/shape/text, not color alone.

### Follow / Watch — Orbit
Canonical glyph: orbit ring with one moving/anchored point.
Default: quiet orbit outline.
Following: active orbit ring; Blue→Indigo/Purple aura is allowed here because Follow expresses an ongoing path.
Gold remains a small anchor point, not full fill.

### Add to Research — Research Node +
Canonical glyph: bounded research node/hex-diamond form with a plus or connecting-node cue.
Default: shared glass family.
Primary/added state: Research Blue `#2F6DF6` emphasis.
Purple is not used as the main research color.

### Premium / Open Gate — Crown Gate
Canonical glyph: simplified crown/gate/star-doorway cue derived from the Master Crown lineage without copying the full logo into the button.
Default premium action: Champagne/Royal Gold.
Locked premium: readable Gold outline + lock cue; never dimmed into a broken-looking control.

### Raziel — Existing Raziel Signature Glyph
Do not invent a second Raziel symbol. Reuse the existing Raziel Signature identity from Signature Family.
Functional action: Indigo/Royal Purple with one restrained Gold point.
Hover/active: soft Purple halo with optional Blue-light edge.
No full Gold fill; Raziel must remain companion/intelligence, not a second Master Brand.

### Fullscreen — Four Gate Corners
Canonical glyph: four inward/outward corner-gates.
Default: glass/neutral.
Active: Sapphire edge only.

### Copy — Twin Frames
Canonical glyph: two offset rounded frames.
Default: glass/neutral.
Success: short Gold/Sapphire confirmation state; no persistent new color identity.

## 4. Shared control shell

All glyphs render inside the same control shell family:
- Icon-only: 44–48px control, bounded radius, glass surface;
- Icon + label: same shell, horizontal label; no unique container per feature;
- Dense toolbar: 40px visual footprint may exist only when an equivalent 44px hit target is preserved;
- Hero action: may use richer material, but the glyph identity is unchanged.

Default shell:
- dark = cosmic glass/navy;
- light = celestial white/cream glass;
- border = restrained semantic edge;
- hover = small lift/illumination;
- focus-visible = Horizon ring;
- pressed = slightly deeper surface, no bounce/cartoon animation.

## 5. State behavior

All family members support:
- default;
- hover;
- pressed;
- focus-visible;
- active/selected;
- loading;
- disabled;
- building;
- identity-required;
- premium-required;
- credits-required when governed;
- success/completed where truthful.

State must not be communicated by color alone.

## 6. Motion

Motion tier is restrained and semantic:
- Share: connected nodes illuminate outward once;
- Save: bookmark core/diamond lights once;
- Follow: orbit point travels a short bounded arc;
- Research: plus/node connection resolves once;
- Premium: short Gold Horizon trace;
- Raziel: slow Blue→Indigo→Royal Purple aura breath, with fixed Gold point;
- Fullscreen: corners expand a few pixels;
- Copy: twin frames briefly align/check.

No constant spinning. No required autoplay. `prefers-reduced-motion` receives static states.

## 7. Dark + Light projection

Dark and light remain the same family:

Dark:
- glass = Night Navy / cosmic translucent surface;
- glyph = warm light / Sapphire / Gold / Raziel Purple according to role;
- aura visible but restrained.

Light:
- glass = Warm Pearl / Ivory / pale celestial surface;
- glyph = Deep Ink / Sapphire / muted Gold / restrained Raziel Purple;
- aura is softer and lower-opacity than dark.

No separate light-mode icon design.

## 8. Do not do

- no rainbow action bar;
- no permanent WhatsApp-green/Facebook-blue/Telegram-blue main controls;
- no Purple Premium button;
- no Purple Add-to-Research primary state;
- no Gold everywhere;
- no different line style per feature;
- no random 3D icons in dense research toolbars;
- no second Raziel glyph;
- no icon that visually claims truth, rank or importance.

## 9. Locked relationship

Canonical family:

`Share = Constellation`
`Save = Illuminated Bookmark`
`Follow = Orbit`
`Add-to-Research = Research Node +`
`Premium = Crown Gate`
`Raziel = existing Raziel Signature + Purple aura + Gold point`
`Fullscreen = Four Gate Corners`
`Copy = Twin Frames`

All consume one Horizon/Cosmic shell and the same dark/light/state system.
