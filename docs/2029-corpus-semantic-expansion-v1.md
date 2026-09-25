# SOD1820 — Corpus Baseline & Semantic Expansion V1

**Status:** STACKED FOUNDATION BUILD · NOT MERGED · NOT DEPLOYED  
**Program:** Research Synthesis / Calibration Foundation 2029  
**Owner verdict:** **EXTEND_EXISTING**  
**Canonical Supabase:** `linswmnnkjxvweumprav`

## 1. Purpose

SOD1820 already has substantial numeric/lexical volume. The next bottleneck is not “more words at any cost”; it is **typed, provenance-bearing semantic structure** that can help Synthesis distinguish:

- meaningful Cross signatures;
- same-root morphology;
- true semantic proximity;
- opposition/contrast;
- identity/translation variants;
- source-context relations;
- generic/random equal-value coincidences.

This program does **not** create a new dictionary, WordNet, semantic graph, synonym table, corpus store or ontology.

It extends the existing one tree:

```text
Exact Expression / Corpus Admission
        │
        ├── gematria_words        (calculation/search corpus)
        ├── maftech_lexicon       (broad lexical/source coverage)
        └── source/intake         (new candidate material)
                │
                ▼
Research OS semantic-relation candidates
                │
          controls + provenance
                │
          Human/owner qualification
                │
                ▼
Reality Graph durable typed relation
                │
                ▼
Research Result Bundle / Synthesis
```

## 2. Live baseline — 2026-09-23

### Gematria corpus

- `gematria_words`: **15,521**
- engine-verified: **12,642** (~81.45%)
- published: **12,598** (~81.17%)
- graph-linked: **505** (~3.25%)
- tagged: **2,000** (~12.89%)
- Hebrew-like exact expressions: **14,002** (~90.21%)
- distinct recorded sources: **188**

Large categories include:
- `מאגר_ערכים`: 7,275
- uncategorized: 2,949
- `כללי`: 2,533
- `משיח`: 1,090
- `יהוה`: 424

### Lexical coverage

`maftech_lexicon`:
- total: **43,510**
- Tanakh: **41,523** (~95.43%)
- core: **4,529** (~10.41%)
- both Tanakh + core: **2,547** (~5.85%)

### Alias/identity layer

`word_aliases`:
- total: **7**
- verified: 7
- English aliases: 5
- translations: 2

This small size is not automatically a defect. Alias is identity/representation work, not a place to store every synonym.

### Graph / relation layer

`edges`: **7,111**

Largest relation types:
- mentions: 2,700
- contains: 2,289
- related: 863
- equals: 392
- scale_x10: 301
- converges_on: 174
- cross: 65
- opposite_of: **1**

`relation_evidence`: **132**, dominated by method/cipher/research relations such as:
- cipher_link;
- mirror;
- complement;
- hidden;
- progression;
- convergence_candidate;
- cross_method_convergence.

### Baseline conclusion

**Lexical quantity is already large; typed lexical-semantic relation coverage is sparse.**

Therefore the next expansion program prioritizes **semantic relation evidence and controls**, not indiscriminate expression volume.

---

## 3. Three existing corpus roles — do not collapse them

### A. Calculation/Search Corpus
Owner: Gematria / Corpus Admission.

Exact expressions and their governed method vectors.

### B. Lexical Coverage
Current major input: `maftech_lexicon` + source/intake owners.

Useful for:
- existence;
- source/Tanakh coverage;
- lexical candidate discovery.

It is not automatically a semantic-relationship truth store.

### C. Semantic Relation Research
Owner: Research OS → qualified durable relation may later project to Reality Graph.

Useful for:
- synonym candidate;
- antonym/opposition;
- same-root family;
- derivation;
- concept↔expression;
- contrast;
- whole/part;
- agent/action;
- cause/effect hypothesis.

These roles consume the same Reality, but they are not interchangeable.

---

## 4. Semantic candidate roles

F5 defines **research roles**, not new canonical Graph relation vocabulary:

- `synonym_candidate`
- `antonym_candidate`
- `contrast_candidate`
- `same_root_family_candidate`
- `derived_from_root_candidate`
- `whole_part_candidate`
- `agent_action_candidate`
- `cause_effect_candidate`
- `concept_expression_candidate`
- `translation_candidate`

The candidate remains a Research object/shape until an existing owner qualifies the durable relation.

### Critical identity rule

```text
semantic similarity != same identity
same root != synonym
same value != semantic relation
translation != calculation identity
word alias != general synonym
```

Exact orthography remains first-class because Gematria depends on exact expression.

---

## 5. Selection provenance — anti-post-hoc control

This is load-bearing.

