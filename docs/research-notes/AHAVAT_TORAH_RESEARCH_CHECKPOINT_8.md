# אהבת תורה — Research Ledger · Checkpoint 8

> NON-CANONICAL RESEARCH WORKING NOTE. Preservation only. No publication, canonical promotion, DB write, schema change, merge or deploy.

Source identity:
`book:hebrewbooks:5635` — אהבת תורה.

## Purpose

Preserve the transition from local attribution-method reconstruction to corpus/cohort aggregation analysis.

Checkpoint 7 remains the closure point for:

- ATTRIBUTED EXPRESSION CORPUS;
- tested `פעמים + תיבות` counting contract;
- person/group attribution cases.

Checkpoint 8 records the next layer: how the source appears to move from corpus totals into selected aggregates.

## Closed observations

### 1. Population frame

The source presents:

`בכל התורה יש ע"ט אלף תתקע"ו תיבות`

as the whole-Torah word population frame, followed by category breakdowns introduced with forms such as `ומהם`.

Status:
SOURCE OBSERVATION.

Not claimed:
that all categories form a disjoint partition of 79,976.

## 2. 18,200 aggregate layer

The source presents a claim equivalent to:

`משה רבינו ותלמידיו ... ח"י אלף ומאתים תיבות`

and relates it to:

`10 × 1820`.

The decomposition uses many subject/configuration categories also appearing in the broader attribution tables.

Examples already cross-linked:

- מרים ואהרן — 9 תיבות;
- בנות צלפחד — 36 תיבות;
- נבח — 1 תיבה.

These local values were independently reconstructed in prior work.

## 3. Current corpus model

Working model:

TORAH CORPUS
→ ANNOTATED DATASETS
→ SUBJECT CONFIGURATIONS
→ AGGREGATION
→ DERIVED COHORTS
→ NUMERICAL RELATIONS
→ INTERPRETATION

This is a research reconstruction, not a claim about the author's software/model.

## 4. Important separation of layers

Current identified layers:

1. Corpus population
   - e.g. 79,976 words.

2. Token occurrence datasets
   - e.g. משה occurrence dataset (DS-06).

3. Attributed expression datasets
   - `פעמים + תיבות`.

4. Derived cohort aggregates
   - e.g. 18,200.

Do not collapse these into one counting engine.

## 5. Open questions

A. Full checksum of 18,200 decomposition.

B. Exact membership rule of:

`משה רבינו ותלמידיו`

Important:
This phrase is currently treated as a SOURCE LABEL, not a verified canonical relation `student_of`.

C. Selection audit:

Who is included?
Who is excluded?
Why?

D. Whether all category totals derive from one common dataset or multiple related annotation layers.

E. Whether 18,200 selection is independently rule-based or requires post-selection analysis.

## Truth discipline

FACT:
The source presents population totals, category tables and aggregate claims.

INFERENCE:
The book appears to use layered corpus analysis.

OPEN:
The selection logic and complete reproducibility of derived aggregates.

Do not infer a stronger claim than the source supports.

## Next action

Perform Negative Membership / Selection Audit:

Compare:
A = categories available in attribution tables.
B = categories included in the 18,200 cohort.

Compute conceptually:
B ∩ A
A − B
B − A

Goal:
recover the author's selection boundary.

## STOP

No schema.
No engine.
No UI.
No canonical promotion.
No merge/deploy.

Preserve capability, truth and provenance.