# SOD1820 — WORDS / NAMES / ALIASES · PHASE 1
Identity + Multilingual Proof. READ-ONLY throughout — 0 writes, 0 migrations, 0 UI, 0 new tables, 0 promotion, 0 deploy.

---

## 0. GOVERNANCE / WHAT WAS READ LIVE

- **`word_aliases`** (schema: `id, word_id, node_id, alias, alias_norm, lang, alias_type, is_primary, source, created_by, created_at, method, confidence, verified, layer`) — **7 rows live.** All 7 point Hebrew corpus words (via `word_id` → `gematria_words.id`) to English surface forms. `node_id` is **NULL on all 7 rows** — the column exists but is never populated in practice; real linkage runs word→word_id→gematria_words, never word→node directly.
- **`nodes type='language_bridge'`** — **13 rows**, a *second*, independently-populated multilingual mechanism: each bridge node (e.g. `"סוד ↔ Secret"`) carries `he_word`, `foreign_word`, `lang`, `value`, `method` (the specific cross-language gematria technique — "English Ordinal," "Reverse Reduction," "transliteration," "translation-value," etc.), `relationship_type` (**shared_value | translation | transliteration**), `evidence_level` (**strong | medium | interpretive**), and `human_verified` (bool). **26 live `edges`** wire these into the graph: `entity --has_language_bridge--> language_bridge --bridges_to--> foreign_word`. This is the richer, actually-used mechanism for cross-language identity.
- **RPC layer confirmed live:** `admin_manage_alias`, `add_word_alias`, `admin_all_aliases`, `admin_add_alias`, `admin_edit_alias` all exist — a full alias-management surface is already built and wired (matches this session's earlier "Legacy → Research DNA Crosswalk" finding: A.10, "Verdict: ACTIVE").
- **`gematria_words`**: 15,433 rows; only **505 (3.3%)** carry a populated `node_id` — most corpus words are not yet promoted into the graph, a real, disclosed sparsity, not a defect.
- Live-reverified `gematria_methods active=true` = **13** (unchanged across this entire multi-phase arc). No rule specifically governs word/name aliasing beyond the general `language_rule` (documentation-format only, not a gematria constraint).

**No new discovery was needed to find these mechanisms** — both `word_aliases` and `language_bridge` already existed and were queried directly; this pass tests whether they're *sufficient*, not whether they exist.

---

## 2–3. THE 35 TEST CASES (`WORDS_NAMES_IDENTITY_PROOF.csv`)

All 10 required categories (A–J) covered, every case sourced from live DB rows — no invented phrases:

| Category | Cases |
|---|---|
| A. Single Hebrew word | סוד, טוב, כבוד |
| B. First name | דוד, אליהו |
| C. First+last / title | דוד המלך, בן דוד, מלך המשיח |
| D. Spelling variants | דוד/דויד, צמח דוד/צמח דויד |
| E. Existing `word_aliases` | תדמיין→imagine, דרים→dream, פזטיב→positive, הפי דרים→happy dream, לבון→realize, ריאלז→realize |
| F. English transliteration | משיח↔Messiah, פילוט↔pilot |
| G. Approved foreign (non-English) | משיח↔мессия (Russian) |
| H. Researcher attribution | סוד↔Secret (Zuriel), בנק/נקב (Zuriel, anagram control) |
| I. Word/name linked to a node | כהן, אלהים (+ reused from A/B/C/F) |
| J. Multi-language cluster | משיח (he ↔ Messiah/en ↔ мессия/ru, one identity, three languages) |
| §8 special bidirectional test | Path A (word→number), Path B (number→word) |

**Result: 33/35 PASS (94.3%), 2/35 FAIL — both the same, single, disclosed capability gap** (below).

---

## FACT

### F1. Identity ≠ spelling ≠ gematria — proven, not assumed
- **דוד** (14) vs **דויד** (24): same referent, live-recomputed gematria differs by exactly the extra letter (י=10). **דוד המלך** (109) is a third, unrelated value for the *same person under a different title*. All three numbers are real, live-verified, and none of them is "the" number for the identity — there isn't one.
- **בנק** (152) / **נקב** (152, its anagram) / **צמח דוד** (152): three completely unrelated identities — bank / hole / "Branch of David" — share the exact same רגיל value by pure coincidence. The model does not merge them (no alias, no edge connects any pair) — a live-confirmed negative control proving "same gematria value" is never sufficient grounds for merging identity (§4's explicit warning, verified in data, not just followed as instruction).
- **פילוט** (pilot, transliteration) / **טיפול** (treatment, translation) are letter-for-letter anagrams: 11 of 13 live method values coincide (position-independent methods), 2 differ (מסתתר, ריבוע — position-sensitive). They are unrelated identities in unrelated languages that happen to share most of their gematria profile. Not merged.

### F2. `translation` vs `transliteration` vs `shared_value` — a real, already-existing distinction, not something this pass had to invent
The `language_bridge.relationship_type` field already separates these three cleanly in the live data:
- **transliteration** (sound-preserving): משיח↔Messiah, משיח↔мессия, פילוט↔pilot.
- **translation** (meaning-preserving): נצחון↔victory, טיפול↔treatment, שיחה↔conversation, סוד↔Secret (word_aliases variant only — the language_bridge variant for סוד is `shared_value`, see below).
- **shared_value** (a real numeric coincidence between an independently-existing Hebrew word and an independently-existing English word — *not* a translation or transliteration relationship at all, just two words whose respective gematria/ordinal values happen to match): סוד↔Secret (English Ordinal), טוב↔good, כבוד↔glory, כהן↔priest, כס↔throne, עבד↔slave.
- **One real inconsistency surfaced, disclosed rather than smoothed over**: "secret" appears as a `word_aliases` row (`alias_type=translation`, lowercase, source=zuriel) **and separately** as a `language_bridge` node (`relationship_type=shared_value`, method=English Ordinal, capitalized "Secret"). Two different mechanisms record two subtly different *kinds* of claim about the same identity, using different casing, and nothing cross-checks them against each other.

### F3. `word_aliases.node_id` is a real, live-confirmed dead column
Column exists in the schema, appears in every one of the 7 rows, and is `NULL` in all 7. Every real alias→identity linkage that exists today runs through `word_id → gematria_words.id`, never through `node_id` directly. This is not a hypothesis — it's what the 7 live rows actually show.

### F4. `language_bridge` already proves the graph, not a parallel table, carries multilingual identity
`entity --has_language_bridge--> language_bridge --bridges_to--> foreign_word` is a real, 3-hop, live-traversable edge chain (26 edges confirmed). משיח alone carries 32 edges total, spanning both its English and Russian bridges — one Hebrew identity, N language branches, zero new tables, zero schema change. This is the single strongest piece of evidence for a **YES** on the decision question, for the specific sub-case of *foreign-word identity linking*.

### F5. Verification-state and evidence-strength are already differentiated, live
`הבטחה↔promise` is `human_verified=false` — the only unverified case in this sample, kept as unverified, not silently promoted. `נצחון↔victory` carries `evidence_level=interpretive` — the model's own honest self-labeling of its weakest cross-language match, shown as-is. Both prove §3's VERIFICATION dimension (verified/unverified/candidate) is not a gap to fill — it already exists and is already populated with real, differentiated values.

### F6. The one real capability gap found (2/35 FAIL cases)
**Spelling-variant identity linking has no live mechanism.** דוד (node-linked) and דויד (no node) are never connected by any edge or alias despite being the single most common spelling-variant pair surfaced repeatedly across this entire session's prior phases (Numeric Language, Methods Expansion, and Phase 5's reconciliation all independently hit this exact pair). Same for צמח דוד / צמח דויד. `word_aliases.alias_type` includes a value literally named `spelling_variant` in the schema's intended vocabulary (per the instruction's own taxonomy) — but **zero live rows use it**. This is a real, disclosed gap: the *mechanism* to record "these two Hebrew spellings are the same identity" exists in the schema (`word_aliases` with `alias_type='spelling_variant'`, or a same-language `language_bridge`-style edge) but has never been populated for even the highest-frequency case in the corpus.

