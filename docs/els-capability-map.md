# SOD1820 — ELS Full Capability + UX Map

**Status:** Strategy / design map — NOT implementation
**Actor:** GPT / Research Agent 2
**Human-Gate:** ZURIEL
**Branch:** `gpt/research-object-map`
**Date:** 2026-08-17

## 0. Purpose

This document is the full planning map for the next-generation ELS interface. It does **not** create a second engine, second tree, second database, or second source of truth.

The product goal is:

> **Maximum research capability behind minimum visible complexity.**

The user should not have to understand ELS terminology before using advanced capabilities. The interface exposes capabilities progressively according to the research object and the current state.

The existing canonical ELS engine remains the sole source of ELS findings. AI proposes, ranks, explains and challenges; it does not become the source of truth.

---

# 1. Non-negotiable architecture

1. One canonical ELS engine: `findAll` + `searchSpace` + canonical ranking/geometry contracts.
2. One corpus and one engine artifact.
3. One Research Object identity across 2D, 3D, source, numerical, graph and experiment views.
4. Matrix State is a workspace representation, not a second research database.
5. Every finding keeps its evidence, coordinates, provenance and identity when the view changes.
6. DATA / RESEARCH / INTELLIGENCE remain separate.
7. AI never silently expands the search space.
8. Human-Gate = ZURIEL for canonicalization, WRITE and publication.
9. Rank, Don't Hide.
10. Source → extraction → calculation → cross-check → interpretation remain separate.
11. Zoom and Focus are visual operations; Geometry can change the research space and must therefore be explicit.
12. The user chooses the research question, not the compute infrastructure.

---

# 2. Interface model

The UI is not a 70-button dashboard. It is a **progressive research workspace** with three practical modes:

### Mode A — Simple / Explorer
For ordinary users.

Visible:
- one search box;
- examples;
- automatic normal search or automatic simple cross when multiple terms are entered;
- matrix;
- findings;
- add word;
- save/share.

### Mode B — Researcher / Expanded
For the user who wants control without entering the deepest laboratory.

Adds:
- occurrence selection;
- proximity control;
- colors;
- finding → main axis;
- Geometry control;
- matrix display controls;
- score;
- lines;
- hide/expand/reorder findings;
- 3D / film / presentation;
- candidate suggestions;
- research questions and next steps.

### Mode C — Deep / Premium Research
For broad, expensive or multi-step investigation.

Adds:
- advanced ELS methods;
- geometry experiments and multi-geometry comparison;
- arbitrary skip series and book scope;
- Monte Carlo / null-model work;
- zone analysis;
- multiple matrices;
- AI Research Navigator;
- Challenge Mode;
- Research Budget;
- Research Path / Timeline;
- source/news/name/family integrations;
- long-running device-adaptive deep jobs.

Premium is not merely “more buttons”. It is more **research depth, compute budget, comparison, reproducibility and AI navigation**.

---

# 3. The matrix: complete capability map

## 3.1 Direct manipulation — always available when a matrix exists

| Capability | Object | Exposure | Notes |
|---|---|---|---|
| Pan / drag | Matrix State | A | Direct gesture |
| Pinch | Matrix State | A | Mobile |
| Zoom − / + | Matrix State | A | Visual only |
| Fit to screen | Matrix State | A/B | Visual only |
| Focus / center on axis or finding | Matrix State | A/B | Visual only |
| Tap letter → exact location | Evidence / Matrix State | A/B | Book/chapter/verse/offset |
| Theme: Royal dark | Matrix State | A/B | Existing |
| Theme: Classic light | Matrix State | A/B | Existing |
| Theme: Parchment | Matrix State | A/B | Existing |
| Niqqud display | Matrix State | B | Existing |
| Color findings | Finding / Matrix State | A/B | Existing |
| Change finding color | Finding | A/B | Existing |
| Show/hide axis | Axis | B | Existing |
| Draw finding line | Finding | B | Existing |
| Expand finding | Finding | B | Existing |
| Remove finding | Finding | B | Existing |
| Manual finding reorder | Finding group | B | Existing |
| Manual cell selection | Evidence / Matrix State | B | Existing |
| Heat map | Finding group / Matrix State | B | Existing |
| 3D view | Matrix State / Spatial View | B | Existing |
| Film / reveal | Matrix State | B | Existing |
| Presentation mode | Matrix State | B | Existing |
| Verse reading | Source / Matrix State | B | Existing |
| Verse span | Evidence | B | Existing |
| Matrix PNG / share card | Snapshot | B | Existing |
| Share link | Snapshot | B | Existing |

