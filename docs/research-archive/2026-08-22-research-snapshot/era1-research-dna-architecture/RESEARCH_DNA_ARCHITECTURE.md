# SOD1820 — Legacy → Research DNA Crosswalk
### Architecture Discovery · READ-ONLY · actor=CLAUDE

Governance note: nothing in this document was written to the DB, migrated, deployed, or turned into UI. All counts below are live SELECT results (verified moments ago against project `linswmnnkjxvweumprav`); everything else is explicitly labeled INFERENCE or RECOMMENDATION.

---

## A. LEGACY_SYSTEM_MAP — what actually exists and lives

### A.1 `gematria_words` (15,433 rows, 48 columns) — the corpus itself

Verdicts below are corrected against the code-consumer sweep in §B (grep-verified, not assumed).

| field | live distribution | code verdict | FACT/INFERENCE |
|---|---|---|---|
| `category` | 51 distinct values. `מאגר_ערכים`=7,274, null=2,874, `כללי`=2,533, `משיח`=1,090, `יהוה`=424, `מנוקה אוטומטית`=394, `קבוצת וואטסאפ VIP`=243, `גאולה`=196, plus ~40 long-tail values (1-15 rows each, several single-use like `_לסינון_נוסחאות`) | **ACTIVE** — admin "World Tagger" (`LanguageEngineTab.jsx`) groups untagged words by category to suggest a world | FACT: mixes a processing-pipeline label (`מנוקה אוטומטית`), a semantic theme (`משיח`/`יהוה`/`גאולה`), and a bucket-state (`מאגר_ערכים`=`dna_status='promoted'`, 100% redundant: 7,274=7,274). Not a clean topic taxonomy, but a real admin workflow depends on it today. |
| `tags` | mostly null | **ACTIVE** — curated-tier filter (`אוצרות הגילוי`), `EntityPage.jsx` direction-lens badge (`כיוון:*`), `WriterOS.jsx` | FACT: real, multi-purpose active field, not narrow as first estimated. |
| `world` | 14,092 null (91%), `גאולה`=985, `שמות הקודש`=331, `תורה וקודש`=13, `ספירות`=6, `חתימות 1820`=6 | **ACTIVE** (duplicate of `nodes.metadata.world`) — World Tagger UI + `journey_classic_seed` RPC | FACT: only 5 distinct values, sparse, but genuinely read/written by code — and duplicates a richer, separate vocabulary in `nodes.metadata.world` (44 values, see D). |
| `space` | `core`=13,295, `held`=2,073, `private`=35, `lab`=30 | **ACTIVE** — gates what `wa-raziel` (WhatsApp bot persona) is allowed to surface (`.eq("space","core")`) | FACT confirmed: real access-tier gate, distinct from `visibility_tier` and from the unrelated `insights.space` (lab/core) flag used in `AdminPage.jsx`. |
| `dna_status` | `promoted`=7,274, `appendix`=6,179, `dna`=983, null=812, `core`=185 | **DORMANT** — written by import scripts only; **no app code branches on its value** | CORRECTED FACT: this is *not* a live-operating maturity ladder today, despite looking like the obvious ancestor of "Research DNA." It's a real, well-shaped concept that the app simply never reads. |
| `visibility_tier` | 3=14,456 (94%), 1=931, 2=46 | **ACTIVE** — central to `src/lib/discovery.js`'s `tierOf()` (CORE/VAULT tiering), number-page/story sort order, `api/card.js` OG-card filter | FACT: real gate, low differentiating power today only because 94% of rows sit at tier 3. |
| `is_verified` | true=12,555 (81%), false=2,878 | **ACTIVE**, pervasive — the core publish/curation gate (number pages, OG cards, `VerifiedGematrias.jsx`, `wa-raziel`) | FACT + caveat from Method Mentions Phase 2/3: `is_verified=true` gates *publish-worthiness*, not *per-claim engine verification* — in the 796-row method-mention sample it tracked import-batch defaults, not whether that row's specific claimed value was engine-checked. **Do not conflate `is_verified` with `engine_verified`.** |
| `is_encrypted` / `phrase_hint` | not profiled numerically | **UNUSED** — zero reads or writes anywhere in the repo | FACT (code-confirmed): dead columns. |
| `notes` | frequently **identical to `phrase`** for `excel_import` rows | **DORMANT** — selected in one query (`getWriterCoreWords`) but explicitly dropped before rendering (`WriterOS.jsx` `normCore()` never includes it in output) | FACT (doubly confirmed): both duplicate-of-phrase (data-side) and fetched-then-discarded (code-side). |
| `vip_source` | 391/15,433 set (2.5%) | **ACTIVE when present** — primary contributor-attribution label on `VerifiedGematrias.jsx`, `WriterOS.jsx`, `CommunityWordsBox.jsx` (falls back to `source`) | FACT, refined: the code treats this as authoritative attribution, but coverage is sparse (2.5% overall) and was **0% populated** in the entire 272-row Method-Mentions sample — i.e. the bulk `excel_import` research layer specifically has no attribution, even though the field is real and used where it exists. |
| `lead_rank` | 187/15,433 set (1.2%) | **ACTIVE** — admin "pin word to top of number page" (`LeadOrderEditor.jsx` → RPC `admin_set_lead_ranks`), also consumed by ranking SQL functions and `wa-raziel` | FACT confirmed live, narrow. |
| `source` | dominant: `excel_import`, `wa-vip`/`wa-deep`/etc., `sod1820`/`entity_seed_v1`/`admin_curated` | **ACTIVE** — attribution fallback label everywhere `vip_source` is null | FACT: the real, always-populated provenance axis. |
| `node_id` | set on only 505/15,433 rows (3.3%) | **ACTIVE** — the literal FK bridge to `nodes`, and its presence alone promotes a word to CORE tier in `discovery.js:tierOf()` | FACT: mechanism is fully live and load-bearing, but the "One Tree" graph integration (`unified_graph_law`) is still aspirational for the bulk of this table — 96.7% of rows have no link. |
| `essence_method` / `other_method` / `other_value` | uniformly `רגיל` / NULL / NULL in the 272-row sample | **DORMANT-leaning-ACTIVE** — read in exactly one shared helper (`getWriterCoreWords`, `other_method \|\| essence_method` as a fallback "method" label in `WriterOS.jsx`) — **no write path found anywhere in app code** | FACT: the name promised a structured "other calculation detected" field; the data confirms it's empty in every sampled row, and code confirms there's no app-side writer — so it can only ever be populated by manual DB work or import scripts, never organically. |
| `essence_locked` | true for 15,432/15,433 rows | **UNUSED** — zero reads or writes anywhere in the repo | FACT (code-confirmed): functionally a constant AND dead code. |
| `connectivity` (WhatsApp-audit column) | n/a to gematria_words core, see STEP3 of the prior task | **UNUSED** — zero hits anywhere in the repo | FACT. |
| `created_at` | clusters into a handful of exact bulk-import timestamps | n/a (no dedicated reader/writer beyond ORM defaults) | FACT: reflects import time, not research time — already a hard rule from the Year/Time audit, reconfirmed. |

