# SOD1820 — G3 GEMATRIA PRESENTATION CONTRACT V1

**Status:** BRANCH-ONLY · P1 MODEL + P2 GOLDEN CARD IMPLEMENTED · NOT MERGED · NOT DEPLOYED  
**Human Gate decisions:** ZURIEL · 2026-09-19  
**Canonical owner:** EXTEND_EXISTING `project_codex.gematria_engine`  
**Method presentation/order owner:** `canonical_methods_registry_law v6`  
**Dependencies:** `gematria_engine_law v2` · `gematria_db_first_and_enrich_law v3` · `engine_governance_registry_authority_law v1` · `method_lifecycle v2` · `truth_axes_foundation_law v3` · `experience_governance_foundation_v1_law v7` · `research_workspace_law v4`  
**Visual owner:** `SOD1820_DESIGN_CONTRACT_V1.md`  
**Principle:** one execution truth, one method registry, one presentation model, many projections.

## 1. Why this contract exists

The deterministic Gematria engine and method Registry are already mature. The remaining structural problem is presentation fragmentation: Number 2029, Topic, Legacy professional calculator, Number Drawer, Raziel and future Book/Post consumers can currently present the same engine truth in different local shapes.

This contract does **not** create another engine, registry, graph, store, truth rank or calculator authority.

It defines one presentation contract over the existing canonical owners so every consumer can render the same calculation truth at an appropriate depth.

## 2. Live baseline — 2026-09-19

Verified against canonical Supabase project `linswmnnkjxvweumprav` and origin/main `483af30a2c190d06c672325f3e6646c92c4cb519`.

Live Registry state:
- 41 registered method identities.
- 32 active.
- 37 executable.
- 37 engine-verified.
- 28 scannable.
- 11 rows carry explicit `derived_from`.
- 6 rows exist in `method_equivalence`.
- 0 `in_engine_drift`.
- every active method is currently executable and engine-verified.

Current canonical execution/read capabilities already exist:
- `public.gematria_methods`
- `public.v_method_states`
- `public.fn_method_value(method_key, phrase)`
- `public.fn_method_profile(phrase, depth)`
- `public.fn_all_methods_full(subject, entitlement)`
- `public.gematria_method_trace(method_key, phrase)`
- `src/lib/research/gematriaMethodRegistry.js`
- `src/lib/research/gematriaTrace.js`
- `src/lib/research/numberCoreProjection.js`
- `src/lib/presentation/canonicalPresentation.js`

### Historical DRIFT note

The older `audits/gematria_methods_unification/GEMATRIA_METHODS_UNIFICATION_PLAN.md` accurately records a historical reconciliation stage, but its live-status assumptions are no longer current. It describes gaps, inactive rows and unregistered methods that have since been implemented/activated/reconciled.

Live Registry + live execution now override that historical status. The audit remains provenance, not current authority.

## 3. One-tree architecture

```
Expression / Number context
        ↓
Canonical normalization
        ↓
Canonical Method Registry
        ↓
Canonical execution
        ↓
Method Profile
        ↓
Dependency / Equivalence / Family metadata
        ↓
Verification + Trace
        ↓
GEMATRIA PRESENTATION MODEL
        ↓
Context-aware projection
        ↓
S0 Inline / S1 Card / S2 Explorer / S3 Deep Trace
        ↓
Number · Topic · Book · Post · Drawer · Raziel · Heichal · Journey
```

The Presentation Model is an adapter/projection. It never calculates a value independently and never decides evidence strength independently.

## 4. Canonical Presentation Model

A presentation consumer should be able to receive one stable conceptual shape:

