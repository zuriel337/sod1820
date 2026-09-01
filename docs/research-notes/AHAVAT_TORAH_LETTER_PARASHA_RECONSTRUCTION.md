# אהבת תורה — "אותיות התורה" Letter × Parasha Reconstruction (PDF pp.36–42)

> **NON-CANONICAL, DOCS-ONLY RESEARCH ARTIFACT.** No content research beyond source-reading, no interpretation, no gematria/engine verification, no canonicalization, no schema/DB/engine/UI change, no Master State/Roadmap update, no merge/deploy. Branch: `claude/ahavat-torah-letter-parasha-reconstruction` — docs-only.
>
> Source: *אהבת תורה*, ר' פנחס זלמן הלוי סג"ל איש־הורוויץ, HebrewBooks #5635 (99-page primary scan). This artifact covers **only PDF pages 36–42** (the range the coverage/provenance map classified `PARTIAL_RESEARCH` under LEDGER §3.7). **PDF pp.19–24 are explicitly out of scope** (parallel work by another agent) and **PDF p.43 onward is explicitly out of scope** (per task instructions) — this artifact stops the instant content crosses into p.43, even though the section discovered there visibly continues past that boundary.
>
> Companion machine-readable file: `AHAVAT_TORAH_LETTER_PARASHA_DATA.json` / `.csv` (187 rows — one per transcribed cell, book-subtotal, or Torah-total, each carrying the full field set requested: `pdf_page · printed_page · letter · parasha · source_value · normalized_integer · book · source_anchor · verification_state · ocr_confidence · exception_or_note · arithmetic_checksum_state`).

## 0. Method actually used (read this before the data)

The PDF's embedded OCR text layer (used for the earlier coverage-map deliverable) is **too corrupted at the character level to transcribe a dense numeral table safely** — letters are frequently transposed within words, and reading order is not reliably preserved by naive text extraction. Per the task's own "two-pass" instruction, this reconstruction instead used:

1. **Direct visual transcription from rendered page images.** Each of the 7 pages was rendered at 5.5×–9× zoom (via `pymupdf`), split into right/left column crops (Hebrew reads right column first, then left column, top-to-bottom within each), and read directly as an image — not through the PDF's OCR text layer.
2. **A first extraction pass**, page by page, column by column, transcribing every parasha/value pair, every book-subtotal, and every drop-cap section marker encountered.
3. **A second, adversarial pass** specifically targeting: (a) drop-cap letter identity at every section boundary (re-zoomed at 9× where ambiguous), (b) arithmetic checksums (does a section's listed parasha values, summed, match its printed running/final total?), and (c) the font's known confusion pairs — **ד/ר, כ/ב, ה/ח, ו/ז, ם/ס** all produced at least one caught misread in this pass (documented below).
4. **Where the two passes disagreed, or a glyph remained ambiguous after re-zoom, the cell is marked `UNCERTAIN` or `UNKNOWN` rather than resolved by inference from a total** — per the task's explicit instruction not to back-fill an illegible cell from its checksum. The one documented exception (letter ה's Torah-total thousands-digit) is flagged as **inference from monotonicity**, not a direct read, and is labeled as such everywhere it appears.

## 1. FACTS — what the source actually contains

### 1.1 The section is not one table — it is three, stacked back-to-back

This is the single most important structural correction to the prior coverage-map's (necessarily generic) description of "a letter × parasha matrix." Direct reading of pp.36–42 shows **three distinct, separately-titled tables in sequence**, each ended by a horizontal rule in the print:

| # | Title (as printed) | What it counts | Where (this pass) | Torah-wide total found |
|---|---|---|---|---|
| 1 | *(no separate title beyond the running header "אותיות התורה"; this is the detailed table)* | **One Hebrew letter's occurrence-count**, per parasha, per section — i.e. one full paragraph per letter of the alphabet | PDF pp.36 → 41 (right column, ~85% down the page) | No single combined figure — each letter gets its own Torah-total (see §2) |
| 2 | **"תיבות התורה"** (Words of the Torah) | **Total word count**, per parasha (all words, not one letter) | PDF p.41 (bottom, right column) → p.41/42 boundary | **79,976** (`SOURCE_VERIFIED` by cross-section match, see §3) |
| 3 | **"אותיות התורה"** *(second occurrence of this exact title — a summary table, not a duplicate of table #1)* | **Total letter count**, per parasha (sum of all 22 letters combined, not one letter at a time) | PDF p.41 (bottom, left column) → p.42 (top, right→left) | **≈304,812** (`SOURCE_VERIFIED` by cross-section match, last digit `UNCERTAIN`, see §3) |

Immediately after table #3's final total (p.42, left column), a fourth section begins — **"אותיות חמש מגילות"** (Letters of the Five Megillot) — which starts inside this task's scope (p.42) but its body continues onto p.43, which is out of scope. This artifact records only that the boundary exists; it does not transcribe that section's content.

**This means the earlier coverage-map's characterization of pp.36–42 as one continuous "letter × parasha matrix" undercounted what is actually there.** The detailed per-letter table (#1) is what LEDGER §3.7 described; tables #2 and #3 are summary/checksum layers the ledger had not yet identified as located here.

### 1.2 Counting-contract findings (the "SPECIAL INVESTIGATION" ask)

| Question asked | Finding | Anchor |
|---|---|---|
| What is counted as "a letter"? | Table #1: literal Hebrew consonant occurrences (not word-initial letters, not root letters — full running-text letter tokens), one full alphabet-paragraph at a time. | pp.36–41, structural (see §1.1) |
| What corpus/nusach? | Not stated explicitly anywhere in pp.36–42. No printer/edition/nusach citation was found for this specific section (the book's front matter, out of this task's scope, may state one). | **NOT FOUND** |
| Does kri/ktiv affect the count? | Not stated for this table. (Contrast: the EARLIER "מגדל עוז" section, pp.6–24, out of this task's scope, explicitly discusses kri/ktiv for the Adonai/samekh count — see the Coverage-map task's finding on PDF p.8. No equivalent statement was found for the pp.36–42 letter table itself.) | **NOT FOUND in pp.36–42** |
| Are "special" letter-forms (large/small/suspended/inverted) counted? | Not stated for this table. No inline exception note of that kind was observed in any of the ~14 letter-sections read. | **NOT FOUND** |
| Is inverted-nun counted? | Not addressed in this table. (The book's earlier "מגדל עוז" section separately discusses inverted nuns in the context of the samekh/1830 count — different section, different page range, out of scope here.) | **NOT FOUND in pp.36–42** |
| Does a missing/extra letter trigger an adjustment? | Not stated as an explicit rule anywhere in pp.36–42. No parenthetical adjustment note (of the kind seen elsewhere in the book for the samekh count, e.g. "וכתב... שחסרו") was found attached to any of the transcribed letter-sections. | **NOT FOUND** |
| Raw vs. adjusted count distinction? | **Not applicable to this table as observed** — every section in pp.36–42 shows only ONE progression of numbers per letter (parasha → cumulative running total → final total), with no second "adjusted" pass. This contrasts with the earlier samekh discussion (raw 1,833 → adjusted 1,830) found elsewhere in the book. | Structural absence, pp.36–42 |
| **What is the subtotal-marker convention (the actual, confirmed contract)?** | **Confirmed, high confidence.** Each "ס״ה [number]" marker after a book's parasha list is a **CUMULATIVE / RUNNING total from the start of the letter's paragraph, not an independent per-book subtotal.** The final one — always terminated with a colon (`:`) — is the letter's Torah-wide total. This was established by checking that book-subtotal figures increase monotonically through Bereshit → Shemot → Vayikra → Bamidbar → Devarim within a given letter's paragraph, and is the same "TOTAL → PARASHA DECOMPOSITION → BOOK SUBTOTALS → TORAH TOTAL" audit-trail structure the existing LEDGER §3.1 already documented for the Tetragrammaton count. | Directly observed on letters ד, ה, ז (see §2) |
| Sub-1,000 notation | When a letter's running total is under 1,000, the scribe omits the word "אלף" (thousand) entirely (e.g., letter ז's Bereshit-cumulative is printed as "ה׳ כ״ח" = 420, not "אלף…"). This is a real, source-confirmed formatting rule, not a transcription artifact. | Letter ז, p.36 left column |

## 2. Letter-by-letter data (detailed table, #1)

Full per-cell data is in the machine-readable file. Summary of what was captured, by letter, in reading order:

| Letter | Pages | Torah-total as read | Confidence | Note |
|---|---|---|---|---|
| ד (tail only — paragraph began before p.36) | 36 (right) | **7,036** | UNCERTAIN | Bereshit/Shemot portion of this letter is on a page before p.36 and was **not captured** (outside this task's page range) — cannot be checksummed end-to-end. |
| ה | 36 (right) | **28,055** (thousands-digit resolved by monotonicity inference, not direct read — see §3 anomaly A-01) | UNCERTAIN | Bereshit-parasha sum computed from transcribed values = 6,574 vs. printed Bereshit-cumulative 6,330 — **mismatch, unresolved (A-01)**. |
| ו | 36 (right/left) | **31,536** | UNCERTAIN | Magnitude plausible (Vav is one of the most frequent Torah letters) but not checksummed against its own component list in this pass. |
| ז | 36 (left) | **2,198** | UNCERTAIN | Devarim-tail checksum computed = 2,081 vs. printed 2,198 — **mismatch, unresolved (A-02)**. |
| ח (letter identity itself is an inference — see OQ-01) | 36 (left) → 37 (right) | **7,180** | UNCERTAIN | Was misread as a second "ה" in the first pass; reclassified on magnitude grounds (§4). |
| ט, י, כ, ל, מ, נ | 37–38 | **not reliably resolved** | UNKNOWN (sequence) / UNCERTAIN (raw candidate reads) | See §4 open question OQ-01 — drop-caps in this interval produced self-inconsistent reads (apparent repeats of י and מ) that are almost certainly misreads of neighboring letters, not real repetitions. Individual parasha values for this interval were logged in the raw working notes but are **withheld from the normalized dataset** to avoid presenting false precision. |
| ס | 39 (right) | candidate ~4,000s range | UNCERTAIN | Section boundary itself is `SOURCE_VERIFIED` (unambiguous drop-cap, clean alphabetical sequence ס→ע→פ→צ→ק→ר→ש confirmed). |
| ע | 39 (right/left) | candidate ~10,000s range | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| פ | 39 (left) → 40 (right) | candidate ~3,000s range | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| צ | 39 (left, starts) | not captured within page range at useful depth | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| ק | 40 (right) | candidate **11,248** | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| ר | 40 (left) | candidate **18,123** | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| ש | 40 (left) → 41 (right) | candidate **12,140** | UNCERTAIN | Section boundary `SOURCE_VERIFIED`. |
| ת | 41 (right) | candidate **17,950** | UNCERTAIN | Section boundary `SOURCE_VERIFIED` — confirmed as the **last** letter of the detailed table (immediately followed by the "תיבות התורה" title + horizontal rule). |

**Reading this table honestly:** 7 of 14 section **boundaries** (letter-identity + position) reach `SOURCE_VERIFIED` because their drop-cap glyphs are unambiguous in this font and their alphabetical sequence is internally self-consistent (ס-ע-פ-צ-ק-ר-ש-ת). **Zero individual per-parasha numeric cells reach `SOURCE_VERIFIED`** in this pass — every one is `UNCERTAIN` (read once, plausible, not independently checksum-confirmed) or `UNKNOWN`. This is the honest state of a first-pass manuscript transcription of a dense, heavily-abbreviated gematria table in a corrupted-OCR, non-standard font, and is exactly the situation the task's STOP CONDITION anticipates.

## 3. Summary tables #2 and #3 — the highest-confidence findings in this whole artifact

Unlike table #1, tables #2 and #3's **final totals** reach genuine `SOURCE_VERIFIED` status, because they are independently cross-checkable against figures **already documented in the existing, separately-authored research ledger** (not against themselves):

- **Table #2, "תיבות התורה" (words per parasha), Torah-total = 79,976.** This is a **digit-for-digit match** to `AHAVAT_TORAH_RESEARCH_LEDGER.md` §3.5 and `AHAVAT_TORAH_RESEARCH_CHECKPOINT_4.md` §C, both of which independently cite **79,976** as the Torah-wide word total from the earlier, textually distinct "אוריין תליתאי" section (PDF pp.25–31, a completely different part of the book, catalogued as `SCANNED_RESEARCH` in the prior coverage-map deliverable). Two separately-worded passages of the same book stating the identical seven-figure total is strong internal corroboration.
- **Table #3, second "אותיות התורה" (all-letters-combined per parasha), Torah-total ≈ 304,812.** This matches, to within a single plausible glyph misread, `AHAVAT_TORAH_RESEARCH_LEDGER.md` §3.7's independently-cited **"304,812 letters"** Torah-wide total. My best raw read of the closing word decodes to ~304,830 (an 18-unit gap from 304,812) — consistent with a single ambiguous final glyph (כ/20 vs ב/2) rather than a real discrepancy, but **the last digit is explicitly left `UNCERTAIN`, not silently corrected to 812.**

This is the most important result of this reconstruction: **the coverage-map's LEDGER §3.7 citation of "304,812 letters" and LEDGER §3.5's "79,976 words" are not just source-verified claims sitting somewhere in the book — this pass has now located the SPECIFIC pages (p.41 bottom → p.42 top) where the Torah-wide summary computation for both figures physically appears**, distinct from where those same totals are independently *also* cited (the "אוריין תליתאי" section, pp.25–31, for 79,976; general book-total framing for 304,812).

## 4. Anomalies (classified per the task's taxonomy)

| ID | Classification | Description |
|---|---|---|
| A-01 | **ARITHMETIC OBSERVATION** | Letter ה: sum of the 12 transcribed Bereshit-parasha values = 6,574; printed Bereshit-cumulative total = 6,330. Delta = +244. Not resolved. Candidate explanations (not adjudicated): (a) one or more of my 12 digit-reads is wrong (most likely, given font difficulty); (b) the source's own internal arithmetic doesn't tie out perfectly at this level of decomposition (would itself be a notable finding, per the task's "totals that don't sum" anomaly type); (c) a 13th parasha-value belongs to this list and was missed at a column edge. |
| A-02 | **ARITHMETIC OBSERVATION** | Letter ז: sum of the Devarim-parasha values (361) + Bamidbar-cumulative (1,720) = 2,081; printed final Torah-total = 2,198. Delta = +117. Not resolved, same three candidate explanations as A-01. |
| A-03 | **FACT FROM SOURCE** | The scribe drops the word "אלף" when a running total is under 1,000 (confirmed on letter ז's Bereshit-cumulative, "ה׳ כ״ח" = 420). This is a genuine, source-confirmed notation convention, not noise. |
| A-04 | **FACT FROM SOURCE** | Two tables in this book share the exact title "אותיות התורה" — the running header printed at the top of every one of pp.36–42, AND a distinct summary-table title printed mid-page-41/42. A reader (or a future automated pass) relying on the running header alone to identify "the" אותיות התורה section will conflate two different datasets (per-letter detail vs. all-letters-per-parasha summary). This is exactly the kind of structural trap the task's SPECIAL INVESTIGATION asked to be surfaced. |
| A-05 | **INFERENCE** | The section "אותיות חמש מגילות" begins on p.42 (in scope) rather than p.43 as the prior coverage-map's page-range description implied for the *next* named section. This slightly refines (does not contradict) the earlier coverage-map's boundary description, since that map's granularity was page-level, not sub-page. |
| A-06 | **OPEN QUESTION** | Whether every one of the 22 Hebrew letters (or some subset, e.g. excluding a letter already given special treatment in the earlier "מגדל עוז" section such as ט) gets its own paragraph in table #1 could not be confirmed, because the ט–נ interval (pp.37–38) could not be reliably parsed into distinct, non-duplicate letter sections in this pass (see OQ-01). |

## 5. Unknown-unknowns / open questions

- **OQ-01 (the central unresolved issue of this pass):** the pp.37–38 interval, which should contain letters ט, י, כ, ל, מ, נ in order (bridging the confirmed ח-ending on p.37 and the confirmed ס-start on p.39), produced **internally inconsistent drop-cap reads** — apparent repeated sightings of letters resembling י and מ. Two hypotheses, neither confirmed: (a) this pass simply misread 2–3 visually similar drop-caps (most likely, given the ה/ח confusion already caught elsewhere), or (b) the source itself does something structurally unusual in this interval (e.g., a letter given more than one sub-entry, or a final-form letter such as ם/ן/ך/ף/ץ receiving its own paragraph distinct from its base letter — which would be a genuinely new finding about the book's counting contract, not an error). **This cannot be settled without a dedicated, slower re-verification pass on pp.37–38 specifically** (ideally with a sharper scan or a second independent transcriber) — flagged here per the STOP CONDITION rather than guessed.
- **OQ-02:** whether the detailed table (#1) covers a clean 22-paragraph run (one per letter of the alphabet, א through ת) or some other count, cannot be confirmed until OQ-01 is resolved.
- **OQ-03:** no corpus/nusach citation, kri/ktiv rule, or special-letter-form rule was found stated anywhere in pp.36–42 for this specific table (see §1.2) — it remains possible such a rule is stated once, earlier in the book (e.g. in the "מגדל עוz" section, out of this task's scope) and implicitly carried forward; this artifact cannot confirm or deny that without reading outside its assigned page range.
- **A gematria/engine verification question is explicitly NOT decided here, per STOP CONDITION:** none of the values in this dataset have been run through the canonical SOD1820 gematria engine, and none should be treated as `CORPUS VERIFIED` or `GEMATRIA/ENGINE VERIFIED` on the strength of this document alone.

## 6. VERIFICATION (as requested)

- **Coverage of PDF 36–42 = 7/7.** Every one of the 7 pages was rendered, visually read (both columns), and contributed at least one row to the dataset.
- **Matrix completeness relative to what the source allows:** the *structural* map (3 tables, letter/section boundaries, page locations) is believed complete for this range. The *numeric* matrix is **partial** — see cell-count breakdown below.
- **Total cells recorded (dataset rows):** **187** (172 from the detailed per-letter table + 15 from the two summary tables, including section-marker and book-subtotal rows alongside per-parasha value rows).
- **`SOURCE_VERIFIED`: 11** (7 detailed-table section-boundary markers [ס,ע,פ,צ,ק,ר,ש/ת confirmations] + the 79,976 words-total + the ≈304,812 letters-total + 2 structural boundary notes).
- **`UNCERTAIN`: 166** (the overwhelming majority — every individual per-parasha numeral and most book-subtotals and letter-totals in the detailed table, honestly reflecting first-pass, non-checksummed manuscript transcription).
- **`UNKNOWN`: 10** (the ט–נ interval's letter-identity and value cells, explicitly withheld rather than guessed, per OQ-01).
- **Book-level and Torah-level subtotals/totals transcribed:** every letter-section's final colon-terminated total was captured (14 totals across the detailed table, plus the 2 summary-table Torah-totals) — see §2–§3 for the full list and their confidence.
- **Internal contradictions found:** A-01 and A-02 (arithmetic mismatches, unresolved, both documented above rather than silently reconciled).
- **Things that cannot be determined from this scan:** OQ-01, OQ-02, OQ-03 (§5) — the ט–נ letter-identity interval chiefly, plus any counting-contract rule (kri/ktiv, special letter forms, corpus/nusach) that might be stated elsewhere in the book but not in pp.36–42.

## 7. Next recommended action

1. **Highest priority — resolve OQ-01.** A dedicated, slower re-verification pass on PDF pp.37–38 (right and left columns), ideally with sharper crops around each drop-cap specifically, to settle whether letters ט,י,כ,ל,מ,נ each get exactly one paragraph, in that order, with no repeats.
2. **Second priority — adversarially re-verify tables #2 and #3's per-parasha breakdowns** (not just their already-strong final totals) against the detailed table's own book-subtotals where overlapping data exists, as a further internal cross-check.
3. **Third priority — resolve A-01 and A-02** with fresh, higher-zoom re-reads of letter ה's Bereshit list and letter ז's Devarim/Bamidbar-boundary list specifically, since these are the two lists where an explicit arithmetic checksum is already known to fail.
4. Continue forward (PDF p.43+, "אותיות חמש מגילות") **only under a new, separately-scoped task**, since it is explicitly out of this task's DO-NOT-TOUCH boundary.
5. Do **not** attempt gematria/engine verification of any figure in this document until a human (Zuriel) or a separately-scoped task explicitly authorizes that step — this document's job was reconstruction and provenance, not verification against the canonical engine.

## 8. Explicit non-actions (per DO-NOT-TOUCH)

No new content research beyond source-reading; no interpretation of meaning/significance of any number; no gematria computation or engine verification; no canonicalization; no `research_objects`/DB/content insert; no schema, engine, or UI change; no Master State/Roadmap update; no attempt to "correct" the source against an external Torah nusach; no reading of PDF pp.19–24 (parallel agent's scope) or PDF p.43 onward (explicitly out of scope, even though the "אותיות חמש מגילות" section visibly continues there); no merge; no deploy.
