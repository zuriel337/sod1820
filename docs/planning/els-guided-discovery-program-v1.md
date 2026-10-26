# ELS Guided Discovery — ספר העבודה v1

**Status:** proposed deterministic research program; documentation only.
**Base:** `b4070c89eac19e079768f5b05786243637e559f9`.
**Scope:** define how one existing canonical ELS engine and one existing Research package move
from a story or exact phrase to a small, auditable set of strong findings.
**Non-goals:** no new engine, store, state graph, Provider, Result Bundle, Raziel instance,
AI transport, database object, permission change, deployment or cipher-specific runtime rule.

This document is the working book for the next ELS research slices. A capability is not considered
part of Guided Discovery until it has a bounded cost, provenance, stop rule and a passing ledger
case in `els-guided-discovery-test-ledger-v1.md`.

## 1. The research promise

The user should not have to inspect hundreds of nearby strings. The default output is one selected
axis occurrence and the smallest useful research package around it:

1. the exact axis and its exact occurrence count;
2. a few locally discovered words or expressions connected to the selected occurrence;
3. the relevant source and verses;
4. only the strongest visible geometry;
5. exact verify, open, add, promote and return actions;
6. raw strings and broad exploration only under Advanced.

The system may fail to find a strong package. That result is better than filling the screen with
weak material. It must say what was searched, what was not searched and which explicit escalation
is available next.

## 2. One pipeline, three separate budgets

The product must never use one vague “research depth” switch. Every run records three independent
budgets.

| Budget | What it controls | Default principle |
| --- | --- | --- |
| Engine work | axis occurrences inspected × candidate forms × directions × geometry bands | local, finite and interruptible |
| Raziel work | explicit model calls and their input/output token limits | zero until the user explicitly submits a planning or interpretation request |
| Human attention | rows, explanations and alternatives visible at once | one recommendation; no more than three comparable hypotheses in the same existing package |

An AI token budget can never buy more engine authority. Raziel may propose a term, segmentation or
next action, but only the canonical engine can establish letters, position, skip, direction and
intersection. Engine work does not silently trigger a model call.

## 3. The ordered research levels

Each level contains all restrictions of the previous level. Moving upward is explicit and logged.
Opening Research, selecting an occurrence or opening Raziel does not move the level.

### Level 0 — Classic exact

- Search the exact normalized term or an exact pair entered by the user.
- For a pair, use the existing direct cross path; do not create an automatic cloud of related words.
- Count exact axis occurrences separately from nearby findings.
- No vocabulary expansion, automatic form generation, AI or background deep scan.

### Level 1 — Guided local discovery

- Select one verified axis occurrence as the anchor.
- Inspect the tightest geometry band first: candidate skips at `N`, `N-1` and `N+1`, plus direct
  crossings, parallels and compact relations visible in the active matrix.
- Discover from the matrix as well as from a small candidate list. This is required for terms that
  were not present in the user's story, such as a construct form or an unexpected Torah expression.
- Process axis occurrences in bounded batches. The initial calibration target is four occurrences;
  the UI must show coverage and must not imply that uninspected occurrences were negative.
- Rank the first wave of at most four candidate rows. A second wave of at most four is allowed only
  when the first wave did not produce a strong pair.
- Stop as soon as the package has one verified anchor and one independently useful, strongly placed
  supporting finding. Repetition or a third finding may strengthen it, but is not required.

The exact matrix dimensions and spatial radius are not frozen in this document. They must be
calibrated against the ledger Goldens, versioned and displayed as coverage before becoming a
production default.

### Level 2 — Torah-language recognition

Level 2 interprets bounded strings already found by Level 1. It does not widen the geometry merely
because a string is hard to read.

The recognizer works through a provenance-preserving ladder:

1. exact letters as found;
2. deterministic word segmentation;
3. prefixes, suffixes, construct state and ordinary Hebrew morphology;
4. defective/plene spelling relation;
5. controlled alias or synonym relation;
6. phonetic association;
7. narrative interpretation.

Every row keeps the exact letters at the top. A later reading is an annotation and never replaces
them. More than one plausible segmentation remains more than one hypothesis. Phonetic or narrative
associations are not verified ELS facts.

