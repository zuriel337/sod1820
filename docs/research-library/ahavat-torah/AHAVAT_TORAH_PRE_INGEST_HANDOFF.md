# אהבת תורה — Pre-Ingest Handoff (Session 9 corpus → GPT/Supabase Research Lab)

> **STATUS: STOP. No scanning continued. No line of the existing corpus altered.** This file is a pure report *about* the corpus — it does not summarize instead of the data, does not touch `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` or any other file, and proposes no new table/store/schema. Every gap below is reported for GPT/Zuriel to decide, not resolved here.
> **Source identity (unchanged):** `book:hebrewbooks:5635`. **Branch:** `claude/ahavat-torah-letter-dataset-closure`. **Commit at time of this handoff:** `c8908b02` (nothing has been committed since; this handoff itself, once saved, will be a new additive commit, not a change to the corpus it describes).

---

## 0. What "1,900 lines" refers to, precisely

The 11 files this session's branch has produced (Sessions 4–9, this branch only — **excludes** the 3 earlier Claude branches and all 5 GPT branches, which are separate, un-merged ledgers, see §9):

| File | Lines | SHA-256 |
|---|---|---|
| `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` | 275 | `750abf51a139e3742deb3d60f68c93627d013dfed4b997026248e82e8b8ee657` |
| `docs/research-library/ahavat-torah/DOSSIER_INDEX.md` | 65 | `65bfe6661063667010927760bf46a8537a4d8169715b73d9d1533b4c5497908a` |
| `docs/research-library/ahavat-torah/CROSSWALK.md` | 145 | `a8d922d8726b72fb110edf4734f48b65e8139b45b5b32d3bebe23fdb6666cc60` |
| `docs/research-library/ahavat-torah/AHAVAT_TORAH_FULL_SOURCE_MAP.md` | 239 | `1d753ea9614e76745a5efa99623afd80fce41760d622833ef43176cd84ded038` |
| `docs/research-notes/AHAVAT_TORAH_P35_LETTER_CLOSURE.md` | 109 | `e88126191d7599f0d6259be53d5311018fa2faa449c0ae969bd84d60c9b10964` |
| `docs/research-notes/AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.md` | 112 | `ca69454a242d47cbb9c26178ce1e07cd652711172e7e53bf44ec40f0ae6eeee5` |
| `docs/research-notes/AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.json` | 123 | `c86647837cdb8c6976b218b7996e29bca05dd66f040bcdf29cf5adfb3fbaf5da` |
| `docs/research-notes/AHAVAT_TORAH_DS06_COUNTING_CONTRACT_CLOSURE.md` | 131 | `921099962ddfcbf615b87775b03f9ed45f94b418219df78c28988d88307a2153` |
| `docs/research-notes/AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md` | 189 | `a52001981e0724aed0bcf160ccc0a76913b9ecdd8b63b03e7d316235d3d85ee8` |
| `docs/research-notes/AHAVAT_TORAH_LOSSLESS_RECONSTRUCTION_BATCH_01.md` | 101 | `b9e154cbf24ba73d896cbbaca69ae6b5f1cd2e1b53c82db35e452620ca8ee2fa` |
| `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` | **488** | `7ecb43719f99de79c24abf3ff74ffeff068cd0d1f2cfa6374ef4b8b06a43b5a3` |

**Total: 1,977 lines** (rounds to the "1,900" referenced). **The single primary structured artifact is `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` (488 lines, git blob `39e225e9959260b8ec1c547a5314944b1a2d7891`)** — the other 10 files are narrative closure-pass reports and dossier meta-files that cite pages in prose, not in the same structured schema. **This distinction matters for §2 and §8 below.**

---

## 1. COVERAGE

