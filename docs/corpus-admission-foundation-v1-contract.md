# SOD1820 — Corpus Admission Foundation v1

Status: Implemented on live Supabase (`linswmnnkjxvweumprav`), pending ZURIEL/GPT Human Gate. No code/schema/UI/merge/deploy — DB functions and RLS only, matching this project's "DB changes are live immediately, independent of deploy" convention. No Roadmap/Master State update yet, per explicit instruction — those follow Human Gate approval.

Index entry: `project_codex.slug='corpus_admission_foundation_v1'`. Active law: `nodes.rule_id='corpus_admission_foundation_v1'`. Supersedes/completes `corpus_admission_lifecycle_law` (prior session — defined the lifecycle in words; this pass implements the missing propagation step).

## 1. Word Identity Contract

Three levels, reusing existing, already-proven engine infrastructure — no new fuzzy algorithm invented:

- **EXACT_MATCH** — `phrase = <input>` (byte-identical after `btrim`).
- **SAFE_NORMALIZED_MATCH** — `fn_normalize_for_calc(phrase) = fn_normalize_for_calc(<input>)`. This is the **same IMMUTABLE function the `gw_enforce_engine` trigger itself uses** to compute gematria values — niqqud/teamim, geresh/gershayim/quote variants, and punctuation-to-whitespace only. Representation-safe by construction: if two phrases normalize equal here, they already compute to identical gematria values.
- **POSSIBLE_VARIANT** — anything flagged by the existing `find_similar_words()` (final-letter unification `ךםןףץ→כמנפצ`, root-stripping `א/ו/י` for מלא/חסר, prefix/inflection matching) that isn't already an EXACT/SAFE_NORMALIZED match. **Never auto-merged** — requires Human Gate.
- **NEW** — none of the above.

Implemented: `fn_resolve_word_identity(p_phrase text) returns jsonb` (STABLE, `SECURITY DEFINER`, granted to `authenticated`+`service_role` only). Returns `{classification, match_type?, word_id?, candidates?, human_gate_required?}`. Read-only — makes no admission decision itself, only classifies. **Not wired into any writer this pass** (infra only, per "do not build the final UI yet").

**Known, disclosed limitation:** `find_similar_words()`'s prefix-heuristic is noisy against short (1-2 letter) existing rows and against long multi-word input — several acceptance tests below that should read `NEW` instead returned `POSSIBLE_VARIANT` due to incidental prefix overlap with an unrelated short existing word. This is the **safe direction** (over-cautious, never under-cautious — nothing auto-merges either way) but will need tuning before Writer 3 at scale, flagged as `EXTENSION POINT NOW`, not fixed this pass (the underlying function is reused as-is, not modified).

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

**Gap closed this pass:** `resolve_word_review`'s `approve`/`edit` branch now additionally sets `gematria_words.visibility_reason='approved_by_admin'` (a value already live elsewhere in the data — `wa-vip`/`community`/`wa-deep` families already use it — not new vocabulary) after calling `wa_add_word`, regardless of whether that call inserted a new row or found an existing one. `is_verified` is left **untouched** — it stays a pure engine-calculated signal, never redefined as human-approval, exactly as the lifecycle contract requires. `word_review_queue.status='approved'` and `gematria_words.visibility_reason='approved_by_admin'` are now **both** durable, both queryable, previously only the former was.

## 7. All-Writer Mapping (final contract shape)

