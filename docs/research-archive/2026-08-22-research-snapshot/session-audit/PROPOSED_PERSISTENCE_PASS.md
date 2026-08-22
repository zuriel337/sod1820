# SOD1820 — PROPOSED PERSISTENCE PASS
"Save the research — do not promote it." NOTHING IN THIS DOCUMENT HAS BEEN EXECUTED. Proposal only, pending Zuriel's approval, per instruction §10–§11.

**Governing principle throughout:** use existing structures (`research_objects`, `research_contributions`, `word_aliases`, `project_codex`, or a plain versioned file committed into the repo) — no new table proposed anywhere below unless explicitly marked `NO SAFE EXISTING HOME`. Every write type listed is `INSERT ... status='candidate'` (or the file/repo equivalent — a commit, not a merge to `main`) — never `UPDATE` to an existing canonical row, never `verified=true`, never a promotion.

**Two blockers must close before ANY of this executes** (per Zuriel's own prior message, re-confirmed here, not re-litigated):
1. Any new branch for this work forks from a freshly-pulled `origin/main` (Roadmap v5), not the stale local branch this research ran on.
2. A fresh live `word_aliases` schema/constraint check runs immediately before the first insert of that kind — not reused from an earlier read.

---

## Immediate (§11 backup step) — before anything else

**Every artifact in Group B of the Persistence Gap Report should first be copied into a durable location the repo/workspace controls — not left solely in the ephemeral scratchpad — before any DB write is even considered.** The lowest-risk, zero-schema-impact way to do this: a single new directory in the repo (e.g. `docs/research-archive/2026-08-22-session/`) holding verbatim copies of the ~30 final CSV/MD deliverables (not the ~90 superseded intermediates). This is a **git commit**, not a DB write — still requires Zuriel's explicit go-ahead per this session's own standing instruction ("במשימה הנוכחית אל תעשה commit אלא אם קיבלת אישור מפורש"), and per the general rule that commits happen on request, not proactively. **Proposed, not executed.**

---

## Per-dataset persistence plan (Group B + Group C item 1, ranked as in the Gap Report)

### 1. `MASTER_CLASSIFICATION_v3.csv` (15,433 rows)
- **SOURCE ARTIFACT:** `MASTER_CLASSIFICATION_v3.csv`
- **→ EXISTING DESTINATION:** `NO SAFE EXISTING HOME` for the full 28-column richness as structured data. `research_contributions` (one row per `gematria_words.id`, `intent='מקור'` or the proposed `lexical_identity`, `gematria_claim` jsonb holding the row's classification) could hold it without a schema change, but at 15,433 rows this is a genuinely large write, not a quick save — flagged, not assumed safe by default.
- **→ STATE/STATUS TO PRESERVE:** every row's `corpus_role`/`world_theme`/flags stay exactly as classified — `status='candidate'`, never promoted.
- **→ PROVENANCE TO PRESERVE:** `source_ref` = the originating `gematria_words.id`; `contributor`/`source` = "MASTER_CLASSIFICATION_v3, session 2026-08-22".
- **→ HUMAN GATE?** YES — both on the destination choice (Gap Report Group C #3) and before any 15,433-row write.
- **→ WRITE TYPE REQUIRED:** none yet — destination undecided. If/when decided: bulk `INSERT` into the chosen table, `status='candidate'` throughout.

### 2. `METHOD_MENTIONS_CLASSIFIED.csv` + `METHOD_CLAIMS_PHASE3.csv` (796–797 rows each)
- **→ EXISTING DESTINATION:** `research_objects` (`kind='hypothesis'` for claimed-value rows, `kind='observation'` for mismatch rows), keyed by the existing row `id`.
- **→ STATE TO PRESERVE:** `verification_state`/`method_claim_status` exactly as classified; `status='candidate'`.
- **→ PROVENANCE:** `source`/`source_ref` = original phrase + corpus source string; `engine_verified`/`engine_detail` = the `has_engine_verified_mismatch/match` fields, carried over verbatim.
- **→ HUMAN GATE?** YES (per instruction §9, awaiting_human_review status already recorded in `work_log`).
- **→ WRITE TYPE REQUIRED:** bulk `INSERT` into `research_objects`, `status='candidate'`.

### 3. `numeric_word_phrases_audit.csv` + `year_time_audit.csv` (570 + 111 rows)
- **→ EXISTING DESTINATION:** `research_contributions` (`intent='מקור'`/`gematria`, `target_type='number'` where a `parsed_numeric_value` exists).
- **→ STATE TO PRESERVE:** `category` (mixed_numeric_phrase/ambiguous/numeric_quantity/numeric_sequence) and `confidence` exactly as tiered.
- **→ PROVENANCE:** `source`/`vip_source` columns carried verbatim.
- **→ HUMAN GATE?** YES for the 22-row curated Human-Gate subset specifically (`NUMBER_WORDS_AMBIGUOUS.csv`); the rest is candidate-tier, reviewable at leisure.
- **→ WRITE TYPE REQUIRED:** bulk `INSERT`, `status='candidate'`.

### 4. Numeric Language Phase 4 datasets (`_SAMPLE.csv`, `_RESEARCH_INTEREST_SET.csv`, path/control files)
- **→ EXISTING DESTINATION:** `research_objects` (`kind='observation'` for the sample composition itself, `kind='relation'` for each real path).
- **→ STATE TO PRESERVE:** `evidence_class` (A/B/E), `mechanical_duplicate` flags — never collapse the mechanical/real distinction.
- **→ PROVENANCE:** `engine_detail` = the live method values recorded at generation time (already captured, not re-computed).
- **→ HUMAN GATE?** YES — decision is NOT YET; nothing here should look more settled than that.
- **→ WRITE TYPE REQUIRED:** bulk `INSERT`, `status='candidate'`.

### 5. Numeric Language Phase 5 (`NUMBER_WORDS_RECONCILED.csv` + `_AMBIGUOUS.csv` + `_RESEARCH_FINDINGS.csv`)
- **→ EXISTING DESTINATION:** `research_contributions` for the 22-row curated Human-Gate list specifically (`intent='מקור'`, `target_type` = the verse/phrase); `research_objects` for the broader 570-row reconciliation.
- **→ STATE TO PRESERVE:** `roundtrip_status`, `parse_confidence` exactly as computed.
- **→ PROVENANCE:** original corpus `source` field, carried verbatim (e.g. "auto:תיעוד אירועים wp16571").
- **→ HUMAN GATE?** YES, explicitly for the 22-row list (theological/gematria-coincidence questions, e.g. the Shema fragment).
- **→ WRITE TYPE REQUIRED:** bulk `INSERT`, `status='candidate'`, the 22-row subset flagged for priority review.

### 6. `HEBREW_IDENTITY_FAMILIES.csv` + Zuriel's chat decision — HIGHEST PRIORITY
- **→ EXISTING DESTINATION:** `word_aliases` (`alias_type='spelling_variant'`) for the **5 approved-and-ready** families (דוד↔דויד, צמח דוד↔צמח דויד, אהרן↔אהרון, חשך↔חושך, נצחון↔ניצחון); **nothing** for תהלים↔תהילים until the node-duplication is separately resolved; a `research_objects` `kind='relation'` row (NOT `word_aliases`, since it is explicitly non-identity) for דוד↔בן דוד.
- **→ STATE TO PRESERVE:** `verified=false`/`is_primary=false` on every new `word_aliases` row — Zuriel's chat approval authorizes creating the *candidate* alias row, not flipping it to verified.
- **→ PROVENANCE:** `source='zuriel-chat-2026-08-22'`, `method='spelling_variant (מלא/חסר)'`, referencing this session's Hebrew Identity Phase 2 report.
- **→ HUMAN GATE?** Already cleared by Zuriel in chat for 6 of 8 decided items — but **the two pre-write blockers (Roadmap base branch, live schema check) still gate the WRITE itself**, not the decision.
- **→ WRITE TYPE REQUIRED:** 5× `word_aliases` `INSERT` (spelling_variant, unverified) + 1× `research_objects` `INSERT` (relation, candidate) for בן דוד. **This is the one item in this whole pass with an actual green-lit decision behind it — everything else below and above is still awaiting review.**
- **Interim, zero-risk step available right now, inside THIS audit's own closing memo:** log Zuriel's decision text in `work_log` (provenance/memo, not a canonical write) so the decision itself cannot be lost even before the schema/branch blockers close. Done as part of this task's closing memo, below.

### 7. `messiah_research_package_full.csv` (1,467 rows)
- **→ EXISTING DESTINATION:** `NO SAFE EXISTING HOME` confirmed without knowing Zuriel's original intent (Gap Report Group C #4) — could be `topic_cards` or `research_contributions` depending on purpose.
- **→ HUMAN GATE?** YES.
- **→ WRITE TYPE REQUIRED:** none proposed until intent is clarified.

### 8. `NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md` (1,300 values)
- **→ EXISTING DESTINATION:** the underlying generated Hebrew phrases not already in `gematria_words` could seed ordinary type-A `gematria_words` inserts (no relation claim, per the already-proven `gematria_auto_registry_law` path) — auto-computed by the existing `gw_enforce_engine` trigger, needing no candidate-review at all for the bare phrase+value pair. The curated "Strong Numbers" *selection logic* itself has `NO SAFE EXISTING HOME` as a reusable list.
- **→ HUMAN GATE?** NO for plain phrase registration (per existing law); N/A for the curated list (informational).
- **→ WRITE TYPE REQUIRED:** optional, low-priority `gematria_words` inserts for any generated phrase not already present.

### 9. `METHOD_EXPANSION_RESOLUTION.csv` (39 rows)
- **→ EXISTING DESTINATION:** `research_objects` (`kind='hypothesis'`, one row per candidate-label × source-row, `status='candidate'`), matching `method_lifecycle`'s own explicit provenance requirement ("כל ניסיון+תוצאה נרשם").
- **→ STATE TO PRESERVE:** `lifecycle_status` exactly (`reconstructed_single_example`/`insufficient_definition`/`unresolved_historical_method`) — never rounded up to `reconstructed` or `verified`.
- **→ PROVENANCE:** the tested acronym string + which of the 13 methods matched, verbatim.
- **→ HUMAN GATE?** NO further action needed — decision already `REMAIN_CANDIDATE`; this is pure archival.
- **→ WRITE TYPE REQUIRED:** bulk `INSERT`, `status='candidate'`.

### 10–14. Remaining Group-B items (`WORDS_NAMES_IDENTITY_PROOF.csv`, `CORPUS_EXPANSION_INTAKE_SPEC.md`+matrix, `RESEARCH_DNA_ARCHITECTURE.md`+`PROOF_OF_MODEL.md`, `NUMERIC_LANGUAGE_PHASE4_REPORT.md`, and the remaining CSVs listed in the Gap Report)
- **→ EXISTING DESTINATION:** narrative/architecture documents (the `.md` files) → **`project_codex`**, following the direct precedent already live there (`session_2026_06_14`, `sod1820-master-architecture-draft`). Structured CSVs with no better fit → `research_objects`/`research_contributions` as above, or the same repo-archive-directory backup step if a table write isn't wanted yet.
- **→ HUMAN GATE?** YES for all (architecture/design decisions).
- **→ WRITE TYPE REQUIRED:** `project_codex` `INSERT` (new slug per document) for the `.md` files; `research_objects`/`research_contributions` `INSERT` for the CSVs.

---

## Summary table

| Priority | Dataset | Destination | Gate |
|---|---|---|---|
| 1 (most time-sensitive) | Hebrew Identity — 5 approved families + בן דוד | `word_aliases` (5×) + `research_objects` (1×) | Zuriel already decided in chat; blocked only by the 2 pre-write technical blockers |
| 2 | `MASTER_CLASSIFICATION_v3.csv` | undecided — Human-Gate first | YES |
| 3 | `METHOD_MENTIONS_CLASSIFIED`/`_CLAIMS_PHASE3` | `research_objects` | YES |
| 4 | `numeric_word_phrases_audit`/`year_time_audit` | `research_contributions` | YES (22-row subset priority) |
| 5 | Numeric Language Phase 4 datasets | `research_objects` | YES |
| 6 | Numeric Language Phase 5 datasets | `research_contributions`/`research_objects` | YES (22-row subset priority) |
| 7 | `messiah_research_package_full.csv` | undecided | YES |
| 8 | Strong Numbers sheet | `gematria_words` (type-A only) | NO for bare registration |
| 9 | Methods Expansion resolution | `research_objects` | NO (archival only) |
| 10+ | Architecture/design docs | `project_codex` | YES |

---

## STOP
Nothing above has been executed. 0 canonical promotions, 0 aliases, 0 identity edges, 0 method-registry changes, 0 publication, 0 schema changes, 0 deploy. Closing `work_log` memo follows, including Zuriel's chat decision as provenance text (not a canonical write).