### Required placement

The matrix control strip keeps the useful controls together:

`◌ ניקוד · 🖥 התאמה · − · ＋ · 👁`

`👁` opens the display sheet containing the three themes and the secondary visualization controls.

**Score must remain in the matrix area**, next to the visual controls, as requested.

---

# 4. Geometry — explicit research capability

This is a major addition to the plan.

## 4.1 Critical distinction

### Visual geometry
- Zoom
- Pan
- Fit
- Focus

These do not change what the engine searches.

### Research geometry
- Matrix width / number of columns / rows;
- legal window width;
- geometry-specific search;
- comparison of the same axis under different geometries.

This can change which findings are inside the research window and therefore **must not be disguised as a visual control**.

## 4.2 Researcher-level Geometry control

Proposed control:

`📐 מבנה המטריצה`

Example:

`רוחב: 80   −   +`

or a slider with explicit value.

The system should clearly distinguish:

- **תצוגה בלבד** — reflow/visual presentation;
- **מרחב מחקר** — reruns the relevant search under the declared geometry.

## 4.3 Geometry exploration

Future capability:

`מצא תצוגות מעניינות`

The system can test a bounded set of candidate widths/geometries and rank them. It must show the candidate set and method, not silently choose one as “truth”.

Example:

`80 · 58 · 116`

with each result linked to its own reproducible Matrix State / Research Snapshot.

## 4.4 Why this matters

The existing measured case “מלך אוסטרי × הקיסר” demonstrated that `CW=min(S,80)` can hide a real in-window finding. Therefore Geometry is not cosmetic. It is a future research control and must be treated with provenance, search-budget awareness and Human-Gate before engine changes.

---

# 5. Search layer

## 5.1 Core search

| Capability | Exposure |
|---|---|
| Normal search | A |
| Simple cross search | A, automatic when multiple terms are entered |
| Add a word to current matrix | A/B |
| Torah default | A |
| Full Tanakh / Deep | B/C, explicit |
| Multi-term cross search | C |
| Free convergence without fixed axis | C |
| Bridge / engine-finds-axis | C |
| All-sides / mirror cross | C |
| Split/Join 8 forms | B/C, contextual chip when two-word input exists |
| Atbash / Albam / Abgad / reverse | C, expressed as research questions |
| Arbitrary skip series | C |
| Power-of-two / Fibonacci / prime skips | C |
| Single-book scope | C |
| Wildcard patterns | C |
| Neighborhood/radius search | B/C |
| Spelling variants | Future, FORMS registry |
| Multilingual candidate derivation | Future AI/derivation layer; explicit human selection |
| Letters before/after finding | B |
| Approximate mismatch search | **Do not build** |

The UI should not expose technical names unless the researcher opens Deep mode. A user sees questions such as:

- “איך זה נראה בחילופי אותיות?”
- “מה נמצא סביב הציר?”
- “בדוק וריאציות”
- “בדוק דילוגים אחרים”

---

# 6. Finding layer

Every finding becomes an actionable research object.

### Finding actions

- Focus
- Draw line
- Change color
- Expand
- Hide/remove
- Open exact occurrence
- **↑ Make primary axis**
- Add to research case
- Open source/verse context
- Compare
- Challenge

### Axis promotion

When a secondary finding becomes the primary axis:

1. The selected finding becomes the new axis.
2. The previous axis remains in the Research Path.
3. The previous axis is preserved visually as a gold finding when appropriate.
4. “Back” returns to the exact previous occurrence.
5. The transition keeps the same provenance and object identity chain.

This closes the research loop:

`find → inspect → promote → search again → compare → return`

---

# 7. Occurrence and proximity system

| Capability | Exposure |
|---|---|
| Occurrence count | A |
| Occurrence picker | B |
| Notable occurrences | B |
| Range/filter | B |
| Proximity meter | B |
| Show N findings | B |
| Finding colors | A/B |
| Expand all occurrences | B |
| Finding line | B |

The proximity control should appear only after there are findings. No dead controls before they have meaning.

---

# 8. Ranking, statistics and verification

Existing engine capabilities:

- gap / proximity ranking;
- strength score;
- rarity;
- quality score / stars;
- signature;
- notable skip classification;
- anchors;
- angle classification;
- zone chain;
- Monte Carlo;
- zone Monte Carlo.

