# SOD1820 — Research Object Map

**Status:** Strategy memo / not implementation
**Author:** GPT — Research Agent 2
**Human-Gate:** ZURIEL
**Branch:** `gpt/research-object-map`

> This document is a strategic map only. It does not authorize code, DB, schema, migration, UI implementation, merge, deploy, canonical promotion or publication.

---

# 0. Purpose

The purpose of this document is to preserve the research-system model and, at the higher level, the whole SOD1820 product model so future sessions do not reconstruct the architecture from memory.

The central idea is a **single research substrate underneath many entrances and experiences**.

SOD1820 may have different public entrances, audiences and journeys — אור הגאולה, מימד חמש, סנכרונים/רמזים, מחקר, הצופן התנכי, פורום, archive, number/topic pages and business surfaces — but these are not intended to become independent information systems.

They are different **views, entrances, journeys or distribution surfaces over a shared research world**.

No new engine, parallel tree, duplicate database, duplicate research object system or alternate source of truth is implied by this document.

---

# 1. SOD1820 — Whole-System Product Map / Zoom-Out

## 1.1 North Star

> **Maximum useful research / Minimum unnecessary computation**
>
> **מקסימום מידע מחקרי שימושי במינימום חישוב מיותר.**

The goal is not to maximize the number of features, screens, searches or calculations.

The goal is to maximize the amount of **useful, reproducible, decision-relevant research** produced by the system while minimizing:

- unnecessary search-space expansion;
- redundant computation;
- duplicated engines;
- duplicated research objects;
- repeated work;
- UI complexity that does not improve a decision;
- AI-generated exploration that cannot change a decision;
- silent loss or silent narrowing of research.

Therefore, every future capability must eventually be evaluated through:

> **Object + Value + Cost + Coverage + Risk + Decision Impact**

This is a planning criterion, not a new runtime architecture.

---

## 1.2 One system, many entrances

```text
                         SOD1820
                            │
              ┌─────────────┼─────────────┐
              │             │             │
           ENTRANCES      COMMUNITY      BUSINESS
              │             │             │
      ┌───────┼───────┐     │             │
      │       │       │     │             │
   אור הגאולה  מימד חמש  רמזים/סנכרונים  credits / future membership
      │       │       │     │             │
      └───────┴───────┴─────┴─────────────┘
                            │
                     SHARED RESEARCH
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
       DATA              RESEARCH          INTELLIGENCE
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                     SHARED OBJECTS
                            │
      Entity · Term · Axis · Finding · Evidence
      Candidate · Cluster · Hypothesis · Experiment
      Research Path · Case · Snapshot · Decision
                            │
                 ┌──────────┼──────────┐
                 │          │          │
                AI        VIEWS      HUMAN GATE
                 │          │          │
                 └──────────┼──────────┘
                            │
                    community / output
```

Different entrances can feel different.

The underlying research identity must remain shared.

---

# 2. Whole-system status legend

The product map uses the following planning statuses exactly as requested:

| Status | Meaning in this strategy map |
|---|---|
| **קיים** | Verified as existing/active in the current project evidence. |
| **קיים חלקית** | Some infrastructure/capability exists, but the full intended system flow does not. |
| **בבנייה** | Explicitly under active implementation/review in the current workstream. |
| **מתוכנן** | Strategy/design exists, but implementation has not begun. |
| **חסר** | No sufficient existing capability was established for the intended role. |
| **כפילות** | A duplicate or parallel concept exists or has existed and must be consolidated/removed rather than expanded. |

These labels describe the **product-planning state**, not canonical DB lifecycle. Where a status is based on current architectural evidence rather than a direct DB field, it remains a planning assessment and does not overwrite Master State.

---

# 3. Pages / entrances map

