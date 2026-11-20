# #1461 privacy floor — proposed patch set (NOT applied)

Status: PROPOSAL ONLY. Nothing here has been run against the live DB. Applying it is a DB change and needs explicit ZURIEL approval for the exact SHA (CLAUDE.md 0.4).

Order: `../apply.psql` (creates `public.gematria_public_word_eligible(uuid)`), then `apply.psql` here, then `canary.sql` (read-only, ends in ROLLBACK). Revert with `rollback.psql`.

- Preimages (`*.before.sql`) are byte-exact `pg_get_functiondef` output, fetched as base64 on 2026-11-20. The md5 of each file equals the live md5. `apply.psql` aborts on any md5 or grant drift.
- Each `*.after.sql` = before + the helper call as an extra predicate (asserted single-occurrence string replacement) + one `-- #1461 privacy floor` line. The predicate is never re-implemented inline. `CREATE OR REPLACE` keeps the existing grants.
- Who the floor applies to (owner gate 20.11.2026, PUBLIC ≠ PRIVATE):
  - **Admins:** every reader uses `((select public.rd_is_admin()) or public.gematria_public_word_eligible(id))` (subquery: evaluated once per call), which is the same rule as the REST policy. An admin keeps the full corpus. Public pages always call these readers with the anon key (the `public-reading-deploy/transport.js` service worker rewrites the Authorization header), and none of the 21 readers writes a shared cache. So an admin's result never reaches a guest.
  - **service_role:** the floor stays in the 19 readers that read the corpus. Their service-role callers answer public users: `wa-hatishbi`, `wa-uriel` and `wa-raziel` (WhatsApp), and `ai-analyze`, whose caller context is passed through. `research-extract` (internal cron) calls only `fn_all_methods`, where the floor touches only the provenance marker `מהמאגר` and the `כל_הערכים` blob. The method values are computed for any word by `fn_method_value`, so free calculation is kept. Direct table access by service_role is not touched: RLS does not apply to it.
- The eligibility rule is the existing contract, not a new one: it is the live permissive policy `anon_read_verified_gematria` (verified + published + not encrypted), plus the owner's existing moderation signals (`visibility_tier<0` and the blocklist, 0 rows each). **A private wall entry does not hide a public word.** That clause was removed: it would have hidden 22 curated public words.
- A phrase-level floor (`atlas_findings`, the `ll` leg of `verified_bridges`) hides a phrase only if it **exists in the corpus and none of its rows is public**. A phrase that is not in the corpus stays public. With the "an eligible row must exist" form, 39 of 118 confirmed relations and 2 of 13 approved bridges would have been dropped for no reason.
- Leak counts: measured live on 20.11.2026 with the predicate written out inline, for analysis only. **The predicate is now corrected:** of 15,592 rows, 3,013 are not eligible. All 3,013 are **already hidden from guests in Production** through REST (`anon_read_verified_gematria`). Breakdown: 2,996 unpublished, 16 published but encrypted, 1 published but unverified. The full explanation is in `../../../docs/reviews/sitewide-statistics-20261120/README.md` §10.

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
| verified_bridges | 0 hidden strings today; 13/13 approved links kept (an absent phrase stays public) | wa: predicate on g; ll: phrase hidden only when present in the corpus with no public row | supabaseApi2029.js | 89816ede7c8bc19f3f9f7aa14d7e9d48 |
| fn_cross_research | 137 hidden verified core rows; probe: 3 | predicate on equals | personalDateResearch.js, public-reading-deploy/transport.js | 785949fda7709eabd97504be0f5297a9 |
| atlas_findings | 7/118 confirmed relations touch a hidden phrase (39 more only touch a phrase absent from the corpus and stay) | each side: absent from the corpus, or has a public row | supabaseApi2029.js | 876a2e94adf83e17b6a3c2efb12aec55 |
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