Future rule:

**Ranking is not truth.**

A score is metadata about a result under a declared model. It must not be presented as proof.

## Open research item: strength model

The measured “מבוקשךמימשיח” case shows that the current strength scale may underweight length and rarity relative to gap/proximity. This remains a separate future calibration project and must not be mixed into UI redesign.

---

# 9. Candidate generators

Existing generators to expose contextually:

1. `suggestCluster` — nearby word cluster.
2. `autoTerms` — terms derived from axis/neighborhood/anchors.
3. `scanCandidates` — dictionary candidates inside the window.
4. `scanNeighborhood` — nearby words.
5. `gemGen` — numerical candidates.
6. `discoverHotAreas` — candidate regions.
7. `buildHypotheses` — research hypotheses.
8. `scanAxisLineNow` — words on continuation of axis.

## UX rule

Never show a wall of candidates.

The pipeline is:

`INPUT → CANDIDATES → RANKING → USER CHOICE → NEXT STEP`

Show 2–3 high-value next options first, with “עוד מועמדים” available. Never delete lower-ranked candidates from the underlying research record.

---

# 10. Research questions instead of technical “lenses”

The old advanced-lens architecture can remain internally, but the user-facing language should be question-based.

Examples:

### Spatial
- What is nearby?
- What is above/below?
- What is diagonal?
- What is on the same line?

### ELS
- What happens in reverse?
- What happens in letter substitutions?
- What related axes appear?
- Which additional legal skips matter?

### Text
- What is the verse context?
- What words surround this finding?

### Numerical
- What canonical numerical relations exist?

### Verification
- How rare is this?
- Can it be reproduced?
- What happens under the null/control?
- What changes if the geometry changes?

Technical terms such as Atbash, Monte Carlo, anchors, etc. remain available in Deep mode for expert users.

---

# 11. Research Object architecture

Core objects:

`Entity`
`Term`
`Axis`
`Finding`
`Cluster`
`Candidate`
`Hypothesis`
`Experiment`
`Evidence`
`Interpretation`
`Research Path`
`Research Case`
`Matrix State`
`Source`
`Signal`
`Research Plan`
`Recommendation`
`Decision`
`Research Snapshot`
`Conclusion`

## Lifecycle

`SOURCE → SIGNAL → ENTITY → TERM → PLAN → CANDIDATE → HUMAN CHOICE → AXIS → MATRIX STATE → FINDING → EVIDENCE/CLUSTER/NEW AXIS → HYPOTHESIS → EXPERIMENT → ANALYSIS → INTERPRETATION → CONCLUSION`

No object is silently upgraded from candidate to fact.

---

# 12. AI Research Navigator

AI is not a generic chatbot next to the matrix.

It is a navigation and challenge layer over existing Research Objects.

For a selected finding, AI can propose:

- spatial investigation;
- ELS variants;
- source/text context;
- numerical analysis;
- cross-finding relationships;
- verification/control tests;
- next-step candidates.

## AI Research Map

`Finding → Spatial / ELS / Text / Numerical / Verification`

Each branch leads to explicit, bounded actions.

## AI Research Budget

Material searches should show:

- seeds;
- widths;
- depth;
- methods;
- controls;
- expected compute cost;
- what decision the test could change.

If a test cannot change a decision, it should not be prioritized merely to generate more information.

## AI Challenge Mode

AI should actively search for alternative explanations:

- parameter dependence;
- post-hoc selection;
- null-model behaviour;
- control failure;
- geometry dependence;
- multiple-comparison effects.

AI challenges the researcher; it does not merely confirm them.

## AI Research Brief

Every major finding can receive:

- OBSERVED;
- GEOMETRY;
- KNOWN;
- UNKNOWN;
- POSSIBLE HYPOTHESES;
- RECOMMENDED NEXT TEST;
- WHY;
- DO NOT TEST YET.

---

# 13. External signal → research pipeline

Future program goal: a real-world signal, such as a news item, should be able to become a structured research seed.

Example:

`News signal → entities → dates → numbers → candidate terms → human selection → ELS research`

This includes the larger planned flows:

- a surname/person;
- parents;
- children;
- relatives/uncles;
- related names;
- a news clue;
- all terms derived from the clue;
- numerical relations;
- ELS axes;
- candidate clusters.

