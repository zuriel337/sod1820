# Research Library / Source Workspace Foundation — v1
## Stress test & architecture decision, first source: אהבת תורה (HebrewBooks #5635)

> **DOCS-ONLY. NO SCHEMA CHANGE PROPOSED OR MADE.** Branch: `claude/ahavat-torah-research-dossier-foundation`. No merge, no deploy, no GPT branch touched, no `research_objects`/`edges`/`nodes` row written by this task. Canonical Supabase verified: `linswmnnkjxvweumprav` (only project on the account).

---

## 1. LIVE FACTS

Verified live, this session, in this order (per LIVE-FIRST BOOTSTRAP):

1. `git fetch origin main` → `origin/main` at `6e180a70` ("Merge PR #283: Master State + Roadmap reconciliation"). No drift between the branch this task started from and `origin/main`.
2. `SOD1820_MASTER_ROADMAP.md` (1,142 lines) and `SOD1820_MASTER_STATE.md` (1,321 lines) read live from `origin/main` (not from memory, not from a stale checkout — a `git checkout main -- .` slip mid-session was caught and reverted via `git reset --hard` before any file was touched).
3. `nodes(type='rule')` queried live: **`research_intake_foundation_contract_law` is at `rule_version=6`** (not v5 as the Master-State prose I read first implied — the live DB is one version ahead of what had been narrated; §6-FREEZE + §7 "ZVI 3060 GOLDEN RECONSTRUCTION" both confirmed live). **`research_object_identity_invariant_law` (MF-1)` is `rule_version=1`, `is_active=true`**, cutoff `2026-08-29T21:00:00+00:00`. **`reality_graph_law` is `rule_version=2`.** **`researcher_dossier_law` is `rule_version=2`** — see §2/§6 for why this is a **false-friend name**, not a competing primitive.
4. `project_codex.slug='research_intake_foundation_contract'` read live in full (37,100 chars) — this is the actual frozen contract body, not a paraphrase.
5. **Contract Freeze status, live:** `v5_freeze_27_8_2026.freeze_verdict = "FOUNDATION_SUFFICIENT_FROZEN_FOR_CONTROLLED_UNIVERSAL_INGESTION"`, `exhaustion_status = "3_of_3_n_met"` — the three stress-test corpora are Zvi (WhatsApp/contributor), Amit (media-archive/multilingual), and **Article 145** (`posts.id=145`, published WordPress editorial content). **The Contract Freeze is already closed** — Ahavat Torah is not needed to close it and does not need to wait for it.
6. `information_schema.tables` scanned for `source|document|corpus|workspace|dossier|book|artifact|checkpoint|library` — **only `channel_ingest_sources` (unrelated WhatsApp ingestion registry) and `gallery_dateartifact_backup` exist.** No source/document/corpus/dossier/library primitive exists anywhere in the schema today.
7. `research_objects` schema confirmed live (20 columns: `id, created_at, kind, statement, terms[], value, relates[], source, source_ref, contributor, confidence, engine_verified, engine_detail(jsonb), evidence, status, promoted_node_id, parent_id, meta(jsonb), owner_person_id, privacy_scope`). `research_items` schema confirmed live (workspace-membership shape: `user_id, bucket, entity_type, entity_ref, title, link, metadata`). `decision_ledger` schema confirmed live — already a proven polymorphic Human-Gate ledger (`subject_type`/`subject_ref` free text, `agents_involved[]`, `sources`/`evidence` jsonb).
8. **Parallel-agent scan:** `git ls-remote origin` shows the full Ahavat Torah branch family, including **two branches this task's brief did not name but which exist live**: `gpt/ahavat-torah-research-ledger-v5` (adds `AHAVAT_TORAH_RESEARCH_CHECKPOINT_5.md`, 335 lines) and `gpt/ahavat-torah-research-ledger-v5b` (same commit hash as `v4` — i.e. **GPT itself pointed a new branch back at the pre-Checkpoint-5 state**, leaving Checkpoint 5's content alive on `v5` but not carried forward on `v5b`). Both are read as **evidence**, neither is modified — see §9 and §15.
9. **My own prior three tasks' branches** (`claude/ahavat-torah-full-book-inventory`, `claude/ahavat-torah-letter-parasha-reconstruction`) are unmerged and independent of `main` and of the GPT branches — confirmed via `git log`/`git diff --stat`, no file overlap with any GPT branch.
10. No other active writer/branch touches `docs/research-notes/AHAVAT_TORAH_*` or `docs/research-library/*` at the time of this scan.

---

## 2. EXISTING PRIMITIVES REUSED

Every one of these already exists, is live, and is reused as-is by this design — **nothing below is created or altered by this task**:

| Primitive | What it already does | How this design reuses it |
|---|---|---|
| `research_objects` (+ MF-1 identity invariant) | Standing research claim (`kind`, `statement`, `source_ref`, `meta` jsonb, `privacy_scope`, `engine_verified`) | The eventual home for any **promoted** Ahavat Torah claim (e.g. "1,820 Tetragrammaton occurrences") — never for the bulk structural extraction itself (see §4) |
| `meta.ext.<domain>.<key>` convention (§1 of the Intake contract) | Namespaced, schema-free extension slot for domain-specific fields | Proposed domain: `meta.ext.source_dossier.<key>` for page/printed-page/unit-type/OCR-vs-visual/confidence fields on any future promoted claim |
| `source_ref` (primary citation) + `meta.source_refs[]` (additional citations) | Canonical single-citation vs multi-citation representation | The stable Ahavat Torah source identity string (§8) is exactly what `source_ref` should hold on any future `research_objects` row drawn from this book |
| `fn_research_source_uid()` / `fn_research_claim_uid()` (MF-1) | Deterministic, IMMUTABLE identity functions over `source_ref`/`statement`, enforced by a forward-only partial UNIQUE index | The precedent and literal mechanism for "same claim from the same source_ref is one identity" — reused verbatim, not reinvented |
| `attribution_type` / `contributor` (reserved keys, §6.7 "Source Authorship ≠ Analyst Interpretation") | Per-object, non-inherited actor attribution | Exactly the mechanism for recording `actor=GPT` vs `actor=CLAUDE` vs `actor=ZURIEL` on each research pass, per-object, never inherited (§11) |
| `edges.relation_type = 'derived_from'` (§6.11) | A correction/derivation relationship between two objects, not equality | The mechanism for "Claude's D-03 resolution supersedes GPT's/Claude's earlier page-30 guess" — a `derived_from` edge, not an overwrite (§10) |
| §6.3 Representation Collapse Law | `SOURCE ARTIFACT → EXTRACTED CONTENT → CORE FINDING/CLAIM → EVIDENCE/REPRESENTATIONS` | This is the **exact pipeline** a Research Library source dossier needs — see §4, this task adds no new pipeline, it names where Ahavat Torah's existing 3 tasks' work sits on this already-approved chain |
| §6.2 Source/Corpus Completeness (3 tiers) | `SOURCE EXHAUSTED` / `KNOWN CORPUS EXHAUSTED` / `CONTRIBUTOR CORPUS COMPLETE` | Reused verbatim as the vocabulary for "is this source's page-map done" — no new "% researched" concept needed (§4) |
| `decision_ledger` (`subject_type`/`subject_ref` free text) | Proven polymorphic Human-Gate decision ledger | Reused for any future promotion decision about an Ahavat Torah candidate finding — `subject_type='research_object'` or `subject_type='source_dossier'`, no new ledger |
| `nodes`/`edges` (`unified_graph_law`) + the already-declared Extension Point in §2 of the Intake contract ("Source/Book/Edition... ייוצגו כ-nodes type='source'/'book'/'edition'... EXTENSION POINT, לא-נבנה כרגע") | The One Tree; a **named, not-yet-built** extension point for source/book identity nodes | This task's "One Source = One Dossier" identity (§8) is designed to slot into that exact, already-approved extension point the moment Zuriel authorizes building it — not a competing identity scheme |
| `everything_additive_law` | No deletion of knowledge, ever | Governs the entire crosswalk in §9: nothing from any of the 7+ Ahavat Torah artifacts is dropped, only ranked/linked/marked superseded |
| Universal Finding envelope (`makeUniversalFinding`, PR #187) | Projection-only envelope over 3 existing houses, never a 4th store | Confirms a Research Library dossier must **not** become a 4th house either — it is workspace/pre-claim material, outside the Universal Finding's scope entirely until something is promoted (§4) |
| `docs/*.md` as "historical-provenance git-mirror" pattern (already established for the Amit/Zvi corpora) | Git-tracked markdown as the record of a research pass, distinct from DB-canonical claims | The exact pattern this task's own prior outputs (coverage-map, letter-table, full-book-inventory) already follow — reused, not reinvented |

**One important non-reuse, flagged explicitly:** `researcher_dossier_law` (rule_version 2, "תיק המחקר / Research Dossier") is a **different, already-named concept** — a registered researcher's own public portfolio page (`ContributorPage.jsx`, `/community/researcher/:slug`, `default_visibility='public'`). It is about a **person**, not a **source/book**. This task's "source dossier" concept is deliberately given a different name (§8) specifically to avoid colliding with this existing, live, differently-scoped law.

---

## 3. GAP ANALYSIS

Only one genuine gap was found, and it is not a schema gap:

**Gap:** there is no primitive today that gives a *source* (a book, PDF, article, corpus) a single, stable, cross-session, cross-agent **identity** the way `fn_research_source_uid()` gives a *claim* one. `source_ref` is a citation string on a claim row — it presupposes the claim exists. Nothing today answers "is this the same book as last time" *before* any claim has been promoted, which is exactly the situation with Ahavat Torah: 7+ branches of pure extraction/structural work exist, and **zero** `research_objects` rows have been created from any of them.

**Everything else the task worried about already has a home:**
- "SOURCE ≠ RESEARCH UNIT ≠ FINDING ≠ CLAIM ≠ FACT ≠ CANONICAL ≠ PUBLISHED" is **already** the exact shape of §6.3 Representation Collapse + the canonical flow (`SOURCE → EXTRACTION → RESEARCH OBJECT/CANDIDATE → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → CANONICAL → PUBLISHED`) stated in the Intake contract's own Freeze verdict.
- "checkpoints are provenance, not identity" is **already** the exact shape of §6.7 (Source Authorship ≠ Analyst Interpretation, per-object attribution) plus the MF-1 `writers_updated`/idempotency pattern.
- "actor provenance must remain real (GPT/CLAUDE/ZURIEL)" is **already** representable via `attribution_type`/`contributor` (reserved keys) with no schema change.
- "one finding supported by many books / one book supporting many findings" is **already** representable via `source_ref` (many `research_objects` rows can share one `source_ref`; one row's `meta.source_refs[]` can list several).

So the gap is narrow: **a stable source-identity string/slug and a place to point at it**, not a new table, not a new lifecycle, not a new graph.

---

## 4. FOUNDATION SUFFICIENT / NOT SUFFICIENT

**FOUNDATION SUFFICIENT**, with one Extension Point recommended (not built here) and one naming clarification (already applied, §2/§8).

Running the Foundation Expansion Gate discipline this codebase already uses (§23.5 pattern) against the architecture asked for in the task:

```
RESEARCH LIBRARY
  → SOURCE                              → EXTENSION POINT NOW (§8: identity string + future nodes(type='source') row)
      → SOURCE DOSSIER / WORKSPACE      → NO NEW PRIMITIVE — a git-tracked docs index (§8/§12), not a table
          → PAGE MAP                    → NO NEW PRIMITIVE — docs-only JSON (already built, 3x, on 3 branches)
          → RESEARCH UNITS              → NO NEW PRIMITIVE — docs-only JSON pre-claim; promoted units become research_objects rows
          → DATASETS                    → NO NEW PRIMITIVE — docs-only JSON; §6.8 Research Procedure Extraction already covers "a dataset is a procedure, not a new kind"
          → CALCULATIONS                → NO NEW PRIMITIVE — §6.11 derived_from already covers calculation chains as edges once promoted
          → SOURCES / CITATIONS         → NO NEW PRIMITIVE — §2 source_ref/meta.source_refs[] already covers citation semantics
          → EXCEPTIONS                  → NO NEW PRIMITIVE — docs-only; a promoted exception is a research_objects row with meta.ext.source_dossier.exception_id
          → RELATIONS                   → NO NEW PRIMITIVE — edges.relation_type (equals*/same_as*/derived_from) already covers every relation kind found
          → OPEN QUESTIONS              → NO NEW PRIMITIVE — docs-only; a promoted open question is a research_objects row with kind='question' (already a valid kind)
          → CHECKPOINT HISTORY          → NO NEW PRIMITIVE — git history + a docs-only index (§12) IS the checkpoint history; decision_ledger for any Human-Gate decision about one
          → EXTRACTION/VERIFICATION STATE → NO NEW PRIMITIVE — reuse §6.2's 3-tier Source/Corpus Completeness vocabulary + Research DNA v1's verification_state vocabulary
          → CANDIDATES FOR PROMOTION    → NO NEW PRIMITIVE — this is just "a research_objects row with status='candidate'" (already the column default)
