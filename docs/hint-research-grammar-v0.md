# SOD1820 — Hint Research Grammar v0

**Status:** PROVISIONAL RESEARCH CONTRACT v0 · Human-Gate ZURIEL approved this documentation pass on 28.8.2026.  
**Scope:** docs-only · no schema · no migration · no engine · no store · no UI · no canonical promotion · no publication.  
**Purpose:** formalize the research grammar by which a raw encounter can become a structured research hint without collapsing observation, derivation, recurrence, convergence, interpretation and truth into one thing.

This document **does not create a new Hint system**. It crosswalks and extends the existing Research Intake, Research Convergence, Personal Hint, Reality Graph and Human-Gate contracts. Existing source-native homes remain authoritative. A hint is a research lens/workflow over existing sources and Findings, not a fourth truth store.

---

## 1. Core law

A hint is not a fact and not an interpretation. It is a **research path** that may begin with an encounter and may, after independent corroboration and Human-Gate judgment, contribute evidence to a larger Research Convergence.

Canonical research order:

`Encounter → Capture → Attention → Observation → Derived Representation → Recurrence → Cross-domain Convergence → Interpretation → Human Gate`

The stages are intentionally non-equivalent:

`Encounter ≠ Capture ≠ Attention ≠ Observation ≠ Derived Representation ≠ Recurrence ≠ Convergence ≠ Interpretation ≠ Decision ≠ Canonical ≠ Published`

The engine discovers and organizes. ZURIEL researches, interprets and chooses.

---

## 2. Stage definitions

### 2.1 Encounter

Something occurs or is encountered: a time, number, date, image, headline, name, phrase, event, message, ELS result, post, source passage, personal occurrence or external signal.

Encounter is **not yet a claim**. Its first responsibility is preservation.

### 2.2 Capture

Preserve the source as encountered, with enough provenance to reconstruct what was actually seen.

When applicable, preserve:
- original text/value/media/reference;
- timestamp and timezone;
- source identity and source-native id;
- surrounding context;
- representation/version/edition where relevant;
- who supplied or captured it.

A later derivation must never overwrite the original Capture.

### 2.3 Attention

A researcher notices that something may be significant.

Attention is a valid research signal but has **zero truth force by itself**. It may affect ranking or which item is investigated next, but:

`Attention ≠ Evidence · Attention ≠ Fact · Attention ≠ Canonical`

This preserves intuition as research material without promoting intuition to truth.

### 2.4 Observation

State only what can be observed from the Capture before interpretation.

Examples of valid observation forms:
- “The displayed time is 13:52.”
- “The image contains the number 1352.”
- “This source was published on date X.”
- “The phrase appears in this source.”

Observation must be reproducible from the preserved source whenever possible.

### 2.5 Derived Representation

A lawful research transformation of an observed representation.

Examples may include digit-joining, normalization, language representation, numeric-language conversion, segmentation, or another registered/reproducible transformation.

Requirements:
- preserve the original observation;
- name the transform;
- preserve transform/version/procedure when applicable;
- keep result classified as **derived**, not original fact;
- route mathematical/gematria verification through canonical engines only.

Example:

`source_time="13:52" → transform=digit_join → derived_number=1352`

This means “1352 is a derived research representation of 13:52,” **not** “13:52 mathematically equals 1352.”

### 2.6 Recurrence

A structure appears again in another observation.

Recurrence must preserve the identity of each occurrence and its provenance. It may strengthen research interest, but recurrence alone does not prove interpretation.

### 2.7 Cross-domain Research Convergence

Multiple Findings/Evidence streams from materially independent sources, engines or domains converge on a common research center.

Research Convergence is distinct from Method Convergence. It can include, for example, event/date evidence, historical material, a gematria result, an ELS finding, a gallery signal, a textual source or another independent research domain.

No engine is required to write to one universal convergence table. The convergence is a Research OS relation/view over source-native evidence and existing research structures.

### 2.8 Interpretation

The researcher proposes what the structure may mean.

Interpretation must be visibly separated from observation, engine verification and source evidence. Later interpretation may be added without rewriting the historical observation as though that meaning was known at capture time.

### 2.9 Human Gate

AI/engines may discover, calculate, rank, group and propose. They do not canonize or publish.

ZURIEL remains the Human Gate for promotion decisions.

---

## 3. Chronology of knowing

SOD1820 must preserve not only **when an event happened**, but also **when a meaning, relation or interpretation became known**.

An old observation may remain meaning-unknown for years and later acquire a research relation.

Correct pattern:

- `T1: Observation captured; interpretation unknown.`
- `T2: New evidence/engine relation discovered.`
- `T3: Interpretation proposed.`
- `T4: Human-Gate decision, if any.`

Never rewrite T1 as if T2/T3 knowledge already existed at T1.

This is provenance of knowledge formation: **event chronology and knowledge chronology are separate dimensions**.

---

## 4. Independence and anti-inflation law

### 4.1 Same-source derivation is not automatically independent evidence

Two representations derived from the same Capture may form a legitimate internal pattern, but they do **not** automatically count as two independent evidence sources.

Example:
- one screenshot shows `1352`;
- the same screenshot timestamp shows `13:52`;
- digit-join produces `1352`.

This can be recorded as a meaningful **within-source structural match**, but the system must retain common lineage to the same Capture and must not inflate it into two independent sources.

### 4.2 Independence is a research property, not a row count

`number_of_rows ≠ number_of_independent_evidence_streams`

Independence assessment should consider lineage, source identity, derivation dependencies, engine dependence, shared operands and whether one result was intentionally generated from another.

### 4.3 Post-hoc targeting must remain visible

