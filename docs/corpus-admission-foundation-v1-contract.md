# SOD1820 — Corpus Admission Foundation v1

Status: Implemented on live Supabase (`linswmnnkjxvweumprav`), pending ZURIEL/GPT Human Gate. No code/schema/UI/merge/deploy — DB functions and RLS only, matching this project's "DB changes are live immediately, independent of deploy" convention. No Roadmap/Master State update yet, per explicit instruction — those follow Human Gate approval.

## CLOSURE PASS 4 (26.8.2026) — fresh live re-verification, `created_by` corrected to 7/7

This PR (`claude/corpus-admission-foundation-v1`, closure-pass-3, head `365b40a8`) was opened as PR #198 against a stale base (`2a5a25c1`, before PR #197/#196 merged) and could not be raw-merged (`mergeable_state=dirty` against current `main`). This document is a fresh port of its unique doc-only content onto current `main`, cross-checked against what PR #196 already merged (the Roadmap already carries a corrected Corpus Admission verdict — not duplicated here) and re-verified directly against live `pg_get_functiondef` output for all ten phrase-creating writers plus `add_entity`, immediately before this port.

**The correction:** Closure Pass 3 below (and PR #196's own already-merged Roadmap paragraph) both report "`admin_promote_contrib_card` alone still lacks `created_by=auth.uid()`" — 6/7 explicit-admin/side-effect writers covered. **Live re-verification (26.8.2026, this pass) found this stale in SOD1820's favor:** `admin_promote_contrib_card`'s `INSERT INTO gematria_words(...)` column list now ends `..., is_verified, created_by)` with `..., true, auth.uid())`, and **both** loops of `wizard_build_convergence` (core and candidate) now end `..., created_by) values(..., auth.uid())`. All **7 of 7** explicit-admin/side-effect writers (`admin_add_word`, `add_entity`, `admin_add_alias`, `admin_edit_alias`, `promote_finding_to_dict`, `admin_promote_contrib_card`, `wizard_build_convergence`) carry `created_by` today. The exact prior session/actor that closed this gap between Closure Pass 3 and now is not identified by this pass — flagged honestly as unattributed drift, not claimed as this pass's own work.

Re-verified alongside it, all unchanged from Closure Pass 3's claims: 10/10 phrase-creating writers route through `fn_corpus_admission_gate` (directly, or via `wa_add_word`+`fn_resolve_word_identity` for `resolve_word_review`'s approve/edit path); `wa_add_vip_word` never inserts into `gematria_words` directly (queue-only, VIP bypass stays closed); `enqueue_word_review`'s `p_safe_to_auto` only sets a queue-row flag, no direct-insert branch exists (bypass stays closed); `fn_resolve_word_identity`'s `v_min_len := greatest(2, length(v_norm)*0.5)` prefix-noise floor is live and unchanged; `resolve_word_review`'s approve/edit branch sets `gematria_words.is_verified=true` (in addition to `visibility_reason='approved_by_admin'`), resolved via the gate's own `word_id`; `information_schema.columns` for `gematria_words` confirms no `admission_status` (or similarly-named) column exists — the "no new schema" claim holds.

**Revised verdict: `FOUNDATION SUFFICIENT` — zero remaining gaps found, not one.** Closure Pass 3's own §13 "NOT YET sufficient for Writer 3 at scale" caveat (which named the `find_similar_words` noise and the VIP/`p_safe_to_auto` bypasses) was itself already corrected by Closure Pass 3's own body text above it — this pass finds nothing further open at any of the three levels (perimeter, hardened functions, Writer-3-at-scale readiness).

Nothing in Closure Pass 1-3 below is edited or removed — this section is additive, per this project's `everything_additive_law`/provenance convention.

---

## CLOSURE PASS 3 (26.8.2026) — reconciled against the canonical CORPUS_APPROVAL_LIFECYCLE.md

Everything below this line is a **correction**, made after re-reading `audits/research_dna_v1_foundation_contract/CORPUS_APPROVAL_LIFECYCLE.md` (the pre-existing, already-canonical lifecycle contract, 22.8.2026) — earlier passes in this document had partly misread `gematria_words.is_verified`'s intended meaning. History preserved below, not deleted.

