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

## Shared Engine Views — no parallel engines

The research workspace should treat each analysis engine as a **view/capability over shared Research Objects**, not as a separate source of truth.

A single Finding must remain the same Finding when the researcher moves between views:

```text
                         FINDING
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       2D MATRIX         3D SPACE          SOURCE
          │                 │                 │
       ELS path       depth relations     Torah text
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                       AI RESEARCH
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
          Hypothesis     Comparison     Experiment
```

The same `finding_id`, provenance and evidence must travel between views. A 2D matrix, 3D spatial view, source view, numerical analysis, graph view and experiment view are representations/capabilities over the same underlying objects.

### Cross-view navigation

The UI should support explicit **Open in...** transitions without creating duplicate research objects:

- Open in 2D
- Open in 3D
- Open in Source
- Open in Numerical
- Open in Graph
- Open in Experiment

A research breadcrumb should preserve context, for example:

```text
Research Case
  > Seed: 1820
  > Finding #1842
  > 3D Spatial View
  > Depth Search
  > Layer 128
```

Switching to another view changes the representation, not the identity of the research object.

### 2D ↔ 3D synchronization

The 2D and 3D views should remain synchronized around the same Finding. Selecting a Finding in either view should locate the same object in the other view.

The 3D layer is therefore a Matrix State / spatial-analysis capability, not a new research engine. ELS remains responsible for finding occurrences; the spatial layer maps existing findings to coordinates and studies relationships between them.

### Progressive disclosure in 3D

The 3D workspace should not attempt to render the entire corpus as a dense field of individual letters at once. The intended research UX is progressive:

```text
Universe → Layer → Region → Matrix → Letters
```

Possible operations include:

- Anchor / Pin Finding
- Look Below
- Look Above
- Show Path
- Show Neighbors
- Diagonals
- Cross Section / Slice
- Compare
- Local neighborhood / local volume
- 2D ↔ 3D synchronization

Visualization is not evidence. Geometry must remain tied to explicit coordinates, methods, provenance and status.

## AI Research Navigator

The AI layer should not be a generic chatbot placed beside the matrix. Its primary role is to help navigate the research space by proposing **testable next paths** over existing objects.

For a selected Finding, the AI may present structured research options such as:

```text
RESEARCH OPTIONS

1. Geometry
   - What is below?
   - What is above?
   - What is diagonal?
   - Which findings are nearby?

2. ELS
   - Reverse / parallel occurrences
   - Related axes
   - Additional occurrences under the existing search contract

3. Text
   - Source context
   - Nearby terms
   - Verse / passage context

4. Numerical
   - Existing canonical calculation methods
   - Related numerical candidates

5. Cross-Finding
   - Nearby findings
   - Cluster relationships
   - Shared axes / terms

6. Verification
   - Reproduce
   - Null model
   - Control / counterexample
```

The AI should rank or explain these options, but it must not silently execute an open-ended search expansion merely because it can think of one.

### AI Research Map

A Finding can expose a structured map of possible research paths:

```text
Finding A
   │
   ├── Spatial
   │    ├── Below
   │    ├── Above
   │    └── Diagonal
   │
   ├── ELS
   │    ├── Reverse
   │    ├── Parallel
   │    └── Related axis
   │
   ├── Text
   │    ├── Context
   │    └── Terms
   │
   └── Verification
        ├── Null
        ├── Control
        └── Reproduce
```

The resulting path belongs to the Research Path / Research Case model. It is not a second tree or engine.

## AI Research Budget

Because expanded search spaces can increase false-positive risk, AI-proposed investigations should expose their expected search cost before execution when the cost is material.

A research budget can include:

```text
Seeds: 1
Widths: 1
Depth: 20
Methods: 2
Controls: 2
```

The AI should be able to state when a proposed action materially expands the search space and why that expansion could change a decision. This is especially important for 3D, where adding width/height/depth, directions, seeds and methods can create many degrees of freedom.

A recommendation should therefore contain, where applicable:

- what it tests;
- why it is needed;
- expected search-space cost;
- what decision changes if the result is A vs B;
- whether the test is exploratory or confirmatory.

If a proposed test cannot change a decision, it should not be prioritized merely to generate more information.

## AI Challenge Mode

For an existing Finding or Hypothesis, AI should have a **Challenge** capability whose purpose is to search for alternative explanations rather than reinforce the user's preferred interpretation.

Possible challenge questions:

- Is the result parameter-dependent?
- Does it survive the declared null model?
- Did post-hoc parameter selection create the apparent signal?
- Are there many similar findings by chance?
- Does the relation persist under the declared control?
- Is the observed relation a property of the chosen geometry rather than the text?

Challenge output remains Evidence / Candidate / Interpretation as appropriate. It does not promote a claim to fact.

