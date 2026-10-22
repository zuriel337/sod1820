# אהבת תורה — Full Source Mapping Pass (HebrewBooks #5635)

> **Current state (2026-10-22):** all ten page-register batches are merged into the public material projection: 99/99 pages, 303 content blocks and 11 explicitly marked page-level tables. Later corpus closures and corrected readings supersede the older session notes retained elsewhere for provenance. No DB/schema change or deployment is part of this dossier.

---

## A. SOURCE STRUCTURE

### A.1 Physical/bibliographic structure (99 PDF pages, `pymupdf`-confirmed)

| PDF pp. | Printed pp. | Part | Content | Confidence |
|---|---|---|---|---|
| 1–5 | — | Front matter | Title page, publisher ad, author statement (declines approbations) + 1983 reprint colophon, 2-part editorial preface (genealogy, Vav-dot masorah, miscitation history) | VISUALLY_VERIFIED |
| 6–18 | 1–13 | חלק א׳ "מגדל עוז" | Tetragrammaton count opening, Mishkan/Temple gematria, letter-Tet count (withdrawn), Maaseh Merkava, דרש-דרש midpoint, Haggadah span, Erechin/Omer arithmetic, Serah bat Asher, tribal populations, Levite 239-word span | VISUALLY_VERIFIED |
| 19–24 | 14–19 | מגדל עוז continued | Additional 1,820 constructions, census comparisons, liturgical counts, calendar/square constructions and language rules; now present in the all-page register. | MAPPED / SELECTIVE EXACT WITNESS |
| 25–31 | 20–26 | אוריין תליתאי | Entity/attribution table (פעמים+תיבות dual metric) for named persons/groups across the Torah | 5 pp. VISUALLY_VERIFIED, 2 pp. (27–29) SOURCE_LOCATED (OCR-era reading, not re-rendered) |
| 30–35 | 25–30 | שרשים בתורה (+ **D-03 boundary, RESOLVED**) | Root-word list (1,820 roots); p.35 confirmed (Session 5) as the **true start** of the detailed letter table, not p.30 or p.36 | VISUALLY_VERIFIED (structure); root-list content UNCERTAIN |
| 35–41 | 30–36 | אותיות התורה (detailed, per-glyph) | 27 printed glyphs (final forms separate) × 54 parashiot — **DS-02** | Corpus matrix closed; source cells partial |
| 41–42 | 36–37 | Summary tables | "תיבות התורה" (54 word rows, 79,976) + 2nd "אותיות התורה" (54 letter rows, source 304,812 / canonical 304,805) — **DS-03/DS-04** | CLOSED; DS-04 source/corpus delta +7 preserved |
| 42–43 | 37–38 | אותיות/תיבות חמש מגילות | 27-glyph letter matrix + word totals for the 5 Megillot — **DS-09/DS-10** | **CLOSED**; 135 source cells transcribed and Eicha boundary localized |
| 44–45 | — | Part boundary | חלק ב׳ title page + blank leaf | VISUALLY_VERIFIED |
| 46–92 | 1–47 | חלק ב׳, parasha-ordered chiddushim | Full running commentary, Bereshit→Vezot HaBeracha; contains DS-05 cross-reference and DS-06. Former DS-07/DS-08 low-resolution readings were withdrawn after exact passes. | VISUALLY_VERIFIED throughout; see DS-07/08 correction note |
| 93–94 | 48–49 | מגילת אסתר commentary | Boundary from Vezot HaBeracha confirmed clean | VISUALLY_VERIFIED |
| 94–99 | 49–54 | השמטות (addenda) | ~15–20 correction-entries keyed to earlier parashiot, collapsed into one unit-row per page (a documented "same-title-many-entries" trap, A-04-adjacent) | VISUALLY_VERIFIED |
| 99 | 54 | 1983-edition errata | R. Yehoshua Lyman's page+word-anchored correction list, including one explicit unresolved "צ״ע" | VISUALLY_VERIFIED |

### A.2 Tables identified (structural, not exhaustive of content)

