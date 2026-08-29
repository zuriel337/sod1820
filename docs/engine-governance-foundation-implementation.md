# Engine Governance Foundation — Implementation Record

**Date:** 29.8.2026 · **Actor:** CLAUDE · **Branch:** `claude/system-governance-evidence-pack-kgu23i`
**Canonical project:** `linswmnnkjxvweumprav` · **Law:** `select description from nodes where rule_id='engine_governance_registry_authority_law';`

- Evidence pass (read-only contract design): `work_log` `712562fe-45c2-4a55-8587-cfaf2a58f605`
- This pass BEFORE: `work_log` `96954d8d-caea-416f-bb7c-8f4eae018065`
- **NOT MERGED. NOT DEPLOYED.** DB changes are live; the merge is for DB↔Git consistency.

> This is the **method-registry lifecycle** governance domain. It is **not** the M1 Truth/Epistemic
> Lifecycle contract (`truth_axes_foundation_law`), which is a different domain on the same branch.
> The four truth axes are not reused, re-derived or referenced as authority here.

---

## Human-Gate decisions implemented

| | Decision | Implemented as |
|---|---|---|
| **HG-E1** | `ACTIVE != SCANNABLE`. SCANNABLE is an explicit, independent, Human-Gate-controlled corpus-scan gate. | `gematria_methods.scannable boolean NOT NULL DEFAULT false` + `fn_method_is_scannable()`. Never derived. |
| **HG-E2** | The four existing composites stay **REGISTERED but INACTIVE + NON-SCANNABLE** until their composition/dependency contracts are explicit and verified. Their historical `bidim` rows are not deleted or rewritten. | Contracts populated; `active=false`, `scannable=false`, `dependency_verified_at` still NULL; 50,368 rows untouched and marked `provenance_state='legacy_unknown'`. |
| **HG-E3** | `רגיל+אתבש` may be registered only **after** this Foundation lands, initially inactive/non-scannable — **not in this pass**. | **Not registered.** Registry still holds exactly 4 composites. |

---

## A. Exact schema changes

### `public.gematria_methods` (additive)

| Column | Type | Purpose |
|---|---|---|
| `scannable` | `boolean NOT NULL DEFAULT false` | HG-E1 corpus-scan gate |
| `execution_kind` | `text` | `sql_function` / `composite_engine` / `context_activated` / `unimplemented` |
| `operator` | `text` | `sum` / `diff` — one `method_key` = one operator = one number (INV-C6) |
| `dependency_versions` | `jsonb NOT NULL DEFAULT '{}'` | per-component version pin (the scalar `dependency_version` is **kept**, not replaced) |

Constraints: `gm_execution_kind_chk`, `gm_operator_chk`, and `gm_composite_contract_chk` — a
`category='composite'` row can no longer exist without `operator`, `execution_kind='composite_engine'`,
`derived_from` of length ≥ 2 and a non-empty `dependency_rules`.

`in_engine` is **preserved** and re-commented as **DIAGNOSTIC / COMPATIBILITY ONLY**. It is never a
gate again. `v_method_states.in_engine_drift` reports stored-vs-observed mismatch (7 methods today).

Grants: column-level `SELECT` on all four new columns to `anon, authenticated, service_role`
(`rls_client_read_protocol` v2 — `gematria_methods` uses column grants, so a new column is invisible
without one). `rls_grant_gaps()` returns **0 rows** for `gematria_methods` and `bidim`.

### `public.bidim` (additive)

| Column | Type | Purpose |
|---|---|---|
| `method_version` | `int` | engine version that produced the row |
| `operator` | `text` | composition operator for composite results |
| `dependency_version_snapshot` | `jsonb` | component versions at compute time |
| `computed_at` | `timestamptz` | when the governed run wrote it |
| `engine_run_id` | `uuid` | groups one governed run |
| `provenance_state` | `text NOT NULL` | `governed` \| `legacy_unknown` (+ validated CHECK) |

The column was added with `DEFAULT 'legacy_unknown'` (fast, non-rewriting) and the default then
flipped to `'governed'`, so **all 344,487 pre-existing rows are truthfully `legacy_unknown` without a
single row being rewritten**, and every future governed write is `governed`.

---

## B. The four composite registry definitions

Read from the **authoritative `fn_composite_calc` body**, not from display labels. All four:
`execution_kind='composite_engine'`, `operator='sum'`, `function=NULL` (INV-C1), `depth=1` (INV-C5),
`order_is_load_bearing=false` (sum is commutative), `active=false`, `scannable=false`.

