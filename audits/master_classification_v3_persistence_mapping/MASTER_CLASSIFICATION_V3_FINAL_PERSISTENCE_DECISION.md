# MASTER CLASSIFICATION v3 — FINAL PERSISTENCE DECISION PACK

**READ-ONLY. 0 DB writes performed in producing this document (except the one permitted closing `work_log` memo, inserted separately after this pack). 0 schema changes. 0 canonical promotions. 0 `gematria_words` changes. 0 edges. 0 aliases. 0 deploy.**

This is the third and final pass of a three-step chain: (1) Schema Profile + Persistence Map + Reconciliation + Vocabularies (already-produced companions in this directory), (2) this Decision Pack. It does not re-run discovery — it closes the decision using those companions, the raw v3 snapshot, the live schema/data, and SOD1820's governance documents. It also runs one class of fresh, narrow verification the prior pass did not: **re-running the live canonical engine (`fn_ragil`) against the 32 `engine_verified` rows exactly as they sit in `gematria_words` today** — this is verification against existing structures (permitted), not a new discovery audit.

Companions: `MASTER_CLASSIFICATION_V3_SCHEMA_PROFILE.md` · `MASTER_CLASSIFICATION_V3_PERSISTENCE_MAP.csv` · `MASTER_CLASSIFICATION_V3_RECONCILIATION.csv` · `MASTER_CLASSIFICATION_V3_VOCABULARIES.csv` · `MASTER_CLASSIFICATION_V3_PERSISTENCE_DECISION.md` (all prior pass) · `MASTER_CLASSIFICATION_V3_32_VERIFIED_ROWS_DECISION.csv` · `MASTER_CLASSIFICATION_V3_COLUMN_DESTINATIONS.csv` (this pass).

Governance read before this pack: `CLAUDE.md` · `SOD1820_MASTER_STATE.md` (full, including §8 Metatron-Convergence-FROZEN, §9 Discovery-Engine pipeline, §10 Fact-first/one-tree vision, §16 R1 privacy on `research_objects`, §19-A/B/C γ + Universal Research Contract, §CL change log) · `SOD1820_MASTER_ROADMAP.md` from `origin/main` · 30 most-recent `work_log` rows · active `nodes(type='rule')` · `project_codex`.

---

## 1. 29 columns → 3 persistence classes

Full per-column table (reason / existing-destination-if-C / derivation-if-B / provenance-source / human-gate / loss-if-not-persisted) is in `MASTER_CLASSIFICATION_V3_COLUMN_DESTINATIONS.csv`. Summary:

| Class | Count | Columns |
|---|---|---|
| **A — Archive/Provenance only** | **14** | `id`, `phrase`, `source` (already live/identical — nothing to do), `world_theme` (dead, 0/15433), `normalization_state` (build artifact), `duplicate_flag`, `garbage_broken_flag`, `ambiguity_unresolved_flag`, `conflict_detail` (all 4 already closed in prior `work_log` entries `491aee81`/`ad874cd1`), `display_recommendation` (must never silently apply to `visibility_tier`), `historical_method_convention`, `candidate_method_dependency`, `numeric_instruction_suffix`, `temporal_expression_flag` (all 4 are non-independent flags riding on a C-family parent) |
| **B — Derived Research DNA** | **6** | `primary_confidence` (project live from `is_verified`+`dna_status`+`source` instead of storing v3's frozen tier), `source_claim_rule`, `method_claim_reason`, `yeartime_category` (fold as free text alongside their C-family parent's `evidence`, don't give them their own column), `research_package_availability` (no live entitlement system exists yet to attach it to — derive later from `platform_tiers_law` once built) |
| **C — Persistent Candidate Data** | **9 confirmed-shape, all BLOCKED pending a Human-Gate decision before any actual write** | `corpus_role` (blocked — no existing destination without either a `gematria_words` schema change or a per-row research_objects entry; Zuriel must choose), `method_mention_type`, `method_claim_status` (→ `research_objects.kind`/`.evidence`/`.engine_verified`/`.status` — structurally the best fit in the whole file, see §2 for the critical caveat), `numeric_word_category`, `numeric_word_value` (→ `research_objects.value`, unverified claim, not fact), `research_package_cluster` (blocked — relationship, not attribute; needs graph, but convergence-shaped writes are under a sitewide freeze, §8), `research_package_sensitivity` (→ `research_objects.privacy_scope`, already-live R1 columns), `landmark_target_flag` (blocked — see §5), `year_hebrew`/`year_gregorian` (blocked — relationship, 0 live precedent) |

14+6+9=29. **No column is proposed for an immediate write.** Every C-class column requires either (a) a specific Zuriel Human-Gate decision named in the CSV, or (b) is only reachable as a side-effect of a specific row being written as a `research_objects` candidate (see §6).

---

## 2. The 32 `engine_verified` rows — do NOT treat as `research_objects` by default

Per-row detail: `MASTER_CLASSIFICATION_V3_32_VERIFIED_ROWS_DECISION.csv`.

**What these rows actually are:** raw `excel_import` rows where the `gematria_words.phrase` text itself bundles a subject *and* a self-reported "method + claimed value" annotation in one string (e.g. `"ממשלת האחדות = 1234 רגיל !"`, `"הסוף לזנות = 644 רגיל"`). `source_claim_rule='raw_unparsed_formula_dump'` for most of them. v3 tagged all 32 `method_claim_status='engine_verified'`, `method_claim_reason='engine_verified_match'`.

**The critical finding of this pass (fresh, narrow, permitted verification):**

- Ran the live canonical function `public.fn_ragil(phrase)` against the phrase text exactly as it sits in `gematria_words` today, for all 32 rows, and compared it to (a) the number stored in `gematria_words.ragil` for that row and (b) the number the phrase text itself claims.
- **Result: 31/32 rows show the live engine's output does not match the claimed number at all** (e.g. `"שכינה = רגיל 385 + ∆1438 = 1820"` → live `fn_ragil` = 628, matching none of 385/1438/1820). **The 1 apparent "match" is a stored-column-vs-fresh-engine-recomputation coincidence on the same row's total** — that row's own claimed values (385/1438/1820) still don't match either number.
- **`gematria_words.is_verified = FALSE` for all 32/32 rows, live, no exceptions.** The system's own truth-flag already disagrees with v3's label on every single one of these 32 rows.
- **Conclusion: v3's `method_claim_status='engine_verified'` is not corroborated by the live engine or the live verification flag for any of the 32 rows.** The label most likely reflects the v3 CSV-build pipeline's own text-pattern matching (recognizing a `"<subject> <value> <method-name>"` shape in the raw string), not a genuine re-run of the canonical engine against a properly isolated subject. This is exactly the trap the task named: *mathematical verification (if it happened) verifies the calculation only — it does not verify a historical/interpretive claim* — and here, per fresh evidence, **the calculation itself is also not confirmed** when checked against the row as it actually lives today.
- Isolating a "clean subject" substring from each messy phrase (to test whether the *original author's* claim was correct before it got mixed with formula text) is itself an interpretive/human judgment call about where to cut the string — not a mechanical step this pass performed or should perform unilaterally.

**Per-row classification: all 32 → `NEEDS_HUMAN_DECISION`** (not `RESEARCH_OBJECT_CANDIDATE`, not `CORPUS_METADATA_ONLY`, not `DUPLICATE_EXISTING`, not `DERIVED_ONLY`):
- Not `RESEARCH_OBJECT_CANDIDATE` outright — because the claimed value is not confirmed, and `research_objects.engine_verified=true` must never be written on an unconfirmed claim (`gematria_engine_law`/`verified_value_is_system_data`).
- Not `CORPUS_METADATA_ONLY` — several touch genuine project anchors (`663e6160`/`7973108b`/`f9cd8416`: 1820 · `9f54aeb1`: 1234, the same value as the already-canonical FACT "רשת האינטרנט·רגיל=1234" in MASTER_STATE §10.0 · `86f657b4`: 878, the same value as H-1's own existing test candidate) and deserve a real look, not a shrug.
- `DUPLICATE_EXISTING` = **0/32** — confirmed via live query: `node_id IS NULL` for all 32, and the prior pass's reconciliation already confirmed 0/796 of the wider method-mention family exist in `research_objects` today.
- 2 of the 32 (`8c6c8172` "אני חושב שאני המשיח"=1101, `be3dd4c9` "הכסא שלי") are additionally tagged `personal_or_restricted`/`personal_claim` — messianic self-identification content requiring `privacy_scope='private'`, independent of the math question.

---

## 3. `corpus_role` ≠ `dna_status` — confirmed, two orthogonal dimensions

- **`corpus_role`** (v3, 11 values) says: *what kind of corpus material is this row, according to this specific research-classification pass* — e.g. `research_vocabulary`, `thematic_corpus`, `numeric_word_construct`, `personal_or_restricted`.
- **`dna_status`** (live `gematria_words`, 4 values) says: *where this word sits in the corpus's own internal processing/lifecycle pipeline* — e.g. `promoted`, `appendix`, `dna`, `core`, independent of any v3 audit.
- Confirmed non-collapsing (prior pass's reconciliation): `dna_status='promoted'` (7,274 rows) maps to **3 different** `corpus_role` values (`research_vocabulary`=7,136, `thematic_corpus`=108, `research_package`=27) plus 2 more to `public_core`. No case found where one system's value directly contradicts the other's — they are additive, not conflicting.
- **How Research DNA v1 should show both without merging:** render as two separate, clearly-labeled badges/facets on the same row — e.g. `Pipeline status: promoted` next to `v3 corpus role: research_vocabulary` — never one label, never one overwriting or standing in for the other, and never a UI that lets a viewer read one as if it were the other.
- Neither `corpus_role` nor `dna_status` is changed by this pack.

---

## 4. Worlds

- **`world_theme` (v3) = ARCHIVE_ONLY.** 0/15,433 rows populated — a placeholder column that was never filled during the pass that produced v3. There is nothing to derive and nothing to persist; recommend dropping it from any future persistence write entirely.
- **`gematria_words.world` (live) remains the sole live source of world-taxonomy** — populated for 1,341 rows across 5 real values (גאולה · שמות הקודש · תורה וקודש · חתימות 1820 · ספירות). Nothing in v3 competes with or improves on it.
- **No new taxonomy invented.** This confirms rather than changes the existing structure.

---

## 5. `landmark_target_flag` — 5 rows, provenance found, still `NEEDS_HUMAN_DEFINITION`

All 5 rows (full text + provenance in `MASTER_CLASSIFICATION_V3_COLUMN_DESTINATIONS.csv` and the raw v3 extract) are long phrases naming one of three project-anchor numbers: **1820** (`08b05a76`, `948be4aa`, `de47476a`, `f9cd8416`) or **1237** (`dbb84ea6`). All 5 carry `method_claim_reason='value_is_target_not_result'`.

**Provenance found by tracing this same root's sibling folder** (as the task explicitly permitted for this column): `era1-research-dna-architecture/RESEARCH_DNA_PROOF_OF_MODEL.md`, Case 15, reads this exact flag (same row, `08b05a76`) as marking a **relationship** — *"the phrase claims a connection to the 1820 landmark"* — rather than a **computed value** — *"the phrase computes to 1820."* That document proposes the live destination would be a new `edges` relation-type value (`--targets-->`), confirmed via live query to not currently exist in `edges.relation_type`'s 29-value vocabulary (`contains`/`related`/`mentions`/`equals`/`converges_on`/`cross`/... — no `targets`).

**This is a plausible, textually-consistent reading — but it was authored by a prior AI pass inspecting the data after the fact, not confirmed by Zuriel as the original intent.** The prior schema-profile pass in this chain (step 2) independently called the meaning "not defined anywhere in the snapshot's own docs," which is not quite accurate (this sibling doc does propose a reading) — but "a prior AI's plausible reading" and "Zuriel's confirmed definition" are not the same thing.

**Verdict: `NEEDS_HUMAN_DEFINITION`.** Do not persist, do not create the `targets` edge-type vocabulary entry, until Zuriel confirms (or corrects) this reading in one sentence. Nothing is lost by waiting — full text and both provenance trails are preserved here and in the archive.

---

## 6. The first WRITE

**One minimal, safe write is proposed — deliberately narrower than what the prior pass (step 2) sketched, because §2's fresh finding changes what "safe" means for the 32-row family.**

### Proposed WRITE (pending Zuriel's explicit Human-Gate approval — not executed by this pack)

Insert the 32 rows from `MASTER_CLASSIFICATION_V3_32_VERIFIED_ROWS_DECISION.csv` into **`research_objects`** (existing table, R1-applied, server-only) as **honest, unverified candidates** — not as confirmed engine facts:

```sql
insert into research_objects
  (kind, statement, terms, source, source_ref, evidence, status, engine_verified, privacy_scope, owner_person_id)
select
  'observation',
  phrase_claim_text,
  array[phrase_claim_text],
  'master_classification_v3',
  'gematria_words:' || id,
  '<this row's notes column verbatim — the v3 CSV labeled this engine_verified, but fresh fn_ragil re-verification against the row as it lives today did not confirm the claimed value; needs human/engine re-check on an isolated subject substring before any engine_verified=true or promotion>',
  'candidate',
  false,                                  -- explicitly FALSE, never true, until a real re-check happens
  case when id in ('8c6c8172-...', 'be3dd4c9-...') then 'private' else 'public_candidate' end,
  null
from (32 rows)
where not exists (
  select 1 from research_objects ro
  where ro.source = 'master_classification_v3' and ro.source_ref = 'gematria_words:' || id
);
```

**Why this satisfies every condition the task requires:**
- **Uses existing structure** — `research_objects`, no new table/column/type.
- **Candidate only** — `status='candidate'` (the table's own default), `engine_verified=false` explicitly (not omitted, not left to infer).
- **Full provenance** — `source`/`source_ref`/`evidence` name exactly where this came from and exactly why it is not yet trusted.
- **Reversible** — `delete from research_objects where source='master_classification_v3';` removes all 32 cleanly; nothing else references them (no `promoted_node_id`, no edges).
- **Idempotent** — the `where not exists` guard prevents duplicate inserts on a re-run; no new unique constraint needed.
- **Does not touch `gematria_words`** — no column, no row, no `is_verified`/`dna_status` change.
- **Does not create schema** — no `ALTER TABLE`, no new columns, no new `edges.relation_type` vocabulary entry (that stays blocked per §5).
- **Does not promote canonical** — no `promoted_node_id`, no graph connection, no `nodes`/`edges` write.
- **Respects privacy** — the 2 sensitive rows get `privacy_scope='private'`, matching R1 and the `personal_or_restricted`/`personal_claim` tags already on them.
- **Consistent with precedent already approved on this exact table**: `research_objects`'s H-1 front-half (`fn_persist_discovery`, MASTER_STATE §CL #13) already established that individual `status='candidate'` writes to this table, with full provenance and `engine_verified` set honestly, are within an already-approved pattern — this write follows that same shape by hand, for a batch the automated `fn_persist_discovery` RPC was not designed to ingest (it re-verifies live two-term crosses, not raw single-phrase historical-claim text).

**Everything else stays `NOT YET`:** the other 764 rows of the `method_mention_type` family, `corpus_role` for all 15,433 rows, `research_package_cluster`/`year_hebrew`/`year_gregorian` (graph-shaped, blocked behind the sitewide convergence freeze, §8 of MASTER_STATE), and `landmark_target_flag` (blocked behind §5 above) — none of these have a write proposed in this pack.

---

## 7. What this pack deliberately did not do

Per the task's explicit stop conditions: 0 DB writes (until Zuriel authorizes §6), 0 schema, 0 aliases, 0 edges, 0 `gematria_words` updates, 0 canonical promotions, 0 deploy. The one exception is the single closing `work_log` memo, inserted as a separate, explicitly-permitted step after this document.