```text
subject
  expressionRaw
  expressionNormalized
  numberRoot
  focusKind            # expression | number

activeMethod
  methodKey
  publicLabel
  value
  version
  category
  family
  executionKind
  role                 # independent | derived | equivalent | composite | contextual
  verification
  access

methods[]
  same shape as activeMethod

normalization
  changed
  reason[]
  visibleNoticeNeeded

relationsSummary
  count
  leadingRelation
  journeyAvailable

trace
  available
  lazy                  # full trace is not required for S0/S1

continuity
  expression
  methodKey
  focus
  researchContextRef
```

This is a conceptual contract. Field names may reuse/extending existing runtime objects; implementation must avoid a duplicate stored model.

## 5. Locked Human-Gate decisions

The following decisions were approved by ZURIEL in sequence on 2026-09-19.

### D1 — Adaptive focal identity

The same Gematria truth is shown from the current Research Context:

- Expression context: **Expression → Number**
- Number context: **Number ← Expression**

Number and Expression remain distinct identities looking at the same calculation from opposite directions.

### D2 — Adaptive active method

If Research Context already carries a method, that method is primary.

If no method context exists, `רגיל` is the default presentation method where available.

A local screen must not replace this with its own default-priority array.

### D3 — Independent evidence vs dependent display

All relevant methods may remain visible, but independent strength must be separated from:
- derived methods,
- conditional equivalents,
- composite methods,
- dependent expression evidence.

UI may say, for example:

`2 שיטות עצמאיות · +3 נגזרות/שקולות`

It must never imply five independent evidence axes.

The Presentation layer consumes dependency/equivalence classification from governed owners. It does not invent strength.

### D4 — Human method grouping with canonical order inside

Method Explorer groups methods into understandable families based on Registry metadata.

Within each family, canonical Registry order remains authoritative.

No local screen owns its own method ranking.

### D5 — Lightweight relation/Journey continuation

A Gematria projection may expose a small continuation signal into the existing Reality Graph/Journey without eagerly loading the relation graph.

Default compact state:
`7 חיבורים · מסע זמין`

If the current Research Context already concerns a specific relation:
`520 ↔ 888 · המשך במסע`

S0/S1 should receive only bounded summary fields such as:
- relation count,
- leading relation when contextually relevant,
- journey availability.

Full graph/relation loading is lazy.

### D6 — Quiet verified state; explicit exceptional state

A normal verified deterministic result should not be overloaded with a permanent “verified” badge.

Material exceptional states must be visible when relevant:
- נגזר
- שקול
- מורכב
- הקשרי
- מועמד
- לא נבדק
- אי־התאמה
- לא זמין

Full verification/provenance is always available in S3/Inspect.

### D7 — Local expansion first, full surface second

Normal interaction with a Gematria Card opens a local S2 expansion without forcing navigation.

A separate explicit action opens the canonical Number/Expression surface while preserving Research Context.

Number Drawer may consume the same Presentation Model; it must not become a second Gematria UI truth.

### D8 — Original expression visible; normalization transparent

The original user/source expression remains the visible heading.

Canonical normalization happens beneath the surface.

If normalization materially changes the calculation representation, UI must disclose it in plain language.

S3 can expose:
`מקור → נרמול → חישוב`

Normalization never silently rewrites historical/source identity.

### D9 — Bounded S2 method disclosure

S2 must not dump all active methods by default.

Default:
- active method first,
- approximately 4–5 contextually relevant methods,
- meaningful derived/equivalent group if needed,
- explicit “כל השיטות” control.

Full Registry visibility remains available on demand.

### D10 — Same-value grouping without identity loss

If several methods return the same value, presentation may group them under one value to reduce duplication.

Grouping must preserve each method identity and role inside the group.

Equivalent/derived/composite methods must not be visually merged into one canonical method identity.

### D11 — Context-activated methods stay contextual

A context-activated method is shown only when the context permits/requests it.

It must be visibly explainable as contextual and must never enter ordinary exhaustive scanning simply because it is registered/executable.

### D12 — Human family first, exact method retained

User-facing grouping may say:
- שיטות יסוד
- שיטות עומק
- שיטות מורכבות
- שיטות מיוחדות/הקשריות