The language layer should be learned and tested from Torah/Tanakh language rather than from a list
of desired ciphers. Holdout terms must be removed from runtime vocabulary and candidate fixtures
during discovery tests. This is how we test whether the system can find an unexpected expression
rather than merely echo a supplied answer.

### Level 3 — Advanced forms and reversals

Advanced forms are opt-in for a named expression or a deliberately small candidate set. They are
never applied automatically to every local string because each form multiplies the search space.
The existing Advanced form registry and canonical search/replay path already implement explicit
whole-expression, per-word and last-word reversal. Guided Discovery must reuse that owner; it does
not add another transformation registry or search path.

For `סוד החשמל`, the following operations are separate and retain their derivation:

| Operation | Normalized search term | Human-readable presentation |
| --- | --- | --- |
| original | `סודהחשמל` | `סוד החשמל` |
| reverse the whole expression | `למשחהדוס` | possible segmentation: `למשחה דוס` |
| reverse letters inside every word | `דוסלמשחה` | `דוס למשחה` |
| reverse only the last word | `סודלמשחה` | `סוד למשחה` |

These transformations must not be confused with reading the unchanged term in the opposite ELS
direction (`dir=-1`). A transformed spelling and a reverse direction each consume a declared form
slot. Combining transformations requires a separate explicit step; the system may not stack them
until something interesting appears.

Every transformed result must pass the same canonical exact replay as an original term. The UI
shows the original input, transformation rule, normalized term and verified occurrence together.

### Level 4 — Deep/manual research

- Wider skip deltas, a larger matrix area, more occurrence batches, more candidate families or
  Journey-derived numeric relations belong here.
- Before execution, show the user the added engine work, expected visible output and any optional
  Raziel call.
- Require an explicit continuation for each material expansion.
- Preserve partial progress and allow stopping. There is no unbounded “scan everything” action.

## 4. Geometry bands and distance

Distance is not one number. Each candidate records:

- its own exact skip and direction;
- the difference from the anchor skip;
- its spatial distance from the selected occurrence;
- whether the relation is a crossing, parallel, overlap or compact group;
- which matrix window and occurrence batch were inspected.

The working bands are:

- **Band A — immediate:** `N`, `N±1`, direct crossings/parallels and compact relations inside the
  active matrix. This is the Guided default.
- **Band B — local expansion:** a larger but still finite active-matrix window or additional
  occurrence batch. It runs only after “continue locally”.
- **Band C — deep range:** wider skip or spatial range and additional form families. It is Advanced
  and requires an explicit cost preview and approval.

The numeric boundaries for Bands B and C are calibration outputs, not assumptions. A distant
semantically attractive word must not outrank a compact result merely because it fits the story.

## 5. How a story becomes a search

There are two valid entry paths.

### Exact-term path

If the user supplies one term or a deliberate pair, search it exactly at Level 0. Do not call AI to
rewrite a clear request. The user can then choose Guided local discovery around a verified
occurrence.

### Story path

If the user supplies a news story, family context or open question:

1. extract explicit names, places, dates and quoted phrases deterministically;
2. show the proposed anchor and up to four first-wave concepts before searching;
3. if the deterministic plan is insufficient, Raziel may propose a bounded plan only after an
   explicit “prepare plan” submission;
4. label every proposal by source: user text, deterministic extraction, controlled Torah-language
   relation, Journey context or Raziel proposal;
5. run proposed terms only through the canonical engine;
6. use bounded matrix-first discovery to find language that was not named in the story;
7. return verified evidence separately from interpretation.

This ordering lets Raziel help at the planning stage without turning it into an ELS calculator.
Raziel cannot invent a missing occurrence and cannot upgrade a suggested word to a finding.

## 6. Ranking without one magic number

An interesting number such as `10101` can strengthen and explain a result, but it cannot be the
only gate. Ranking combines independent, visible signals:

- exact canonical verification;
- compact geometry and relation type;
- `N`/`N±1` skip relationship;
- repetition or support from another occurrence;
- Torah-language confidence and segmentation cost;
- source/verse relevance;
- story relevance and independent supporting terms;
- optional Journey/family number resonance.

