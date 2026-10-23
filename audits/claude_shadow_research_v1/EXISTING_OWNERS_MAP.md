# CLAUDE_SHADOW_RESEARCH_V1 — Stage 1: existing owners (mapped BEFORE any new code)

Read-only experimental lane. Not a canonical engine, not a product path. Nothing here is promoted to the system.
Rule applied to every row below: **EXTEND_EXISTING** (import / call the owner); add code only where no owner exists, and say so.

| Topic | Existing owner (live evidence) | What it already does | How the shadow lane uses it | Truly new in the lane |
|---|---|---|---|---|
| Numeric truth / methods | `src/lib/gematria.js` (`METHODS`, `DEPTH_METHODS`, `GADOL_BASE`, `methodLabel`) | the only calculation path; 23 value methods | every number is a call into it; the lane has no gematria arithmetic of its own | nothing |
| Method family | table `gematria_methods` (41 rows): `mathematical_family`, `order_sensitive`, `word_boundary_sensitive`, `final_letter_sensitive`, `version`, `dependency_rules` | 12 families (e.g. `base_additive` 14 keys, `cumulative_prefix_sum`, `adjacent_difference`, `letter_square_sum`, `position_weighted_sum`, `composite_sum`) | read-only REST read; family is reported per relation; registry snapshot hashed into the manifest | nothing |
| Method dependency (registry) | `method_equivalence` (6 sofit pairs), `dependency_rules` `conditional_equivalence "no_final_letters"` | a variant equals its base only when the expression has no final letters | untouched; kept as the *registry* statement | — |
| Method dependency (pair-conditioned) | `src/lib/research/pairConditionedMethodDependency.js` (+ test) — design reference from the previous research branch, unwired | Δ(X)=Mg(X)−M(X) from two engine calls; M and Mg are one fact for a pair iff Δ(A)=Δ(B); ribua/ribua_gadol checked by position; raw equalities kept | imported as-is for every pair; a vector fast path is parity-tested against it | only a fast path, with a parity check against the owner |
| Expression dependency (anagram / permutation) | migrations `20260919204530_expression_evidence_dependency_normalization_v1` (`fn_expression_letter_multiset_key`, view `cross_method_strength`) and `20260919220807_expression_word_multiset_dependency_normalization_v1` (`fn_expression_word_multiset_key`); JS twin `crossingParityCore.anagramKey`; `crossingLegacyRarity.independentLegacyMethods` | same-letter permutations share one dependency family; "rank, don't hide" | same rule, in JS, for the collapse of anagram pairs (order-insensitive methods only, per registry flags) | JS port of the letter/word multiset key for offline use (the DB functions are not called — no RPC) |
| `independent_support_count` | `src/lib/research/nameLabDependency.js` → `independent_support_count: null`, `independence: "dependency_group_only_not_proven_independent"` | dependency groups prevent double counting; independence is **never claimed** | the lane reports `independent_families` and says "not proven independent" in exactly the same wording; it never fills the owner's null field | nothing — the owner's boundary is respected |
| Normalization / spelling variants | `scripts/post-knowledge-staging.mjs` (`normalizePhrase`, `variantKey`, `withinOneEdit`, `boundaryFlags`, `timeFlags`) — previous research branch | spelling-variant key (articles, finals, matres), edit-distance-1, boundary/time flags | imported; variant clusters collapse into one expression | nothing |
| Extraction | `src/lib/triage.js` / `analysisFlow.js` (Shared Expression Extraction, ONE SYSTEM LAW) via `stagePosts` | claim-stage extraction + engine re-verification | `stagePosts` is called, not re-implemented; no second extractor | nothing |
| Multiple testing | `src/lib/research/els2029StatisticalControls.js` (`benjaminiHochberg`, `createSeededPrng`, `seededShuffle`, `runSeededControls`, contract `els_seeded_controls_v1`: no significance label without controls AND FDR) | BH q-values, deterministic PRNG, control-trial harness | BH and PRNG imported unchanged; same rule: no label without controls + FDR | **Holm** (absent in the repo) — a small addition next to the BH call |
| Significance / baseline | `src/lib/research/corpusBaseline.js` (F5: corpus baseline contract; "adding words makes base-rates stale"), `researchCalibration.js` (F3: decoy / control harness, blind trials) | baselines are versioned and declared; controls are declared; no promotion | the corpus snapshot is hashed and declared as a *human-selected* baseline; controls are matched pools; output carries `truthPromotion:false` | matched-control pair sampler (no owner for per-pair matched controls) |
| Relation types | `20260824_relation_engine_v1.sql`; table `relation_evidence` (132 rows: `cipher_link` 37, `mirror` 20, `complement` 11, `hidden` 9, `progression` 9, `revealed` 8, `convergence_candidate` 8, `inner` 6, `same_value` 5, `cross_method_convergence` 5 …); `gematriaRelationW2Executor.js` | typed numeric relations between expressions | the lane's relations are only `same_value` (post-claimed equality under one method) and, derived, `cross_method_convergence` counts; no new relation type, no row written | nothing |
| Corpus statistics | `gematria_words` (service view: 15,592 rows; **anonymous public read: 12,584 rows** — the lane reads only the public view; 12,411 verified phrases ≥3 letters after de-duplication form the control pool), `numberMathFingerprint.js`, `explorerRanking.js`, `worldContextualProminence.js` | the human-selected corpus and its rankings | read-only snapshot (id, phrase, flags) used as the control pool; values are recomputed by the engine, the stored columns are used only as a consistency check | nothing |
| Posts as evidence | `post_qa` (511 legacy rows, consumed by `metatron_context`), `post_gematria_links` (583) | legacy QA / links | **not read, not written** | — |