The exact `method_key` remains canonical identity underneath.

Family labels are presentation metadata, not method merging.

### D13 — Long-running calculation progress is canonical and progressive

If a Gematria/deep research action is not immediate, do not use an unexplained spinner as the final interaction.

Use the canonical long-operation progress pattern with truthful stages, for example:
- מנרמל
- מחשב שיטות
- בודק Trace
- בודק תלות/שקילות
- מחפש חיבורים

Completed partial results may render progressively while slower optional layers continue.

The progress layer must not claim a stage the backend/runtime did not actually execute.

### D14 — Access is orthogonal to existence/truth

Active and accessible method: normal display.

Registered but unavailable/restricted/research-only method: may be shown only when contextually relevant, with an honest availability explanation.

Presentation must not compute or reveal a restricted result merely because method metadata is visible.

### D15 — Exact research reopen

Deep links / Research Context should be able to recover at minimum:
- expression,
- active method,
- focus.

Do not serialize the entire ephemeral UI tree into the URL.

Journey/Raziel/Drawer transitions preserve the same semantic selection.

## 6. Four presentation depths

### S0 — Inline

Purpose: tiny mention inside Topic, Post, Book, Search, Raziel answer.

Example:
`עמית · 520 · רגיל`

No heavy method list, graph fetch or Trace.

### S1 — Gematria Card

Canonical reusable cross-surface unit.

Minimum visible content:
- focal Expression or Number according to context,
- active result,
- active method label,
- only material exceptional state,
- lightweight relation/Journey continuation if available,
- actions: local expand / full surface.

S1 is the most important reusable renderer.

### S2 — Method Explorer

Local expandable view.

Shows:
- active method first,
- bounded related methods,
- Registry families,
- independent vs derived/equivalent/composite grouping,
- same-value grouping,
- expression alternatives where relevant,
- lightweight relation continuation,
- “all methods” expansion.

S2 remains DOM-first/Tier A unless data density later proves a shared Tier B renderer is necessary.

### S3 — Deep Trace / Inspect

Shows exact calculation explanation and provenance:
- raw expression,
- normalized representation,
- method identity/version,
- execution kind,
- dependencies,
- steps,
- engine result,
- verification state,
- source/provenance,
- access state where applicable.

S3 explains HOW a result was produced. It must not invent WHY it is meaningful.

## 7. Truth boundaries

These distinctions remain mandatory:

- Calculation != Interpretation
- Engine Result != Claim
- Trace != Finding
- Finding != Canonical
- Same value != same method identity
- Equivalent methods != independent evidence
- Composite result != independent axis
- Same-letter/anagram equality under order-insensitive methods != independent novelty
- Relation count != truth probability
- Journey availability != recommendation of truth

Visual prominence must never alter these distinctions.

## 8. Performance / “deep but light” rule

The Gematria experience may be extremely deep without eagerly loading everything.

### S0/S1 fast path

Do not eagerly fetch:
- all relation edges,
- full Journey graph,
- every method Trace,
- spatial renderer,
- full provenance history.

Prefer:
- active method result,
- bounded method summary,
- bounded relation summary,
- booleans/counts for deeper availability.

### Lazy layers

Load only on demand:
- full method catalog,
- Trace,
- relation graph,
- Journey route,
- Heichal deep research,
- future Canvas/WebGL spatial representations.

Future S3/S4 spatial work must render the same Presentation/Reality data, never create a second relation truth.

## 9. Long-operation feedback

Gematria, ELS and other deep operations may share a canonical progress primitive owned by the global Experience layer.

For Gematria, the presentation contract requires:
- progress reflects actual stages,
- partial completed results can appear early,
- cancellation/failure states are honest,
- long operations may surface useful context while waiting,
- no decorative fake progress percentage.

A future shared component should be resolved under the Experience owner rather than created locally in Gematria.

