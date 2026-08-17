# SOD1820 — ELS Foundation Integration Addendum

**Status:** DESIGN / STRATEGY ONLY — no implementation authorization
**Actor:** GPT — Research Agent 2
**Human-Gate:** ZURIEL
**Branch:** `gpt/els-foundation-integration`
**Purpose:** Preserve the ELS foundation decisions that must be known before the later ELS capability build and before the future Raziel/Research Context wiring.

> This document does not authorize code, DB, schema, migration, RLS, GRANT, ELS engine modification, merge, deploy, canonical promotion or publication.

---

## 0. Why this addendum exists

The existing `docs/research-object-map.md` is the whole-system zoom-out. This addendum records the ELS-specific architectural constraints and the decisions established in the current research coordination so the ELS workstream can proceed without redesigning its interfaces later.

The canonical architecture remains:

**ONE SYSTEM · MANY ENTRANCES · ONE RESEARCH CONTEXT · ONE RESEARCH TREE · ONE HUMAN-GATE · MANY ENGINES · MANY SOURCES · MANY SEARCH CAPABILITIES · MANY LANGUAGES.**

ELS is a canonical research engine/capability, not a second research system.

---

# 1. CURRENT ELS CANON — FACTS

The live project contract identifies the ELS implementation as a single canonical engine:

- `/code` and `/research?tool=els` use the same `/tzofen.html?embed=1` artifact.
- Source for the artifact is `tools/els/els-code.template.html`; build through `tools/els/build.py`.
- The corpus source is `tools/els/data/tk-letters.txt`.
- The old React/legacy ELS implementations were removed and must not be restored.
- The canonical geometric search law is `searchSpace(geometry, L)`.
- ELS state is serialized outward from the engine; the host must not calculate ELS.
- ELS Work Area is a view over the same engine, not a fork.

Recent validated ELS work already established:

1. Full legal search-space coverage replaced the historical fixed skip whitelist in the authorized display paths.
2. Saved occurrences are preserved when expanded search space changes ranking/exposure.
3. Search forms/Split-Join were centralized in one FORMS registry and feed the same canonical `findAll`/`run` engine.
4. The default research scope is Torah; Tanakh expansion is an explicit Deep/Advanced operation because it is materially more expensive.
5. Research Journey state can preserve the exact matrix occurrence, including `start`/`hit`, so a saved finding can be reopened without silently finding a different occurrence.
6. State Contract / host receiver / Work Area are serialization and presentation layers, not new ELS engines.
7. Known follow-ups remain separate decision gates: geometry/window width (`cw`), quality/strength model, `clusterStat`/Monte-Carlo scope consistency and cost, performance/Worker, Finding→Axis, spelling variants, skip-series exploration, matrix comparison, Research Context and Raziel.

These facts do **not** mean every current branch change is canonical production state. Branch/commit status must always be read from `work_log` and GitHub provenance.

---

# 2. ELS PRODUCT TARGET

The target is not merely “a better ELS search box.”

ELS should become a **research instrument** whose output can participate in the shared research lifecycle:

```text
Research Question
  ↓
Research Input
  ↓
Research Form / Variant
  ↓
Search Strategy
  ↓
Canonical ELS Engine
  ↓
Matrix / Finding
  ↓
Evidence
  ↓
Candidate / Convergence
  ↓
Challenge / Cross-check
  ↓
Research Object
  ↓
Research Context
  ↓
Raziel
  ↓
Human-Gate
```

The engine calculates. The Research Context remembers. Raziel orchestrates. Challenge tries to break. ZURIEL decides what becomes canonical or published.

---

# 3. ELS IS ONE ENGINE, MANY CAPABILITIES

The future ELS Capability Catalog may contain many capabilities, but they must remain composable views/operations over the same engine.

Examples of capability vocabulary already identified:

- exact search
- multi-term search
- cross search
- reverse/directional search
- full search space
- Atbash
- Albam
- letter substitution
- letter shifts
- mirror/reversal
- reorderings
- split/join
- word-boundary variants
- orthographic variants
- name variants
- transliteration-derived forms
- translation-derived forms
- number/date representations
- Hebrew-year representations
- combined transformations
- geometry/window control
- multi-geometry comparison
- skip-series research
- matrix comparison
- source/verse context
- statistical/null-model checks
- Research Path / replay
- 2D/3D shared views

