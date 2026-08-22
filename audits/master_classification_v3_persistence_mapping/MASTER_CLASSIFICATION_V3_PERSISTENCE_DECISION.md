# MASTER_CLASSIFICATION v3 → Persistence Mapping — Phase 1 — Decision Summary

**READ-ONLY. 0 DB writes, 0 schema changes, 0 aliases, 0 edges, 0 canonical promotions, 0 changes to `gematria_words`, 0 deploy performed in producing this document or its companions.**

Companions: `MASTER_CLASSIFICATION_V3_SCHEMA_PROFILE.md` · `MASTER_CLASSIFICATION_V3_PERSISTENCE_MAP.csv` · `MASTER_CLASSIFICATION_V3_RECONCILIATION.csv` · `MASTER_CLASSIFICATION_V3_VOCABULARIES.csv`.

---

## 1. Scope confirmation

This is Persistence **Mapping**, not a Persistence **Pass**. No new audit or research was performed — the only source of research content used is the already-produced `MASTER_CLASSIFICATION_v3.csv` snapshot (15,433 rows, 29 columns) and the prior session's own `work_log` closures (`61507547`, `491aee81`, `748df2f8`, and the `PROPOSED_PERSISTENCE_PASS.md`/`PERSISTENCE_GAP_REPORT.md` documents it left behind). This phase's job was to map, reconcile, and classify — never to decide a destination unilaterally or write anything.

## 2. Column count breakdown

- **29 columns total** in `MASTER_CLASSIFICATION_v3.csv`.
- **2 direct-fit** (already live, verified 100% identical to the corresponding `gematria_words` column for every row): `id`, `phrase`. Plus `source` is also a 100%-verified exact match to the live column, but is tagged PROVENANCE rather than a new "fit" — it proves lineage, not new information. So: **3 columns need zero write** (id, phrase, source) because they already exist and already match.
- **~18 columns require transform / belong in the research layer** (`corpus_role`, `primary_confidence`, `display_recommendation`, `research_package_cluster`, `research_package_availability`, `research_package_sensitivity`, `source_claim_rule`, `method_mention_type`, `method_claim_status`, `method_claim_reason`, `candidate_method_dependency`, `historical_method_convention`, `numeric_word_category`, `numeric_word_value`, `numeric_instruction_suffix`, `year_hebrew`, `year_gregorian`, `yeartime_category`, `temporal_expression_flag`) — no existing `gematria_words` column holds their vocabulary; most correlate with but do not equal existing fields (`dna_status`, `is_verified`, `visibility_tier`).
- **~5 are archive-only / already-closed provenance**, not needing any new destination (`duplicate_flag`, `garbage_broken_flag`, `ambiguity_unresolved_flag`, `conflict_detail`, and `normalization_state` which is a build-pipeline artifact, not project data).
- **1 has no safe existing home and undefined meaning**: `landmark_target_flag` (5 rows) — needs Zuriel's clarification before any destination is even proposed.
- **1 is a dead/empty column**: `world_theme` (0/15433 populated) — the live `gematria_words.world` already covers this ground for 1341 rows and is richer than anything v3 offers here.

So: **3 direct-fit · ~18 transform/research-layer · ~6 archive-only-or-dead · 1 no-safe-home/undefined.** (Full per-column detail with exact counts in `MASTER_CLASSIFICATION_V3_PERSISTENCE_MAP.csv`.)

Two columns (`research_package_cluster`, `year_hebrew`/`year_gregorian`) are flagged as **relationships, not attributes** — per the no-flattening instruction, these belong in the graph (`nodes`/`edges`) once reviewed, never as new `gematria_words` columns.

## 3. Row-level 1:1 mapping to `gematria_words`

**Yes — confirmed, exhaustively.** All 15,433 CSV rows map 1:1 to `gematria_words.id`:
- Exact set equality between CSV ids and live `gematria_words` ids (0 missing either direction, 0 duplicates in either set, 0 ambiguous joins — the join key is a primary key on both sides).
- Cross-verified independently via `phrase` (100% string match, 15433/15433) and `source` (100% string match, 15433/15433) for the same `id` — the join is matching real, correct rows, not coincidental UUID overlap.

This confirms the prior session's own `work_log 61507547` claim of "15,433/15,433 coverage" and extends it with a fresh, independent verification against the *current* live table rather than a point-in-time export.

## 4. Real conflicts found against the live DB

