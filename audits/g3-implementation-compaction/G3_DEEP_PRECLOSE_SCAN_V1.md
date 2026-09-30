# SOD1820 — G3 DEEP PRE-CLOSE SCAN v1

**Date:** 2026-09-30 · **Base:** `origin/main` `b1852af7` · **Supabase:** `linswmnnkjxvweumprav`
**Mode:** READ_ONLY. No code, schema, content or release write.
**Purpose:** deep pre-closure sweep of layers earlier scans did not reach. Every number is a live measurement.

---

## 1. NEW FINDINGS — not on any existing closure list

### DEEP-1 · Two live ELS engines — **One Tree violation · BLOCKER-class**

`els_single_engine_law` v9 declares ONE canonical ELS engine. Live there are two independent implementations over the same corpus.

**Canonical tree (2029), correctly layered:**
`els_torah_occurrences_internal_v1` (primitive) → `els_search_core_v1` / `els_search_page_core_v1` / `els_search_geometry_core_v1` → thin `SECURITY DEFINER` anon wrappers `els_search_page_v1`, `els_verify_occurrence_v1`.

**Second engine:** `fn_els_search(p_term, p_maxskip, p_maxhits)` — 2,655-char independent SQL implementation that scans `torah_stream` directly with its own forward/backward pair matching and skip logic. It calls **none** of the canonical functions. `anon`-executable.

**It has live consumers in the Legacy app:**
- `src/components/NameMultiSearch.jsx:24` — labelled `"מנוע הדילוגים"`
- `src/lib/analysisFlow.js:19` — mapped for the `"דילוג"` analysis kind

Two independent implementations over the same `torah_stream` can return different results for the same term. Compaction hard-acceptance **#2** forbids a duplicated engine performing the same canonical responsibility without an explicit bounded migration reason.

Required: either record `fn_els_search` as `TEMPORARY_COMPATIBILITY` with owner + removal condition and a parity proof against the canonical core, or route both Legacy consumers onto the canonical path and retire it.

### DEEP-2 · `els_search_geometry_v1` — anon-exposed with zero consumers
`SECURITY DEFINER`, `anon`-executable, **0** code consumers anywhere in `src/` or `supabase/functions/`. Dead surface that is still publicly callable. Retire or justify.

### DEEP-3 · 13 contract guards no longer guard their subject

All remaining test failures are **stale guards drifted from their own source**, not live breaches. Verified individually:
- `english-method-identities` — `expected: 4, actual: 5` (a 5th identity added, count never updated)
- `edge-country-adaptive-strict` — asserts `select=code,mode,strict_level`; source now does `select=mode,strict_level&code=eq.SG` (server-side filter optimisation), guard not updated
- `convergence-tree-closure` — assertion drift on the site-flag gate and the noindex projection
- `identity registration remains fail-closed` — guard drift, not an open registration hole
- 5 × `research-viewer-*` — one cluster
- plus `Book research families…`, `Research-object finding… ADAPTER_NATIVE_DETAIL`

No individual failure is a live security or truth breach. **The systemic finding is that 13 invariants are no longer enforced** while the suite looks close to green. In a pre-closure state that is the risk, not the individual reds.

### DEEP-4 · SECURITY DEFINER views granted to `anon` grew 3 → 6
`redirect_map` · `topic_cards_public` · **`sitemap_phrases_v1`** · **`v_method_states`** · **`video_media_assets_v1`** · **`video_media_placements_v1`**
`agent_research_stats` was correctly removed by the security preclosure ✓. The four new/remaining ones have not been through the 7F least-privilege acceptance.

### DEEP-5 · `gematria_methods` sequential scans = **34,036,737**
Against 443,731,122 index scans. The table is 168 kB so each scan is cheap, but 34M sequential reads of the method registry indicates it is fully re-read per request rather than cached or index-served. Matrix row 9 (DB/query performance) has **never been censused**, so this is the first measurement of it.
Other seq-scan-heavy: `posts` 796,957 · `topic_cards` 527,812 · `channel_updates` 377,035 · `els_records` 308,664 (vs only 4,152 index scans).

### DEEP-6 · 48 MB of never-scanned indexes
11 of them over 1 MB. Largest non-primary-key: `idx_tv_words` (9,264 kB), never scanned. Primary keys on append-only tables (`site_visits_pkey`, `gsc_metrics_pkey`, `identity_edges_pkey`) legitimately show zero scans and are **not** waste — do not drop those.