## 10. Golden calibration cases before broad rollout

No broad consumer migration should start until S1/S2 are validated against multiple shapes.

Minimum calibration set:

1. **עמית**
   - default regular view,
   - context-selected מילוי,
   - multiple method results.

2. **Same-value dependent/equivalent case**
   - prove grouping without evidence inflation.

3. **Composite case**
   - e.g. `רגיל+מילוי` or another live composite,
   - visibly composite,
   - parents retained.

4. **Context method**
   - e.g. `אות רבתי`,
   - must remain context-activated.

5. **Relation/Journey case**
   - a live Number↔Number or convergence path,
   - S1 carries only summary,
   - deeper graph lazy-loads.

6. **Normalization-changing input**
   - prove original visible expression survives,
   - normalized execution is inspectable.

7. **Inactive/unimplemented method**
   - identity may exist,
   - no fabricated result.

## 11. Consumer rollout order

After this contract is reviewed:

### Phase P1 — Pure Presentation Model
Implement one pure projection adapter over existing Method Profile/Registry/Trace/dependency data.

**Implementation status on PR #570:** COMPLETE BRANCH-ONLY. The pure adapter lives at `src/lib/presentation/gematriaPresentation.js`; it performs no calculation and no Supabase read/write. Focused fixtures live at `src/lib/presentation/gematriaPresentation.test.js`, and decision-critical P1 assertions are wired into the existing canonical presentation CI gate at `scripts/test_canonical_presentation.mjs`.

No UI replacement yet.

### Phase P2 — Golden Gematria Card
Build S0/S1/S2 shared components and calibrate against the Golden Cases.

**Implementation status on PR #570:** Golden S1/S2 shared card implemented at `src/components/GematriaCard.jsx` with component-local semantic stylesheet `src/components/gematriaCard.css`. It consumes the P1 Presentation Model only. No consumer is wired yet.

### Phase P3 — Number / Expression 2029
Make Number/Expression the Golden Consumer.

Do not cut over canonical routes until global cutover parity passes.

### Phase P4 — Number vs Expression identity experience
Make the two directions explicit:
- Expression → result set / numbers
- Number → expressions / methods arriving at it

Do not mint duplicate entities merely for UI convenience.

### Phase P5 — Topic
Replace local numeric-claim geometry with the shared Gematria projection.

Topic keeps its own narrative/Convergence role; it does not own a local Gematria renderer.

### Phase P6 — Other consumers
Adopt the same core in:
- Books,
- Posts,
- Raziel,
- Drawer,
- Search,
- World,
- Journey,
- Heichal.

### Phase P7 — Spatial
Only after semantic/UI stability:
- layered 2D,
- Canvas,
- GPU 3D,
- future XR.

Same truth, new renderer.

## 12. Explicit non-goals

This contract does not:
- create a new engine;
- create a second Method Registry;
- change a method formula;
- activate/deactivate a method;
- change `required_entitlement`;
- change RLS/GRANT;
- change ranking/evidence strength;
- create a new relation graph;
- create a new Journey system;
- create a new Number/Expression identity store;
- change canonical URLs;
- merge/deploy any UI;
- authorize a WebGL/3D build.

## 13. Parallel-writer boundary

At contract creation time, `EXPRESSION_EVIDENCE_DEPENDENCY_NORMALIZATION_V1` is an active separate writer.

This contract:
- does not modify its files,
- does not classify anagram/dependency evidence itself,
- requires the Presentation Model to consume governed dependency output once available,
- keeps UI grouping separate from evidence/ranking authority.

One scope, one writer remains intact.

## 14. Live Registry inventory appendix

Snapshot source: `public.gematria_methods`, canonical Supabase, 2026-09-19.