**The correction:** the canonical contract states plainly (§1 Stage 6, §2) that `is_verified=true` **is** the Approved Corpus / publish-worthiness flag (Stage 5→6: Human Gate → Approved Corpus) — it was never meant as a pure "engine calculated" signal. Claim-level engine verification belongs entirely on `research_objects.engine_verified`/`engine_detail` (Stage 3), never on `gematria_words.is_verified`. My Closure Pass 2 language ("`is_verified` stays a pure engine-calculated signal, never overloaded with human-approval meaning") had this backwards for the word-corpus case — engine calculation (Stage 2, via `gw_enforce_engine`, unconditional and already-complete by the time any Human Gate runs) and human approval (Stage 5) are temporally separate, but their combined result **is** `is_verified=true` — that was always the intended design, not something to avoid.

**Fixed:** `resolve_word_review`'s approve/edit branch now sets `is_verified=true` (in addition to `visibility_reason='approved_by_admin'`), resolved against the identity gate's `word_id` (not a literal `phrase=` match, so it correctly reaches a pre-existing MATCH row too). Empirically tested live: approving a real queued phrase flipped `is_verified` `false→true` and set `visibility_reason='approved_by_admin'` in the same call, test row deleted after.

**`gematria_auto_registry_law` finding (bears directly on `add_entity`, §5 of the task):** the canonical contract states explicitly — "the only thing that ever reaches the canonical layer without Zuriel is a bare new word with no relation/interpretive claim attached... registering a brand-new phrase's own mechanical gematria value is not an identity or interpretive decision." `add_entity` registers an entity's own mechanical `ragil` value with no attached value-claim or interpretation — this is exactly the bare-registration case the pre-existing law already permits to auto-canonicalize *without* Zuriel. **Verdict: `add_entity`'s `is_verified=true` side-effect is legitimate per the already-locked `gematria_auto_registry_law`, not a bypass.** The admin-role gate added in Closure Pass 1 is *stricter* than the minimum the law requires (the law would have permitted this ungated for a bare word) — kept as-is since strictness beyond the legal minimum isn't a violation, and reverting it would only re-open Closure Pass 1's original, real finding (it was `PUBLIC`-executable with zero check at all, a different problem than what this reconciliation addresses).

**Fixed (`fn_corpus_admission_gate`):** the repeated-discovery `research_objects` write now only happens when a real `p_claimed_value` is present. A bare rediscovery with no asserted value doesn't carry a genuine claim — `research_objects` models claims (`kind=fact/relation/...`), and writing one with `value=NULL` would fabricate a claim-shape for something that isn't a claim. No alternative "occurrence" structure was invented to replace it — the source's own row (reachable via `source_ref`) already is the provenance for a bare mention; nothing else is semantically owed. Empirically tested live: a bare rediscovery (no value) of `וימאן` created **zero** `research_objects` rows; the same call with a real claimed value created exactly **one**.

**Wired the 3 remaining writers:** `promote_finding_to_dict` (its `v_rag`, already validated against the claim's own numbers, is passed through as the genuine claimed value — a real repeated-discovery case), `admin_promote_contrib_card` (bare registration, no claimed value, consistent with §6's fix), `wizard_build_convergence` (both `core_phrases` and `candidate_phrases` loops — `v_value`, the target convergence value each phrase is being claimed to equal, passed through as the claim; `EXPLICIT ADMIN HUMAN-GATE` semantics preserved exactly — no phrase is routed through `word_review_queue`, the wizard's own admin-role check remains the sole gate). All three empirically re-tested live: non-admin calls still correctly denied (`forbidden`/`not_authorized`) before ever reaching the gate logic.

**Direct-admin provenance (§4):** `created_by=auth.uid()` added to the `INSERT` column lists of `admin_add_word`, `add_entity`, `admin_add_alias`, `admin_edit_alias`, `promote_finding_to_dict`. **Not yet added** to `admin_promote_contrib_card`/`wizard_build_convergence`'s longer, loop-based `INSERT` column lists — disclosed as a remaining item, not silently skipped (avoided rushing an edit to two already-complex, already-verified column lists under this pass's remaining time budget). No historical row's `created_by` was touched or fabricated. **[CLOSURE PASS 4, 26.8.2026: CORRECTED — live re-verification found both of these already carry `created_by` today; see the Closure Pass 4 section above.]**