This is a vocabulary, not a promise that every item must be implemented or exposed.

Before declaring anything missing, audit:

**engine → function → utility → RPC → Research Object → Context → adapter → result payload → provenance → hidden/admin/debug surface → tests → UI.**

---

# 4. ARCHITECTURAL INTEGRITY RULE

If an audit identifies a missing multilingual, search, research or ELS capability, the default assumption is:

> **Extend the existing canonical abstraction; do not replace it.**

A new abstraction is allowed only if the audit proves the existing abstraction cannot represent the required state.

Before proposing a new abstraction, document:

1. why the existing abstraction cannot represent it;
2. which existing abstraction was evaluated;
3. why extension is insufficient;
4. what duplication risk would otherwise occur;
5. the minimum architectural delta.

**GAP ≠ permission to build.**

---

# 5. UI EXPOSURE ≠ ARCHITECTURAL CAPABILITY

The absence of a button, screen, route or UI workflow is not evidence that an engine capability is missing.

Every ELS audit must distinguish:

1. EXISTING + UI EXPOSED
2. EXISTING + NOT UI EXPOSED
3. EXISTING + PARTIALLY EXPOSED
4. EXISTING ENGINE CAPABILITY + MISSING/INCOMPLETE HANDOFF
5. TRULY MISSING

The correct action for an existing hidden capability is usually to expose, compose or extend it — not rebuild it.

---

# 6. MULTILINGUAL FOUNDATION — MUST EXIST IN THE INTERFACE CONTRACT NOW

English, French, Russian and future languages are legitimate research-input languages. They are not merely presentation languages.

The canonical chain is:

```text
ORIGINAL INPUT
  ↓
LANGUAGE
  ↓
DERIVED CANDIDATES
  ↓
SELECTED RESEARCH FORM
  ↓
ENGINE-SPECIFIC SEARCH FORM
  ↓
ENGINE
  ↓
EVIDENCE
  ↓
PROVENANCE
```

The original input is immutable history. It must never be silently replaced.

A multilingual Research Input must be able to preserve:

- `original_value`
- `original_language`
- `input_type`
- `derived_candidates[]`
- derivation type/provenance
- `selected_research_form`
- `research_language`
- `engine_specific_form`
- variants and variant provenance
- selected variants
- search scope
- search intent

Important distinctions:

**ORIGINAL ≠ TRANSLITERATION ≠ TRANSLATION ≠ DERIVED CANDIDATE ≠ SELECTED RESEARCH FORM ≠ ENGINE SEARCH FORM.**

Example:

```text
original_value: "electricity"
original_language: English
candidate: "חשמל"
derivation: translation
selected_research_form: "חשמל"
research_language: Hebrew
engine: ELS
```

The system must preserve that the user originally entered `electricity`.

A different engine may instead research the English form `electricity`. Engine-specific forms are valid and are not contradictory.

No silent English→Hebrew or English→ELS conversion is allowed.

No English ELS engine is implied by this foundation. The first requirement is preservation of the derivation chain so a future engine can consume the correct form without redesign.

---

# 7. RESEARCH INPUT / SEARCH STRATEGY CONTRACT

Every ELS search must eventually be traceable to a Research Input and Search Strategy.

Research Input preserves:

- original input
- language
- research form
- variants
- variant provenance
- selected variants
- search scope
- search intent

Search Strategy is an orchestration layer above engines, not another engine.

It records:

- user request
- proposed checks
- selected variants
- engine
- scope
- parameters
- execution order
- reason for each operation
- reproducibility metadata

The planner must avoid combinatorial explosion. Every transformation may carry cost, priority, confidence, search value, allowed combinations and whether human confirmation is required.

**Infinite capability ≠ infinite execution.**

---

# 8. UNIFIED CONTEXT ITEM CONTRACT

ELS output must be capable of entering the existing unified Research Context item contract rather than inventing an ELS-specific context shape.

Canonical item envelope:

```json
{
  "bucket": "A|B|candidate",
  "context_type": "...",
  "resolved_person_id": "...",
  "via": "...",
  "confidence": 0,
  "owner_person_id": "...",
  "privacy_scope": "...",
  "status": "...",
  "class": "...",
  "is_fact": false,
  "epistemic": "...",
  "source_ref": "...",
  "payload": {}
}
```

For ELS, the payload must preserve the engine evidence without changing its epistemic meaning.

An ELS observation is not automatically an interpretation.

A candidate is not a fact.

A public approved/canonical artifact is not the same thing as a private approved/canonical artifact.

---

# 9. ELS ITEM / EVIDENCE CONTRACT

An ELS result should be able to carry at least:

- source/corpus
- original input reference
- normalized engine input
- selected research form
- search parameters
- geometry
- scope
- skip
- direction
- positions/start/hit identity
- matched text
- related verse/source context when available
- statistical/null-model information when actually calculated
- MC/null-model provenance
- candidate/interpretation status
- engine version
- provenance
- challenge status

The exact persistence shape must be mapped to existing Research Objects before implementation.

Do not create an `els_results` table merely because a result needs a name. Audit existing `els_records`, Research Objects and Context first.

---

# 10. MATRIX ≠ INTERPRETATION

The matrix is a **source object / evidence surface**.

The original Hebrew source, exact positions, skip, direction, scope and geometry remain the evidence substrate.

Deep Research can add:

- verse text
- surrounding verse context
- translation
- transliteration where available
- term meaning
- related entities
- evidence links
- candidate interpretation
- challenge

Translation is presentation/context support. The original Hebrew source and exact ELS coordinates remain the evidence.

The following must never be conflated:

**meeting point ≠ proof**

**rarity ≠ meaning**

**MC ≠ truth**

**ELS observation ≠ interpretation**

**candidate ≠ canonical**

---

# 11. FULL SEARCH SPACE / NO SILENT LOSS

Every serious ELS research operation must be able to explain:

- what was searched
- what was not searched
- why it was not searched
- corpus/text
- selected variant
- direction
- skip range
- boundary/geometry
- parameter limits
- explicit caps
- cost
- engine version

A hidden whitelist or silent cutoff is prohibited.

Rank ≠ Hide.

If a computational limit exists, it must be explicit and its effect on coverage must be knowable.

Saved findings must not silently disappear merely because the search space or ranking policy changes. Compatibility/pinning is a preservation mechanism, not a ranking authority.

---

# 12. 2D / 3D / SOURCE / GRAPH / NUMERICAL VIEWS

All representations are views over shared research identity.

```text
                    SHARED FINDING / AXIS
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        2D Matrix          3D Space          Source
          │                 │                 │
       ELS geometry    spatial analysis    verse/text
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                    Graph / Numerical
                            │
                        Experiment
```

The same `finding_id`/axis identity, provenance and evidence must survive movement between views.

**3D is not an ELS engine.** It is Matrix State / Spatial Analysis over ELS occurrences and explicit coordinates.

Visualization alone never upgrades epistemic status.

---

# 13. RESEARCH PATH / JOURNEY

The ELS Research Path is an investigation sequence, not a second data model.

A path may contain:

```text
input → form → search → finding → axis → source → comparison → challenge → next research step
```

Reopening a path must reproduce the saved research state rather than silently perform a new search and substitute a different occurrence.

The broader product principle is Discovery Before Journey:

**discovery → research → meaningful finding → path/journey**

The journey is a product surface over research state, not a reason to create a separate graph.

---

# 14. PRIVACY / R1 INTEGRATION

R1 has already established `research_objects.owner_person_id` and `privacy_scope` with fail-closed `private` default, legacy backfill to `public_candidate`, CHECK, FK `ON DELETE SET NULL`, index, and merge-owner repoint protection.

For ELS/Research Context:

- `privacy_scope` = access permission dimension.
- `status` = research lifecycle dimension.
- `is_fact` = deterministic derived epistemic flag, not a model guess.
- `resolved_person_id` = identity basis for owner-scoped access.
- `owner_person_id` = artifact owner.
- `source_ref` and provenance must remain attached.
- `channel_only` / unresolved identity → no owner-scoped artifacts.
- cross-person owner-scoped access is prohibited.
- `family_shared` currently has contract meaning only; no active sharing ACL is implied.
- `public_candidate` does not mean published or canonical.

