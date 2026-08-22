# Gematria Methods Unification + Auto-Calc + Premium Research Composites — Plan

**Task:** `GEMATRIA_METHODS_UNIFICATION_AND_PREMIUM_COMPOSITES`
**Branch:** `claude/sod1820-language-corpus-audit-eapfqr` (no new branch created — per orchestrator rail #1)
**Scope executed:** Architecture + Implementation, prepared on branch, **nothing activated in production**.
**Companion files:** `GEMATRIA_METHODS_LIVE_STATUS.csv` · `GEMATRIA_METHODS_COMPOSITE_CONTRACT.md` · `GEMATRIA_METHODS_HUMAN_GATE.csv`

---

## 0. Orchestrator safety-rail interpretation (stated explicitly, as instructed)

- **Zero live DB writes** except the one closing `work_log` memo. Every SQL function/registry change described below exists **only as a `.sql` file** under `supabase/migrations/`, never executed via `apply_migration` or `execute_sql` DDL against project `linswmnnkjxvweumprav`. All read-only `SELECT`s (including `WITH`-CTE equivalents of the new function bodies) used to *verify* the prepared SQL are documented inline in this plan and in the migration files' comments — those are reads, not writes.
- **No schema migration at all.** Anywhere this task's own §3 separation would require a new column/table, this plan stops and marks it `IMPLEMENTATION DECISION REQUIRED` (see §6, §9) rather than writing an `ALTER TABLE`.
- **No production activation.** משולש מילה / משולש הפוך are prepared (SQL functions written, verified by read-only query) but **not** registered in `gematria_methods`, and the ordinary approved-word auto-calc path (`gw_enforce_engine`) is **untouched** — an approved-word save computes exactly the same 14 stored columns after this pass as before it.
- **No canonical value changed.** `src/lib/gematria.js` and `src/lib/supabase.js` were touched; every change is additive (new `col` metadata field, one constant derived instead of hand-duplicated) and is regression-tested byte-for-byte against the locked `nodes`-rule examples — see §8 and `scripts/test_gematria_methods.mjs` (86/86 pass).
- **Nothing committed, pushed, or touched on PR #166.** All of this sits as uncommitted working-tree changes for the orchestrator to review.

---

## 1. Governance read — what was already decided (not re-derived)

The most load-bearing prior decision is `nodes.rule_id = 'gematria_methods_catalog'` (decided by Zuriel, **21.8.2026** — the day before this session), which already states the exact target architecture this task asks to implement:

> *"מקור-האמת לשיטות הוא public.gematria_methods... אין לקבע בחוק מספר קבוע של שיטות... יעד חישובי: כל מילה/ביטוי שנכנסים למאגר הגימטריה הקנוני יחושבו אוטומטית בכל השיטות הקנוניות... implementation_status: policy_only_pending_live_reconciliation."*

That `implementation_status` field is the honest starting point: **as of 21.8.2026, this was policy only — nothing had been reconciled against the live engine yet.** This pass is the first live reconciliation pass.

Also load-bearing: `canonical_methods_registry_law` (23.7.2026) already named 4 known engine gaps (אטבח · מילוי בלבד · מסתתר גדול · מילוי דמילוי גדול) — this pass confirms 3 of those 4 are still gaps today, and refines the 4th (אטבח: not a *missing* function, but a *wrong* one — see §4).

**No re-research of already-investigated methods was performed**, per the task's own instruction. Prior sessions had already:
- Implemented משולש מילה / משולש הפוך / משולש מדרגות in `src/lib/gematria.js` (work_log `189a892b…`, `b4ccb3d5…`, 25.7.2026) and registered them as candidate rows in `gematria_methods` (sort_order 21–23, `active=false`).
- Investigated ר״ת / ס״ת / רגיל ישר והפוך (work_log `4a872e50…`, 22.8.2026, same session chain) — out of this task's explicit scope, not re-touched.
- Never investigated אי״ק בכ״ר / אח״ס בט״ע specifically — confirmed by search of `work_log`, `nodes` rules, `project_codex`, and the full research-archive snapshot. See §7.

---

## 2. Is `gematria_methods` actually the SSOT today? — the honest answer

**Partially, and unevenly across three different sub-systems.** This is the single most important finding of this pass.

| Sub-system | Registry-driven? | Evidence |
|---|---|---|
| `fn_all_methods_full(subject, entitlement)` | **Yes, genuinely.** Loops `gematria_methods where active=true and function is not null`, dynamically `execute format('select %I($1)', function)`, and already implements entitlement-ranking (`public < subscriber < premium < admin`) exactly matching §3's ACCESS/VISIBILITY separation. | Read live via `pg_get_functiondef`. |
| `gw_enforce_engine` (trigger — the actual **auto-calc-for-approved-corpus** path) | **No — fully hardcoded.** A fixed PL/pgSQL block sets 14 named columns (`ragil, misratar, miluy, kadmi, gadol, siduri, atbash, albam, miluy_demiluy, kadmi_gadol, ribua, ribua_gadol, hakpala, hakpala_gadol`) by calling 14 named functions. It does not read `gematria_methods` at all. | Read live via `pg_get_functiondef`. |
| `bidim_sync` (trigger — reverse index) | **No — fully hardcoded**, same 14-column list, mapped to display-name strings. Internally consistent with `gw_enforce_engine`'s column set (no drift *between* these two), but neither reads the registry. | Read live via `pg_get_functiondef`. |
| `src/lib/gematria.js` (`METHODS`/`DEPTH_METHODS`) | **No — the JS engine is its own source**, and always has been (`gematria_engine_law`: `src/lib/gematria.js` is itself named as an "official engine"). This pass added `col` metadata bridging it *toward* the registry's column names, without making it *read from* the DB (a client-side JS module reading a live table on every import would add a network dependency to a currently-pure, synchronous, unit-testable module — assessed as not worth the risk for this pass; see §12). | Direct file read + this pass's diff. |

**Conclusion:** `gematria_methods` is the SSOT for **dispatch-on-demand** (`fn_all_methods_full`) but is **not yet** the SSOT for **what gets auto-computed and stored** for every approved word — that is still governed entirely by `gw_enforce_engine`'s hardcoded list, which predates the registry and has drifted from it (§5). The JS engine (`gematria.js`) is a third, independent source that happens to agree with the SQL engine almost everywhere (one confirmed exception — §4).

This is not a contradiction the task asked me to resolve by force — §2 itself says: *"if a mechanism cannot read dynamically from the registry for a technical reason, report explicitly why and the safest sync mechanism."* That's exactly §5 below.

---

## 3. Method Capability Separation (task §3)

Implemented **without new schema**, using fields that already exist on `gematria_methods` plus one already-existing per-word override mechanism on `gematria_words`:

| Capability | What answers it today | New schema needed? |
|---|---|---|
| **DISPATCHABLE** ("the engine can compute this on demand") | `gematria_methods.active = true AND function IS NOT NULL` — exactly what `fn_all_methods_full`'s loop condition already checks. | No. |
| **AUTO-CALCULATED FOR APPROVED CORPUS** ("every approved word gets this automatically") | *Should* be `active=true` + a real storage column, surfaced via `gw_enforce_engine`. **In practice it is governed entirely by `gw_enforce_engine`'s hardcoded 14-column list**, which has drifted from `active` (§5). | No new columns needed to *describe* it (the existing `db_column` field already exists for this purpose) — but making the *trigger itself* registry-driven, if ever desired, is a bigger, riskier change (§12, Decision K), not attempted this pass. |
| **STORED / CACHED vs. DERIVED-ON-DEMAND** | `gematria_methods.db_column IS NOT NULL` → claims stored; `IS NULL` → dispatch-on-demand only (e.g. אטבח, אותיות אחרי/לפני, and the 3 triangle methods have no column at all — computed fresh every time they're requested, in JS today). | No. |
| **ACCESS / VISIBILITY** (Free/Premium/Deep Research/tier) | Two layers, both already exist: (a) **per-method default** — `gematria_methods.required_entitlement` (currently `public` on all 24 rows — no method has ever been gated yet); (b) **per-word override** — `gematria_words.tier_ragil / tier_misratar / tier_kadmi / tier_miluy` (+ table-level `visibility_tier`), a pre-existing 3-tier mechanism covering only the 4 original methods. | No — both layers already exist. Extending the per-word override to more methods (if ever needed) would require new columns, but nothing in this task needs that; the composite tier proposal in §E of `HUMAN_GATE.csv` uses the per-method layer only. |

**"Approval of a method ≠ Access" and "Calculation ≠ Display"** are both already true in the current architecture: `fn_all_methods_full` computes based on `active`+`function` (calculation gate) and separately filters by `required_entitlement` vs. the caller's rank (access gate) — these are already two independent checks in the same function body, not conflated into one flag. The task's warning that "`in_engine` currently conflates several meanings" is confirmed true, but the fix is not to merge things — it's to stop treating `in_engine` as meaningful at all for computation decisions (see §5: it isn't read by any dispatch or storage logic today, only `active`+`function`+the hardcoded trigger list are) and to correct the 3 rows where it's simply stale bookkeeping (Decision B).

---

## 4. Confirmed DRIFT (task §1/§8 instruction: report, don't silently pick a side)

### 4.1 אטבח — dispatched SQL function disagrees with the JS engine (HIGH VALUE — Decision F)

`gematria_methods` row `אטבח` points `function` at `fn_atbach`. A second function, `fn_atbach_maharshal`, also exists live. They implement **different** final-letter substitution tables and disagree on real input:

```
fn_atbach('יום משיח')            = 696
fn_atbach_maharshal('יום משיח')  = 506
gematria.js ATBACH_L('יום משיח') = 506   (matches fn_atbach_maharshal, NOT fn_atbach)
```

`gematria.js`'s own comment cites "מהרש\"ל" (Maharshal) and "יום משיח = 506" — i.e. the JS engine already believes it implements the Maharshal variant, and it agrees with the SQL function of that name, not the one the registry actually dispatches. **No locked `nodes` rule exists for either variant** (unlike אתב״ש/אלב״ם/הכפלה/etc., which all have a `_def` rule) to independently arbitrate which is "the real" אטבח. This is a live, reproducible bug in what `fn_all_methods_full` returns for this method today for any word containing a final letter — not touched this pass, flagged as Decision F.

### 4.2 `in_engine` flag is stale for 3 rows

`אטבח`, `מילוי בלבד`, `מסתתר גדול` all show `in_engine=false` in the registry, but `src/lib/gematria.js` implements all three today. Zero functional impact (nothing reads `in_engine` for dispatch or storage decisions), but worth correcting for anyone reading the registry as documentation. Decision B.

### 4.3 The big one — `active=false` rows that are actually live in production every day

Four rows (`הכפלה`, `הכפלה גדולה`, `מילוי דמילוי`, `ריבוע גדול`) are marked `active=false, function=NULL` in `gematria_methods` — meaning `fn_all_methods_full` and the new `fn_method_profile` both report them as unavailable. **But `gw_enforce_engine` calls `hakpala_calc`, `hakpala_gadol_calc`, `miluy_demiluy_calc`, and `ribua_gadol_calc` for every single approved word, right now, in production**, and their results are already sitting in the corresponding `gematria_words` columns for all 15,433 rows. This is the clearest evidence that **the registry has not kept pace with the trigger** since the registry was created (23.7.2026) — the trigger predates it and was never reconciled. Decision A (near-zero-risk correction) fixes the registry-side under-reporting without changing a single computed value.

### 4.4 Two fully-built, fully-verified SQL functions sitting unregistered

`mistater_gadol_calc` and `miluy_demiluy_gadol_calc` both exist live, both verified this pass against every locked example in `mistater_gadol_def` and `miluy_demiluy_gadol_def` (exact match, zero drift) — but neither is referenced anywhere in `gematria_methods`. Registering them (Decision A) makes them dispatchable with zero code to write.

### 4.5 מילוי גדול (row 24) — the reverse gap

Added 20.8.2026 with a live SQL function (`fn_miluy_gadol`) but **no JS mirror at all**, no locked `nodes` rule, and no `verified_examples` found anywhere. Flagged `NEEDS_VERIFICATION` (Decision I) — distinct from `NEEDS_HUMAN_DEFINITION` because a concrete implementation exists, but its correctness has not been checked against anything, so it should not be trusted or activated without Zuriel confirming a worked example.

---

## 5. Why `gw_enforce_engine` / `bidim_sync` are not registry-driven, and the safest sync mechanism (task §2's explicit ask)

**Technical reason:** both are row-level `BEFORE INSERT/UPDATE` triggers that assign to specific typed columns of `NEW` (`NEW.ragil := ...`, `NEW.hakpala := ...`, etc.). PL/pgSQL does not support iterating a registry table and dynamically assigning to an arbitrary `NEW.<column>` by name in the same way `fn_all_methods_full` can dynamically call an arbitrary *function* by name — dynamic `NEW` field assignment by string column name requires either the `hstore` extension (`NEW := NEW #= hstore(...)`) or building a `jsonb`/record and re-casting, both of which are materially more complex and riskier to get right in a trigger that fires on **every single write** to a 15,433-row table with real users depending on its output today (the whole approved-word pipeline: word review → approval → this trigger → `bidim_sync` → cross-method search). A bug introduced here is a production incident, not a cosmetic one.

**Safest sync mechanism, recommended but not attempted this pass (Decision K, follow-up phase):**
1. Keep the trigger hardcoded, but treat `gematria_methods` as the thing that must be kept in sync *with* it — i.e., whenever a method is added to the trigger's column list, the same session updates the registry row in the same change (this is exactly the fix Decision A applies retroactively for the 4 rows that already drifted).
2. If Zuriel wants a genuinely registry-driven trigger, the safer path is a **new, versioned trigger function** built and tested against a staging/branch copy of `gematria_words` (not attempted here — no branch database was created this pass, and no live DDL was run at all per the orchestrator rail), using `hstore`-based dynamic assignment, with a full regression suite comparing its output row-by-row against the current hardcoded trigger's output for a large sample before ever replacing it.
3. Either way, **`bidim_sync` must be kept in lockstep with whatever `gw_enforce_engine` stores** — they are already consistent with each other today, and any future change to the stored-column set must touch both in the same change.

---

## 6. משולש מילה / משולש הפוך — resolution (task §6)

**Definition status: unambiguous, already Human-confirmed once (Zuriel's own request, work_log `189a892b…`, 25.7.2026), already deterministic, already JS-verified.** No new research was performed — the existing implementation was read, its locked examples were re-verified live, and its live-dispatch status in the UI (via `DEPTH_METHODS`, consumed by `NumberDrawer`, `GematriaCalculator`, `BeitMidrashPage`, `CommunityCalculatorPage`, `NameLabPage`, `ActiveEntityPanel`, `SearchesTab`, `NumberFamilies`, `MethodAnalyze`, `ApiPanel`, `coreEngine.js` — 12 files) was confirmed unchanged by this pass.

**What this pass did:**
- Wrote `triangle_word_calc(text)`, `triangle_reverse_calc(text)` (+ bonus `stair_triangle_calc(text)` for משולש מדרגות, same family, built in the same prior session) as pure, additive `CREATE OR REPLACE FUNCTION` statements in `supabase/migrations/20260822_gematria_triangle_word_functions_prepared.sql`.
- Verified all three **without creating them live** — ran the exact `WITH`-CTE equivalent of each function body as a read-only `SELECT` against the live database and confirmed they reproduce the locked examples exactly (משולש מילה(צוריאל)=1432, צוריאל פולייס=4194; משולש הפוך(צוריאל)=927; משולש מדרגות(משיח בן דויד)=866).
- Did **not** register them in `gematria_methods`, did **not** touch `gw_enforce_engine`, did **not** add storage columns.

**IMPLEMENTATION DECISION REQUIRED (Decision J):** if Zuriel wants these stored per-word (not just dispatch-on-demand), `gematria_words` needs 2 new columns and `gw_enforce_engine`'s hardcoded list needs to grow — a real schema migration, explicitly out of scope this pass (orchestrator rail #3). Until that decision is made, these stay dispatch-on-demand only, exactly like אטבח / אותיות אחרי / אותיות לפני today.

**What still requires Zuriel, specifically (Decisions C and D):** applying the prepared function file, then pointing the registry at it (dispatch-only, `active` still false — Decision C), and separately, explicitly, flipping `active=true` (Decision D) — kept as two separate decisions on purpose, per orchestrator rail #4, so "the function exists" and "this is now an answerable method" are never bundled into one approval.

---

## 7. New candidates from Zuriel — אי״ק בכ״ר, אח״ס בט״ע (task §7)

**Both remain at the `known` stage of `method_lifecycle` — neither reached `candidate`.** Per the locked rule: *"לא-שוחזר → עצור → אדם, אל תמציא"* (not reconstructed → stop → ask a human, never invent).

Evidence gathered (not invented): both terms appear as bare citation labels in raw, unverified `gematria_words` rows (`source='excel_import'`) — e.g. `"בצלם אלהים"` → `notes: "1692 - איק בכר - 1134"`, `"הגאולה בעתה"` → `notes: "...266 - אחס בטע"`. Roughly 15 rows cite אי״ק בכ״ר, ~10 cite אח״ס בט״ע, always as `"<value> - <method-name>"` labels with **no accompanying letter-substitution table or algorithm anywhere** — not in these rows, not in `nodes` rules (no `_def` rule for either exists, unlike every other cipher method in the system), not in `project_codex`, and not in the full research-archive snapshot (`era1-method-mentions/*.csv`, `era2-methods-expansion/*.csv` — both searched, zero hits with an algorithmic definition).

This is **not** the same situation as משולש מילה (§6), where a human had already supplied and confirmed a concrete rule. For אי״ק בכ״ר / אח״ס בט״ע there is nothing to reconstruct from — no worked example even exists that isolates the transformation from the rest of a multi-method sentence (every corpus row citing these labels also cites 2–4 other methods on the same phrase, so the specific numeric contribution of "איק בכר" alone cannot be isolated without already knowing the cipher).

**This agent did not attempt to guess these ciphers from general/parametric knowledge of classical Hebrew gematria systems**, per `gematria_engine_law` ("אסור... לחשב ידנית... להסתמך על זיכרון"). Decisions G/H in `HUMAN_GATE.csv` ask Zuriel directly for the transformation rule.

---

## 8. What changed in code this pass, and why it's safe

| File | Change | Risk mitigation |
|---|---|---|
| `src/lib/gematria.js` | Added a `col` field (DB column name, or `null`) to every entry in `METHODS` and `DEPTH_METHODS`, and exported `METHOD_DB_COLS` (a `{key: col}` map derived from those same arrays — not a new parallel list). | Purely additive object key — no `.fn`, `.key`, `.sub`, `.soul`, `.map`, or ordering changed. All 18 consumer files destructure only the fields they already used; none break. Verified: `npm run build` succeeds; all 86 regression assertions pass. |
| `src/lib/supabase.js` | `GEM_METHOD_COL` (previously its own 3-entry hand-written object: `{ragil:'ragil', misratar:'misratar', kadmi:'kadmi'}`) now reads those same 3 values from `METHOD_DB_COLS` imported from `gematria.js`, instead of duplicating them. | Values are asserted identical in the test script (`GEM_METHOD_COL source: ragil/misratar/kadmi` checks). `getGematriaByValue`/`getGematriaCountByValue` behavior is byte-for-byte unchanged — same 3 possible column names, same fallback to `'ragil'`. |
| `src/lib/research/compositeMethods.js` (new) | Composite Research Transforms module — see `GEMATRIA_METHODS_COMPOSITE_CONTRACT.md`. | Not imported by any existing file — zero blast radius. Fully covered by the test script (§8 of the test file). |
| `scripts/test_gematria_methods.mjs` (new) | 86-assertion regression script covering every locked `nodes`-rule example this pass touched or depended on, plus the new composite/metadata behavior. | Run standalone: `node scripts/test_gematria_methods.mjs`. No test-runner dependency added (`package.json`/lockfile untouched — verified via `git status` and `npm ci` using the existing lockfile). |
| `supabase/migrations/20260822_gematria_triangle_word_functions_prepared.sql` (new) | Additive `CREATE OR REPLACE FUNCTION` for `triangle_word_calc`, `triangle_reverse_calc`, `stair_triangle_calc`. | Not applied. Logic independently verified via read-only `WITH`-CTE equivalents run against the live DB (see §6). Calls nothing but the already-existing `fn_ragil`. |
| `supabase/migrations/20260822_gematria_method_profile_fn_prepared.sql` (new) | Additive `fn_method_profile(subject, entitlement)` — richer per-method profile for Research DNA (task §11). | Not applied. Does not modify or wrap `fn_all_methods_full` — a second, independent, additive function. Not called by anything. |
| `supabase/migrations/20260822_HUMAN_GATE_registry_decisions_DO_NOT_APPLY_WITHOUT_ZURIEL.sql` (new) | Every statement fully commented out. Draft only. | Even a blind `psql -f` of this file is a no-op. |

**Build verification:** `npm ci` (respects the existing `package-lock.json` exactly — no dependency added, no lockfile change) then `npm run build` — both succeed cleanly, no new warnings attributable to this pass's changes.

---

## 9. Method Profile for Research DNA (task §11)

`fn_method_profile(subject, entitlement)` (prepared, not applied — §8) returns, per method: `method_key`, `display_label`, `category`, `atomic_or_composite` (currently always `'atomic'` — composites are not server-side yet, see below), `state` (`dispatchable` / `built_not_registered` / `candidate`), `computed_value` (only if dispatchable and within entitlement), `entitlement_gated` (bool — was it computable but blocked by tier), `verification_source`, `stored_column_claim` (honestly labeled as the registry's *claim*, given §4.3's confirmed drift — not re-verified against the live trigger inside this function), `derived_on_demand`, `access_tier`, `deterministic`, and `provenance` (function name + version + the stale `in_engine` flag, so a caller can see the raw registry state too).

**IMPLEMENTATION DECISION REQUIRED:** a server-side Method Profile RPC that also includes **composite** entries (not just atomic) would need either (a) a `gematria_methods.category='composite'` row set with `function=NULL` and a client-side-only computation flag the RPC can recognize and skip gracefully, or (b) a second, JS-only profile assembly step that merges `fn_method_profile`'s atomic results with `computeAllComposites()`'s client-side results before display. Not built this pass — flagged as a natural next phase once Decision E (composite catalog rows) is approved.

---

## 10. `all_values` / bidim (task §12)

**Roles preserved, not touched:** `gematria_words` remains the wide canonical word record; `bidim` (a real indexed table, not a view — per `bidim_view_to_indexed_table` migration, 30.6.2026) remains the reverse index for cross-method search. Neither was modified this pass.

**Documented, per the task's own instruction:** `all_values` (an `int8[]` column on `gematria_words`, populated by `gw_enforce_engine` from the same 14 hardcoded columns) is confirmed to be a **derived convenience array, not a source of truth** — it carries no method identity per element (just raw numbers), so any consumer using it for cross-method matching cannot know *which* method produced a given value without joining back to the named columns. `bidim_sync` already does the correct thing (it labels each value by method name when it fans out into `bidim`) — `all_values` is strictly a fallback/legacy convenience for simple "does this number appear anywhere on this word" checks, and should not be extended or relied upon as new methods are added; new methods should flow through `bidim` (with method identity), not `all_values`.

---

## 11. Access model recommendation for Free vs. Premium (task's closing question)

No access tiers were changed this pass (`required_entitlement` is `public` on all 24 rows today, verified live — no method has ever actually been gated). Recommendation, consistent with `research_dna_v1` §4.7 and `gematria_methods_catalog`:

- **Keep every currently-visible method (all 13 currently-active/dispatchable ones) at `public`** — the Legacy Baseline / Additive Access principle from the foundation contract this session's earlier passes established: nothing that's free today should become gated.
- **New atomic candidates (משולש מילה/הפוך, and any future אי״ק בכ״ר/אח״ס בט״ע once defined) can default to a Zuriel-chosen tier from day one** — the task explicitly allows this ("שיטות חדשות יכולות להיות Premium מהיום הראשון"). No default is assumed here; Decision D leaves tier unspecified pending Zuriel.
- **Composites default toward Premium/Deep Research** per Zuriel's own stated intent (§8 of the task) — see the per-composite proposal in `GEMATRIA_METHODS_COMPOSITE_CONTRACT.md` §4. This governs *visibility of the composite view*, never the two canonical atomic numbers it's built from (both of which remain visible at their own existing tier).
- **The two-layer mechanism already exists and should be reused, not replaced:** per-method default (`gematria_methods.required_entitlement`) for the common case, per-word override (`gematria_words.tier_*` columns) for the rare case where a specific *word's* value in a specific method needs different visibility than the method's default — exactly the pattern already built for `ragil/misratar/kadmi/miluy`.

---

## 12. Deliberately NOT touched this pass (follow-up phase, per orchestrator rail #6)

To keep this pass's diff small and independently verifiable, the following files were **read and understood but not modified**, even though they contain method-list logic:

- **`src/pages/CrossMethodPage.jsx`** — has its **own independent hardcoded `METHOD_COLS` array** (9 entries: col/name/sub/soul/icon), genuinely separate from `gematria.js`'s `METHODS` (not merely a consumer import, unlike 15 of the other 17 files in the orchestrator's list). This is the clearest remaining case of real registry duplication in the codebase and the natural next target — but it renders a live, search-param-driven page with its own effects and query logic; a safe refactor (e.g. deriving its list from `METHODS.filter(m => m.col)`) is straightforward in principle but was left undone this pass specifically to avoid a risky change to a live user-facing page under time pressure, per the rail's explicit preference for "a smaller, correct, well-tested change" over a sweeping one.
- **`src/pages/NameLabPage.jsx`, `EntityPage.jsx`, `CommunityCalculatorPage.jsx`, `AdminPage.jsx`, `BeitMidrashPage.jsx`, `src/lib/research/coreEngine.js`, `src/lib/nameCross.js`, `src/components/research/ApiPanel.jsx`, `SearchesTab.jsx`, `NumberDrawer.jsx`, `NumberFamilies.jsx`, `MethodAnalyze.jsx`, `GematriaCalculator.jsx`, `ActiveEntityPanel.jsx`** — on inspection, these 14 files are **not** independent parallel registries. They all do `import { METHODS, DEPTH_METHODS } from ".../gematria.js"` (or `../lib/gematria.js`) and consume that single source directly — exactly the pattern §2 asks for. No change was needed or made to any of them.
- **`gw_enforce_engine` / `bidim_sync` trigger rewrite** — see §5 (Decision K), deferred as a real architecture decision, not attempted given the production-write-path risk.
- **Client-side registry fetch** (having `gematria.js` itself query `gematria_methods` at runtime) — considered and rejected for this pass: `gematria.js` is currently a pure, synchronous, dependency-free module (confirmed: only imports `GEM` from `theme.js`, which itself has zero imports) that many components rely on for instant, offline-safe computation. Making it async / network-dependent would be a much larger behavioral change than this task's scope, and is not required to satisfy §2 (the registry-bridging metadata added this pass — `col`/`METHOD_DB_COLS` — achieves the naming alignment without that cost).

---

## 13. Summary table — every open decision

See `GEMATRIA_METHODS_HUMAN_GATE.csv` for the full, structured list (11 decisions: A–K). Short form:

- **A** — register 6 already-built/already-partially-live SQL functions (near-zero risk)
- **B** — fix 3 stale `in_engine` flags (zero functional impact)
- **C** — wire משולש מילה/הפוך/מדרגות to new SQL functions (dispatch-only)
- **D** — activate משולש מילה/הפוך for on-demand dispatch (the one genuinely new capability)
- **E** — create the 4 composite catalog rows + confirm access tiers
- **F** — fix the אטבח dispatch bug (needs a definition call, not just a code fix)
- **G/H** — supply the אי״ק בכ״ר / אח״ס בט״ע cipher definitions (blocked, not a risk decision)
- **I** — verify מילוי גדול before trusting/activating it
- **J** — schema decision: should משולש מילה/הפוך ever be stored, not just dispatched?
- **K** — follow-up architecture decision: registry-driven trigger rewrite, yes/no/when
