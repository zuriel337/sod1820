# SOD1820 — HEBREW IDENTITY · PHASE 2
Hebrew Names / Spelling Variants / Identity Families. READ-ONLY RESEARCH PASS — 0 writes, 0 alias creation, 0 edges, 0 schema/UI change, 0 deploy, no Phase 3 opened.

---

## 0. GOVERNANCE / LIVE-FIRST VERIFICATION

- **`CLAUDE.md`, `SOD1820_MASTER_STATE.md`** read (repo root). Master State v2, governance section unchanged since last read this session.
- **`SOD1820_MASTER_ROADMAP.md`** — **DRIFT FOUND, reported not resolved:** the file checked out on this session's git branch (`claude/gematria-normalize-v1-31748`, local HEAD `0cf88fa`) declares itself **"v4 (קנוני)"**. Live `git fetch origin main` shows `origin/main` at `9b68639`, **16 commits ahead** of this branch's fork point, including two explicit canonicalization commits: `"docs(roadmap): declare Master Roadmap v5 canonical on main"` and `"docs(roadmap): canonicalize Master Roadmap v5 on main"`. **`main` has moved to Roadmap v5; the locally-checked-out v4 file is stale.** Per the roadmap's own authority order ("live DB + main + Master State > this map > memory"), `origin/main`'s v5 was checked directly (`git show origin/main:...`) rather than trusted from the stale local file. **Relevance check: v5's open Identity-named gates (Gate #4 "Universal Finding Identity & Multi-Source Provenance," Gate #18) concern ELS *finding*-identity (`corpus_id/term_norm/dir/skip/start`, a Bible-code search-engine concept) and `identity_edges`/`resolve_person` (a WhatsApp-contact/researcher-identity resolution table, confirmed live: columns `person_id`, `kind`, `legacy_id` — human/contributor identity, not lexical identity). Neither overlaps this Phase's subject (Hebrew word/name lexical identity).** No blocking conflict found; the drift is disclosed as required, not silently worked around.
- **30 most recent `work_log` rows** read live. No new memo from `actor=GPT` or any other agent bears on Hebrew word/name identity since this session's own prior `CORPUS_EXPANSION_GATE_CORRECTION` entry — nothing pending to reconcile before starting.
- **Active rules + `project_codex`**: no rule found that redefines or supersedes Phase 1's already-proven architecture decision (checked live: no active rule with `rule_id`/`label` matching alias/identity/spelling-variant naming beyond what was already read in Phase 1/Corpus Expansion).
- **Live engine**: `gematria_methods where active=true and function is not null` = **13** (re-verified this pass, unchanged across the entire multi-phase arc). `word_aliases` (7 rows, unchanged), `nodes type='language_bridge'` (13 rows, unchanged) — re-confirmed live, not assumed from memory.
- **Per instruction: the "decision already proven" is NOT re-opened.** No new audit was run on "does SOD1820 need a new schema for identities" — Phase 1's `word_aliases` + graph answer stands as FACT, reused not re-derived.

---

## FACT

### 1. Discovery method (live-only, no invented examples)

Two independent live-data passes, both re-verified through the canonical engine before any conclusion:

**A. Direct re-verification of the task's own named examples** — דוד/דויד/דוד המלך/בן דוד/צמח דוד/צמח דויד/בנק/נקב, all re-fetched from `gematria_words` and re-computed fresh via `fn_all_methods_full` (13/13 methods each). **Zero mismatches** between stored and live values across all 23 surface forms checked this pass.