| # | method_key | public label | category | active | execution | family | derived_from | access | v |
|---:|---|---|---|:---:|---|---|---|---|---:|
| 1 | רגיל | רגיל | base | yes | sql_function | base_additive | — | public | 1 |
| 2 | מילוי | מילוי | base | yes | sql_function | base_additive | — | public | 1 |
| 3 | מסתתר | מסתתר | base | yes | sql_function | adjacent_difference | — | public | 1 |
| 4 | קדמי | משולש | base | yes | sql_function | base_additive | — | public | 1 |
| 5 | ריבוע | ריבוע | base | yes | sql_function | cumulative_prefix_sum | — | public | 1 |
| 6 | גדול | גדול | base | yes | sql_function | base_additive | — | public | 1 |
| 7 | סידורי | סידורי | base | yes | sql_function | base_additive | — | public | 1 |
| 8 | אתבש | אתבש | base | yes | sql_function | base_additive | — | public | 1 |
| 9 | אלבם | אלבם | base | yes | sql_function | base_additive | — | public | 1 |
| 10 | אטבח | אטבח | base | yes | sql_function | base_additive_substitution | — | public | 1 |
| 11 | אותיות אחרי | אותיות אחרי | base | yes | sql_function | base_additive | — | public | 1 |
| 12 | אותיות לפני | אותיות לפני | base | yes | sql_function | base_additive | — | public | 1 |
| 13 | מילוי בלבד | מילוי בלבד | composite | yes | composite_engine | composite_diff | מילוי + רגיל | public | 2 |
| 14 | הכפלה | הכפלה | base | yes | sql_function | letter_square_sum | — | public | 1 |
| 15 | משולש גדול | משולש גדול | depth | yes | sql_function | base_additive | — | public | 1 |
| 16 | מסתתר גדול | מסתתר גדול | depth | yes | sql_function | adjacent_difference | — | public | 1 |
| 17 | מילוי דמילוי | מילוי דמילוי | depth | yes | sql_function | base_additive | — | public | 1 |
| 18 | מילוי דמילוי גדול | מילוי דמילוי גדול | depth | yes | sql_function | base_additive | — | public | 1 |
| 19 | הכפלה גדולה | הכפלה גדולה | depth | yes | sql_function | letter_square_sum | — | public | 1 |
| 20 | ריבוע גדול | ריבוע גדול | depth | yes | sql_function | cumulative_prefix_sum | — | public | 1 |
| 21 | משולש מילה | משולש מילה | depth | yes | sql_function | cumulative_prefix_sum | — | public | 1 |
| 22 | משולש הפוך | משולש הפוך | depth | yes | sql_function | position_weighted_sum | — | public | 1 |
| 23 | משולש מדרגות | משולש מדרגות | depth | yes | sql_function | position_weighted_sum | — | public | 1 |
| 24 | מילוי גדול | מילוי גדול | depth | yes | sql_function | — | — | public | 1 |
| 25 | רגיל+מילוי | רגיל + מילוי | composite | yes | composite_engine | composite_sum | רגיל + מילוי | public | 1 |
| 26 | רגיל+מסתתר | רגיל + מסתתר | composite | yes | composite_engine | composite_sum | רגיל + מסתתר | public | 1 |
| 27 | רגיל+משולש | רגיל + משולש | composite | yes | composite_engine | composite_sum | רגיל + קדמי | public | 1 |
| 28 | משולש מילה+משולש הפוך | משולש מילה + משולש הפוך | composite | yes | composite_engine | composite_sum | משולש מילה + משולש הפוך | public | 1 |
| 29 | איק בכר | אי"ק בכ"ר | base | yes | sql_function | base_additive_substitution | — | public | 1 |
| 30 | אות רבתי | אות רבתי · אלפים | base | yes | context_activated | extended_letter_values | רגיל + גדול | public | 1 |
| 31 | אטבח_רבנו_חנאל | א"ט־ב"ח · רבנו חנאל | base | no | sql_function | base_additive_substitution | — | public | 2 |
| 32 | אטבח_רשי | א"ט־ב"ח · רש"י | base | no | unimplemented | — | — | public | 1 |
| 33 | מיקום האות | מיקום האות · 1–27 | base | yes | sql_function | base_additive | — | public | 1 |
| 34 | במדבר רבה | במדבר רבה | base | no | unimplemented | — | — | public | 1 |
| 35 | מילוי בלבד גדול | מילוי בלבד גדול | composite | yes | composite_engine | — | מילוי גדול + רגיל | public | 1 |
| 36 | אח״ס–בט״ע | אח״ס–בט״ע | base | no | unimplemented | — | — | public | 1 |
| 37 | ערך הזמן | ערך הזמן | context | no | — | contextual_numeric_transform | — | public | 1 |
| 38 | en_ordinal | English Ordinal | base | no | sql_function | latin_additive_map | — | public | 1 |
| 39 | en_full_reduction | Full Reduction | base | no | sql_function | latin_additive_map | — | public | 1 |
| 40 | en_reverse_ordinal | Reverse Ordinal | base | no | sql_function | latin_additive_map | — | public | 1 |
| 41 | en_reverse_reduction | Reverse Reduction | base | no | sql_function | latin_additive_map | — | public | 1 |