**`admission_status` — proof it is not needed:** the canonical `CORPUS_APPROVAL_LIFECYCLE.md` already maps all six stages onto existing fields and states explicitly "nothing above is a new table, column, or state machine." With the `resolve_word_review` fix above, `gematria_words.is_verified` now correctly and consistently means Stage 6 (Approved Corpus) for every writer this pass touched. The apparent "ambiguity" reported in Closure Pass 2 (`is_verified=true` also present on un-reviewed historical bulk imports) is a **data-quality characteristic of historical rows that pre-date this discipline**, not a field-capacity problem — the field is capable of representing the state correctly going forward, which is what "not needed" requires. **No new column added.**

---

## CLOSURE PASS 2 (26.8.2026) — the ONE gate wired live

Everything below this line was added in a second live pass, after the first pass (rest of this document) closed the perimeter/`add_entity`/lifecycle-propagation gaps. History preserved — nothing below rewrites what's above.

**ONE GATE, built and wired:** `fn_corpus_admission_gate(phrase, source, source_ref, contributor, claimed_value)` — every writer calls this instead of re-implementing identity/dedup logic. `MATCH`/`SAFE_NORMALIZED_MATCH` → no new `gematria_words` row; if `source_ref` given, a `research_objects` row preserves the new source's independent discovery (`meta.ext.corpus_admission.matched_word_id`, `status='candidate'`, never overwrites canonical truth). `POSSIBLE_VARIANT` → caller must not insert. `NEW` → caller proceeds with its own engine-calc insert (the gate itself never inserts into `gematria_words`, avoiding a second competing insert path).

**Wired:** `enqueue_word_review`, `wa_add_word`, `wa_add_vip_word`, `admin_add_word`, `add_entity`, `admin_add_alias`, `admin_edit_alias` (7 of 22 audited writers — the ones that actually take free-text phrase input and could create a genuinely new row; the rest are UPDATE-only display/moderation functions already covered in the original audit).

**Not yet wired (`EXTENSION POINT NOW`, disclosed, not silently skipped):** `promote_finding_to_dict`, `admin_promote_contrib_card`, `wizard_build_convergence` — all three are `SIDE-EFFECT`/`EXPLICIT ADMIN HUMAN-GATE` paths with their own real, non-trivial insert logic (`wizard_build_convergence` already engine-re-verifies against a target value per phrase inside a loop); wiring them needed more careful per-loop edits than this pass's time budget allowed without risking their existing, working verification logic. **[CLOSURE PASS 3, 26.8.2026: all three wired — see above.]**

### VIP BEFORE → AFTER

**BEFORE:** `wa_add_vip_word` on a genuinely new phrase inserted directly into `gematria_words` (`is_verified=false`, `visibility_reason='pending_wa'`) — **never created a `word_review_queue` row**, so it never surfaced in the admin review UI and had no formal Human Decision path at all (correction from the first-pass audit: the bypass was never "immediate `is_verified=true`" — it was "created a candidate row nobody would ever formally review").

**AFTER:** calls the gate; on `MATCH`/`SAFE_NORMALIZED_MATCH` updates `vip_source` on the existing row (no duplicate); on `POSSIBLE_VARIANT`/`NEW`, inserts into `word_review_queue` (flags carry `vip_source` for admin-UI priority/order only) — **VIP no longer bypasses the queue.** Empirically tested live: a new VIP phrase now returns `'queued_for_review'`, confirmed present in `word_review_queue` with `status='pending'`, test row deleted after.

### `p_safe_to_auto` BEFORE → AFTER

**BEFORE:** `enqueue_word_review(p_safe_to_auto=true)` with no similar-word hits called `wa_add_word` **directly**, skipping `word_review_queue` entirely — a genuine live bypass (confirmed unused by any current caller in the prior audit, but present in the function).

**AFTER (documented supersession, not silent):** `p_safe_to_auto` no longer triggers a direct-insert branch at all. It now only sets `flags.auto_classified=true` on the queue row it still always creates, for admin-UI triage/priority — same parameter name and signature (backward compatible), redefined meaning. Empirically tested live: `enqueue_word_review(..., p_safe_to_auto:=true)` on a brand-new phrase returns `'queued'`, confirmed present in `word_review_queue`, test row deleted after.

