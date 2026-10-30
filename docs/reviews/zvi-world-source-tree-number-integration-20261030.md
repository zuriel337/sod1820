# Zvi research: existing source, map and number surfaces — 30 October 2026

Base: `d2190811cdd87be2581425228ac9b339a2b22d4b`. Integration branch:
`gpt/2029-central-zvi-world-source-tree-20261030`. This receipt records the
scope and limitations of the isolated integration; its final commit, remote
identity, validation and any hosted-preview result must be recorded in the
coordination AFTER rather than inferred from this document.

## Implementation

- The existing World source view can explicitly load eligible public Zvi
  findings for an exact source occurrence. It uses the existing research card,
  canonical finding identity and source link. A source or finding with an
  unavailable, conflicting or changed identity is not guessed. The source
  owner is provenance, not automatically the author of every finding.
- The source action can focus the existing World map on that source and its
  loaded findings. The map displays at most six findings at a time, provides
  previous/next controls, and marks the window as partial. The existing general
  map remains available. Technical identifiers remain available in source
  details; user-facing Zvi map labels use readable Hebrew.
- The existing number surface can explicitly load eligible Zvi findings whose
  structured value matches the selected number. It pages through the public
  reader rather than depending on the older generic reader's initial window.
  A number shown on a finding is context and does not itself establish a graph
  relationship or an engine-verification result.
- The same card presentation is reused for the Zvi list, source and number
  surfaces. Anonymous read eligibility, exact public source identity, live
  source status and content guards remain in force; access is not a write or
  a model request. The projection adds source-to-finding provenance only for
  existing exact identities. It does not create new tree relations or infer
  topics, authorship, number nodes or evidence from text.
- A topic or number hint is a candidate for examination, not proof of a tree
  edge. A stored historical attachment records a target identifier; it does
  not prove that the target node is currently available, that its value
  matches, or that a live edge exists. Existing candidate links are retained.
  The corresponding administrative summary change is source code only: the
  static preview does not deploy `api/world-finding-review.js`. Its existing
  administrative `continuationLabel` can still describe an identifier as a
  live connection; the table presentation corrects that wording, but other
  API consumers require separate review.

## Content and remaining work

The individually reviewed identity manifest contains 248 exact fingerprints,
including five additions to the earlier 218 and six further independently
reviewed source-complete findings, followed by 19 additional source-complete
findings screened individually for research content, privacy, source fidelity
and exact duplicate statements. All 19 were independently rechecked through
anon for identity, fingerprints and live source. The previous six findings
were read through anon, their full statements exactly match live source messages, and no exact
statement duplicate was found. Arithmetic was checked in two; their gematria
and interpretations were not checked by the canonical engine.
The five earlier additions have arithmetic rechecked against their source;
only three also had their stated gematria operands checked against the canonical method. This is a bounded review of the
finding, not a claim that every part of each source was editorially or privacy
reviewed, nor that every finding was verified by the engine. Changed content,
unavailable sources and failed eligibility checks fail closed.

The earlier bounded assessment covered 472 mixed records. Following the thirty
additions, 179 still require review; 45 were excluded from research
presentation as nonresearch or personal. No records were deleted. These counts describe that assessment, not a live total
or proof that all Zvi material is ready for display. Further associations to
topics and tree nodes require evidence and the appropriate separate review.
The pending group includes extracts that may be cut mid-sentence, OCR or
source fidelity requiring inspection, ambiguous or personal material, and
repeated text from distinct sources. Preserve every source occurrence; do not
merge or delete duplicates. An OCR excerpt is not an exact verified quotation
without comparison to its source.

## Validation status

A focused final Node run passed 65/65 and synthetic browser checks
covered source pagination, map focus, number pagination and readable labels;
their results are not a substitute for the final run or a hosted test. The final
broader World run reported 468 passed, one failed and one skipped out of 470.
The failure in `worldDiscoveryStream.test.js`, expecting the old bottom-bar
title `מה חדש בעולם`, was also reproduced independently on the unchanged
base. It was not weakened or represented as a pass. Deployment identity and hosted verification belong in the coordination AFTER.

This task does not authorize a main merge, production change, product database
or RLS change, migration or Edge deployment. The elections session retains its
other World, Home and design ownership; this integration has only the scoped
reader, presentation and evidence-label changes recorded in coordination.