**No hard contradictions** were found — no case where a v3 column asserts something the live DB data directly falsifies as fact. What was found instead:

1. **`corpus_role` (v3, 11 values) does not collapse into `dna_status` (live, 4 values).** E.g. live `dna_status='promoted'` (7274 rows) maps to *three* different `corpus_role` values (research_vocabulary=7136, thematic_corpus=108, research_package=27) plus 2 more to public_core. The two taxonomies coexist as non-redundant classification layers — not a conflict, but a real open design question (see §5).
2. **`world_theme` is 100% empty** in v3 while live `gematria_words.world` is populated for 1341 rows across 5 real values. v3 simply never captured this — a dead column, not a conflict.
3. **`v3.duplicate_flag` (2 rows) does not match the 2 real live phrase-duplicate pairs** found independently in this reconciliation (`דויד בן ישי עבדך אליהו הנביא בית מקדש ∆` and `בראשית (ב ∆ ישר והפוך)`, each appearing under 2 different ids). v3's "duplicate" concept is internal to its own multi-batch build merge — do not conflate the two.
4. **Soft tension, not a contradiction:** the one row v3 flags `ambiguity_unresolved_flag=yes` (`יהוה בעת ההיא`) has live `is_verified=TRUE` — but these measure different things (classification-ambiguity vs. engine-verified gematria value), and this exact row was already named the sole `genuinely_unresolved` item in the prior session's own Step-2 closure (`work_log 491aee81`) — not a new finding.
5. **`primary_confidence` correlates with but does not equal `is_verified`.** `high` confidence rows are `is_verified=True` 99.8% of the time (strong signal) but `medium` confidence splits 64%/36% — not a clean re-derivation of one from the other.

Full detail of every check performed, with counts, is in `MASTER_CLASSIFICATION_V3_RECONCILIATION.csv`.

## 5. Is a new schema required?

**NOT YET.**

- Nothing in this mapping requires an immediate `ALTER TABLE` on `gematria_words` or any other core table. The columns that don't fit anywhere existing (`corpus_role`, `research_package_*`, `method_*`, `numeric_word_*`, `year_*`) all have a plausible **research-layer** home in the already-existing `research_objects` / `research_contributions` tables (several with strong structural fits — e.g. `method_claim_status='engine_verified'` → `research_objects.engine_verified` boolean; `numeric_word_value` → `research_objects.value` integer) — exactly the destination the prior session's own `PROPOSED_PERSISTENCE_PASS.md` already proposed and left unexecuted.
- Two column-families (`research_package_cluster`; `year_hebrew`/`year_gregorian`) are **relationships**, not attributes, and belong in the graph (`nodes`/`edges`) once reviewed — again, no schema change, just correct table usage.
- The one open question that *could* eventually motivate a schema change — whether `corpus_role` should become a first-class `gematria_words` column alongside (or replacing) `dna_status` — is a Human-Gate design decision, not a technical necessity, and is explicitly **not decided here**.

## 6. Minimal safe persistence write, if/when authorized

This phase performs none of this — it is named only so the next authorized step is unambiguous:

1. **Smallest, least controversial:** the 32-row `method_claim_status='engine_verified'` subset → `research_objects` (`kind='observation'`, `engine_verified=true`, `target_type='word'`, `target_id=gematria_words.id`, `status='candidate'`). These are the only rows in the entire 15,433-row file already described as run through the official engine.
2. **Next:** the remaining 764 rows of the `method_mention_type`/`method_claim_status`/`method_claim_reason` family → `research_objects` (`status='candidate'`, `engine_verified=false` unless individually checked), per the prior session's own unexecuted plan.
3. **Everything else** (`corpus_role` for all 15,433 rows, `research_package_*`, `numeric_word_*`, `year_*`) stays **NOT YET** pending Zuriel's decision on: (a) whether `corpus_role` gets its own destination distinct from `dna_status`, and (b) whether the graph-shaped columns (`research_package_cluster`, `year_*`) get built as edges now or wait.

No write of any kind was performed in this phase. This section is a recommendation for the *next* authorized phase, not an action taken.

## 7. What this phase deliberately did not do

Per the task's explicit STOP conditions: 0 DB writes, 0 schema changes, 0 `word_aliases` rows, 0 `edges`, 0 canonical promotions, 0 changes to `gematria_words`, 0 deploy. No `work_log` memo was inserted for this task (per explicit instruction — this is a pure read + file-output pass, not a session closure).
