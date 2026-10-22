# אהבת תורה — Lossless Reconstruction Batch, PDF pp.36–45 (P36_45 parallel source batch)

> **Role:** CLAUDE, P36_45_SOURCE_OWNER — a disjoint parallel source-batch writer, per coordination memo `work_log ac493139-86d8-46eb-bee4-fa7eedf61da5` (`AHAVAT_TORAH_P16_57_PARALLELIZATION_20260905`) and queued task `work_log 48c59fcf-386b-46e1-9d89-70a74d58c3b7` (`AHAVAT_TORAH_P36_45_PARALLEL_SOURCE_BATCH`). ACK recorded at `work_log d893618e-528d-4f99-9af5-fc5d5fa8c512`.
> **Scope:** PDF pages 36–45 of `book:hebrewbooks:5635` ONLY. p.35 and p.46 read for boundary context only, not registered. **Not touching**: `DOSSIER_INDEX.md`, `CROSSWALK.md`, any UI/schema/engine/graph/merge/deploy, any file outside this batch's two new output files.
> **Witness continuity confirmed:** downloaded `gallery/Book/Hebrewbooks_org_5635.pdf` this session; `sha256=895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`, 2,078,469 bytes, 99 pages — **byte-identical** to the fingerprint already recorded in `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P91_99.json`. Same witness object, not a re-scan.
> **Method:** `pymupdf` render at 300dpi (full-page, both columns) for structure/reading, with targeted 500–600dpi crops at 2×–4× further digital zoom for disputed glyphs and grand-total lines (same discipline as `AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md`'s 20×–60× re-verification method, at a smaller multiplier given this batch's scope and time budget). Every numeral below is reported as **RAW READING → candidate NORMALIZED VALUE → STATUS**, and no candidate is force-selected by arithmetic — an anomalous or contradictory reading is reported as such, per this corpus's own established truth discipline.

---

## 0. What was read before starting (compliance with the "no redundant redo" instruction)

