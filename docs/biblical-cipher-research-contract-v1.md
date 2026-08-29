# SOD1820 — Biblical Cipher Research Contract v1

**Status:** FOUNDATION CONTRACT CANDIDATE · Human-Gate scope approved for documentation by ZURIEL · 2026-08-29  
**Layer:** Foundation → later Projection → later Experience  
**System law:** One Research OS · one canonical Torah corpus · one ELS/spatial research system · many representations · one Human Gate.

## 1. Objective

Preserve the research DNA required for large-scale Biblical cipher work before building the future ELS experience. The system must not be limited to target-word lookup. Given a primary axis, it must be capable of scanning a large spatial neighborhood, discovering many candidate words/phrases, explaining exactly how each candidate was obtained, recursively expanding meaningful seeds, ranking rather than hiding candidates, and preserving provenance and negative search evidence.

This contract does **not** authorize a new parallel engine, schema, UI, 3D renderer, merge, deploy, or canonical publication of research findings.

## 2. Canonical pipeline

`Canonical Torah Corpus → Representation → Spatial Search → Raw Sequences → Segmentation / Pattern Detection → Candidate → Seed Expansion → Intersections / Relations → Ranking → Research Finding → Human Gate`

The existing Research OS remains the owner of research truth. ELS is an engine/source/lens within it.

## 3. MUST FOUNDATION NOW

### 3.1 Stable source identity
Every searched or displayed glyph must be traceable to its canonical Torah position. Projection coordinates are not truth.

Minimum source identity:
- corpus_id/version
- canonical Torah position/index convention
- original glyph
- book/source location when available

### 3.2 Representation lineage
A transformed discovery must never replace its source letters. Every representation preserves a reversible lineage:

`original Torah glyphs → canonical transform + version → represented glyphs → detected token`

Supported/anticipated representation classes include:
- Original
- Reverse reading/direction
- Atbash
- Albam
- Atbach variants that exist in the canonical method registry
- future canonical, explicitly registered transformations

No arbitrary unregistered transformation may silently enter the research pipeline.

### 3.3 One spatial scanner, many representations
Do not create a separate truth engine/store for Atbash, Albam, reverse, 3D, etc. Representations feed the same spatial-search contract. A renderer or representation may change; source identity and research provenance do not.

### 3.4 Axis-centered massive discovery
A primary axis/search result must be expandable into a configurable research window. The system must support scanning many offsets, directions, skips/step relations, and candidate sequences around the axis rather than requiring the researcher to predict every word in advance.

Search-space metadata must be retained so a hit can be judged against how much was searched.

### 3.5 Blind vs targeted discovery
Every candidate must record whether it was:
- TARGETED — explicitly searched for;
- BLIND_DISCOVERY — discovered from generated sequences/lexicon matching without pre-targeting;
- DERIVED — produced by expansion/transformation from another candidate.

Blind discovery is not automatically true/significant, but it is evidentially different from a targeted lookup.

### 3.6 Segmentation and boundary integrity
The engine must distinguish:
- exact source word/phrase boundaries where available;
- continuous Torah source text;
- ELS-derived sequence;
- candidate segmentation crossing source-word boundaries;
- transformation-derived segmentation.

A displayed token such as `אליהו` must not conceal that its source sequence may actually be `אל יהוה` across a boundary. The UI/finding must be able to show both the raw sequence and proposed segmentation.

### 3.7 Seed Expansion Law
Every meaningful candidate can become a research seed. Before interpretation, the system must be able to:
1. extend forward on the same exact path;
2. extend backward on the same exact path;
3. reverse reading direction;
4. inspect canonical representation transforms;
5. re-segment the extended sequence;
6. inspect crossings/intersections and nearby axes;
7. recursively promote meaningful new candidates to seeds;
8. preserve negative expansions as search evidence.

Expansion does not itself promote a candidate to Fact/Canonical/Published.

### 3.8 Geometry / relation identity
Findings must preserve enough geometry to reconstruct the discovery independently:
- axis identity
- skip/step
- direction
- start/end positions
- ordered Torah positions
- row/column/offset or equivalent derived projection coordinates
- intersections/shared coordinates
- relation to parent seed/axis

Coordinates used only for a visualization must remain Projection State, not canonical truth.

### 3.9 Candidate ranking — Rank, Don't Hide
Large scans may produce thousands or more candidates. The system ranks them instead of discarding them invisibly.

Ranking signals may include:
- token/phrase length
- lexical confidence
- rarity / expected frequency
- blind vs targeted origin
- distance/proximity to primary axis
- exact intersection/shared coordinate
- number and quality of independent relations
- meaningful continuation length
- representation complexity/penalty
- search-space size / multiple-testing baseline
- duplicate/derivation penalty
- source-boundary integrity

A score is prioritization, never truth.