Penalties include distance, extra transformations, ambiguous segmentation, weak vocabulary,
post-hoc story fit and exhausted budgets. The UI should explain the few decisive signals instead
of exposing an opaque score as truth. No rank is a probability, prophecy or causal claim.

## 7. Journey of Life boundary

Journey context may contribute an approved primary name, spelling variants, relationship labels
and family numbers. It follows these rules:

- start with the primary subject; add family relationships one at a time;
- show exactly which private fields will enter a plan before submission;
- keep private names out of public URLs, logs and generic fixtures;
- use family numbers as optional ranking evidence, never as a required match;
- preserve the existing Journey snapshot/load/return seams;
- create no new person store, ELS engine, graph or AI session.

## 8. Research-package projection and stop rules

All results project into the existing selected-occurrence Research package. There is no second
Result Bundle.

Default presentation:

1. one recommended verified grouping;
2. up to two alternatives for comparison;
3. exact source, geometry and transformation provenance on demand;
4. rejected candidates and raw strings only in Advanced.

A run stops when any of these is true:

- a verified anchor and strong independent local support satisfy the declared question;
- the current engine budget is exhausted;
- the next action requires another research level;
- remaining candidates are weaker duplicates;
- no strong package exists in the inspected coverage.

The final state always states coverage, stop reason and one possible next action. It never implies
that the entire Torah was exhausted when only a bounded batch was inspected.

## 9. Failure diagnosis before a fix

Every missing expected finding receives exactly one primary diagnosis before implementation work:

1. vocabulary;
2. recognition/normalization;
3. geometry;
4. ranking;
5. matrix bounds;
6. UI projection.

A secondary diagnosis may be recorded, but the primary cause owns the next experiment. A Golden
may justify a general rule only when a holdout or negative-control case also passes. No term,
cipher title, author or saved-record identifier may appear in a runtime special case.

## 10. Required run journal

Every automated or manual validation run records:

- run ID, date, code SHA, contract and scorer versions;
- redacted input story/question and declared research level;
- anchor term, approved variants and selected occurrence identity;
- Journey fields used, if any, with privacy classification;
- engine, Raziel and attention budgets;
- occurrence batch, geometry band and matrix coverage;
- candidate source and every transformation/normalization step;
- canonical start, skip, direction, letters and replay status;
- language readings, confidence class and unresolved alternatives;
- ranking signals, penalties, rejects and reject reasons;
- source/verse evidence and interpretation kept as separate fields;
- elapsed time, engine work units, model-call count and token count;
- stop reason, human decision and regression result.

`model-call count = 0` is the expected default for exact and Guided engine runs.

## 11. Delivery order

1. **Freeze the ledger and telemetry vocabulary.** No UI or engine work.
2. **Build a pure, deterministic budget/coverage model** over existing canonical outputs.
3. **Add holdout Torah-language recognition tests** for bounded local strings.
4. **Add Guided ranking and stop rules** behind the existing Research package.
5. **Project one calm guided screen** while keeping Classic clean and Advanced closed.
6. **Connect explicit Raziel planning/interpretation** through the existing global session and
   submit path only.
7. **Connect approved Journey context** through its existing snapshot seam.
8. **Place the existing Level 3 forms in the Guided hierarchy** after original/local Goldens and
   negative controls are stable; do not reimplement their registry or search path.
9. **Calibrate deeper bands** before offering Level 4.

Each slice ends with the relevant unit/browser tests, mobile and desktop acceptance, both builds,
bundle/lazy guards, a branch-only commit and a journal entry. Preview remains a separate explicit
authorization; Production and merging to `main` are outside this program.

## 12. Definition of “ready to implement”

The first capability slice starts only after the user accepts:

- the five research levels;
- four candidates in the first wave and one optional second wave;
- Band A as `N`/`N±1` plus compact local geometry;
- one recommendation and at most two comparison alternatives;
- Raziel at zero calls by default and explicit calls only;
- reversals as Level 3, with transformation provenance and no automatic stacking.
