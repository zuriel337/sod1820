# Follow center: shared color contract proposal and source review

Status: documentation proposal, not visual acceptance or runtime implementation.
Branch: `gpt/shared-icon-color-contract-20261025`.
Base: central `1baf950477e6357dc1f89d87d47db15fd457fb23`.
Task: `SHARED_ICON_COLOR_CONTRACT_CLARIFICATION_20261025`.
BEFORE: `ab004593-1af9-4965-a406-acc458e1f3b0`.

ZURIEL asked for a coherent shared solution and offered to update the existing contracts where
needed. This proposal extends the existing Design V2 owner. It creates no new contract family,
palette, component registry, theme store or color engine. The appended section is explicitly
proposed for ZURIEL review; approved role meanings and preset values remain unchanged.

## Evidence reviewed

Claude source: `claude/follow-center-visual-20261025` at
`6144e4b9ce21884756b67a420b34ef477ede7529`, compared with `e272747b`.
The source commit changes the candidate JSX/CSS, its visual test, review note and captures.
It does not change Design V2, the shared palette or the shared icon catalogue.

The committed Day 1440 and Night 390 captures were visually inspected. The candidate is now
visibly colored and uses existing preset tokens. This is not a complete shared semantic mapping:

| Finding | Source/evidence | Required resolution |
| --- | --- | --- |
| Entity color is inferred from the glyph | Local CSS lines 108–111 assign `personal` gold, `number` accent, `layers` violet and `signal`/`discovery` cyan | Let an owner-approved semantic purpose/state determine color; SVG geometry remains interchangeable |
| New subject meanings are page-local | The CSS comment declares Person = gold and category = violet; the approved contract does not establish those universal kind mappings | Retain existing role meanings; adopt any new kind mapping explicitly once before sharing it |
| Reusable tints and card roles live in the candidate stylesheet | Local state/section mixtures and tones at lines 95–116 | Implement adopted repeated treatments in the existing palette/shared component owner and consume them consistently |
| Unavailable Push still has a cyan icon | `signal` matches the cyan glyph selector, while `data-available=false` has no overriding icon treatment; visible in both inspected captures | Give unavailable/disabled state explicit precedence; verify it against an available instance of the same glyph |
| The share specimen is still neutral | `.fcp-spec-share` uses `--s29-ink`; current Design V2 assigns discovery/share the cyan/teal role | Preview the actual `ShareActions` treatment. `WatchButton` replaces Follow only, not sharing |
| Test enforces the local color count | The new browser assertion requires four distinct icon colors and three section tones | Assert the adopted semantic-role mapping/state and contrast; hue count alone is not a contract oracle |

The unavailable Push icon is a mismatch with the delivery statement that every unavailable
channel remains gray. Its adjacent text does correctly say unavailable. This review does not
claim that a channel was activated or that live data was exposed.

The prior icon correction correctly reused `NavigationIcon2029`. Its SVG `currentColor` never
meant that the entire interface had to be black and white. Ordinary navigation, identity
ornament, capability emphasis, interaction state and delivery availability are different inputs;
one glyph can appear in several of those contexts.

## Proposed contract decision

Review the appended “Proposed clarification: shared icon and surface color resolution” in
`SOD1820_DESIGN_CONTRACT_V2.md`. It makes the geometry/purpose/state boundary explicit, preserves
the existing approved colors, and assigns reusable resolution/treatments to the current shared
owner. It does not approve a new global writer/category/channel color taxonomy.

The recommended implementation follows the existing role language. If a fixed per-kind palette
is desired in addition, its exact meaning and mapping need a separate explicit entry in this same
contract before becoming a requirement for all writer, community, World and personal consumers.
Color must not imply a research rank, verified identity, delivery or consent that is absent.

## Bounded implementation handoff after adoption

1. Recheck current shared-palette, shared-component and source-file ownership. Open a fresh
   BEFORE with the exact accepted base and paths. The source's latest visible AFTER is still
   `d2ef2740` for the preceding amendment; the `6144e4b9` delivery needs an exact updated handoff.
2. Claude implements the accepted shared presentation through existing palette/component/tone
   seams, with ownership of only the necessary shared files. No copied Follow-center palette,
   parallel SVG set, theme store or broad Legacy restyling.
3. Consume the adopted treatment in the follow center and compare representative writer,
   community and personal consumers. Do not infer a global rollout from this local candidate.
4. The visual Preview uses actual canonical Follow and Share controls with intercepted fixture
   mutations where required. Recheck active/unavailable Push, unread/empty/error/guest states,
   all three presets, widths, contrast and keyboard behavior against the common role policy.
5. Complete visual acceptance before GPT wiring. Preserve the consent correction in PR #1157
   during later integration; it is not in the Claude source base. No real notification/email,
   opt-in, identity change or product-data write is authorized by visual acceptance.

## Verification and release boundary

This branch changes documentation only. `git diff --check` and a bounded two-file manifest are
the relevant checks; no application build/browser rerun is represented as new evidence. The
reported 43 browser cases belong to Claude, not this independent review. Screenshot copies are
under `/workspace/artifacts/follow-center-color-alignment-6144/`.

No source merge/cherry-pick, JSX/CSS/palette/catalog change, main/central update, Production,
DB/RLS/configuration change or agent activation. Final SHA, draft PR and released documentation
scope are recorded in the passive AFTER to ZURIEL.
