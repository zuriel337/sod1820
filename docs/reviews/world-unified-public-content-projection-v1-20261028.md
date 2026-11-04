# World Unified Public Content Projection v1 — Phase 1

Status: branch-only contract and pure tests. No reader, UI, Topic, source,
finding, tree, privacy, publication, database or News change.

## Public envelope

`public-world-content-projection/v1` returns exactly these top-level fields:

```text
contractVersion
coverage
sources[]
occurrences[]
clusters[]
seriesCategories[]
findings[]
treeRelations[]
compatibility.legacyTopics[]
metrics
```

It is an assembly boundary over canonical public readers, not another reader,
store, taxonomy or authority. The same function accepts every contributor,
publisher and editorial projection; it contains no contributor-specific branch.

## Identity and truth boundaries

* `sourceRef` is the stable source identity. `metrics.corpusSources` counts
  unique source refs only.
* `occurrenceRef` is a particular locus with `occurredAt`, `publishedAt` and
  `updatedAt` kept separate.
* A `cluster` is presentation-only and requires an explicit `basis`; no shared
  title, author, category or number can create it.
* `seriesCategories` are exact `series` or `category` labels only. They are
  never Topics or graph relations.
* A `finding` must already be public and retain exact source refs.
* A `treeRelation` requires a finding plus target and either `edgeRef` or
  `governanceRef`. Navigation to a number page is not graph proof.
* `legacyTopics` remain only in `compatibility`; they never change corpus
  source metrics.
* Every unavailable lane returns `{ available:false, total:null }`; zero means
  an available reader returned an actual empty collection.

## Spatial / Zvi application

The contract does not introduce a Zvi-specific model. A spatial item will use:

```text
source → occurrence(s) → explicit spatial cluster → public finding(s)
       → optional governed treeRelation
```

Geometry, calculation, visual illustration and interpretation remain distinct
finding/layer data supplied by their canonical owners. Interactive 3D is a
lazy representation of a structurally complete spatial finding, not evidence
and not a source replacement. A source diagram remains available as the 2D,
accessible fallback.

## Next phases (not implemented here)

1. Adapt existing public readers one at a time into this envelope, retaining
   their access gates and exact source locators.
2. Compare the 78 legacy Zvi Topics against `compatibility.legacyTopics` only.
3. Move World and News to consume the one envelope; News adds its own event/new
   window without a parallel source reader.