Before opening the PDF, this batch read:
- `AHAVAT_TORAH_SOURCE_MANIFEST_285.md` (source identity, storage path, prior-branch map, known-coverage table).
- `AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md` in full (Session 8's own dedicated high-zoom pass, which already closed or narrowed: DS-02 Aleph/Bet subtotals on p.35; the Zayin A-02 checksum on p.36; the Kaf→Lamed→Mem→Nun boundary on pp.37–38, RESOLVED; DS-09/DS-10's structural correction to "multi-row matrix" on pp.42–43; DS-08's negative result at p.90; DS-13 substantially extracted at p.70).
- `work_log_current` for all `AHAVAT_TORAH_*` entries, to establish the live coordination state (existing SOURCE_OWNER continuing pp.26–35; a separate P46_57 writer; GPT's own audit cadence).

**Consequence:** every cell already closed by the Mechanical Closure Pass (Aleph/Bet p.35, Zayin p.36, Kaf/Lamed/Mem/Nun pp.37–38) is **cited by source_ref in this batch's register, not re-derived**. This batch's own visual effort was spent on the genuinely unexamined remainder of its scope: pp.39–41's letter-table tail, and the previously-unlocated material on pp.41–45.

---

## 1. DS-02 (letter table) — tail closed, alphabet now complete end-to-end

The Mechanical Closure Pass had directly re-verified Aleph/Bet (p.35), Zayin (p.36), and the Kaf→Lamed→Mem→Nun boundary (pp.37–38). This batch's own pass locates, for the first time in this dossier, the remaining letters at the **page level**:

| Letter | Page | Status this batch |
|---|---|---|
| ג Gimel, ו Vav | not located | **structural gap, honestly reported** — alphabetically required between confirmed anchors, not independently isolated at this pass's resolution |
| ח Chet, ט Tet, י Yod | not located | same — required between Zayin (p.36) and Kaf (p.37) |
| ס Samech | **p.39** (right column) | NEW — first page-level location in this dossier |
| ע Ayin | not located | required between Samech and Pe; not isolated |
| פ Pe | **p.39** (left column) | NEW |
| צ Tzadi | not located | required between Pe (p.39) and Kuf (p.40); not isolated |
| ק Kuf | **p.40** (right column) | NEW |
| ר Resh | **p.40** (left column) | NEW |
| ש Shin | **p.41** (right column) | NEW |
| ת Tav | **p.41** (left column) | NEW — **the table's final letter**; DS-02 is now known to run p.35 → p.41 in full |

This batch's own digit-level transcription of the six newly-located letters (Samech/Pe/Kuf/Resh/Shin/Tav) is **SOURCE_LOCATED only** — structure and drop-caps are VISUALLY_VERIFIED at 500dpi, but per-parasha numerals were **not** individually re-verified at the 20×–60× zoom the Mechanical Closure Pass used for Aleph/Bet/Zayin. That deeper pass is a legitimate, explicitly flagged follow-up, not attempted here given this batch's scope and time budget. The seven un-located letters (Gimel/Vav/Chet/Tet/Yod/Ayin/Tzadi) are reported as an honest gap, not silently skipped — most likely short entries embedded within the column-flow of confirmed neighboring paragraphs.

---

## 2. NEW FINDING — two previously-unlocated summary tables (candidate DS-03 / DS-04), p.41–42

Immediately after Tav's closing total on p.41 (no section title of its own — DS-02 simply ends), a horizontal divider is followed by **two tables that no artifact in this dossier had previously page-pinned**:

### 2.1 "תיבות התורה" (Words of the Torah) — candidate DS-03

Opens p.41 right column, spills into left column top. A per-parasha, then per-book cumulative, word-count table for the whole Chumash.

- **Bereshit book-subtotal:** RAW READING `ס"ה ב' אלף תרי"ב` → **2,612** (SOURCE_LOCATED, low ambiguity, isolated by a clean `ס"ה` marker).
- **Shemot / Vayikra / Bamidbar cumulative subtotals:** RAW READING captured (transcribed verbatim in the JSON register), but this batch's own attempt to normalize them produced an **internally implausible growth curve** (an oversized jump attributed to Shemot alone). Rather than force a reading to make the curve look sane — which this corpus's own truth discipline explicitly forbids — these are left **UNRESOLVED**, flagged for a dedicated high-zoom pass.
- **Torah-wide final total:** RAW READING `ס"ה ע"ם אלף תתקע"ו`. The disputed glyph (ע"ם vs. a hoped-for ע"ט) was independently re-zoomed at 4×/600dpi and is **unambiguous**: a closed-box final-Mem, not a Tet. **VISUALLY_VERIFIED value: 110,976.**

  **This contradicts** the "79,976-word population frame" already cited in passing elsewhere in this dossier (per `AHAVAT_TORAH_SOURCE_MANIFEST_285.md` §D, attributed to GPT Checkpoint 8) and the standard traditional Masoretic word-count (~79,847). This is reported as a **new, fourth instance** of the cross-dataset "isolated impossible/anomalous large value" pattern the Mechanical Closure Pass already identified in DS-02's Aleph-Vayikra (47,585) and Bet-Bereshit (200,332) subtotals, and in DS-09/10's Esther word-count (50,045). **Not force-corrected. Flagged as `GRF-P36_45-01` for GPT's cross-corpus reconciliation.**

### 2.2 "אותיות התורה" (Letters of the Torah, per-book summary) — candidate DS-04

Opens p.41 left column (immediately below the Words table's own final total), continues onto p.42, and closes with a Torah-wide grand total that this batch independently re-zoomed at 2×/600dpi specifically **because** the Mechanical Closure Pass had already cited "~304,812" for what it called DS-04 — as a comparison figure only, without itself giving this line an exact source_ref.

- **RAW READING:** `ס"ה ש"ד אלף תתי"כ` — the final letter is ambiguous between כ (kaf) and ב (bet) at this resolution.
- **Candidate values:** **304,830** (if כ — this batch's own independent glyph lean) or **304,812** (if ב — matches the Mechanical Closure Pass's own prior citation exactly, and sits close to the standard ~304,805 traditional Torah letter-count).
- **Status:** ARITHMETIC-DISAMBIGUATED CANDIDATE offered, **not forced** — per the same discipline the Closure Pass applied to its own ד/ר confusions. Unlike the Words table's 110,976 finding, this total is internally **sane** and broadly consistent with tradition either way — worth noting as a contrast between the two tables' reliability.
- **Value to the dossier:** this is the **first time** this exact grand-total line has been given a precise `#p42:block` source_ref, rather than being cited from memory/elsewhere.

---

## 3. DS-09 / DS-10 — corroborated, not re-derived; one new structural observation

The Five Megillot letters table ("אותיות חמש מגילות") opens immediately after DS-04's table closes on p.42, and its rows continue onto p.43. This batch's own pass **directly confirms** the Mechanical Closure Pass's own structural correction (a multi-row matrix, not one row per megillah) by visually tracking the sequential drop-cap row markers (ל, מ, נ, ס, ע, פ, צ, ק, ר, ש, ת and others) continuing across the page boundary — **SUPPORTS**, no re-derivation of any cell value.

**One new observation, not previously recorded:** the parallel "תיבות" (Words) sub-table for the Five Megillot (candidate DS-10), which follows on p.43, is structurally **shorter and different in form** from the Letters sub-table above it — a single aggregate-style paragraph rather than a full row-matrix. This is flagged (not resolved) for whoever next works DS-09/DS-10's still-open row-unit-meaning question.

---

## 4. NEW FINDING — an unrelated molad/calendrical aside, p.43

Below the Five Megillot material, p.43 carries a short, self-contained paragraph on an entirely different topic: a calendrical/molad-style time-division discussion (dividing a fixed span into monthly/weekly portions using "chalakim"-style time units). This is **not** a letter/word count and has **no continuity** with the surrounding material. It is preserved as its own uncategorized block (not force-filed into DS-09/DS-10) and flagged as `GRF-P36_45-02` for GPT's reconciliation to judge whether it connects to a known theme elsewhere in the corpus.

---

## 5. NEW FINDING — the Part 1 / Part 2 structural boundary

p.43 closes with a printer's floral ornament (the same kind of device already known elsewhere in this dossier to mark a section's end). p.44 is a title page reading only **"חלק ב'"** ("Part Two"), essentially otherwise blank. p.45 is a blank leaf (its conjugate verso) — confirmed by direct visual inspection at native resolution, not merely inferred from its markedly smaller rendered file size (~21–23KB vs. ~110–220KB for the batch's text-bearing pages, which is independently consistent with the finding).

**This precisely locates, for the first time in this dossier, the boundary between Part 1 of the sefer's back matter** (the numerical-appendix material — DS-02's letter table, the candidate DS-03/DS-04 summary tables, and DS-09/DS-10's Five Megillot tables, spanning at least pp.35–43) **and Part 2** (beginning structurally at p.44/46 — p.46 itself belongs to the disjoint P46_57 writer and is not opened here beyond the single boundary-context read already logged in the register's `structural_placement`).

---

## 6. Negative/structural finding — dual pagination

This section of the book carries **two independent page-numbering systems** alternating by page in the running header: pages at odd PDF-absolute positions (35, 37, 39, 41) show an **Arabic** numeral (directly observed: 30, 32, 34, 36), while pages at even positions (36, 38, 42) show a **Hebrew-letter** folio number instead (directly observed: טו=15, יז=17, יט=19), each incrementing by 2 between same-type occurrences. p.43 (an even PDF index) was directly observed carrying an **Arabic** "38" — which **breaks** the strict odd/even alternation seen on pp.35–42. This is reported as an **open structural question, not adjudicated** — the sample (7 directly-read headers) is too small to force a rule, and it is preserved for a future pass rather than papered over. Not independently re-confirmed this pass for p.40's or p.44/45's headers (p.44/45 carry no page number at all, being a title page and a blank leaf).

---

## 7. Files changed, branch, commit

- **New files, this batch (both new, disjoint, per output-file scope):**
  - `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P36_45.json`
  - `docs/research-notes/AHAVAT_TORAH_LOSSLESS_RECONSTRUCTION_BATCH_P36_45.md` (this file)
- **Not touched:** `DOSSIER_INDEX.md`, `CROSSWALK.md`, `AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md`, any other prior artifact, any UI/schema/engine/graph/DB write, any Master State/Roadmap file.
- **Branch:** `claude/ahavat-torah-pages-36-45-0gf5wk`.

## 8. Explicit status

**implemented on branch:** YES — docs-only.
**merged?** NO. **deployed?** NO. **canonical?** NO.
**exact resume pointer:** PDF p.46 — out of this batch's scope; belongs to the separate, disjoint P46_57 writer per `work_log ac493139-86d8-46eb-bee4-fa7eedf61da5`. This batch does **not** continue into p.46.
**deferred, not done here:** one additive row each to `DOSSIER_INDEX.md`/`CROSSWALK.md` for this batch (shared, serial-integrator-only files per the coordination memo); high-zoom (20×–60×) digit-perfect re-verification of the newly-located DS-02 cells (Samech/Pe/Kuf/Resh/Shin/Tav) and the DS-03/DS-04 intermediate cumulative subtotals; resolution of the DS-03 110,976-vs-79,976 contradiction; resolution of the DS-04 304,812-vs-304,830 digit ambiguity; independent verification of the molad aside's specific figures; the 7 un-located DS-02 letters (Gimel/Vav/Chet/Tet/Yod/Ayin/Tzadi).

**STOP at p.45, per scope. handoff_to = GPT/ZURIEL for finite audit.**

Foundation → Projection → Experience. Preserve capability, truth and provenance — not necessarily the legacy interface.