1. Tetragrammaton-per-parasha table (p.6) — feeds DS-01.
2. אוריין תליתאי entity/attribution table (pp.25–31) — DS-05.
3. Detailed glyph×parasha table, 27 paragraphs including ך/ם/ן/ף/ץ (pp.35–41) — DS-02.
4. "תיבות התורה" words-per-parasha summary (pp.41–42) — DS-03.
5. Second "אותיות התורה" all-letters-per-parasha summary (pp.41–42) — DS-04. **Same title as table #3's running header — a confirmed same-name/different-table trap (A-04).**
6. "אותיות חמש מגילות" letters-per-megillah (pp.42–43) — DS-09.
7. "תיבות חמש מגילות" words-per-megillah (p.43) — DS-10.
8. Roots-in-Torah list (pp.30/31–35) — DS-11.
9. "עשה"-verb occurrence table, pp.69–70 — **DS-13, CLOSED** (268−14−6=248).
10. Moshe-name occurrence table (p.70) — DS-06, **counting contract CLOSED this dossier (Session 6)**.
11. **Withdrawn ID DS-07:** p.78 says Sanhedrin daf 37 and three student rows, not 37 generations.
12. **Withdrawn ID DS-08:** pp.89–90 and p.98 contain Tochecha prose, not a count table.
13. 1983-edition errata list (p.99) — DS-12, qualitative not numeric.

### A.3 Chapters/parts (macro)

חלק א׳ (pp.6–43, thematic/numerical studies) → חלק ב׳ (pp.46–92, parasha-ordered chiddushim) → מגילת אסתר (93–94) → השמטות (94–99).

### A.4 Formulas observed (arithmetic constructions, method-level — see §C for the general method, §D for each instance as a claim)

- Straight summation of book subtotals → Torah total (CALC-01, DS-01).
- Raw count minus stated exclusion → adjusted count (CALC-02/07, samekh 1,833→1,830).
- Bounded-span decomposition: sub-span + sub-span → combined total (CALC-03, Levite passage: ר״ב=202 and ל״ז=37, hence 239 exactly).
- Multiplication (word-count × letters-per-word) (CALC-04, 30×2=60).
- Triangular series 1+2+…+N (CALC-05: N=60→1,830; CALC-06: N=49→1,225).
- Prefixed-form decomposition of a name-occurrence total (DS-06, Session 6: 614+13+13+4+2+1=647, **exact**).
- Cumulative (not independent) per-book running subtotals within a letter's paragraph (DS-02's confirmed convention).

### A.5 Conclusions the source itself draws (author's own stated punch-lines, not this dossier's interpretation)

- Tetragrammaton appears exactly **1,820** times in the Torah (p.6).
- Samekh (as Adonai-linked) appears **1,830** times, after masoretic exclusion (p.8).
- The "עשה" root's true count is exactly **248** — matched to the 248 positive commandments and independently reproduced from the corpus (p.70, DS-13).
- The name "משה" appears **647** times in the Torah, correcting two earlier authorities' counts of 795 and 642 (p.70, DS-06 — **this dossier's own re-verification confirms 647 via an independent, exact prefix-form decomposition**, Session 6).
- Total Torah word count: **79,976** (pp.25–31 and pp.41–42, independently worded, digit-for-digit agreeing — CR-09).
- Total Torah letter count (all 22 letters combined): **source 304,812; canonical corpus 304,805; Δ +7** (pp.41–42, fully localized).
- 1,820 roots exist in the Torah's vocabulary (pp.31–35, DS-11, full list not transcribed).

---

## B. DATASET INVENTORY

