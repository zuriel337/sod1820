# #1461 privacy floor — proposed patch set (NOT applied)

Status: PROPOSAL ONLY. Nothing here has been run against the live DB. Applying it is a DB change and needs explicit ZURIEL approval for the exact SHA (CLAUDE.md 0.4).

Order: `../apply.psql` (creates `public.gematria_public_word_eligible(uuid)`), then `apply.psql` here, then `canary.sql` (read-only, ends in ROLLBACK). Revert with `rollback.psql`.

- Preimages (`*.before.sql`) are byte-exact `pg_get_functiondef` output, fetched as base64 on 2026-11-20. The md5 of each file equals the live md5. `apply.psql` aborts on any md5 or grant drift.
- Each `*.after.sql` = before + the helper call as an extra predicate (asserted single-occurrence string replacement) + one `-- #1461 privacy floor` line. The predicate is never re-implemented inline. `CREATE OR REPLACE` keeps the existing grants.
- The floor applies to every caller, including service_role and admin callers of these functions (for example the edge functions that call `fn_all_methods`).
- Leak counts were measured live on 2026-11-20 with the extensions.sql predicate written out inline (analysis only). Corpus: 15,592 rows, of which 3,035 are not eligible.

| function | what leaked (counts only) | change | 2029 callers | preimage md5 |
|---|---|---|---|---|
| fn_name_multi | 38 hidden verified+published rows reachable via sv_words/combo_words; probe returned 5 hidden strings | predicate in combo_words + sv_words | src/lib/supabaseApi2029.js | 077fb87159e38311261333c2ff61eb07 |
| fn_anagrams_engine | 3/300 sampled public inputs returned hidden anagrams | predicate on gw | src/lib/analysisFlow.js | 169b23145b120feacef0f5724b37e93d |
| fn_hebrew_root | 12/300 sampled inputs | predicate on related lookup | none (via fn_name_multi) | 6896937b1f63baeb5205bec7e74df5c2 |
| fn_miluy_engine | 125/300 sampled inputs (match list + match_count) | predicate on both reads | none (via fn_name_multi) | 7040b03d4baf2f34cf24596b2ae42a38 |
| fn_split_gematria | 12/12 sampled inputs | predicate on sum_words | none (via fn_name_multi) | 7960817277fd44da5f361153ec7ab8ce |
| fn_name_variants | existence oracle (dynamic probe: 1) | predicate in exists | none (via fn_name_multi) | ce04d5a31cd2a9e985e87c976d8737d9 |
| fn_transforms_tanach | known_words (dynamic probe: 1) | predicate on known_words | none (via fn_name_multi) | 2d6fc40f89e6c1861e4a645abdf2a07f |
| number_dossier_json | 38 hidden verified+published rows; probe n=826: 2 | predicate on 6 union legs + posts join g | supabaseApi2029.js, ai-analyze | ede9f8c0c326cb8216b5a6bd3a982b40 |
| fn_en_search | 1,102 bidim rows of hidden words; 5 en aliases resolve only to hidden words | alias lookup needs an eligible row for the phrase; predicate on both lateral joins | supabaseApi2029.js | 6486821550383df9e3e26341f91c5bec |
| strongest_crossings | same 1,102 bidim rows | predicate on gw | supabaseApi2029.js, gematriaCorpusCrossingW2Executor.js | 2e777b6523b6ce917f0b2ef92512df68 |
| verified_bridges | 0 hidden strings today; ll branch drops 2/13 approved links that have no eligible word | wa: predicate on g; ll: exists eligible g2.phrase = l.hebrew | supabaseApi2029.js | 89816ede7c8bc19f3f9f7aa14d7e9d48 |
| fn_cross_research | 137 hidden verified core rows; probe: 3 | predicate on equals | personalDateResearch.js, public-reading-deploy/transport.js | 785949fda7709eabd97504be0f5297a9 |
| atlas_findings | 46/118 confirmed relations touch a non-eligible phrase; probe: 8 strings | exists eligible for a_phrase and b_phrase | supabaseApi2029.js | 876a2e94adf83e17b6a3c2efb12aec55 |
| discover_anchor_families | probe (1,1000): 325 hidden sample strings | axis CTE predicate (existing OR wrapped in parentheses) | supabaseApi2029.js | f13f9375f0a9b79adec4420ab64ddbb8 |
| discover_relation_candidates | probe (null,1000): 5 | weighty CTE predicate (existing OR wrapped in parentheses) | supabaseApi2029.js | 5a098a7c9d7d0b9ed65d083c9a4e1009 |
| fn_all_methods | 141 hidden verified rows get the "from corpus" marker and value blob | cached lookup requires helper | lifeJourneyDateMatrix.js, transport.js, research-extract, wa-* | ab597c9f534a56ab3694d09cea0bce84 |
| writer_gematria_findings | 4 published claims mark a hidden phrase in_core | in_core exists requires helper | src/lib/contributions.js | f41664470d9bf98424772f78b98e284a |
| number_resonance_stats | counts include hidden phrases (not measured) | axis subquery predicate | supabaseApi2029.js | e940dac6d259c7446a2483c8e91e4157 |
| fn_entity_strength | conv count includes hidden rows | predicate on conv count | none found | ec69381c9f9bd33894280ac07158f8d4 |
| top_collective | title could come from private research_items.entity_ref | floor greatest(min_users,3); research_items leg returns null title | supabaseApi2029.js | 11a13e0491f4556cc31c5195effbde8c |
| entity_collective_count | counts below 3 exposed | returns 0 below 3 distinct users | supabaseApi2029.js | 899bd4c073f216d778b046bc001e9b3c |
| research_level_of(uuid) | anon/authenticated EXECUTE, no caller (only a code comment) | revoke public/anon/authenticated; grant service_role | none | body unchanged |
| fn_cohort_acceptance(text) | PUBLIC EXECUTE, no caller | same | none | body unchanged |
| fn_metatron_gaps() | PUBLIC EXECUTE; callers fn_metatron_status and fn_metatron_recommend (both SECURITY DEFINER, owner postgres) | same | none | body unchanged |

Residuals, not in scope:
- `fn_metatron_status()` is still PUBLIC-executable and returns gaps data.
- Canary probes that need a hidden phrase select it at run time and never print it.
- `number_resonance_stats` has no phrase-level canary.