A search deliberately initiated to find a desired number/pattern is not epistemically identical to an independently pre-existing occurrence.

Both can be researched, but provenance must distinguish:
- pre-existing/untargeted occurrence;
- targeted follow-up test;
- transformation selected after seeing the target;
- independently archived material predating the current interpretation.

The system ranks these; it does not hide them.

---

## 5. Source and truth separation

A single research thread may contain all of the following at once, but they remain distinct:

- **Input / Capture** — what entered the system.
- **Observation** — what the source visibly contains.
- **Calculation** — deterministic engine output.
- **Discovery** — what the system found.
- **Finding** — structured research result.
- **Evidence** — support offered for a claim/relation.
- **Claim** — proposition being tested.
- **Fact** — verified factual statement within its domain.
- **Interpretation** — meaning proposed by a researcher.
- **Recommendation** — suggested next research action.
- **Decision** — Human-Gate judgment.
- **Canonical** — accepted into canonical knowledge.
- **Published/Visible/Accessible** — separate product/access states.

No stage inherits the status of another automatically.

---

## 6. Crosswalk to existing SOD1820 Foundation

This grammar reuses existing architecture rather than creating a new subsystem:

- **Research Intake:** Source → Extraction → Research Object/Claim → Verification → Human Gate.
- **Research Convergence:** independent Findings/Evidence from multiple domains may converge around one research center without a universal engine anchor.
- **Personal Hint / Synchronicity Lens:** personal times/dates/events may generate explicit derived representations and route to existing Tanach/Numeric/Gematria/ELS/Spatial engines; Personal Hint ≠ Fact ≠ Canonical Relation ≠ Divine Sign.
- **Reality Graph:** identity is independent of representation; Post/Image/Video/Signal/Transcript may be graph-addressable representations without becoming canonical truth.
- **Research Context:** query-time composition/lens, not a new persistence table.
- **Human Gate / Unified Judgment:** AI may propose; ZURIEL decides.

Therefore: **no new `hints` table, Hint engine, Hint graph, Research Context store or parallel convergence store is authorized by this contract.**

---

## 7. Minimal research record shape — conceptual, not schema

The grammar needs the following information to remain representable somewhere in existing source-native/research structures. This is a conceptual contract only; it does not prescribe a table.

```text
source_ref
capture_context
observed_at
captured_at
timezone?
observation
representations[]
  - kind
  - value
  - transform
  - transform_version?
  - derived_from
verification[]
findings[]
lineage_refs[]
independence_notes?
interpretations[]
  - statement
  - proposed_at
  - proposed_by
human_decisions[]
```

If existing homes can carry these semantics through refs/meta/provenance, they must be extended rather than replaced.

---

## 8. Foundation Expansion Gate

**Verdict: FOUNDATION SUFFICIENT for Hint Research Grammar v0.**

### MUST FOUNDATION NOW

**None identified.** No missing capability currently requires a new schema, engine, graph or store to avoid foreseeable redesign.

### EXTENSION POINT NOW

1. **Transformation provenance** — ensure derived representations can preserve transform identity/version/procedure and lineage to the exact source observation.
2. **Chronology of knowing** — preserve observation time separately from discovery/interpretation/decision time.
3. **Evidence-lineage / independence accounting** — prevent multiple derivatives of one Capture from being counted as independent evidence.
4. **Personal Hint lens in Research Context** — query/route existing personal/source material through existing engines without a Personal Hint engine.
5. **Targeted-vs-pre-existing provenance** — preserve whether a result predated the hypothesis or was generated by a directed follow-up search.

These are contract/representation extension points; they do not justify implementation now unless a real corpus stress test demonstrates a concrete representation failure.

### LATER

- automatic recurrence detection;
- convergence scoring/ranking;
- personal hint UI;
- bulk import of historical Notes/screenshots;
- alerts such as “this structure appeared again”;
- automatic cross-domain investigation orchestration;
- presentation/visualization of hint families.

---

## 9. Stress-test protocol before any v1 freeze

The next version must be tested against materially different real cases, not theory alone.

Initial calibration set:

1. **1237 historical thread** — test chronology-of-knowing: observation first, meaning/relationship discovered years later.
2. **Miron 14/45 thread** — test event/date/source lineage and whether multiple manifestations are actually independent.
3. **67 / 676 / 776 thread** — test a broad structural research grammar spanning historical corpus, numbers, concepts, multiple representations and later convergence layers.

For each case, map explicitly:

`Capture → Observation → Derivation → Engine verification → Recurrence → Independence → Convergence → Interpretation → Human decision`

The test is not “can we make it fit?” The test is:
- can every step retain provenance;
- can uncertainty remain uncertainty;
- can derived evidence avoid double-counting;
- can later meaning be added without rewriting history;
- can multiple domains converge without creating a parallel system;
- can the same contract handle all cases without source-specific hacks.

If not, report the exact representation failure before changing Foundation.

---

## 10. Non-goals

This v0 does **not**:
- declare any numerical interpretation true;
- engine-verify 1237, 14/45, 67, 676 or 776;
- define a universal “law of hints”;
- define a metaphysical truth model;
- promote a personal synchronicity to Fact/Canonical;
- authorize mass ingestion;
- authorize automatic canonization/publication;
- replace source-native truth;
- redesign existing UI;
- create a second Reality Graph, Research OS, Intake pipeline, Human Gate or convergence system.

---

## 11. Operating principle

**Foundation → Projection → Experience.**

**Preserve capability, truth and provenance — not necessarily the legacy interface.**

The purpose of Hint Research Grammar is not to prove every pattern. Its purpose is to let SOD1820 preserve, investigate, compare and challenge patterns without destroying chronology, provenance, independence or the distinction between discovery and truth.