| ID | Pages | Subject | Method | Extracted values | Status |
|---|---|---|---|---|---|
| DS-01 | 6 | Tetragrammaton occurrences per parasha/book | Occurrence counting | 165+398+311+396+550=**1,820** (book subtotals only; per-parasha cells SOURCE_LOCATED, not re-verified) | **CLOSED** — arithmetic exact (CALC-01), cross-referenced nowhere contradicted |
| DS-02 | 35–41 | Occurrences of each of 27 printed glyphs, per parasha/book | Glyph-occurrence counting; final forms remain separate | Source structure 27×54 is closed; corpus matrix has 1,458 cells and totals 304,805. Common-glyph source-cell transcription and the א/ב/ז legacy checksum anomalies remain partial. | **CORPUS CLOSED · SOURCE STRUCTURE CLOSED · SOURCE CELLS PARTIAL** |
| DS-03 | 25–31, 41–42 | Total word count per parasha/book | Word-occurrence counting | All 54 source rows and five cumulative checkpoints reproduce **79,976** against the clean corpus | **CLOSED** |
| DS-04 | 41–42 | Total letter count (all 22 combined) per parasha/book | Letter-occurrence counting | 54 source rows total **304,812**; canonical corpus **304,805**; 11 one-letter row deltas, net +7 | **CLOSED WITH SOURCE/CORPUS MISMATCH** |
| DS-05 | 25–31 | Attributed speech/mentions per named entity, per parasha (dual metric: פעמים + תיבות) | Entity-attribution counting | All seven source pages inventoried; structure confirmed (Yaakov, Lavan, Rachel, Leah, Moshe, Aharon, Miriam, Caleb, Bnot Tzlofchad rows). **Distinct from DS-06**: dual-metric attribution rather than name occurrence. | **SOURCE INVENTORIED** — cells not fully normalized |
| DS-06 | 70 | Occurrences of the proper name משה, per parasha/book/Torah | Name-occurrence counting | All 39 rows reproduce 290/86/233/38; six forms give 614+13+13+4+2+1=647; Ex 12:4 and Deut 15:2 same-consonant non-name homographs excluded | **CLOSED** |
| DS-07 | 78 | Withdrawn alleged transmission chain | Corrected source reading | `ל״ז` is Sanhedrin daf 37; `שלשת שורות` is three student rows. No generation chain exists. | **WITHDRAWN — LOW-RESOLUTION MISREAD** |
| DS-08 | 89–90, 98 | Withdrawn alleged Tochecha count | Corrected source reading | Three exact passes found discursive commentary only; no blessing/curse count table exists. | **WITHDRAWN — LOW-RESOLUTION MISREAD** |
| DS-09 | 42–43 | 27 printed glyphs × 5 Megillot | Letter-occurrence counting | 135 source cells and corpus cells closed separately; source totals 12,108/5,142/4,945/5,974/10,968, corpus totals 12,110/5,141/4,949/5,974/10,968 | **CLOSED WITH SOURCE/CORPUS MISMATCH** |
| DS-10 | 43 | Word count per megillah (5 Megillot) | Word-occurrence counting | Source 3,045/1,250/1,294/1,541/2,987; Eicha 1,541/1,542 localized at `מן־בת` ketiv / `מִבַּת` qere (Lam 1:6) | **CLOSED WITH LOCALIZED BOUNDARY** |
| DS-11 | 30/31–35 | Roots-in-Torah list (lexical units) | Root/lexical enumeration | Continuous list located across the full source range; **1,820** units claimed (AUTHOR_COUNT). Horowitz's identity rule is not equivalent to a modern triliteral-root list and is not fully recovered. | **SOURCE INVENTORIED** — lexical normalization remains open |
| DS-12 | 99 | 1983-edition errata list | Editorial correction tracking (qualitative, page+word-anchored) | Existence + structure VISUALLY_VERIFIED; textual, not numeric — includes ≥1 explicit unresolved "צ״ע" | **CLOSED** (as a qualitative inventory — nothing further to numerically close) |
| **DS-13** | 69–70 | עשה-root occurrences across Exodus 25:1–40:38 | Word-root-occurrence counting | 268 candidates − 14 Golden-Calf forms = five exact rows 62/48/24/84/36 (subtotal 254); −6 divine acts = **248**; grammatical forms independently sum to 248 | **CLOSED** |

**Inventory count: 11 active source-backed datasets + 2 withdrawn historical IDs.** DS-07 and DS-08 remain listed so the corrected provenance is not erased.

---

## C. METHOD INVENTORY

**Method ≠ Finding** — the table below lists the *technique*, not what it produced. Findings are in §B/§D.