## 15. Acceptance gate for Stage 1

Stage 1 is complete when:
- current owner tree is resolved live;
- live Registry inventory is recorded;
- historical status drift is explicit;
- all ZURIEL presentation decisions D1–D15 are recorded;
- no parallel engine/store/registry is created;
- dependency/equivalence/ranking remain outside Presentation authority;
- Journey continuation is specified as lazy summary, not eager graph loading;
- S0–S3 depth contract is defined;
- performance/access/normalization/deep-link rules are defined;
- rollout order is explicit;
- no UI/code/DB semantic mutation occurs in this stage.

## 16. Next gate

The next implementation stage is **P1 — Pure Gematria Presentation Model**.

Before P1 WRITE:
1. rescan active work_log writers;
2. verify exact output shapes of live `fn_method_profile`, `v_method_states`, dependency/equivalence inputs and `gematria_method_trace`;
3. implement a pure adapter with synthetic tests;
4. do not replace Number/Topic/Legacy UI yet;
5. stop for Human Gate review before S1/S2 visual component work.


## 17. P1 implementation record

P1 converts the locked contract into a pure reusable runtime projection without changing any consumer UI.

Implemented:
- `buildGematriaPresentationModel()` in the existing presentation owner tree;
- accepts both live RPC snake_case and existing camelCase projection rows;
- Registry order remains the only method-order authority;
- Research Context method is active-first, with `רגיל` fallback;
- Expression-first / Number-first focal projection;
- structural method roles: independent / derived / equivalent / composite / contextual;
- governed evidence independence is consumed as input only; unknown remains explicit and is never inferred;
- applied equivalence is consumed only after an upstream owner resolves that it applies;
- context-activated methods are hidden unless explicitly activated;
- same-value grouping preserves every method identity;
- family grouping is human-facing while preserving Registry order inside each family;
- restricted values are redacted rather than leaked;
- inactive/unimplemented identity may be surfaced explicitly without fabricating a value;
- original expression identity is preserved separately from supplied normalization;
- relation/Journey and Trace remain bounded/lazy summaries;
- continuity retains only semantic reopen state.

Explicitly unchanged:
- Gematria engine/functions/formulas;
- `gematria_methods` and `v_method_states`;
- DB schema/data/RLS/GRANT;
- evidence/ranking/dependency computation;
- Reality Graph/Journey;
- Number/Topic/Book/Post/Raziel/Drawer UI;
- routes/SEO/share;
- 3D/spatial rendering.

Verification gate for the P1 code head:
- canonical Gematria-method regression gate: PASS;
- canonical presentation regression gate includes P1 Golden assertions;
- legacy + 2029 production builds: PASS;
- no Supabase mutation required.