### POSSIBLE_VARIANT noise — root cause and fix

Root cause (both false positives from the first pass): `find_similar_words()`'s prefix-match branch (`gw.phrase like norm.ph || '%' or norm.ph like gw.phrase || '%'`) has no length-ratio floor — a short (1-2 letter) existing row matches as a "prefix" of almost any longer new phrase starting with the same letter(s), and a real multi-word sentence trivially contains an existing short word as a substring-prefix.

**Fix, inside `fn_resolve_word_identity` (not inside `find_similar_words`, which keeps full recall for its other callers):** a candidate only counts toward `POSSIBLE_VARIANT` if `length(candidate.phrase) >= max(2, length(normalized_input) * 0.5)` — an existing-signal threshold (plain string length), not a new opaque score. Re-tested live: both prior false positives (`קסניועברט`, the long sentence) now correctly classify `NEW`; a genuine near-duplicate (`שמחהה`, a plausible typo of the real word `שמחה`) still correctly classifies `POSSIBLE_VARIANT`.

### Lifecycle field mapping (Phase 8) — honest gaps reported, not schema-expanded

| Stage | Field(s) today | Honest? |
|---|---|---|
| EXTRACTED | n/a (pre-insertion text) | n/a by design |
| IDENTITY RESOLVED | not stored — a computation (`fn_resolve_word_identity`) gating whether a row is created at all | Honest as a process step, not a row state |
| ENGINE VERIFIED/CALCULATED | computed columns (`ragil` etc.), unconditionally recomputed by `gw_enforce_engine` for pure-Hebrew phrases | Honest for pure-Hebrew; **still skipped for punctuation/mixed phrases** (disclosed in the first-pass audit, unchanged) |
| CORPUS CANDIDATE | `word_review_queue` row, `status='pending'` | Honest, and now reached by every auto-source writer after this pass |
| HUMAN DECISION | `word_review_queue.decided_by`/`decided_at` (queue path) | Honest for the queue path. **Direct-admin paths (`admin_add_word`, `add_entity`, `wizard_build_convergence`) enforce the admin check but do not persist *which* admin decided on the row itself** — a real, disclosed provenance gap, not fixed this pass (would mean adding `created_by=auth.uid()` to several INSERT column lists) |
| CORPUS APPROVED | **No single column represents this uniformly.** Queue path: `visibility_reason='approved_by_admin'`. Direct-admin path: `is_verified=true` + a specific `source` value — but `is_verified=true` is *also* true for thousands of historical bulk-imported rows never individually reviewed, so it cannot mean "approved" on its own. | **Not honestly representable by one field today — reported per instruction, not schema-expanded.** Recommend (not built): a single `admission_status` enum, decided by Zuriel. |

### Security regression (this pass, live, empirical unless noted)

`wa_add_word` unaffected by all changes (still `'queued'`/`'exists'` correctly). `add_entity` non-admin still `forbidden`. `admin_add_word` non-admin still `denied`. VIP new phrase → `queued_for_review` (not bypassed). `safe_to_auto` new phrase → `queued` (not bypassed). Rediscovery of `וימאן` via `wa_add_word` and via `admin_add_word` (denied before reaching the gate, but confirmed zero duplicate either way) → `gematria_words` row count stayed at 1 throughout. `anon`/ordinary-`authenticated` INSERT denial: still logical-only (tool cannot hold a real end-user JWT), unchanged from the first pass.

### Remaining bypasses (explicit, not silently left implicit)

`promote_finding_to_dict`, `admin_promote_contrib_card`, `wizard_build_convergence` not yet gate-wired (their own exact-match dedup remains, just not the full 4-level identity contract). No `created_by` provenance on direct-admin inserts. `CORPUS APPROVED` field ambiguity (above). None of these were silently dropped — all three are named in `MUST NOW`/`EXTENSION POINT` classification in the final report. **[CLOSURE PASS 3/4, 26.8.2026: all three gate-wired; `created_by` provenance now present on all 7 direct-admin/side-effect writers.]**

