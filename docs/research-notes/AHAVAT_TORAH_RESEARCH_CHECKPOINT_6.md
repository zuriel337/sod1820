# אהבת תורה — Research Ledger · Checkpoint 6

> **NON-CANONICAL RESEARCH WORKING NOTE.** Research preservation only. Not publication, not canonical promotion, not Research Object ingestion, not DB write, and not engine verification.
>
> Source identity: `book:hebrewbooks:5635` — *אהבת תורה*, HebrewBooks #5635.
>
> This checkpoint supersedes session context only; Checkpoints 1–5 remain historical provenance and are not deleted.

## 0. Why this checkpoint exists

Checkpoint 6 preserves the research state reached after the full-book inventory/dossier-foundation work and before continuing deeper method reconstruction. The major new development since Checkpoint 5 is that the book increasingly appears not as a collection of isolated 1,820 correspondences, but as a repeatable quantitative/textual research workflow built from corpus construction, decomposition, attribution, aggregation, exceptions, and later numerical interpretation.

Claude is working in parallel on direct visual reconstruction / exact transcription / dataset closure. GPT's complementary scope is interpretation, method-family inference, cross-connections, truth classification, challenge, and prioritization. Do not silently merge provenance between agents.

## 1. Source dossier / coordination state

Stable source identity: `book:hebrewbooks:5635`.

Working law: **One Source = One Dossier**. Branches, agents, sessions and checkpoints are provenance, not source identity.

Research-library/dossier work is a docs-level controlled-research layer. No new source/document/corpus/library schema has been authorized. No DB, UI, publication or canonical promotion is authorized by this checkpoint.

Claude's current priority is mechanical/visual closure of the detailed letter dataset (including PDF p.35 and unresolved p.37–38 identity/checksum issues), followed by exact extraction of the pp.70–71 dataset. GPT must not duplicate that exact-transcription scope while it is active.

## 2. D-03 correction retained

The detailed Torah letter-count table begins at **PDF p.35**, not p.36. Therefore the prior reconstruction beginning at p.36 is incomplete at its opening boundary.

Safe state:

- dataset begins p.35: `SOURCE VERIFIED`;
- p.35 already contains per-parasha occurrence data: `SOURCE VERIFIED`;
- exact Aleph/Bet/Gimel/opening-Dalet cells: pending Claude direct-visual closure;
- unresolved p.37–38 identity interval and ה/ז checksum issues remain open until visual reconciliation.

No unreadable numeral may be inferred from a checksum.

## 3. Core quantitative architecture — strengthened finding

Across the book the author repeatedly works at nested corpus scopes rather than only presenting isolated final numbers.

Working hierarchy:

`LOCAL TEXT UNIT → PARASHA → BOOK → TORAH / EXTERNAL CORPUS`

Known quantitative families include:

- letters by parasha/book;
- total words by parasha/book/Torah;
- selected persons/groups/phrases with source metrics labelled `פעמים` and `תיבות`;
- roots inventory;
- token occurrence and token position;
- filtered-subcorpus first/middle/last;
- bounded spans;
- adjusted populations / exclusions;
- snapshot comparisons;
- calendar/time normalization;
- representation transformations;
- arithmetic/geometric constructions;
- Five-Megillot letter/word corpora.

**Inference:** the author's 1,820 findings often appear downstream of a dataset or decomposition path rather than being the only starting point of the investigation.

## 4. `פעמים + תיבות` — recurring research grammar

The `פעמים` / `תיבות` structure is not safely treated as one isolated table. It recurs across parashot and book-level summaries, with changing local actors/categories and recurring cross-corpus categories.

Observed subject types include:

- individual persons;
- pairs / combinations of persons;
- groups;
- roles;
- recurring categories such as `דבר ה׳` / `תורה`;
- local narrative participants selected according to parasha context.

Examples already source-located in the research include configurations such as:

`משה`, `משה ואהרן`, `משה והזקנים`, `משה ובני ישראל`, `משה ואלעזר`, `משה והכהנים`, `משה ויהושע`, `מרים ואהרן`, as well as patriarchal/narrative actors in Genesis and later books.

Important correction: do **not** encode `פעמים` generically as name/token occurrence count. The source context strongly suggests attribution to speech/text units in at least part of this dataset, but the exact unit represented by `פעמים` is still OPEN.

Use neutral working fields until closure:

`source_metric_pעמים`
`source_metric_תיבות`
`attribution_subject`
`attribution_type = OPEN/PROVISIONAL`

## 5. Speech-attribution hypothesis — strong but not fully closed

Source wording in the dataset includes formulations equivalent to a named person having `דבר ... תיבות`, and the source separately states that Jacob, Rachel and Leah **spoke** (`דברו`) 1,820 words.

This supports the working hypothesis that at least one major layer is a **speech-attribution corpus**:

`TEXTUAL SPEECH UNIT → SPEAKER / SPEAKER SET → source_metric_pעמים → source_metric_תיבות → PARASHA/BOOK/TORAH AGGREGATION`.

