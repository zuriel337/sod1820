# SOD1820 — Orthographic Representation + Anchor Discovery v1

**Status:** APPROVED by ZURIEL Human Gate · 8.9.2026  
**Owner verdict:** EXTEND_EXISTING  
**Release state:** DB governance rules LIVE; this file is branch-only documentation until merged.  
**No new table / store / engine / registry / graph.**

## Canonical owners extended
- `ktiv_male_haser_repair_law` v2 — Universal Orthographic Representation Discovery.
- `metatron_anchor_hierarchy_law` v2 — Concept/Expression/Representation hierarchy + cross-method Anchor Challenge.
- `gematria_db_first_and_enrich_law` v3 — Exact-first, exhaustive methods, bounded orthographic family expansion, reverse value lookup, no-connection gate.

## Locked invariants
1. **Concept ≠ Expression ≠ Orthographic Variant ≠ Calculation.**
2. **Search Normalization ≠ Calculation Identity.** Search may group related spellings; gematria always calculates the exact letters of each representation.
3. **Exact Input First.** User/source text is preserved verbatim; no silent spelling correction.
4. **Generated Variant ≠ Attested Variant ≠ Exact Source.** Provenance must say which one produced the hit.
5. **No auto-merge.** A spelling variant is not automatically a typo, alias, or `same_as` identity.
6. **Known/attested variants first; generated variants later and bounded.** No combinatorial explosion and no target-fitting.
7. **Every representation gets its own governed Method Vector** through the canonical `gematria_methods` registry/engine.
8. **Reverse Anchor Challenge on every generated value.** For each `(expression, method, value)`, search existing corpus/anchors even when the matching anchor uses a different method.
9. **Cross-method equality is a numeric fact; semantic meaning is separate.** Preserve method A + method B and route semantic interpretation through Research OS/Human Gate.
10. **No-connection may be declared only after** Exact Method Sweep + bounded Variant Expansion + Reverse Value/Anchor Challenge, subject to current scannable/executable governance.

## Variant ranking
- `EXACT`
- `ATTESTED_VARIANT` — source/Tanach/corpus/known alias evidence.
- `GOVERNED_ORTHOGRAPHIC_CANDIDATE` — bounded full/defective spelling and matres lectionis (`י · ו · א · ה`) supported by linguistic/corpus rules.
- `FUZZY_SPECULATIVE` — weak suggestion only; never auto-promoted into the primary Finding.

## Golden calibration cases
- `משיח בן דוד = 424` (רגיל) vs `משיח בן דויד = 434` (רגיל).
- `דוד = 14` vs `דויד = 24` (רגיל).
- `תחית המתים = 1313` vs `תחיית המתים = 1323` (רגיל).
- `שנאת חנם` / `שנאת חינם`.
- `חלזון` / `חילזון`.
- Mandatory cross-method Anchor case: `והמשכלים יבינו = 1331` (מילוי) ↔ `משיח = 1331` (קדמי / משולש).

## Personal Research reuse
Personal Journey does not get a separate spelling or anchor engine. The same universal path applies:

`Person/Research Context → exact inputs → representations → governed methods → values → anchors → graph/topic context → ranked Finding → interpretation → Human Gate`

A person may therefore reach a universal topic through a spelling-specific numeric path, while the path remains fully reconstructable and never changes identity/truth by implication.

## Truth boundary
`Exact/Variant Calculation = Engine Fact`  
`Anchor Hit = Numeric/Research Signal`  
`Semantic Relation = Inference/Interpretation unless separately supported`  
`Canonical/Published = Human Gate only`

## Provenance
Work-log BEFORE: `609b24b3-ba7f-484b-b299-31a5d15e009a`.
Live engine re-verification on 8.9.2026 confirmed all mandatory Golden values before closure.
