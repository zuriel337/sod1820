# אהבת תורה — Full-Book Digital Research Inventory (99/99 PDF Pages)

> **NON-CANONICAL, DOCS-ONLY RESEARCH ARTIFACT.** No content research beyond source-reading; no interpretation offered as fact; no gematria/engine verification; no canonicalization; no DB write, schema, engine, or UI change; no Master State/Roadmap update; no publication; no merge/deploy. Branch: `claude/ahavat-torah-full-book-inventory` — docs-only.
>
> **Purpose and division of labor.** GPT is running deep content research on this book in parallel. This artifact is deliberately **structural**: a physical book map, a research-unit segmentation, a type taxonomy, a source/citation graph, a dataset inventory, a calculation graph, an exception index, a cross-book relation list, and an omission audit — built so that no unit of knowledge in the book is invisible to future search, whichever agent eventually does the deep interpretation of any one piece.
>
> Source: *אהבת תורה*, ר' פנחס זלמן הלוי סג"ל איש־הורוויץ, Podgórze/Kraków, תרס"ה / 1905 (HebrewBooks #5635), 99 PDF pages, confirmed via `pymupdf`.

## 0. What this artifact builds on, and what it adds

This is the **third** research pass on this source in this repository's history:
1. A prior coverage/provenance-map task built a 99-page section map from the PDF's **OCR text layer only** (no image rendering) and cross-referenced it against four `AHAVAT_TORAH_RESEARCH_*` documents that live on remote `gpt/ahavat-torah-research-ledger-*` branches (not merged here).
2. A prior letter×parasha reconstruction task did a deep, adversarial, **visual** (image-rendered) transcription of PDF pp.36–42 specifically, producing `AHAVAT_TORAH_LETTER_PARASHA_RECONSTRUCTION.md/.json/.csv` on a separate branch.
3. **This task** renders and visually reads **every one of the 99 pages** for the first time (the earlier coverage-map task never rendered a single page image — it worked from OCR text alone, which this session's own prior work has already shown to be unreliable for structural claims). This pass corrects several of task #1's page-boundary claims (see §6 Drift Candidates) purely from direct visual reading, and extends structural coverage to the ~82 pages neither task #1 nor task #2 had examined visually (pp.1–24 in full depth, pp.25–35 spot-checked, pp.43–99 in full).

**Honesty about depth vs. breadth (read this before the tables).** Per this task's own framing — *"GPT מבצע במקביל deep research... לכן המשימה שלך היא בעיקר exhaustive structural extraction + omission detection... ולא פרשנות מתחרה"* — this artifact deliberately trades per-page interpretive depth for full-book structural breadth. Concretely:
- **Pass A (physical book map)** is genuinely exhaustive at the page-existence/header level for all 99 pages, with two declared exceptions: pp.27–29 rely on the prior task's OCR-based reading (marked `SOURCE_LOCATED` rather than `VISUALLY_VERIFIED`), and **pp.19–24 are deliberately left content-free per this task's own DO-NOT-TOUCH instruction** ("PDF 19–24 — GPT חוקר אותם במקביל"). Those 6 pages carry only a bare structural row (page exists, running header, column count) so the 99/99 page-count stays continuous, with content, sources, and research units explicitly withheld — see `AHAVAT_TORAH_PAGES.json` rows for pp.19–24.
- **Pass B/C (research units + typing)** is a genuine first pass at every page but is **not** a paragraph-by-paragraph decomposition of all ~99 pages' dense halachic/aggadic/kabbalistic content — several pages' worth of short numerology aphorisms or parasha-commentary paragraphs are grouped into one `research_unit` row with a representative gist rather than split into every individual bold-headed sub-comment. This is a **declared scope boundary**, not a silent omission — see §7.
- **Passes D–H (sources, datasets, calculations, exceptions, relations)** capture everything positively identified this session, with the explicit expectation that a slower, page-by-page pass (most naturally GPT's parallel deep-dive) will find more, especially inside the 47-page parasha-commentary layer (pp.46–92) and inside the front-matter footnotes (pp.4–5), which are unusually citation-dense.

## 1. Machine-readable outputs (companion files)

| File | Rows | Pass |
|---|---|---|
| `AHAVAT_TORAH_PAGES.json` | 99 | A — physical book map (pp.19–24 deliberately content-free, see §0) |
| `AHAVAT_TORAH_RESEARCH_UNITS.json` | 88 | B/C — research units + typing |
| `AHAVAT_TORAH_DATASETS.json` | 12 | E — dataset discovery |
| `AHAVAT_TORAH_CALCULATIONS.json` | 7 | F — calculation graph |
| `AHAVAT_TORAH_SOURCES.json` | 26 | D — source/citation graph |
| `AHAVAT_TORAH_RELATIONS.json` | 13 | H — cross-book relations (9 candidate, 4 drift) |
| `AHAVAT_TORAH_EXCEPTIONS.json` | 12 | G — exception/counting-regime index |

Each row carries the fields the task specified (see each file's own keys); every row also carries a `confidence` field drawn from the four-way taxonomy **VISUALLY_VERIFIED / SOURCE_LOCATED / UNCERTAIN / UNKNOWN**, kept strictly separate from the truth-class taxonomy **SOURCE_CLAIM / AUTHOR_COUNT / ARITHMETIC_VERIFIED / CORPUS_VERIFIED / ENGINE_VERIFIED / INTERPRETATION / INFERENCE** used inside `AHAVAT_TORAH_CALCULATIONS.json`. No datum was upgraded to a higher confidence tier because a checksum happened to work out — see §5 for the two checksums that explicitly did **not** work out, preserved as-is.

## 2. Book structure at a glance (Pass A summary)

| Part | PDF pages | Pages | Confidence |
|---|---|---|---|
| Front matter (title/publisher/author-statement/editorial preface) | 1–5 | 5 | VISUALLY_VERIFIED |
| חלק א׳ — מגדל עוז (Tetragrammaton/Name gematria, discursive → rapid-aphorism) | 6–18 | 13 | VISUALLY_VERIFIED |
| מגדל עוז continued — **content withheld, DO-NOT-TOUCH (GPT's parallel territory)** | 19–24 | 6 | SOURCE_LOCATED (existence only) |
| אוריין תליתאי (entity/attribution table) | 25–31 | 7 | 5 VISUALLY_VERIFIED, 2 SOURCE_LOCATED |
| שרשים בתורה (1,820-root list) | 30/31–35 | ~5–6 | mixed, see DRIFT-CANDIDATE D-03 |
| אותיות התורה — detailed per-letter table | 36–41 | 6 | VISUALLY_VERIFIED (full detail in the dedicated Task-2 artifact) |
| תיבות התורה + second אותיות התורה (summary tables) | 41–42 | 2 | VISUALLY_VERIFIED |
| אותיות/תיבות חמש מגילות (Five Megillot letter/word tables) | 42–43 | 2 | VISUALLY_VERIFIED |
| Part-boundary (חלק ב׳ title page + blank leaf) | 44–45 | 2 | VISUALLY_VERIFIED |
| חלק ב׳ — parasha-ordered chiddushim (Bereshit → Vezot HaBeracha) | 46–92 | 47 | VISUALLY_VERIFIED |
| Megillat Esther commentary | 93–94 | 2 | VISUALLY_VERIFIED |
| השמטות (addenda, keyed to earlier parashiot) | 94–99 | 6 | VISUALLY_VERIFIED |
| 1983-edition errata list (R. Yehoshua Lyman) | 99 | 1 | VISUALLY_VERIFIED |

**Total: 99/99 pages accounted for.**

## 3. New findings this pass did NOT have before

1. **The front matter is not what the prior coverage-map task said it was.** PDF p.3 is not an approbation (הסכמה) — it is Horowitz's own statement *declining* to seek approbations, plus a 1983 Brooklyn reprint colophon. PDF pp.4–5 are a rich, previously-uncaptured **editorial preface** (not Horowitz's own 1905 text) tracing a 1975–2003 chain of bibliographic confusion in which this book was repeatedly miscited under a nonexistent title, *אור תורה*. See DRIFT-CANDIDATE D-01, and `AHAVAT_TORAH_SOURCES.json` for the ~10 named sources this preface alone contains.
2. **The addenda section starts one page earlier than mapped.** The "השמטות" title and its first two entries appear at the bottom of PDF p.94, not p.95. See DRIFT-CANDIDATE D-02.
3. **A previously-uncatalogued dataset spans most of the Torah.** PDF pp.70–71 contain a phrase/word occurrence-count table running across many parashiot (Shemot through at least Devarim) that neither prior task had recorded. See `DS-06`.
4. **The book ends with a distinct, previously-uncatalogued unit type**: a page+word-anchored **editorial errata list** (PDF p.99, by the 1983 edition's R. Yehoshua Lyman) that functions as a self-contained correction-and-citation graph pointing back into the book's own earlier pages — including at least one place where the 1983 editor raises an explicit unresolved question rather than asserting a fix. See `DS-12`, `EXCEPTIONS.json` E-11, and `candidate_type EDITORIAL_ERRATA_ENTRY` (not in the given type list — flagged per Pass C's instruction to create a candidate type rather than force-fit).
5. **Sefer Yetzira is a recurring conceptual anchor**, cited at two separate, otherwise-unrelated points examined this pass (p.46 population philosophy, p.96 Korach letter-permutation) — see `CR-02`/`CR-08`. (A possible third occurrence near p.20 falls inside GPT's parallel-research range, pp.19–24, and is deliberately not claimed here.)
6. **An unresolved structural ambiguity was found and left unresolved rather than guessed**: PDF p.30 appears to carry the title "סופר ומונה אותיות התורה" and the start of an Aleph/Bet letter-count table, six pages before the running header itself switches over at p.36 (where the dedicated Task-2 reconstruction began). PDF p.32, read in the same pass, shows unambiguous root-list content with no letter-table continuation. **Two competing readings are recorded, not adjudicated** — see DRIFT-CANDIDATE D-03. This is exactly the class of finding the STOP CONDITION exists for: a dedicated, slower re-verification pass on pp.30–35 is the explicit next recommendation (§10).

## 4. Type taxonomy actually observed (Pass C)

All of the task's suggested types were observed at least once (OCCURRENCE COUNT, LETTER COUNT, WORD COUNT, TEXT COUNT [subsumed under WORD/LETTER COUNT in this book — no separate raw "characters" metric was found], ORDINAL POSITION [confirmed in the prior coverage-map's Checkpoint_2 §A, not re-found independently this pass], GEMATRIA CLAIM, ARITHMETIC, POPULATION, TIME/CALENDAR, MEASURE/GEOMETRY, LINGUISTIC RULE, MASORETIC RULE, NAME DECOMPOSITION, SPEAKER ATTRIBUTION, BOUNDARY/SPAN, REPETITION, MIDRASH, HALAKHIC/TALMUDIC SOURCE, KABBALISTIC SOURCE [Sefer Yetzira, Likkutei Torah], COMMENTARY, INTERPRETATION [folded into MIDRASH/COMMENTARY rows via the `interpretation_present` flag rather than kept as a separate top-level type, since nearly every parasha-layer unit carries some interpretive content alongside its primary type]). **Two candidate types were created, not force-fit into the given list:**
- `PART_TITLE_PAGE` / `BLANK_LEAF` / `TITLE_PAGE` / `PUBLISHER_AD` / `AUTHOR_STATEMENT` / `EDITORIAL_PREFACE` / `EDITORIAL_ADDENDUM` — bibliographic/paratextual units that are not "content" in the gematria-research sense at all, but are real, accounted-for textual regions of the PDF.
- `EDITORIAL_ERRATA_ENTRY` — the 1983-edition's page+word-anchored correction list (p.99), which is neither a MIDRASH nor a GEMATRIA CLAIM nor any other listed type; it is a **correction-and-citation** unit in its own right.

Missing/absent types worth naming explicitly: no MILUI (spelled-out-letter filling) calculation was found as an independent unit outside the coverage-map task's already-known "30 two-letter words" construction (front מגדל עוז section); no SPELLING VARIANT (מלא/חסר) discussion was found as a distinct unit in the pages this pass covered at depth (front matter + pp.43–99) — this may simply mean such content is concentrated in the pp.6–35 range at a granularity finer than this pass's terse read captured, not that it is absent from the book.

## 5. Calculation-graph highlights and checksum honesty (Pass F)

Full detail in `AHAVAT_TORAH_CALCULATIONS.json` (7 chains). Two are worth surfacing here because they demonstrate the required discipline of **not** letting a checksum manufacture false certainty:

- **CALC-01** (Tetragrammaton book totals): 165+398+311+396+550 = 1,820 — arithmetic checks out exactly.
- **CALC-03** (Levite bounded span, p.18): the two sub-spans are printed as 212 and 37 words; 212+37 = **249**, but the printed combined total is **239** — a 10-unit mismatch. This is preserved as-is in the calculation graph rather than silently reconciled; it is the same passage the prior coverage-map task cited as a clean LEDGER §3.9 match (which it still is, for the *existence* of a 239-total bounded span) — this pass adds the observation that the two visible *components* do not sum to that total, which the prior task did not check.
- **CALC-05/06** (triangular sums 1..60=1,830 and 1..49=1,225): both arithmetically exact; the *significance* of either sum remains INTERPRETATION, not verified fact.

## 6. Drift candidates (Pass H/parallel-agent-safety)

Per the task's explicit instruction, competing readings against **this agent's own prior work** are logged as `DRIFT_CANDIDATE`, not adjudicated, and **no GPT-authored file was touched or "corrected."** Four are recorded in `AHAVAT_TORAH_RELATIONS.json`:

| ID | What | Pages | Adjudicated here? |
|---|---|---|---|
| D-01 | p.3 mislabeled "approbations" in the coverage-map task; actually a decline-of-approbations statement + reprint colophon | 3 | Yes — unambiguous on direct reading |
| D-02 | Addenda section actually starts at bottom of p.94, not p.95 as previously mapped | 94 | Yes — unambiguous on direct reading |
| D-03 | Possible letter-table content on p.30, six pages before the previously-assumed start of that table at p.36; competing readings not resolved | 30–35 | **No** — left open, flagged for dedicated re-verification |
| CR-04 | Omer 1..49=1,225 construction appears in two different sections (p.13 and p.73); relationship between the two instances not established | 13, 73 | **No** — interpretation-adjacent, left to GPT's deep-dive |

No `AHAVAT_TORAH_RESEARCH_*` document on the `gpt/ahavat-torah-research-ledger-*` branches was read, modified, or contradicted by this task — this section only ever compares this agent's own outputs across its own three passes.

## 7. Omission audit (Pass I)

Run **after** full-book coverage was reached, specifically hunting for what this inventory itself might have missed:

- **Footnotes / small print**: the front-matter preface (pp.4–5) carries dense footnotes with ~10 named sources — captured in `SOURCES.json`, but the footnotes' own internal argument (e.g. exactly how each source bears on the Vav-dot question) was not decomposed claim-by-claim.
- **Two datasets under the same title, twice over**: this is not a one-time trap — it recurred at least twice in this book (pp.36–42's two "אותיות התורה" tables, already flagged by Task 2; and now pp.94–99's "השמטות" title covering six pages of otherwise-unrelated per-parasha addenda entries, which this inventory treats as one `research_unit` row for compactness but which is really ~15–20 distinct correction-entries — see `DS-12` and the raw notes in the scratch working files for the itemized list).
- **Continuations that cross page boundaries**: explicitly tracked via each page's `continues_from_previous`/`continues_to_next` flags in `AHAVAT_TORAH_PAGES.json`; the אוריין תליתאי table (25–31), the שרשים list (30/31–35), the detailed letter table (36–41), and the addenda (94–99) are all marked as multi-page continuations rather than being artificially split at page boundaries.
- **A citation that didn't get a source node**: the front-matter preface's chain of 20th-century bibliographic sources (קורמן, זילבר, רייניץ, וונדר) is captured as **one bundled row** in `SOURCES.json` rather than four separate rows, for compactness — flagged here so a future pass knows to split it if the four sources' individual claims need independent tracking.
- **Regions confirmed accounted for but only at low resolution**: pp.6–18 (מגדל עוז, content-researched portion) and pp.46–92 (parasha layer) — every page has a `research_unit` row and a `pages` row, but the true count of discrete halachic/aggadic comments in these 60 pages is almost certainly several times the 88 unit-rows this pass recorded (see §0's honesty note). This is the largest **declared low-resolution** gap. Separately and deliberately, **pp.19–24 carry no content rows at all** — a declared **zero-resolution, in-scope-for-GPT-only** region, not a coverage gap in this agent's own work (see §0).
- **Nothing was found completely unaccounted for at the page level** — no PDF page lacks a `AHAVAT_TORAH_PAGES.json` row, and no page's visible major topic lacks at least one `AHAVAT_TORAH_RESEARCH_UNITS.json` row.

## 8. Adversarial second reading (Pass J)

Asking "what did the first pass not see" rather than "was the first pass right":

- **Unknown unknowns**: the possibility (per D-03) that the detailed letter-count table is materially longer than Task 2 realized (starting p.30 instead of p.36) means that dataset's Torah-wide per-letter totals, as currently recorded in `AHAVAT_TORAH_LETTER_PARASHA_DATA.json`, may be **missing** the Aleph/Bet/Gimel/early-Dalet rows entirely, not merely under-verified. This is the single highest-value follow-up (see §10).
- **New method families**: the p.70–71 phrase-occurrence table (DS-06) suggests Horowitz's counting methodology extends beyond the already-catalogued letter/word/root/entity axes into **arbitrary recurring phrases/verbs** — a method family this pass only glimpsed, not characterized.
- **Hidden datasets**: the tochecha word-count comparison (DS-08, p.90) and the Five-Megillot letter/word tables (DS-09/DS-10, pp.42–43) are structurally confirmed to exist but not content-extracted — genuine "known unknowns" rather than omissions.
- **Implicit boundaries**: the part-title pages (p.6 חלק א', p.44 חלק ב') are a clean two-part macro-structure this pass confirms was correctly inferred by the earlier coverage-map task even without visual rendering — a case where the OCR-only approach happened to get the right answer, which is itself worth noting (not every OCR-based inference from the prior tasks was wrong, only some).
- **Source dependencies not yet traced**: R. Yehoshua Lyman's 1983 errata (p.99) is clearly written by a *relative* of the p.4–5 preface's author (both apparently sons of ר' יצחק צבי לימן) — this family/editorial relationship is noted but not further investigated (would require external genealogical research, out of this task's scope).
- **Exception rules not yet found**: no explicit statement of *which nusach/corpus* Horowitz counted against was found anywhere in this pass's coverage (front matter, מגדל עוז, parasha layer, addenda) — this remains a genuine gap across the *entire* book, not just the pp.36–42 range Task 2 already flagged.

## 9. Final counts (as requested)

- **PAGE COVERAGE**: 99/99.
- **UNIT COUNT**: 88 rows in `AHAVAT_TORAH_RESEARCH_UNITS.json` (representing a substantially larger number of discrete sub-comments — see §0/§7 for the explicit granularity caveat on pp.6–18 and pp.46–92; pp.19–24 contribute zero unit rows by design, see §0).
- **DATASET COUNT**: 12 (`DS-01` through `DS-12`).
- **CALCULATION COUNT**: 7 (`CALC-01` through `CALC-07`).
- **SOURCE COUNT**: 26 distinct named sources/works/people in `AHAVAT_TORAH_SOURCES.json`.
- **EXCEPTION COUNT**: 12 (`E-01` through `E-12`), spanning kri/ktiv, inclusion/exclusion, missing/extra letters, bounded-span method, an absence-as-meaningful case, an arithmetic-mismatch case (x2), and a self-critical open question preserved by the 1983 editor.
- **UNKNOWN COUNT**: 0 pages marked outright `UNKNOWN` (every page yielded at least a `SOURCE_LOCATED`-or-better structural read); at the *cell* level, the dedicated Task-2 letter-table artifact separately reports 10 `UNKNOWN` cells (the ט–נ interval) — carried forward here as still open, not resolved.
- **DRIFT CANDIDATES**: 4 (`D-01`, `D-02`, `D-03`, `CR-04`) — 2 self-resolved on direct reading (D-01, D-02), 2 explicitly left open (D-03, CR-04).
- **NEW METHOD FAMILIES**: at least 1 clearly new (the p.70–71 arbitrary-phrase occurrence table, DS-06) beyond the previously-known letter/word/root/entity-attribution families; the editorial-errata-list unit type (p.99) is a new *paratextual* family, not a counting-method family.
- **UNMAPPED REGIONS = 0** at the page level (every PDF page has a row in `AHAVAT_TORAH_PAGES.json`). Explicit list of **lower-resolution** (not unmapped, but coarser-than-ideal) regions: pp.6–18 (מגדל עוז, content-researched portion) and pp.46–92 (parasha layer, ~47 pages) — both regions have every page individually accounted for, but their *internal* comment-by-comment structure is not yet fully decomposed. Explicit list of **zero-resolution, by-design** regions: pp.19–24 — DO-NOT-TOUCH, GPT's parallel-research territory, structurally present in the page map but deliberately carrying no content, source, or unit rows.

## 10. What GPT should deep-verify next

1. **Highest priority**: resolve DRIFT-CANDIDATE D-03. Does the detailed letter-count table (currently reconstructed only for pp.36–42) actually begin at p.30? If so, letters Aleph, Bet, Gimel, and part of Dalet are missing from `AHAVAT_TORAH_LETTER_PARASHA_DATA.json` and need to be added via the same two-pass visual method Task 2 used.
2. Decompose pp.6–24 and pp.46–92 into their full comment-by-comment unit structure (this pass's page-level granularity is a floor, not a ceiling) — this is squarely GPT's declared strength per the task's own division of labor.
3. Extract and verify DS-06 (the p.70–71 phrase-occurrence table) in full — a previously-uncatalogued, book-spanning dataset.
4. Content-extract DS-08 (tochecha word-count, p.90) and DS-09/DS-10 (Five Megillot letter/word tables, pp.42–43).
5. Investigate whether the two Omer-1..49=1,225 passages (p.13 and p.73, CR-04) are truly independent treatments or one construction split by this inventory's own page mapping.
6. Determine, across the whole book, whether Horowitz ever states which corpus/nusach he counted against, or whether this is genuinely never specified (a finding in itself, if confirmed).

## 11. Explicit non-actions (per DO-NOT-TOUCH)

No DB write; no schema change; no engine change; no UI change; no Master State/Roadmap update; no canonicalization; no publication; no reliance on any legacy site UI to decide what to extract; no gematria/engine verification of any figure recorded here; no merge; no deploy. **PDF pp.19–24 were deliberately not researched by this agent at all** (per the task's own DO-NOT-TOUCH: "GPT חוקר אותם במקביל") — those 6 pages carry only a bare page-existence row (running header, column count) in `AHAVAT_TORAH_PAGES.json` for 99/99 continuity, and contribute zero rows to `AHAVAT_TORAH_RESEARCH_UNITS.json` or `AHAVAT_TORAH_SOURCES.json`. No content, citation, or claim from that page range is asserted anywhere in this artifact.