### A.2 `nodes` (5,889 rows) — the graph's entity/rule/content layer

`type` breakdown: `number`=2,121, `image`=2,020, `entity`=710, `post`=304, `rule`=262, `convergence`=219, `event`=120, `contribution`=19, `foreign_word`=13, `language_bridge`=13, `phrase`=13, `year`=12, `spec`=10, `feature`=8, `music_reference`=7, `word`=6, `roadmap`=6, `concept`=6, `els`=5, `bot_settings`=5, and 10 further singleton types.

- Purpose: the canonical graph — every "thing" the site can point `/number/:n`, `/topic/:slug` etc. at.
- `metadata.world`: **44 distinct values** used across ~500 of the 5,889 nodes (mostly `type=entity`) — e.g. `גאולה`=93, `עבודת ה'`=21, `שמות הקודש`=21, down a long tail to singletons (`חכמה`=1, `בריאה`=1). This is a **richer, separate** vocabulary from `gematria_words.world` (only 5 values) — they share a couple of labels (`גאולה`, `שמות הקודש`) but are not the same list and not synced.
- Canonical: YES — this is the One Tree per `unified_graph_law`.
- Writers: node-promotion flows (topic_cards → node type=convergence is the one directly confirmed by count-matching, see A.5), plus `nodes type='rule'` is hand-maintained (the rules this whole session has been reading from).
- Readers (code-confirmed, ~12+ call sites): `EntityPage.jsx`, `CrossMethodPage.jsx`, `TimelinePage.jsx`, `ContributorPage.jsx`, `BeitMidrashPage.jsx`, `AdminPage.jsx`, `RevelationAxis.jsx`, `systemEvents.js`, `goldTier.js`, plus ~12 call sites in `lib/supabase.js` (timeline events, entity resolution, world/tier lookups, cross-method entities, gold-tier badge, journey seed).
- **New finding**: `nodes.metadata` (jsonb) is the de-facto home for `world`, `tier`, `display`, `weight` sub-fields — meaning there is **already a second, independent "tier" concept** living inside `nodes.metadata`, alongside `gematria_words.visibility_tier` and `gematria_words.space`. Any Research DNA ACCESS-axis design must reconcile *three* existing tier-like signals, not two.

### A.3 `edges` (5,100 rows) — the graph's relationship layer

`from_node`/`to_node`/`relation_type`/`weight`/`metadata`. Canonical, part of One Tree. Not separately profiled this round (schema-only check; row-level semantics out of scope, wouldn't change this document's decisions).

### A.4 `research_objects` (124 rows) — ⚠️ the most important discovery of this document

Columns: `id, kind, statement, terms[], value, relates[], source, source_ref, contributor, confidence, engine_verified, engine_detail(jsonb), evidence, status, promoted_node_id, parent_id, meta(jsonb), owner_person_id, privacy_scope`.

Live data: **100% `status='candidate'`**, sources are `discovery-engine`(43) and `wa-raziel`(64 across relation/observation/hypothesis/fact/question kinds).

**FACT — this table's schema already IS almost exactly the "Research DNA" shape this task asks us to design**: it separates PROVENANCE (`source`/`source_ref`/`contributor`/`owner_person_id`/`privacy_scope`), VERIFICATION (`engine_verified`/`engine_detail`/`confidence`), RESEARCH (`kind`/`statement`/`terms`/`relates`/`parent_id`), and promotion path (`promoted_node_id`, `status`). It is the SIGNAL/DISCOVERY layer named in `command_center_law` ("קלט≠גילוי≠עובדה...").

**INFERENCE**: `research_objects` is currently fed only by Raziel/discovery-engine outputs, not by `gematria_words`. Nothing has ever promoted a `research_objects` row past `status='candidate'` (0 rows with `promoted_node_id` set in the sample). It looks designed-for-this-purpose but under-adopted, not legacy.

**Code-confirmed (§B)**: `research_objects` is never queried directly by client code — access is exclusively through admin RPC `admin_research_feed`, consumed by `WarRoomTab.jsx` (the admin "discovery engine" review screen) and by `WriterOS.jsx` for VAULT-tier classification. A comment in `WarRoomTab.jsx` states explicitly that **no client write path exists yet** ("אף פריט לא נכתב ל-research_objects"). This RPC-only, admin-gated access pattern — also seen on `convergences` (A.5) — is an existing architectural convention worth preserving for any new DNA surface, not just a detail.

### A.5 `topic_cards` (212 rows) / `convergences` (8,917 rows) — the convergence pipeline, confirmed live

- `convergences`: **100% `status='new'`** — this is a raw candidate-generation cache (`fn_generate_convergence_candidates` per the engine function list found in Phase 2), not curated content.
- `topic_cards`: `approved`=204, `merged`=4, `draft`=3, `rejected`=1. This is the curated/edited layer.
- `nodes type='convergence'`=219 ≈ `topic_cards` approved+merged=208 — close enough to confirm the promotion pipeline `convergences → topic_cards (edited) → nodes(type=convergence)` is real and operating, exactly as `command_center_law` describes ("topic_cards = המקור הערוך; באישור מוקרן לגרף כ-node type=convergence").
- Canonical: YES, and already exactly the graph-promotion pattern any new system should reuse (see C, D).
- **Code-confirmed (§B)**: `convergences` is deliberately **not client-readable** — a comment in `lib/supabase.js` states outright *"convergences אינה קריאה-לקוח"* (not client-readable); all client reads go through SECURITY DEFINER RPCs `fn_convergence_for_value`/`convergences_for_author`. The only direct `.from("convergences")` in the whole repo is inside the `wa-raziel` edge function (service-role). `topic_cards` itself is actively read *and* written (status transitions, an admin duplicate-merge tool) across ~11 call sites including `ContributorPage.jsx`'s "ההתכנסויות" tab, `TimelinePage.jsx`, and `scripts/gen-sitemap.mjs`.