However:

- `פעמים = speech-event count` is **NOT YET CLOSED**;
- exact speech-unit boundary is unknown (verse / utterance / formula / contiguous turn / other);
- combined labels such as `משה ואהרן` must remain first-class source observations and must not be automatically split into individual speakers;
- the same table form may host more than one attribution rule, especially for categories such as `דבר ה׳` and `תורה`.

Candidate method-family names only (not author terminology):

- `HIERARCHICAL SEMANTIC CORPUS ANNOTATION`;
- more specifically for the speaker layer, `SPEECH ATTRIBUTION CORPUS`.

Do not freeze either as canonical terminology yet.

## 6. Participant configurations — new structural finding

The source distinguishes individual and combined labels rather than reducing every row to one person.

Working concept:

`PARTICIPANT CONFIGURATION / SPEAKER SET`

A combined configuration (`משה ואהרן`, etc.) is an independent source category. It is not automatically equivalent to `משה + אהרן` as two independent rows.

**Open research question:** what exact textual condition causes a unit to be assigned to a combined configuration rather than an individual configuration?

This is currently one of the highest-value questions for reconstructing the author's counting algorithm.

## 7. Hierarchical attributed corpus model

The strongest current reconstruction is that the book supports a hierarchy similar to:

`CORPUS SCOPE`
→ `SELECTED SUBJECT / CATEGORY`
→ `SOURCE METRIC פעמים`
→ `SOURCE METRIC תיבות`
→ `PARASHA AGGREGATION`
→ `BOOK AGGREGATION`
→ `TORAH AGGREGATION`
→ optional later numerical/conceptual comparison.

The local entity list changes with narrative content, while some categories recur across wider scopes. Therefore this is **not** a fixed closed ontology of Torah persons.

Working distinction:

- `CORE / CROSS-CORPUS CATEGORIES` — recurring categories that can aggregate upward;
- `LOCAL NARRATIVE SUBJECTS` — parasha-specific actors/groups/roles.

Selection criteria remain partly OPEN and must not be invented.

## 8. 79,976 — methodological significance

The source's whole-Torah total of **79,976 words** remains `AUTHOR COUNT / SOURCE TEXT COUNT`, not independently corpus-verified.

New methodological inference: this total appears to function not merely as an isolated interesting number but as the population frame above multiple attributed sub-populations and summaries.

Thus the research flow may be reconstructed provisionally as:

`BUILD/COUNT CORPUS → DECOMPOSE/ANNOTATE → AGGREGATE → QUERY COMBINATIONS → IDENTIFY NUMERICAL STRUCTURE`.

This helps explain how a result such as `יעקב + רחל + לאה → 1,820 תיבות` could arise from a prior attributed corpus rather than from an ad-hoc gematria search.

## 9. Auditability / reproducibility — strengthened method-of-methods

Checkpoint 5 already preserved the author's explicit intent to write the YHWH counts in order so a reader can stand on / inspect the count.

The repeated decomposition structure now strengthens a candidate meta-method:

**`AUDITABLE DECOMPOSITION`**

Working pattern:

`GLOBAL CLAIM → DISCLOSED COUNTING PATH → LOCAL DECOMPOSITION → RUNNING/SCOPE SUBTOTALS → FINAL TOTAL → EXCEPTIONS`.

This is a source-supported structural inference, not a claim that every calculation in the book is correct.

Future SOD1820 representation should preserve the path from a global result down to its contributing source units wherever the book provides it.

## 10. DS-06 / pp.70–71 — provisional relation

The pp.70–71 dataset found by Claude's full-book inventory may reuse the same `פעמים + תיבות` research grammar rather than constitute a wholly new method family.

Current status:

`CANDIDATE: DS-06 EXTENDS / REUSES EXISTING ATTRIBUTION METHOD FAMILY`

not:

`FACT: DS-06 IS A NEW METHOD FAMILY`.

Claude's direct extraction must determine:

- exact dataset boundaries;
- row semantics;
- whether `פעמים + תיבות` maps one-to-one to the earlier structure;
- overlap/repetition with earlier totals;
- counting regime, subtotals and exceptions.

If mechanically equivalent, preserve it as another instance/representation rather than creating duplicate semantics.

## 11. Method map — current reconstruction target

The next broad GPT research layer is a **map of the author's research operations**, not only a catalog of 1,820 results.

Current candidate operations include:

1. corpus construction / total population count;
2. hierarchical decomposition by parasha/book;
3. letter counting;
4. word counting;
5. attributed speaker/subject counting;
6. root inventory;
7. token occurrence;
8. ordinal position;
9. filtered-subcorpus midpoint / first-middle-last;
10. bounded-span selection;
11. inclusion/exclusion normalization;
12. masoretic exception handling;
13. linguistic representation transformation;
14. name decomposition / milui;
15. snapshot delta;
16. arithmetic range / triangular aggregation;
17. square-sum range;
18. geometric/measure construction;
19. calendar/time normalization;
20. life-span partition;
21. edge-token selection;
22. external bounded corpus analysis;
23. narrative/commentary anomaly analysis;
24. citation/source dependency;
25. convergent calculation graph.