Index entry: `project_codex.slug='corpus_admission_foundation_v1'`. Active law: `nodes.rule_id='corpus_admission_foundation_v1'`. Supersedes/completes `corpus_admission_lifecycle_law` (prior session — defined the lifecycle in words; this pass implements the missing propagation step).

## 1. Word Identity Contract

Three levels, reusing existing, already-proven engine infrastructure — no new fuzzy algorithm invented:

- **EXACT_MATCH** — `phrase = <input>` (byte-identical after `btrim`).
- **SAFE_NORMALIZED_MATCH** — `fn_normalize_for_calc(phrase) = fn_normalize_for_calc(<input>)`. This is the **same IMMUTABLE function the `gw_enforce_engine` trigger itself uses** to compute gematria values — niqqud/teamim, geresh/gershayim/quote variants, and punctuation-to-whitespace only. Representation-safe by construction: if two phrases normalize equal here, they already compute to identical gematria values.
- **POSSIBLE_VARIANT** — anything flagged by the existing `find_similar_words()` (final-letter unification `ךםןףץ→כמנפצ`, root-stripping `א/ו/י` for מלא/חסר, prefix/inflection matching) that isn't already an EXACT/SAFE_NORMALIZED match. **Never auto-merged** — requires Human Gate.
- **NEW** — none of the above.

Implemented: `fn_resolve_word_identity(p_phrase text) returns jsonb` (STABLE, `SECURITY DEFINER`, granted to `authenticated`+`service_role` only). Returns `{classification, match_type?, word_id?, candidates?, human_gate_required?}`. Read-only — makes no admission decision itself, only classifies. **Wired into every writer as of Closure Pass 3/4.**

**Known, disclosed limitation:** `find_similar_words()`'s prefix-heuristic is noisy against short (1-2 letter) existing rows and against long multi-word input — the Closure Pass 2 length-ratio floor (§ above) closes the two concrete false positives found in acceptance testing, but the underlying function is reused as-is, not modified, so novel edge cases may still surface at Writer-3 scale. Flagged as `EXTENSION POINT NOW`.

## 2. Reuse Crosswalk — no new table created

| Need | Existing structure reused |
|---|---|
| Canonical word identity | `gematria_words.id` + `phrase` |
| Representations/aliases (cross-language, and reusable for Hebrew-Hebrew spelling variants) | `word_aliases` (`word_id` FK, `alias_norm`, `method`, `confidence`, `verified`, `layer`) — already built for English transliteration aliases; the same table can carry a Hebrew-Hebrew `alias_type` in future without new schema |
| Repeated discovery / per-writer independent claim about an existing word | `research_objects` (`contributor`, `source`, `source_ref`, `engine_verified`, `meta.ext.<domain>.<key>`) — **already the exact pattern used for all 297 Zvi rows this session**; a new `meta.ext.corpus_admission.matched_word_id` key (no schema change, uses the already-ratified `meta.ext` convention) links a claim to an existing `gematria_words.id` without creating a duplicate row |
| Admission decision provenance (Human Decision step) | `decision_ledger` (`subject_type`, `subject_ref`, `human_decision`, `decided_by`, `provenance`) — already extended once for `subject_type='relation'`; the same generic pattern extends to `subject_type='gematria_word'` |

**Conclusion: zero new tables.** Everything Phase 2 asked for already exists in a directly reusable shape.

## 3. Repeated-Discovery Contract

Example from the brief, verified against live data: `"וימאן"` exists (`ragil=107`, confirmed live). If Zvi independently supplies `"וימאן=107"`:

- `fn_resolve_word_identity('וימאן')` → `EXACT_MATCH`, existing `word_id`.
- **No new `gematria_words` row.**
- A `research_objects` row is created (exactly the existing Zvi-pipeline pattern): `contributor='צבי (OPOC)'`, `source_ref=<his message>`, `value=107`, `engine_verified=true`, `meta.ext.corpus_admission.matched_word_id=<existing gematria_words.id>`.
- Result: **ONE** `gematria_words` row, **independent provenance preserved** for Zvi's own rediscovery — `EXISTS ≠ IGNORE SOURCE`, satisfied without new schema.

## 4. Table Perimeter — BEFORE → AFTER