```

**Why not one table per box, proven per the task's own instruction ("prove why an existing primitive cannot represent it safely"):** every box above is either (a) pre-claim extraction material that the Intake contract's own Representation Collapse law says belongs in the "EXTRACTED CONTENT" stage — which this codebase already handles as git-tracked docs, not DB rows, for every other corpus stress-tested so far (Zvi, Amit) — or (b) a projection of `research_objects`/`edges` once something is actually promoted, in which case the existing columns (`kind`, `meta`, `relates[]`, `relation_type`) already carry it.

---

## 5. MUST FOUNDATION NOW

**None.**

No table, column, migration, engine, ledger, or graph is required to represent the Ahavat Torah dossier, to reconcile its 7 existing artifacts losslessly, or to let future checkpoints append to it safely. This conclusion was reached the same way the Intake contract's own MF-1 gate reached its (different) conclusion for `research_objects` identity: read-only audit first, and here the audit finds the needed primitives already exist and are already frozen for controlled use.

---

## 6. EXTENSION POINT NOW

1. **A stable Ahavat Torah source-identity string** (§8) — a naming convention decision, zero schema change, needed *now* so that any future promotion uses one consistent `source_ref` instead of five people inventing five different strings for the same book.
2. **A single `nodes(type='source')` anchor row for אהבת תורה** — this is the exact, already-named Extension Point from §2 of the frozen Intake contract ("Source/Book/Edition... ייוצגו כ-nodes... EXTENSION POINT, לא-נבנה כרגע"). Recommended as the **next micro-action after this report**, under a separate Human-Gate approval — **not executed in this docs-only pass** (creating even one graph row is a live-DB write, and this task's brief is explicit: docs-only, no merge/deploy, no automatic canonical promotion).
3. **A docs-only Dossier Index file** (§12, delivered in this task) as the "One Source = One Dossier" home — this *is* built in this pass, because it is a git file, not a schema change.
4. **`meta.ext.source_dossier.*` sub-keys** (page, printed_page, unit_type, ocr_vs_visual, checkpoint_id) — named now, populated only if/when a specific Ahavat Torah claim is actually promoted to `research_objects`.

## 7. LATER

- A browsable Research Library UI (list of sources, per-source dossier view) — explicitly DO-NOT-TOUCH for this task (No public UI).
- Promotion of any specific Ahavat Torah number/claim (1,820; 79,976; 304,812; etc.) through Verification → Human Gate → One Tree. Nothing here authorizes that.
- Engine verification of any Ahavat Torah gematria value against the canonical engine (`fn_ragil` etc.) — none has been run; every figure in all 7 artifacts remains `AUTHOR_COUNT`/`SOURCE_CLAIM` at best.
- A cross-book relation graph (motifs shared between Ahavat Torah and other future sources) — needs ≥2 sources in the Library to even be meaningful; today there is exactly one.
- A dedicated Numeric Operation Registry, Spatial Adapter, multilingual tokenizer — all already-named Extension Points from the frozen Intake contract, unrelated to Ahavat Torah specifically, not accelerated by this task.
- Resolving GPT's own open Checkpoint-5-vs-v5b question (§9/§15) — that is GPT's own branch, not touched here; noted as provenance only.

---

## 8. ONE-SOURCE-ONE-DOSSIER CONTRACT

**Canonical name (deliberately distinct from `researcher_dossier_law`'s "תיק המחקר"):** **Source Dossier** / **תיק-מקור**. Never call it "Research Dossier" in Hebrew-facing docs — that name is taken by the researcher-portfolio law.

**Canonical source identity string for this stress-test source (to be used verbatim as `source_ref` on any future `research_objects` row, and as the slug for the Dossier Index file):**

```
book:hebrewbooks:5635
```

Rationale: `hebrewbooks:5635` is the one identity every one of the 7 artifacts already independently agrees on (HebrewBooks' own catalog number, cited identically by both Claude's and GPT's work without coordination) — it is edition-stable (this specific 1905 Podgórze/Kraków scan, catalog #5635), and it is exactly the shape `fn_research_source_uid()` expects to hash (a short, stable, human-legible string). The `book:` prefix leaves room for `edition:`/`page:` child identities later without renaming this one.

**The contract itself:**

1. **Identity lives in exactly one place going forward:** the Dossier Index file at `docs/research-library/ahavat-torah/DOSSIER_INDEX.md` (this task, §12). Any new session, branch, checkpoint, OCR pass, visual pass, or correction — Claude or GPT — **appends a row to that index**, or adds a new linked file referenced from it. **It never creates a second index, a second "AHAVAT_TORAH_FULL_INVENTORY"-shaped root file, or a second source-identity string.**
2. **Agent/session/branch/checkpoint = provenance, never identity.** A new Claude session does not get its own dossier. A new GPT checkpoint does not get its own dossier. Both write *into* the one dossier's index, tagged with their own `actor`/`checkpoint_id`/`branch`/`date` — exactly mirroring §6.7's "attribution is per-object, never inherited, but the underlying subject is one."
3. **Additive history, always.** A correction (like D-03, §10) never deletes or edits a prior claim's row in the crosswalk (§9) — it adds a new row with `relation=SUPERSEDES` or `relation=CORRECTS` pointing at the old one, exactly as `everything_additive_law` and §6.7/§6.11's `derived_from` pattern already require elsewhere in this codebase.
4. **If/when this source graduates to a `nodes(type='source')` row** (§6, Extension Point), that row's identity key is this same string (`book:hebrewbooks:5635`), so nothing already written needs to change — the node is an *anchor added on top*, not a migration.
5. **No second Research OS.** This dossier is a workspace/index of git-tracked docs. It creates no engine, no graph, no truth lifecycle. Promotion out of it always goes through the existing chain: `SOURCE → EXTRACTION → RESEARCH OBJECT/CANDIDATE → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → ONE TREE → PUBLICATION` (verbatim from the frozen Intake contract).

---

## 9. AHAVAT TORAH LOSSLESS CROSSWALK

Full row-by-row crosswalk is in the companion file `docs/research-library/ahavat-torah/CROSSWALK.md` (built this task). Summary here; **0 unexplained dropped research items** — every artifact below is preserved, ranked, or linked, none deleted or silently summarized-away:

| # | Original artifact | Branch | Actor | What it contains | Status in dossier |
|---|---|---|---|---|---|
| 1 | `AHAVAT_TORAH_RESEARCH_LEDGER.md` | `gpt/ahavat-torah-research-ledger` → `-v2`→`-v3`→`-v4` (content identical v2-v4) | GPT | §3.1–§3.12 source findings, method inventory, evidence-ranking, corrections/drift log | **CURRENT** — foundational, cited by every later Claude artifact |
| 2 | `AHAVAT_TORAH_RESEARCH_CHECKPOINT_2.md` | `gpt/ahavat-torah-research-ledger-v3`,`-v4`,`-v5`,`-v5b` | GPT | Ordinal position, entity-word tables, 1,820 holy names, Haggadah bounded span | **CURRENT** |
| 3 | `AHAVAT_TORAH_RESEARCH_CHECKPOINT_3.md` | `-v4`,`-v5`,`-v5b` | GPT | Jacob speech decomposition, Vayigash/Vayechi boundary, Omer count, bounded external corpus | **CURRENT** — independently visually confirmed by Claude at p.58 (this task's predecessor) |
| 4 | `AHAVAT_TORAH_RESEARCH_CHECKPOINT_4.md` | `-v4`,`-v5`,`-v5b` | GPT | אוריין תליתאי closure: פעמים/תיבות dual metric, composite attribution | **CURRENT** — independently visually confirmed by Claude at pp.25-31 |
| 5 | `AHAVAT_TORAH_RESEARCH_CHECKPOINT_5.md` | `gpt/ahavat-torah-research-ledger-v5` **only** | GPT | Coverage-discipline proposal (PAGE_SCANNED/PARTIAL/SEARCH_HIT/NOT_YET), Research Unit contract extension fields, MUST/EXTENSION/LATER classification | **PARALLEL-EXISTING, NOT CARRIED FORWARD BY GPT ITSELF** — `v5b` (GPT's own later branch) points at the same commit as `v4`, i.e. GPT did not advance past Checkpoint 4 on its "current" pointer. Preserved verbatim as historical/candidate content; **not deleted, not silently dropped, not adjudicated by Claude** — flagged in §15 as GPT's own branch state, to be reconciled by GPT/Zuriel, not overridden here. |
| 6 | `AHAVAT_TORAH_COVERAGE_PROVENANCE_MAP.md` | `claude/hebrewbooks-coverage-provenance-map-qdl1xo` | Claude | 99-page OCR-text-based section map, SCANNED/PARTIAL/SEARCH_HIT_ONLY/NOT_RESEARCHED classification, first cross-reference of GPT's ledger to specific pages | **CURRENT, WITH 2 KNOWN CORRECTIONS** (D-01, D-02 below) — the OCR-only method is explicitly weaker than later visual passes; not deleted, corrections layered on top |
| 7 | `AHAVAT_TORAH_LETTER_PARASHA_RECONSTRUCTION.md/.json/.csv` | `claude/ahavat-torah-letter-parasha-reconstruction` | Claude | Deep visual two-pass reconstruction of the detailed letter-table + 2 summary tables, pp.36-42; 187-row dataset; 2 checksum mismatches (A-01/A-02); OQ-01 (letter-identity gap pp.37-38) | **CURRENT, WITH 1 SCOPE CORRECTION** (D-03 below: the table's true start is p.35, not p.36 — pp.35's Aleph/Bet/Gimel/early-Dalet rows are a **known, documented gap** in this artifact's own dataset, not yet backfilled) |
| 8 | `AHAVAT_TORAH_FULL_BOOK_INVENTORY.md` + 7 JSON files | `claude/ahavat-torah-full-book-inventory` | Claude | 99/99 page structural map (visual, all pages except pp.19-24 deliberately withheld per DO-NOT-TOUCH), 88 research units, 12 datasets, 7 calculations, 26 sources, 13 relations (incl. D-01/D-02/D-03/CR-04 drift candidates), 12 exceptions | **CURRENT, WITH 1 RESOLVED OPEN QUESTION** — D-03 is resolved this task (§10); the JSON files themselves are **not edited** (additive law) — resolution is recorded as a new crosswalk row, not a silent edit to the prior branch |

**Truth-state/confidence preserved, not collapsed, throughout the crosswalk file:** every row keeps its **originally recorded** confidence tag (`VISUALLY_VERIFIED`/`SOURCE_LOCATED`/`UNCERTAIN`/`UNKNOWN` for Claude's work; GPT's own `SOURCE VERIFIED`/`NEEDS CORPUS VERIFICATION`/`NOT ENGINE VERIFIED`/etc. vocabulary for GPT's work) — **no single unified lifecycle enum was invented**, per the task's explicit instruction (§G).

---

## 10. D-03 VERDICT

**RESOLVED, with direct visual re-verification this session (6× zoom re-render of pp.29, 30, 31, 35, both columns).**

- **PDF p.29** — confirmed 100% אוריין תליתאי entity/attribution table content (Moshe, Aharon, Miriam, Bnei Yisrael, Kalev, Korach, Datan, Aviram, Balak rows). No letter-table content.
- **PDF p.30** — confirmed 100% אוריין תליתאי content, including the section's own citation of the **79,976-word Torah total** decomposed into divine/narrative/human-speech classes (matching LEDGER §3.5 verbatim, now pinned to this exact page for the first time). **No "סופר ומונה אותיות התורה" title and no Aleph/Bet paragraph exist on this page** — the earlier full-book-inventory task's "OQ-P1"/D-03 concern about p.30 was a **misread at lower render resolution (3.2× vs 6× used this session), now corrected**, per `everything_additive_law` (the earlier note is superseded, not deleted — see the crosswalk row for it).
- **PDF p.31** — confirmed: entity table concludes (Pharaoh/Egypt/Canaan rows), a horizontal divider appears, and **"שרשים בתורה"** begins cleanly with Bereshit-chapter-1 root vocabulary. No letter-table content.
- **PDF pp.32–34** — root-list content continues (previously confirmed in the full-book-inventory task; re-affirmed by continuity with p.31 and p.35's clean divider).
- **PDF p.35** — **this is the true start of the detailed letter-count table.** The root-list ends mid-page (right column), a horizontal divider appears, the title **"סופר ומונה אותיות התורה"** appears explicitly, and the table begins: letter **א (Aleph)** starts immediately, letter **ב (Bet)** follows later in the same (right) column, and letters **ג (Gimel)** and **ד (Dalet)** begin on the left column — carrying into page 36, exactly where the dedicated letter-table reconstruction task (`claude/ahavat-torah-letter-parasha-reconstruction`) had already picked up mid-letter-Dalet.

**Verdict:** the detailed per-letter table spans **PDF pp.35–41** (not 36–41 as previously scoped), and its existing 187-row dataset is missing letters **Aleph, Bet, Gimel, and the opening of Dalet**, all located on p.35. This is recorded as a new, dated finding in the crosswalk (§9) and as a `MISSING_RANGE` note against the letter-table artifact — **the artifact's own file is not edited in this task** (that would be a second agent silently rewriting another branch's dataset); the correction is additive, in the dossier index and crosswalk, for whoever next extends that dataset (most naturally the same two-pass visual method, applied to p.35 specifically).

---

## 11. FUTURE CHECKPOINT INGESTION CONTRACT

A checkpoint (GPT, Claude, or Zuriel) is a **provenance-bearing research batch**, never a second store. On arrival:

1. **Locate the one dossier** by its identity string (`book:hebrewbooks:5635`, §8) — never create a second index.
2. **Compare against the current crosswalk** (§9/companion file): for each claim/finding/dataset/calculation/source/exception/relation/open-question in the new checkpoint, classify against what the dossier already holds:
   - **NEW** — no prior artifact covers this page range/claim → append as a new crosswalk row.
   - **SUPPORTS** — independently confirms an existing row (like Checkpoint 3/4 independently matching Claude's later visual passes) → link both rows to each other (`relation=SUPPORTS`), do not merge into one row.
   - **CONTRADICTS** — disagrees with an existing row and neither is a checksum-proven correction (e.g. two different digit reads for the same figure) → both rows are kept, flagged `relation=DRIFT_CANDIDATE`, exactly as this dossier's own §9/§15 already do — **never silently pick a winner.**
   - **CORRECTS** — one row demonstrably supersedes another with evidence (like D-03 this task) → new row added with `relation=CORRECTS`/`SUPERSEDES`, old row kept verbatim and marked (not deleted).
   - **EXTENDS** — adds detail to an existing row's scope without contradicting it (e.g. filling in the p.35 gap found by D-03) → new row, `relation=EXTENDS`, linked to the row it extends.
   - **DUPLICATE_REPRESENTATION** — same underlying claim, different wording/language/format (Representation Collapse, §6.3) → linked as `relation=SAME_CORE_FINDING`, both representations kept, **never treated as automatically-the-same** without this explicit check (per the task's "Same wording ≠ automatically same claim" instruction).
3. **Preserve original provenance on every row**: `actor` (GPT/CLAUDE/ZURIEL — never inferred, always the literal declared actor of that pass), `branch`, `commit` (if known), `checkpoint_id`/`task_name`, `date`.
4. **Update coverage** using the existing §6.2 three-tier vocabulary (SOURCE EXHAUSTED / KNOWN CORPUS EXHAUSTED / CONTRIBUTOR CORPUS COMPLETE) — never a bespoke percentage unless a specific task explicitly asks for one (as the earlier coverage-map task did, for its own report only).
5. **Never silently overwrite.** The only way a prior row's *content* changes is a new row that supersedes it, additively, per `everything_additive_law`.
6. **This behaves identically for GPT, Claude, or Zuriel** — the contract names no engine-specific step; a Zuriel manual correction follows the exact same NEW/SUPPORTS/CONTRADICTS/CORRECTS/EXTENDS/DUPLICATE classification as an AI checkpoint.
7. **Promotion is a separate, later, explicit act.** Nothing in checkpoint ingestion promotes anything to `research_objects`/canonical. That remains a distinct workflow action, per the Universal Finding contract's own rule that Findings are never auto-created.

---

## 12. FUTURE MULTI-BOOK RESEARCH LIBRARY MODEL

Stress-testing this design against the 16-item future-capability list in the task:

| Future condition | Handled by this design? | How |
|---|---|---|
| 100–10,000 books/documents | Yes | Each gets its own `book:<catalog-system>:<id>` identity string + its own Dossier Index file under `docs/research-library/<slug>/` — no shared table to outgrow |
| Multiple editions of one book | Yes (Extension Point, already named in §2 of the frozen contract) | `edition:<book-id>:<edition-marker>` child identity, once Source/Book/Edition nodes are built |
| Hebrew/Aramaic/English representations | Yes | §3 relation vocabulary already has `same_as`/`alias_of`/`variant_of` for cross-representation identity; §6.3 Representation Collapse already separates CORE FINDING from its REPRESENTATIONS |
| Scanned PDFs, OCR, page images | Yes | Already the exact shape of this dossier (OCR text layer vs. visual render, both preserved with distinct confidence tags, never one converted into the other — task §F's explicit rule already followed) |
| Manuscripts | Yes | Same as scanned PDFs; no new primitive needed |
| Audio/video source material | **Partial — EXTENSION POINT** | The Representation Collapse chain (`SOURCE ARTIFACT → EXTRACTED CONTENT`) already anticipates non-text artifacts (§7.2 of the frozen contract explicitly covers image-reference preservation for exactly this reason); a transcript is just another EXTRACTED CONTENT representation. No redesign risk identified, but genuinely untested — flagged `LATER`, not `MUST FOUNDATION NOW`, since zero audio/video sources exist in the Library today |
| Parallel researchers | Yes | §11's ingestion contract is actor-agnostic by design |
| Contradictory readings | Yes | `DRIFT_CANDIDATE` (already used 4× in this very dossier, §9) |
| Citations between books | Yes | `source_ref`/`meta.source_refs[]` (§2 of the frozen contract) already supports multiple citations per claim; a claim citing two books just lists both `source_ref`s |
| One finding supported by many books | Yes | Same mechanism — `meta.source_refs[]` |
| One source supporting many findings | Yes | Trivial — many `research_objects` rows share one `source_ref` |
| Future engine verification | Yes | `engine_verified`/`engine_detail` columns already exist on `research_objects`, unused by anything in this dossier so far (everything remains `AUTHOR_COUNT`/`SOURCE_CLAIM`) — no redesign needed to start using them later |
| Human corrections | Yes | Identical path to an AI checkpoint correction (§11) |
| Superseded editions | Yes | `relation=SUPERSEDES` between two `edition:` identities, same mechanism as within-book supersession |
| Cross-book motifs | **Partial — LATER** | Needs ≥2 books with populated dossiers before it's meaningful; the relation vocabulary (`same_as`, `derived_from`) already supports it structurally, but no cross-book motif has ever been attempted — genuinely `LATER`, not urgent |
| Eventual promotion into the One Tree | Yes | Unchanged canonical flow, already frozen: `SOURCE → EXTRACTION → RESEARCH OBJECT → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → CANONICAL → PUBLICATION` |

**No gap found here is classified `MUST FOUNDATION NOW`.** The two genuinely open items (audio/video representation, cross-book motifs) are both explicitly `LATER` because zero live examples of either exist yet in the Library — building for them now would be speculative schema-shaping the task explicitly warns against ("Do not over-engineer").

---

## 13. EXACT FILES / SCHEMA / CODE THAT WOULD NEED CHANGE

**None**, for this task's scope (reconciling Ahavat Torah into one dossier, defining the Source Dossier contract). Specifically:

- **No SQL migration.** No `CREATE TABLE`, no `ALTER TABLE`, no new function, no new index.
- **No `nodes`/`edges`/`research_objects`/`decision_ledger` row written.** (The recommended `nodes(type='source')` anchor row, §6 item 2, is explicitly **not** created here — it needs its own Human-Gate approval as a live-DB write, however small.)
- **No application code file** (`src/**`, `supabase/functions/**`) needs to change — nothing in this design touches a UI surface, an Edge Function, or a client library.
- **Files created by this task** (all under `docs/research-library/`, all new, none overwriting an existing file):
  - `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` (this file)
  - `docs/research-library/ahavat-torah/DOSSIER_INDEX.md`
  - `docs/research-library/ahavat-torah/CROSSWALK.md`

---

## 14. WHAT DOES NOT NEED CHANGE

Everything named in §2 (every reused primitive), plus, explicitly, so there is no ambiguity: `research_objects`'s current 20-column shape, `research_items`, `decision_ledger`'s current 27-column shape, `nodes`/`edges`, `entity_types`, `gematria_methods`, the Universal Finding envelope code (`src/lib/research/universalFinding.js`), the Research Studio Lens/Dimension taxonomy, `researcher_dossier_law`/`ContributorPage.jsx` (confirmed untouched and unrelated), any GPT `gpt/ahavat-torah-research-ledger-*` branch (all five — `v1` through `v5b` — read-only this task, zero commits made to any of them), and both of this agent's own prior Ahavat Torah branches (read-only, zero edits to their files — corrections are recorded in the new crosswalk, not by editing the old branches).

---

## 15. DRIFT / CONFLICTS

Four items, all already flagged in the existing crosswalk/relations work and re-confirmed here, plus one new observation:

1. **D-01** (self-drift, Claude vs. Claude): coverage-map task mislabeled PDF p.3 as "approbations"; corrected in the full-book-inventory task. No conflict remains — both states are in the crosswalk.
2. **D-02** (self-drift, Claude vs. Claude): coverage-map task placed the addenda-section boundary at p.95; full-book-inventory task found it actually starts at the bottom of p.94. No conflict remains.
3. **D-03** (self-drift, Claude vs. Claude): **resolved this task** (§10) — the letter-table's true start is p.35, not p.30 (a misread) and not p.36 (the dedicated reconstruction's scope, now known to be missing its first ~1.5 pages of content).
4. **CR-04** (open, not a conflict yet, just unresolved): the Omer 1..49=1,225 construction appears in two different sections (p.13, p.73) — relationship between the two instances not established. Left open, not guessed, per this task's own instruction not to force interpretation-adjacent calls.
5. **New this task — GPT `v5` vs `v5b` (not adjudicated, GPT's own branch, not touched):** `gpt/ahavat-torah-research-ledger-v5` adds a 335-line Checkpoint 5 proposing a coverage-discipline/research-unit-contract framework strikingly similar in shape to what this agent's own full-book-inventory task independently built (both landed on a 4-tier scan-confidence vocabulary and a MUST/EXTENSION/LATER classification, without coordinating). `gpt/ahavat-torah-research-ledger-v5b` was created **at the same commit as `v4`** — i.e., GPT's own most recent branch pointer does **not** carry Checkpoint 5 forward. This is recorded as an **open provenance question for GPT/Zuriel to resolve** (was Checkpoint 5 intentionally withdrawn? superseded by this very reconciliation task? simply a parallel branch not yet merged forward?) — **not adjudicated by Claude**, per the explicit instruction not to touch or judge GPT's own branch state. Checkpoint 5's content is preserved in the crosswalk (§9, row 5) regardless of which branch pointer currently reflects it.

**No conflict found that requires deleting or rewriting provenance**, and no conflict triggers this task's STOP CONDITION.

---

## 16. VERIFICATION RESULTS

- Canonical Supabase confirmed = `linswmnnkjxvweumprav` (only project on the account) — **matches**, no STOP triggered.
- No overlapping active writer found on `docs/research-library/*` or `docs/research-notes/AHAVAT_TORAH_*` — **no STOP triggered**.
- Source identity (`book:hebrewbooks:5635`) establishable from existing, independently-converged citations across all 7 artifacts — **no STOP triggered**.
- Reconciliation required **zero** deletion or rewriting of provenance — every one of the 7 artifacts is preserved verbatim on its own branch; only new, additive crosswalk rows were created — **no STOP triggered**.
- **Zero schema mismatch found** — `research_objects`/`decision_ledger`/`nodes`/`edges` all match what the frozen Intake contract already documents live — **no STOP triggered**.
- **Zero requirement for a second Research OS/graph/truth lifecycle found** — every box in the requested architecture maps onto an existing, already-frozen primitive or an already-named (not-yet-built) Extension Point — **no STOP triggered**.
- D-03 resolved with direct visual evidence (6× zoom, both columns, pp.29/30/31/35), not guessed — **STOP-if-unresolved condition satisfied by resolution, not by default**.
- **PDF pp.19–24 were not read or touched by this task** (no reason for this task to enter GPT's declared parallel territory) — DO-NOT-TOUCH honored.

**Overall: no STOP CONDITION was triggered. This is a `FOUNDATION SUFFICIENT` verdict, produced entirely docs-only.**

---

## 17. RECOMMENDED NEXT ACTION

1. **Zuriel/Human-Gate review of this report** — specifically the one live-DB micro-action it recommends but does not perform: creating a single `nodes(type='source')` row identified as `book:hebrewbooks:5635` (§6 item 2). This is small, additive, uses an already-named Extension Point, and is the one action that would let this dossier's identity live in the graph itself rather than only in git — but it is a live write and this task deliberately stops short of it.
2. **Whoever next extends the letter-table dataset** (`AHAVAT_TORAH_LETTER_PARASHA_DATA.json`) should specifically target **PDF p.35** first (§10) — its Aleph/Bet/Gimel/opening-Dalet content is the one clearly-scoped, evidence-backed gap this task found.
3. **GPT/Zuriel to resolve the `v5`/`v5b` branch-pointer question** (§15 item 5) — not urgent, not a conflict, but worth a deliberate decision rather than leaving two branch pointers silently disagreeing indefinitely.
4. **Do not build a Research Library UI, a second index format, or any new table** on the strength of this report alone — it is a foundation/reconciliation pass, not a build authorization, exactly mirroring how the frozen Intake contract's own Freeze explicitly "does not authorize source→canonical or mass ingestion."
5. **The next genuinely new stress-test worth running** (not urgent, offered as an observation, not a recommendation to act on unprompted): Ahavat Torah is a **fourth kind of corpus** distinct from all three that closed the Intake Freeze (Zvi/WhatsApp, Amit/media-archive, Article-145/published-editorial) — a **scanned historical book with parallel multi-agent (GPT+Claude) checkpoint history**. The Freeze is already closed and does not need this to reopen, but if Zuriel ever wants a fourth confirmatory data point for "the frozen contract holds on yet another kind of corpus," this dossier is ready-made evidence that it does.
