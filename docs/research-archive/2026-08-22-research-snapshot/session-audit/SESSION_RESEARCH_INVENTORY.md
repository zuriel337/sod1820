# SOD1820 — SESSION RESEARCH PERSISTENCE AUDIT
Full Inventory Before Close. AUDIT + PERSISTENCE PLAN ONLY — 0 writes to canon, 0 promotions, 0 aliases, 0 edges, 0 schema changes, 0 deploy. No research re-run; no results regenerated (all figures below are read from existing files/live counts already produced this session).

---

## 0. GOVERNANCE / LIVE-FIRST

- **`CLAUDE.md`, `SOD1820_MASTER_STATE.md`** re-read (repo root, unchanged since last check this session).
- **`SOD1820_MASTER_ROADMAP.md` — DRIFT CONFIRMED, STILL UNRESOLVED, NOT fixed in this task.** Re-verified live: `origin/main` = `9b68639` (Roadmap v5 canonical), local checked-out branch `claude/gematria-normalize-v1-31748` HEAD = `0cf88fa`, **10 commits behind `origin/main`**, and its checked-out `SOD1820_MASTER_ROADMAP.md` still self-labels **"v4 (קנוני)"**. This is the identical drift reported at the end of Hebrew Identity Phase 2 — nothing has changed, nothing was touched. Per instruction: reported, not resolved, not worked around by editing files in this task.
- **30 most recent `work_log` rows** re-read live. No new memo from any other agent since this session's own most recent entries — nothing pending to reconcile.
- **Active rules / `project_codex`** re-checked for a session-persistence or archival rule — **none exists** (`rule_id`/`label` search for session/persist/archive found only `preserve_linked_row` and `archive_and_teder_axis`, neither applicable). `project_codex` does hold a precedent worth noting: a prior session-summary entry (`session_2026_06_14`, priority 3) and an architecture-draft entry (`sod1820-master-architecture-draft`, priority 5) — proof that **codex already has a slot for exactly this kind of durable narrative artifact**, used elsewhere in the project.
- **Live Supabase row counts, re-verified at the top of this audit** (compare against every count taken earlier in this session — all unchanged, confirming zero writes occurred):

| Table | Live count |
|---|---:|
| `gematria_words` | 15,433 |
| `word_aliases` | 7 |
| `nodes` | 5,889 |
| `edges` | 5,100 |
| `research_objects` | 124 |
| `research_contributions` | 372 |
| `topic_cards` | 212 |
| `gematria_methods` (active) | 13 |
| `work_log` | 1,306 |

**Every one of these counts is identical to every count taken at any earlier point in this session.** This is direct, live proof — not an assumption — that this entire multi-phase research arc (Numeric Language, Methods Expansion, Words/Names/Aliases, Corpus Expansion, Hebrew Identity, and the earlier Corpus-DNA/Master-Classification arc) never wrote to a single canonical table. `work_log`'s growth (1,306 rows, up from whatever it was at session start) is the *only* live footprint, and it is provenance/memo text, not the datasets themselves.

---

## 1. FULL INVENTORY