| `method_key` | `derived_from` | `operator` | note |
|---|---|---|---|
| `רגיל+מילוי` | `[רגיל, מילוי]` | `sum` | |
| `רגיל+מסתתר` | `[רגיל, מסתתר]` | `sum` | |
| `רגיל+משולש` | `[רגיל, **קדמי**]` | `sum` | **label says משולש, the engine composes קדמי** (`meshulash_kadmi_law`). The registry row now says so; previously this was only recoverable from a plpgsql `CASE`. |
| `משולש מילה+משולש הפוך` | `[משולש מילה, משולש הפוך]` | `sum` | both components are themselves in the 12,009-row stale stratum — a reason it must stay non-scannable |

Normalization is **inherited by disjunction** from the components (INV-C4), not hand-asserted —
e.g. `רגיל+מסתתר` became `order_sensitive=true, word_boundary_sensitive=true,
final_letter_sensitive=false, whitespace=splits_on_whitespace, punctuation=non_hebrew_dropped`.

---

## C. Executable / verified / scannable predicates

```
EXECUTABLE       fn_method_is_executable(method_key)
                 sql_function | context_activated -> declared function resolves in pg_proc
                 composite_engine                 -> operator supported AND every derived_from
                                                     component is REGISTERED + active + non-composite
                                                     + itself executable (INV-C2 / INV-C5)
ENGINE_VERIFIED  fn_method_is_engine_verified(method_key)
                 dependency_verified_at IS NOT NULL AND dependency_version = version
                 + for composites: every component still at its pinned dependency_versions (INV-C3)
SCANNABLE        fn_method_is_scannable(method_key)
                 scannable AND active AND executable AND engine_verified
```

`v_method_states` (`security_invoker=on`) projects REGISTERED / ACTIVE / IN_ENGINE (diagnostic) /
EXECUTABLE / ENGINE_VERIFIED / SCANNABLE / `execution_kind` / `operator` / versions / dependency
state, plus `in_engine_drift` and `not_scannable_reason`. It holds no state and is not a second
authority. `fn_method_value(method_key, phrase)` is the single execution entry point.

**Live measurement after the change:** REGISTERED 30 · ACTIVE 24 · IN_ENGINE (declared) 24 ·
EXECUTABLE 29 · ENGINE_VERIFIED 24 · **SCANNABLE 18** · in_engine_drift 7 · registered composites 4 ·
active composites 0 · scannable composites 0. These are measurements, never contract constants.

---

## D. `bidim_sync` — before → after

**Before (the live governance bypass):**

```sql
approved_sum_composites text[] := ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך'];
...
FOR m IN SELECT ... WHERE active AND in_engine AND function IS NOT NULL AND category <> 'composite'
...
FOREACH ckey IN ARRAY approved_sum_composites LOOP   -- writes 4 active=false composites, always
```

**After:**

```sql
FOR m IN SELECT ... FROM public.v_method_states s WHERE s.scannable ORDER BY s.sort_order
  v := public.fn_method_value(m.method_key, NEW.phrase);
```

- The hardcoded array is **gone**. Verified: `pg_get_functiondef` no longer contains
  `approved_sum_composites`; the only remaining `in_engine` occurrence is a source comment.
- One loop for atomic, depth **and** composite — category is not a gate, `in_engine` is not a gate.
- Every written row carries `method_version`, `operator`, `dependency_version_snapshot`,
  `computed_at`, `engine_run_id`, `provenance_state='governed'`.
- **Invalidation is now honest:** a changed `phrase` invalidates every derived row for that word;
  an update that leaves the phrase alone **preserves** historical rows of no-longer-scannable
  methods (previously they were deleted unconditionally) and only refreshes their denormalised
  source fields.

**Two behavioural deltas, both intentional and both data-safe:**

1. The 4 composites are no longer written for new/updated words (**this is the bypass closure**).
2. `אות רבתי` is no longer written. It passed the old predicate but is `context_activated`
   (`rabbati_letter_method_law` — its value is not a pure function of the phrase). It has **0 bidim
   rows**, so this destroys nothing and removes a latent defect that would have manufactured 12,592
   false rows on the next full resync.

---

## E. `bidim` provenance / version strategy

`fn_bidim_id(word_id, method_key, method_version, operator)` is the canonical row identity. It is
**backward-compatible by construction**: `(version=1, operator=NULL)` reproduces the byte-identical
legacy `md5(word_id||':'||method_key)`, so **no existing row is re-keyed and there is no 114 MB
rewrite**. Any operator-bearing or `version>1` identity lands in a separate, non-colliding namespace
— so a future second operator over the same components, or a method version bump, can never
silently overwrite or collide with a governed result of a different version.

Rows that cannot be truthfully attributed to an engine run are left explicitly
`provenance_state='legacy_unknown'` with NULL provenance columns. **No metadata was fabricated.**

---

## F. Convergence dependency fix

