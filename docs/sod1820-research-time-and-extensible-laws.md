# SOD1820 — Research Time Layer + Extensible Research Laws

**Status:** APPROVED strategic requirements / not implementation
**Author:** GPT — Research Agent 2
**Human-Gate:** ZURIEL
**Branch:** `gpt/research-object-map`
**Date:** 2026-08-17 (Asia/Jerusalem)

> This document is a strategic addendum to the SOD1820 Whole-System Product Map. It does not authorize code, DB/schema changes, migration, UI implementation, merge, deploy or canonical promotion of any new mathematical/research law. It records the approved product/architecture direction so future sessions do not reconstruct it from memory.

---

## 1. Core decision

SOD1820 must remain an **open research system**. The research model must be extensible so that a new research law, numerical relationship, pattern family, geometry criterion or date interpretation can be added later without dismantling the engine, rebuilding the graph, or creating a parallel system.

The architectural rule is:

> **New law = new registered research rule/capability on top of the shared substrate; never a new engine, parallel tree or alternate source of truth.**

A rule may be:

`idea → candidate → reconstructed → verified → approved/canonical`

according to the existing governance. Until verified and approved, it is not a fact and must not silently alter ranking, canonical knowledge or publication.

---

## 2. Shared Research Time Layer

### 2.1 Time is a first-class research dimension

The system must support a single shared **Research Timeline** across the entire site.

A date-like finding may connect:

`Source → Term/Expression → Derived Date Candidate → Year/Date → Timeline Position → Event → Other Research Objects`

The same object can be reached in reverse:

`Known Event/Year → Timeline → Candidate Expressions → ELS / Gematria / Sources → Findings`

This is a **view/capability over shared Research Objects**, not a separate timeline database or research engine.

### 2.2 Date candidate ≠ confirmed date

A date-like expression found in ELS, gematria or another source must preserve separate epistemic layers:

- **FACT:** the exact expression/text that was found.
- **DERIVED:** the deterministic numerical/calendar interpretation produced by a registered rule.
- **INTERPRETATION:** historical or thematic meaning assigned to the date.
- **CONFIDENCE:** how unambiguous the date interpretation is.
- **PROVENANCE:** source, extraction, rule/version, calculation and researcher who supplied/approved it.

A year such as a Hebrew year-form must not automatically become a historical fact merely because the text resembles a year.

### 2.3 Temporal anchors

Existing strong, human-reviewed date-linked ciphers may become **Temporal Anchors**.

A Temporal Anchor is not automatically a proof. It is a stable research object that permits later research to ask:

- What other findings occur around this year?
- Do independent ciphers converge on the same period?
- Are multiple sources linked to the same date?
- Does a finding connect to a known event?
- Are there unusual clusters around a period?

The anchor retains full provenance and its original evidence.

### 2.4 Timeline views

The future timeline must support at least these views without creating separate systems:

1. **Chronological:** events/findings ordered in time.
2. **Entity:** people, places, numbers and terms attached to a period.
3. **Research:** ciphers, findings, hypotheses and evidence attached to a period.
4. **Cross-time:** multiple independent findings that converge on the same period.
5. **Reverse-time search:** start from a year/event and search the shared research substrate.

No automatic claim of significance follows from density alone. Density is a research signal that can trigger a bounded experiment.

---

## 3. Numerical scale / zero relationships

SOD1820 may investigate **scale relationships** between numbers, including relationships such as removing/adding trailing zeroes or other explicitly registered transformations.

Example research family:

`358 ↔ 3580 ↔ 35800`

The system must not describe these as ordinary numerical equality. Instead it records the transformation:

`3580 ÷ 10 = 358`

and may expose the two values as members of a **Scale Family**.

Similarly, the existing "moving zero" and related numerical interpretations are research transformations, not replacements for the underlying FACT value.

### Required separation

- `value` = actual calculated number.
- `transform` = deterministic operation used to relate values.
- `derived_family` = group of values connected by the transform.
- `interpretation` = human/research reading of that relationship.

This preserves mathematical correctness while allowing the research layer to discover families across orders of magnitude.

---

## 4. Moving-leading-digit / "one" relationships