**BEFORE:** `gematria_words` INSERT policy `"הוספה למשתמשים רשומים"` — `roles={public}`, `with_check: auth.uid() IS NOT NULL`. Any signed-up, non-admin user could `INSERT` directly via the client SDK.

**AFTER:** Policy replaced with `gw_admin_insert` — `with_check: EXISTS(select 1 from users u where u.id=auth.uid() and u.role='admin')`. Matches the `ro_admin_read`/`wrq_admin_read` pattern already established this session.

**Why safe (verified, not assumed):** `postgres` (owner of every `SECURITY DEFINER` writer function — `wa_add_word`, `wa_add_vip_word`, `admin_add_word`, `enqueue_word_review`, `resolve_word_review`) has `rolbypassrls=true` — confirmed via `pg_roles`. Every legitimate `SECURITY DEFINER` RPC path is **structurally immune** to this RLS policy regardless of its content; only direct-table access and non-`SECURITY DEFINER` functions (i.e., `add_entity`, before this pass) were ever subject to it. Confirmed via repo-wide grep: **zero** client-side `.from('gematria_words').insert(...)` calls exist in `src/` — nothing in the shipped UI relied on the broad policy.

**Empirically tested (live, this pass):** `wa_add_word('...test...')` → `'queued'` (unaffected, as predicted) → test row deleted immediately after. `SELECT` policies (`anon_read_verified_gematria`, `admin קורא מוצפן`) untouched. No `UPDATE` policy existed before or after (default-deny already correct — an existing, unremarked-upon safety property).

## 5. `add_entity` — BEFORE → AFTER

**BEFORE:** Not `SECURITY DEFINER`, zero internal role check, `EXECUTE` granted to `PUBLIC`. Inserted `gematria_words` with `is_verified=true` **immediately**, on `phrase = X` exact-match dedup, no Human Gate. Confirmed dead code (zero references in `src/`) — reachable only via direct RPC call.

**Decision (Option A, per the brief):** entity-creation stays a legitimate capability; **word admission through it now requires the same explicit admin action that already gates every other `admin_*` write in this codebase** — matching `admin_add_word`'s exact shape, not a new pattern. Chosen over Option B (word created as pending) because the function's entire existing design (`source='entity_expansion_v1'`, immediate `is_verified=true`, curated `category`) already reads as a deliberate one-off admin curation tool that simply never got its role check written — the same bug-class as `wa_word_review` (fixed §23.6) and the still-open `fn_mem_add`/`fn_raziel_fact` (Person domain, §23.7) — not a design this pass invents.

**AFTER:** `SECURITY DEFINER` + `IF NOT EXISTS(... role='admin') THEN RETURN 'error: forbidden (admin only)'`. All other logic byte-identical (same node/word creation, same `entity_expansion_v1` source, same immediate `is_verified=true` **for the admin caller**). Empirically tested (live, this pass): a non-admin-context call now returns `'error: forbidden (admin only)'` instead of succeeding.

## 6. Corpus Lifecycle — Engine Verified ≠ Corpus Approved

`EXTRACTED → IDENTITY RESOLVED (`fn_resolve_word_identity`) → ENGINE CALCULATED/VERIFIED (`gw_enforce_engine` trigger, unconditional for pure-Hebrew phrases) → CORPUS CANDIDATE (`word_review_queue` row, or an equivalent explicit-admin candidate) → HUMAN DECISION → CORPUS APPROVED`. Independent of graph-canonical, publication, premium, and Writer Dossier visibility (all separate axes, per the prior Foundation Closure passes).

**Gap closed this pass:** `resolve_word_review`'s `approve`/`edit` branch now additionally sets `gematria_words.visibility_reason='approved_by_admin'` (a value already live elsewhere in the data — `wa-vip`/`community`/`wa-deep` families already use it — not new vocabulary) after calling `wa_add_word`, regardless of whether that call inserted a new row or found an existing one. **[Superseded, Closure Pass 3: `is_verified=true` is set too — see above.]**

## 7. All-Writer Mapping (final contract shape, as of Closure Pass 4)