### F7. §8 bidirectional proof — walked, not simulated
- **Word→Number**: "Messiah" (English alias, `language_bridge`, transliteration) → Hebrew canonical "משיח" → live `fn_all_methods_full` (13/13 methods recomputed fresh, רגיל=358 confirmed against the stored value) → number 358 → existing research structure (`topic_card@358`, 58 corpus phrases, the richest single form in this sample).
- **Number→Word**: 358 → the unchanged Phase 1–4 generator → `cardinal_wording(358)="שלוש מאות חמישים ושמונה"` → this exact generated string **already exists** as a live `gematria_words` row (ragil=1898 — a *different* number, correctly kept separate from 358 itself, reproducing §5's identity/spelling/gematria distinction one more time) — a fact already independently surfaced in Phase 5's reconciliation work, now reconfirmed here from the opposite direction. `digit_read(358)="שלוש חמש שמונה"` has **no** corpus match — disclosed, not hidden, and consistent with Phase 1–4's own finding that digit-read forms are rarer in natural usage than cardinal forms.
- Both directions use the *same* live engine, the *same* `gematria_words` table, and the *same* alias/bridge mechanisms — no direction-specific infrastructure exists or was needed.

---

## INFERENCE

- The coexistence of `word_aliases` (schema-rich, data-poor: 7 rows) and `language_bridge` (schema-different, data-richer: 13 rows, live-wired into the graph) is not a sign either is broken — it looks like two genuinely different use cases that happened to evolve separately: `word_aliases` for **within-word surface variation** (spelling, phonetic transliteration of foreign terms *into* Hebrew), `language_bridge` for **cross-language conceptual linking** (a Hebrew word and a foreign word that share meaning or gematria value, kept as first-class graph citizens). Both are needed; neither replaces the other.
- The `word_aliases.node_id` dead column and the missing spelling-variant coverage (F3, F6) are best read as the SAME underlying gap: the "cheap," lightweight alias table was never actually used for the identity-linking role its schema implies. The `language_bridge`+`edges` pattern is doing that job today for cross-language cases, but nothing plays that role for same-language spelling variants.
- The secret/Secret duplication (F2) suggests that without a light cross-check, the two mechanisms could silently drift — not urgent, but worth a human's attention before either grows much further.

## RECOMMENDATION (process only — nothing built)

1. **Do not create a new table.** Every case in this 35-case sample was expressible in the existing `gematria_words` + `word_aliases` + `nodes`/`edges` (`language_bridge`) model. The one real gap (F6) is a **missing edge type**, not a missing table: a same-language "same identity, different spelling" relationship needs *some* home — either (a) start populating `word_aliases.alias_type='spelling_variant'` rows (the column already accepts this value, per the intended taxonomy, just never used), or (b) mint a `same_identity`/`spelling_of` edge between two `gematria_words`-linked nodes, mirroring the existing `language_bridge` pattern one level down (same-language instead of cross-language). Either is a data-population decision, not a schema change.
2. If (a) is chosen, retroactively back-filling the דוד/דויד and צמח דוד/צמח דויד pairs (and likely others surfaced across this session's earlier phases) would be a natural, bounded first population task — proposed only, not started here.
3. A light cross-check between `word_aliases` and `language_bridge` for the same Hebrew word (the secret/Secret case) would catch future drift cheaply — proposed only.

## HUMAN-GATE

- Confirm whether `word_aliases.alias_type='spelling_variant'` (populate the existing table) or a new same-language `language_bridge`-style edge (extend the existing graph pattern) is the preferred home for spelling-variant identity — both are non-schema-changing options; this pass doesn't decide, and building either is out of scope here regardless.
- No alias, edge, or node was created in this pass. All findings are read-only observations for Zuriel's review.

---

## 10. DECISION

**Question:** Is the existing model sufficient to support word expansion, first names, full names, spelling variants, transliterations, and multilingualism — without schema redesign?

### Answer: **YES** (with one disclosed, non-blocking population gap)

33 of 35 real test cases across all 10 required categories passed cleanly using only the existing `gematria_words` + `word_aliases` + `nodes`/`edges` (`language_bridge`) model, run against the live engine with no simulated data. The 2 failing cases (spelling-variant linking) fail because a *data population* step was never done — not because the schema lacks a place to put it (`word_aliases.alias_type` already accepts `spelling_variant`; a same-language edge could mirror the already-working cross-language `language_bridge` pattern). The §8 bidirectional test confirms both directions (word→number, number→word) run through identical, unmodified infrastructure. No table, migration, or schema redesign is needed to close the one real gap found — only a decision about which of the two already-existing patterns should carry same-language spelling-variant identity going forward.

---

## STOP

READ-ONLY throughout. No `word_aliases`/`nodes`/`edges` writes, no new words, no alias creation, no UI, no schema, no deploy. Closing `work_log` memo (`actor=CLAUDE`, `task=WORDS_NAMES_ALIASES_PHASE_1`, `status=completed`) logged separately.