The next phase remains **P2 — Golden Gematria Card**, and must not begin until P1 final head is reviewed/accepted.


## 18. P2 implementation record

P2 turns the pure Presentation Model into the first reusable visible Gematria renderer.

Implemented:
- one shared `GematriaCard`, not a Post/Topic/Number-specific card;
- S1 compact summary: adaptive Expression/Number focus, active method, exceptional state only, bounded relation/Journey signal;
- click-to-expand S2 without navigation;
- active method first, bounded preview, then “all methods” local disclosure;
- human Registry-family grouping with canonical method order preserved inside;
- same-value grouping explanation without method-identity merge;
- governed independent/dependent evidence summary only when upstream classification exists;
- normalization disclosure only when P1 marks it materially visible;
- lazy Journey and Trace actions through callbacks only;
- explicit “open full page” callback;
- post projection class for future inline Post rendering without any Post truth logic;
- semantic palette consumption through `usePalette` + canonical typography roles;
- 44px interaction floor, focus-visible states, RTL logical properties, responsive mobile layout and reduced-motion fallback.

State boundary:
- local component state is limited to S1/S2 open/closed and “show all methods” disclosure;
- active method, focus, Research Context, Journey state and canonical selection stay outside the component;
- the card never writes Research Context directly;
- the card never queries Supabase and never calculates Gematria.

Not implemented in P2:
- no Post/Topic/Book/Number/Raziel consumer wiring;
- no auto-extraction of Gematria from Post HTML;
- no replacement of legacy `sod-gematria-box`;
- no screenshot/share-image renderer;
- no OG/API-card replacement;
- no CanonicalProgress integration (only required when a consumer launches actual long work);
- no DB/schema/RLS/engine/ranking changes.

The future share path remains:
`Gematria Presentation Model → live GematriaCard → share/image renderer`,
so a social image becomes a static projection of the same truth rather than a calculator screenshot becoming the truth source.

### P2.1 — Expression Evidence normalization projection

After the canonical Reliability release (#569 + #572), the Golden Card consumes a second, separate evidence axis for **expression-level dependency normalization**.

Owner boundary:
- canonical computation remains `public.cross_method_strength` / `fn_relation_candidate`;
- Research Strength remains owned by `research_gold_hints_law` and the existing evidence-governance tree;
- the Presentation Model **only projects supplied counts**;
- `GematriaCard` never queries the DB, never derives `raw - independent`, never computes a score and never upgrades truth.

Presentation input:
- `expressionEvidenceSummary.phrase_count` → raw expression count;
- `independent_phrase_count` → dependency-normalized expression families;
- `dependent_expression_phrase_count` → expressions that remain visible but add no new evidence weight;
- `p1_hits` and `independent_p1_method_count` remain available to deeper projections;
- `signal` is preserved as governed context but is not rendered as a truth badge.

Golden behavior:
- S1 stays quiet unless dependency normalization changed the apparent result set; when it did, a neutral signal such as “4 התאמות תלויות” prevents false excitement without hiding results;
- S2 presents the independent count first, then raw count and dependent delta: e.g. “120 קבוצות ביטוי עצמאיות · 124 ביטויים נמצאו · 4 לא מוסיפים משקל חדש”;
- no color, glow or badge may imply that a larger count is “truer”;
- every original expression remains addressable in deeper views;
- a structure-sensitive independent lead remains visible separately and is never collapsed by Presentation.

Live calibration contract:
- value `474`: `124 raw → 120 independent`, dependent delta `4`;
- `דעת / עדת / תדע` share one dependency family where equality is structure-insensitive;
- `דעת ↔ עדת` may still retain the separately governed structure-sensitive composite lead;
- the card must consume these distinctions, never re-implement their rules.

This completes the semantic bridge:
`Reliability owner → Presentation Model → Golden Card`,
with no parallel ranking or UI truth system.
