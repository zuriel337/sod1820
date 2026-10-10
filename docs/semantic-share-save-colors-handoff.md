# Semantic colors and share/save — local handoff

Actor GPT · task SEMANTIC_SHARE_SAVE_COLORS_20261010 · claim d3ad1afc-1cd6-4930-a4c9-f23c8a889a6b.
Owners: Design V2, canonical_ui_components v7, canonical_colors v2, existing ShareActions / palette / ResearchProvider.
Parent cf98a84b; branch codex/semantic-share-save-colors-20261010. Local only, no push/merge/deploy/product DB write.

## Origin audit

- ShareActions is the existing canonical component used by Calculator, Topic and SystemFrame Inspector. It retained legacy theme typography (12.5px) and emoji for native/copy/image. Its usePalette previously resolved legacy route colors outside Heichal's PaletteProvider; the 2029 projection now explicitly uses frame CSS roles, with V2 status tokens. Share intents, channel URLs, attribution and telemetry remain owned by their original modules.
- RoyalShareWidget is the older floating placement consumer, not imported by App2029/SystemFrame; unchanged. CHANNELS continues to own social brand paths/colors.
- Books used heart save glyphs. The new save/check glyphs and feedback still call ResearchProvider.saveItem. That store remains local-first with its existing sync; “saved” does not assert remote sync or publication.
- SystemFrame Inspector uses ResearchProvider too. Its existing data-inspect-action/aria-pressed hooks receive matching action colors, without changing the actively owned frame file or its behavior. Its plus/check text glyphs are not replaced in this scope.
- QuickActions and DocActions remain legacy consumers. DocActions unconditionally announces saved after its call; this legacy-only defect was observed, not silently fixed in the 2029 presentation pass. No universal migration/closure claim.

## Implemented

V2 Day/Night border/glow saturation reduced; Night numeric hero identity shifted from pale violet to indigo. Existing cyan discovery token now colors content intros (World/Topic/Journey/ELS), discovery Signature roles and selected content affordances; spatial/cosmos use violet. No new palette, store or icon registry. Parchment remains the user's chosen warm projection.

ShareActions native/copy/image icons now reuse NavigationIcon2029; share/copy/save/check/add use the same 24-unit geometry. 2029 actions have 16px labels and 44px border-box targets, cyan sharing, indigo saving, explicit success/error status and keyboard focus. Social marks retain their original branded colors. Books share one page-local save presentation over the existing store, show actual saved state, suppress positive aria state after a failed commit and announce errors/retry. No new save persistence path.

Necessary copy bug fix: lib/share.js now returns false when document.execCommand('copy') returns false; previously it returned true unconditionally. Temporary textarea is removed even on exception. URLs/telemetry unchanged.

## Verification

- Both application builds PASS (existing chunk warnings remain).
- 11 tests PASS: share-copy-fallback, share-object-foundation, share-attribution-boundary, book-research-summary contracts.
- SystemFrame acceptance and 2029 isolation PASS; diff check PASS.
- Browser on actual ShareActions mounted in an isolated React/Router/Palette fixture: Day/Night/Parchment; widths1100/390/320; 16px labels, uniform44px actions, no document overflow; native called once with original target retained; copy success, clipboard rejection plus false fallback shows error; focus/reduced motion PASS.
- Actual Books page + actual ResearchProvider with a mocked book read and all external writes blocked: forced storage failure has no positive saved presentation, retry succeeds, saved state persists after reload. No real book or cloud write used.
- Presentation screenshots reviewed. Local evidence /workspace/artifacts/semantic-actions-20261010 contains fixture.html, check.cjs, books.cjs, screenshots, checks.json and save-checks.json. These are local, not cross-session transferred or production evidence.

## Integration

BUNDLE_WITH cf98a84b / af970703 parent work. Preserve the independent ELS palette/save branch additions when combining; they are not present in this checkout. SystemFrame/DiscoveryGate/global header/rail and active World/Post/ELS files untouched. Broad Journey contracts, source handoff and M3 source gaps remain unchanged. Hero media selection and further content-specific color/motion rollout remain subsequent work. Branch tested is not live.