A semantic pair can be selected:

- **PRE_NUMERIC_SOURCE** — external/source relation chosen without consulting SOD1820 numeric match;
- **PRE_NUMERIC_HUMAN** — Human-curated pair frozen before numeric investigation;
- **NUMERIC_BLINDED_CORPUS** — pair selected by a corpus process blind to target numeric outcomes;
- **POST_NUMERIC_INTERPRETATION** — semantic reading proposed after seeing the numeric result;
- **UNKNOWN**.

Only the first three may validate whether Numeric/Cross research discriminates semantic relations.

A post-hoc relation may still be interesting Research, but:

> **a relation discovered after seeing the number cannot prove that the number discovered the relation.**

This must survive all AI/UX projections.

---

## 6. Evidence classes

Candidate evidence remains typed:

- SOURCE_ATTESTED
- HUMAN_CURATED
- ENGINE_DERIVED
- MODEL_PROPOSED
- CORPUS_STATISTICAL
- NEGATIVE_CONTROL

A model-proposed pair with no independent source/human support stays a proposal and is never auto-promoted.

Multiple source records for the same semantic candidate consolidate before fragmenting.

---

## 7. Semantic control matrix

Every important candidate family should eventually support matched controls.

For pair A↔B compare against decoys matched where practical by:

- language;
- expression length;
- corpus frequency;
- source stratum;
- morphological/root family.

Control families:

1. unrelated matched expressions;
2. same-root but not synonymous;
3. same-value but semantically unrelated;
4. synonym/near-synonym;
5. antonym/opposition;
6. contrast pair;
7. random corpus pair.

Questions:

- Does Cross/multi-method strength distinguish known semantic relations from matched unrelated pairs?
- Does any lift disappear after controlling for same-root morphology?
- Does equal Gematria alone explain the effect?
- Does performance survive held-out pairs?
- Does it survive corpus/version changes?

This is where SOD1820 can move from “interesting equality” toward empirical **discrimination research**.

---

## 8. Corpus growth changes expectedness

Any corpus expansion increases the search space.

Therefore rarity/strength labels require a versioned baseline.

The F5 baseline contract records:

- corpus population;
- verified population;
- source count;
- graph relation inventory;
- relation-evidence inventory;
- category distribution;
- relevant owner/version refs.

A change-control policy must declare explicit thresholds.

There is **no hidden default percentage**.

Example policy questions:

- how much population change requires recomputing value frequencies?
- does adding a major semantic-relation family require new Cross expectedness?
- does an engine/method version change invalidate historical controls?

When recalibration is required:

> old rarity/expectedness labels do not silently survive.

---

## 9. Statistical boundary

An equal-cap stratified research sample is useful for **coverage/audit**, not population prevalence.

Any future corpus study must label whether it is:

- full-population descriptive;
- random sample;
- stratified sample;
- case-control;
- holdout;
- convenience/human-curated sample.

No “X% of Hebrew words…” claim may be made from a design that cannot support prevalence.

---

## 10. Expansion priorities

### Priority A — independent semantic controls

Highest research value because they allow us to test the engines.

Build source-attested/blind sets of:
- synonyms;
- antonyms;
- same-root non-synonyms;
- unrelated controls.

### Priority B — root/morphology map

Separate morphology from semantics.

A root relation is useful but must never be treated as synonymy.

### Priority C — Concept ↔ exact Expressions

A stable Concept may gather many exact expressions while preserving every calculation identity separately.

### Priority D — source/context relations

Tanakh/source co-occurrence and explicit textual relation are separate evidence dimensions.

Co-occurrence != synonym.

### Priority E — broader modern Hebrew coverage

Only after source/license/provenance review and Admission routing.

### Priority F — model suggestions

AI may propose missing relation candidates, prioritization or source searches.

AI does not create semantic fact by proposal volume.

---

## 11. Source expansion protocol

Before importing any external lexical source:

1. identify source/edition/version;
2. verify allowed use/licensing;
3. define exact data role;
4. preserve original expression and source locator;
5. map identity vs semantic relation explicitly;
6. route new expressions through Corpus Admission;
7. route semantic pairs through Research OS candidate path;
8. do not write Graph edges in bulk;
9. build controls before using the new source to raise Research Strength;
10. recompute affected base-rates after material growth.

### Source roles should stay distinct

- dictionary/lexicon assertion;
- source-text occurrence;
- translation;
- morphology/root;
- semantic relation;
- human interpretation;
- model proposal.

---

## 12. Negative corpus is first-class

To learn anything, SOD1820 needs not only “interesting pairs” but also pairs that should **not** match semantically.

Negative/control data can include:

