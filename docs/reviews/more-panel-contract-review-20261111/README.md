# "עוד" panel — contract compliance review (11.11.2026)

Branch `more-panel-2029-redesign`, isolated; no PR, merge or deployment. Base `origin/main` at `43c00b728` when read.
Read first, as ZURIEL asked: `SOD1820_DESIGN_CONTRACT_V2.md` (origin/main), `docs/sod1820-system-frame-contract-v1.md` +
`docs/sod1820-system-frame-contract-v2-addendum.md`, and `canonical_ui_components_law` **v12** (Supabase `rules_active`, live).
No contract was changed.

## 1. What already exists (the approved language the panel must use)

| Need | Existing owner on main | Where |
|---|---|---|
| A card inside a System Frame panel, with live / building / locked states | `sod29-workspace-mini-card` (small) and `sod29-workspace-home-card` (wide): `--s29-panel-soft` surface, 1px `--s29-line` border, 16px radius, status in `--s29-accent-text`, `is-building` | `myWorkspace2029.css`, rendered in "האזור שלי" |
| A decorative icon tile whose colour is decided once | `IconTile2029` → `treatmentVars()` → `resolveTreatment(purpose, state)`; `TREATMENT_MIX` is "the only place the reusable tint/mix scale lives" | `IconTile2029.jsx`, `paletteTokens2029.js` (Design V2, 25.10.2026) |
| Glyphs | `NavigationIcon2029` (24×24, 1.8px, `currentColor`, shared press feedback) | 49 catalogued shapes |
| Large identity icon (hero/feature only) | `SignatureResearchIcon` (gold/sapphire depth) | not for a menu |
| Compact actions in a panel, with a locked state | `.sod29-panel-actions-grid` + `.sod29-action`, `data-capability-state="locked"` | `systemFrame2029.css` |
| "בבנייה" | `.sod29-construction-badge` / `FrameState kind="gated"`; "כאן" = `contextLocked` (closed unless admin, said in words) | `SystemFrame2029.jsx` |
| Signed-in person | `UserAvatar2029` | `SystemFrame2029.jsx` |
| Type | `--s29-type-*` from `TYPE_SCALE_V2` (micro 14 · ui 16 · small 16 · body 18) | `designTokens.js` |

## 2. The three candidates against the contracts

| Clause | A · Palace | B · Grid | C · Glass |
|---|---|---|---|
| UI law: one component per role, differences by props | ✗ `RoyalTile2029` = a second tile family beside `IconTile2029` + the panel card | ✗ same | ✗ same |
| Design V2 25.10 §2/§6: tints/mixtures only from the shared owner | ✗ own `--royal-*` gold scale (6–84%) | ✗ same | ✗ same |
| Design V2 §7 / 25.10 §3: glyphs keep their capability colour; gold is bounded identity ornament, not a control colour | ✗ gold glyphs | ✗ gold glyphs | ✗ gold glyphs |
| §4 finishing "thin polished borders, restrained translucency"; SF V1 "quiet … restrained gold" | ✗ inner double frame, top light, gold medallion, drop shadow | ≈ flat plate + thin border (closest) but ✗ gold corner brackets = a new ornament | ≈ glass is approved language, but ✗ a blur layer per tile inside a glass sheet, gold halo glow |
| 25.10 §5: unavailable uses the owned treatment | ✗ `opacity:.55` | ✗ same | ✗ same |
| §7 / §11.5: the full lockup only in approved identity moments | ✗ lockup inside the sheet (install tile) | ✗ same | ✗ same |
| Navigation icon family: no unapproved shape | ✗ a new `install` shape | ✗ same | ✗ same |

**Closest to the existing language: B (Grid)** — the only one built as a flat plate with a thin border and no light/glow layers.
With its deviations removed (brackets, gold tint, square icon plates, own tile component) it converges on the frame's existing
panel card. That is what the branch now ships; `RoyalTile2029` and `royalTiles2029.css` are deleted.

## 3. What the panel is now

- Squares = `sod29-workspace-mini-card` laid out as squares (2 per row on a phone, 4 at ≥ 560px of panel; the square is a minimum,
  rows share one height, text is never clipped). Icons = `IconTile2029` purpose `ordinary` (theme text), 48px.
- The app (only when the device can install) = `sod29-workspace-home-card` + `IconTile2029 name="add" purpose="identity"` (the
  resolver's sapphire/gold identity treatment — the panel's one bounded identity moment) + `.sod29-action primary`.
- Context = the existing `.sod29-selection-summary`; admin-only destinations = the existing `.sod29-panel-actions-grid` buttons
  (no invented per-destination icons); share = `ShareActions`; header = main's `◇ עוד` / `↗ שיתוף`.
- `morePanel2029.css` is layout only: a test fails on any colour, `color-mix`, gradient, shadow, blur, brand token, pseudo-element
  or background in it.
- Measured in the browser (3 themes): a More square and a "האזור שלי" card have the same background, border colour and radius
  (Night `rgb(33,26,19)` / `rgba(212,175,55,.18)` / 16px; Day `rgb(234,240,249)` / `rgba(42,62,87,.18)`; Parchment
  `rgb(238,227,207)` / `rgba(89,70,39,.2)`).

## 4. "כלים" is locked and marked "בבנייה" (ZURIEL, 11.11.2026)

Same rule as "כאן" (`contextLocked = authLoading || isAdmin !== true`): no site flag, no DB change. The tile shows "בבנייה" to
everyone; for a visitor it is a disabled button with the resolver's `unavailable` treatment and the title "כלים בבנייה · למנהל
בלבד"; the administrator can open it ("גישת מנהל"). The lock also sits on the Tools panel itself, so every way in (the tile, a
context link, the frame API) lands on "הכלים בבנייה" and renders no tool.

## 5. Open for ZURIEL (not decided here)

1. The `identity` treatment on the app card — contract-allowed as a bounded identity moment, but it is a choice; `ordinary` is the alternative.
2. The desktop sheet is 640px wide so four squares fit (layout only).
3. Found, not changed: the existing "האזור שלי" cards draw emoji glyphs (👤 ⚙ 👑) rather than `NavigationIcon2029`/`IconTile2029`.
4. The 5.11 "one symbol per destination" addendum is still marked pending visual approval.