## Iron rules carried by this lane
No DB write · no Supabase branch · no change to `post_qa`, `gematria_words`, `research_objects` · no link to `metatron_context` or Raziel · no extra Result Bundle · no new API / Edge Function · no separate memory · no number computed by an LLM · Claude output = hypothesis / expert report · public corpus only · no deploy · no merge.

## Gaps found (reported, not fixed here)
1. `independent_support_count` is `null` everywhere by design; there is no owner that computes it.
2. Registry flags `order_sensitive / word_boundary_sensitive / final_letter_sensitive` are `null` for 5 keys (`מילוי גדול`, `מילוי בלבד גדול`, …) and `final_letter_sensitive=null` for `הכפלה`; the lane treats `null` as "unknown ⇒ not collapsed".
3. Holm correction has no owner; BH is the owner's only correction.
4. The pair-conditioned rule is design-only (not wired) — the lane exercises it but does not adopt it.

## Result of the extension (what was added, and nothing else)
| Added | Where | Extends |
|---|---|---|
| vector fast path + parity check (709/709 pairs identical to the owner) | `scripts/claude-shadow-research-core.mjs` | `pairConditionedMethodDependency.js` |
| expression-dependency collapse (letter / word permutation, spacing + spelling variants, repeated mentions) | core `dependencyGroups`, `pairEvidenceFromVectors` | DB `fn_expression_letter/word_multiset_key` (JS twin, no RPC) |
| shared-word residual pairs (word-additive methods only; set measured on the engine) | CLI `effectivePair` | none — new dependency reason, reported as hypothesis H5 |
| Holm | core `holm` | next to the owner's `benjaminiHochberg` (BH imported unchanged) |
| matched-control pair enumeration (no resampling with replacement; thin pools untested) | core `matchedControl` | `corpusBaseline.js` F5 / `researchCalibration.js` F3 principles (declared baseline, controls before labels) |
| read-only snapshot + relation records + report + manifest + verify mode | CLI | `post-knowledge-staging.mjs` (`stagePosts` is called, not re-implemented) |

No new table, column, RPC, Edge Function, Result Bundle, memory or relation type was created.
