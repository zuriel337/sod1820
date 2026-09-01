# אהבת תורה — Session Exit Checkpoint

> **Compact index into the full corpus, for GPT's durable Supabase checkpoint registration, Research-OS crosswalk, and future resume.** Full depth lives in `AHAVAT_TORAH_PRE_INGEST_HANDOFF.md` (§0–§10) — this file is the pointer/summary, not a re-derivation. Nothing was scanned, altered, or ingested to produce this checkpoint.

## Identity

- **Book identity:** `book:hebrewbooks:5635` — ספר אהבת תורה, ר' פנחס זלמן הלוי סג"ל איש הורוויץ, Podgórze/Kraków תרס"ה (1905).
- **Source identity string** (unchanged, stable since Session 4): `book:hebrewbooks:5635`.
- **Branch:** `claude/ahavat-torah-letter-dataset-closure`.
- **Final commit:** `f5937f6e` (pre-ingest handoff). No commit made after it — this checkpoint file itself will be the next, purely additive commit.
- **Commit chain this session-family (Sessions 4–9):** `ce241864` → `06b2be59` → `71a96988` → `46e4def4` → `9b9ab356` → `8d00bbf4` → `667cd492` → `3eb58373` → `c8908b02` → `f5937f6e`.

## Files preserved (12 total, 2,192 lines)

| # | File | Lines | SHA-256 |
|---|---|---|---|
| 1 | `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` | 275 | `750abf51a139e3742deb3d60f68c93627d013dfed4b997026248e82e8b8ee657` |
| 2 | `docs/research-library/ahavat-torah/DOSSIER_INDEX.md` | 65+ (grows additively each session) | see file (changes each commit, additively only) |
| 3 | `docs/research-library/ahavat-torah/CROSSWALK.md` | 145 | `a8d922d8726b72fb110edf4734f48b65e8139b45b5b32d3bebe23fdb6666cc60` |
| 4 | `docs/research-library/ahavat-torah/AHAVAT_TORAH_FULL_SOURCE_MAP.md` | 239 | `1d753ea9614e76745a5efa99623afd80fce41760d622833ef43176cd84ded038` |
| 5 | `docs/research-notes/AHAVAT_TORAH_P35_LETTER_CLOSURE.md` | 109 | `e88126191d7599f0d6259be53d5311018fa2faa449c0ae969bd84d60c9b10964` |
| 6 | `docs/research-notes/AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.md` | 112 | `ca69454a242d47cbb9c26178ce1e07cd652711172e7e53bf44ec40f0ae6eeee5` |
| 7 | `docs/research-notes/AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.json` | 123 | `c86647837cdb8c6976b218b7996e29bca05dd66f040bcdf29cf5adfb3fbaf5da` |
| 8 | `docs/research-notes/AHAVAT_TORAH_DS06_COUNTING_CONTRACT_CLOSURE.md` | 131 | `921099962ddfcbf615b87775b03f9ed45f94b418219df78c28988d88307a2153` |
| 9 | `docs/research-notes/AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md` | 189 | `a52001981e0724aed0bcf160ccc0a76913b9ecdd8b63b03e7d316235d3d85ee8` |
| 10 | `docs/research-notes/AHAVAT_TORAH_LOSSLESS_RECONSTRUCTION_BATCH_01.md` | 101 | `b9e154cbf24ba73d896cbbaca69ae6b5f1cd2e1b53c82db35e452620ca8ee2fa` |
| 11 | **`docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json`** (primary structured artifact) | **488** | **`7ecb43719f99de79c24abf3ff74ffeff068cd0d1f2cfa6374ef4b8b06a43b5a3`** (git blob `39e225e9959260b8ec1c547a5314944b1a2d7891`) — **byte-identical to the value recorded in the Pre-Ingest Handoff; independently re-verified this closure, unchanged** |
| 12 | `docs/research-library/ahavat-torah/AHAVAT_TORAH_PRE_INGEST_HANDOFF.md` | 215 | `fe615a04a9670d0c84b414875137fad071fc23bdcbb74705ae669eb9f32c5ec5` |