### A.6 `gematria_methods` (24 rows) — canonical method registry

Already fully documented in the Method Mentions work (Phase 2/3 of the prior task): `method_key`, `display_label`, `category`, `db_column`, `in_engine`, `active`. Confirmed canonical single-source-of-truth per `canonical_methods_registry_law`. No change proposed here.

**Code-consumer correction**: the repo-wide grep found **zero references to `gematria_methods` anywhere in application code** (`src/`, `api/`, `scripts/`, `tools/`, or the SQL/migration files scanned). This does not contradict its canonical status — `fn_all_methods()` and the other live engine SQL functions used throughout this session (confirmed working via direct `SELECT fn_all_methods(...)` calls) almost certainly reference this table from *inside* PL/pgSQL function bodies that live purely in the database and were not part of this grep's file scope. The practical implication: **`gematria_methods` is descriptive/administrative metadata read by humans and by DB-internal function logic, not something any frontend/API code ever queries directly.** Any Research DNA design should keep treating it as the registry-of-record without expecting to find it wired into the client layer.

### A.7 `entity_types` (13 rows) — a declared sub-ontology, mostly unused

Declares: `entity`(root), `number`, `verse`, `name`, `word`, `person`, `event`, `place`, `object`, `image`, `research`, `fieldmap`, `relationship` — all `is_active=true`.

**FACT**: cross-checking against live `nodes.type` counts, only `number`(2,121), `image`(2,020), `word`(6) among these actually have populated nodes at any real scale; `person`, `place`, `verse`, `name`, `object`, `research`, `fieldmap`, `relationship` have **effectively zero** nodes (not present in the type breakdown at all, or present as `entity`=710 undifferentiated). This is a **declared-but-dormant sub-ontology**.

**Code-confirmed**: the repo-wide sweep found **zero real queries against `entity_types`** — the only mention anywhere is a doc-comment in `EntityLiveHeader.jsx` referencing `entity_types.stats` conceptually; the component itself just takes a `stats` prop from its caller. So this is not merely under-populated data — it's an aspirational/comment-only table with no live app dependency at all. **Verdict: UNUSED, not just dormant.**

### A.8 `post_gematria_links` (583 rows) — post↔gematria join table

`gematria_id`, `post_wp_id`, `post_id`. Simple many-to-many link, described purpose = linking a `gematria_words` row to the WordPress-era or native `posts` it was cited in.

**Code-confirmed correction**: the repo-wide sweep found **zero reads or writes anywhere** in the codebase. **Verdict: UNUSED** — despite 583 populated rows, no live app code queries or maintains this table today. Do not assume it's an active join table; treat it as historical data only.

### A.9 `insights` (308 rows) — AI/community insight cards

Already fully documented via `insight_card_law`/`whats_new_law` in this repo's rules; feeds Beit Midrash / homepage AI box. **Code-confirmed ACTIVE and heavily used**: read/written across `lib/supabase.js`, `lib/contributions.js`, `AdminPage.jsx` (Zuriel's Lab exploratory-findings triage — publish/unpublish, space/category updates), `BeitMidrashPage.jsx` (lesson "sparks"), `HintRoomPage.jsx`. Out of scope for gematria-word-level DNA — this is a downstream *content* surface, not a classification layer, but it is one of the most actively-written admin tables found in this sweep.

### A.10 "aliases" — no table literally named `aliases`, but a real, heavily-used `word_aliases` table exists