Public engraved facts remain a separate bucket from owner-scoped research.

This means ELS must not create a parallel privacy system. Its research artifacts should enter the existing Research Object privacy contract.

---

# 15. 14-LAYER RESEARCH CONTEXT — ELS PLACEMENT

The shared Research Context has 14 layers:

1. Identity
2. Personal Memory
3. Research Case
4. Research In Progress
5. Completed Research
6. Evidence / Findings
7. Candidate Discoveries
8. Convergences
9. ELS
10. Name / Date / Number
11. Provenance Index
12. Open Threads
13. Suggested Next Actions
14. Human-Gate / Decisions

ELS is L9, but it must connect naturally to L6/L7/L8/L10/L11/L12/L13/L14.

Examples:

- L6: an ELS observation can become evidence when its calculation and conditions are explicit.
- L7: a potentially meaningful ELS relationship remains a candidate.
- L8: multiple independent layers may form a convergence candidate; HOT ≠ TRUE.
- L10: number/name/date representations may supply search forms or anchors.
- L11: every transformation/search/result retains provenance.
- L12: missing source, unchallenged finding or pending cross-check becomes an open thread.
- L13: Raziel may suggest a next check only when grounded in an open thread/evidence/candidate/available engine stage.
- L14: Human-Gate remains ZURIEL.

---

# 16. RAZIEL — LATER, NOT IN THIS ELS BUILD

Raziel is the Research Orchestrator and permanent site-wide research companion, not the ELS engine.

Later wiring should follow:

```text
ELS / other engine
      ↓
Research Object / Evidence
      ↓
Research Context
      ↓
Metatron / Research Plan
      ↓
Raziel
      ↓
suggest / challenge / explain / next action
```

Raziel must not become a duplicate ELS calculator or a second context store.

The future global Raziel should be able to enter from any site surface with the current Context rather than starting a new conversation-world.

Web and WhatsApp should consume the same unified context item contract, with identity/policy differences handled at the boundary.

The current workstream deliberately stops before implementing this wiring. The ELS foundation must be stable first.

---

# 17. HUMAN-GATE / EPISTEMIC DISCIPLINE

The system must preserve the following ladder:

```text
INPUT
→ DERIVED
→ OBSERVATION
→ EVIDENCE
→ CANDIDATE
→ INTERPRETATION
→ HUMAN DECISION
→ CANONICAL / PUBLISHED
```

AI may:

- understand
- plan
- synthesize
- compare
- challenge
- explain
- suggest

AI may not silently:

- promote candidate to canonical
- publish
- alter engine truth
- rewrite original input
- delete provenance
- expose private research

---

# 18. COST / PERFORMANCE FOUNDATION

ELS computation is deterministic work, not an LLM task.

The architecture should support device-adaptive execution later:

```text
same engine contract
same Research Object identity
same provenance
        ↓
local main thread / Worker-WASM-GPU / server deep research
```

Routing should be based on measured cost, device capability and search value — not on a hidden change in semantics.

No silent degradation.

No automatic search-space expansion merely because more compute is available unless the Search Strategy explicitly chooses it.

The current north-star optimization remains:

**speed × useful coverage × reliability/quality × decision value**

not feature count.

---

# 19. CHALLENGE LAYER

Future ELS Challenge should test:

- term selection
- variant selection
- post-selection
- search-space coverage
- number of variants
- rarity / MC assumptions
- baseline
- controls
- alternative interpretations
- stability under search expansion
- selection bias
- geometry sensitivity
- corpus sensitivity

Challenge does not delete or hide a finding.

**Rank, Don't Hide.**

A challenge result is itself provenance-bearing research information.

---

# 20. CAPABILITY AUDIT — REQUIRED BEFORE BUILD

For each ELS capability, return:

| Field | Required question |
|---|---|
| Capability | What exactly is being requested? |
| Engine existence | Does the canonical engine already support it? |
| UI exposure | Is it exposed, hidden or partial? |
| Existing abstraction | Which current component/function/object represents it? |
| Research Object | What object carries the result? |
| Context | Where does it enter the 14-layer Context? |
| Provenance | Can the derivation be reproduced? |
| Value | What decision/research value does it add? |
| Cost | What is the measured computational cost? |
| Coverage | What search space does it cover? |
| Risk | What regression/privacy/epistemic risk exists? |
| Dependencies | What must exist first? |
| Decision Gate | What result would change the decision? |
| Minimum Delta | Smallest safe extension of existing architecture |
| Recommendation | Build / expose / extend / defer / reject |

No implementation starts from a GAP finding alone.

---

# 21. 78-CAPABILITY ELS MAPPING

The ELS workstream must next map the known 78 capabilities through:

**Capability → Object → Value → Cost → Coverage → Risk → Decision Impact**

with the additional architectural classification:

**EXISTING / UI GAP / HANDOFF GAP / PARTIAL / MISSING / DUPLICATED**.

The mapping is the next design gate. It is not an implementation order by itself.

Only after the complete mapping should we decide which capabilities belong in:

- core
- standard
- advanced/deep
- researcher/professional
- AI-assisted
- future/deferred

No UI checkbox explosion is implied.

---

# 22. CURRENTLY OPEN ELS DECISION GATES

These are explicitly not silently solved by this addendum:

1. Geometry/window-width control (`cw`) and its cost/coverage tradeoff.
2. Quality/strength model calibration.
3. `clusterStat` / Monte-Carlo compatibility with the full search space without unacceptable synchronous cost.
4. Worker/WASM/server routing thresholds, to be benchmarked rather than guessed.
5. Finding→Axis canonical object mapping.
6. Angle/direction/letter-before-after research exposure.
7. Skip-series research capabilities.
8. Orthographic/spelling variants.
9. Matrix comparison semantics.
10. Full multilingual candidate/derivation implementation after audit.
11. Research Context integration.
12. Raziel wiring and site-wide interface integration.
13. Deep Research UX.
14. Final 78-capability classification and priority.

These gates are deliberately separated so one open issue does not silently change another.

---

# 23. WHAT MUST NOT BE BUILT AS PART OF THIS FOUNDATION

Do not create:

- a second ELS engine;
- a second search-space implementation;
- an English ELS engine merely to satisfy multilingual input;
- a new multilingual table before auditing existing representation infrastructure;
- a second Research Context;
- a second Research Object store;
- a separate ELS privacy/RLS system;
- a separate Raziel memory;
- a parallel Family/Event graph;
- an ELS-specific provenance system disconnected from the shared contract;
- a new 3D research engine;
- automatic canonical promotion by AI;
- hidden search cutoffs;
- a giant checkbox UI exposing all capabilities.

---

# 24. DEFINITION OF READY FOR THE NEXT PHASE

ELS is ready for the next phase when the architecture can answer, without redesign:

1. What did the user originally enter?
2. In what language?
3. What candidates were derived, and why?
4. Which research form was selected for this engine?
5. What exact engine/version ran?
6. What exact search space/parameters were used?
7. What did the engine actually observe?
8. What evidence supports the observation?
9. What remains candidate/interpretation?
10. Where is the result stored in the shared Research Context?
11. What is its privacy scope and owner?
12. Can the same finding be reopened in 2D, 3D and Source without changing identity?
13. Can a later Challenge expand/check the search without hiding the original finding?
14. Can Raziel later consume the same object without creating a second memory/context system?
15. Can the system add another language without changing the ELS engine contract?

If these answers are stable, future ELS capabilities can be added incrementally without architectural redesign.

---

# 25. NEXT ACTION

**Do not build from this addendum.**

The next action for the ELS workstream is the read-only **78-capability audit and Capability → Object Map**.

After that, return the audit as:

**FACT · EXISTING · UI GAP · HANDOFF GAP · MISSING · DUPLICATION · RISK · DEPENDENCIES · DECISION GATES · MINIMUM DELTA · RECOMMENDATION.**

Only then should implementation packages be proposed.

The future Raziel / Research Context / site-wide interface work is a later workstream. The ELS foundation must first be made explicit, reproducible and future-proof.
