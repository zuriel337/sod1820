# אהבת תורה — Full Source Mapping Pass (HebrewBooks #5635)

> **Status:** Claude, Session 7 (branch `claude/ahavat-torah-letter-dataset-closure`). **Scope:** READ + MAPPING only, per the "AHAVAT TORAH FULL SOURCE MAPPING PASS" brief. No WRITE, no DB/schema change, no canonical promotion. This file synthesizes all 6 prior artifacts on this dossier (Coverage Map, Letter-Parasha Reconstruction, Full-Book-Inventory's 7 files, Research Library Foundation, P35 Letter-Closure, DS-06's two closure files) into one map. **It does not repeat their extraction work** — p.35 and DS-06 are cited at their CURRENT (already-closed/partially-closed) status only, per the task's explicit instruction not to redo them.
> **Method:** pure synthesis of existing git-tracked artifacts, read via `git show <branch>:<path>` from their own branches (none merged, none edited). Zero new PDF pages rendered this pass.

---

## A. SOURCE STRUCTURE

### A.1 Physical/bibliographic structure (99 PDF pages, `pymupdf`-confirmed)

| PDF pp. | Printed pp. | Part | Content | Confidence |
|---|---|---|---|---|
| 1–5 | — | Front matter | Title page, publisher ad, author statement (declines approbations) + 1983 reprint colophon, 2-part editorial preface (genealogy, Vav-dot masorah, miscitation history) | VISUALLY_VERIFIED |
| 6–18 | 1–13 | חלק א׳ "מגדל עוז" | Tetragrammaton count opening, Mishkan/Temple gematria, letter-Tet count (withdrawn), Maaseh Merkava, דרש-דרש midpoint, Haggadah span, Erechin/Omer arithmetic, Serah bat Asher, tribal populations, Levite 239-word span | VISUALLY_VERIFIED |
| 19–24 | 14–19 | מגדל עוז continued | **Deliberately content-free in every Claude artifact** — GPT's declared parallel-research territory (DO-NOT-TOUCH). Page existence/header only. | SOURCE_LOCATED (existence only) |
| 25–31 | 20–26 | אוריין תליתאי | Entity/attribution table (פעמים+תיבות dual metric) for named persons/groups across the Torah | 5 pp. VISUALLY_VERIFIED, 2 pp. (27–29) SOURCE_LOCATED (OCR-era reading, not re-rendered) |
| 30–35 | 25–30 | שרשים בתורה (+ **D-03 boundary, RESOLVED**) | Root-word list (1,820 roots); p.35 confirmed (Session 5) as the **true start** of the detailed letter table, not p.30 or p.36 | VISUALLY_VERIFIED (structure); root-list content UNCERTAIN |
| 35–41 | 30–36 | אותיות התורה (detailed, per-letter) | 22-paragraph letter×parasha occurrence table — **DS-02** | See §B — PARTIAL |
| 41–42 | 36–37 | Summary tables | "תיבות התורה" (words/parasha, total 79,976) + 2nd "אותיות התורה" (all-letters/parasha, total ~304,812) — **DS-03/DS-04** | VISUALLY_VERIFIED (Torah-totals); UNCERTAIN (per-cell) |
| 42–43 | 37–38 | אותיות/תיבות חמש מגילות | Letter+word counts for the 5 Megillot — **DS-09/DS-10** | VISUALLY_VERIFIED (existence); UNCERTAIN (values) |
| 44–45 | — | Part boundary | חלק ב׳ title page + blank leaf | VISUALLY_VERIFIED |
| 46–92 | 1–47 | חלק ב׳, parasha-ordered chiddushim | Full running commentary, Bereshit→Vezot HaBeracha; contains DS-05 (entity table cross-reference), DS-06 (Moshe-occurrence, p.70), DS-07 (Sanhedrin chain, p.78), DS-08 (Tochecha, p.90), CR-01–CR-08 thematic recurrences | VISUALLY_VERIFIED throughout (declared **low-resolution**: page-level rows exist, but comment-level decomposition of pp.46–92 — and pp.6–18 — is a first pass, not exhaustive) |
| 93–94 | 48–49 | מגילת אסתר commentary | Boundary from Vezot HaBeracha confirmed clean | VISUALLY_VERIFIED |
| 94–99 | 49–54 | השמטות (addenda) | ~15–20 correction-entries keyed to earlier parashiot, collapsed into one unit-row per page (a documented "same-title-many-entries" trap, A-04-adjacent) | VISUALLY_VERIFIED |
| 99 | 54 | 1983-edition errata | R. Yehoshua Lyman's page+word-anchored correction list, including one explicit unresolved "צ״ע" | VISUALLY_VERIFIED |