`SAME VALUE ACROSS METHODS != REGISTERED COMPOSITE CALCULATION.` A composite value is
deterministically derived from its components, so **A, B and A+B are one piece of evidence expressed
three ways**, never three independent methods.

- `fn_independent_method_set(text[])` — canonical mechanism: drops any registered composite whose
  **full component set is already present**. Verified: `[רגיל, מסתתר, רגיל+מסתתר] → [מסתתר, רגיל]`;
  `[רגיל, רגיל+מסתתר] → unchanged` (only one component present, so it is not a restatement);
  `[רגיל, קדמי, רגיל+משולש] → [קדמי, רגיל]` — resolved against the **real** components, not the label.
- `fn_method_is_derived(text)` — composite ⇒ derived.
- `cross_method_strength` (the one live surface that aggregated composite rows as if independent):
  `phrase_count` / `p1_hits` / `methods` / `signal` now computed over **non-derived** methods; the
  derived ones surface in new `dependent_methods` / `dependent_phrase_count` columns, and unknown
  methods in `unregistered_methods`. **Rank, don't hide** — nothing is deleted, nothing is silent.
  Example, value 1820: 20 independent methods; the 4 composites now reported separately, with 30
  phrases that reached 1820 only through a derived value no longer counted as independent evidence.
- `fn_relation_composite_evidence` — hardcoded array removed (registry-driven) and every emitted row
  now carries `independent_evidence` + a plain-language note.

Ranking was **not** redesigned. Only deterministic dependency double-counting was closed.

---

## G. The 50,368 historical composite rows

**Preserved in full. Not deleted, not rewritten, not re-keyed.** Confirmed live after every change:
`bidim` = 344,487 rows, composite rows = 50,368 (12,592 × 4), `provenance_state='legacy_unknown'`.
They stay readable and keep their legacy `bid_id`. They are excluded from the independence signal by
the convergence fix rather than removed, per `everything_additive_law` and Rank-Don't-Hide.

---

## H. Tests (all executed live against `linswmnnkjxvweumprav`)

| # | Test | Result |
|---|---|---|
| T0 | **Baseline** (pre-change): old `fn_composite_calc` vs stored `bidim` values, 150 × 4 | 600 / 600 |
| T1 | **Reproduction** — registry-driven engine vs the same stored values, 1,200 × 4 | **4,800 / 4,800 exact, 0 nulls** |
| T2 | Re-run after `search_path` hardening, 400 × 4 | 1,600 / 1,600 |
| T3 | Composite executes but is gated: `fn_method_value('רגיל+מילוי', …)` = 3492 = 1092 + 2400; `executable=true`, `engine_verified=false`, `scannable=false`, reason `not_active_human_gate` | PASS |
| T4 | **Live trigger, INSERT** of a test word | **18 rows, all `governed`, all with full provenance, 1 engine_run_id, 0 composites, 0 `אות רבתי`** |
| T5 | UPDATE with **unchanged** phrase, with a simulated legacy composite row present | 19 rows: legacy row **preserved**, 18 governed recomputed, denormalised fields refreshed |
| T6 | UPDATE with **changed** phrase | all invalidated, 18 governed rows recomputed at the new phrase, 0 stale |
| T7 | DELETE test word + corpus restored | `bidim` back to **344,487**, composite rows **50,368**, 0 test residue |
| T8 | Convergence dependency law (3 cases above) | PASS |
| T9 | `fn_method_scan_report()` — dynamic counts + 12 exclusions each with a reason | PASS, no hardcoded totals |
| T10 | `rls_grant_gaps()` for `bidim` / `gematria_methods` | 0 gaps |
| T11 | `npm run build` | PASS |

Every DB test row was removed; the corpus is byte-for-byte back to its pre-test state.

---

## I. Full-scan contract (the scan was **not** run)

`fn_method_scan_report()` measures everything live: REGISTERED / ACTIVE / IN_ENGINE (diagnostic) /
EXECUTABLE / ENGINE_VERIFIED / SCANNABLE, per-category scannable counts, the scannable method list,
**every exclusion with its reason**, and `bidim` coverage split `governed` vs `legacy_unknown`.
No hardcoded total anywhere.

⛔ **A Full Canonical Method Scan must still NOT run.** `bidim` remains a stratified artifact
(9 stale strata + rows for methods the current predicate excludes). Running now would ratify stale
strata as canonical.

---

## J. Remaining gaps (reported, not designed around)

1. **5 active methods with `in_engine=false`** (`איק בכר`, `משולש מילה`, `משולש הפוך`,
   `משולש מדרגות`, `מילוי דמילוי גדול`) are `scannable=false`. This exactly preserves the old
   predicate's behaviour; widening the scan universe to them is a separate Human-Gate decision.
   Their historical rows are untouched.
2. **The four composites remain unverified** — `dependency_verified_at` is NULL by HG-E2. A fixture
   pass through canonical engine functions only is required before any activation.