Important: AI may extract and propose terms from a news source, but the source, extraction, candidate status and selected research form must remain separately provenance-tagged.

---

# 14. Family / identity research integration

Existing FamilyCross / `connectToAxis` capabilities should eventually connect to ELS through the shared Research Object model.

Desired experience:

`Person → Name → Family relations → Candidate terms → ELS axis → Findings → Research Path`

No separate family engine is created for ELS.

The canonical graph remains the site's single graph.

---

# 15. Shared 2D / 3D / Source / Numerical / Graph / Experiment views

A Finding keeps the same identity across views.

Supported future views:

- 2D Matrix;
- 3D spatial view;
- Torah/source view;
- numerical view;
- graph view;
- experiment view.

### 2D ↔ 3D

Selecting a finding in either view selects the same finding in the other.

### 3D progressive disclosure

Do not render an overwhelming universe of letters at once.

`Universe → Layer → Region → Matrix → Letters`

Possible operations:

- pin finding;
- look above/below;
- show path;
- show neighbours;
- diagonal sections;
- cross section/slice;
- compare;
- local volume.

Visualization is not evidence.

---

# 16. Multi-geometry research

This is the strategic extension added on 2026-08-17.

### Capability A — change geometry
Researcher chooses a declared width/geometry.

### Capability B — compare geometries
The same axis is rendered/analyzed under multiple declared geometries.

### Capability C — geometry discovery
The system can test a bounded candidate set and rank them.

### Capability D — geometry provenance
Every result records the geometry under which it was found.

### Capability E — geometry sensitivity
A research brief can state:

> “This finding appears under geometries X and Y but not Z.”

This is especially valuable for Challenge Mode because geometry selection can otherwise become a hidden degree of freedom.

---

# 17. Matrix comparison

Two or more Matrix States may be compared without creating duplicate findings.

Example:

`2D Matrix A ↔ 2D Matrix B`

or:

`2D ↔ 3D`

or:

`Geometry 58 ↔ Geometry 80 ↔ Geometry 116`

The comparison view references shared Research Objects and explicit snapshots.

---

# 18. Saved matrices and backwards compatibility

The new UI must preserve the existing saved-matrix contract.

Acceptance requirement:

- test every legacy matrix with `search_term`;
- compare old vs new state;
- preserve axis, skip, direction, start, occurrence, geometry, findings, colors, display state, saved metadata and provenance;
- a legacy matrix that cannot load is a compatibility failure, not permission to rewrite the data;
- 97/97 completed comparisons were already achieved in the latest architecture cycle; two very slow Tanakh records remain known performance cases and must remain separately tracked.

Saved matrices, variants, gallery, load, moderation and research dossiers remain part of the product even if their controls move to contextual UI.

---

# 19. Save / Share / Research Case

Keep:

- save;
- anonymous save where supported;
- update;
- variants;
- duplicate detection;
- gallery;
- load;
- contribution;
- challenges;
- researcher dossier;
- human moderation;
- share link;
- PNG/share card.

The user should not have to understand database or moderation terminology.

---

# 20. Compute orchestration

The interface is mobile-first, but computation is device-adaptive.

### Tier 0 — main thread
Cheap operations:

- pan;
- pinch;
- zoom;
- fit;
- focus;
- color;
- display;
- selection;
- lightweight state changes.

### Tier 1 — Worker / WASM / GPU
Medium/heavy local operations:

- large on-demand scans;
- candidate generation;
- multi-form searches;
- matrix recomputation;
- bounded spatial analysis.

A Worker must use the canonical engine logic or a shared compiled representation. No copied engine.

### Tier 2 — server deep research
Large jobs:

- full-corpus deep searches;
- many seeds;
- many methods;
- many widths/depths;
- expensive Monte Carlo;
- cross-case research;
- AI orchestration over large result sets;
- long-running experiments.

The user asks **what to research**. The orchestrator chooses where it executes.

No silent degradation: if a cheaper execution tier cannot preserve the declared research contract, the system must say so or route upward.

---

# 21. Premium architecture

Premium should mean **research depth**, not visual clutter.

Potential premium capabilities:

1. Deep full-Tanakh research jobs.
2. Multi-geometry comparison.
3. Large candidate sets with ranked exploration.
4. Long-running research experiments.
5. Monte Carlo / null-model batches.
6. AI Research Navigator.
7. AI Challenge Mode.
8. Research Budget.
9. Research Briefs.
10. Research Timeline / replay.
11. Multi-matrix comparison.
12. 2D/3D/source/numerical/graph views.
13. News-signal research ingestion.
14. Family/name research integration.
15. Reproducible research snapshots.
16. Advanced provenance and export.

