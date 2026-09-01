# אהבת תורה — Lossless Full-Book Reconstruction, Batch 1 (pp.1–5) + Foundation Expansion Gate

> **Status:** Claude, Session 9 (branch `claude/ahavat-torah-letter-dataset-closure`, continuing from commit `8d00bbf4`). **Scope:** Phase 1–2 (lossless page register, first batch) + Phase 4 (read-only DB crosswalk) of the "LOSSLESS FULL-BOOK RECONSTRUCTION" brief. GPT's interpretive scope (pp.19–24, 79,976 sub-populations, 18,200 cohort, DS-05 semantics, method families, contradiction significance) is untouched. No DB write, no schema, no engine change, no canonical promotion, no merge, no deploy.

---

## A. Exact page range losslessly completed

**PDF pp.1–5** (front matter). All 5 pages brought to full block-level transcription with stable source refs, per `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json`.

**Why this batch first:** pp.1–5 were the least-decomposed section in the existing dossier — Session 3's `AHAVAT_TORAH_RESEARCH_UNITS.json` gave each page exactly **one** unit-row (U-001 through U-005), with no block-level breakdown. This made them the highest-value, lowest-risk starting batch for the new lossless-register format: short (5 pages), fully legible, and previously under-decomposed rather than previously mis-decomposed.

## B. Completeness matrix for this range

| pdf_page | STRUCTURALLY_MAPPED | TRANSCRIBED | VISUALLY_VERIFIED | RESEARCH_EXTRACTED | MECHANICALLY_RECONCILED |
|---|---|---|---|---|---|
| 1 | ✅ (Session 3) | ✅ (this batch) | ✅ (this batch) | N/A — bibliographic, no numeric/research claims | N/A |
| 2 | ✅ (Session 3) | ✅ (this batch) | ✅ (this batch) | N/A — modern distributor advertising | N/A |
| 3 | ✅ (Session 3) | ✅ (this batch) | ✅ (this batch) | N/A — confirms D-01 verbatim | N/A |
| 4 | ✅ (Session 3) | ✅ (this batch) | ✅ (this batch) | PARTIAL — 4 citations catalogued, 1 unresolved reading (dense bibliography not cross-checked against cited works) | N/A |
| 5 | ✅ (Session 3) | ✅ (this batch) | ✅ (this batch) | PARTIAL — 4 citations catalogued, 1 unresolved reading (internal date discrepancy) | N/A |

"N/A" for MECHANICALLY_RECONCILED throughout this batch: pp.1–5 contain no arithmetic/numeric claims requiring reconciliation (they are bibliographic/biographical front matter) — this is a genuine "not applicable," not a skipped step.

## C. Exact unresolved readings

1. **p.4, block `bibliography_survey_intro`** — a dense, multi-work bibliography (Chen/Bditchov, Avraham/Zhytomyr, Mishpachat Sofrim, Torah Temimah, Mishnat R' Yaakov, Piskei Eliyahu, HaMikra VeHaMasorah, Beit Aharon, Torah Sheleimah, and R' Yitzchak Yosef Zilber via R' Avraham Korman) transcribed verbatim as printed; individual publisher/page citations **not independently verified against the cited works themselves** — flagged, not resolved.
2. **p.5, block `dedication_paragraph`** — internal date tension: the dedication states the honoree's 3rd yahrzeit fell on 26 Shevat **תש"ס** (2000), implying this preface was composed around 2003, yet the signature immediately below is dated 26 Shevat **תשמ"ג** (1983) — the identical date already used for the p.3 reprint colophon. Both dates are transcribed exactly as printed. **Not resolved** — three explanations remain open (coincidental date match, a genuine two-stage editorial history the page doesn't fully disambiguate, or a printing/transcription anomaly); none adopted. Flagged for GPT's provenance/cross-dataset layer.

No other unresolved readings in this batch — pp.1, 2, 3 are fully clean, single-pass, unambiguous transcriptions.

## D. New/updated source block refs