**42 distinct research artifacts identified** (grouping ~90 intermediate/scratch files — raw JSON batches, per-batch SQL, Python build scripts, superseded early drafts — under their final/superseding deliverable rather than listing each individually; every grouped file is named in the relevant row's `notes`). Full detail in `SESSION_RESEARCH_INVENTORY.csv` (one row per artifact, all 14 required columns). Status breakdown:

| Status | Count |
|---|---:|
| SCRATCHPAD_ONLY | 27 |
| PARTIALLY_PERSISTED | 9 |
| SUPERSEDED | 6 |
| PERSISTED | **0** |
| UNKNOWN | 0 |

**Zero artifacts are fully PERSISTED.** The 9 PARTIALLY_PERSISTED rows have their headline decision/finding captured in `work_log` prose, but never the underlying dataset. The 6 SUPERSEDED rows are safely absorbed into a later, kept artifact (early classification drafts → `MASTER_CLASSIFICATION_v3.csv`; step-files → the same).

Two distinct "eras" of this session are covered:
- **Era 1 — Corpus DNA / Master Classification arc** (Aug 21 – Aug 22 early morning): full-corpus classification, WhatsApp intake audits, Method Mentions Phases 2–3, Research DNA v1 architecture proposal. 26 artifacts.
- **Era 2 — Numeric Language / Identity arc** (this conversation's directly-visible portion): Numeric Language Phases 1–5, Strong Numbers sheet, Methods Expansion Phase 1, Words/Names/Aliases Phase 1, Corpus Expansion Phase 1 + Gate Correction, Hebrew Identity Phase 2. 16 artifacts.

**Critical cross-era dependency found:** four Era-1 files (`METHOD_MENTIONS_CLASSIFIED.csv`, `METHOD_CLAIMS_PHASE3.csv`, `numeric_word_phrases_audit.csv`, `year_time_audit.csv`) were **actively re-read and reused as primary source data** by Era-2 phases (Methods Expansion Phase 1, Numeric Language Phase 5). Losing any of these four breaks re-traceability of the Era-2 findings that depended on them, not just the Era-1 findings themselves.

---

## 2. EXPLICIT ANSWERS (§5 of the instruction)

### א. אילו רשימות בנינו בסשן?
At minimum: 6 WhatsApp-intake candidate/classification lists (era 1); 6 classification-component batches + 3 Master Classification merge versions (era 1); 2 Human-Gate conflict/enrichment lists + 1 closing list + 1 gaps list (era 1); `METHOD_MENTIONS_CLASSIFIED`/`_HUMAN_GATE` (era 1, 796+240 rows); `METHOD_CANDIDATES_RESOLVED`/`METHOD_MISMATCH_PATTERNS`/`METHOD_CLAIMS_PHASE3` (era 1); `numeric_word_phrases_audit`/`year_time_audit` (era 1, 570+111 rows, reused live in era 2); `messiah_research_package_full` (era 1, 1,467 rows); `MULTIDIM_TEST_EXAMPLES` (era 1, 20 rows); the 61-anchor union list, the Phase-1 anchor findings, the Phase-2/3 cross-anchor network path lists, the Phase-4 100-number representative sample, the Phase-4 63-number research-interest set, the Phase-4/Addendum path lists (290+120 rows), the Phase-4 control baseline (160 rows), the 50-number Strong Numbers list + its 1,300-value method sheet, the 570-row Phase-5 words→numbers reconciliation + its 22-row Human-Gate subset + its 120-row findings list, the 39-row Methods Expansion resolution, the 35-case Words/Names/Aliases proof table, the 18-row Corpus Expansion decision matrix, the 29-row/14-family Hebrew Identity families table + its 10-row Human-Gate subset. **All of the above are enumerated with full detail in `SESSION_RESEARCH_INVENTORY.csv`.**

### ב. אילו "עולמות"/categories/sets בנינו או גילינו?
- The A–F candidate-type taxonomy for lexical intake (`NEW_CANONICAL_WORD`/`SPELLING_VARIANT`/`TRANSLITERATION`/`TRANSLATION`/`SHARED_VALUE_ONLY`/`TITLE_OR_EXPANDED_NAME`) — Corpus Expansion Phase 1.
- The 6-value `relation_class` taxonomy for identity families (`spelling_variant`/`same_referent_candidate`/`title_or_epithet`/`relational_phrase`/`shared_value_only`/`unresolved`) — Hebrew Identity Phase 2.
- The parse-type taxonomy A–F for numeric-word phrases (`digit_sequence`/`cardinal_number`/`ordinal_quantity`(not populated)/`year_expression`/`mixed_numeric_phrase`/`ambiguous`) — Numeric Language Phase 5.
- Evidence-class models (A–E in Phase 2/3; COMPUTED/CORPUS/GRAPH_DIRECT/GRAPH_ADJACENT/PACKAGE/SOURCE_CLAIM in Phase 4).
- **None of these taxonomies are stored anywhere as a controlled vocabulary/enum in the live DB** — they exist only as conventions inside the CSV column values and the report prose.
- **Zuriel's own "worlds"** (אנשים/גאולה/etc., live `nodes.metadata->>'world'`) were *read and relied upon* (e.g., the FAM-04 דוד/בן דוד classification), never modified.

### ג. אילו רשימות שמות/מילים/identity families בנינו?
`HEBREW_IDENTITY_FAMILIES.csv` (14 families, 29 rows) is the definitive answer — see §7 below for full detail, including the fact that **Zuriel has already reviewed and decided on all 14 in this chat conversation**, and that decision is not yet durably recorded anywhere outside the chat transcript.

### ד. אילו רשימות מספרים/anchors/research-interest numbers בנינו?
The 61-anchor union; the 100-number Phase-4 representative sample; the 63-number research-interest set (111/222/424 + 60 live-discovered); the 50-number Strong Numbers list. See §8 below for full detail and exact file locations — **none recomputed for this audit, all read from existing files**.

### ה. אילו רשימות method candidates בנינו?
Exactly 3, unchanged in status since Era 1: **ר"ת (רת)**, **ס"ת (סת)**, **רגיל ישר והפוך** — all three `REMAIN_CANDIDATE`, per `METHOD_EXPANSION_RESOLUTION.csv` (era 2, which re-tested and reconfirmed era 1's `METHOD_CANDIDATES_RESOLVED.csv`). See §6.

### ו. איפה כל אחת מהן נמצאת כרגע?
100% of the above: **scratchpad only** (`/tmp/.../scratchpad/*.csv|*.md|*.json`), except where explicitly marked PARTIALLY_PERSISTED in the CSV (headline decision text only, in `work_log`).

### ז. מה מהן ייעלם מעשית כאשר ה-scratchpad לא יהיה זמין?
**Everything not already delivered to Zuriel as a downloaded file, and everything not already summarized in `work_log` prose, disappears completely.** The `work_log` summaries preserve *decisions and headline numbers* but not row-level data — a future agent could not reconstruct, e.g., the exact 100-number Phase-4 sample or the 29-row Hebrew Identity family table from `work_log` alone. See the Persistence Gap Report for the precise AT-RISK list.

---

## 6. METHODS — separation preserved exactly as the research left it

| Tier | Methods |
|---|---|
| **Live, verified, in the active registry** | The 13 `gematria_methods` where `active=true and function is not null`: רגיל, מילוי, מסתתר, קדמי (displayed "משולש"), ריבוע, גדול, סידורי, אתבש, אלבם, אטבח, אותיות אחרי, אותיות לפני, משולש גדול. **Unchanged all session — re-verified live at the start of every single phase, never assumed.** |
| **Reconstructed** | **None.** No candidate this session reached `reconstructed` status per the locked `method_lifecycle` rule. |
| **Candidate (unchanged, per `METHOD_EXPANSION_RESOLUTION.csv`)** | **ר"ת (רת)** — one coincidental-looking single-example fit found (id `18207155`, value 337) but explicitly NOT elevated; the 644/צמח-דוד anchor cluster remains unexplained by any tested hypothesis. **ס"ת (סת)** — one coincidental fit (value 590), weaker than ר"ת, no anchor cluster; live evidence suggests the recurring value 1335 is a Daniel 12:12 citation, not a computed value. **רגיל ישר והפוך** — zero testable examples in the corpus; correctly never tested (no hypothesis fabricated). |
| **Unresolved historical method labels** | Same three as above — `METHOD_CANDIDATES_RESOLVED.csv` (era 1) independently reached `insufficient_definition` for all three before era 2 re-tested them live and reached the identical conclusion with additional evidence. Two independent passes agree. |
| **Rejected/unsupported hypotheses** | The standard textbook readings tested this session — ר"ת = first-letter acronym, ס"ת = last-letter acronym — are **not rejected outright** (each explains exactly one row) but are **disconfirmed as general definitions** for the label as used in this corpus (fail on 5/6 and 12/13 testable rows respectively, including the strongest anchor cluster). This is a nuanced "tested and found insufficient," not a blanket rejection. |

**No artificial target of 25 (or any other number) of methods was assumed or referenced anywhere this session.** The only counts used were live re-verifications of the actual `gematria_methods` registry (13 active) — every phase re-checked this number fresh rather than reusing a remembered figure, per the locked `canonical_methods_registry_law`.

## 7. IDENTITY / NAMES — full inventory, not just the 6 named pairs

The 6 pairs named in the instruction, plus everything else `HEBREW_IDENTITY_FAMILIES.csv` (14 families / 29 rows) actually contains:

| Pair/family | relation_class (as the research left it) | Zuriel's chat decision (this conversation, NOT yet durably logged) |
|---|---|---|
| דוד ↔ דויד | spelling_variant, HIGH | **APPROVED** |
| צמח דוד ↔ צמח דויד | spelling_variant, HIGH | **APPROVED** |
| אהרן ↔ אהרון | spelling_variant, HIGH | **APPROVED** |
| חשך ↔ חושך | spelling_variant, HIGH | **APPROVED** |
| נצחון ↔ ניצחון | spelling_variant, HIGH | **APPROVED** |
| תהלים ↔ תהילים | spelling_variant, HIGH — but both sides already have independent `node_id`s live | **HELD BACK explicitly** — node-duplication must be resolved first |
| דוד ↔ דוד המלך | title_or_epithet | not part of the approval batch; still open |
| דוד ↔ בן דוד | relational_phrase (world=אנשים vs world=גאולה live evidence) | **APPROVED as relational-only, explicitly NOT same-identity** |
| אליהו ↔ אליה | unresolved (genuine ambiguity: name-short-form vs. the preposition "to her") | **left unresolved, as designed** |
| דוד ↔ דודי | unresolved (grammatically "my beloved/uncle," numerically distinguishable via מסתתר) | **left unresolved, as designed** |
| אהרן ↔ הרן | unresolved/rejected (different biblical figures — Aaron vs. Haran) | **rejected/no-action, as designed** |
| אסתר ↔ סתר | unresolved/rejected (different words — Esther vs. "secret") | **rejected/no-action, as designed** |
| דוד ↔ דד | unresolved/rejected (different words — David vs. archaic "breast") | **rejected/no-action, as designed** |
| בנק / נקב / צמח דוד = 152 | shared_value_only (negative control) | **rejected/no-action, as designed** (confirms the control, not a candidate) |

**No spelling_variant or identity relation has been made canonical anywhere.** `word_aliases` is still 7 rows, live-reconfirmed at the top of this audit. **Zuriel's approval of 5 families + the relational classification of a 6th exists only in this chat conversation** — this is the single most time-sensitive gap this audit found (see Persistence Gap Report, Group C).

## 8. NUMERIC LANGUAGE — full artifact list, none recomputed

All read from existing files, not regenerated:
- **61-anchor validation**: `anchor_union.csv` (61 rows) + `NUMERIC_LANGUAGE_ANCHORS.csv`/`_PHASE1_REPORT.md` (Phase 1) → `NUMERIC_CROSS_ANCHOR_NETWORK.csv`/`_REPORT.md` (Phase 2) → `NUMERIC_LANGUAGE_NETWORK_V1.csv`/`_REPORT.md` (Phase 3, final anchor-only network, decision NOT YET).
- **Representative sample**: `NUMERIC_LANGUAGE_PHASE4_SAMPLE.csv` (100 numbers, 5 strata).
- **Research-interest set**: `NUMERIC_LANGUAGE_RESEARCH_INTEREST_SET.csv` (63 numbers: 111, 222, 424 explicit seeds + 60 live-discovered).
- **Path lists**: `NUMERIC_LANGUAGE_PHASE4_PATHS.csv` (290 combined) + `NUMERIC_LANGUAGE_RESEARCH_INTEREST_PATHS.csv` (120) + `NUMERIC_LANGUAGE_PHASE4_CONTROL.csv` (160, control baseline).
- **Method matrices**: `NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md` (50 numbers × 2 word-forms × 13 methods = 1,300 live-computed values).
- **The specific numbers named in the instruction** — 111, 222, 424, 45, 75, 148, 216, 474, 776, 1237 — are all present as explicit seeds/anchors across the above files (111/222/424 in the research-interest set as Zuriel-designated seeds; 45/75/148/216/474/776/1237 among the 61 anchors and/or the 50 Strong Numbers). **1820** also appears throughout (special-number cut in the Strong Numbers sheet, and as a repeated gematria hit in Numeric Language Phase 5's Human-Gate list, e.g. the Exodus 12:6 lamb-verse fragment).
- **Final decision status, unchanged**: general Numeric-Language-as-a-feature = **NOT YET**; research-amplification-for-research-interest-numbers = **YES, provisional**. Neither has been acted on — `research_objects`/`topic_cards` counts are unchanged (124/212).

## 3. FULL CSV
See `SESSION_RESEARCH_INVENTORY.csv` — 42 rows × 14 columns (`artifact_name, task_or_phase, file_path, exists_now, row_count, what_it_contains, status, already_persistent_where, scratchpad_only, canonical_or_candidate, human_gate_required, recommended_existing_destination, risk_if_session_closes, notes`).

---

## STOP
Audit + inventory only. 0 canonical promotions, 0 aliases, 0 identity edges, 0 method-registry changes, 0 publication, 0 schema changes, 0 deploy performed in this task. See `PERSISTENCE_GAP_REPORT.md` and `PROPOSED_PERSISTENCE_PASS.md` for the risk grouping and the proposed (not executed) write plan.
