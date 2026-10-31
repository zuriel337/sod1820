# Post reading chain — technical repair and bounded visual proposal

Base: `8b501aa47f7f25c3c086f80baf59e81feea26984`, branch `gpt/posts-integrated-backgrounds-20261030`. Existing Design V2 §8.2 and Reality Graph v8 remain the owners. This is a review receipt, not a replacement contract.

## Alignment decision

| Element | Recommended treatment |
| --- | --- |
| Content plane | Centered, bounded, balanced logical gutters |
| Long Hebrew prose and lists | Align to start (right in Hebrew); avoid centered paragraphs and full justification |
| Short identity heading | May center; a multiline title must retain readable weight and wrapping |
| Short quote or equation | May center as an intentionally separate unit; long explanatory prose stays aligned to start |
| Section menu | Same centered axis, balanced button distribution; wrap when necessary |

Centering the container and aligning the words are separate decisions. Preserve authored source wording and colors; do not turn every old centered paragraph into a quotation or overwrite explicit verse semantics.

## Implemented technical scope

The existing occurrence reader now reads bounded explicit legacy equalities and local method declarations. It keeps exact spelling, source version, value, method label and occurrence. The canonical profile resolves exact method keys/display labels; it never searches for a different method merely because a result matches. Missing context and mismatches produce nearby status feedback, with no automatic regular-method fallback.

The existing plain-equality decorator labels the operands it adds, so generated controls cannot displace saved source markings. Legacy presentation anchors are derived from the full source SHA-256 plus the saved marking position. They are explicitly described as snapshot-bound presentation locators, not source-native section identities. Changed source content invalidates them. Source/body/access are revalidated before opening the unchanged Number drawer, and exact return uses the existing Research Context.

Matrix calibration: 38 saved markings consist of four generic numeric entries and 34 phrase occurrences. Twenty-five have explicit local method/value context and match the current canonical profile. Nine remain incomplete; no method is borrowed from another occurrence. Profile parity does not certify trace steps, narrative interpretation or a graph relation. No source content or product data was edited.

## Concrete visual proposal — not applied

The live coordination owner preserves Claude as mandatory visual writer. The routing index states: “CLAUDE is the mandatory writer for every 2029 surface and visual component” (`SOD1820_MASTER_OWNER_INDEX.md`, writer lanes). No new visual activation, scope transfer or acceptance is claimed.

Apply this through the existing `LearnMark2029` / `learnMark2029.css` and Post CSS owners:

1. Keep a visible short label for surface-level help even in compact mode. Concept-level compact help may retain its existing icon-only behavior. Preserve orientation/familiarity state and accessible expansion semantics.
2. Keep one outer button outline; remove the inner decorative symbol ring for the chosen surface-help variant. Preserve a 44×44px minimum hit target and a visible focus ring.
3. Replace the Post rule that forces both metadata and orientation to `flex-basis:100%` below620px. Keep the labelled help in the metadata group; allow ordinary wrapping when it cannot fit.
4. Center/distribute the existing Post section buttons within their bounded container. Do not alter global navigation, create a new menu, or center long prose.

Acceptance: 320/390/1440px, all three presets, touch/keyboard/expanded state, balanced gutters, visible label, no horizontal overflow, unchanged source text/media and no status meaning inferred from decorative colors. Shared Frame, personal area, World, Topics, Galleries, global typography/palette, engines, RLS and Production remain outside this technical repair.

Machine-readable findings and final verification: `posts-reading-chain-20261031.json`.