The existing research idea that a leading `1` may be interpreted as a separate layer (for example `1358 → 358`) remains an **interpretive research transformation**, not a numerical identity.

The system may represent:

`1358 → remove-leading-1 → 358`

as a transformation candidate and then independently verify what 358 connects to in the shared graph.

The transformation itself must be stored separately from the conclusion drawn from it.

This allows the same framework to support future researcher-defined transformations without hard-coding a growing list of special cases into the ELS or gematria engines.

---

## 5. Skip value is a research dimension

ELS skip distance is not merely a display number. It is a first-class feature of a finding and may participate in future research ranking/analysis.

For every ELS finding preserve, where available:

- term
- skip
- direction
- start / exact occurrence
- geometry
- window
- proximity
- gap / spacing
- occurrence count
- corpus/scope
- ranking inputs
- provenance

A skip value can become especially interesting when it combines with other independent structure, but **skip value alone does not establish meaning**.

The system must therefore support research questions such as:

- Are certain skip values unusually represented among a set of findings?
- Does a skip value recur across independent axes?
- Does the skip value connect to a number already present in the graph?
- Does the same value appear in time, gematria or other research layers?

Any statistical conclusion requires an explicit null model and a bounded experiment.

---

## 6. Geometry and structured-cipher preference

The research layer must preserve geometry as a real research object/capability, separate from purely visual zoom/focus.

A finding may contain:

- axis orientation
- row/column geometry
- matrix dimensions
- line/shape structure
- crossing density
- symmetry / repetition
- compactness
- secondary axes
- relative placement of related terms

A future **structured-form score** may help rank findings that exhibit unusually organized geometry, but it must never silently replace the current engine ranking.

The product principle is:

> **Interesting geometry is a reason to investigate, not a declaration of truth.**

Particularly structured findings may justify a deeper spatial analysis, including 3D, provided the same finding identity and provenance survive every view.

---

## 7. Secondary axis → primary axis

The research loop must support:

`Finding → Promote to Main Axis → Research Around New Axis`

The previous axis remains preserved as part of the Research Path / evidence history. The promotion is a navigation/research action, not deletion or replacement of history.

This creates a potentially unbounded but **user-controlled** research graph:

`Axis A → Finding B → Axis B → Findings C → Axis C ...`

The system must prevent this from becoming uncontrolled automatic search expansion. Each transition is an explicit research step and is recorded in the Research Path.

---

## 8. Future-law registry: open by design

The system must be able to receive a new law tomorrow without structural surgery.

Examples of future research-law families include:

- new numerical transformations
- new skip-pattern families
- new date/calendar interpretation rules
- new geometry/shape descriptors
- new source types
- new language/orthographic transformations
- new null-model experiments
- new research-quality factors

A future law must declare at minimum:

`law_id · name · domain · input · deterministic rule · output · version · status · provenance · dependencies · cost · risk`

and, where it affects discovery/ranking:

`coverage · decision impact · null model / validation method`

No new law may silently become canonical merely because it is implemented.

---

## 9. Research ranking: structure without hard-coded bias

The product may eventually rank findings using multiple independent dimensions:

`tightness + proximity + rarity + length + geometry + skip-pattern + cross-layer support + temporal support`

but these factors must remain inspectable and separately measurable.

No single factor (for example skip, rarity or visual compactness) may silently dominate the score without measurement.

The existing ELS quality-model issue is explicitly relevant here: changing ranking can alter which findings are displayed and can affect previously stored quality values. Any future quality-model change therefore requires:

1. proposal
2. benchmark
3. regression over saved findings
4. impact analysis
5. Human-Gate

---

## 10. AI role in the expanded research system

AI operates as a **Research Navigator**, not as a source of truth.

For time/scale/geometry/ELS research it may:

- identify candidate research paths
- rank candidate next steps
- estimate cost/value
- challenge a finding
- propose null models
- detect dependence on parameters
- detect post-hoc selection risk
- compare alternative explanations
- summarize evidence
- suggest which existing capability should be used next

AI must not:

- invent calculated values
- silently expand the search space
- turn candidates into facts
- promote to canonical
- publish
- override the Human-Gate

### AI Research Budget