| Surface / Page family | Status | Product role | Research relationship |
|---|---|---|---|
| Home / main SOD1820 entry | **קיים** | General entry into the ecosystem | Entry into shared graph/research world |
| אור הגאולה | **קיים** | Content / spiritual discovery entrance | Can lead users toward research objects, signals and sources |
| מימד חמש | **קיים** | Video / external-knowledge discovery entrance | Signals and source material can become research seeds |
| סנכרונים / רמזים | **קיים** | Convergence / discovery entrance | Feeds signals, entities, numbers and candidate research |
| `/code` — הצופן התנכי | **קיים** | Primary ELS research surface | Canonical ELS engine |
| `/research?tool=els` / היכל | **קיים** | Research-oriented ELS presentation | Same canonical ELS iframe/artifact as `/code` |
| ELS Work Area / `/lab/els` | **בבנייה** | Researcher workspace / state exposure | Same ELS engine; work area is a view, not a new engine |
| Forum | **קיים** | Community contribution/discussion | Questions, observations, candidate research and feedback |
| Archive / reality stream | **קיים** | Historical/current signal presentation | Source/signal layer feeding shared research context |
| `/number/:n` | **קיים** | Canonical number/entity lens | One graph/entity page, not a separate number system |
| `/topic/:slug` | **קיים** | Canonical convergence/topic lens | One graph/entity/convergence lens |
| Share / research snapshots | **קיים חלקית** | Distribution/reproducibility | Snapshot should preserve research identity and provenance |
| `/credits` / `/buy` | **קיים** | Current business entry | Credits fund defined capabilities; not a separate research system |
| `/members` | **קיים חלקית** | Intended membership surface | Subscription infrastructure not integrated; currently placeholder/frozen |
| Admin / research management surfaces | **קיים** | Human operations / moderation | Human Gate and operational control |

### Architectural reading

These pages are **not separate products**.

The correct model is:

> **Different entrance → different user journey → same underlying research substrate.**

A page may emphasize content, video, community, numbers, ELS or business. That does not justify creating a parallel research object model.

---

# 4. User Types

The system should reason about users by **journey and capability**, not by creating separate products.

| User type | Status | Primary need | Research relationship |
|---|---|---|---|
| Visitor / Explorer | **קיים** | Discover and understand | Consumes sources, signals and lightweight research |
| Registered user | **קיים** | Search/save/interact | Creates and revisits research state |
| Researcher | **קיים חלקית** | Deep investigation | Needs Research Objects, paths, comparisons and verification |
| Contributor | **קיים** | Submit material / findings / questions | Adds sources, observations and candidates; not automatically facts |
| Community participant | **קיים** | Discuss and challenge | Provides social context, questions and counterexamples |
| Advanced / Premium researcher | **קיים חלקית** | Larger/deeper research budgets | Future deep compute, comparison and AI navigation |
| Admin / Moderator | **קיים** | Review, moderation, operations | Human-gated promotion and publication |
| AI Research Assistant | **קיים חלקית** | Navigate and challenge research | Intelligence layer; never Human Gate |

The AI user type is conceptual shorthand for a system role, not a new autonomous authority.

---

# 5. User Journeys

The whole system should support several journeys that converge on the same research model.

## 5.1 Discovery journey

```text
Content / video / post / signal
        ↓
Entity / term / number / source
        ↓
Candidate
        ↓
Human choice
        ↓
Research
```

Status: **קיים חלקית** as a complete cross-site journey.

## 5.2 ELS research journey

```text
Search
  ↓
Matrix
  ↓
Finding
  ↓
Evidence
  ↓
Inspect / compare
  ↓
↑ Axis
  ↓
Research Path
  ↓
Hypothesis / Experiment / Challenge
```

Status: **קיים חלקית / בבנייה**. Core ELS and the research journey components exist; the full Research Object/AI journey is still strategic work.

## 5.3 Signal → research journey

```text
Real-world signal
  ↓
Source
  ↓
Entity / date / number / terms
  ↓
Candidates
  ↓
Human selection
  ↓
Research Case
```

Status: **קיים חלקית**.

## 5.4 Community → research journey

```text
Forum / WhatsApp / social
  ↓
Observation / question / source
  ↓
Candidate / Evidence
  ↓
Research
  ↓
Human review
```

Status: **קיים חלקית**.

## 5.5 Research → publication journey

```text
Research
  ↓
Evidence
  ↓
Interpretation
  ↓
Human Decision
  ↓
Canonical / Publication path
```

Status: **קיים חלקית**.

The critical rule is that publication is not a shortcut around research provenance or Human-Gate.

---

# 6. Engines / Capabilities

The engines/capabilities are grouped by role, but all remain subordinate to the shared research model.