| Method | Description | Datasets/claims it produces |
|---|---|---|
| Occurrence counting (letter-level) | Count how many times one specific Hebrew letter appears | DS-02 |
| Occurrence counting (word-level, aggregate) | Count total words in a span | DS-03 |
| Occurrence counting (letter-level, aggregate) | Count total letters (all 22 combined) in a span | DS-04 |
| Occurrence counting (specific name/root) | Count how many times one specific word/name/root appears | DS-06, candidate DS-13 |
| Gematria (numeral decoding) | Decode a Hebrew letter-string as a face-value number — the universal *notation*, not itself a finding | Underlies every numeric cell in every dataset above |
| Entity/speech attribution (dual metric) | For each named person/group, count both occurrences (פעמים) AND associated word-mass (תיבות) | DS-05 |
| Root/lexical enumeration | Identify and count distinct lexical roots across a corpus | DS-11 |
| Bounded-span counting | Define a span by explicit "from X to Y" markers, then count within it | CALC-03, E-05 (recurs at pp.13, 18, 82); former DS-08 withdrawn |
| Kri/ktiv (read-vs-written) distinction | Separate the read-tradition form from the written form before counting | E-01, CALC-02, CALC-07 |
| Exclusion-by-rule ("not from one root") | Remove candidate occurrences that fail a stated identity rule | E-02, E-03 |
| Missing/extra letter claim | Assert a letter is absent/added relative to an expected count, for symbolic reasons | E-04 (withdrawn), E-10 |
| Letter-absence-as-meaningful | Treat the total absence of a letter in a bounded passage as itself significant | E-10 (Zayin, 42-station list) |
| Triangular-number construction | Sum 1..N to produce a target figure | CALC-05, CALC-06 |
| Transmission-chain/generation counting | Historical method label only; its sole alleged instance DS-07 was withdrawn | no active dataset |
| Comparative method-recurrence | Apply the same counting method to two different corpora (Chumash + Megillot) | CR-01 |
| Thematic/conceptual cross-referencing | Track a recurring *idea* (not a count) across multiple pages | CR-02, CR-03, CR-05, CR-06, CR-07, CR-08 |
| Editorial correction tracking | A later editor's page+word-anchored list of corrections/open questions | DS-12 |
| Prefix/grammatical-form decomposition | Break one name's total occurrence-count into its grammatical forms (bare, prefixed, etc.) | DS-06 (Session 6 closure) |

**18 distinct methods identified.** No method here is itself a claim — each is only a technique; its *outputs* are catalogued in §B (datasets) and §D (claims).

---

## D. CLAIM INVENTORY

The book's major standalone numeric/textual claims, each with source page, calculation (if any), verification status, and any open contradiction. (Per-parasha cell values inside DS-02/03/04/05/06 are not individually listed here — they are covered as datasets in §B; this table is for headline, book-level, or single-figure claims.)

| Claim | Page | Calculation | Verification status | Open contradiction |
|---|---|---|---|---|
| Tetragrammaton = 1,820 in the Torah | 6 | CALC-01: 165+398+311+396+550=1,820 | ARITHMETIC_VERIFIED (sum); addends remain AUTHOR_COUNT | None |
| Samekh (Adonai-linked) = 1,830 | 8 | CALC-02/07: 1,833−3=1,830; 1,816+14=1,830 | ARITHMETIC_VERIFIED (both paths); addends AUTHOR_COUNT, exclusion rule AUTHOR_COUNT | None found, but independence of the exclusion-rule from the target number not established |
| Letter Tet = 1,820, 16 missing in 2nd Decalogue | 10 | — | **WITHDRAWN** (LEDGER §7 — "not verified from source") | Self-withdrawn by GPT's own earlier pass; not re-asserted anywhere |
| דרש-דרש is the true Torah-midpoint word | 12 | — | SOURCE_LOCATED (exclusion rule for לך-לך/שם-שם stated) | None found |
| Haggadah span = 1,820 words (הא לחמא→גאל ישראל) | 12 | — | SOURCE_LOCATED | None found this pass |
| Erechin age-banded shekel arithmetic | 13 | — | SOURCE_LOCATED | None found |
| Omer 1..49 = 1,225 (front-matter instance) | 13 | CALC-06: 49×50/2=1,225 | ARITHMETIC_VERIFIED (the sum itself); the onward day-50 bridge explicitly not completed in the source | **CR-04: same construction recurs at p.73 — relationship (same passage vs. independent) not established** |
| Levite bounded span = 239 words | 18 | CALC-03: ר״ב=202; ל״ז=37; 202+37=239 | **CLOSED — source numerals and arithmetic agree exactly** | None; the former 212 reading was a Hebrew-numeral decoding error |
| 30 two-letter words → 60 letters → 1,830 (triangular) | 12 | CALC-04+CALC-05: 30×2=60; Σ1..60=1,830 | ARITHMETIC_VERIFIED (both steps) | None found |
| אוריין תליתאי entity table exists, dual-metric | 25–31 | — | VISUALLY_VERIFIED (structure) | None found (per-cell not verified) |
| Detailed letter table spans pp.35–41, not 36–41 | 35 | — | **RESOLVED** (D-03, Session 5, 6× zoom) | Previously open (2 competing readings); now closed |
| Total Torah words = 79,976 | 25–31 & 41–42 | — | VISUALLY_VERIFIED (2 independently-worded locations agree exactly) — CR-09 | None found |
| Total Torah letters: source 304,812 / canonical 304,805 | 41–42 | — | VISUALLY_VERIFIED + COMPUTATIONALLY_REPRODUCED — CR-10 | +7 localized to 11 one-letter row deltas |
| 1,820 roots exist in the Torah | 31–35 | — | AUTHOR_COUNT (SOURCE_LOCATED) | Full list not transcribed — can't independently check |
| "עשה"-root count resolves to 248 (=248 mitzvot) | 69–70 | 268−14=254; 62+48+24+84+36=254; 254−6=248 | **CLOSED — SOURCE + CORPUS REPRODUCED** | No residual |
| Name משה = 647 occurrences in the Torah | 70 | rows→290/86/233/38→647; forms 614+13+13+4+2+1=647 | **CLOSED — SOURCE + CORPUS REPRODUCED** | Two non-name homographs explicitly excluded |
| Former “Sanhedrin chain = 37 generations” | 78 | — | **WITHDRAWN**: 37 is the daf citation; the source says three rows of students | Low-resolution map error, source fact preserved |
| Zayin entirely absent from the 42-station Masei list | 82 | — | VISUALLY_VERIFIED (terse pass) | Not independently re-verified this dossier |
| Former Tochecha word-count comparison | 89–90,98 | — | **WITHDRAWN** after direct source search | The actual material is discursive commentary, not a dataset |
| Five Megillot letter/word counts | 42–43 | source/corpus matrix + MorphHB/WLC boundary witness | **CLOSED** | Eleven letter-cell deltas and one word-boundary delta preserved |
| 1983-editor's open question on Shoftim מזבח/אדמה claim | 97, 99 | — | VISUALLY_VERIFIED (the question itself, not an answer) | **Explicitly left open by the source's own 1983 editor — "צ״ע"** |