Every deep research proposal should be bounded by a budget covering at least:

`estimated compute · search-space size · expected value · coverage · risk · decision impact`

The AI should prefer the cheapest test that could change the decision.

### AI Challenge Mode

For important findings, the system should be able to ask:

- What is the strongest alternative explanation?
- What null model would produce similar results?
- Which parameter choices produced this result?
- Was the target selected after seeing the result?
- Would the finding survive a pre-registered/bounded test?
- What evidence is independent?

This is a research-control layer, not a second engine.

---

## 11. Shared views and identity preservation

2D, 3D, Source, Numerical, Graph, Timeline and Experiment are all views/capabilities over the same Research Objects.

A finding must preserve the same:

`finding_id · provenance · evidence · source · engine/version · parameters`

when opened in another view.

The 3D system remains:

> **Matrix State / Spatial Analysis capability**

not a second ELS engine.

---

## 12. Research Path / Timeline / Snapshot

Every meaningful research session should eventually be reproducible through:

- **Research Path:** ordered actions and transitions.
- **Timeline:** temporal context of evidence/events.
- **Snapshot:** frozen state of the research object set, parameters and engine versions at a moment in time.

A future researcher should be able to answer:

> "How did we get from this input to this finding?"

without relying on memory of a chat session.

---

## 13. Whole-system integration

These capabilities belong to the same shared system as:

- ELS
- Gematria
- Name/Entity Research
- Sources / Tanakh
- Reality Signals
- News / event intake
- Research Contributions
- Research Workspace
- AI / Raziel / Metatron
- Community research
- Timeline
- 2D / 3D / Graph / Experiment views

No separate "ELS timeline", "ELS AI", "ELS graph" or "ELS date engine" should be created.

The shared pipeline remains:

`Raw Input → Extraction → Calculation → Discovery → Evidence → AI/Challenge → Human Decision → Canonical Knowledge`

with provenance preserved at every step.

---

## 14. Decision gate for every future capability

Before building any new capability, evaluate:

`Object → Value → Cost → Coverage → Risk → Decision Impact`

and ask:

> **Can the result change a decision?**

If no, do not spend research compute merely to obtain another number.

The North Star remains:

> **Maximum useful research / Minimum unnecessary computation**

---

## 15. Explicit future ELS research capabilities to preserve in the roadmap

These are roadmap requirements, not claims that they are already implemented:

1. Geometry/window-width control (`cw`) with measured cost.
2. Finding → Main Axis.
3. Axis/secondary-axis exploration.
4. Skip-pattern research (including registered families such as prime/Fibonacci/powers) only after bounded validation.
5. Single-book scope research.
6. Orthographic/spelling variants through the canonical FORMS registry.
7. Before/after-letter transformations.
8. Matrix comparison.
9. Multi-geometry / structured-form analysis.
10. 3D spatial analysis over the same finding state.
11. Quality-model calibration.
12. AI Research Navigator.
13. AI Research Budget.
14. AI Challenge Mode.
15. Research Context integration.
16. Timeline / Temporal Anchors / date candidates.
17. Numerical Scale Families (×10/÷10 and other explicitly registered transforms).
18. Extensible Research Law Registry.
19. Research Path / Timeline / Snapshot reproducibility.
20. Device-adaptive compute routing, without creating a second engine.

The list is intentionally extensible. Adding an item requires the same capability gate; the list itself is not a permission to build.

---

## 16. Canonical epistemic rule

The system must always preserve the distinction:

**FOUND / CALCULATED / DERIVED / CANDIDATE / INTERPRETED / VERIFIED / CANONICAL / PUBLISHED**

A visually impressive ELS shape, an unusual skip, a date candidate, a numerical transformation or an AI explanation may be highly interesting while still remaining a candidate.

The system must rank and preserve such material rather than silently delete it, but it must not upgrade its epistemic status without evidence and the appropriate gate.

---

## 17. Next action

The next formal research step is not implementation.

It is the complete:

`Capability → Object → Value → Cost → Coverage → Risk → Decision Impact`

mapping for the existing 78 ELS capabilities, with the strategic additions above checked for overlap with existing capabilities.

Only after that map is complete should implementation priorities be chosen.