### A.2 Tables identified (structural, not exhaustive of content)

1. Tetragrammaton-per-parasha table (p.6) — feeds DS-01.
2. אוריין תליתאי entity/attribution table (pp.25–31) — DS-05.
3. Detailed letter×parasha table, 22 paragraphs (pp.35–41) — DS-02.
4. "תיבות התורה" words-per-parasha summary (pp.41–42) — DS-03.
5. Second "אותיות התורה" all-letters-per-parasha summary (pp.41–42) — DS-04. **Same title as table #3's running header — a confirmed same-name/different-table trap (A-04).**
6. "אותיות חמש מגילות" letters-per-megillah (pp.42–43) — DS-09.
7. "תיבות חמש מגילות" words-per-megillah (p.43) — DS-10.
8. Roots-in-Torah list (pp.30/31–35) — DS-11.
9. "עשה"-verb occurrence table, tail-visible top of p.70 — **candidate DS-13, new, not yet extracted** (see §B).
10. Moshe-name occurrence table (p.70) — DS-06, **counting contract CLOSED this dossier (Session 6)**.
11. Sanhedrin 37-generation transmission-chain count (p.78) — DS-07.
12. Tochecha (Ki Tavo blessings/curses) word-count comparison (p.90) — DS-08.
13. 1983-edition errata list (p.99) — DS-12, qualitative not numeric.

### A.3 Chapters/parts (macro)

חלק א׳ (pp.6–43, thematic/numerical studies) → חלק ב׳ (pp.46–92, parasha-ordered chiddushim) → מגילת אסתר (93–94) → השמטות (94–99).

### A.4 Formulas observed (arithmetic constructions, method-level — see §C for the general method, §D for each instance as a claim)

- Straight summation of book subtotals → Torah total (CALC-01, DS-01).
- Raw count minus stated exclusion → adjusted count (CALC-02/07, samekh 1,833→1,830).
- Bounded-span decomposition: sub-span + sub-span → combined total (CALC-03, Levite passage — **does not close**, see §E).
- Multiplication (word-count × letters-per-word) (CALC-04, 30×2=60).
- Triangular series 1+2+…+N (CALC-05: N=60→1,830; CALC-06: N=49→1,225).
- Prefixed-form decomposition of a name-occurrence total (DS-06, Session 6: 614+13+13+4+2+1=647, **exact**).
- Cumulative (not independent) per-book running subtotals within a letter's paragraph (DS-02's confirmed convention).

### A.5 Conclusions the source itself draws (author's own stated punch-lines, not this dossier's interpretation)

- Tetragrammaton appears exactly **1,820** times in the Torah (p.6).
- Samekh (as Adonai-linked) appears **1,830** times, after masoretic exclusion (p.8).
- The "עשה" root's true count (after resolving a compositor dispute) is exactly **248** — matched to the 248 positive commandments (p.70, tail of a not-yet-extracted table, candidate DS-13).
- The name "משה" appears **647** times in the Torah, correcting two earlier authorities' counts of 795 and 642 (p.70, DS-06 — **this dossier's own re-verification confirms 647 via an independent, exact prefix-form decomposition**, Session 6).
- Total Torah word count: **79,976** (pp.25–31 and pp.41–42, independently worded, digit-for-digit agreeing — CR-09).
- Total Torah letter count (all 22 letters combined): **~304,812** (pp.41–42, last digit uncertain).
- 1,820 roots exist in the Torah's vocabulary (pp.31–35, DS-11, full list not transcribed).

---

## B. DATASET INVENTORY