**B. Live discovery of additional real orthographic pairs** — built a "insert exactly one ו or י" detector over all 4,834 pure-Hebrew single-token words in `gematria_words` (2–12 chars): for every word, remove each of its ו/י letters one at a time and check whether the reduced form also exists in the corpus at length−1. Raw yield: **1,108 unique candidate pairs** — deliberately NOT presented as findings, because a first, cruder attempt (stripping ALL ו/י/א root-wide to find shared "skeletons") produced obviously-unsafe clusters (e.g. "שר/שיר/שור/אשר/ישר" bucketed together — different words sharing a triliteral root, not spelling variants of one identity) — **this negative result is itself evidence, kept and reported, not hidden**, showing why naive similarity signals are unsafe at corpus scale. The tighter insert/delete-one-letter signal was then restricted to pairs where **at least one side matches a known named entity** (`nodes type='entity'`, live query, ~500 labels) — yielding **309** entity-adjacent pairs, and where **both sides** match — **35** pairs, individually reviewed below.

### 2. Acceptance tests — results

| # | Test | Result |
|---|---|---|
| 1 | דוד/דויד not numerically merged | ✅ **CONFIRMED live**: רגיל(דוד)=14, רגיל(דויד)=24 — different, unchanged, re-verified fresh this pass |
| 2 | צמח דוד/צמח דויד not numerically merged | ✅ **CONFIRMED live**: רגיל(צמח דוד)=152, רגיל(צמח דויד)=162 — different |
| 3 | same gematria does not create identity | ✅ **CONFIRMED**: בנק=152, נקב=152, צמח דוד=152 (re-verified live, FAM-14) — three unrelated referents, zero links exist or are proposed |
| 4 | title/epithet not forced into spelling_variant | ✅ FAM-03 (דוד/דוד המלך) classified `title_or_epithet`, explicitly never `spelling_variant` |
| 5 | relational phrase not auto-same-identity | ✅ FAM-04 (דוד/בן דוד) classified `relational_phrase`; live world-tag evidence (אנשים vs. גאולה) actively argues AGAINST same-referent, not merely withheld |
| 6 | provenance preserved per surface form | ✅ every row in `HEBREW_IDENTITY_FAMILIES.csv` carries `source`/`vip_source`/`node_id`/`is_verified` from the live row, verbatim |
| 7 | weak candidates not hidden | ✅ FAM-06/07/08/09/10 (all LOW/LOW-MEDIUM) kept and reported, including 3 candidates actively judged likely-FALSE (FAM-07/08/09) rather than deleted |
| 8 | no candidate reaches canonical without Zuriel | ✅ every row's `recommended_action` stops at "ready_for_human_gate" / "no action" — nothing proposes or performs an insert |
| 9 | no parallel schema/table/engine/tree | ✅ zero new tables proposed; every recommended action routes through the already-existing `word_aliases`/graph mechanism proven sufficient in Phase 1 |
| 10 | all numeric computation via live engine | ✅ all 23 surface forms computed via `fn_all_methods_full` this pass; 0/23 mismatches against stored `gematria_words` values |

### 3. The 14 family candidates found