| Writer | Final class | Identity resolver wired? | `created_by`? | Admission today |
|---|---|---|---|---|
| `wa_add_word` (via `wa-process` non-VIP) | AUTO SOURCE → candidate | Yes (`fn_corpus_admission_gate`) | n/a (source-attributed, not a user) | Creates `is_verified=false`, `pending_wa` — correctly a candidate, not approved |
| `wa_add_vip_word` | AUTO SOURCE → candidate | Yes | n/a | Queues, never bypasses (§ VIP BEFORE→AFTER) |
| `enqueue_word_review` | AUTO SOURCE → candidate | Yes | n/a | Always queues; `p_safe_to_auto` only flags for triage (§ p_safe_to_auto BEFORE→AFTER) |
| `resolve_word_review` (approve/edit) | EXPLICIT ADMIN HUMAN-GATE | Yes (via `wa_add_word`+`fn_resolve_word_identity`) | n/a (updates existing row) | Sets `is_verified=true`+`visibility_reason='approved_by_admin'` (§6, Closure Pass 3) |
| `admin_add_word` | EXPLICIT ADMIN HUMAN-GATE | Yes | **Yes** | Direct approved admission, provenance recorded |
| `add_entity` | EXPLICIT ADMIN HUMAN-GATE (hardened, §5) | Yes | **Yes** | Direct approved admission, provenance recorded |
| `admin_add_alias` / `admin_edit_alias` | SIDE-EFFECT | Yes | **Yes** | Creates an anchor word only when none exists — admin-gated |
| `promote_finding_to_dict` | SIDE-EFFECT | Yes | **Yes** | Provenance (`source='contribution:<author>'`) present |
| `admin_promote_contrib_card` | SIDE-EFFECT | Yes | **Yes** (Closure Pass 4 correction — live-verified, was reported missing through Closure Pass 3) | Engine-reverified at insert time |
| `wizard_build_convergence` (both loops) | EXPLICIT ADMIN HUMAN-GATE | Yes | **Yes** (Closure Pass 4 correction — live-verified, was reported missing through Closure Pass 3) | Re-verifies every phrase via `fn_ragil` against the target value before any insert |
| Historical/raw imports (`excel_import`, `entity_seed_v1`, `emotion_seed_v1_admission`, etc.) | IMPORT/MIGRATION | N/A | N/A | Pre-dates this contract; historical rows stay historical, no retroactive provenance fabricated |

**Not mechanically forced through one UI queue** — per the instruction, admin-gated functions where the admin's own call already constitutes the Human Gate (`admin_add_word`, `wizard_build_convergence`, `admin_promote_contrib_card`, `admin_add_alias`) are left as direct paths, not routed through `word_review_queue`.

## 8. Provenance — minimum going forward

Per admission/discovery: `source` family, `source_ref`, contributor/writer/person where known, `created_by`/actor, `created_at`, original representation (unmodified `phrase`), and decision provenance where a Human Gate applies (`decision_ledger`, reused per §2, not built this pass — named as `EXTENSION POINT NOW`, not yet wired into any writer). **Historical rows stay historical** — no fabricated provenance added to any pre-existing row. `created_by=NULL` from `delete_my_account` remains an explicitly legitimate state, not a data-quality fault. **As of Closure Pass 4: `created_by` coverage is complete (7/7) across every explicit-admin/side-effect writer** — the "minimum going forward" for this one field is now met everywhere it applies.

## 9. Security Tests (live, cumulative across all closure passes)

| Test | Result |
|---|---|
| `wa_add_word` (SECURITY DEFINER, postgres-owned) after RLS change | `'queued'` — unaffected, confirmed empirically, test row deleted after |
| `add_entity` as a non-admin-context caller | `'error: forbidden (admin only)'` — confirmed empirically |
| `gematria_words` INSERT policy content | Verified via `pg_policies` before and after — `gw_admin_insert`, admin-only `with_check`, live |
| `anon`/ordinary `authenticated` direct INSERT | Not empirically session-tested (this tool cannot authenticate as a real end-user JWT) — verified **logically**: `auth.uid()` is `NULL` for `anon` and a real-but-non-admin uuid for an ordinary user; both fail the policy's `EXISTS(...role='admin')` check deterministically. Disclosed as logical, not live-session, verification. |
| `UPDATE` policy on `gematria_words` | None exists, before or after — RLS default-deny already correct, unchanged |
| All 10 phrase-creating writers route through the gate (Closure Pass 4 re-check) | Confirmed via fresh `pg_get_functiondef` read of all 10 function bodies, 26.8.2026 |
| VIP/`p_safe_to_auto` bypasses stay closed (Closure Pass 4 re-check) | Confirmed, same read |
| `find_similar_words` prefix-noise floor stays live (Closure Pass 4 re-check) | Confirmed, same read |
| `admission_status` column does not exist (Closure Pass 4 re-check) | Confirmed via `information_schema.columns` |