### DEEP-7 · 24 backup/audit/staging tables, 36 MB — still present
Retirement candidates for the compaction pass. DB total 1,281 MB; largest tables `visitor_events` 188 MB · `bidim` 173 MB · `events_2026_09` 85 MB · `site_visits` 77 MB · `gsc_metrics` 70 MB.

---

## 2. CORRECTIONS to earlier reporting

**Gematria is One Tree — my earlier suspicion was wrong.** `gematria_method_trace` (13,894 chars) *does* call the canonical calc functions and *does* read `gematria_methods`/`method_semantics`. `_gem`, `_gem_sofit`, `gem_sum` are leaf primitives, not competing engines. Layering: primitives → `gem_calc` → `gematria_api`. No violation.

**PHASE 5B Corpus/Books is better than "unverified".** Witness identity *is* modelled: `pdf_exact_witness_status`, `witness_state`, witness-prefix folding boundaries, and a rich locator parser handling historical `#pdf:24` / `#pdf:15,31` forms. `tanakhVerseIdentity.js` and `research.corpus_tanach` / `tanach_clean` carry verse identity. `Books2029Page` has 21 edition/witness references.
**But there is no general Work / Edition / Witness table.** The model is PDF- and Tanakh-shaped, implemented per concrete corpus rather than generalised. Honest status: **implemented for the two live corpora, not generalised** — adequate for G3, a real question before broad source expansion.

---

## 3. RE-CONFIRMED still open

| Item | Live |
|---|---|
| A1 exact cost | `cost_certainty`: `not_billable` 672 · `unknown` 102 · **`exact` 0**. `cost_ils`, `provider_native_amount`, `pricing_ref` all **0 rows**. Migration not merged to main. |
| D1 Research Path | `research_paths` **0** · `research_plans` **0** · `research_path_revisions` **0** |
| REVALIDATE_DURING_G3 | **11 undecided**: `bot_delivery_law`, `identity_architecture_law`, `no_row_without_number_law`, `number_page_law`, `post_og_image_law`, `raziel_response_contract`, `raziel_whatsapp_access_adapter_law`, `source_video_publish_law`, `unified_tags_law`, `word_approval_required_law`, `worlds_color_law` |
| Access seam | 2 of 13 surfaces · `composeCapabilityProjection` 0 call sites |
| Duplicate 2029 routes in `src/App.jsx` | 4, unreachable |
| Trace coverage | 6 of 85 edge functions |
| H1 restore drill | claimed with concrete evidence (RTO ≤ 3m55.7s); **not verifiable from here** |

**DRIFT:** `SOD1820_MASTER_STATE.md` records A1, A4 exact rollup and D1 as closed/live-verified. The live DB does not support A1 or D1. Resolve from live per §5.

---

## 4. Genuinely improved since 2026-09-29

G2 residue 6 → **0** · `g3_disposition` missing 6 → **0** · H2 erasure/export **live** (`export_my_data_v1`, `erasure_my_account_prepare_v2`) · `admin_*` anon-executable 71 → **66** · SECURITY DEFINER ∧ mutable `search_path` ∧ anon = **0** · all public tables RLS-on · trace roots 151 → **181**, capabilities 4 → **7**, `output_use` set on **453** spans · src tests 663/18 fail → **684/1 fail** · gate scripts 49/4 red → **54/1 red** · build PASS both targets.

---

## 5. Additions to the closure list

1. **DEEP-1** `fn_els_search` — second live ELS engine. Parity proof + disposition, or retire. **Add as a blocker-class item.**
2. **DEEP-2** `els_search_geometry_v1` — retire or justify the anon exposure.
3. **DEEP-3** repair the 13 drifted guards. A count or regex that stopped matching its source is an invariant that is no longer enforced.
4. **DEEP-4** run 7F least-privilege acceptance over the 6 anon-granted SECURITY DEFINER views.
5. **DEEP-5** census matrix row 9 for real — start with `gematria_methods`.
6. **DEEP-6/7** index and backup-table retirement under the compaction pass; do not drop append-only primary keys.
7. **5B** decide whether a general Work/Edition/Witness model is required before G4 source expansion, or explicitly carried forward.

## 6. Boundaries
Audit evidence under §15. Not an owner, contract or documented state. Severities are engineering interpretation. H1 restore evidence is accepted as documented, not independently verified.