No table literally named `aliases` exists. But a real, **heavily-used** table `word_aliases` (FK'd to `gematria_words.id` via `word_id`) is the actual live alias system — non-Hebrew transliterations/aliases per word:
- Full admin console: `LanguageEngineTab.jsx` (approve/hide/delete via RPC `admin_manage_alias`).
- `lib/translit.js`: the transliteration engine *learns* from verified aliases.
- `wa-process` edge function auto-creates English-transliteration aliases from WhatsApp messages.
- **Verdict: ACTIVE.** Method-level aliasing (קדמי=משולש=פוטנציאל, etc.) is a *separate* concept, still living in `nodes type='rule'` + application-code parsing (confirmed via the parser built for Method Mentions Phase 2) — `word_aliases` is about *word/name spelling variants*, not method-name synonyms. Any Research DNA design should reuse `word_aliases` for word-identity questions and keep method-aliasing in `nodes type='rule'` as today — neither needs a new table.

---

## B. CODE CONSUMER MAP

*(Full repo-wide sweep across `src/`, `api/`, `supabase/` migrations+edge-functions, `scripts/`, `tools/` — every verdict below is a real grep hit, not an assumption. 34 files reference `gematria_words` directly.)*

### B.1 `gematria_words` columns

| field | reads (representative) | writes | verdict |
|---|---|---|---|
| `category` | `LanguageEngineTab.jsx` (World Tagger), `CrossMethodPage.jsx` | `scripts/entities-import*`, RPC `admin_world_tag_apply` | **ACTIVE** |
| `tags` | `lib/supabase.js` (curated-tier filter, number-page sort/direction), `EntityPage.jsx` (`כיוון:*` badge), `WriterOS.jsx` | `scripts/entities-import*` (seed only) | **ACTIVE** |
| `world` | `LanguageEngineTab.jsx` (filter+badge via RPC `admin_words_console`), `lib/supabase.js` (`journey_classic_seed` RPC) | RPC `admin_world_tag_apply` | **ACTIVE** (duplicate of `nodes.metadata.world` — do not conflate) |
| `space` | `supabase/functions/wa-raziel/index.ts` (`.eq("space","core")` — public-reply gate) | `scripts/entities-import*` (seed) | **ACTIVE** |
| `dna_status` | none (only AI-agent free-form SQL via `wa-michael`) | `scripts/entities-import*` (seed) | **DORMANT** — no app code branches on it |
| `visibility_tier` | `lib/discovery.js` `tierOf()`, `lib/supabase.js` (sort order), `lib/numberMessage.js`, `api/card.js` (OG-card filter), `WarRoomTab.jsx` | no direct `.update()` found (likely admin RPC not in repo) | **ACTIVE** — central to CORE/VAULT tiering |
| `is_verified` | pervasive: `api/card.js`, `VerifiedGematrias.jsx`, `WriterOS.jsx`, `lib/discovery.js`, `lib/supabase.js` (6+ sites), `wa-raziel` | `LanguageEngineTab.jsx` approve/reject → admin RPC; `scripts/entities-import*` | **ACTIVE**, pervasive publish gate |
| `is_encrypted` / `phrase_hint` | none | none | **UNUSED** |
| `notes` | `lib/supabase.js` (`getWriterCoreWords`, but then dropped in `WriterOS.jsx normCore()` before render) | none | **DORMANT** |
| `vip_source` | `VerifiedGematrias.jsx`, `LanguageEngineTab.jsx`, `CommunityWordsBox.jsx` (primary attribution, falls back to `source`), `WriterOS.jsx`, `lib/supabase.js` | `wa-vip-backfill` edge function (`wa_add_vip_word`) | **ACTIVE when present** (sparse: 2.5%) |
| `lead_rank` | `LeadOrderEditor.jsx`, `lib/numberMessage.js`, `lib/supabase.js` (canonical number-page sort), ranking SQL functions, `wa-raziel` | `lib/supabase.js` → RPC `admin_set_lead_ranks` (from `LeadOrderEditor.jsx`) | **ACTIVE** |
| `source` | `lib/supabase.js` (`srcLabel()`), `LanguageEngineTab.jsx`, `CommunityWordsBox.jsx`, `WriterOS.jsx` | all `scripts/entities-import*` | **ACTIVE** |
| `node_id` | `lib/discovery.js` `tierOf()` (presence ⇒ CORE tier), `lib/supabase.js` | every `scripts/entities-import*` run (`UPDATE gematria_words ... FROM nodes ...` FK-linking) | **ACTIVE**, structural bridge to `nodes` |
| `essence_method` / `other_method` / `other_value` | `lib/supabase.js` (`getWriterCoreWords`: `other_method \|\| ...`), `WriterOS.jsx` (`r.other_method \|\| r.essence_method`) | none found | **DORMANT-leaning-ACTIVE** — read as a fallback label, no app-side writer exists |
| `essence_locked` / `connectivity` | none | none | **UNUSED** |

### B.2 related tables

| table | reads / powers | writes | verdict |
|---|---|---|---|
| `nodes` | `EntityPage.jsx`, `CrossMethodPage.jsx`, `TimelinePage.jsx`, `ContributorPage.jsx`, `BeitMidrashPage.jsx`, `AdminPage.jsx`, `RevelationAxis.jsx`, `systemEvents.js`, `goldTier.js`, ~12 sites in `lib/supabase.js` | `scripts/entities-import*` (entity seeding + FK link-back) | **ACTIVE**, core graph table |
| `edges` | `lib/supabase.js` (`related` relation lookups), `CrossMethodPage.jsx`, `TimelinePage.jsx` | none in app code (import/admin SQL only) | **ACTIVE but narrow** |
| `research_objects` | `WarRoomTab.jsx`, `WriterOS.jsx` (VAULT tier) — **only** via RPC `admin_research_feed`, never direct `.from()` | none — comment confirms no client write path yet | **ACTIVE, RPC-gated, admin-only** |
| `gematria_methods` | none in app code (DB-function-internal only, see A.6) | none | **UNUSED by app code** |
| `entity_types` | none real (one doc-comment only) | none | **UNUSED** |
| `convergences` | only `wa-raziel` edge function direct-queries it (service-role); all client reads go through RPCs `fn_convergence_for_value`/`convergences_for_author` — deliberately blocked per an explicit code comment | Metatron nightly-scan process (outside repo) | **ACTIVE, deliberately RLS/RPC-gated** |
| `topic_cards` | `lib/supabase.js` (~11 sites: get/list/merge-duplicates), `lib/contributions.js`, `ContributorPage.jsx`, `TimelinePage.jsx`, `scripts/gen-sitemap.mjs` | admin status transitions + merge tool | **ACTIVE**, read and written |
| `post_gematria_links` | none | none | **UNUSED** |
| `insights` | `lib/supabase.js`, `lib/contributions.js`, `AdminPage.jsx` (Zuriel's Lab triage), `BeitMidrashPage.jsx`, `HintRoomPage.jsx` | `AdminPage.jsx` (publish/unpublish, space/category) | **ACTIVE**, heavily admin-driven |
| `word_aliases` | `LanguageEngineTab.jsx`, `lib/translit.js`, `lib/feedback.js`, `lib/supabase.js` | `wa-process` edge function, `LanguageEngineTab.jsx` via RPC `admin_manage_alias`, `scripts/english_admin_managers.sql` | **ACTIVE** — this is the real "aliases" system |

**Governing pattern found across the whole sweep**: the tables with the richest, most sensitive schemas (`convergences`, `research_objects`) are the ones **deliberately walled off from direct client access** behind SECURITY DEFINER RPCs. This is not incidental — it's the site's actual existing convention for "raw/candidate data stays server-gated until curated." Any Research DNA v1 implementation should follow the same pattern for its verification/provenance layer, not introduce a new access model.

---

## C. OLD vs NEW CROSSWALK

| MASTER_CLASSIFICATION_v3 dimension | relationship to legacy | verdict | notes |
|---|---|---|---|
| `corpus_role` | no legacy equivalent — `dna_status` is schema-shaped like a maturity ladder but is **code-confirmed DORMANT** (A.1/B.1), `category` mixes theme+pipeline+source | **MISSING** (`corpus_role` itself) + **REPLACE** (`category`'s pipeline-state usage, which should just become `dna_status` finally being read) | Do not assume `dna_status` is "already live" — it is real, well-shaped, and completely unread by app code today. Reviving it as a read signal is cheap; `corpus_role` as designed this session still has no field home. |
| `primary_confidence` | no legacy field | **MISSING** | Nothing in `gematria_words` records classification confidence today. |
| `display_recommendation` | closest: `visibility_tier` (ACTIVE, drives `discovery.js:tierOf()`) + `space` (ACTIVE, gates `wa-raziel`) + `nodes.metadata.tier` (ACTIVE, a *third* independent tier concept found in §B) | **MIGRATE** (concept exists **three times over**, needs reconciling) | This is now a 3-way reconciliation, not 2-way — `visibility_tier`, `space`, and `nodes.metadata.tier` are all real, all currently read by different code paths, and not obviously synchronized with each other. |
| `world_theme` | `gematria_words.world` (5 values, ACTIVE via World Tagger) + `nodes.metadata.world` (44 values, ACTIVE) | **ALREADY_IN_GRAPH** (the richer of the two) + **LEGACY-BUT-LIVE** (`gematria_words.world` — smaller, stale-looking, but still actively read/written by the same admin tool) | See full Worlds Audit in D. Because both are ACTIVE, this is not a simple "kill the old one" — the World Tagger UI needs to be repointed, not just the data. |
| `research_package_*` (cluster/availability/sensitivity) | `research_objects` schema is the closest real ancestor (RPC-gated, admin-only per §B) | **ALREADY_IN_GRAPH** (pattern + access convention), **MISSING** (as applied to `gematria_words` specifically) | Nothing currently links a `gematria_words` row to a `research_objects` or `topic_cards` row. Reuse the RPC-gated access pattern, not just the column shape. |
| `researcher/provenance` | `vip_source` (2.5% populated, code-confirmed ACTIVE-when-present as the primary attribution label), `source` (100% populated, ACTIVE fallback) | **KEEP** (both) | Both fields are real and actively used by code — `vip_source` is not legacy, it's simply sparse. Preserve as-is; the gap is coverage, not architecture. |
| `source_claim_rule` | no direct legacy field; closest is `notes` (usually `phrase` duplicate) | **MISSING** | |
| `method_mention_type` / `method_claim_status` / `method_claim_reason` | no legacy field | **MISSING** | This whole dimension was reverse-engineered from raw `phrase` text this session — it does not exist anywhere in the schema today. |
| `claimed_value` / `engine_verification` | `is_verified` is the closest legacy field, but proven **not equivalent** (see A.1) | **DO_NOT_TRUST as-is, MISSING as a real per-claim field** | |
| `historical/candidate method status` | `other_method`/`other_value` look purpose-built for this, are empty in every sampled row, and code-confirmed have **no app-side writer at all** (§B.1) | **MISSING** (despite a plausible-looking legacy column existing) | |
| `numeric_word_category` / `numeric_word_value` | no legacy field | **MISSING** | |
| `landmark_target_flag` | no legacy field | **MISSING** | |
| `year_hebrew` / `year_gregorian` / `yeartime_category` | `nodes type='year'` (12 nodes) and `type='event'` (120 nodes) exist in the graph already | **ALREADY_IN_GRAPH** (as a graph concept) + **MISSING** (as a per-`gematria_words`-row field) | Do not build a parallel timeline table — connect through `edges` to existing `year`/`event` nodes instead (per the Year/Time audit's own recommendation). |
| `normalization_state` / `duplicate_flag` / `garbage_broken_flag` | closest: `dna_status='appendix'` roughly correlates with unnormalized/raw, but is unread by code today | **MIGRATE** (partial signal exists, not exact, and currently inert) | |
| `ambiguity_unresolved_flag` | no legacy field | **MISSING** | |
| everything under **INTERPRETATION** (claim≠fact separation) | `tags` `כיוון:*` is a real, ACTIVE, code-confirmed precedent (renders on `EntityPage.jsx` today) | **KEEP** (`tags` direction-lens) + **MISSING** (general claim/inference/interpretation split) | |
| a brand-new gematria-specific graph/tree, or a new word-alias table | — | **DO_NOT_BUILD** | `nodes`/`edges` already exist and are actively promoted-into (topic_cards→nodes is proven live); `word_aliases` already covers word/name spelling-variant identity (§A.10/B.2) with a full admin console. Any Research DNA v1 implementation must project into these, not beside them. |

---

## D. WORLDS / THEMES AUDIT

**FACT, not assumption**: the "34 worlds" framing in the task brief undercounts what's live — `nodes.metadata.world` currently has **44 distinct values** (`גאולה`=93 down to nine singleton worlds). Separately, `gematria_words.world` has only **5** distinct values, and `gematria_words.category` has **51** distinct values that are semantically mixed (theme + pipeline-state + source-batch, see A.1).

None of these three (`nodes.metadata.world`, `gematria_words.world`, `gematria_words.category`) is a single clean ontology, and none is a superset of the others:
- `nodes.metadata.world` is the richest and most theme-like (`עבודת ה'`, `מידות ומושגים`, `אקטואליה ואומות`, `מלאכים`, `מושגי קבלה`, `רבנים וחכמים`...) — this reads as a genuine interpretive-topic taxonomy, applied to ~500/5,889 nodes (mostly `type=entity`). **Code-confirmed ACTIVE.**
- `gematria_words.world` is a thin subset (91% null, only 5 values) sharing only 2-3 labels with the node-level list — but it is **also code-confirmed ACTIVE**, driven by the same admin "World Tagger" UI (`LanguageEngineTab.jsx`) via RPC `admin_world_tag_apply`. This is not a dead field being superseded quietly; it's a live admin workflow writing into the smaller/staler of two parallel vocabularies.
- `gematria_words.category` is dominated by non-thematic values (import-batch/source/pipeline-state labels) with real themes (`משיח`, `יהוה`, `גאולה`) mixed in as a minority; also code-confirmed ACTIVE (the same World Tagger reads it to *suggest* a world).
- Method-Mentions Phase 3 additionally surfaced **thematic clusters that exist in the data but appear in none of these three vocabularies** — e.g. the messianic-claim cluster, the "צמח דוד" research thread, "אובמה=גוג/נחש"-style geopolitical clusters. These are real, recurring research themes with **no home** in the current worlds/category system.

**RECOMMENDATION (not built)**: a record should be able to carry **N theme tags from a controlled vocabulary**, stored as an edge-relationship to `nodes type='theme'` (a type that already exists in `nodes.type` — count=1 today, i.e. declared and barely used) rather than as a scalar column on `gematria_words`. This directly satisfies "multiple worlds per record, no rigid single category" without a new table: `nodes type='theme'` + `edges(relation_type='has_theme')` is the exact One-Tree-native shape for it. Whether to seed it from the 44 node-worlds, the 5 gematria_words-worlds, or a reconciled merged list is a decision for Zuriel/GPT, not made here. **Important caveat added by the code sweep**: because `gematria_words.world`/`category` are actively written by a real admin tool today, any consolidation must also **repoint the World Tagger UI itself**, not just migrate the underlying data — otherwise admins will keep writing into a field the new model no longer reads.

---

## E. RESEARCH DNA v1 PROPOSAL (design only — nothing built)

Eleven dimensions, each mapped to **either an existing graph primitive or an explicit MISSING gap** — no new dimension is proposed that requires a new table:

| Dimension | Representation | Grounding |
|---|---|---|
| **IDENTITY** | `gematria_words.id` + `phrase` (unchanged) + optional `node_id` link when promoted | unchanged legacy field, already correct |
| **PROVENANCE** | `source` (keep), `vip_source`/`created_at` (keep as historical, not authoritative), + new optional link to `research_objects.contributor`/`owner_person_id` pattern *if* a `gematria_words` row is ever promoted through the Raziel/discovery pipeline | `research_objects` schema, reused not copied |
| **VERIFICATION** | `engine_verified` / `engine_detail` (jsonb) — reuse the **exact field names already in `research_objects`**, and its RPC-gated access pattern | direct precedent, zero new concepts |
| **SEMANTIC** | edge to `nodes type='theme'` (0-N per record) | see Worlds Audit (D) — but note the World Tagger UI must be repointed, not just the data |
| **RESEARCH** | edge to `topic_cards`/`nodes type='convergence'` for packages/clusters, following the already-proven `convergences→topic_cards→nodes` promotion path | reuse, not parallel |
| **METHOD** | the schema built this session (`method_mention_type`, `research_expression`, `claimed_value`, `verification_state`, `candidate_method_dependency`) — currently only exists as a scratch CSV, has **no DB home yet** | MISSING, needs a real decision (see Migration, H) |
| **NUMERIC** | `numeric_word_category`/`numeric_word_value`/`landmark_target_flag` — same status, MISSING a DB home | as above |
| **TEMPORAL** | edges to existing `nodes type='year'`(12)/`type='event'`(120), never a new timeline table | direct instruction from the prior Year/Time audit, reaffirmed |
| **ACCESS** | reconcile **three** existing signals — `visibility_tier` (drives `discovery.js:tierOf()`), `space` (gates `wa-raziel`), and `nodes.metadata.tier` (a third, independent tier concept found in the code sweep) — into one clear axis; do not add a fourth | avoids the exact anti-pattern already visible in `category`/`dna_status` redundancy, now shown to be a 3-way split, not 2-way |
| **QUALITY** | `dna_status` — real, well-shaped, but **code-confirmed unread by any app code today**; reviving it as an active signal (not replacing it) is the cheapest available win — plus new `ambiguity_unresolved_flag`/`duplicate_flag` (MISSING today) | |
| **INTERPRETATION** | extend the existing `tags` `כיוון:*` direction-lens pattern rather than inventing a new claim/inference field from scratch | direct precedent, `EntityPage.jsx` already renders it |

**Central design rule carried over from every rule this session has operated under**: Claim≠Fact, Parsed≠Verified, HOT≠TRUE — VERIFICATION and INTERPRETATION are **always separate axes** from IDENTITY and SEMANTIC. This is not new policy; it is the same principle already expressed in `research_objects.engine_verified` vs `research_objects.statement`, applied consistently to `gematria_words`.

---

## F. MULTI-DIMENSION TEST (proof-of-model, real records from v3)

Test case from the task brief: *phrase + world=גאולה + year=תשפ"ו + target=786 + method=מילוי + researcher=צבי + package=מחקר כתר + engine_verified=true + availability=premium_candidate.*

12 real records pulled from `MASTER_CLASSIFICATION_v3.csv` already carry 3-5 simultaneous dimensions **without forcing a single corpus_role to describe all of them** — e.g.:

- `44e15865` — `"ביאת המשיח בשנת אלפיים חמש עשרה - אחרי"` : `corpus_role=numeric_word_construct` **+** `research_package_availability=deep_research` **+** `numeric_word_category=mixed_numeric_phrase(2015)` **+** `yeartime_category=year_in_phrase(2015)` **+** `method_claim_status=not_a_method_claim` — five dimensions, one row, no duplication.
- `5f62fa57` — a full verse + `"ביאת המשיח באלפיים חמש עשרה-מיקום האות -70000-מילוי =פי 5"` : `corpus_role=archival_raw` **+** `pkg_avail=deep_research` **+** `method_mention_type=multi_method_instruction` **+** `method_claim_status=unresolved_mismatch` **+** `numword=mixed_numeric_phrase(2015)` **+** `yeartime=year_in_phrase(2015)` — six dimensions.
- `1eb79907` — `"לי דרגת 11111 - משולש -לפי אחד"` : `corpus_role=personal_or_restricted` **+** `pkg_cluster=messianic_claim_linked` **+** `pkg_avail=internal_only` **+** `method_mention_type=multi_method_instruction` **+** `numword=ambiguous` — access-sensitivity, research-package membership, and method-DNA coexist cleanly.

**Result: the eleven-dimension model in E already holds for these real records without any tags/category hack and without ever creating a second copy of the row.** Every dimension above is stored as a *separate column or edge*, never smashed into one field the way legacy `category` mixes theme+pipeline+source today. Full 12-record dump: `MULTIDIM_TEST_EXAMPLES.csv` (attached).

---

## G. ONE TREE CHECK

For every component this proposal touches:

| Proposed element | Node? | Edge? | metadata? | research_object? | topic_card? | derived view? | Verdict |
|---|---|---|---|---|---|---|---|
| Theme/world tagging (multi-per-record) | `type='theme'` node (exists, count=1 today) | `has_theme` edge | — | — | — | — | **use existing node type + new edge type, no new table** |
| Research package/cluster membership | `type='convergence'` node (219 exist) | `member_of` edge | — | — | `topic_cards` row it descends from | — | **reuse the proven convergences→topic_cards→nodes pipeline** |
| Temporal (year/event) DNA | `type='year'`(12)/`type='event'`(120) nodes exist | edge from the `gematria_words` row's future node representation | — | — | — | — | **reuse, never a new timeline table** (already the explicit instruction from the Year/Time audit) |
| Provenance/verification/confidence fields | — | — | — | **`research_objects` schema is the direct precedent** — reuse its column names/shape if/when gematria_words rows enter that pipeline | — | — | **reuse the pattern, do not duplicate the table** |
| Method DNA (mention type, claimed value, verification state) | — | — | — | could live as `research_objects` rows if promoted through Raziel-style review | — | Possibly a **derived view** joining `gematria_words` + a new lightweight `method_claims` table if Zuriel/GPT decide it needs persistence beyond the graph | **no new table proven necessary yet — MISSING, requires a decision, not built here** |
| Access/display tier | — | — | `nodes.metadata.tier` already exists as one of three live tier signals | — | — | derived from reconciling `visibility_tier`+`space`+`nodes.metadata.tier` | **no new table** |

**Confirmed: no new Gematria Graph, no new Research Tree, no new Worlds Tree is proposed.** The one open question — where Method/Numeric DNA persist if they need to outlive a scratch CSV — is flagged as MISSING/HUMAN-GATE, not pre-decided with a new table.

---

## H. MIGRATION STRATEGY (proposal only)

1. **legacy preserved** — no existing column touched, dropped, or backfilled.
2. **DNA projection** — a read-only view (SQL `VIEW`, not a table) joining `gematria_words` with the graph (`nodes`/`edges` via `node_id` where linked) and, for the 796/62/330 already-classified subsets, the CSVs produced this session — computed on read, not stored.
3. **shadow reads** — new surfaces (if any) read from the projection view alongside existing `EntityPage`/`CrossMethodPage` reads of raw `gematria_words`, so nothing currently live changes behavior.
4. **comparison** — compare projection-view output against legacy field values (`is_verified` vs `engine_verified`, `category`/`world` vs `corpus_role`/theme-edges, `visibility_tier`/`space`/`nodes.metadata.tier` vs a reconciled access axis) on a sample before trusting it anywhere.
5. **new Research surfaces** — only after comparison holds up, a genuinely new UI (e.g. a Method/Numeric/Temporal DNA inspector) can read the view. Not scoped or built here.
6. **controlled cutover** — Zuriel decides per-surface when a page switches from reading raw legacy fields to reading the projection.
7. **legacy fields retained as provenance/deprecated** — `essence_method`/`essence_locked`/`other_method`/`other_value` (empirically near-constant or always-null) are candidates for explicit "deprecated, kept for history" labeling — never deletion.

---

## TOP 10 ARCHITECTURAL DECISIONS (facing Zuriel/GPT)

1. Reuse `research_objects`' schema/shape for Method/Numeric DNA rather than inventing new field names — HUMAN-GATE.
2. Decide whether Method/Numeric/Temporal DNA need real persistence (new lightweight table) or stay a computed/derived view — HUMAN-GATE, flagged MISSING above.
3. Reconcile `visibility_tier` + `space` + `nodes.metadata.tier` (three, not two) into one access axis — HUMAN-GATE (this is now a genuine architectural merge, not a cleanup).
4. Decide whether to finally start reading `dna_status` (real, well-shaped, currently 100% unread by app code) as the maturity-ladder signal, or formally retire it — RECOMMENDATION to revive it, but a real decision either way.
5. Model themes as `nodes type='theme'` + edges, never a `gematria_words.world`-style scalar column — RECOMMENDATION, grounded in existing `type='theme'` node, **but requires repointing the live World Tagger UI**, not just migrating data — HUMAN-GATE on timing.
6. Reconcile the 44 `nodes.metadata.world` values against the 5 `gematria_words.world` values into one seed list before any new tagging begins — HUMAN-GATE (content decision, not architecture; both are actively written today).
7. Treat `is_verified` as unreliable for per-claim engine-verification going forward; introduce `engine_verified` as the real signal (precedent already exists in `research_objects`, and note `is_verified` cannot simply be replaced — it's a pervasive, load-bearing publish gate across many surfaces) — RECOMMENDATION.
8. Keep `essence_method`/`essence_locked`/`other_method`/`other_value` as deprecated-but-preserved, not deleted — note `other_method`/`essence_method` are read (as a fallback label) in `WriterOS.jsx`/`getWriterCoreWords`, so removing them silently would change visible output — RECOMMENDATION with a real dependency to respect.
9. Any promotion of Method/Numeric/Temporal DNA into the graph should follow the exact `convergences→topic_cards→nodes` human-gated, RPC-walled pattern already used for `convergences` and `research_objects` — never auto-promote, never open direct client access to raw candidates — RECOMMENDATION (matches `command_center_law` and the site's own existing convention).
10. Decide who is authorized to seed/edit the theme vocabulary once modeled as nodes (mirrors the existing `topic_cards` editorial gate) — HUMAN-GATE.

## TOP 10 LEGACY TRAPS

1. `is_verified=true` looking like "engine-checked" when it is not (empirically disproven this session) — yet it's a pervasive, real publish gate, so it can't just be swapped out.
2. `category='מאגר_ערכים'` and `dna_status='promoted'` being the exact same 7,274 rows under two names — and `dna_status` itself, despite looking like the obvious DNA-maturity field, is **code-confirmed read by nothing** — the redundancy is with a dormant field, not a live one.
3. `essence_locked=true` on 15,432/15,433 rows, confirmed by code sweep to have **zero reads or writes anywhere** — looks meaningful, is fully dead.
4. `other_method`/`other_value` — named exactly like what this whole project needed, empty in every row checked, **and confirmed to have no app-side writer** — yet still read as a fallback label in one live component (`WriterOS.jsx`), so it's not safe to just delete.
5. `notes` duplicating `phrase` verbatim for the bulk `excel_import` layer, **and** separately confirmed to be fetched-then-discarded in the one place code selects it (`WriterOS.jsx normCore()`) — dead on both the data side and the code side.
6. `gematria_words.world` (5 values) vs `nodes.metadata.world` (44 values) sharing a name but not a vocabulary — **both are actively written by the same admin tool today**, making this the opposite of a simple "kill the stale one" cleanup.
7. `created_at` clustering into a few exact bulk-import timestamps — never usable as a research-time signal (already a hard rule, reaffirmed).
8. `node_id` set on only 3.3% of rows, yet its mere presence is the literal switch that promotes a word to CORE tier in `discovery.js:tierOf()` — "One Tree" integration is rare *and* consequential when it happens.
9. `entity_types` declaring 8 sub-entity types (`person`,`place`,`verse`,`name`,`object`,`research`,`fieldmap`,`relationship`) with essentially zero live nodes **and zero real code queries against the table itself** — config that looks authoritative but isn't populated or consulted.
10. Three separate, only-partially-overlapping "tier" concepts already live in production (`gematria_words.visibility_tier`, `gematria_words.space`, `nodes.metadata.tier`) — a new ACCESS axis must reconcile all three, or it becomes a fourth.

## TOP 10 OPPORTUNITIES UNLOCKED BY DNA v1

1. A record can finally belong to multiple themes/worlds at once (edges), ending the category/world false-single-choice.
2. Method-DNA (claimed value vs. engine value, historical vs. candidate method) becomes queryable instead of living only in scratch CSVs.
3. `engine_verified` as a real, trustworthy per-claim signal, replacing the misleading `is_verified`.
4. Numeric-word and landmark/target relationships become explicit instead of buried in free text.
5. Temporal DNA finally connects `gematria_words` rows to the already-existing `year`/`event` nodes instead of being invisible.
6. Access decisions (public/premium/deep/internal/do-not-display) become one clean axis instead of three overlapping, only-partly-synced legacy signals.
7. Interpretation (claim vs. fact) gets a real home, extending the one precedent (`tags` direction-lens) that already proved the idea works.
8. Research packages/clusters (currently only prose in `topic_cards`) can be linked per-`gematria_words`-row via the proven promotion pipeline.
9. Historical/candidate methods (ר"ת, ס"ת, "רגיל ישר והפוך") get a durable place to accumulate evidence over time instead of resetting each audit.
10. A future dedup/quality pass can finally distinguish "duplicate", "repairable", "garbage" and "ambiguous" cleanly, instead of inferring it from `dna_status='appendix'` as a rough proxy.

---

## FACT / INFERENCE / RECOMMENDATION / HUMAN-GATE — final separation

**FACT** (verified by live SELECT and/or direct repo-wide code grep this session):
- All row counts, column distributions, and code-file lists stated above.
- `research_objects` schema already covers provenance/verification/research-object shape; 100% of its rows are `status='candidate'`; access is RPC-only, no client write path exists.
- `convergences→topic_cards→nodes(type=convergence)` promotion pipeline is real and count-consistent; `convergences` is deliberately not client-readable (code comment confirms, RPC-only).
- `gematria_words.world` (5 values) and `nodes.metadata.world` (44 values) are different vocabularies — **and both are actively read/written by the same admin World Tagger tool today.**
- `is_verified` does not track per-claim engine verification, but is a pervasive, load-bearing publish gate (many surfaces depend on it).
- `dna_status` — despite looking like the obvious DNA-maturity field — has **zero app-code readers**; it is written-only.
- `other_method`/`other_value` carry no data in the sampled population and have **no app-side writer**, yet `essence_method`/`other_method` **are** read as a fallback label in `WriterOS.jsx`.
- `essence_locked`, `is_encrypted`, `phrase_hint`, `connectivity`, `entity_types`, `post_gematria_links`, `gematria_methods` (as a client-facing table) all have **zero code references** anywhere in the repo.
- `node_id` links only 3.3% of `gematria_words`, but its presence is the exact switch that promotes CORE tier in `discovery.js:tierOf()`.
- A real, active alias table exists — `word_aliases` — with a full admin console and a transliteration engine that learns from it.
- Three independent tier/access signals are live simultaneously: `visibility_tier`, `space`, `nodes.metadata.tier`.

**INFERENCE** (reasoned from the above, not directly measured):
- The messianic-claim/"צמח דוד"/geopolitical clusters found in Method Mentions have no current home in worlds/category.
- Method/Numeric/Temporal DNA are architecturally MISSING, not merely under-populated.
- `gematria_methods` is likely consumed only from inside DB-side PL/pgSQL function bodies (not scanned by this repo sweep), not from any client code.

**RECOMMENDATION** (proposed, not decided or built):
- Reuse `research_objects` field names/shape *and its RPC-gated access pattern* for any persisted Method/Numeric DNA.
- Model themes as `nodes type='theme'` + edges — but repoint the live World Tagger UI as part of that change, not just the data.
- Route Temporal DNA through existing `year`/`event` nodes.
- Reconcile `visibility_tier` + `space` + `nodes.metadata.tier` (three, not two) into one access axis.
- Treat `essence_method`/`essence_locked`/`other_method`/`other_value` as deprecated-but-preserved — note `essence_method`/`other_method` still render in `WriterOS.jsx` today, so this needs a real code change, not just a data policy.
- Consider finally wiring `dna_status` into app code as the maturity-ladder read-signal, since the concept is sound and already populated — cheaper than inventing a new field.

**HUMAN-GATE REQUIRED** (Zuriel/GPT must decide, not this document):
- Whether Method/Numeric/Temporal DNA get real persisted storage (new lightweight table) or stay a derived/computed view.
- How to reconcile the 44 vs. 5 world-vocabularies into one seed list — and when to repoint the live World Tagger UI.
- How to reconcile three live tier signals (`visibility_tier`/`space`/`nodes.metadata.tier`) without breaking `discovery.js:tierOf()`, `wa-raziel`'s public-reply gate, or whatever currently reads `nodes.metadata.tier`.
- Who is authorized to edit/seed the theme vocabulary once modeled.
- The overall cutover pacing (shadow-read → comparison → controlled cutover) — timeline and surfaces, not decided here.

---

*Governance: READ-ONLY throughout. No DB write, no migration, no schema change, no UI, no deploy, no Master Classification change, no Roadmap update. A closing `work_log` memo (actor=CLAUDE) accompanies this document.*