This taxonomy remains a research model. It is not authorization to create 25 production engines or tables.

## 12. `עת` / five-year convergence cluster retained

Preserve the previously discovered layered cluster without collapsing provenance:

### SOURCE — Ahavat Torah

- `עת` language from Kohelet is used to partition a seventy-year human life into fourteen paired time units / five-year windows;
- a separate five-year calendar construction normalizes five years to `5 × 364 = 1,820` by the author's stated Yom-Kippur exclusion logic;
- source also contains future-time / complete-rectification language around `העת` elsewhere.

### ENGINE — previously live-verified research fact

`עת · קדמי = 1820` was independently verified through the canonical gematria engine in prior research. Do not convert this checkpoint statement into a fresh live-engine verification; rerun the canonical engine if a future decision depends on current engine state.

### ZURIEL RESEARCH / CONTENT EVIDENCE

Historical SOD1820 material contains a separate `×5` motif connected by Zuriel to fifth degree / `יחידה` / Mashiach and to `מימד 5 / מימד הגאולה`.

These layers are related research candidates, not one undifferentiated fact.

Working cluster name:

`ET–FIVE CONVERGENCE / ציר העת החמישית`.

## 13. 5–14–70–710 motif cluster retained

Preserve as a candidate research graph, not canonical equivalence:

`5 → 14 → 70 → 710`
with candidate associations involving:

`עת · דוד · סוד · גוג ומגוג · שביעי · עשירי · נסתר · יחידה · משיח`.

Critical law:

`70 → 710` must be represented as an explicit transformation/relation, never as equality.

Gematria claims involving `סוד`, `גוג ומגוג`, `נסתר`, `דוד/דויד` require canonical engine verification before being labelled ENGINE VERIFIED. Do not calculate them from memory.

Historical David-age material requires an external/source citation before promotion to FACT in a canonical research object.

## 14. Truth-state requirements

Continue to preserve:

`SOURCE CLAIM ≠ AUTHOR COUNT ≠ TEXT COUNT ≠ CALCULATION ≠ ARITHMETIC VERIFIED ≠ CORPUS VERIFIED ≠ ENGINE VERIFIED ≠ INTERPRETATION ≠ INFERENCE ≠ RECOMMENDATION ≠ DECISION ≠ CANONICAL`.

For source reading:

`VISUALLY_VERIFIED ≠ SEARCH_HIT ≠ OCR_READING ≠ INFERRED_FROM_CHECKSUM`.

For the attribution dataset specifically:

- existence of individual and combined subject labels: source-supported;
- `תיבות` tied to speech in explicit examples: source-supported;
- universal definition of `פעמים`: OPEN;
- universal definition of `תיבות` across every category: OPEN;
- exact attribution algorithm: OPEN;
- independent corpus reproduction: NOT DONE.

## 15. Current open items

Highest-value open research questions now are:

- What exactly is one `פעם` in the attributed dataset?
- What is the exact boundary of one attributed speech/text unit?
- What causes a unit to be assigned to an individual vs a combined participant configuration?
- Are `דבר ה׳`, `תורה`, persons and groups governed by one attribution contract or several contracts under one table form?
- Does DS-06 mechanically reproduce the same method family?
- Can one of the source's local rows be reproduced directly against the Torah text without changing the author's counting regime?
- Which method families are explicit author procedures versus GPT abstractions over repeated behavior?

Mechanical/visual open items delegated to Claude include p.35 letter-table completion, p.37–38 identity/checksum closure and pp.70–71 exact extraction.

## 16. Where we are / next action

**WHERE WE ARE:** full-book scope is established; a single source dossier exists at the research-doc level; the research has moved from collecting 1,820 correspondences toward reconstructing the author's research machine.

**CLOSED ENOUGH TO RETAIN:** recurring hierarchical decomposition; repeated `פעמים + תיבות` grammar; individual + combined participant configurations; explicit speech-word attribution in at least some source examples; auditability as an important structural feature.

**OPEN:** exact attribution/counting contract, DS-06 semantics, several visual-table gaps, and independent corpus reproduction.

**BLOCKER:** no conceptual blocker for continuing read-only research. Exact numerical closure of delegated tables waits for Claude's visual handoff.

**NEXT GPT ACTION:** continue mapping the author's research operations and seek source passages that explicitly define or expose the attribution/counting rule, without duplicating Claude's exact-transcription scope.

**DO NOT DO NOW:** no schema expansion, no new engine/store, no UI, no canonical promotion, no merge/deploy, no forced interpretation of unreadable numerals.

Foundation → Projection → Experience.

Preserve capability, truth and provenance — not necessarily the legacy interface.
