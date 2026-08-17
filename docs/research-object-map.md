# SOD1820 — Research Object Map

**Status:** Strategy memo / not implementation
**Author:** GPT — Research Agent 2
**Human-Gate:** ZURIEL
**Branch:** `gpt/research-object-map`

## Purpose

Preserve the current research-system model so future sessions can continue without reconstructing the architecture from memory.

The immediate goal is to model the research objects first, then map the existing ELS capabilities onto them. No new engine, parallel tree, or duplicate subsystem is implied by this document.

## Core separation

The system must keep three layers distinct:

1. **DATA** — what the engine actually found or calculated.
2. **RESEARCH** — what the human researcher is investigating, testing, and deciding.
3. **INTELLIGENCE** — what AI proposes, prioritizes, summarizes, or infers.

AI suggestions are never automatically canonical facts, publications, or human decisions.

## Research objects

### 1. Entity
The research subject or graph entity: person, name, place, event, date, number, concept, signal-derived entity, etc.

### 2. Term
A word or phrase that can be searched or tested. Track whether it is source-derived, system-suggested, researcher-selected, or rejected.

### 3. Axis
A research axis: term, skip, direction, start/occurrence, geometry, scope, verse context, calculation and provenance. An axis can generate a new axis through a finding.

### 4. Finding
A concrete research result: what term/axis was found, where, under what conditions, with skip/distance/direction/geometric context, ranking, rarity and provenance.

### 5. Cluster
A group of findings that converge on the same region, entity, concept, or research structure.

### 6. Candidate
A system-generated or human-suggested thing worth checking. Candidate is not a finding and is not a fact.

### 7. Hypothesis
A proposition the researcher wants to test. It remains a hypothesis until supported or rejected by evidence.

### 8. Experiment
A hypothesis plus explicit method, conditions, search space, tools, result and evaluation.

### 9. Evidence
The underlying observable/calculated datum: occurrence, coordinate, skip, distance, value, source passage, etc. Evidence must remain distinct from interpretation.

### 10. Interpretation
A human or AI explanation of what evidence may mean. Interpretation is not automatically fact.

### 11. Research Path
The trace of the investigation: entity → term → axis → finding → cluster/new axis → hypothesis → experiment → analysis → interpretation.

### 12. Research Case
The top-level research container: question, entities, terms, axes, findings, clusters, candidates, hypotheses, experiments, sources, decisions, interpretations and conclusions.

### 13. Matrix State
The current matrix/workspace state: text, axis, geometry, zoom, focus, findings, display mode, 3D/simulation state, film/presentation state, etc. Matrix State is a workspace, not the research itself.

### 14. Source
An external or originating source: article, post, image, video, verse, document, user contribution, AI-generated suggestion, etc. Provenance must remain attached.

### 15. Signal
A real-world/external signal such as a news item. A signal can yield entities, dates, numbers and terms for research, but it is not itself a canonical research fact.

### 16. Research Plan
A structured plan for answering a research question: strategy, anchors, tools, check order and confidence. It belongs to the research lifecycle rather than becoming a second engine.

### 17. Recommendation
A proposed next action, such as checking a candidate term or opening a related axis. Recommendation is actionable intelligence, not a decision.

### 18. Decision
A human-gated choice: accept/reject candidate, keep/discard hypothesis, promote/reject finding, etc. ZURIEL is the Human-Gate.

### 19. Research Snapshot
A saved reproducible state of a research session: matrix state + active terms/axes/findings + path/context.

### 20. Conclusion
The conclusion of a research case. It is a research conclusion, not automatically a canonical fact.

## Core lifecycle

```text
SOURCE
  ↓
SIGNAL
  ↓
ENTITY
  ↓
TERM
  ↓
RESEARCH PLAN
  ↓
CANDIDATE
  ↓
HUMAN CHOICE
  ↓
AXIS
  ↓
MATRIX STATE
  ↓
FINDING
  ├──→ EVIDENCE
  ├──→ CLUSTER
  └──→ NEW AXIS
          ↓
      HYPOTHESIS
          ↓
      EXPERIMENT
          ↓
       ANALYSIS
          ↓
    INTERPRETATION
          ↓
      CONCLUSION
          ↓
    RESEARCH CASE
```

## Architectural implication

The key UX question is not "where does this button go?" but **"which research object does this capability operate on?"**

Examples:

- Monte Carlo / simulation → the relevant finding/axis/experiment object.
- `↑ Axis` → a finding or axis transition.
- AI-generated search term → candidate.
- Zoom / geometry / playback → matrix state.
- Return to investigation → research path/case.
- AI next-step suggestion → recommendation.
- Accept/reject → decision.

This object-first model is intended to reduce UI proliferation and prevent duplicate concepts.

## Next step — DO NOT BUILD YET

Create a **Capability → Object Map** for the 78 capabilities identified by the ELS research.

For each capability, determine:

1. Primary research object.
2. Secondary object(s), if any.
3. Whether the capability already exists in the current system.
4. Whether it duplicates another capability.
5. Whether it is DATA, RESEARCH, or INTELLIGENCE.
6. Whether a missing underlying object is blocking implementation.
7. Whether the capability changes the roadmap priority.

The output should identify missing primitives and duplicates **before any implementation begins**.

## Guardrails

- One engine, many sources, one graph/tree, one Human-Gate.
- Do not create a parallel engine/table/tree merely to support the model.
- Keep source → extraction → calculation → cross-check → interpretation separate.
- Claim ≠ Fact; HOT ≠ TRUE; VIP ≠ TRUE; CANONICAL ≠ PUBLISHED.
- Rank, don't hide weak material.
- Preserve provenance; do not silently delete research material.
- Gematria must use the canonical engine functions, never memory/manual arithmetic.
- No promotion to canonical or publication by AI alone.

## Current status

**Completed:** Research Object Map captured as a durable strategy document.

**Not completed:** Capability → Object Map for the 78 ELS capabilities.

**Next action:** Map the 78 capabilities to these objects, identify duplication/gaps, then decide what (if anything) needs to be built.
