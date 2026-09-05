# אהבת תורה — Source Manifest (PR #285 → BOOK_DOSSIER_285_RECONCILIATION_V1)

> Delivered by CLAUDE, role=**SOURCE_OWNER**, per coordination memo `work_log 807d439f-085d-4956-8f63-4af21ddd3907`.
> Handoff to: CLAUDE(INTEGRATION_OWNER) / GPT / ZURIEL.
> **This is a finite, read-only manifest — not a new book audit, not a new dossier root, not a re-derivation of any finding.** Every fact below is pointed at an already-existing artifact; nothing here was re-scanned or re-adjudicated. `DOSSIER_INDEX.md` and `CROSSWALK.md` remain the dossier's own primary indexes — this file adds exact branch/commit pins and CURRENT/HISTORICAL/EXTERNAL/UNVERIFIED status for hand-off purposes only.

## Identity — do not conflate

- **Source identity (stable since Session 4):** `book:hebrewbooks:5635` — the physical/digital object: HebrewBooks catalog #5635, 99-page PDF, Podgórze/Kraków תרס"ה (1905).
- **Higher-level Book entity referenced in the coordination memo:** `book:ahavat-torah` — **does not exist as a canonical or `nodes` row anywhere today.** It is the memo's own proposed higher-level identity for a future Library-entry → Book → Source-Dossier composition. Naming/building it is INTEGRATION_OWNER/GPT/ZURIEL's decision, not asserted here.
- No historical `source_ref` string is renamed in this manifest for UI convenience, per the memo's explicit instruction.

### ERRATUM (additive, does not edit the Identity paragraph above) — live-fact drift surfaced by GPT crosswalk `work_log 9343b19f-59ba-4e10-b2ae-41b573b1f844`, independently re-verified this correction

**The paragraph above is WRONG as a current-state claim.** Independently re-verified live, this correction, direct SQL against `linswmnnkjxvweumprav`:

- `public.nodes` **does** contain a `type='book'` row for this source: `id=18fdaa95-86cd-4100-82ad-59ee8c690b9a`, `identity_key='book:ahavat-torah'`, `metadata.route='/book/ahavat-torah'`, with populated `identity_tiers` (book/edition/locator/witness/digital_object pointing at `gallery/Book/Hebrewbooks_org_5635.pdf`) and `source_ref_prefixes=['book:hebrewbooks:5635','hebrewbooks:5635']`.
- A second, unrelated book node also exists: `id=395a158e-3bb4-4fc7-86d7-aba99e174b46`, `identity_key='book:sefer-hapliah'` (HebrewBooks #6355) — out of this manifest's scope, named only so it is not silently missing.
- **My original grep-based check (Blocker #6 below) was scoped too narrowly** (`src/` + `posts`/`gallery_images` only) and missed both the `nodes` table and `public/book.html`. Independently re-verified this correction: `public/book.html` **exists on `origin/main` itself** (not merely a branch) and **does embed/display the PDF** — it links `/book/ahavat-torah`, constructs `pdf:base+'Hebrewbooks_org_5635.pdf'` against the exact live storage base, and shows the same two book cards (Ahavat Torah, Sefer HaPliah) with `chip: מועמד · לא קנוני` labeling.
- **Neither of these existence facts implies any research claim in this dossier is canonical, published, or promoted** — `nodes(type='book')` is an identity/routing anchor, not a Universal Finding. This does not change the Foundation Expansion Gate verdict (still FOUNDATION SUFFICIENT) and does not authorize creating a second book node, a second display system, or a second source-index root.

## A. This PR (#285) — `claude/ahavat-torah-letter-dataset-closure`, head `004fc421399a2ea67a30be402d1ee54c8a8e0417`

Live-reverified this pickup: `origin/main` = `bae282da2c8f910b1b50ca8a597f87e832b92f16`; this branch is 13 commits ahead / 187 behind; diff vs `main` is 13 files, +2,330/−0, all under `docs/`; working tree clean.

| # (=DOSSIER_INDEX row) | File | Introduced @ commit | Last touched @ commit | Type | Status | Correction pointer | Known coverage |
|---|---|---|---|---|---|---|---|
| 9 | `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` | `ce241864` | `ce241864` | Architecture / contract | CURRENT | — | Foundation decisions (One-Source-One-Dossier, Representation Collapse, checkpoint-ingestion contract) |
| 9 | `docs/research-library/ahavat-torah/DOSSIER_INDEX.md` | `ce241864` | `0d3b2581` | Index (21 rows) | CURRENT, additive-only history | Row 5 corrected (GPT v5/v5b); 3 same-line violations reverted+re-added additively at `46e4def4` | Master index of all 21 known artifacts, in-repo and external |
| 9 | `docs/research-library/ahavat-torah/CROSSWALK.md` | `ce241864` | `c8908b02` | Crosswalk (§A–I) | CURRENT, additive-only | Same `46e4def4` reversion | Per-section preservation/transformation record for all 7 pre-existing external artifacts + this branch's own 9 sessions |
| 10 | `docs/research-notes/AHAVAT_TORAH_P35_LETTER_CLOSURE.md` | `06b2be59` | `06b2be59` | Findings (visual re-verification) | CURRENT | Corrects Session-2 A-01 root cause (not editing that file) | p.35 letter table (א/ב/ג/opening-ד); OQ-01 partial |
| 10 | `docs/research-notes/AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.md` + `.json` | `06b2be59` | `06b2be59` | Dataset (full extraction) | CURRENT | Corrects Session-3 DS-06 page-range `[70,71]`→`[70]` | DS-06, p.70, grand total 647 |
| — (§F provenance) | commit-provenance pointer for DS-06-closure | `71a96988` | `71a96988` | Provenance pin | CURRENT | — | Pins artifact #11 to exact commit |
| 11 | `docs/research-notes/AHAVAT_TORAH_DS06_COUNTING_CONTRACT_CLOSURE.md` | `71a96988` | `71a96988` | Findings (counting-contract closure) | CURRENT | Supersedes (additively) Session-5's "internally inconsistent" composite-breakdown reading | DS-06 population/prefix-forms/aggregation, exact closures |
| 13–14 stubs | Checkpoint 7 / Checkpoint 8 provenance rows added | `46e4def4` | `46e4def4` | Provenance stub only | **UNVERIFIED BY CLAUDE** | n/a | Named only — file path/branch not confirmed, see §D below |
| 15 | `docs/research-library/ahavat-torah/AHAVAT_TORAH_FULL_SOURCE_MAP.md` | `9b9ab356` | `9b9ab356` | Synthesis (A–F map) | CURRENT | — | Index-of-indices: 13 datasets, 18 methods, 21 claims, contradiction map, roadmap |
| 16 | `docs/research-notes/AHAVAT_TORAH_MECHANICAL_DATASET_CLOSURE_PASS.md` | `8d00bbf4` | `8d00bbf4` | Findings (mechanical closure) | CURRENT | Resolves ל/מ/נ boundary (OQ-01); rules out thousands-scale hypothesis; corrects DS-09/10 structure; relocates DS-08 open status | pp.35–41 re-verification, pp.42–43, DS-13 extension |
| 17–19 | `docs/research-notes/AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` | `667cd492` | `c8908b02` | Primary structured register (488 lines, 15 pages, 70 blocks) | CURRENT | Deepens (does not edit) Session-3's one-row-per-page files | PDF pp.1–15 of 99, block-level, `#pN:block` source_refs |
| 17 | `docs/research-notes/AHAVAT_TORAH_LOSSLESS_RECONSTRUCTION_BATCH_01.md` | `667cd492` | `667cd492` | Batch report + Phase-4 DB crosswalk | CURRENT | — | pp.1–5 narrative + Foundation Expansion Gate verdict |
| 20 | `docs/research-library/ahavat-torah/AHAVAT_TORAH_PRE_INGEST_HANDOFF.md` | `f5937f6e` | `f5937f6e` | Handoff report (§0–§10) | CURRENT | — | Full corpus coverage/structure/taxonomy/verification/methods/contradictions/1820-inventory/readiness/duplication summary as of pp.1–15 |
| 21 | `docs/research-library/ahavat-torah/AHAVAT_TORAH_SESSION_EXIT_CHECKPOINT.md` | `b33002bd` | `004fc421` | Session-closure index | CURRENT, additive-only | Storage-gap finding superseded (additively) by location-closure (`0d3b2581`) then byte-identity confirmation (`004fc421`) — original gap paragraph left byte-identical | Compact pointer index into the full 13-file corpus; exact resume pointer p.16 |

**Provenance-drift finding (new, this manifest):** `DOSSIER_INDEX.md` row 9 records this content's branch as `claude/ahavat-torah-research-dossier-foundation` (a Session-4 label). The file is **physically present today only on this PR's branch**, `claude/ahavat-torah-letter-dataset-closure`, as its first commit (`ce241864`) — no branch named `claude/ahavat-torah-research-dossier-foundation` was found live (`git ls-remote origin` returns no such ref). Not adjudicated further here; flagged so INTEGRATION_OWNER does not attempt to locate a stale branch name.

## B. External Claude branches — not physically in #285, referenced only

| Branch | Live head (`git ls-remote`, this pickup) | Content | Status |
|---|---|---|---|
| `claude/hebrewbooks-coverage-provenance-map-qdl1xo` | `af2a672f51357e3383e7b5d538245963f55e7a5d` | 99-page OCR-based coverage map (Session 1) | HISTORICAL — superseded in resolution power (not existence) by the Full-Book-Inventory visual map; 2 corrections layered on top in Crosswalk §B |
| `claude/ahavat-torah-letter-parasha-reconstruction` | `1d436a766351e3db0415fe3ee82690a2f7fe1dea` | 187-row letter×parasha dataset (Session 2) | CURRENT on its own branch, unedited; scope-corrected (table starts p.35 not p.36) in Crosswalk §C |
| `claude/ahavat-torah-full-book-inventory` | `040f857000c089889a73994d7cf4ae4a9aa6695c` | 99+88+12+7+26+13+12 rows across 7 JSON files (Session 3) | CURRENT on its own branch, unedited; D-03 resolved additively in this dossier, not by editing this branch |

## C. External GPT branches — not physically in #285, referenced only

| Branch | Live head (`git ls-remote`, this pickup) | Status |
|---|---|---|
| `gpt/ahavat-torah-research-ledger` | `073578342c2851122f240cd2cb22940e237c98ce` | EXTERNAL, GPT-owned, pre-existing at start of reconciliation |
| `gpt/ahavat-torah-research-ledger-v2` | `968be9e346bf9f99375f97a8cda05b57b88d80ca` | EXTERNAL |
| `gpt/ahavat-torah-research-ledger-v3` | `420406380027f8afd60d004e2046e607035db5ee` | EXTERNAL |
| `gpt/ahavat-torah-research-ledger-v4` | `280555cb4b44fb2f3676c5775b7de04b5bdd5a82` | EXTERNAL |
| `gpt/ahavat-torah-research-ledger-v5` | `bbaf42779dad148d0aec86c92592fcfb13ab7580` | EXTERNAL — **authoritative Checkpoint-5 pointer per Zuriel's explicit instruction** (Dossier Index row 5) |
| `gpt/ahavat-torah-research-ledger-v5b` | `280555cb4b44fb2f3676c5775b7de04b5bdd5a82` | EXTERNAL — **live-confirmed this manifest: identical SHA to `-v4`**, corroborating the dossier's existing "stale/redundant, not a Checkpoint-5 continuation" finding independently |

## D. GPT Checkpoints 7/8 — inaccessible to this session, named only

Per SCOPE, these are **not independently read this session** (GPT's declared territory / out of the read set assigned to SOURCE_OWNER). Named in `DOSSIER_INDEX.md` rows 13–14 as provenance stubs from a relayed coordination brief only:
- **Checkpoint 7** — reported topic: Attributed Expression Corpus closure. Branch/path: **not confirmed**.
- **Checkpoint 8** — reported topic: Corpus→Cohort Aggregation model, 79,976-word population frame, 18,200-cohort audit left open. Branch/path: **not confirmed**.

The coordination memo (807d439f) additionally names `gpt/book-research-context-spatial-v1` (live head `8545a29200262e4ebd52340396ced716ff2cb432`, 8 ahead/0 behind `main`, 6 files incl. `BookHubPage`/`BookSpatialView`/`bookResearchProjection`) — this is a **UI/implementation branch**, not a research-content checkpoint, and is INTEGRATION_OWNER's/GPT's to read, not re-described here.

## E. Parallel same-day jobs — named dependencies, not read, out of #285's scope

Two other same-day jobs exist in `work_log` on adjacent page ranges of the **same book**, but are **distinct task scopes** (per the coordination memo's own framing) and were **not read or incorporated** into this manifest:
- `AHAVAT_TORAH_LOSSLESS_CONTINUATION_A_P16_57` (work_log `ce978932-52c5-48a1-8067-636aeb3cb028`) — status at pickup: `IN_PROGRESS_WRITE_WINDOW_OPEN_SCOPE_P16_57_ONLY`. Branch not confirmed by this manifest.
- `AHAVAT_TORAH_LOSSLESS_CONTINUATION_B_P58_99` (work_log `9b850f55…`/`712c2f08…`/`6abd5b89…`) — status at pickup: `CLOSURE_COMPLETED_DRIFT_RECONSTRUCTION_NOT_COMPLETED` / `BLOCKED_SOURCE_AND_GIT_ACCESS`.

**This manifest's "exact resume position" below (p.16) may already be superseded by P16-57's own in-progress work** — that is P16-57's write scope to report, not this manifest's to claim or duplicate.

## F. Quotation vs. paraphrase — preserved, not re-derived

Carried unchanged from the register/handoff: pp.1–5 are block-by-block verbatim (`text_he`); pp.6–15 use `SUBSTANTIAL_PARAPHRASE_WITH_VERBATIM_NUMBERS_AND_CITATIONS` (every number/citation/heading verbatim, surrounding argument paraphrased, stated explicitly per page). No page in the register conflates the two. See `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json` per-page `transcription_depth` field for the authoritative per-page statement.

## G. Known coverage (unchanged from Session Exit Checkpoint, re-pointed here)

- **Block-level register (this corpus's own format):** PDF pp.1–15 of 99.
- **Deep-verified islands elsewhere (not duplicated into the register):** letter table pp.35–41, DS-06 (p.70), DS-13 (p.69–70 tail), DS-09/10 (pp.42–43), DS-08 checked-and-not-found at p.90.
- **Structurally-mapped-only (a different branch, not counted as coverage here):** 99/99 page-existence classification (Session 3).
- **Untouched in this manifest's scope:** pp.16–24 (19–24 = GPT's declared territory; pp.16–18 not yet reached by this branch — see §E for the parallel P16-57 job that may already be advancing this), bulk of pp.44–99 except catalogued islands.

## H. Minimal projection blockers for INTEGRATION_OWNER (named, not solved here)

1. **Citation-granularity gap:** `#pN:block` source_refs exist only for pp.1–15 (this branch); the other 10 in-dossier files + 8 external branches remain page-level prose citations only.
2. **Truth-vocabulary mapping:** no single enum unifies GPT's (`SOURCE VERIFIED`/`NEEDS CORPUS VERIFICATION`/…), Claude's coverage-map vocabulary (`SCANNED_RESEARCH`/…), and Claude's register vocabulary (`VISUALLY_VERIFIED`/`SOURCE_LOCATED`/…) — by design, not by omission.
3. **No `method_id` key** linking a claim to a Method-Inventory entry (18 methods named in Full Source Map §C).
4. **No single cross-corpus contradiction ledger** — the 10 contradictions live split across `CROSSWALK.md` and the register's own `unresolved_readings[]`.
5. **No `promotion_eligible` key** distinct from `status`/`confidence`/`privacy_scope`, per Zuriel's explicit five-axis separation instruction (Research-Lab visibility / Premium accessibility / promotion eligibility / canonical status / publication status).
6. **Source-artifact display gap** (distinct from storage): the PDF is durably stored and byte-verified (`gallery/Book/Hebrewbooks_org_5635.pdf`, confirmed this branch at `004fc421`), but **no code or DB row anywhere currently links, embeds, or displays it** — confirmed this pickup via `grep -ri "5635\|hebrewbooks" src/` (0 matches) and a live `posts`/`gallery_images` query (0 matches referencing this book). A "source beside research" projection has nothing on the display side to attach to yet beyond the raw storage URL.
7. **`nodes(type='source')` anchor row:** still not built (named Extension Point since Session 4) — Foundation Expansion Gate verdict remains **FOUNDATION SUFFICIENT**, this is an Extension Point, not a MUST-FOUNDATION-NOW gap.
8. **Provenance-drift (§A above):** DOSSIER_INDEX row 9's recorded branch name for the Foundation doc does not resolve live; the file's real current location is this PR's branch, commit `ce241864`.

**CORRECTION to item 6 above (additive, does not edit item 6's text)**, per the ERRATUM in the Identity section: item 6 is **WRONG as a current-state claim**. `public/book.html` on `origin/main` itself embeds and displays this PDF (`/book/ahavat-torah`, storage-base-constructed URL), and a `nodes(type='book', identity_key='book:ahavat-torah')` row exists live with populated identity tiers. The source projection is **PARTIAL/TRANSITIONAL, not absent**. What remains genuinely missing: this dossier's own `#pN:block`-level register (pp.1–15) is **not** what `public/book.html` reads from — that static page reads a separately generated `public/book-data/*.tables.json` (per the INTEGRATION_OWNER branch `claude/ahavat-torah-closure-matrix-lf161n`, not reviewed in depth here — external to this manifest's read scope). The real, still-open gap is *which* dossier artifact is the display's source of truth, not *whether* a display exists.

None of the above blocks a **bounded, honest** projection of what is already known (per-artifact status/coverage as tabulated above) — they are gaps in convention/completeness, not contradictions that make the existing dossier unusable.

---

## VERIFICATION

- **ROLE:** SOURCE_OWNER
- **TASK:** BOOK_DOSSIER_285_RECONCILIATION_V1
- **BRANCH:** `claude/ahavat-torah-letter-dataset-closure`
- **HEAD BEFORE this file:** `004fc421399a2ea67a30be402d1ee54c8a8e0417`
- **origin/main (reverified live):** `bae282da2c8f910b1b50ca8a597f87e832b92f16`
- **FILES TOUCHED THIS TASK:** 1 new file (this manifest). **Zero bytes changed in any of the 13 pre-existing PR files.**
- **NO raw corpus/JSON/CSV edited. NO new PDF scan. NO branch rewrite. NO Master/Roadmap/UI/DB content/schema/method/graph write.**
- **NO merge. NO deploy. NO canonicalization. NO publication.**
- **STATUS:** SOURCE_HANDOFF_READY — a bounded, honest source package for INTEGRATION_OWNER's composition plan; not a claim of research completion. Genuine blockers to projection are named in §H, none of which invalidate the existing dossier.
- **HANDOFF TO:** CLAUDE(INTEGRATION_OWNER) / GPT / ZURIEL, via `work_log`.

**STOP. Remaining READ-ONLY per role SOURCE_OWNER's STOP CONDITION. No competing book screen started.**