| Family | Pattern | relation_class | Confidence |
|---|---|---|---|
| FAM-01 | דוד ↔ דויד | spelling_variant | **HIGH** |
| FAM-02 | צמח דוד ↔ צמח דויד | spelling_variant | **HIGH** |
| FAM-03 | דוד ↔ דוד המלך | title_or_epithet | MEDIUM-HIGH (pattern) / LOW (identity) |
| FAM-04 | דוד ↔ בן דוד | relational_phrase | LOW-MEDIUM (evidence argues against same-referent) |
| FAM-05 | אהרן ↔ אהרון | spelling_variant | **HIGH** *(new this pass)* |
| FAM-06 | אליהו ↔ אליה | unresolved | LOW-MEDIUM (genuine ambiguity: name-short-form vs. the preposition "to her") |
| FAM-07 | אהרן ↔ הרן | unresolved | LOW (likely a different biblical figure — Haran, Abraham's brother) |
| FAM-08 | אסתר ↔ סתר | unresolved | LOW (likely a different word — "secret," not a name) |
| FAM-09 | דוד ↔ דד | unresolved | LOW (likely a different, archaic word — "breast") |
| FAM-10 | דוד ↔ דודי | unresolved | LOW-MEDIUM (grammatically "my beloved/uncle," not a standard name-spelling; also numerically distinguishable from both דוד and דויד via מסתתר) |
| FAM-11 | חשך ↔ חושך | spelling_variant | **HIGH** *(common noun, new this pass)* |
| FAM-12 | נצחון ↔ ניצחון | spelling_variant | **HIGH** *(common noun, new this pass)* |
| FAM-13 | תהלים ↔ תהילים | spelling_variant | **HIGH** — both sides ALREADY have independent `node_id`s (live graph duplication) |
| FAM-14 | בנק / נקב / צמח דוד = 152 | shared_value_only | **HIGH** (confidently a non-relation — negative control, re-verified live) |

Full per-surface-form detail (29 rows, provenance + live engine profile + engine-match status for every row) in `HEBREW_IDENTITY_FAMILIES.csv`.

---

## INFERENCE

- The two rejected-but-disclosed families (FAM-07 הרן, FAM-08 סתר, FAM-09 דד) demonstrate that even a *tightened* signal (entity-token-adjacent, single-letter matres-lectionis insertion) still produces real false positives at a meaningful rate (3 of 8 "both-sides-name-adjacent" pairs touching known figures/words turned out to be different lexemes). This is direct, live evidence — not a general caution repeated from Phase 1 — that **no orthographic signal, however tightened, should ever auto-decide identity**, matching this Phase's own hard rule.
- FAM-13 (תהלים/תהילים) surfaces something beyond a spelling-variant candidate: **the live graph already carries two independent `node_id`s for what is very plausibly one referent (the book of Psalms)** — a pre-existing graph-duplication the alias question sits on top of. Resolving FAM-13 is not just "add an alias," it also requires deciding which node is canonical — disclosed here, not resolved.
- FAM-04's world-tag evidence (`אנשים` for "דוד" vs. `גאולה` for "בן דוד") is a stronger-than-usual signal because it comes from the graph's own prior categorization, independent of this Phase's orthographic detector — two separately-built parts of the system agree these are different kinds of thing, reinforcing the "relational, not identity" classification.
- FAM-06 and FAM-10 (אליה, דודי) show the limits of what a READ-ONLY pass can resolve: the ambiguity is genuinely per-occurrence (which specific corpus row means "Elijah" vs. "to her," which means "David" vs. "my beloved") — a blanket family-level ruling would be wrong in some fraction of cases either way, so both are correctly left `unresolved` rather than forced to a side.

## RECOMMENDATION (process only — nothing built, nothing decided)

1. If Zuriel approves any spelling_variant family (FAM-01/02/05/11/12/13), the mechanical next step (not performed here) is a `word_aliases` insert with `alias_type='spelling_variant'`, per the already-proven Phase 1 architecture — no new mechanism needed.
2. FAM-03 (title/epithet) has no existing relation mechanism at all in `word_aliases`/`language_bridge` today — if Zuriel wants title/epithet relations recorded at all, that is a small, separate design question (not a blocker to this Phase, not opened here).
3. FAM-13's node-duplication should be flagged to whoever owns graph hygiene, independent of the alias question — two live nodes for one referent is worth knowing about regardless of the spelling-variant decision.
4. FAM-06/FAM-10's per-occurrence ambiguity, if ever worth resolving, would need a sampling pass over the specific corpus rows using each word — not a blanket rule. Not recommended as urgent.

## HUMAN-GATE

10 families carry an actual pending decision (`HEBREW_IDENTITY_HUMAN_GATE.csv`): FAM-01, 02, 03, 04, 05, 06, 10, 11, 12, 13. Each row states the options and what happens by default if Zuriel does nothing (in every case: **nothing changes, no link is created**). FAM-07/08/09 (rejected) and FAM-14 (negative control) are excluded from the Human-Gate file because — per this instruction's own "don't overload" rule — there is nothing for a decision to change: the recommended action for all four is already "no action," family-level, and stays that way regardless of further review.

## DECISION

**PENDING.** Per instruction: this is not Claude's decision. No family in this pass has been approved, declined, or otherwise acted on by Zuriel. All 14 remain exactly where this report leaves them until reviewed.

---

## End-of-task summary (per instruction, returned to Zuriel)

**A. Family candidates found:** 14 (29 surface-form rows in `HEBREW_IDENTITY_FAMILIES.csv`).

**B. HIGH / MEDIUM / LOW:**
- **HIGH: 7** — FAM-01, 02, 05, 11, 12, 13 (spelling_variant pattern-confidence) + FAM-14 (confidently a NON-relation, negative control).
- **MEDIUM: 1** — FAM-03 (title/epithet pattern-confidence; identity-merge confidence itself stays LOW by design).
- **LOW: 6** — FAM-04, 06, 07, 08, 09, 10 (relational/ambiguous/likely-different-word).

**C. Patterns safe enough for Human-Gate (i.e., worth Zuriel's attention, evidence is clean either way):** FAM-01, 02, 05, 11, 12, 13 (clean spelling_variant candidates — the decision is a real yes/no, not a data-quality question) and FAM-04 (clean relational_phrase finding — evidence-backed non-identity worth confirming). FAM-03 is safe to review but has no existing target mechanism yet.

**D. Patterns dangerous for automation:** FAM-06 (אליהו/אליה) and FAM-10 (דוד/דודי) — genuine per-occurrence ambiguity where a blanket automated rule would be wrong some of the time; FAM-07/08/09 demonstrate that even a tightened orthographic signal produces real false positives (Haran≠Aaron, secret≠Esther, breast≠David) and must never be trusted without the entity/provenance cross-check this pass applied.

**E. Is the existing model still sufficient: YES**, evidence-based, not re-asserted from Phase 1 alone — this pass ran an independent live discovery process (not reusing Phase 1's cases) across 4,834 real corpus words and found nothing that needed a new mechanism: every candidate, however classified, routes through `word_aliases`/`language_bridge`/plain `gematria_words` rows exactly as Phase 1 established. The one real gap found (FAM-13's node duplication) is a data-hygiene issue, not a schema gap.

**F. Top families by research value for human review (10–20, this pass found 14 total so all are listed, ranked):**
1. FAM-01 דוד↔דויד — flagship case, clean, HIGH
2. FAM-05 אהרן↔אהרון — new clean HIGH-confidence name pair
3. FAM-13 תהלים↔תהילים — HIGH confidence + live node-duplication, most structurally interesting
4. FAM-02 צמח דוד↔צמח דויד — clean compound-phrase HIGH
5. FAM-04 דוד↔בן דוד — best example of evidence correctly preventing a false merge
6. FAM-03 דוד↔דוד המלך — clearest title/epithet case, exposes a real mechanism gap
7. FAM-11 חשך↔חושך — clean common-noun HIGH
8. FAM-12 נצחון↔ניצחון — clean common-noun HIGH
9. FAM-14 בנק/נקב/צמח דוד=152 — best negative-control re-confirmation
10. FAM-06 אליהו↔אליה — best example of genuine, disclosed ambiguity
11. FAM-10 דוד↔דודי — second-best ambiguity example, also numerically distinguishable
12. FAM-07 אהרן↔הרן — best example of a tightened signal still producing a false positive
13. FAM-08 אסתר↔סתר — second false-positive example
14. FAM-09 דוד↔דד — third false-positive example

---

## STOP

READ-ONLY throughout. No UI, migration, alias, edge, `gematria_words`/`word_aliases` change, Master State update, publication, or deploy. No Phase 3 opened. Closing `work_log` memo (`actor=CLAUDE`, `task=HEBREW_IDENTITY_PHASE_2`, `status=completed`) logged separately, including the Roadmap v4→v5 drift finding.
