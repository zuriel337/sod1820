# World preservation review

Read-only recovery source: `gpt/2029-world-local-changes-preservation-20261031` at `5d9c81f0a8fac7f8916a8c1d71358d8eda6a03a3`, parent `ff23ae685dcae824c4cdb45830fc1578820bcf1d`. Its handoff explicitly labels it BACKUP_UNACCEPTED_NOT_INTEGRATED. Eight snapshotted source/test files differ from the unified base; branch ancestry or a different blob is not proof that all intended behavior is missing.

The snapshot's changes to Knowledge Types, People/Sources, Source Connections, Source Inspector and Source Story remove visible content, provenance/metadata and boundary disclosures. Those deletions were not adopted: the current request preserves content, links and the approved unified experience. The underlying public-source routes/readers remain in the product and have their own browser acceptance coverage.

The useful public-visibility defense in `zviMultiValueWorldProjection` was adapted narrowly: query and projection both require public privacy and approved/canonical status. The live anonymous view already enforces this boundary; the client now preserves it defensively for supplied rows too. Positive canonical rows and negative candidate/draft/private rows are tested. A missing promoted target still stays unavailable; a non-null promotion reference alone does not establish public identity or authorize a new link.

The two backup tests were reviewed for intent. Content-removal assertions were not imported. Existing source disclosures/ownership checks were retained, and the current projection test covers the adopted visibility rule. The native Gallery destination was corrected independently to `/world?view=gallery`; no gallery content was removed.

The eight-path blob inventory in `evidence/world-backup-content-audit.json` records the immutable base and the published product checkpoint at the time of comparison. It is preservation evidence, not an instruction to restore the snapshot wholesale. Earlier performance ancestors were not cherry-picked again into this consolidated product.