**Register-level (block-granular, this session's new format):** PDF pp.1–15 out of 99. That is it — 15 pages have block-level `content_blocks[]`/`tables[]`/`citations[]` entries.

**Depth within pp.1–15:**
- pp.1–3: **full, clean transcription** (short bibliographic/front-matter pages, no ambiguity).
- pp.4–5: **full transcription**, 2 unresolved readings flagged (dense bibliography not cross-checked; an internal date tension 1983-vs-~2003).
- pp.6–15: **`SUBSTANTIAL_PARAPHRASE_WITH_VERBATIM_NUMBERS_AND_CITATIONS`** — every number, verse citation, and section heading is verbatim; the surrounding discursive Kabbalistic/halachic argument is paraphrased faithfully, **not** word-for-word original Hebrew of every sentence. This is stated explicitly per-page in the register's `transcription_depth` field — it is not hidden or implied.

**Deep-verified islands OUTSIDE pp.1–15, on other branches/files (not part of the 1,977-line corpus, cross-referenced only):** the detailed letter table pp.35–41(+p.35 closure), DS-06 (p.70), DS-13 (p.69–70 tail), DS-09/10 (pp.42–43), and a negative result for DS-08 (checked, not at p.90). These live in files already indexed in `DOSSIER_INDEX.md` rows 1–16; they are **not duplicated into the register**.

**Structurally-mapped-only (whole-book, from Session 3, a *different* branch, page-existence + one-line classification, NOT this corpus):** 99/99, explicitly **not** treated as coverage by this report (per the task's own repeated instruction that 99/99 structural ≠ completion).

**Not scanned at all, at any depth, by anyone in this corpus:** pp.16–24 (pp.19–24 are GPT's declared territory; pp.16–18 simply not yet reached), pp.26–34 and pp.36–41 only partially (letter-table specific rows only, not full prose), pp.44–69, pp.71–89, pp.91–99 (except the already-catalogued page-existence/one-line entries from the other branch).

**Exact stop point:** PDF **p.15**, block `nesachim_wine_libation` (wine-libation/log-measure Temple-service arithmetic). The block's own note states verbatim: *"this block's content continues past the captured page extent (into p.16, not yet read this batch)."* **Resume by rendering PDF p.16 (both columns) and continuing the same batch-of-5 pattern (pp.16–20).**

---

## 2. STRUCTURE

**Record types, exactly as they exist today (not idealized):**

1. **Page-register entries** — one JSON object per PDF page in `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json`. Each carries: `pdf_page`, `printed_page`, `section`, `parasha`, `opening_anchor`, `closing_anchor`, `transcription_depth` (free text, not enumerated), and five sub-arrays: `content_blocks[]`, `tables[]`, `editorial_notes[]`, `citations[]`, `main_passage_addendum_links[]`, plus `dataset_refs[]`, `unresolved_readings[]`, and (only on some pages) `gpt_research_flags[]`. Each page also carries three status strings — `transcription_status`, `visual_verification_status`, `research_extraction_status` — and a free-text `confidence` field.
2. **Content blocks** (inside each page) — the atomic unit. Each has a `block_id`, a `source_ref` (`book:hebrewbooks:5635#p<N>:<block_id>`), and either `text_he`/`text_he_partial`/`text_he_exact` (verbatim Hebrew) or `text_note` (paraphrase/summary), never both pretending to be the other.
3. **Narrative closure-pass reports** (the other 10 files) — free-form markdown, each documenting one investigation (a letter, a dataset, a mechanical pass, the architecture decision, the source map). These cite pages **in prose** ("PDF p.36, right column…") with a "Provenance" section per file, not via the `#pN:block` convention.
4. **Dossier meta-files** — `DOSSIER_INDEX.md` (one row per artifact, i.e. per closure-pass report or register batch) and `CROSSWALK.md` (one row per finding-cluster, cross-referencing this corpus against the GPT ledger and the 3 other Claude branches).

**A real structural inconsistency, reported honestly, not smoothed over:** **the `#pN:block` identity convention exists only in the register (pp.1–15) and was invented this session.** The 10 narrative files (and everything on the 3 other Claude branches / 5 GPT branches) cite pages in prose only — **no block-level ref exists for any of them.** Two different citation granularities coexist in this corpus today.

**Can every finding be traced back to a page/section?**
- **Yes, exactly, for every register block (pp.1–15):** `source_ref` is present and mechanical on all 70 content blocks and 8 tables.
- **Yes, at page granularity only, for the 10 narrative files:** every finding names a PDF page in prose; none has a machine-checkable block ref.
- **No formal "method_id" or "finding_id" field exists anywhere** linking a specific claim to a specific entry in the Method Inventory (`AHAVAT_TORAH_FULL_SOURCE_MAP.md` §C) — the link is prose-only ("this matches CR-01," "see DS-06"), not a structured foreign key.

---

## 3. TRUTH TAXONOMY — how the corpus actually separates truth-classes (not how it should)

**No claim anywhere in this corpus is tagged FACT or CANONICAL.** Confirmed by direct inspection; this is upheld everywhere.

The corpus does **not** use your exact 10-item vocabulary (SOURCE CLAIM / AUTHOR COUNT / TEXT COUNT / CALCULATION / DISCOVERY / FINDING / EVIDENCE / INTERPRETATION / GPT-CLAUDE INFERENCE / OPEN-UNVERIFIED) as one controlled field. What actually exists, reported precisely:

| Your term | What the corpus actually has | Where |
|---|---|---|
| SOURCE CLAIM | Used as explicit prose language ("SOURCE CLAIM," capitalized) in the DS-06 closure files; elsewhere implicit (a `text_he`/`text_he_exact` block *is* a source claim by construction — it is a verbatim quote) | DS-06 files, register `text_he_exact` fields |
| AUTHOR COUNT | Used explicitly in the (separate-branch) `AHAVAT_TORAH_DATASETS.json`/`CALCULATIONS.json`; not used as a field in this session's own 11 files, though the concept is described in prose ("AUTHOR_COUNT, per LEDGER §3.6") in `AHAVAT_TORAH_FULL_SOURCE_MAP.md` | Full Source Map §D |
| TEXT COUNT / CALCULATION | `AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md` explicitly separates "SOURCE CLAIM ≠ TRANSCRIPTION ≠ TEXT COUNT ≠ CALCULATION ≠ ARITHMETIC VERIFIED" in its own preamble and uses these terms in practice for each closure | Mechanical Closure Pass §0 |
| DISCOVERY / FINDING | **No formal field.** Used only as prose emphasis ("MAJOR FINDING," "GPT_RESEARCH_FLAG") — not a controlled status value | register `gpt_research_flags[]`, prose only |
| EVIDENCE | **No formal field.** The rendered PNG crops (not committed to git, session-local scratch files) serve as evidence informally; never referenced by a stable identifier from within a record | n/a |
| INTERPRETATION | **Deliberately absent by design.** Zero interpretation-tagged claims exist in this corpus; every instance where interpretation would be needed is explicitly punted ("no interpretation offered," "flagged for GPT") | throughout, esp. `gpt_research_flags[]` |
| GPT-CLAUDE INFERENCE | **Not a term used.** The nearest equivalent is `ARITHMETIC-DISAMBIGUATED` (invented in Session 6/DS-06 for cases where two visually-similar glyph readings were distinguished by which one closes an arithmetic identity exactly) — this is narrower than "inference" and explicitly documented as *not* forcing a reading | DS-06 Counting-Contract Closure |
| OPEN-UNVERIFIED | Closest existing tags: `UNCERTAIN`, `UNKNOWN`, `SOURCE_LOCATED` (read once, not independently re-verified), and the register's `unresolved_readings[]` array (9 entries across pp.1–15) | register + all closure files |

**Nothing has been upgraded to FACT/CANONICAL to produce this report** — the table above is a description of what already existed before this handoff was written.

---

## 4. VERIFICATION STATE — exact counts, pp.1–15 register only

| State | Count | Basis |
|---|---|---|
| Source-grounded (has a `source_ref`, quotes or closely paraphrases the source) | 70/70 content blocks | every block |
| Mechanically verified (arithmetic closes exactly, cross-checked) | 1 dataset closure fully (DS-01's 5 book-subtotals, p.6, sum to exactly 1,820) | p.6 |
| OCR/reading uncertain (digit-level, explicitly flagged) | 9 `unresolved_readings[]` entries + numerous inline "not individually digit-verified this pass" notes on dense tables (p.7, p.9, p.10, p.11, p.12 ×2, p.13, p.15 ×2) | pp.1–15 |
| Contradictory/delta (two readings/citations disagree, both preserved) | 2 new this batch (Rachel/Leah 107/147 vs. 107/116; Tet-exclusion 47 vs. 16) + several older ones carried in `CROSSWALK.md` (A-01/A-02, Levite 249/239, DS-02 impossible subtotals, DS-06 book-vs-row) | see §6 |
| Gematria claims not engine-verified | **All of them.** Zero values in this entire corpus have been checked against `fn_ragil`/the canonical gematria engine — every number is a transcription of the *printed* book's own gematria, never independently recomputed by an engine | entire corpus |
| Unresolved (open, no verdict either way) | ~15 distinct open items across the whole corpus (enumerated in §6) | CROSSWALK.md + closure files |

---

## 5. METHODS / RESEARCH DNA — observed vs. recurring, not canonicalized

**Observed once (no second instance found yet):** Serah-bat-Asher two-occurrences-of-a-name observation (p.15); Sanhedrin 37-generation transmission-chain count (other branch, p.78); Menashe/Aram cross-book census comparison (p.8); the per-form Elokim-name tally (p.8/p.10).

**Recurring candidate (2 independent sightings, not yet "strong"):** bounded-span word counting (Levite p.18 [other branch] + Haggadah p.12 + Aleinu p.12); Erechin valuation-shekel arithmetic (front-matter p.13 + formal Behar p.74, = CR-05, unresolved relation); Omer 1..49 construction (front-matter p.13 + formal Emor/Behar p.73, = CR-04, unresolved relation).

**Strong recurring pattern (3+ independent sightings, well-attested across this and prior sessions):**
- **"Independent constructions reaching 1,820"** — now **at least 8** distinct instances found across pp.6–15 alone (see §7). This is the single most-repeated pattern in the entire corpus.
- **Name/word-occurrence counting as a method family** — DS-02 (letter-occurrence, pp.35–41), DS-03/DS-04 (word/letter Torah-totals), DS-06 (Moshe-name, p.70), DS-13 (Asah-root, p.69–70), the p.9 Yaakov/Rachel/Leah speech-word table, and the p.13–14 named-speaker word-count table are all the *same underlying method* (count occurrences of X, broken down by parasha or by speaker) applied to different populations X.

**None of these is treated as a canonical Research Method / Research DNA contract in this corpus.** They are reported as patterns for GPT's classification work, per the explicit division of labor.

---

## 6. CONTRADICTIONS — full inventory, nothing "fixed" to match

| ID | Competing values | Where | Status |
|---|---|---|---|
| Rachel/Leah word-count | 107/147 (this session, direct read, p.9) **vs.** 107/116 (previously-cited LEDGER §3.4 citation) | p.9 register entry | **UNRESOLVED, both preserved** |
| Letter-Tet 2nd-Decalogue exclusion | 47 (this session's re-read, p.10) **vs.** 16 (Session 3's summary, E-04) | p.10 register entry | **UNRESOLVED** (moot either way — the underlying claim is already WITHDRAWN by the source itself, LEDGER §7) |
| Letter Heh (A-01) | recomputed Σ 6,574 (orig.) → 6,374 (after a found transcription-decode fix) **vs.** printed 6,330 | Letter-Reconstruction (other branch) + P35 Closure | Substantially resolved, **+44 residual left open** |
| Letter Zayin (A-02) | recomputed Σ variants (1,720 / 2,465 / two more ד/ר-pattern corrections this session) **vs.** printed final 2,198 | Mechanical Closure Pass §3 | **UNRESOLVED** |
| Levite bounded span | 212+37=249 (arithmetic) **vs.** printed total 239 | Full-Book-Inventory (other branch) | **UNRESOLVED, Δ-10** |
| DS-02 Aleph-Vayikra / Bet-Bereshit | 47,585 / 200,332 as printed, re-confirmed at up to 60× zoom **vs.** logically impossible (exceed the letter's own final total / the whole-Torah 22-letter total) | Mechanical Closure Pass §1 | **UNRESOLVED**, isolated to these cells (Kaf/Lamed/Mem/Nun show no such anomaly) |
| DS-06 aggregation | book-subtotals sum exactly to 647 **vs.** parasha-row sums do not match their own book subtotals (all 4 books) | DS-06 Counting-Contract Closure | **UNRESOLVED at row level**, book-level closes exactly |
| DS-13 "ר'"(200) cells | two cells read as 200 **vs.** arithmetically impossible if literal (source's own prose suggests they are citation markers, not numerals) | Mechanical Closure Pass §5 | **UNRESOLVED, not force-read either way** |
| GPT Checkpoint 7/8 | named in `DOSSIER_INDEX.md` rows 13–14 **vs.** never independently read by Claude | Dossier Index | **Open verification gap**, not a content contradiction |
| Book's own internal date | preface signature dated 1983 (תשמ"ג) **vs.** dedication implying ~2003 composition (3rd yahrzeit of a person who died in 2000/תש"ס) | p.5 register entry | **UNRESOLVED, new this session** |

Previously-open items **now closed** (listed for completeness, not re-opened): D-01 (p.3 mislabel), D-02 (addenda boundary), D-03 (letter-table start page), the ל/מ/נ drop-cap boundary, the GPT `v5`/`v5b` branch-pointer question (resolved per Zuriel's explicit instruction, not Claude's own adjudication).

---

## 7. 1,820 CROSS-REPRESENTATION INVENTORY

**True 1,820 instances** (do not conflate with the *adjacent* 1,830-family below — different number, easy to confuse):

| # | Construction | Representation type | Truth class | Page |
|---|---|---|---|---|
| 1 | Tetragrammaton occurrences, whole Torah | count (Name-token occurrence) | SOURCE CLAIM + book-subtotals ARITHMETIC_VERIFIED (165+398+311+396+550=1,820 exact) | p.6 |
| 2 | Yaakov+Rachel+Leah spoken words | word-count (attributed speech) | SOURCE CLAIM (combined total ~1,820–1,825, digit not fully closed) | p.9 |
| 3 | Haggadah span, Ha Lachma Anya→Ga'al Yisrael | bounded-span word-count (liturgical text, not Torah) | SOURCE CLAIM | p.12 |
| 4 | Aleinu prayer word-count | word-count (liturgical text) | SOURCE CLAIM | p.12 |
| 5 | Sefirot names (Keter…Rachamim) | gematria (name-set value) | CALCULATION | p.12 |
| 6 | Erechin valuation-shekel total | calculation (halachic sum) | CALCULATION | p.13 (+p.74, other branch) |
| 7 | Tekiot (Shofar-blast count, incl. blasts) | count (ritual-act) | SOURCE CLAIM/CALCULATION mix, not fully parsed | p.13 |
| 8 | Issaron (festival-calendar flour-measure totals) | calendar/corpus (Temple-service measure sum) | CALCULATION | p.15 |
| 9 (withdrawn) | Letter-Tet occurrences | count (letter-occurrence) | SOURCE CLAIM, **explicitly WITHDRAWN by the source itself** (LEDGER §7) — kept for provenance, not a live instance | p.10 |

**Adjacent, distinct 1,830-family instances (not the same number — flagged separately so they are never merged with the above):** samekh/Adonai letter-count (p.8, other branch); the 30-two-letter-words→60-letters→triangular-sum-1,830 construction (p.12, other branch, CALC-04/05).

**Not yet checked this session for a 1,820/1,830 construction:** pp.16–99 (98% of the book, in this dimension, remains unexamined).

---

## 8. INGESTION READINESS

### 8.1 Can the corpus enter the existing Research OS without loss?

Checked against `research_objects`'s live, unchanged 20-column schema (`id, created_at, kind, statement, terms[], value, relates[], source, source_ref, contributor, confidence, engine_verified, engine_detail(jsonb), evidence, status, promoted_node_id, parent_id, meta(jsonb), owner_person_id, privacy_scope`), re-verified live this session (Batch-1 report) and not touched since:

| Dimension | Fits today? | Detail |
|---|---|---|
| Identity | **Yes, for pp.1–15's blocks.** `source_ref` can hold `book:hebrewbooks:5635#p<N>:<block_id>` verbatim (it's unconstrained text). **Gap:** the other 10 files/3 branches have no block ref, only page-level prose — a page-level `source_ref` (`book:hebrewbooks:5635#p<N>`) would work for them, but the two granularities would coexist inside the same table, and nothing today normalizes that. |
| Provenance | Yes. `contributor`/`meta.ext.*` already supports actor/session/branch/date; git history is the deeper record. |
| Source location | Yes for the register; page-only (coarser) for the 10 narrative files. |
| Truth state | **Partial fit — needs a mapping decision, not a schema change.** `confidence` (integer) + `engine_verified` (bool) can encode *some* of §3's taxonomy, but §3 shows the corpus's own vocabulary (SOURCE_LOCATED/UNCERTAIN/VISUALLY_VERIFIED/ARITHMETIC-DISAMBIGUATED/WITHDRAWN…) does not collapse cleanly onto one integer + one boolean without a documented, deliberate mapping table. **Reporting this as a gap, not filling it here.** |
| Method | **Gap.** No field on any record names *which* Method-Inventory entry (§5) it instantiates. `meta.ext.source_dossier.method_id` could hold this, but the key/convention doesn't exist yet. |
| Calculation regime | **Gap, format-inconsistency.** The SOURCE PAGE→RAW READING→NORMALIZED VALUE→COUNTING RULE→ARITHMETIC CHECK→STATUS→REMAINING UNCERTAINTY format (Session 8) is not used in the register (Session 9); the register uses a simpler `text_note`. Both are representable in `meta` jsonb, but as two different shapes today. |
| Contradictions | **Gap, no single ledger.** §6 above is the first time all contradictions in this corpus have been assembled into one table — until now they were scattered across `CROSSWALK.md` rows and individual closure files by *artifact*, not indexed by *contradiction*. `edges.relation_type='drift_candidate'`/`'contradicts'` could hold this once promoted, but nothing does yet. |
| Relations | **Gap, same shape as contradictions.** CR-04/CR-05/dataset_refs exist as prose cross-references; the two newly-suspected relations this session (DS-05 ↔ p.9's table; DS-05 ↔ p.13–14's table) are flagged in prose only, not as any kind of linked record. |
| Resume position | **Yes, exact.** §1 above gives page/block/branch/commit precisely. |

### 8.2 Research Lab visibility vs. canonical status (per your mid-turn note)

**Confirmed: nothing in this corpus is canonical, and nothing here should be read as claiming Research-Lab visibility equals canonical status.** Per the already-frozen Intake contract's own chain (`SOURCE → EXTRACTION → RESEARCH OBJECT/CANDIDATE → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → CANONICAL → PUBLISHED`), every record in this corpus sits at **EXTRACTION** or, at most, **RESEARCH OBJECT/CANDIDATE** — several steps before canonical. A future Research Lab *view* reading directly from `research_objects` at `status='candidate'` (or whatever value is chosen) would already respect this without any redesign — visibility into the lab is not the same gate as promotion to the One Tree, and this corpus does not conflate them anywhere.

**Promotion eligibility as a separate axis — gap, reported, not filled:** the existing schema has `status` (current state) and `promoted_node_id` (has-it-been-promoted), plus `confidence`/`engine_verified` (truth axis) and `privacy_scope` (access axis). **There is no field distinct from all four of those that means "this record is *eligible* to be promoted"** (e.g., "well-formed enough to be considered" vs. "already considered and promoted" vs. "how true it is" vs. "who can see it"). This is exactly the axis your note asks to keep separate. It does not require a new table — `meta.ext.source_dossier.promotion_eligible` (boolean/enum) is the natural, already-existing extension point — but that key does not exist today and nothing in this corpus currently sets it. **Reported as a naming/convention decision needed before ingestion, not as a MUST FOUNDATION NOW schema gap.**

### 8.3 Verdict

**STOP + report gap**, per your instruction — not "proceed" and not "build a new store." Specifically:
- **No new table/schema is needed** (reconfirms the Batch-1 Foundation Expansion Gate: FOUNDATION SUFFICIENT).
- **Five convention decisions are needed before a lossless bulk ingestion**, all resolvable inside `meta` jsonb: (1) reconcile the two citation granularities (page-only vs. page+block), (2) a documented mapping from this corpus's confidence/truth vocabulary onto `confidence`/`engine_verified`, (3) a `method_id` key convention, (4) a single cross-corpus contradiction ledger (or a documented rule for deriving one from `CROSSWALK.md` + register `unresolved_readings[]`), (5) a `promotion_eligible` key convention distinct from `status`/`confidence`/`privacy_scope`. None of these are proposed as new schema here — they are named as open decisions for GPT/Zuriel.

---

## 9. DUPLICATION — what to NOT re-enter

**Already known elsewhere, this session only adds detail/location, not a new fact:**
- Tetragrammaton=1,820 (GPT LEDGER §3.1; Full-Book-Inventory DS-01) — this session adds the full per-parasha breakdown for the first time.
- Haggadah=1,820 words (GPT Checkpoint 2/3) — this session locates the exact phrase-by-phrase table.
- Yaakov/Rachel/Leah=1,820 words (GPT LEDGER §3.4, page previously unknown) — this session locates the page and surfaces a digit discrepancy (§6).
- Letter-Tet count/withdrawal (GPT LEDGER §7; Full-Book-Inventory E-04) — this session re-reads it and surfaces a discrepancy (§6), does not re-assert the withdrawn claim.
- Erechin (Full-Book-Inventory CR-05) and Omer front-matter (CR-04) — this session adds text detail to already-known page pairs, does not newly discover either relation.

**Genuinely new, not found in any prior ledger/checkpoint this Claude has read:**
- Full per-parasha Tetragrammaton table (p.6).
- Aleinu prayer 1,820-word count (p.12) — not previously catalogued anywhere in this dossier.
- Sefirot-gematria=1,820 construction (p.12) — not previously catalogued.
- The 18,200-word named-speaker table, pp.13–14, closing with the exact verbatim total. **Caveat, stated honestly:** GPT's own Checkpoint 8 already names "18,200" as a research topic per the coordination brief — meaning GPT may already know this number from a different angle or citation. Claude has **not** read Checkpoint 7/8's actual content (still `UNVERIFIED BY CLAUDE`, Dossier rows 13–14), so **whether this page-location is new information *to GPT*, or a confirmation of something GPT already had, cannot be determined from this side.** Flagged, not claimed as novel with confidence.
- Tekiot/Issaron/Nesachim front-matter constructions (pp.13–15) — not previously catalogued.

---

## 10. DELIVERY

- **Primary artifact:** `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` — **488 lines, 15 page-records (pdf_page 1–15), 70 content_blocks, 8 tables, 9 unresolved_readings, 5 gpt_research_flags.** SHA-256 `7ecb43719f99de79c24abf3ff74ffeff068cd0d1f2cfa6374ef4b8b06a43b5a3`; git blob `39e225e9959260b8ec1c547a5314944b1a2d7891`.
- **Supporting artifacts:** the other 10 files listed in §0, each with its own SHA-256 above.
- **Branch / commit:** `claude/ahavat-torah-letter-dataset-closure` @ `c8908b02097ccbdba7d6dd60578fdb77826c78b1`'s predecessor is stated in your own message as the verified baseline; the actual current HEAD at handoff time is `c8908b02` (batch 3 commit) — **no commit has been made since**, this handoff file will be the next one, purely additive.
- **Continuation pointer:** PDF p.16 (right column first), same batch-of-5 pattern, register schema unchanged, block-ref convention unchanged.
- **Unresolved queue (carry forward, do not silently resolve):** the 10 items in §6, plus the 5 convention-decision gaps in §8.3, plus §9's one open novelty-attribution question (the 18,200 table).

**Compliance confirmation:** nothing in this session was published, canonicalized, merged, deployed, or deployed to production; no source claim was altered to close an arithmetic gap (every contradiction in §6 is preserved with both values); no gematria value anywhere in this corpus was computed from memory — every numeral is either a direct transliteration of a printed gematria string (mechanical letter→value substitution, not memorized/estimated) or an explicitly-labeled `text_note` paraphrase of the source's own stated conclusion; no new store, table, or schema is proposed anywhere in this file.