| Capability family | Status | Role |
|---|---|---|
| Canonical ELS engine | **קיים** | Finds ELS occurrences |
| Canonical `searchSpace` | **קיים** | Defines legal geometric search space |
| ELS ranking / geometry | **קיים** | Orders and represents findings |
| ELS FORMS / Split-Join | **בבנייה** | Generates research forms through same engine |
| ELS Research Path / journey | **בבנייה** | Preserves investigation transitions |
| Matrix State | **קיים** | Workspace state |
| 2D view | **קיים** | Matrix representation |
| 3D / spatial capability | **קיים חלקית** | Spatial representation/analysis over findings |
| Source / verse context | **קיים** | Evidence/source view |
| Numerical/gematria engines | **קיים** | Canonical calculations |
| Graph / shared tree | **קיים** | Shared entity/relation structure |
| Experiment / null-model research | **קיים חלקית** | Verification and controlled investigation |
| Candidate generation | **קיים חלקית** | Produces candidates for human selection |
| AI Research Navigator | **מתוכנן** | Research navigation and prioritization |
| AI Research Budget | **מתוכנן** | Controls search-space cost and value |
| AI Challenge Mode | **מתוכנן** | Alternative explanations / controls |
| Research Brief | **מתוכנן** | Structured research synthesis |
| Research Timeline / Path Replay | **מתוכנן** | Reconstruct investigation sequence |
| Research Snapshot | **קיים חלקית** | Saved reproducible research state |
| Device-adaptive compute orchestration | **מתוכנן** | Route work across execution tiers |

### Duplicate-engine rule

The historical/legacy ELS implementations that were removed are **not a candidate for restoration**. Reintroducing them would be **כפילות** and would violate the one-engine rule.

---

# 7. Research Objects

The shared object model is the core of the whole product.

## 7.1 Objects

1. **Entity** — person, name, place, event, date, number, concept, signal-derived entity.
2. **Term** — searchable/testable word or phrase.
3. **Axis** — term + skip + direction + occurrence/start + geometry + scope + provenance.
4. **Finding** — concrete result under explicit conditions.
5. **Cluster** — related/convergent findings.
6. **Candidate** — something proposed for checking; not a fact.
7. **Hypothesis** — proposition to test.
8. **Experiment** — hypothesis + explicit method + conditions + result + evaluation.
9. **Evidence** — observable/calculated datum.
10. **Interpretation** — explanation of what evidence may mean.
11. **Research Path** — sequence of meaningful research transitions.
12. **Research Case** — top-level investigation container.
13. **Matrix State** — current matrix/workspace state.
14. **Source** — originating/external material with provenance.
15. **Signal** — real-world/external event or information signal.
16. **Research Plan** — strategy and ordered checks.
17. **Recommendation** — proposed next action.
18. **Decision** — Human-Gated choice.
19. **Research Snapshot** — reproducible saved research state.
20. **Conclusion** — conclusion of a research case; not automatically canonical fact.

## 7.2 Core lifecycle

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

---

# 8. Shared Engine Views — no parallel engines

The research workspace treats every analysis engine as a **View/Capability over Shared Research Objects**, never as a separate source of truth.

```text
                         SHARED FINDING
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
        2D MATRIX           3D SPACE            SOURCE
          │                   │                   │
       ELS path        spatial analysis       Torah/text
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    Numerical / Graph
                              │
                         Experiment
                              │
                              AI
```

The same `finding_id`, provenance and evidence must remain attached when a researcher moves between:

- 2D;
- 3D;
- Source;
- Numerical;
- Graph;
- Experiment.

Changing the view changes the representation, not the identity of the research object.

## 8.1 3D rule

**3D is Matrix State / Spatial Analysis capability, not a separate research engine.**

ELS finds the occurrences.

The spatial layer works over those occurrences and explicit coordinates.

Visualization alone is not evidence.

## 8.2 Navigation

The conceptual navigation is:

`Open in 2D → Open in 3D → Open in Source → Open in Numerical → Open in Graph → Open in Experiment`

All such transitions preserve research identity and provenance.

---

# 9. AI

AI is the **Research Navigator**, not the source of truth and not the Human Gate.

## 9.1 Existing AI infrastructure

The project already has AI infrastructure and AI analysis flows. These should be understood as part of the Intelligence layer, not as a separate research substrate.

Status: **קיים**.

## 9.2 Future Research Navigator role

Status: **מתוכנן**.

The AI should:

- propose research directions;
- rank possible next paths;
- explain why a path is useful;
- estimate cost where material;
- identify redundant tests;
- challenge findings;
- suggest controlled experiments;
- summarize known/unknown state;
- preserve provenance and object identity.

AI must not:

- decide what is canonical;
- publish independently;
- silently change search parameters;
- silently expand search space;
- turn Candidate into Fact;
- turn Interpretation into Evidence;
- replace Human-Gate.

## 9.3 AI Research Map

A Finding may expose structured research directions:

```text
Finding
  ├── Spatial
  ├── ELS
  ├── Text / Source
  ├── Numerical
  ├── Cross-Finding
  └── Verification
```

This is a navigation map over the Research Path, not a second tree.

---

# 10. AI Research Budget

Status: **מתוכנן**.

The AI Research Budget exists to enforce the North Star:

> Maximum useful research / Minimum unnecessary computation.

Before a material investigation is executed, the system should be able to reason about:

- seeds;
- terms/forms;
- widths/geometry;
- depth;
- methods;
- controls;
- expected search-space expansion;
- expected compute cost;
- whether the test can change a decision.

A recommendation should answer:

1. **What does this test?**
2. **Why is it needed?**
3. **What does it cost?**
4. **What coverage does it add?**
5. **What risk does it introduce?**
6. **What decision changes if the result is A vs B?**

If the answer to decision impact is effectively “none”, the test should not be prioritized merely to produce more information.

This is a planning rule, not permission for AI to execute automatically.

---

# 11. AI Challenge Mode

Status: **מתוכנן**.

Challenge Mode exists to reduce confirmation bias and post-hoc research drift.

It should examine, where relevant:

- alternative explanations;
- null models;
- parameter dependence;
- geometry dependence;
- post-hoc parameter selection;
- multiple similar findings by chance;
- control/counterexample behaviour;
- reproducibility.

Challenge output remains appropriately classified as Evidence, Candidate, Hypothesis, Interpretation or Experiment.

Challenge does not promote a claim to fact.

---

# 12. Research Path / Timeline / Snapshot

These three concepts form the reproducibility layer.

## Research Path

Status: **בבנייה**.

Records meaningful transitions such as:

`Seed → Axis → Finding → New Axis → Cluster → Candidate → Experiment → Challenge → Conclusion`

## Research Timeline

Status: **מתוכנן**.

Allows the researcher to understand the chronological sequence of meaningful research decisions and branches.

## Research Snapshot

Status: **קיים חלקית**.

A Snapshot should preserve a reproducible state including, where applicable:

- matrix state;
- active axis;
- findings;
- terms;
- path/context;
- geometry;
- provenance;
- research status.

The purpose is to return to a research state without reconstructing it manually.

---

# 13. Community

Community is a **source and research-input layer**, not a separate knowledge tree.

| Community surface | Status | Role |
|---|---|---|
| Forum | **קיים** | Questions, discussion, observations and contributions |
| WhatsApp / Raziel | **קיים** | Inbound material, research interaction and distribution |
| Newsletter | **קיים** | Research/content distribution |
| Facebook / Instagram publishing | **קיים** | Distribution of approved/public material |
| Reality / signal stream | **קיים** | Real-world signals and source material |
| Community → Research integration | **קיים חלקית** | Needs shared object/provenance wiring |
| Community challenge / verification loop | **מתוכנן** | Community can challenge rather than merely amplify |

Community material must retain provenance and epistemic status.

A user submission is not automatically a fact.

---

# 14. Business / Monetization

Business is another layer of the same product, not a separate research system.

| Business component | Status | Role |
|---|---|---|
| Credits | **קיים** | Current monetization mechanism for defined capabilities |
| `/credits` / `/buy` | **קיים** | Current purchase flow |
| Manual payment approval | **קיים** | Current operational payment flow |
| Subscription infrastructure | **קיים חלקית** | Provider/strategy exists, full integration not active |
| `/members` | **קיים חלקית** | Placeholder / future membership surface |
| Premium research model | **מתוכנן** | Research depth, compute budget and advanced capabilities |
| Premium ≠ truth | **קיים** | Non-negotiable epistemic rule |

The intended Premium model is **research depth**, not privileged truth.

Premium may increase:

- research budget;
- deep search scope;
- long-running work;
- multi-matrix comparison;
- advanced AI navigation;
- reproducibility;
- compute availability.

Premium must not:

- bypass Human-Gate;
- convert candidates into facts;
- change canonical evidence rules;
- create a parallel engine.

---

# 15. Analytics

Analytics already exists as a shared measurement layer and must not be duplicated.

