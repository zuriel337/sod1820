# אהבת תורה — Research Ledger · Checkpoint 5

> **NON-CANONICAL RESEARCH WORKING NOTE.** Preservation of ongoing source research only. Not publication, not canonical finding storage, not Research Object ingestion, not engine verification, not DB corpus ingestion, and not Human-Gate promotion.
>
> Primary source: *אהבת תורה*, ר' פנחס זלמן הלוי סג"ל איש־הורוויץ, HebrewBooks #5635, 99 PDF pages. OCR/search hits are not equivalent to visual verification. Unclear readings stay `UNCERTAIN`/`UNKNOWN`.

## 0. Why this checkpoint exists

The research scope has expanded from targeted 1,820 extraction to a **full-book digital reconstruction**: every meaningful page region, dataset, calculation, citation, commentary unit, exception rule, structural boundary and cross-page relation is in scope, including material with no number at all.

The purpose of this checkpoint is to prevent context loss while the scan continues. It preserves the current research grammar, coverage discipline, major findings since Checkpoint 4, and the parallel-agent reconciliation contract.

## 1. Coverage discipline — mandatory from this point forward

Every page or cluster must distinguish:

- `PAGE_SCANNED` — actually read from page render / visually inspected;
- `PARTIAL_PAGE_SCAN` — only part of the page reconstructed;
- `SEARCH_HIT` — source located via OCR/search/snippet only;
- `NOT_YET_SCANNED` — no substantive reading yet.

Each new page record should preserve when possible:

`pdf_page · printed_page · section/parasha/megillah · opening_anchor · closing_anchor · extracted_units · verification_state · checkpoint`.

Search hits must never silently upgrade to visual verification.

## 2. Research Unit contract — working only, not canonical schema

For every meaningful unit preserve:

`opening_anchor · closing_anchor · subject · source_claim · numbers · raw_expression · calculation · counting_regime · textual_rule · cited_source · interpretation · cross_page_link · verification_state`.

Additional extension points now required by the source:

- `representation_type` — regular spelling / exceptional spelling / milui / divine name / letter sequence / word-in-context;
- `motif_id` — recurring thematic cluster when several passages participate;
- `narrative_problem_type` — for commentary built around a textual/narrative anomaly;
- `dataset_id` — where the author is effectively constructing a repeatable corpus/table;
- `candidate_relation` — relation suggested by cross-reading but not explicit enough to promote as source fact.

These are research-document fields only. No schema work is authorized.

## 3. Method taxonomy — expanded

The book now supports, at minimum, the following distinct method families:

- occurrence count;
- corpus count;
- bounded text span;
- ordinal token position;
- filtered-subcorpus position / first-middle-last;
- entity/source attribution metrics;
- snapshot comparison and aggregate delta;
- adjusted population / inclusion-exclusion;
- masoretic exception;
- linguistic representation transformation;
- name decomposition / milui;
- arithmetic range sum / triangular aggregation;
- square-sum range;
- geometric / measurement construction;
- calendar / ritual sequence;
- time-range normalization;
- life-span partition;
- edge-token selection;
- bounded external corpus;
- commentary / narrative anomaly analysis;
- thematic motif network;
- source/citation dependency.

**Do not collapse** `TOKEN OCCURRENCE`, `TOKEN POSITION`, `SUBCORPUS POSITION`, `TEXT COUNT`, `DATASET SNAPSHOT DELTA`, `SOURCE GEMATRIA CLAIM`, and `MASORETIC RULE` into one generic `count` concept.

## 4. Source-intent finding: auditability / reproducibility path

The author's early Tetragrammaton total is not presented only as a final number. He explicitly explains that he writes the counts in parasha order so that a reader who wants to stand on / verify the count can do so.

Working distinction:

`CLAIM ≠ REPRODUCIBILITY PATH`.

The book repeatedly appears to preserve local decomposition, running totals, section totals, or exception logic that allow the author's claim to be inspected rather than merely asserted.

Status: **SOURCE-SUPPORTED STRUCTURAL FINDING**. Exact formulations should remain tied to page citations in downstream artifacts.

## 5. Deep reconstruction around PDF pp.19–24

This area contains multiple numerical mini-systems and is no longer treated as one undifferentiated "Mגדל עוז" block.

### 5.1 Census comparison — strong reconstructed unit

The author compares two Israelite censuses across the same six tribes: Reuben, Gad, Ephraim, Benjamin, Asher, Naphtali.

First snapshot values reconstructed from the page context:

- Reuben 46,500
- Gad 45,650
- Ephraim 40,500
- Benjamin 35,400
- Asher 41,500
- Naphtali 53,400

Total = **262,950**.

Second snapshot:

- Reuben 43,730
- Gad 40,500
- Ephraim 32,500
- Benjamin 45,600
- Asher 53,400
- Naphtali 45,400

Total = **261,130**.

Arithmetic delta = **1,820**.

Classification:

- values: `SOURCE CLAIM / DATA COUNT`, visually located in the page cluster;
- subtraction: `ARITHMETIC VERIFIED`;
- not gematria.

Method:

`SAME ENTITIES → SNAPSHOT A → SNAPSHOT B → DELTAS → AGGREGATE DIFFERENCE`.

The nearby claim that the six tribal names themselves total 1,820 is a separate `SOURCE GEMATRIA CLAIM`, not engine-verified.

### 5.2 Linguistic transformation rule

A visually clear rule in this area states the classical transformation pattern approximately:

`word that would require ל at the beginning → Scripture may place ה at the end`.

This must be preserved as `LINGUISTIC RULE / REPRESENTATION TRANSFORMATION`, not flattened into gematria.

### 5.3 Additional mini-constructions in pp.19–24

Several additional constructions are source-located but still require exact visual reconstruction before promotion, including candidate material involving divine-name values, elders, liturgical/psalm counts, Holy-of-Holies geometry, dotted/special letters, and other compact 1,820 bridges.

**Do not preserve remembered arithmetic as fact until the source wording itself is cleanly reconstructed.** These remain `OPEN / VISUAL RECHECK REQUIRED` unless separately verified.

## 6. Repeated-word subcorpus

The author explicitly treats doubled words as a searchable subcorpus and reasons about position inside that filtered population — first, middle, and last. Source anchors include `אברהם אברהם`, a middle doubled expression in Parashat Tzav, and late doubled forms including `בבקר בבקר` / `אני אני`.

The same context invokes the author's whole-Torah word total 79,976 and discusses the rabbinic `דרש דרש באמצע` tradition.

Safe model:

`GLOBAL TOKEN STREAM → FILTER DOUBLED EXPRESSIONS → ORDER WITHIN SUBCORPUS → FIRST / MIDPOINT / LAST`.

Important correction preserved from prior work: **do not use the old OCR-derived ~1,079 doubled-word population.** That reading was already rejected as a corruption of the 79,976 figure.

The exact doubled-word population remains OPEN.

## 7. Calendar / time as a first-class research domain

The source uses time intervals and ritual/calendar sequences as numerical structures rather than only textual tokens.

### 7.1 Omer sequence

The source explicitly states that counting is through 49 and that the sum from 1 through 49 is 1,225.

Classification:

- `SOURCE CALCULATION`;
- `ARITHMETIC RANGE / TRIANGULAR AGGREGATION`;
- ordinary arithmetic can be independently verified;
- the exact bridge from 1,225 to 1,820 remains OPEN where the continuation is unreadable/truncated.

### 7.2 Five-year / day-count construction

A source-located construction uses the age span around 25→30, 365 days per year, and an exclusion associated with Yom Kippur, yielding a five-year normalized count of 1,820 according to the author's construction.

Working method:

`TIME RANGE → CALENDAR UNIT → EXCLUDED DAY → NORMALIZED TOTAL`.

This remains a source-derived construction and should retain the precise wording/exclusion rationale when visually re-transcribed.

### 7.3 Kohelet time categories

Nearby material organizes life/time through the `עתים` language of Kohelet and age windows. The existence of the structural time partition is source-located, but the full mapping remains `RECONSTRUCTION PENDING`.

## 8. Structural token-selection method

A source-located construction selects the beginning/end words of the three priestly-blessing clauses (`יברכך/וישמרך`, `יאר/ויחנך`, `ישא/שלום`) and claims an aggregate of 1,820.

Classification:

- six structural edge tokens: source-supported;
- aggregate gematria = 1,820: `SOURCE GEMATRIA CLAIM`;
- `ENGINE VERIFIED`: **NO**.

Method:

`PARALLEL TEXT UNITS → SELECT EDGE TOKENS → AGGREGATE`.

## 9. Closed integer range / square-sum method

The author source-locates a construction over integers 13 through 19, squaring each member and aggregating them to 1,820, with a link to the Haggadah's `מי יודע` framework.

Classification:

`CLOSED INTEGER RANGE → SQUARE EACH MEMBER → AGGREGATE`.

The arithmetic can be checked independently; interpretive linkage remains source interpretation.

## 10. Five Megillot — new corpus family

Around the transition into the Megillot material, the book contains a quantitative layer for **five separate corpora**: Esther, Song of Songs, Ruth, Lamentations, Ecclesiastes.

The section includes letter-by-letter counts and summary-level word/letter totals by Megillah.

Working corpus model:

`LETTER → MEGILLAH → COUNT`

plus corpus-level totals:

`MEGILLAH → TOTAL WORDS / TOTAL LETTERS`.

Exact cell reconstruction is not yet complete in GPT's pass. Claude's 36–42 reconstruction independently identified that the `אותיות חמש מגילות` section begins at the end of that range and continues beyond it.

## 11. Transition to Megillat Esther commentary

The source then shifts from quantitative tables to a commentary corpus on Esther. This is a major scope correction: the second part of the book must not be digitized as numbers-only research.

Recovered commentary units include source-located discussion around:

- `חייב אדם לבסומי בפוריא עד דלא ידע בין ארור המן לברוך מרדכי`;
- `ותמאן המלכה ושתי לבוא`;
- `ויאמר המלך לחכמים יודעי העתים`;
- `ובהקבץ בתולות שנית`;
- Esther's concealed people/birthplace and Mordecai's role;
- Mordecai's refusal to bow;
- `ואני לא נקראתי לבוא אל המלך זה שלשים יום` and narrative chronology;
- sleep / awakening / hiddenness motifs around Esther, `ישנו עם אחד`, `נדדה שנת המלך`, and `הסתר אסתיר`.

These units are primarily `COMMENTARY / NARRATIVE QUESTION / INTERPRETATION`, with numerical layers only where actually present.

The sleep-awakening-hiddenness material should be preserved as a **candidate thematic motif network**, not a numerical finding.

Exact wording of any unit recovered only through OCR/search remains provisional until page-visual confirmation.

## 12. Editorial metadata and addenda linkage

The modern/editorial introduction indicates that the second part is organized by Torah portions and that a star beside a parasha can indicate additional material in the later `השמטות` section.

Research consequence:

`MAIN PASSAGE ↔ ADDENDUM` must be mappable.

The `השמטות` pages must not be treated as detached miscellaneous text. Where an editorial marker links them back to an earlier section, preserve that relation.

## 13. Source / citation graph requirement

The book repeatedly invokes external authorities and textual traditions. Future reconstruction must preserve not only the named source but **what role the citation plays**:

`AUTHOR CLAIM → CITED SOURCE → JUSTIFICATION ROLE`.

Working fields:

`source_as_printed · normalized_candidate · citation_context · supported_claim · quotation/paraphrase · page · confidence`.

Do not normalize an unclear citation by guesswork.

## 14. Claude parallel work — coordination, not automatic truth

Claude's docs-only branch `claude/ahavat-torah-letter-parasha-reconstruction` reports a direct-visual reconstruction of PDF pp.36–42 and identifies three stacked quantitative sections:

1. detailed per-letter Torah occurrence table;
2. `תיבות התורה` per-parasha summary;
3. a second `אותיות התורה` total-letters-per-parasha summary;
4. then the beginning of `אותיות חמש מגילות`.

It also preserves uncertainty rather than filling unreadable cells from checksums. The 79,976 Torah-word total is a digit-for-digit cross-section match; the 304,812 letter total still contains an unresolved glyph-level issue in that artifact and must not be described as fully transcribed from that page simply because an earlier section supports the expected figure.

Claude has also been given a broader 99-page horizontal inventory / omission-audit task. Its future output is a **parallel research artifact**, not an SSOT and not automatically merged into GPT conclusions.

Reconciliation rule:

`PAGE + UNIT + SOURCE ANCHOR → compare readings → preserve drift candidates → only then consolidate`.

No parallel research store is to be created.

## 15. Full-book omission audit target

The book is considered digitally mapped only when:

- all 99 PDF pages are accounted for;
- every meaningful textual region is assigned to a Research Unit or explicitly marked unreadable;
- tables/datasets have dataset identity;
- calculations preserve inputs/operations/intermediate values/output;
- citations have source identity/provenance;
- cross-page continuations are not cut at page boundaries;
- addenda/starred material is linked back where supported;
- a second adversarial reading asks what the first pass missed.

This is a research completeness target, not a canonical-ingest contract.

## 16. Truth taxonomy retained

Preserve the distinctions:

`SOURCE CLAIM ≠ AUTHOR COUNT ≠ TEXT COUNT ≠ CALCULATION ≠ ARITHMETIC VERIFIED ≠ CORPUS VERIFIED ≠ ENGINE VERIFIED ≠ INTERPRETATION ≠ INFERENCE ≠ CANONICAL`.

Gematria/milui claims remain **NOT ENGINE VERIFIED** until tested against the canonical live engine/registry/functions.

A checksum can support a reading; it must not convert an illegible glyph into `VISUALLY VERIFIED`.

## 17. Foundation Expansion Gate — current state

**FOUNDATION NOT SUFFICIENT for freezing the final digital model of this book.**

Reason: new source families continue to appear — filtered subcorpora, calendars, commentary motifs, addenda links, source-dependency graphs, Megillot datasets, exception regimes and cross-page audit trails.

Current classification:

- **MUST FOUNDATION NOW:** preserve exact source anchors, representation type, truth state, counting regime, calculation graph, source/citation provenance, dataset identity, cross-page relation and original attribution labels;
- **EXTENSION POINT NOW:** motif identity, narrative-problem classification, candidate cross-book relation, future corpus verification hooks;
- **LATER:** UI, visualization, publication projection, automatic canonicalization, broad ingestion into production tables.

Foundation → Projection → Experience.

Preserve capability, truth and provenance — not necessarily the legacy interface.

## 18. Immediate next action

Continue forward in physical source order with deep reconstruction of Esther and the remaining second part **without filtering for 1,820**. In parallel, allow Claude's horizontal 99-page inventory to detect omissions. At the next stable cluster, append another checkpoint rather than relying on session context.

## 19. Explicit non-actions

No live research-content insert; no `research_objects` import; no schema/DB corpus changes; no canonicalization; no publication; no UI/code/engine change; no Master State/Roadmap change; no merge/deploy to `main`.