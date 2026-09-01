# אהבת תורה — Research Ledger · Checkpoint 4 Addendum

> **NON-CANONICAL RESEARCH WORKING NOTE.** Research preservation only. Not website/content publication, not canonical finding storage, not a Research Object import, not an engine result, and not Human-Gate promotion.
>
> Primary source: *אהבת תורה*, ר' פנחס זלמן הלוי סג"ל איש־הורוויץ, HebrewBooks #5635. Exact readings remain provisional wherever recovered through OCR/search rather than a visually secure page image.

## Checkpoint scope

This checkpoint preserves the new structural findings recovered while completing the `אוריין תליתאי` cluster after Checkpoint 3. It deliberately separates source claims from our reconstruction of the author's data model.

## A. `פעמים` and `תיבות` are distinct source metrics

Across the recovered parasha tables the author repeatedly places named people, groups and textual/speaking categories beside separate `פעמים` and `תיבות` values.

Examples recovered in the source sequence include individual people, collective groups and composite attributions such as `משה ואהרן`, `משה ויהושע`, `משה והזקנים`, `משה והכהנים`, `מרים ואהרן`, `יהושע וכלב`, `בני ישראל`, `בנות צלפחד`, and others.

**SOURCE STRUCTURE:** the two metrics must remain separate.

**DO NOT collapse** `פעמים` into word count, or `תיבות` into entity mention count.

## B. Correction: `תיבות` is broader than a universal `spoken_word_count`

Recovered tables include categories such as `דבר ה׳` and `תורה` alongside human individuals and groups. Therefore the earlier narrow reading that every `תיבות` row is simply "words spoken by this person" is too strong.

The Jacob–Rachel–Leah 1,820 result remains a source-explicit speech-attribution finding because the author explicitly frames that result with `דברו ... תיבות`. That local semantics must not be projected onto every row in the larger table.

Safe working terminology until the author's exact boundary rule is recovered:

- `source_occurrence_metric` for `פעמים`;
- `source_word_metric` for `תיבות`;
- attribution semantics only where source context supports them.

## C. Parasha → category/attribution → book → Torah aggregation

The source sequence now supports a hierarchical quantitative structure rather than isolated counts.

Recovered evidence includes:

- parasha-level rows assigning metrics to named categories/persons/groups;
- a book-level subtotal for Exodus stated as `ט״ז אלף תש״ג תיבות` = **16,703 words according to the author/source regime**;
- a whole-Torah total stated as `ע״ט אלף תתקע״ו תיבות` = **79,976 words according to the author/source regime**;
- category breakdowns appearing around these higher-level totals.

**SOURCE CLAIM / TEXT COUNT:** 16,703 for Exodus under the author's regime.

**SOURCE CLAIM / TEXT COUNT:** 79,976 for the whole Torah under the author's regime.

**INFERENCE:** the material functions as a hierarchical corpus-attribution/counting system of approximately:

`PARASHA → CATEGORY / ATTRIBUTION UNIT → METRICS → BOOK SUBTOTAL → TORAH TOTAL`.

The hierarchy is strongly supported by repeated source structure, but this modern data-model formulation is ours, not the author's terminology.

## D. Composite attribution is first-class in the source

The tables do not restrict attribution identity to one person. Composite identities and groups appear as their own counting units.

Research consequence:

**DO NOT model this source evidence as a single mandatory `speaker_id`.**

If later ingested, the source needs to preserve the raw attribution label and its provenance before any canonical entity/group resolution. Identity normalization must not erase the author's original grouping.

This is a research-model observation only; it does **not** authorize schema work.

## E. Vayechi / Jacob internal cross-check

A recovered Vayechi row gives Jacob as `י״ב פעמים תקל״ב תיבות` — 12 in the `פעמים` metric and 532 in the `תיבות` metric.

The 532 value agrees with the separately recovered Jacob speech-word decomposition for Vayechi. This is useful **source-internal cross-check evidence**.

Status:

- `12`: SOURCE-LOCATED metric reading;
- `532`: SOURCE-LOCATED word-metric reading and internally cross-supported;
- exact semantic rule for the `12 פעמים` metric: still dependent on the table's unrecovered explicit counting contract.

## F. Genesis subtotal candidate requires scope discipline

A recovered line gives a Genesis-level total of **2,612 `תיבות`** in the context of the table/system being examined.

This must **not** be represented as the total number of words in Genesis. It is a subtotal belonging to the local attribution/counting population or table scope.

Status: **SOURCE-LOCATED / SCOPE REQUIRES PRECISE LABELING.**

## G. Ordinal token position is a separate method

The nearby source material also identifies particular words by ordinal position in the Torah word stream (`התיבה ... בתורה`). This is a different numerical object from occurrence frequency and from attributed-word totals.

Method distinction:

**TOKEN ORDINAL POSITION ≠ TOKEN FREQUENCY ≠ ATTRIBUTED WORD COUNT.**

Any later extraction must preserve which metric the numeral belongs to before attempting cross-method comparison.

## H. Vayigash → Vayechi boundary remains structural/interpretive, not quantitative

The author's use of the absent parasha break between Vayigash and Vayechi, together with Judah/Joseph and two-kingdom unity interpretation, remains classified as:

- boundary state: **STRUCTURAL TEXT OBSERVATION / SOURCE CLAIM**;
- Judah/Joseph / kingdom-unity linkage: **SOURCE INTERPRETATION**;
- not a text-count result and not a gematria calculation.

Do not force this passage into the 1,820 numerical family merely because it occurs beside quantitative material.

## I. What is now closed vs open for `אוריין תליתאי`

### Sufficiently closed for forward research

- the author maintains repeated parasha-level quantitative tables;
- `פעמים` and `תיבות` are distinct metrics;
- rows can represent individuals, groups, composite groups and textual/divine categories;
- book and Torah-level aggregation exists;
- 79,976 is the author's whole-Torah word total under his regime;
- the material is best preserved as a hierarchical attributed/counting corpus, not as isolated numerology snippets.

### Still open

- the author's exact explicit rule defining every `פעמים` value;
- the exact boundary/attribution rule defining every `תיבות` row, especially nested quotation or joint speech cases;
- whether every recovered parasha table participates in one checksum path to the 79,976 total;
- independent corpus verification of the source totals;
- exact page-image verification for OCR-sensitive rows.

These open points no longer block forward source scanning. They should be closed when a clean definition/page appears naturally, not through redundant search loops.

## J. Truth / verification discipline

- Source-reported counts remain **SOURCE CLAIM / TEXT COUNT** until independently reproduced.
- Ordinary arithmetic may be checked separately and labeled **CALCULATION VERIFIED** where applicable.
- Gematria/milui expressions remain **NOT ENGINE VERIFIED** unless run through the canonical live registry/engine.
- Our corpus/data-model descriptions are **INFERENCE**, never retroactively source wording.
- No source claim is canonicalized or published by this checkpoint.

## Next research action

Treat `אוריין תליתאי` as sufficiently mapped for this pass and continue forward in physical source order to the next genuinely new quantitative/method cluster. Re-open the attribution-contract question only if the source supplies cleaner evidence.

## Explicit non-actions

No live content/corpus insert; no `research_objects` import; no canonicalization; no publication; no UI/code/schema/engine change; no Master State/Roadmap change; no merge/deploy to `main`.