---

## E. CONTRADICTION MAP

### E.1 Arithmetic conflicts (unresolved, not force-corrected)

| ID | What conflicts | Delta | Status |
|---|---|---|---|
| E-07/CALC-03 | Former Levite-span conflict: ר״ב was decoded as 212 instead of 202 | 0 | **RESOLVED — 202+37=239** |
| A-01/E-08 | Letter Heh, Bereshit: old low-resolution component transcription | 0 at the book checkpoint: source 6,283 = corpus 6,283 | **RESOLVED — transcription correction** |
| A-02/E-09 | Letter Zayin, Torah total: old component checksum | 0 at Torah-total level: source 2,198 = corpus 2,198 | **RESOLVED — transcription checksum** |
| Former Aleph/Bet “impossible totals” | Low-resolution numeral decoding | not applicable | **WITHDRAWN** — corpus-guided rereading shows ordinary Hebrew numerals, not a thousands-scale convention |
| Former DS-06 row gaps | low-resolution numerals vs. printed book subtotals | formerly +22/+112/+47/+94 | **RESOLVED** — corrected glyphs reproduce every subtotal; the “50” pattern is withdrawn |

### E.2 Missing rows / by-design gaps (not contradictions, but must not be mistaken for them)

- **PDF pp.19–24**: now included in the all-page material register; the former session partition is historical only.
- **DS-06's Devarim list**: only non-zero proper-name parshiot are printed; the omitted rows are zero after the Deut 15:2 non-name homograph is excluded.
- **כ–ל–מ–נ letter interval (pp.37–38)**: resolved by the later high-zoom pass; the sequence is clean and appears once in alphabetic order.

### E.3 Unclear/duplicate labels

- **A-04**: two separate tables (words-per-parasha vs. letters-per-parasha) share the exact running-header title "אותיות התורה" on pp.41–42 — a confirmed same-name/different-table trap.
- **pp.94–99 "השמטות"**: one section title covers ~15–20 distinct correction-entries, currently collapsed into one unit-row per page — real content, low-resolution cataloguing only.

### E.4 Source-inventoried tables (cell normalization incomplete)

