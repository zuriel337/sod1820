# AHAVAT TORAH — RESEARCH CHECKPOINT · DATASET IDENTITY & POPULATION CONTRACT

**Actor:** GPT  
**Date:** 2026-09-01  
**Source identity:** `book:hebrewbooks:5635`  
**Status:** Research checkpoint; additive research provenance only. Not canonical promotion, not publication, not DB ingestion.  
**Predecessor:** `AHAVAT_TORAH_RESEARCH_CHECKPOINT_MULTI_CORPUS_MACHINE.md` on this GPT branch.

## 1. Why this checkpoint exists

The continued source scan established a stable cross-dataset identity distinction that should not remain only in conversation. The source repeatedly operates on the same broad corpus while changing unit, population definition, representation, counting regime, inclusion/exclusion rules, scope, and query. Therefore source/corpus identity cannot safely stand in for dataset identity.

## 2. Research DNA — Dataset Identity

**Status: RECURRING / STRONGLY ESTABLISHED as GPT synthesis from multiple source structures.**

Working contract:

`CORPUS + UNIT + POPULATION DEFINITION + REPRESENTATION + COUNTING REGIME + INCLUSION/EXCLUSION RULES + SCOPE + PROVENANCE → DATASET IDENTITY`

This is a research contract reconstructed across source material, not a verbatim formula stated by the author.

## 3. Identity distinctions

Preserve the following distinctions:

`SOURCE IDENTITY ≠ CORPUS IDENTITY ≠ DATASET IDENTITY ≠ METHOD IDENTITY ≠ FINDING IDENTITY ≠ NUMERIC ANCHOR`

Consequences:

- the same source can contain multiple corpora or research populations;
- the same corpus can support multiple datasets;
- the same method can operate over different corpora/datasets;
- the same numeric result can arise from different datasets and different findings;
- shared result value does not authorize identity collapse.

Therefore:

**`SAME RESULT ≠ SAME DATASET`.**

## 4. Evidence family A — Divine-name / letter populations

Within the Torah corpus the source constructs distinct populations rather than one undifferentiated count.

Observed structures include:

- YHWH occurrence population, decomposed by parasha/book/Torah scope;
- Adonai-related population using written/read distinctions and reading classification;
- Samekh raw occurrence population followed by source-defined exclusions and an adjusted population.

The Samekh case supports:

`RAW POPULATION → SOURCE/TRADITION-DEFINED EXCLUSIONS → ADJUSTED POPULATION → RESULT`

The Adonai/YHWH material supports:

`WRITTEN TOKEN → READING/REPRESENTATION CLASSIFICATION → POPULATION MEMBERSHIP → COUNT`.

Thus representation may participate in population definition.

## 5. Evidence family B — Attributed Expression Corpus

The hierarchical attributed-expression dataset uses a different population contract:

`TORAH TEXT → PARASHA → EXPRESSION/CATEGORY ANNOTATION → ATTRIBUTION → פעמים + תיבות → BOOK/TORAH AGGREGATION`

Population identity includes persons, groups, and participant configurations. A cohort query such as the source's `משה רבינו ותלמידיו` claim is therefore not equivalent to a generic Torah word count.

The 18,200 cohort remains a **STRONG SOURCE-STRUCTURE INFERENCE** pending full component checksum; this checkpoint does not promote it to mechanically verified fact.

## 6. Evidence family C — written-name / word-form populations

DS-06 (`שם משה`) is a written-name occurrence dataset with prefixed forms included in its population contract. Its 647 composite form breakdown and Torah-level book aggregation were mechanically closed in prior work, while parasha-row reconciliation remains open.

This dataset remains distinct from the Attributed Expression Corpus even though both involve משה.

This independently demonstrates that semantic subject overlap does not imply dataset identity.

## 7. Evidence family D — lexical / grammatical populations

The root corpus and the `עשה` form dataset provide further non-name population families. DS-13's population/method and most raw values were extracted in prior mechanical work; its printed 248 remains SOURCE CLAIM with reconciliation open.

The relevant evidence here is the existence of a defined word/form population and counting contract, not acceptance of the unresolved total.

## 8. Population Contract is part of reproducibility

A numerical result is not reproducible from `source + number` alone.

Reconstruction may require:

`population definition + representation + counting regime + inclusions/exclusions + scope + operation + source provenance + decomposition`.

Therefore a matching final number alone is insufficient evidence that a historical calculation has been reconstructed.

## 9. Counting regime as Research Context

A cited tradition/source may do more than support a conclusion after calculation. It may participate in defining which items enter or leave the counted population.

Research relation:

`SOURCE/TRADITION → COUNTING RULE → POPULATION → RESULT`.

This means two researchers may use the same source corpus and unit yet legitimately construct different datasets if their population/counting contracts differ. Such disagreement must not automatically be represented as arithmetic error.

## 10. Representation can define population

**Status: STRONG RECURRING SUPPORT.**

Representation dimensions observed/developing across the source include:

`WRITTEN FORM · READING · VOCALIZATION · NAME FORM · POPULATION VALUE`.

A representation distinction can affect membership in a population and therefore belongs upstream of the result, not merely in display metadata.

## 11. Truth-state guardrails

Keep separate:

`SOURCE CLAIM ≠ TEXT COUNT ≠ CALCULATION ≠ DATASET DEFINITION ≠ GPT INFERENCE ≠ ENGINE VERIFIED ≠ CANONICAL`.

This checkpoint makes no new gematria engine-verification claims.

Unresolved totals or cells are preserved as unresolved rather than force-corrected to attractive anchors.

## 12. Ingestion implication

Before controlled Supabase ingestion of the full book, the existing primitives must be crosswalked against Dataset Identity requirements.

**Current classification:**

- **MUST FOUNDATION NOW:** none proven by this checkpoint alone.
- **EXTENSION POINT NOW:** ingestion crosswalk must preserve dataset/population identity and must not flatten it into `source + number + text`.
- **LATER:** Dataset Explorer / comparative dataset UI / other Projection or Experience surfaces.

Do not create a new dataset table/store/engine merely because this research contract exists. First test whether existing Research OS primitives can represent it losslessly under the One System Law.

## 13. Research Question / Claim / Interpretation guardrail

The interpretive portions of the source also reinforce that a research question is not itself a claim, and an author's proposed interpretation is not automatically a fact.

Preserve:

`RESEARCH QUESTION ≠ CLAIM ≠ AUTHOR INTERPRETATION ≠ FACT`.

This is an ingestion crosswalk requirement; it is not a schema decision in this checkpoint.

## 14. Open items carried forward

- full checksum of the 18,200 cohort;
- overlap/partition behavior inside the attributed-expression corpus;
- DS-06 parasha→book reconciliation;
- DS-13 248 reconciliation;
- cross-representation convergence promotion threshold;
- exact identity requirements needed for future portable dataset comparison;
- whether existing DB primitives already encode every Dataset Identity axis without schema change.

## 15. Foundation Gate

**FOUNDATION SUFFICIENT remains the current research-side verdict; no new MUST FOUNDATION NOW has been demonstrated here.**

The next DB step is not a blind bulk upload. The correct sequence remains:

`LOSSLESS RECONSTRUCTION → STRESS TEST → FINAL DB CROSSWALK → CONTROLLED INGESTION → VERIFY`.

**Foundation → Projection → Experience.**

**Preserve capability, truth and provenance — not necessarily the legacy interface.**
