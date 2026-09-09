# W0.5 Closure Evidence — 2026-09-09

This evidence note records the bounded closure reconciliation for W0.5 Visual Foundation 2027 after production release.

## Typography compatibility

`src/theme.js` already exposes semantic `F.ui`, `F.body`, `F.display`, `F.numeric` roles. The legacy `T` object remains backward-compatibility only. Its `T.body.fontSize=15.5` is intentionally not mass-mutated; new/redesigned W1+ surfaces consume `src/lib/designTokens.js` `TYPE_SCALE.body=16`. This preserves legacy behavior while making the 16px W0.5 readability floor canonical for new work.

Verdict: RECONCILED WITHOUT LEGACY BREAK.

## Palette contrast snapshot

Representative WCAG contrast ratios calculated against the canonical background roles:

- light `ink` on `pageBg`: 13.21:1
- light `inkSoft` on `pageBg`: 5.27:1
- light `accentText` on `pageBg`: 5.42:1
- dark `inkSoft` on canonical dark base `#0C0818`: 12.20:1
- dark `accentText` on canonical dark base: 15.12:1
- lab `ink` on `pageBg`: 15.73:1
- lab `inkSoft` on `pageBg`: 5.58:1
- lab `accentText` on `pageBg`: 6.98:1

All representative text pairs exceed the 4.5:1 normal-text threshold. Status semantics remain owned by canonical status/color owners rather than duplicated into W0.5.

## Shared focus + bidi baseline

`src/components/VisualFoundationBase.css` adds a single additive baseline for `:focus-visible` and mixed-direction evidence islands. Local components may enrich the ring but may not remove visible focus. Hebrew context remains RTL while explicit code/URL islands can isolate LTR direction.

## Automated adversarial challenge

`Release Visual Gate` now covers:

- 320 / 360 / 390 / 1440 widths;
- dark / light / lab projections;
- keyboard focus + visible focus ring;
- prefers-reduced-motion;
- 200% text-size simulation;
- long Hebrew interactive labels;
- mixed Hebrew / number / URL bidi evidence;
- Gallery `FIT_WHOLE_IMAGE` across landscape / portrait / legacy gematria ratios.

The gate is evaluated against the current PR merge ref, not a stale branch snapshot.

No new Design System, palette owner, accessibility registry, bidi engine or release system is created. OWNER CHECK remains EXTEND_EXISTING.