## AI Research Brief

For a selected Finding, the system may generate a compact structured brief:

```text
FINDING #1842

OBSERVED
What was actually found.

GEOMETRY
Coordinates, method and spatial relations.

KNOWN
Existing verified evidence.

UNKNOWN
What has not yet been established.

POSSIBLE HYPOTHESES
Explicit hypotheses, not facts.

RECOMMENDED NEXT TEST
The highest-value test under the current research plan.

WHY
What decision the test could change.

DO NOT TEST YET
Lower-value or redundant investigations and why they are deferred.
```

This is an Intelligence-layer artifact. It must preserve provenance and the distinction between observation, evidence, inference and recommendation.

## Compare Views

A research case should support comparison of representations without duplicating the underlying finding.

Example:

```text
┌──────────────────┬──────────────────┐
│     2D MATRIX    │    3D SPACE      │
│                  │                  │
│       ★          │       ★          │
│                  │       │          │
│                  │       ●          │
│                  │       │          │
│                  │       ●          │
└──────────────────┴──────────────────┘
```

The same Finding is highlighted in both views. The purpose is to make explicit what the 3D representation adds relative to the 2D representation, rather than assuming that visual complexity is research value.

## Research Timeline / Path Replay

A research session should be able to preserve the sequence of meaningful transitions:

```text
Seed 1820
   ↓
Finding #1842
   ↓
2D inspection
   ↓
3D depth
   ↓
Finding #1921
   ↓
Compare
   ↓
Hypothesis H3
   ↓
Experiment E7
   ↓
Null test
   ↓
Conclusion
```

This is a Research Path / Snapshot capability. It should make it possible to return to a prior research state without reconstructing the investigation manually.

## Architectural rule for the AI + engines

**Every engine is a view/capability over shared Research Objects, never a parallel source of truth.**

Therefore:

- ELS engine → finds occurrences.
- Matrix State → represents the current research workspace.
- 2D / 3D → views of the matrix/workspace.
- Spatial analysis → measures explicit geometric relations between existing findings/evidence.
- Numerical engines → calculate using the canonical calculation engine.
- Graph → represents relationships between research objects.
- Experiment → evaluates a hypothesis under explicit conditions.
- AI → proposes, challenges, summarizes and prioritizes.
- Human-Gate → decides what is accepted, promoted or published.

No view is allowed to silently create a second Finding, second tree, second engine or alternative source of truth.

## Device-Adaptive Compute Orchestration — Mobile-First, Compute-Agnostic

The product should be **mobile-first at the interface level, but device-adaptive at the compute level**. The user should experience one ELS system regardless of whether they are on a phone, tablet or desktop. The system decides where a task should execute based on measured cost and device capability.

### One research system, multiple execution tiers

```text
                         USER / RESEARCH CASE
                                  │
                                  ▼
                        COMPUTE ORCHESTRATOR
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
          LOCAL UI           WORKER / WASM         SERVER
        (small tasks)        (medium/heavy)      (deep tasks)
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  ▼
                        SAME ENGINE CONTRACT
                                  │
                                  ▼
                     SAME FINDINGS / PROVENANCE
```

This is **execution routing, not a second engine**. All execution paths must preserve the same canonical engine semantics, search-space rules, ranking contract, provenance and Research Object identity.

### Tier 0 — UI/local execution

Use the main thread only for cheap, immediate operations where latency is predictably small:

- pan / pinch / zoom / fit / focus;
- color and display changes;
- selecting a finding;
- changing the active occurrence;
- opening an existing matrix state;
- lightweight state transitions.

The UI thread must never be deliberately burdened with a deep corpus scan merely because the device happens to be powerful.

### Tier 1 — Local Worker / WASM / GPU

Use local parallel compute when the operation is substantial but the corpus and algorithm can remain safely on-device:

- larger on-demand ELS scans;
- candidate generation;
- multi-term or multi-form searches;
- expensive matrix recomputation;
- future 3D spatial calculations that can be bounded locally;
- operations whose result can be returned without exposing private research data to a server.

A Worker must import/use the **same canonical engine logic** or a shared compiled representation. A copied engine inside a Worker is prohibited because it would create a hidden second implementation.

WASM/GPU are acceleration layers, not new semantics.

### Tier 2 — Server-side deep research

Use server compute when the search is too large, too slow, too memory-intensive, or too broad for a reliable mobile session:

- full-corpus deep searches;
- large candidate expansions;
- many seeds / many methods / many widths or depths;
- expensive Monte Carlo / null-model workloads;
- cross-case or multi-object research jobs;
- AI orchestration over large result sets;
- long-running research experiments.

The server returns Research Objects / Evidence / Candidate results with provenance, not an opaque answer. The UI can then render those results through the same Matrix State / Finding model.

