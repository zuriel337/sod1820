# Spatial Gematria v2 — Bottom-Up Research Contract

**Status:** implementation contract candidate, derived from the completed ZVI bottom-up corpus harvest (410 text items + 31/31 orphan media visually inspected). 0 new DB table / store / graph / truth lifecycle.

## Core law

Spatial Gematria is a **Research/Reality Graph lens**, not a parallel system.

`SOURCE → EXTRACTION → ENGINE-VERIFIED VALUES → MATHEMATICAL DERIVATION → SPATIAL REPRESENTATION → INTERPRETATION`

The spatial layer never becomes the source of gematria truth. Gematria values come from the canonical engine. Mathematical operations are explicit derivations. Spiritual meaning remains interpretation.

## v2 universal spatial model

Every spatial research model may declare the following independent dimensions. Missing dimensions are allowed; they must not be invented.

1. **shape_identity** — cube / icosahedron / pentagon / triangle / future shape identity.
2. **dimension** — 2D / 3D / abstract spatial representation.
3. **structural_properties** — faces / edges / vertices / regions / directions / counts, each with provenance.
4. **regions** — named outer/inner/sub-regions; regions may contain other regions.
5. **orientation** — north/south/east/west/up/down or source-declared positional roles. Orientation is semantic only when the source explicitly makes it semantic.
6. **assignments** — expression/value assigned to a shape, face, region, direction or repeated part.
7. **operations** — add/multiply/sum-regions/other registered numeric operation; never hidden in prose only.
8. **convergences** — two or more independently derived paths landing on the same value. A convergence is a finding, not automatic canonical truth.
9. **provenance** — source artifact(s), contributor attribution, engine verification and unresolved media references.
10. **interpretation** — separate from all engine/mathematical facts.

## Quantity provenance

A quantity such as `6`, `20`, `5`, `4`, `180` must never be treated as an unexplained arithmetic constant when the source gives it semantic meaning.

Examples:
- cube → faces = 6
- icosahedron → faces = 20
- pentagon → sides/outer segments = 5
- four inner triangles → region_count = 4

If the quantity comes from corpus occurrence count, geometry, a date, a person count, or another derived source, that origin must remain explicit.

## Region / containment law

Nested geometry is first-class at the contract level:

`shape → contains → region → contains → subregion`

A region may have its own assignment, operation and value. The same final value reached by outer and inner regions is represented as multi-path convergence, not duplicated findings.

## Multi-path spatial convergence

For a target value `V`, each path must remain independently reproducible:

`path_i: inputs + quantities + operations → V`

Only after each path is reproducible may the projection show `N independent paths → V`.

ZVI 3060 is the golden specimen:
- `ישר(510) × 6 = 3060`
- `ברית(612) × 5 = 3060`
- `טוב(17) × 180 = 3060`
- `765 × 4 = 3060`
- `השגחה פרטית(1020) × 3 = 3060`

The spiritual explanation of these paths is interpretation, not engine fact.

## Spatial representations are projections

A spatial scene is a representation of graph-backed research. It does not own the entities.

Number/phrase/source/person/spatial shape may all point to the same underlying findings. `spatialModels.js` is therefore a projection/configuration layer, not SSOT.

## Renderer compatibility

v2 remains backward-compatible with the existing `GematriaCube` renderer. New metadata may be added before the renderer supports every shape. Unsupported shapes must degrade to a truthful non-interactive representation; never fake a geometry.

## ZVI harvest classification

Completed source window:
- 410 credit-tagged ZVI text items harvested bottom-up.
- 31/31 orphan media visually inspected.
- media pass found 0 additional MUST FOUNDATION NOW.
- nested triangle, anagram relation and other single specimens remain extension candidates until recurrence.

## Foundation verdict

**FOUNDATION SUFFICIENT FOR FULL KNOWN ZVI SPATIAL CORPUS.**

Implementation may now expand the Spatial projection without creating a new engine/store/graph/schema.