3. **`bidim` is still stratified.** The pre-scan invariant does not yet hold.
4. `in_engine` is factually wrong for 7 methods (`in_engine_drift`). Kept as history; a reconciliation
   is a separate Human-Gate act.
5. `gematria_methods_catalog` §5 still describes now-active methods as "approved direction, not yet
   canonical" (DRIFT-E10, LATER).
6. `src/lib/research/compositeMethods.js` is now explicitly a **non-authoritative client mirror**
   (still imported by nothing) with `assertCompositeMirrorMatchesRegistry()` required before it may
   ever be wired to a surface.

## Explicitly untouched (task section 10)

M1 Truth Contract · M2 / ELS publication governance · Experience Governance · unrelated security
cleanup · legacy `bidim` rows beyond additive provenance columns · Master State / Roadmap
reconciliation · `רגיל+אתבש` registration · the Full Corpus Scan · UI redesign · `main` · production
· PR #226.

---

# BLOCKER-EG-1 CLOSURE — PUBLIC READ GOVERNANCE (HG-E4)

**Date:** 29.8.2026 · Proof pass that raised it: `work_log 40c7474d-fff1-4001-bdab-394179918276`
· BEFORE: `work_log 4a092eb3-bcf7-4e2a-b2e4-c0209694ec55`

**HG-E4 (ZURIEL):** RANK, DON'T HIDE. `PUBLIC ACCESS != GOVERNED EVIDENCE`.
`SCANNABLE=false != INVISIBLE`. `PUBLIC=true != CANONICAL/WEIGHTED EVIDENCE`.
The Numeric Root decision stands — public-entitled historical results stay discoverable.

## What was broken

The write path was governed; the read path was not. Public eligibility derived from
"a row exists in `bidim`", never from `gematria_methods`. 16 anon-executable functions
read `bidim`; none consumed the registry.

## Changed objects

| Object | Change |
|---|---|
| `fn_method_evidence_class(text)` | **NEW.** Canonical projection class: `governed` / `historical_public` / `historical_ungoverned` / `historical_unverified` / `historical_unexecutable` / `unregistered`. Derived from existing predicates — not a second authority. |
| `fn_method_is_governed_evidence(text)` | **NEW.** The named scoring-eligibility contract; delegates to the same predicate that gates writes. |
| `fn_number_lookup(bigint)` | Appends 7 governance columns. Rows still returned; governed ranked first. |
| `fn_value_phrase_list(bigint,int)` | **NEW.** Governed projection of the value family, replacing the client's raw unfiltered `bidim` read. |
| `convergence_meter(integer)` | Scoring re-ordered to DISCOVERABLE → GOVERNANCE ELIGIBILITY → INDEPENDENCE → SCORE; adds an `evidence_governance` transparency block. |
| `src/lib/supabase.js` | `getMethodStates()` + `isGovernedMethod()` (cached `v_method_states` reader); `getValueFamilies`, `getValuePhraseList`, `getPhraseValueFamilies`, `getMethodFamilies` now carry governance and rank governed-first. |
| `src/components/NumberFamilies.jsx` | `🕰 היסטורי` badge for non-governed groups. |

## 1820 before → after

| | before | after |
|---|---|---|
| `fn_number_lookup` rows | 176 (30 composite, **0 governance state**) | 176 (30 composite, **0 rows without governance state**) |
| `fn_number_lookup` historical rows | indistinguishable | 50, classed `historical_public` / `historical_ungoverned` / `historical_unexecutable` |
| phrase list | 138 phrases, 44 silently ungoverned | 138 phrases (**none hidden**), 94 governed / 44 labelled |
| `convergence_meter` methods | **8** counted (4 ungoverned, incl. 2 inactive composites) | **4** scored; 4 historical displayed-not-scored |
| entities | 16 scored | 16 displayed / **12 scored** |
| score | 89 | 89 (no layer flipped for 1820) |

## topic_cards impact — measured, NOT rewritten

254 distinct approved-card numbers evaluated: **170 unchanged, 84 change — all downward
(0 rises), average −15.5 points.** Of 204 approved cards, **80 contain a changed number and
78 have a persisted `meter_score` that is now stale.**

**No historical rewrite was performed.** Persisted `quality`/`meter_score` are snapshots and
were left untouched, per the task's explicit instruction. Recalculation is **deferred to a
separate controlled pass** requiring a Human-Gate decision (which cards, and whether an
approved card may lose quality retroactively). No STOP condition was hit — closure did **not**
require automatic historical rewrite.

## Gates

WRITE **PASS** · PUBLIC READ **PASS** · HISTORICAL PRESERVATION **PASS** · CONVERGENCE DEPENDENCY **PASS**
