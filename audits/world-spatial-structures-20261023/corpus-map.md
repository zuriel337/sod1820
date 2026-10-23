# World 2029 — spatial structures corpus map

This file is audit evidence, not a second data source. Runtime cards are built from the live public/admin readers and the canonical gematria engine.

## Scan result

- Candidate scan: 119 research objects grouped under 55 exact source occurrences.
- First reviewed release: 12 spatial clusters backed by 27 exact source occurrences.
- Display-only duplicate marks in the reviewed release: 9 occurrences. No row or source was deleted.
- Remaining review queue: 28 source occurrences; they are not promoted automatically.
- Constants series: 2 approved/public cases, both deterministically verified as approximations rather than equalities.

## Reviewed spatial clusters

| Cluster | Section | Shape | Strength |
| --- | --- | --- | --- |
| `hashgacha-pratit-1020` | solids | cube | strong |
| `raza-deshabbat-910` | solids | cube | strong |
| `keter-icosahedron-620` | solids | icosahedron | strong |
| `matamim-cube-1254` | solids | cube | strong |
| `yesharim-3060-family` | complex | compound | strong |
| `emunah-brit-cube-612` | series | cube | strong |
| `chai-cube-1080` | series | cube | strong |
| `chai-star-1080` | solids | sixty-face star | medium |
| `zot-cube-408` | solids | cube | strong |
| `arbaat-haminim-cube-828` | solids | cube | strong |
| `na-kippur-cube-306` | solids | cube | strong |
| `zot-compound-408` | complex | pentagon/octagon compound | medium |

Strength, evidence quality, calculation state, publication state and source independence are separate fields. An occurrence is provenance, not an independent source.

## Constants

- `e-pi-minus-pi-20`: `e^π − π` is close to 20 but is not 20.
- `pi45-e6-403`: `π⁴ + π⁵` is close to `e⁶` but is not equal to it.
- Neither case is linked to the spatial section because the reviewed evidence does not establish a geometric relationship.
- The World includes a short public reading guide and links to the canonical lesson at `/beit-midrash?section=numbers&concept=sequences#number-concept-sequences`. The lesson is not copied into a second curriculum or data source.

### Manager promotion review

| Candidate | Deterministic result | Recommendation | Interpretation boundary |
| --- | --- | --- | --- |
| `pi-power-pi` | `π^π = 36.4621596072079…` | Calculation only, after approval | 36 and 46 are not produced as exact results |
| `e-power-e` | `e^e = 15.154262241479259…` | Calculation only, after approval | Moving the decimal to 151 is not established by the calculation |
| `pi-power-e` | `π^e = 22.45915771836104…` | Hold | Ordinary two-decimal rounding is 22.46, not the source claim 22.45 |
| `e-power-pi` | `e^π = 23.140692632779263…` | Calculation only, after approval | Any additional meaning needs a separate source and connection |

The four candidate clusters stay behind the existing manager gate. Exact source occurrences and duplicate provenance are retained; occurrences are not counted as independent sources. This review does not change publication status or promote a finding automatically.

## Held for review

- The source occurrence `channel_updates:07432406-3b24-4c44-8ed8-ca980dced60b` states that “ראש השנה” is 681, while the canonical ordinary-gematria engine returns 861. It remains in the manager queue and is not a public spatial model.
- Missing OCR, uncertain image adjacency, unsupported geometry and unverified π/e claims remain review items.

## Runtime and release boundaries

- Public cards require approved/public live research plus a readable source row and fail closed if the reader is unavailable.
- Manager-only queue data is requested only after the existing admin gate succeeds.
- The spatial visual kit has three explicit layers: deterministic decoded diagram, source evidence and optional schematic 3D. Generated or schematic imagery is never labelled as source evidence.
- Six cards are mounted initially; subsequent groups of six are revealed on request. A deep link expands the group that contains its exact target.
- The list uses the deterministic 2D diagram first. Source images and the Three.js renderer are loaded only after an explicit layer selection.
- The separate π/constants series uses deterministic comparison diagrams. The actual value, comparison value and absolute gap remain explicit; approximation is never drawn or labelled as equality. Its source image also mounts only after explicit selection.
- Migration `20261023030314_world_spatial_structures_metadata_v1.sql` adds research metadata only. It does not change RLS, privacy, status, publication, source rows or tree membership.