DS-02 (full 27×54 source matrix), DS-05 (entity/attribution cells) and DS-11 (1,820 lexical units under the author's own identity rule). DS-07 and DS-08 are withdrawn; DS-09, DS-10 and DS-13 are closed.

### E.5 Source ambiguities (the book's own, not this dossier's)

- **CR-04**: Omer 1..49=1,225 appears at both p.13 and p.73 — one passage referenced twice, or two independent treatments? Not adjudicated (interpretation-adjacent).
- **E-11**: the source's own 1983 editor leaves an explicit unresolved question ("צ״ע") rather than asserting a fix — the book's transmission history preserves acknowledged uncertainty, not just corrections.
- **Former recurring “50” in DS-06**: withdrawn; the cells are small numerals such as ג׳, and the corpus closes every row.

### E.6 Resolved (no longer open, listed for completeness)

D-01 (p.3 mislabel), D-02 (addenda boundary), D-03 (letter-table start page), GPT `v5`/`v5b` branch-pointer state (per Zuriel's explicit instruction).

### E.7 Provenance gaps (not source contradictions — dossier-integrity gaps)

GPT Checkpoint 7 (Attributed Expression Corpus) and Checkpoint 8 (Corpus→Cohort Aggregation, 79,976 frame, 18,200-cohort audit) are named in `DOSSIER_INDEX.md` as provenance stubs but **not independently read by Claude** — their actual content, exact file paths, and any cross-walk against this dossier's own findings remain an open verification task, not a resolved cross-reference.

---

## F. RESEARCH ROADMAP

### DONE (closed, no further action needed unless new evidence surfaces)

- Full 99/99-page structural map (visual), all parts/chapters identified.
- 11 source-backed datasets catalogued; 2 historical IDs preserved as withdrawn corrections.
- 18 distinct methods identified and separated from their findings.
- Tetragrammaton=1,820 (exact), word-total=79,976 (source/corpus match), letter-total=304,812 source versus 304,805 canonical corpus (localized +7) — all CLOSED at the table level.
- Letter-table's true start (p.35, not p.30/p.36) — RESOLVED.
- DS-06's counting contract (population, prefix-form treatment, Torah-level aggregation) — CLOSED.
- DS-07/DS-08 low-resolution extractions — adjudicated and WITHDRAWN; corrected source material retained.
- DS-09/DS-10 Five Megillot tables — CLOSED (27×5 source/corpus cells; Eicha boundary localized).
- DS-13 עשה table — CLOSED (five rows and both exclusion layers reproduced to 248).
- Two self-corrected drifts (D-01, D-02) and the GPT `v5`/`v5b` pointer question — RESOLVED.
- Research Library / Source Dossier architecture — FOUNDATION SUFFICIENT, no schema/DB change needed.

### CURRENT PHASE VERDICT

**MATERIAL MAP COMPLETE.** The current phase is closed: all 99 PDF pages, 303 content blocks, 11 page-level tables, 13 dataset IDs (11 active + 2 withdrawn) and 18 methods are accounted for. There are **zero blocking gaps** for viewing the book as a complete material map.

The five residuals are deliberately reclassified instead of being force-closed:

- **three deep-extraction tasks:** DS-02 source-cell transcription, DS-05 dual-metric cell normalization and DS-11 lexical-rule/list normalization;
- **two source-native research questions:** CP5-WG-02's counting contract and the 1983 editor's explicit צ״ע.

These are future research units, not missing pages, hidden locks or evidence that the material map is incomplete. CR-04 remains interpretation-adjacent context and does not block the phase either. The former ל/מ/נ boundary is already closed: כ→ל→מ→נ is clean and ordered.

### NEXT PHASE

**Selective Research Intake**, using the existing Research OS. Keep one book/source identity, reference the 303 blocks as evidence, and prepare only the closed source-backed claims as candidate Research Objects. Do not bulk-promote every page, block or table cell. Exact routing and the live-state reconciliation are specified in `AHAVAT_TORAH_RESEARCH_INTAKE_MANIFEST.md`.

The bounded Workspace projection for this phase is now implemented branch-only: one source anchor + eight closed-dataset selections + five witness observations (14 deterministic items). It saves references to the existing Research Workspace and deliberately performs no `research_objects` write or truth promotion.

### UNKNOWN (cannot currently be determined from available evidence)

- The exact textual corpus/nusach used by Horowitz for every count (not explicitly identified in the mapped source).
- Whether every unit in DS-11 follows one recoverable lexical identity rule; the printed list is available, but the normalization contract is not explicit.

---

## Provenance

- The original Session-7 synthesis remains represented by the cited register and checkpoint files.
- The 2026-10-22 consolidation incorporates all ten page-register batches, the later DS-03/04/06/09/10/13 corpus closures, the DS-07/08 withdrawals, the CALC-03 correction and the DS-02 27-glyph structure correction.
- The public projection is generated from the tracked page registers; it does not promote private/DB material or alter the source text.