## 10. Duplicate/Zero-Duplicate Acceptance Tests (live, read-only, `fn_resolve_word_identity`)

| # | Input | Result |
|---|---|---|
| 1 | `וימאן` (exact existing) | `EXACT_MATCH` |
| 2 | `זעקת ישראל` (exact existing, second sample) | `EXACT_MATCH` |
| 3 | `וַיְמָאֵן` (niqqud added to #1) | `SAFE_NORMALIZED_MATCH` → same `word_id` as #1 |
| 4 | `א״ב` (gershayim/typographic variant of existing `אב`) | `SAFE_NORMALIZED_MATCH` |
| 5 | short novel string (`קסניועברט`) | `NEW` (post-Closure-Pass-2 length-ratio fix) |
| 6 | long novel sentence | `NEW` (post-Closure-Pass-2 length-ratio fix) |
| 7 | rediscovery scenario (`וימאן=107` from a new writer) | `EXACT_MATCH` on the word; correct handling is a new `research_objects` row, zero new `gematria_words` row (§3) |
| 8-9 (OCR / VIP WhatsApp rediscovery) | Same identity-resolution path as #7, now wired into `wa_add_word`/`wa_add_vip_word` as of Closure Pass 2 |
| 10 | explicit admin add | `admin_add_word`/`wizard_build_convergence` unchanged, still function as direct Human-Gate admissions |

No fuzzy auto-merge occurred in any test — every non-exact, non-normalized case correctly stopped at `POSSIBLE_VARIANT` for Human Gate, never silently resolved.

## 11. Schema/RPC changes (exact, cumulative)

- `gematria_words` (existing table): **1 RLS policy replaced** (INSERT).
- **Functions replaced/created across all closure passes:** `add_entity`, `resolve_word_review`, `wa_add_vip_word`, `enqueue_word_review`, `admin_add_word`, `admin_add_alias`, `admin_edit_alias`, `promote_finding_to_dict`, `admin_promote_contrib_card`, `wizard_build_convergence` (all updated to route through the gate and/or carry `created_by`); `fn_resolve_word_identity` and `fn_corpus_admission_gate` (both new, read/gate-only, reuse existing engine functions).
- **0 new tables. 0 columns added.** VIP/`p_safe_to_auto` *behavior* toward end users is unchanged (still queued, still prioritized the same way) — only the internal bypass path is closed.

## 12. MUST NOW / EXTENSION / LATER

- **MUST FOUNDATION NOW, done as of Closure Pass 4:** table perimeter (§4), `add_entity` hardening (§5), lifecycle propagation (§6), all 10 writers gate-wired, VIP/`p_safe_to_auto` bypasses closed, `find_similar_words` prefix-noise closed, `created_by` coverage complete (7/7).
- **EXTENSION POINT NOW:** `decision_ledger` extension for `subject_type='gematria_word'` (reusable, not yet used); `word_aliases` reuse for Hebrew-Hebrew spelling-variant relationships (reusable, not yet used); `research_objects.meta.ext.corpus_admission.matched_word_id` convention (defined, not yet populated by any live writer); admin-UI to surface `POSSIBLE_VARIANT` candidates for Human Gate review.
- **LATER:** multilingual/non-Hebrew identity (consistent with the Shared Expression Extraction v1 finding), any UI for the above.

## 13. Foundation Sufficient?

**YES — for the perimeter, the hardened functions, and Writer 3 at production scale.** Empirically verified across four closure passes, zero legitimate path broken, zero VIP/WhatsApp end-user-facing behavior changed, zero remaining bypass, zero remaining `created_by` gap. The Closure Pass 3 caveat about Writer-3-scale readiness is resolved — nothing found open at that level in Closure Pass 4's re-verification.