Premium must never bypass the epistemic rules: premium ≠ truth, VIP ≠ truth, AI ≠ canon.

---

# 22. Research Path / Timeline

Every meaningful transition can become a path node:

`Seed → Axis → Finding → New Axis → Cluster → Candidate → Experiment → Challenge → Conclusion`

The user can:

- return to any node;
- compare branches;
- replay the investigation;
- see what was selected and why;
- distinguish machine suggestions from human decisions.

This becomes the backbone for a future Research Case / dossier.

---

# 23. What stays internal

The following should remain available internally but should not clutter Simple mode:

- 11 technical lenses;
- raw cross panels;
- technical mirror names;
- Monte Carlo implementation details;
- anchor tables;
- raw engine diagnostics;
- raw state payload;
- technical provenance fields;
- admin moderation tools;
- debug/Work Area.

They are not deleted. They are contextualized.

---

# 24. What must NOT be built

- second ELS engine;
- React ELS reimplementation;
- second ELS database;
- separate “AI ELS engine”;
- separate research tree;
- `maxMismatches=1` approximate engine;
- silent search-space shrinking for performance;
- automatic 8-form Tanakh expansion before Worker/compute support;
- AI that silently changes search parameters;
- premium path that promotes candidates to facts;
- hidden geometry changes with no provenance.

---

# 25. Open technical gates

These remain separate from the UI redesign:

1. **Geometry/CW parameter** — measured real finding loss under `CW=min(S,80)`; requires performance testing and Human-Gate.
2. **Strength model calibration** — current model may underweight rarity/length; requires independent measurement.
3. **clusterStat** — canonical full-space null model currently too expensive (~3.8s in prior measurement inside save); requires separate compute design.
4. **Worker** — only after measurement shows the threshold where local blocking becomes unacceptable.
5. **Single-book / arbitrary skip exposure** — existing `findAtSkips` needs safe UI exposure and acceptance.
6. **Legacy dead code cleanup** — only when separately scoped.
7. **State freshness** — some UI mutations update state only on the next render; fix before relying on state for downstream automation.
8. **AI/Research Context wiring** — `entityFromEls`, Research Context, Raziel and Router are integration work, not a new engine.

---

# 26. Recommended build sequence

### Phase A — UI foundation
1. New simple search surface.
2. Remove legacy instructional UI from the visible flow; keep policy/registration gates separate.
3. Matrix control strip: score + fit + zoom + display sheet.
4. Three themes.
5. Findings card.
6. Add-word flow.
7. Save/share.

### Phase B — Researcher loop
8. Occurrence picker.
9. Proximity control.
10. Finding actions.
11. Finding → primary axis.
12. Research Path / Back.
13. Candidate suggestions.
14. 3D / film / presentation.

### Phase C — Geometry
15. Explicit Geometry control.
16. Display-vs-research geometry distinction.
17. Geometry provenance.
18. Bounded multi-geometry comparison.
19. Geometry sensitivity / challenge output.

### Phase D — Deep research
20. Arbitrary skip series.
21. Single-book scope.
22. Advanced ELS questions.
23. Statistical / null-model tools.
24. Multi-matrix comparison.

### Phase E — AI Research Navigator
25. entityFromEls.
26. Research Context.
27. AI next-step candidates.
28. Research Budget.
29. Challenge Mode.
30. Research Brief.
31. Research Timeline.
32. Family/name integration.
33. News-signal ingestion.

### Phase F — Compute
34. Benchmark.
35. Worker.
36. WASM/GPU where justified.
37. Server deep jobs.
38. Unified compute provenance.

### Phase G — Premium research workspace
39. Full Deep Research mode.
40. Multi-view comparison.
41. Reproducible experiments.
42. Research dossiers/export.

No phase implies automatic merge/deploy. Each phase requires its own acceptance and Human-Gate.

---

# 27. Final product principle

The target is not:

> “A page containing every ELS feature.”

The target is:

> **“A single research environment in which every ELS capability is available when it becomes meaningful, while the user sees only the next useful decision.”**

The system should feel simple at the surface and become extremely powerful underneath.

**Engine discovers and organizes. ZURIEL researches, interprets and chooses. AI assists and challenges.**