| Writer | Final class | Identity resolver wired? | Admission today |
|---|---|---|---|
| `wa_add_word` (via `wa-process` non-VIP) | AUTO SOURCE → candidate | Not yet (exact-string only, unchanged this pass) | Creates `is_verified=false`, `pending_wa` — correctly a candidate, not approved |
| `wa_add_vip_word` | AUTO SOURCE, **still bypasses the queue** | No | **Unresolved bypass**, unchanged this pass — flagged, not touched (would require editing live WhatsApp-facing RPC behavior, out of this pass's scope per no-VIP-behavior-change instruction) |
| `enqueue_word_review(p_safe_to_auto=true)` | AUTO SOURCE, **latent bypass** | No | Unused by any live caller today (confirmed prior audit) — flagged, not removed |
| `resolve_word_review` (approve) | EXPLICIT ADMIN HUMAN-GATE | No | **Fixed this pass** — now records CORPUS APPROVED durably (§6) |
| `admin_add_word` | EXPLICIT ADMIN HUMAN-GATE | No | Direct approved admission — provenance recorded (`source='admin_curated'`), decision is the admin's own call, acceptable per "explicit admin action may remain direct if provenance is retained" |
| `promote_finding_to_dict` | SIDE-EFFECT (of a `research_contributions` approval) | No | Direct `is_verified=true` — provenance (`source='contribution:<author>'`) present; the admin's approval of the *finding* is the Human Gate, word creation is its accepted side-effect |
| `admin_promote_contrib_card` | SIDE-EFFECT | No | Same as above, engine-reverified at insert time (stronger than most) |
| `admin_add_alias` / `admin_edit_alias` | SIDE-EFFECT | No | Creates an anchor word only when none exists (exact-match) — admin-gated, acceptable |
| `wizard_build_convergence` | EXPLICIT ADMIN HUMAN-GATE | No | Best-built existing path — re-verifies every phrase via `fn_ragil` against the target value before any insert |
| `add_entity` | **SIDE-EFFECT → hardened this pass to EXPLICIT ADMIN HUMAN-GATE** | No | **Fixed this pass** (§5) |
| Transliteration/alias promotion (`admin_add_alias` et al.) | SIDE-EFFECT | No | Covered above — no separate transliteration-specific writer found beyond the alias functions already audited |
| Historical/raw imports (`excel_import`, `entity_seed_v1`, `emotion_seed_v1_admission`, etc.) | IMPORT/MIGRATION | N/A | Pre-dates this contract; historical rows stay historical, no retroactive provenance fabricated |

**Not mechanically forced through one UI queue** — per the instruction, admin-gated functions where the admin's own call already constitutes the Human Gate (`admin_add_word`, `wizard_build_convergence`, `admin_promote_contrib_card`, `admin_add_alias`) are left as direct paths, not routed through `word_review_queue`.

## 8. Provenance — minimum going forward

Per admission/discovery: `source` family, `source_ref`, contributor/writer/person where known, `created_by`/actor, `created_at`, original representation (unmodified `phrase`), and decision provenance where a Human Gate applies (`decision_ledger`, reused per §2, not built this pass — named as `EXTENSION POINT NOW`, not yet wired into any writer). **Historical rows stay historical** — no fabricated provenance added to any pre-existing row. `created_by=NULL` from `delete_my_account` remains an explicitly legitimate state, not a data-quality fault.

## 9. Security Tests (this pass, live)

| Test | Result |
|---|---|
| `wa_add_word` (SECURITY DEFINER, postgres-owned) after RLS change | `'queued'` — unaffected, confirmed empirically, test row deleted after |
| `add_entity` as a non-admin-context caller | `'error: forbidden (admin only)'` — confirmed empirically |
| `gematria_words` INSERT policy content | Verified via `pg_policies` before and after — `gw_admin_insert`, admin-only `with_check`, live |
| `anon`/ordinary `authenticated` direct INSERT | Not empirically session-tested (this tool cannot authenticate as a real end-user JWT) — verified **logically**: `auth.uid()` is `NULL` for `anon` and a real-but-non-admin uuid for an ordinary user; both fail the policy's `EXISTS(...role='admin')` check deterministically. Disclosed as logical, not live-session, verification. |
| `UPDATE` policy on `gematria_words` | None exists, before or after — RLS default-deny already correct, unchanged |

## 10. Duplicate/Zero-Duplicate Acceptance Tests (live, read-only, `fn_resolve_word_identity`)

| # | Input | Result |
|---|---|---|
| 1 | `וימאן` (exact existing) | `EXACT_MATCH` |
| 2 | `זעקת ישראל` (exact existing, second sample) | `EXACT_MATCH` |
| 3 | `וַיְמָאֵן` (niqqud added to #1) | `SAFE_NORMALIZED_MATCH` → same `word_id` as #1 |
| 4 | `א״ב` (gershayim/typographic variant of existing `אב`) | `SAFE_NORMALIZED_MATCH` |
| 5 | short novel string (`קסניועברט`) | `POSSIBLE_VARIANT` (prefix-collision with an existing 1-letter row `ק`) — **should read `NEW`; disclosed limitation, §1** |
| 6 | long novel sentence | `POSSIBLE_VARIANT` (prefix-collision with `שמח`/`שמחה`) — same disclosed limitation |
| 7 | rediscovery scenario (`וימאן=107` from a new writer) | `EXACT_MATCH` on the word; correct handling is a new `research_objects` row, zero new `gematria_words` row (§3) — not executed live this pass (would require an actual writer submission, out of scope: "do not bulk-ingest anything") |
| 8-9 (OCR / VIP WhatsApp rediscovery) | Same identity-resolution path as #7 applies once wired — **not wired into any writer this pass** |
| 10 | explicit admin add | `admin_add_word`/`wizard_build_convergence` unchanged, still function as direct Human-Gate admissions |

No fuzzy auto-merge occurred in any test — every non-exact, non-normalized case correctly stopped at `POSSIBLE_VARIANT` for Human Gate, never silently resolved.

## 11. Schema/RPC changes (exact)

- `nodes`/`gematria_words` (existing tables): **1 RLS policy replaced** on `gematria_words` (INSERT).
- **1 function replaced:** `add_entity` (added `SECURITY DEFINER` + admin check; logic otherwise identical).
- **1 function replaced:** `resolve_word_review` (added `visibility_reason` propagation on approve/edit; logic otherwise identical).
- **1 function created:** `fn_resolve_word_identity` (new, read-only, reuses existing engine functions).
- **0 new tables. 0 columns added. 0 existing writer's admission behavior changed** except `add_entity` (hardened) and `resolve_word_review` (lifecycle-completed) — `wa_add_vip_word` and `p_safe_to_auto` explicitly **not** touched, per "no VIP behavior change."

## 12. MUST NOW / EXTENSION / LATER

- **MUST FOUNDATION NOW, done this pass:** table perimeter (§4), `add_entity` hardening (§5), lifecycle propagation (§6).
- **MUST FOUNDATION NOW, still open:** `wa_add_vip_word`/`p_safe_to_auto` bypasses — explicitly deferred (VIP behavior change out of scope this pass), `find_similar_words` prefix-noise (§1) before Writer 3 relies on `fn_resolve_word_identity` at scale.
- **EXTENSION POINT NOW:** wiring `fn_resolve_word_identity` into any live writer (none done — infra only); `decision_ledger` extension for `subject_type='gematria_word'` (reusable, not yet used); `word_aliases` reuse for Hebrew-Hebrew spelling-variant relationships (reusable, not yet used); `research_objects.meta.ext.corpus_admission.matched_word_id` convention (defined, not yet populated by any live writer).
- **LATER:** multilingual/non-Hebrew identity (consistent with the Shared Expression Extraction v1 finding), any UI for the above.

## 13. Foundation Sufficient?

**YES for the perimeter and the two hardened functions** — empirically verified, zero legitimate path broken, zero VIP/WhatsApp behavior changed. **NOT YET sufficient for Writer 3 at production scale** — the identity resolver's noise (§1) and the still-open VIP/`p_safe_to_auto` bypasses mean a third writer's bulk ingestion would still need human review volume disproportionate to genuine ambiguity until those two items close.