- matched unrelated expressions;
- same numeric value but unrelated;
- same root but semantically distant;
- same length/frequency but unrelated;
- model-suggested false positives rejected by Human/source review.

Negative examples remain control evidence, not “bad words” and not hidden.

---

## 13. Learning loop

Future learning flow:

```text
pre-numeric semantic pairs + matched controls
        ↓
freeze train / calibration / holdout split
        ↓
run canonical Cross/Research features
        ↓
dependency normalization
        ↓
measure discrimination
        ↓
Champion vs Challenger semantic-ranking policy
        ↓
privacy/statistical review
        ↓
Human Gate
```

The learner may discover:

- some method families add no discrimination;
- some Cross patterns are high-base-rate noise;
- some semantic families respond differently;
- some corpus strata behave differently;
- simple features beat AI interpretation.

All are acceptable outcomes.

No learned pattern auto-rewrites Gematria method meaning or global Number meaning.

---

## 14. Corpus ↔ Synthesis

Synthesis may consume corpus context such as:

- current baseline/version;
- value frequency;
- candidate semantic relation;
- relation selection provenance;
- control result;
- source attestation;
- relation family;
- holdout status.

It must preserve:

```text
numeric equality FACT
semantic relation SOURCE/RESEARCH STATUS
control/statistical result
interpretation/message
```

as separate layers.

A strong message can be weakened when:
- semantic link is post-hoc;
- value is very common;
- matched decoys perform similarly;
- relation is same-root only;
- the corpus grew and rarity is stale.

---

## 15. Performance

Do not query all pairwise combinations at request time.

### Offline / compile-on-change

- value frequency tables/materialized outputs under existing owner if later justified;
- semantic candidate index;
- source/version baseline;
- precomputed relation-control fixtures;
- Cross candidate shortlists.

### Request time

- load current baseline/version;
- retrieve subject slice;
- run bounded owner-native features;
- use cached controls/expectedness;
- call AI only after deterministic compression.

Information Gain decides deeper expansion.

---

## 16. Privacy

Public lexical corpus and private Person research must not collapse.

A Person-derived expression/relation:
- stays private by default;
- cannot become global semantic training data merely because it helped a private reading;
- may enter shared Intake only through explicit authorized submission/review.

Cohort learning uses privacy-safe aggregate features, not raw private texts.

---

## 17. F5 implementation phases

### F5.0 — Baseline contract
- normalized corpus snapshot;
- coverage metrics;
- relation inventory;
- deterministic change fingerprint;
- explicit recalibration policy.

### F5.1 — Semantic candidate envelope
- typed research roles;
- source/evidence provenance;
- pre/post-numeric selection provenance;
- no auto alias/admission/edge.

### F5.2 — Consolidation
- same candidate + multiple sources → additive evidence;
- no object per recurrence.

### F5.3 — Control plan
- matched unrelated;
- same-root;
- same-value;
- held-out relation pairs.

### F5.4 — External source audit
- source/license/edition;
- useful fields;
- expected coverage gain;
- privacy and provenance;
- import route.

### F5.5 — Corpus admission batches
Only after Human/owner approval.
No mass write from this contract.

### F5.6 — Base-rate rebuild
Recompute affected expectedness after material expansion.

### F5.7 — Semantic discrimination benchmark
Evaluate Cross/Research features against pre-numeric semantic holdout.

### F5.8 — Champion/Challenger
Candidate ranking policy only; no auto promotion.

---

## 18. Acceptance gates

F5 is not mature until:

1. no semantic relation is stored as alias merely for convenience;
2. no synonym/root import bypasses Corpus Admission/Research OS;
3. every candidate has provenance;
4. selection provenance distinguishes pre- vs post-numeric discovery;
5. post-hoc semantic pairs cannot validate the numeric feature that produced them;
6. same-root and same-value controls are explicit;
7. corpus growth invalidates stale base-rates under an explicit versioned policy;
8. no stratified sample is presented as population prevalence without weighting;
9. model-proposed semantics never auto-promote;
10. Reality Graph receives only qualified durable relations through its existing governance;
11. Synthesis can explain why a semantic signal was strengthened or weakened;
12. negative/control evidence remains visible.

---

## 19. Roadmap role

This document is the detailed F5 execution map.

`SOD1820_MASTER_ROADMAP.md` remains navigation/priority only.

The parent program is:

`docs/2029-research-synthesis-calibration-foundation-v1.md`

No future agent should require ZURIEL to remember:
- corpus expansion;
- base-rate recalibration;
- semantic controls;
- relation-source provenance;
- holdouts;
- root/synonym/antonym coverage;
- negative examples.

They belong to this program.