| Analytics capability | Status | Role |
|---|---|---|
| Google Analytics 4 | **קיים** | Product/usage measurement |
| Microsoft Clarity | **קיים** | Session recordings / heatmaps |
| Meta Pixel / CAPI | **קיים** | Marketing/conversion measurement |
| Google Search Console | **קיים** | Search visibility / acquisition |
| ELS usage tracking | **קיים** | ELS activity measurement |
| Unified research funnel | **קיים חלקית** | Need one interpretation across entrances |
| Research-value analytics | **מתוכנן** | Measure useful research outcomes, not only clicks |

The long-term analytical question is not merely:

> “How many people clicked?”

but:

> “Which entrance produced useful research, meaningful continuation, verification and retained research objects?”

This must still use the existing analytics stack rather than introducing a parallel analytics system.

---

# 16. Whole-system research funnel

The intended unified funnel is:

```text
ENTRANCE
  ↓
USER JOURNEY
  ↓
SOURCE / SIGNAL / INPUT
  ↓
ENTITY / TERM
  ↓
CANDIDATE
  ↓
HUMAN CHOICE
  ↓
RESEARCH PLAN
  ↓
AXIS
  ↓
FINDING
  ↓
EVIDENCE
  ↓
CLUSTER / NEW AXIS
  ↓
HYPOTHESIS
  ↓
EXPERIMENT / CHALLENGE
  ↓
INTERPRETATION
  ↓
DECISION
  ↓
SNAPSHOT / CONCLUSION
  ↓
COMMUNITY / PUBLICATION / NEXT RESEARCH
```

This is the common substrate behind the different site entrances.

---

# 17. One graph / one research tree

The product already follows the principle that the site is one graph/tree rather than independent worlds.

The same rule applies to research:

- number pages are lenses;
- convergence pages are lenses;
- posts are sources/content;
- gallery items are sources/signals;
- ELS is a research capability;
- forum is a community input layer;
- WhatsApp is an input/distribution layer;
- AI is an intelligence layer;
- analytics is a measurement layer;
- business is an entitlement/transaction layer.

None of these justify a duplicate research tree.

The architecture should remain:

> **Many entrances → one research substrate → many views → one Human Gate.**

---

# 18. Device-Adaptive Compute Orchestration

Status: **מתוכנן**.

The interface is mobile-first, but computation is device-adaptive.

```text
USER / RESEARCH CASE
        ↓
COMPUTE ORCHESTRATOR
        ├── Local UI
        ├── Worker / WASM / GPU
        └── Server Deep Research
        ↓
SAME ENGINE CONTRACT
        ↓
SAME RESEARCH OBJECTS
```

## Tier 0 — local/UI

Cheap operations such as:

- pan;
- pinch;
- zoom;
- fit;
- focus;
- display/color;
- selection;
- lightweight state changes.

## Tier 1 — Worker / WASM / GPU

Substantial but bounded operations that can safely remain local.

## Tier 2 — server

Large or long-running work such as deep full-corpus searches, large candidate expansions, expensive Monte Carlo/null-model work and multi-object experiments.

The user chooses **what to research**. The system chooses **where to compute**.

Execution routing is not a second engine.

A Worker must use the canonical engine logic or a shared compiled representation. WASM/GPU are acceleration layers, not new semantics.

## No silent degradation

If a requested search cannot be completed at the current tier:

1. preserve the requested research specification;
2. route upward where possible;
3. otherwise report incomplete/unavailable;
4. never present a truncated search as complete.

Execution tier is provenance, not evidence.

---

# 19. Capability evaluation framework

The North Star requires a standard evaluation frame before building future capabilities.

For each capability:

### Object
Which Research Object does it operate on?

### Value
What useful research value does it add?

### Cost
What computation, complexity or user attention does it consume?

### Coverage
What additional research space or evidence does it cover?

### Risk
What can go wrong? Examples: false positives, parameter freedom, duplicate concepts, silent loss, misleading visualization.

### Decision Impact
What decision can actually change because this capability exists?

The six dimensions are not a new database object. They are the evaluation lens for the roadmap.

---

# 20. What is explicitly NOT being added by this map

This Zoom-Out does **not** authorize:

- a new ELS engine;
- a new research database;
- a second graph/tree;
- a second AI research engine;
- a second analytics system;
- a new community knowledge base;
- a new premium engine;
- a new 3D engine;
- a new source-of-truth layer;
- automatic AI promotion;
- automatic search-space expansion;
- new UI implementation;
- code changes;
- schema changes;
- migrations;
- deployment.