### 3.10 Search controls and negative evidence
For reproducible research retain, when feasible:
- search window
- directions tested
- skips/offsets tested
- representations tested
- lexicon/version
- candidate thresholds
- number of paths/candidates examined
- no-hit/negative results relevant to the research question

Without search-space context, a hit must not be presented as statistically exceptional merely because it exists.

### 3.11 Truth lifecycle
Keep strict separation:
`RAW ≠ DISCOVERY ≠ CANDIDATE ≠ FINDING ≠ CLAIM ≠ EVIDENCE ≠ FACT ≠ INTERPRETATION ≠ DECISION ≠ CANONICAL ≠ PUBLISHED`.

AI may discover, rank, connect and propose. ZURIEL remains Human Gate for interpretation/canonical/publishing decisions.

## 4. Minimum Finding payload / projection contract

A future ELS/Universal Finding adapter should be able to expose, when applicable:
- stable finding/source identity
- corpus/version
- primary axis identity
- original Torah letters + ordered positions
- represented letters
- representation id/version
- direction/skip/start/end
- raw sequence
- proposed segmentation
- boundary status
- discovery mode: targeted/blind/derived
- parent seed + expansion lineage
- intersections/relations
- search-space metadata
- ranking signals + score explanation
- provenance
- truth status
- human_gate_required

This is a logical contract, not authorization for a new table.

## 5. EXTENSION POINT NOW

Leave explicit contract space for, but do not build now:
- N-dimensional / multi-plane search
- multiple synchronized representations of the same Torah coordinates
- semantic/lexical dictionaries beyond current verified corpus
- statistical baselines and control corpora
- GPU/parallelized large candidate scanning
- Semantic Scene Compiler / 2D / layered / 3D projections
- cross-engine relations to Gematria, Time, Entity, Source and Reality Graph

Any future plane/dimension must map back to canonical source identity and document its transform. No opaque dimension may become truth by display alone.

## 6. LATER — implementation and experience

Defer safely until the Roadmap reaches the ELS implementation/projection stage:
- exhaustive production scanner
- high-volume indexing/parallel compute
- researcher controls for massive scans
- visual matrix explorer
- layered/3D/WebGPU scene
- interactive seed graph
- bulk candidate triage UI
- automatic cross-engine suggestions

These are implementations/projections of this contract, not prerequisites to preserve the contract now.

## 7. Stress-test evidence that shaped this contract

The contract is informed by live research stress tests, not treated as proof of any theological interpretation:
- 1820 axis reconstruction showed exact positions, offsets, crossings and continuous extensions matter.
- `תשעו נסו ה` showed why same-path continuation can reveal material lost by a short finding.
- blind exact-1820 scanning showed 3-letter hits are abundant/noisy, requiring length/rarity/baseline controls.
- `פלא`, `נון`, `יהוה`, `יממה` examples showed proximity/intersection can be represented geometrically without declaring significance.
- recent תשפ״ו records showed stored short findings can sit inside much longer continuous Torah context.
- an apparent `אליהו` can arise from a sequence crossing `אל יהוה`, proving boundary/segmentation provenance is mandatory.
- Atbash/Albam exploration showed transformations belong in a Representation layer rather than a parallel ELS truth engine.

These examples are calibration/stress-test provenance. They are not canonicalized interpretations by this document.

## 8. Foundation Expansion Gate

### MUST FOUNDATION NOW
Stable corpus identity; representation lineage; geometry identity; boundary/segmentation status; blind/targeted/derived provenance; seed-expansion contract; search-space/negative evidence; ranking semantics; truth lifecycle; Human Gate.

### EXTENSION POINT NOW
N-dimensional planes; canonical transform registry adapters; scalable scanner interface; statistical baseline interface; renderer-independent spatial finding payload.

### LATER
Heavy scanning implementation, UI, 3D, GPU optimization, broad corpus campaigns, and interpretation of historical/current cipher clusters.

## 9. Stop conditions / anti-patterns

Do not:
- create a parallel ELS engine because a representation is new;
- create a parallel Finding store automatically;
- store projection x/y/z as research truth;
- count continuous source words as independent ELS confirmations;
- hide segmentation or transformation lineage;
- treat short-word abundance as significance without baseline;
- treat a score as truth;
- auto-promote AI discoveries;
- let current legacy UI dictate the Foundation;
- launch a full תשע״ו/תשפ״ו interpretation campaign merely to finish this contract.

## 10. Foundation status

With this contract documented and reconciled with the live Research OS laws, the **architectural Foundation for future Biblical Cipher research is sufficient to defer heavy ELS implementation**. Implementation completeness is explicitly **NOT SUFFICIENT / NOT CLAIMED**.

Next navigation after Human-Gate review: return to `SOD1820_MASTER_ROADMAP.md`; do not continue cipher hunting merely because the stress-test corpus remains rich.

**Foundation → Projection → Experience.**  
**Preserve capability, truth and provenance — not necessarily the legacy interface.**