**Not part of this corpus, referenced only (separate branches, un-merged):** `claude/hebrewbooks-coverage-provenance-map-qdl1xo`, `claude/ahavat-torah-letter-parasha-reconstruction`, `claude/ahavat-torah-full-book-inventory` (3 Claude branches) + `gpt/ahavat-torah-research-ledger` through `-v5b` (5 GPT branches). See Full Source Map §A and Crosswalk §A–D for their content.

## Coverage

- **Block-level register (this corpus's own new format):** PDF pp.1–15 of 99. pp.1–5 fully clean; pp.6–15 at `SUBSTANTIAL_PARAPHRASE_WITH_VERBATIM_NUMBERS_AND_CITATIONS` depth (every number/citation/heading verbatim, surrounding argument paraphrased, stated explicitly per-page, never hidden).
- **Deep-verified islands elsewhere (other files/branches, not duplicated into the register):** letter table pp.35–41, DS-06 (p.70), DS-13 (p.69–70 tail), DS-09/10 (pp.42–43), DS-08 checked-and-not-found at p.90.
- **Structurally-mapped-only, a different branch, explicitly NOT counted as coverage here:** 99/99 (page-existence + one-line classification, Session 3).
- **Untouched by anyone in this corpus:** pp.16–24 (19–24 = GPT's declared territory), pp.16–18 simply not yet reached, and the bulk of pp.44–99 except the already-catalogued islands.

## Exact resume position

**PDF p.16, right column, continuing the block `nesachim_wine_libation` (source_ref `book:hebrewbooks:5635#p15:nesachim_wine_libation`)** — wine-libation/log-measure Temple-service arithmetic, explicitly noted in the register as continuing past p.15's captured extent. Resume by rendering p.16 both columns and continuing the same 5-page batch pattern (pp.16–20), same register schema, same `#pN:block` convention.

## Unresolved readings (9, register-internal) + contradictions (10, corpus-wide)

Full tables in `AHAVAT_TORAH_PRE_INGEST_HANDOFF.md` §4 and §6. Headline items, none force-resolved, both/all competing values preserved:

- **Rachel/Leah word-count: 107/147 (this corpus's direct read, p.9) vs. 107/116 (previously-cited LEDGER §3.4)** — unresolved, both kept.
- Letter-Tet 2nd-Decalogue exclusion: 47 (this corpus, p.10) vs. 16 (Session 3) — moot either way, underlying claim already WITHDRAWN by the source itself (LEDGER §7).
- Letter Heh (A-01): residual +44 gap, substantially not fully resolved.
- Letter Zayin (A-02): unresolved.
- Levite span 212+37=249 vs. printed 239: unresolved, Δ-10.
- DS-02 Aleph-Vayikra (47,585) / Bet-Bereshit (200,332): logically impossible subtotals, re-confirmed at 60× zoom, unresolved, isolated to these cells only.
- DS-06: book-subtotals close exactly to 647; parasha-row sums do not match their own book subtotals — unresolved at row level.
- DS-13's two "ר'"(200) cells: likely non-numeral citation markers, unresolved.
- GPT Checkpoint 7/8: named, never independently read by Claude — open verification gap, not a content contradiction.
- p.5's internal date tension (1983 signature vs. an implied ~2003 composition date): unresolved, new this corpus.

## Truth-status vocabulary (preserved as-is, not overwritten)

The corpus's own, non-canonical, ad hoc vocabulary — **kept intact, not collapsed into one enum**: `SOURCE_LOCATED`, `UNCERTAIN`, `UNKNOWN`, `VISUALLY_VERIFIED`, `ARITHMETIC-DISAMBIGUATED`, `WITHDRAWN` (source's own self-correction), `SOURCE CLAIM`, `AUTHOR_COUNT`, `TEXT COUNT`, `CALCULATION`, `ARITHMETIC_VERIFIED`. **Zero claims anywhere are tagged FACT or CANONICAL.** Full mapping-vs-your-10-term-taxonomy table is in the Handoff §3 — reported as a translation table, not applied as an edit to any record.

## Research DNA / Method Inventory (observed vs. recurring, none canonicalized)

- **Strong recurring pattern:** "independent constructions reaching 1,820" (≥8 instances, see below); name/word-occurrence counting as a method family (DS-02, DS-03/04, DS-06, DS-13, p.9's and p.13–14's speaker-word-count tables — same underlying method, different populations).
- **Recurring candidate (2 sightings):** bounded-span word counting; Erechin valuation-arithmetic (CR-05); Omer 1..49 construction (CR-04).
- **Observed once:** Serah-bat-Asher two-occurrence observation; Sanhedrin transmission-chain count; per-form Elokim-name tally.
- Full inventory (18 methods) in Full Source Map §C.

## 1,820 / 1,830 inventory — kept separate, never merged

**9 true-1,820 instances** (Tetragrammaton p.6 · Yaakov/Rachel/Leah words p.9 · Haggadah span p.12 · Aleinu p.12 · Sefirot gematria p.12 · Erechin p.13 · Tekiot p.13 · Issaron p.15 · letter-Tet p.10 **[WITHDRAWN by source]**) each with page, representation type (count/word-count/gematria/calculation), and truth class recorded in Handoff §7 — not repeated here to avoid drift between two copies of the same table; **this file points to that one, single table.**
**2 adjacent, distinct 1,830-family instances** (samekh/Adonai count p.8; 30-two-letter-words→60→triangular-sum-1,830, p.12, other branch) — explicitly not the same number, never conflated with the 1,820 set.

## Ingestion gaps (5, named, not filled)

Per Handoff §8: (1) citation-granularity reconciliation (page-only prose citation in 10 files vs. `#pN:block` in the register, pp.1–15 only); (2) truth-vocabulary → `confidence`/`engine_verified` mapping; (3) no `method_id` field linking a claim to a Method-Inventory entry; (4) no single cross-corpus contradiction ledger (scattered across `CROSSWALK.md` + register `unresolved_readings[]`); (5) no `promotion_eligible` key distinct from `status`/`confidence`/`privacy_scope` (per Zuriel's explicit instruction that Research-Lab visibility, Premium accessibility, promotion eligibility, canonical status, and publication status are five separate dimensions, never to be merged). **All five are reported as convention/naming decisions resolvable inside the existing `research_objects.meta` jsonb extension point — none requires a new table, store, or schema. Foundation Expansion Gate verdict (Batch 1, re-confirmed live, unchanged): FOUNDATION SUFFICIENT FOR LOSSLESS BOOK INGESTION.**

## Source-location convention

`book:hebrewbooks:5635#p<PDF_PAGE>:<BLOCK_ID>` — live and populated for pp.1–15 only (70 blocks, 8 tables). **Not retroactively applied** to the other 10 files or the 3 other Claude branches / 5 GPT branches — they remain page-level prose citations. This gap is named, not smoothed over, per explicit instruction.

## Source artifact storage state — GAP, checked live this closure

**Checked, read-only, this closure task:**
- `git ls-files` + `find . -iname "*.pdf"` across the repo: **zero PDF files of any kind exist in the git repository.**
- Supabase `storage.objects` (canonical project `linswmnnkjxvweumprav`, `media` bucket), queried live for `%hebrewbook%`/`%5635%`/`%ahavat%`: **no match for this book.** (One match found for a *different* HebrewBooks title — `Hebrewbooks_org_23518-shar-nptly.pdf`, catalog #23518, an unrelated work — confirming the `media` bucket infrastructure already holds HebrewBooks-sourced PDFs as a pattern, just not this one. One other "5635" hit is a coincidental UUID substring in an unrelated image thumbnail, not this book.)

### SOURCE ARTIFACT STORAGE GAP

**The original PDF for `book:hebrewbooks:5635` exists only as a session-local upload** (`/root/.claude/uploads/85037e3a-f25c-5b5a-9570-2b1cd355131a/84676ce5-Hebrewbooks_org_5635.pdf`), **tied to this specific Claude conversation and not accessible to any future session, to GPT, or to a Research Lab projection.** No durable, canonical, cross-session copy exists anywhere in this project's infrastructure today.

**What's missing to close this gap (reported, not built):** someone (Zuriel, or an agent explicitly authorized to write to storage) needs to upload the source PDF to the existing `media` storage bucket (the same bucket already used for HebrewBooks #23518), at a path following that already-established convention (e.g. `uploads/<date>/Hebrewbooks_org_5635-ahavat-tora.pdf`), and then record that storage path against `book:hebrewbooks:5635`'s eventual `nodes(type='source')` anchor row (itself still not built — see Handoff §8/§8.2) or, in the interim, in `DOSSIER_INDEX.md`'s Source facts section. **This closure task does not perform that upload** — it is a live-storage write, out of scope for "STOP and report."

## Research Lab readiness state

Per Zuriel's explicit dimension-separation instruction: **Research-Lab visibility, canonical status, publication status, Premium accessibility, and promotion eligibility are five separate axes; nothing in this corpus conflates them, and nothing here is canonical, published, or promoted.** The corpus sits at **EXTRACTION**, and in places **RESEARCH OBJECT/CANDIDATE** (per the frozen Intake contract's own chain), several steps before canonical. The projection `ORIGINAL BOOK/PAGE ↔ RESEARCH CONTEXT` described in Zuriel's brief is **representable today** by pairing (once the storage gap above is closed) a page-image reference with this register's `source_ref`-anchored blocks — no new Research Lab store or schema is needed for that pairing; only the storage gap and the 5 convention gaps above stand between this corpus and that projection. **No UI, no schema, no store was built or proposed this closure.**

---

## VERIFICATION

- **FINAL BRANCH:** `claude/ahavat-torah-letter-dataset-closure`
- **FINAL COMMIT (before this checkpoint):** `f5937f6e`
- **FILES PRESERVED:** 12 (table above), all byte-identical to their previously-recorded checksums — independently re-verified this closure via `git status --porcelain` (clean) and `sha256sum` spot-checks on the two most load-bearing files (register + handoff).
- **TOTAL FILE COUNT:** 12
- **TOTAL LINE COUNT:** 2,192 (1,977 corpus + 215 Pre-Ingest Handoff)
- **SHA-256 / CHECKSUMS:** table above; full 11-corpus-file list also in the Pre-Ingest Handoff §0, cross-checked identical.
- **GIT DIFF SCOPE (this closure task):** one new file (`AHAVAT_TORAH_SESSION_EXIT_CHECKPOINT.md`) + one additive `DOSSIER_INDEX.md` row. **Zero bytes changed in any of the 12 pre-existing files.**
- **SOURCE ARTIFACT STATE:** GAP — original PDF exists only as a session-local upload, not in the repo, not in canonical Supabase storage. Reported above, not remediated.
- **SOURCE ANCHOR STATE:** `#pN:block` convention live for pp.1–15 only; a `nodes(type='source')` anchor row for the book identity itself is still not built (named Extension Point since Session 4, unchanged).
- **EXACT RESUME POINTER:** PDF p.16, right column, continuing block `nesachim_wine_libation`.
- **UNRESOLVED QUEUE:** the 10 contradictions + 9 unresolved readings + 5 ingestion-convention gaps + 1 source-artifact-storage gap, all enumerated above and in the Pre-Ingest Handoff.

**SOURCE CORPUS UNALTERED DURING CLOSURE: CONFIRMED.**
**NO BULK DB INGESTION: CONFIRMED.**
**NO CANONICALIZATION: CONFIRMED.**
**NO PUBLICATION: CONFIRMED.**
**NO MERGE: CONFIRMED.**
**NO DEPLOY: CONFIRMED.**

Foundation → Projection → Experience. Preserve capability, truth and provenance — not necessarily the legacy interface.

**STOP. p.16 not started.**