22 new block-level source refs created this batch, all under the convention `book:hebrewbooks:5635#p<PDF_PAGE>:<BLOCK_ID>` (full list in the JSON file): 5 on p.1, 3 on p.2, 3 on p.3, 8 on p.4 (+3 footnote refs), 8 on p.5. Zero semantic-boundary guesses were forced — every block boundary follows a visually clear paragraph/section break in the source; none required an UNKNOWN/UNCERTAIN boundary marker in this batch (that mechanism is defined and ready in the register schema for use in denser future batches, e.g. pp.6–18's continuous prose).

## E. Dossier files changed

- **New:** `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` (the register itself, batch 1 populated, schema documented for all future batches).
- **New:** `docs/research-notes/AHAVAT_TORAH_LOSSLESS_RECONSTRUCTION_BATCH_01.md` (this file).
- **Updated additively:** `DOSSIER_INDEX.md`, `CROSSWALK.md` (new row/section; 0 deletions verified before commit).

## F. Commit SHA

See end of this file / commit message — pushed to `claude/ahavat-torah-letter-dataset-closure`.

## G. Cumulative full-book completion

| Dimension | Count | Basis |
|---|---|---|
| **STRUCTURAL** | **99/99** | Achieved in Session 3 (`AHAVAT_TORAH_PAGES.json`), unchanged this session. Per the task's own instruction, this is explicitly **NOT** completion. |
| **TRANSCRIBED** (block-level, this register's format) | **5/99** | pp.1–5, this batch. |
| **VISUAL** (VISUALLY_VERIFIED at whole-page level, any prior session) | **~93/99** | 91 from Session 3 + pp.1–5 now confirmed at block level (already counted in the 91) + pp.27–29 remain SOURCE_LOCATED (OCR-era, not re-rendered) + pp.19–24 remain SOURCE_LOCATED-existence-only (GPT's DO-NOT-TOUCH zone, deliberately excluded from this count, not a gap). |
| **RESEARCH-EXTRACTED** (block-level citations/datasets catalogued, this register's format) | **2/99** | pp.4–5 only (pp.1–3 are correctly N/A — no research content to extract from bibliographic/publisher matter). |

**Honest framing, per the task's own instruction:** 99/99 structural mapping already existed and is not being re-claimed as new progress. The genuinely new metric this batch moves is **TRANSCRIBED: 0→5/99** and **RESEARCH-EXTRACTED (block-level): 0→2/99** — both starting from zero because this is the first batch to use the new, deeper register format.

## H. Preliminary DB-crosswalk verdict (Phase 4)

### Live, read-only verification performed this session (canonical project `linswmnnkjxvweumprav` only)

- `research_objects` schema re-queried live: **unchanged** from the Session-4 Foundation report (same 20 columns, same types).
- Searched `information_schema.tables` for `%source%|%document%|%corpus%|%book%|%dossier%`: **no new table exists.**
- Searched `nodes` for any row referencing `hebrewbooks`/`5635`/`אהבת תורה`: **zero matches** (one coincidental UUID-substring false-positive, unrelated to this book, excluded). **Confirms: the `nodes(type='source')` anchor row the Session-4 Foundation report recommended has still not been created by anyone** — consistent with "no bulk write yet" across all sessions so far.

### Answers to the 7 questions (extending, not repeating, the Session-4 Foundation report's already-live-verified findings)

1. **What existing primitive owns stable source identity?** None yet, at the *source* level — this is the same gap the Session-4 report already found (`source_ref` is a citation string *on a claim row*, it presupposes the claim exists; nothing today gives a *book* an identity before any claim is promoted from it). The Session-4 report's answer (a future `nodes(type='source')` row, keyed by `book:hebrewbooks:5635`) is confirmed **still not built**, live-verified this session.

2. **Can `source_ref` safely encode `book:hebrewbooks:5635#pN:block`?** **Yes, mechanically** — `source_ref` is `text`, unconstrained, and the MF-1 identity functions (`fn_research_source_uid()`/`fn_research_claim_uid()`) hash whatever string is given them; a `#pN:block` suffix is just more string. **But this is a naming-convention decision, not a schema question**, and it should be made deliberately once (this session's register already adopts exactly this convention for its own git-tracked block refs, so the convention is *pre-aligned* with what a future `source_ref` would need — no rework required if/when promotion happens).

3. **Where does raw source transcription belong?** **Git-tracked docs, not the DB** — this register (`AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json`) *is* the answer in practice: it is EXTRACTED CONTENT per the frozen Intake contract's own Representation Collapse law (`SOURCE ARTIFACT → EXTRACTED CONTENT → CORE FINDING/CLAIM → EVIDENCE/REPRESENTATIONS`), and every other stress-test corpus (Zvi, Amit, Article-145) already keeps this stage in git, not in `research_objects`. No exception is warranted for this book.

4. **Which units belong in `research_objects` and which must NOT?** Per the same Representation Collapse law: a **promoted, human-gated claim** (e.g., "1,820 Tetragrammaton occurrences, book:hebrewbooks:5635") belongs in `research_objects`. **Raw transcription, block boundaries, per-page structure, and every reading in this register's `unresolved_readings[]` must NOT** — they are pre-claim material. This is unchanged from Session 4's conclusion; this session's block-level granularity does not change the answer, it only proves the granularity is representable *before* promotion (in git) without needing a DB row per block.

5. **How will repeat ingestion be idempotent?** Unchanged from Session 4: MF-1's `fn_research_claim_uid()` (deterministic hash over `source_ref`+`statement`) plus its forward-only partial UNIQUE index already gives idempotency **once a claim is promoted**. At the *pre-promotion* (register/transcription) stage, idempotency is git's own concern (a block ref is a stable string; re-running extraction on an already-registered page is a diff against the existing JSON, not a blind append) — no new mechanism needed.

6. **How will corrected transcription supersede prior extraction without deleting provenance?** Already answered and **already practiced** across this dossier's own history (D-01/D-02/D-03, A-01, the ל/מ/נ boundary, the Session-6 composite-breakdown correction): a correction is a **new, additive record** (new crosswalk row, new bullet, or — per this session's new register — a new/updated block entry with its own `unresolved_readings[]` note), never an edit to the superseded reading. The register's JSON structure supports this today (each page's `unresolved_readings[]` array can grow additively); a future promoted-claim correction would use `edges.relation_type='derived_from'`, exactly as the frozen contract already specifies.

7. **Can the entire book be represented losslessly with existing primitives?** **Yes, for everything this session actually needed to represent.** The register's own field list (`content_blocks[]`, `tables[]`, `editorial_notes[]`, `citations[]`, `main_passage_addendum_links[]`, `dataset_refs[]`, `unresolved_readings[]`) maps cleanly onto git-tracked JSON with zero DB dependency for the pre-promotion stage, and onto the already-frozen `research_objects`/`edges`/`meta.ext.source_dossier.*` extension point for anything eventually promoted. No case was found this batch where an existing primitive would lose information.

### Foundation Expansion Gate verdict

# **FOUNDATION SUFFICIENT FOR LOSSLESS BOOK INGESTION**

No table, column, migration, or new store is required to losslessly register, transcribe, and eventually promote content from this book. This reaffirms the Session-4 Foundation report's verdict, now specifically re-tested against the *block-level* granularity Phase 1 introduces (a stricter test than Session 4's page-level analysis), and reaffirmed live against the current, unchanged database state.

**Classification (per the task's own MUST/EXTENSION/LATER taxonomy):**
- **MUST FOUNDATION NOW:** none.
- **EXTENSION POINT NOW** (named, not built): the same one Session 4 already named — a single `nodes(type='source')` anchor row for `book:hebrewbooks:5635`, still not created by anyone, still a deliberate future Human-Gate action, not executed here.
- **LATER:** everything Session 4 already deferred (multi-book Research Library UI, cross-book motif graph, audio/video representation) — unchanged, not accelerated by this session.

---

## Provenance

- **Actor:** Claude, Session 9.
- **Branch:** `claude/ahavat-torah-letter-dataset-closure`.
- **Method:** direct visual rendering (9× zoom, full-page single-column renders — pp.1–5 are single-column front matter, not the two-column body format used from p.6 onward) via `pymupdf`; live read-only Supabase queries against project `linswmnnkjxvweumprav` (schema inspection + existence checks only, zero writes).
- **This file and the register do not supersede or edit any prior artifact.** Both are new, additive files, cross-referenced from `DOSSIER_INDEX.md`/`CROSSWALK.md`.

**Next batch (not started, per the task's own batching/throughput instruction — one batch reported, then stop):** pp.6–10, the opening of חלק א׳ "מגדל עוז" — continuous two-column halachic/aggadic prose with the book's own numeric claims beginning (Tetragrammaton=1,820 on p.6), a natural and higher-value next target given it starts the book's actual research content.