| ID | Pages | Subject | Method | Extracted values | Status |
|---|---|---|---|---|---|
| DS-01 | 6 | Tetragrammaton occurrences per parasha/book | Occurrence counting | 165+398+311+396+550=**1,820** (book subtotals only; per-parasha cells SOURCE_LOCATED, not re-verified) | **CLOSED** — arithmetic exact (CALC-01), cross-referenced nowhere contradicted |
| DS-02 | 35–41 | Occurrences of each of 22 letters, per parasha/book | Letter-occurrence counting | 187 rows (Session 2) + p.35's א/ב/ג/opening-ד rows (Session 5). Gimel/Bereshit closes almost exactly (Δ+7/577). Aleph/Bet show order-of-magnitude gaps (numeral-scale hypothesis, unresolved). ט–נ interval partially resolved (Tet re-ID'd; ל/מ/נ boundary open). ה checksum substantially resolved (Δ+44 residual); ז checksum unresolved (Δ+117, glyph ambiguity). | **PARTIAL** — structure fully mapped p.35→41; most per-cell values UNCERTAIN or UNRESOLVED at arithmetic level |
| DS-03 | 25–31, 41–42 | Total word count per parasha/book | Word-occurrence counting | Torah total **79,976**, independently cross-validated at 2 separately-worded locations (CR-09) | **CLOSED** (Torah-total level); per-parasha cells UNCERTAIN |
| DS-04 | 41–42 | Total letter count (all 22 combined) per parasha/book | Letter-occurrence counting | Torah total **~304,812**, last digit uncertain, cross-validated against LEDGER's independent citation (CR-10) | **PARTIAL** (Torah-total near-closed; per-parasha cells UNCERTAIN) |
| DS-05 | 25–31 | Attributed speech/mentions per named entity, per parasha (dual metric: פעמים + תיבות) | Entity-attribution counting | Structure confirmed (Yaakov, Lavan, Rachel, Leah, Moshe, Aharon, Miriam, Caleb, Bnot Tzlofchad rows); per-cell values not re-verified. **Confirmed distinct from DS-06** (Session 6 §7 — single-metric name-occurrence vs. this dataset's dual-metric attributed-speech) | **OPEN** — structure only, no cell-level closure attempted |
| DS-06 | 70 (corrected from Session 3's [70,71]) | Occurrences of the name משה, per parasha/book/Torah | Name-occurrence counting | Grand total **647**, VISUALLY_VERIFIED at 2 zoom passes. Prefix-form breakdown CLOSED exactly (614+13+13+4+2+1=647, Session 6). Book-subtotal→Torah-total aggregation CLOSED exactly (290+86+233+38=647, Session 6). **Parasha-row→book-subtotal aggregation remains OPEN in all 4 books** (unforced gaps +22/+112/+47/+94-ish). Recurring "50" pattern (5 instances) confirmed literal (not artifact), significance undetermined. | **PARTIAL** — 2 of 3 aggregation levels CLOSED; row-level OPEN |
| DS-07 | 78 | Masoretic transmission-chain generation count (Para Aduma witnesses) | Transmission-chain counting | **37** rows/generations (single figure, existence VISUALLY_VERIFIED; exact scope of what's counted UNCERTAIN) | **OPEN** |
| DS-08 | 90 | Tochecha (blessings vs. curses) word-count comparison | Bounded-span word counting | Existence VISUALLY_VERIFIED; exact figures **UNKNOWN** (not yet extracted — flagged as a Task-3 target in a prior session, not yet executed) | **OPEN** |
| DS-09 | 42–43 | Letter count per megillah (5 Megillot) | Letter-occurrence counting | Existence + structure VISUALLY_VERIFIED; values UNCERTAIN (flagged as a Task-3 target, not yet executed) | **OPEN** |
| DS-10 | 43 | Word count per megillah (5 Megillot) | Word-occurrence counting | Existence VISUALLY_VERIFIED; values UNCERTAIN | **OPEN** |
| DS-11 | 30/31–35 | Roots-in-Torah list (lexical units) | Root/lexical enumeration | **1,820** roots claimed (AUTHOR_COUNT); full list not transcribed; Horowitz's own root-identity rule not recovered | **OPEN** |
| DS-12 | 99 | 1983-edition errata list | Editorial correction tracking (qualitative, page+word-anchored) | Existence + structure VISUALLY_VERIFIED; textual, not numeric — includes ≥1 explicit unresolved "צ״ע" | **CLOSED** (as a qualitative inventory — nothing further to numerically close) |
| **DS-13** (candidate, new) | ~69–70 (tail visible top of p.70; true start unread) | "עשה"-verb occurrence count, per parasha (Terumah–Pekudei observed) | Word-root-occurrence counting | Only the CONCLUSION visible: "ותמצא מכוון רמ״ח" (=248, matched to the 248 positive commandments). No rows extracted. | **UNKNOWN** — flagged, not investigated, per this session's own prior STOP instruction (Session 6) |

**Dataset count: 13 (12 registered in Session 3 + 1 new candidate this dossier).** No dataset re-extracted in this pass — all statuses above are carried forward from their originating session, consolidated here for the first time in one table.

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
| Bounded-span counting | Define a span by explicit "from X to Y" markers, then count within it | DS-08, CALC-03, E-05 (recurs at pp.13, 18, 82) |
| Kri/ktiv (read-vs-written) distinction | Separate the read-tradition form from the written form before counting | E-01, CALC-02, CALC-07 |
| Exclusion-by-rule ("not from one root") | Remove candidate occurrences that fail a stated identity rule | E-02, E-03 |
| Missing/extra letter claim | Assert a letter is absent/added relative to an expected count, for symbolic reasons | E-04 (withdrawn), E-10 |
| Letter-absence-as-meaningful | Treat the total absence of a letter in a bounded passage as itself significant | E-10 (Zayin, 42-station list) |
| Triangular-number construction | Sum 1..N to produce a target figure | CALC-05, CALC-06 |
| Transmission-chain/generation counting | Count links in a claimed chain of tradition-bearers | DS-07 |
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
| Levite bounded span = 239 words | 18 | CALC-03: 212+37=249 | VISUALLY_VERIFIED (all 3 numbers); **arithmetic does NOT close** | **249≠239, delta −10, unresolved (E-07)** |
| 30 two-letter words → 60 letters → 1,830 (triangular) | 12 | CALC-04+CALC-05: 30×2=60; Σ1..60=1,830 | ARITHMETIC_VERIFIED (both steps) | None found |
| אוריין תליתאי entity table exists, dual-metric | 25–31 | — | VISUALLY_VERIFIED (structure) | None found (per-cell not verified) |
| Detailed letter table spans pp.35–41, not 36–41 | 35 | — | **RESOLVED** (D-03, Session 5, 6× zoom) | Previously open (2 competing readings); now closed |
| Total Torah words = 79,976 | 25–31 & 41–42 | — | VISUALLY_VERIFIED (2 independently-worded locations agree exactly) — CR-09 | None found |
| Total Torah letters ≈ 304,812 | 41–42 | — | VISUALLY_VERIFIED (cross-cited by LEDGER independently) — CR-10; last digit UNCERTAIN | Minor digit-level uncertainty only |
| 1,820 roots exist in the Torah | 31–35 | — | AUTHOR_COUNT (SOURCE_LOCATED) | Full list not transcribed — can't independently check |
| "עשה"-root count resolves to 248 (=248 mitzvot) | ~69–70 | — | SOURCE_LOCATED (conclusion only) | **Full row data not extracted — candidate DS-13, UNKNOWN** |
| Name משה = 647 occurrences in the Torah | 70 | 614+13+13+4+2+1=647 (Session 6) | **CLOSED** — exact arithmetic closure at 2 levels (prefix-form; book-subtotal→Torah) | Parasha-row level does not close against its own book subtotal (4 unresolved gaps) |
| Sanhedrin transmission chain = 37 generations | 78 | — | VISUALLY_VERIFIED (existence); scope UNCERTAIN | None found, but under-specified |
| Zayin entirely absent from the 42-station Masei list | 82 | — | VISUALLY_VERIFIED (terse pass) | Not independently re-verified this dossier |
| Tochecha word-count comparison (blessings vs. curses) | 90 | — | VISUALLY_VERIFIED (existence); values UNKNOWN | Not yet extracted |
| Five Megillot letter/word counts | 42–43 | — | VISUALLY_VERIFIED (existence/structure); values UNCERTAIN | Not yet extracted |
| 1983-editor's open question on Shoftim מזבח/אדמה claim | 97, 99 | — | VISUALLY_VERIFIED (the question itself, not an answer) | **Explicitly left open by the source's own 1983 editor — "צ״ע"** |

---

## E. CONTRADICTION MAP

### E.1 Arithmetic conflicts (unresolved, not force-corrected)

| ID | What conflicts | Delta | Status |
|---|---|---|---|
| E-07/CALC-03 | Levite span: 212+37=249 vs. printed 239 | −10 | UNRESOLVED |
| A-01/E-08 | Letter Heh, Bereshit: transcribed Σ vs. printed cumulative | was +244, now **+44** after a found transcription-decode error (Session 5) | SUBSTANTIALLY RESOLVED, small residual |
| A-02/E-09 | Letter Zayin, Torah-total: transcribed Σ vs. printed final | +117 (orig); re-verification attempt did not improve it | UNRESOLVED (glyph ambiguity, thousands-prefix) |
| New (Session 5) | Letter Aleph/Bet, all 4 books each: per-parasha Σ vs. printed book subtotal | grows from ~−1,471 to ~−43,952 with book size | UNRESOLVED — numeral-scale/thousands-notation hypothesis, not confirmed |
| New (Session 6) | DS-06, all 4 books: per-parasha Σ vs. printed book subtotal | +22 / +112 / +47 / +94(ish) | UNRESOLVED — root cause undetermined; recurring-50 pattern is a partial but incomplete explanation |

### E.2 Missing rows / by-design gaps (not contradictions, but must not be mistaken for them)

- **PDF pp.19–24**: zero content in every Claude artifact — deliberate DO-NOT-TOUCH (GPT's declared territory), not a coverage failure.
- **Unit IDs U-026–U-031**: intentionally absent, same reason.
- **DS-06's Devarim list**: only 6 of 11 parshiot named in the source itself — confirmed not a transcription skip (Session 6), genuinely partial in the printed table.
- **ט–נ letter interval (pp.37–38)**: internally inconsistent drop-cap reads in the original pass; partially resolved Session 5 (Tet re-identified); **ל/מ/נ boundary still unresolved** (`ID_p38_LEFT.png` rendered, never examined).

### E.3 Unclear/duplicate labels

- **A-04**: two separate tables (words-per-parasha vs. letters-per-parasha) share the exact running-header title "אותיות התורה" on pp.41–42 — a confirmed same-name/different-table trap.
- **pp.94–99 "השמטות"**: one section title covers ~15–20 distinct correction-entries, currently collapsed into one unit-row per page — real content, low-resolution cataloguing only.

### E.4 Partial tables (existence confirmed, content not extracted)

DS-05 (entity/attribution per-cell values), DS-07 (exact scope of the 37-count), DS-08 (Tochecha exact figures), DS-09/DS-10 (Five Megillot values), DS-11 (full 1,820-root list), DS-13 (the whole עשה-table body).

### E.5 Source ambiguities (the book's own, not this dossier's)

- **CR-04**: Omer 1..49=1,225 appears at both p.13 and p.73 — one passage referenced twice, or two independent treatments? Not adjudicated (interpretation-adjacent).
- **E-11**: the source's own 1983 editor leaves an explicit unresolved question ("צ״ע") rather than asserting a fix — the book's transmission history preserves acknowledged uncertainty, not just corrections.
- **Recurring "50" in DS-06**: confirmed literal (not a misread) in all 5 instances, direct-re-checked; whether it is a motif, coincidence, or an unstated approximation convention remains genuinely undetermined.

### E.6 Resolved (no longer open, listed for completeness)

D-01 (p.3 mislabel), D-02 (addenda boundary), D-03 (letter-table start page), GPT `v5`/`v5b` branch-pointer state (per Zuriel's explicit instruction).

### E.7 Provenance gaps (not source contradictions — dossier-integrity gaps)

GPT Checkpoint 7 (Attributed Expression Corpus) and Checkpoint 8 (Corpus→Cohort Aggregation, 79,976 frame, 18,200-cohort audit) are named in `DOSSIER_INDEX.md` as provenance stubs but **not independently read by Claude** — their actual content, exact file paths, and any cross-walk against this dossier's own findings remain an open verification task, not a resolved cross-reference.

---

## F. RESEARCH ROADMAP

### DONE (closed, no further action needed unless new evidence surfaces)

- Full 99/99-page structural map (visual), all parts/chapters identified.
- 13 datasets catalogued (12 original + 1 new candidate this pass).
- 18 distinct methods identified and separated from their findings.
- Tetragrammaton=1,820 (exact), word-total=79,976 (cross-validated), letter-total≈304,812 (cross-validated) — all CLOSED at the Torah-total level.
- Letter-table's true start (p.35, not p.30/p.36) — RESOLVED.
- DS-06's counting contract (population, prefix-form treatment, Torah-level aggregation) — CLOSED.
- Two self-corrected drifts (D-01, D-02) and the GPT `v5`/`v5b` pointer question — RESOLVED.
- Research Library / Source Dossier architecture — FOUNDATION SUFFICIENT, no schema/DB change needed.

### OPEN (needs verification, in rough priority order)

1. Letter-table (DS-02) per-parasha values for high-frequency letters (Aleph, Bet, and by extension every common letter ה–ת) — numeral-scale hypothesis unconfirmed.
2. ל/מ/נ letter-identity boundary (pp.37–38) — one specific unread image away from closure.
3. A-02 (letter Zayin checksum) — glyph ambiguity, needs a fresh high-zoom pass on the thousands-prefix digit specifically.
4. DS-06's parasha-row-level aggregation (why 4/4 books fail to reconcile even though their own subtotals are exact) — root cause undetermined.
5. E-07 (Levite span 249 vs. 239) — a single, small, well-bounded arithmetic discrepancy, never revisited since Task 3.
6. CR-04 (Omer construction, one passage or two) — interpretation-adjacent, likely GPT's to adjudicate.
7. GPT Checkpoint 7/8 — provenance stubs only, need actual reading + cross-walk.

### NEXT (recommended single best next step)

**Re-verify the letter-table's high-frequency-letter numerals (item 1 above) with a dedicated high-zoom pass targeting thousands-scale marks** (geresh placement, compositor convention) on pp.35–41. This is the single highest-leverage open item: it is the root cause suspected behind DS-02's *entire* per-cell UNCERTAIN status for every common letter (not just Aleph/Bet) — resolving the notation convention once would very likely let dozens of already-transcribed cells across the whole letter-table snap into VISUALLY_VERIFIED status without any new page-reading, since the raw glyphs are already captured; only their numeral-scale interpretation is in question.

Runner-up (smaller, cheaper, self-contained): close item 2 (ל/מ/נ boundary) — a single already-rendered, already-waiting image (`ID_p38_LEFT.png`) needs only to be examined.

### UNKNOWN (cannot currently be determined from available evidence)

- Whether Horowitz ever explicitly states his textual nusach/corpus anywhere in the book (not found in any pass across pp.6–43 or the read portions of pp.46–92).
- The actual content of PDF pp.19–24 (GPT's declared territory — not Claude's to determine).
- The actual content of GPT Checkpoints 7 and 8 (relayed by coordination brief only, never independently read this dossier).
- Whether DS-05 and DS-06 are governed by genuinely different counting rules in the source's own words, or merely happen to look different from the metrics visible so far (Session 6's distinction-check was confirmatory but did not read Checkpoint 7 itself).
- The full row-by-row content, total, and counting contract of candidate dataset DS-13 (the עשה-verb table) — only its concluding sentence has been seen.

---

## Provenance

- **Actor:** Claude, Session 7.
- **Branch:** `claude/ahavat-torah-letter-dataset-closure`.
- **Method:** synthesis of 6 prior artifacts (Coverage Map, Letter-Parasha Reconstruction ×3 files, Full-Book-Inventory ×8 files, Research Library Foundation, P35 Letter-Closure, DS-06 Occurrence Table ×2 files, DS-06 Counting-Contract Closure) via read-only `git show` across 4 branches. Zero new visual extraction performed this pass, per the task's explicit "do not repeat" instruction for p.35/DS-06.
- **This file does not supersede or edit any prior artifact.** It is a new, additive cross-cutting index, cited from `DOSSIER_INDEX.md`/`CROSSWALK.md` (see those files for the row-by-row provenance this map summarizes).