The purpose is to **organize the existing system and roadmap**, not expand architecture.

---

# 21. Current architectural principles

1. **The entire site is one system, not a collection of separate systems.**
2. Different entrances may produce different experiences, but the research substrate remains shared.
3. **One engine / many sources / one tree / one Human Gate.**
4. Every engine is a View/Capability over Shared Research Objects.
5. No view is an independent Source of Truth.
6. The same `finding_id`, provenance and evidence must survive movement between 2D, 3D, Source, Numerical, Graph and Experiment.
7. **3D = Matrix State / Spatial Analysis**, not a separate research engine.
8. AI = Research Navigator, not Human Gate.
9. AI may propose, rank, explain, budget, challenge and summarize.
10. AI does not decide canonical status or publication.
11. AI Research Budget limits unnecessary search-space expansion and false-positive exposure.
12. AI Challenge Mode actively seeks alternative explanations.
13. Research Path / Timeline / Snapshot preserve reproducibility.
14. Premium changes research depth/budget, not epistemic truth.
15. Community material remains provenance-tagged and epistemically separated.
16. Analytics measures the same product; it does not become a parallel product.
17. Compute routing is execution infrastructure, not a new algorithm.
18. Rank, Don't Hide.
19. No silent degradation or silent loss.
20. Source → extraction → calculation → cross-check → interpretation remain separate.
21. Candidate ≠ Fact; Claim ≠ Fact; HOT ≠ TRUE; VIP ≠ TRUE; CANONICAL ≠ PUBLISHED.

---

# 22. Current status and roadmap boundary

### Kיים

- Shared site/graph principle.
- Canonical ELS engine.
- ELS `/code` + research hall using the same artifact.
- Core Matrix State and visual capabilities.
- Existing AI infrastructure.
- Community/distribution infrastructure.
- Credits/payment flow.
- Analytics stack.

### קיים חלקית

- Full cross-site research journey.
- Research Object persistence across all entrances.
- Community → Research integration.
- Research → Publication provenance chain.
- Advanced researcher workspace.
- Premium research model.
- Unified research analytics.
- Research Snapshot as a full reproducibility layer.

### בבנייה

- ELS Research Path / Work Area layer.
- Current ELS forms/journey workstream where explicitly approved.

### מתוכנן

- Whole-system Research Navigator.
- AI Research Budget.
- AI Challenge Mode.
- Research Timeline / replay.
- Full Shared View synchronization.
- Multi-geometry research evaluation.
- Device-adaptive compute orchestration.
- Premium deep research workspace.

### חסר

A missing capability here means the **intended whole-system role is not sufficiently represented yet**. It does not mean a related low-level function does not exist somewhere in the current system.

### כפילות

The major architectural duplication risk is not to create a new feature, but to accidentally recreate an existing capability as:

- another engine;
- another tree;
- another research object store;
- another AI research layer;
- another analytics layer;
- another ELS implementation.

The strategy is therefore to **connect and expose existing capabilities before creating anything new**.

---

# 23. Final strategic rule

The product should feel simple at the surface and extremely capable underneath.

The user should not need to understand the architecture.

The architecture must nevertheless remain strict:

> **Many entrances. One research world.**
>
> **Many views. One object identity.**
>
> **Many execution environments. One engine contract.**
>
> **Many AI suggestions. One Human Gate.**

The engine discovers and organizes.

The researcher investigates, interprets and chooses.

AI assists, prioritizes and challenges.

The Human Gate determines what becomes canonical or published.

---

# 24. Next step — DO NOT BUILD YET

The next step is explicitly:

> **Capability → Object → Value → Cost → Coverage → Risk → Decision Impact**

Apply this framework to the **78 ELS capabilities**.

For each of the 78 capabilities, determine:

1. Which Research Object it operates on.
2. What useful value it adds.
3. What it costs in computation, complexity or attention.
4. What coverage it adds.
5. What risk it introduces.
6. What decision it can change.
7. Whether it already exists.
8. Whether it is partially implemented.
9. Whether it duplicates an existing capability.
10. Whether it is DATA, RESEARCH or INTELLIGENCE.
11. Whether it depends on another unfinished capability.
12. Whether it belongs in Simple, Researcher or Deep/Premium experience.

**Only after this 78-capability mapping is complete should the project decide what, if anything, actually needs to be built.**

No code. No UI implementation. No schema change. No new engine. No deployment.