### The user must not choose the compute tier

The user chooses **what to investigate**, not whether it should run in a Worker, GPU or server.

The orchestrator should consider:

- estimated operation cost;
- corpus scope;
- number of terms/seeds;
- search-space width/depth;
- expected memory;
- device CPU/GPU capability;
- current device load;
- network availability and latency;
- privacy requirements;
- entitlement (free / premium, where applicable).

A premium tier may receive larger research budgets and deeper server execution, but it must not change the underlying evidence rules or silently convert candidates into facts.

### Progressive execution

A deep investigation should not require the user to wait for one giant opaque job. Where useful, the orchestrator should return results progressively:

```text
REQUEST
  ↓
PLAN
  ↓
FAST FIRST PASS
  ↓
EARLY FINDINGS
  ↓
RANK / USER CHOICE
  ↓
DEEPEN SELECTED PATH
  ↓
VERIFY / CONTROL
  ↓
FINAL RESEARCH SNAPSHOT
```

This is particularly important for mobile. The user can begin inspecting early verified results while deeper work continues, without pretending that an incomplete search is complete.

### Compute provenance

Every non-trivial research execution should be reproducible from an execution record containing, as applicable:

- engine/version identifier;
- corpus/version identifier;
- search-space definition;
- parameters and scope;
- execution tier (local / Worker / WASM / GPU / server);
- device/runtime class when relevant to reproducibility;
- start/end or job identifier;
- ranking version;
- random seed for randomized tests;
- result object IDs;
- status: complete / partial / failed / cancelled.

**Execution tier is provenance, not evidence.** A server result is not inherently stronger than a local result, and a GPU result is not inherently more truthful than a CPU result.

### Mobile failure policy

A mobile device must never silently substitute a weaker search because it is slow.

If a requested operation exceeds local limits, the system should:

1. preserve the requested research specification;
2. route it to an allowed stronger tier when available;
3. otherwise report that the requested search is incomplete or unavailable;
4. never present a truncated prefix as though it were the full search.

This directly protects **Rank, Don't Hide** and **NO SILENT LOSS**.

### Compute budget as part of Research Planning

The existing AI Research Budget should be extended to include compute routing:

```text
Research request
  ├─ Scope: Torah / Tanakh / selected books
  ├─ Seeds: N
  ├─ Terms/forms: N
  ├─ Geometry: width / depth / directions
  ├─ Methods: N
  ├─ Controls: N
  ├─ Expected cost: low / medium / high
  ├─ Preferred execution: automatic
  └─ Maximum allowed budget: user/entitlement policy
```

The user should see **what the system is going to investigate**, not infrastructure jargon. For example:

> "בדיקה עמוקה: 24 מונחים × 6 צורות × כל הדילוגים. המערכת תבצע זאת אוטומטית בהדרגה."

The exact compute tier can remain hidden unless diagnostics are requested.

### Three non-negotiable rules

1. **One engine, many execution environments.** Local, Worker/WASM/GPU and server are execution modes, never competing algorithms.
2. **No silent degradation.** If the requested search cannot be completed, the result is marked partial/incomplete rather than silently narrowed.
3. **Same Research Object identity.** Moving from mobile local search to server deep search, or from 2D to 3D, must preserve the same Finding/Evidence/Provenance identity where the underlying result is the same.

### Architectural consequence

This model allows the product to be extremely capable without forcing every device to perform every calculation. A phone can expose the **same research universe** as desktop; the orchestrator simply chooses the safest and fastest execution path.

It also prevents a future architectural trap: building separate "mobile ELS", "desktop ELS", "premium ELS" or "3D ELS" engines. There should remain one canonical engine and shared Research Objects.

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
8. For AI capabilities, whether the output is a Candidate, Recommendation, Hypothesis, Interpretation, Experiment or other existing object.
9. For multi-engine capabilities, which shared object identity must remain stable across views.
10. For compute-heavy capabilities, which execution tier(s) are eligible and what must trigger escalation from local → Worker/WASM/GPU → server.

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
- 3D visualization is not evidence by itself.
- AI recommendations must not silently expand the search space.
- Compute routing must not alter the canonical search semantics.
- Local/Worker/server are execution tiers, not separate engines.
- Partial or failed computation must be labeled; never disguise truncation as completion.

## Current status

**Completed:** Research Object Map captured as a durable strategy document; shared-engine/view model, AI Research Navigator, and device-adaptive Compute Orchestration concept added.

**Not completed:** Capability → Object Map for the 78 ELS capabilities; execution thresholds/benchmarks are not yet defined.

**Next action:** Map the 78 capabilities to these objects, identify duplication/gaps, then define evidence-based compute routing thresholds before implementation.
