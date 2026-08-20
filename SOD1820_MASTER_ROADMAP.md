# SOD1820 — MASTER ROADMAP (operational state map)

> **What this is.** A single reconciled state map assembled from this session's read-only audits and human-gated writes. It is a *roadmap*, not a decision engine: it records only what already exists or was already approved. **No decision is invented here.** Where provenance is genuinely unresolved it is marked `UNKNOWN`.
>
> **Status legend:** `FACT` (verified live/in-repo) · `APPROVED` (Zuriel gated, may not be built) · `BUILT` (code/DDL exists) · `LIVE` (in production / live DB) · `DESIGN` (spec complete, not built) · `OPEN` (unresolved, needs a gate) · `FROZEN` (deliberately paused) · `BLOCKED` (waiting on a dependency) · `SUPERSEDED` (replaced, kept for history) · `UNKNOWN` (provenance gap).
>
> **Authority order:** live DB + `main` > this roadmap > memory. `SOD1820_MASTER_STATE.md` (on `main`) remains the canonical state doc; this roadmap indexes it, it does not replace it.

---

## 0. Governance — the BUILDING / LOCKED law

The discipline enforced across this entire session (grounded in `command_center_law` §CC sequencing + `research_workspace_law`):

- **Map-first, screen-first, don't-build-behind.** No surface is built before its map is shown and gated. Each phase is a **separate** human gate.
- **A layer is LOCKED until its dependency is LIVE.** Downstream surfaces do not begin while an upstream identity/contract is still `DESIGN`/`OPEN`/`FROZEN`.
- **Every WRITE is individually gated.** Reads are free; migrations, function changes, merges, deploys, and archives each require an explicit Zuriel gate. `deploy_on_request` + `deploy_quota_protection` govern production.
- **Reuse, never invent.** Existing stores/conventions are extended (γ, person-ref, source_ref string links); no parallel mechanism, no invented identifier.
- **Provenance is preserved.** Nothing historical is deleted; supersession is recorded, not erased.

**Consequences currently in force:**
- **ELS Step 4 (dedup / UNIQUE index) is LOCKED** — it must not start until Step 3 is deployed and verified in production.
- **Downstream ELS build (KU-3D / Navigator / ELS-Matrix) is BLOCKED** — must not build until Finding Identity is LIVE end-to-end (server + deployed client).
- **Tanakh identity work is BLOCKED** on the Tanakh `corpus_id` OPEN condition — no invented Tanakh corpus_id.

---

## 1. Branch routing

| Branch | Role | Head / key commits | State |
|---|---|---|---|
| `main` | **production** (Vercel) | `ae8272c2` (P1 Master sync) → `f5834f44` (corpus regression neutralization, Option A) | `LIVE` |
| `claude/raziel-capabilities-audit-h5k9ww` | **designated dev branch** (this session's audits + γ decision record `7985e0ce`) | behind `main` (created pre-sync) | `FACT` — dev only, not merged |
| `claude/els-step3-identity` | **ELS Step 3 client half** — off `main` | **`7045f7b3`** | **`BUILT` + pushed · NOT merged · NOT deployed** |
| `claude/els2-b45k5h` | source of the in-place corpus neutralization | `d3a9e9d7`, `f946ed51` | `SUPERSEDED` by the merge of Option A to `main` (`f5834f44`) |
| `claude/els-unified-merge` | alternative neutralization = **file deletion** | `542c7147` | `SUPERSEDED` — Option B, **not chosen** |

**Merge posture:** only `main` deploys. `claude/els-step3-identity` awaits an explicit merge+deploy gate. The audit branch is a working branch, not a deploy source.

---

## 2. Dependency spine (top-down)

```
Canonical ELS corpus  (§17, LIVE)
   torah_stream = 304,805 (Koren)  ·  corpus_id 0b022e8eef6f9c16 (= sha256 of tk-letters.txt full file)
   position_base 0  ·  coverage 'partial'  ·  fn_els_search torah-only, 0-based
        │  protected by ──> corpus regression neutralization  (main f5834f44, LIVE)
        │
        ├── Tanakh corpus_id  ...................................... OPEN (§17) → blocks complete Tanakh identity
        │
        └── ELS Finding Identity  {corpus_id, term_norm, dir, skip, start}
               Step 1  els_records nullable cols ................... LIVE
               Step 2  save_els_matrix 13-arg params .............. LIVE
               Step 3  server-derive (DB) + client-forward start .. DB LIVE · client READY (7045f7b3) not deployed
                    R1 (start 0-based, positions[0]==start, torah space) .... VERIFIED
               Step 4  dedup / UNIQUE index ....................... LOCKED (not started)
               downstream: KU-3D / Navigator / ELS-Matrix ......... BLOCKED (build only after identity LIVE)

γ two-layer research identity (Atlas/Ledger)  ...... APPROVED + DOCUMENTED
        └── §19-old ("finding = research_object OR research_contribution")  ...... SUPERSEDED by γ
               └── §19 → γ Master State rewrite  ................... OPEN (separate Master WRITE gate)

Raziel substrate (DB) .............................. LIVE but UNWIRED
        ├── fn_raziel_turn ................................ STUB (reads neither RO nor metatron) → OPEN
        ├── session_state table ........................... ABSENT → OPEN
        └── L1–L14 read-model contract .................... DESIGN complete

Person-Identity contract (OD-F10a) ................. APPROVED DECISION (design only)
        ├── F-1a′  fn_upsert_self_profile (self ledger) ... IMPLEMENTED + LIVE
        └── F-1b  family members + parent_of .............. NOT AUTHORIZED / BLOCKED (OD-F9a/F9b/F8)
```

---

## 3. ELS corpus + Finding Identity (the active track)

### 3.1 Canonical corpus — `FACT` / `LIVE`
- **Source of truth:** `tools/els/data/tk-letters.txt` — 2,409,166 bytes = **1,204,583 Hebrew letters** (full Tanach). Full `sha256 = 0b022e8eef6f9c16a20c…` → **`corpus_id = 0b022e8eef6f9c16`** (content-addressed, full-file hash).
- **Torah prefix:** first **304,805** letters (Koren) · `sha256 9692eb34…` · `md5 0066c243…`.
- **`torah_stream`** (live) = 304,805 rows, `md5 0066c2431821863d258745e664d3883e` (SWAPped from the polluted 306,269). — `LIVE`.
- **`fn_els_search`** — torah-only, emits `corpus_id 0b022e8eef6f9c16`, `position_base 0`, `coverage 'partial'`, `start` **0-based**. — `LIVE`.
- **Tanakh corpus_id** — **`OPEN`**: `0b022e8eef6f9c16` is applied as the Torah corpus identity; §17 explicitly lists "corpus_id defined for the Tanach corpus" as an unmet precondition. **No invented Tanakh corpus_id.**

### 3.2 Corpus regression neutralization — `LIVE` (main `f5834f44`)
- **Option A (in-place), Human-Gate: APPROVED.** Fast-forward `ae8272c2 → f5834f44`, one file.
- Removed the `TRUNCATE + INSERT` that rebuilt `torah_stream` from the contaminated `tanach_verses` (306,269); replaced with documentation pointing at `tk-letters.txt`. On a fresh DB `torah_stream` is now left **empty** (fail-safe) instead of silently wrong.
- Synced the migration file's `fn_els_search` body to the live 0-based envelope contract; kept the SUPERSEDED header + migration history.
- **Excluded (still `OPEN`, separate gate):** restoring `search_path=public` + `security definer` on the **live** `fn_els_search` object (it lost both, `proconfig=NULL` / `prosecdef=false`, in the 18.8 rewrite).

### 3.3 Finding Identity `{corpus_id, term_norm, dir, skip, start}`
| Step | What | State |
|---|---|---|
| **1** | `els_records` + `corpus_id`, `term_norm`, `start_index` NULLABLE columns (`els_finding_identity_step1_nullable_cols`) | `LIVE` |
| **2** | `save_els_matrix` extended to 13 args (`p_corpus_id`/`p_term_norm`/`p_start_index`) (`els_finding_identity_step2_save_els_matrix_params`) | `LIVE` |
| **R1** | client `start` is 0-based, `positions[0] === start`, torah position-space == `fn_els_search`/`torah_stream`; Tanakh = full-file space (mismatch → corpus_id NULL) | `VERIFIED` |
| **3** | server-derive `corpus_id`+`term_norm` (helpers `fn_els_corpus_id`/`fn_els_term_norm`), **INSERT-only** identity, legacy untouched; `save_els_matrix_anon` → 11-arg; client forwards 0-based `start` (`els_finding_identity_step3_server_derive`, version `20260820023525`) | **DB `LIVE` · client `BUILT` not deployed** |
| **4** | dedup / UNIQUE index on identity | **`LOCKED`** (not started) |

**Step 3 policy (as gated & implemented):**
- **Legacy rows:** no change, no backfill (identity written on INSERT only; UPDATE/UPSERT leaves identity columns untouched).
- **Torah new:** `corpus_id` + `term_norm` + `start_index`.
- **Tanakh new:** `corpus_id = NULL` + `term_norm` + `start_index` (Tanakh corpus identity OPEN).
- **No client-side normalization; no invented corpus_id;** shared canonical source via minimal helpers (verbatim extraction of the existing `fn_els_search` normalization + the §17 torah literal).
- **Regression suite (rolled back):** legacy collision stays NULL ✅ · Torah new full identity ✅ · Tanakh new NULL corpus ✅ · anon path identical ✅. Post-rollback: 110 rows, 0 corpus/start persisted.

> **⚠️ ELS Step 3 client (`7045f7b3`) is READY but NOT merged and NOT deployed.** Files: `tools/els/els-code.template.html` (+`start:h.start`), rebuilt `public/tzofen.html`, `src/components/TzofenEmbed.jsx`, `src/lib/elsMatrices.js`. `npm run build` passed. **Transitional state (until deploy):** the live functions populate server-derived `corpus_id`/`term_norm` on INSERT, but `start_index` stays NULL until the rebuilt client reaches production. **ELS Step 4 is LOCKED** until Step 3 is deployed + verified.

---

## 4. γ — two-layer research identity (Atlas / Ledger) — `APPROVED` + `DOCUMENTED`
- Record: `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (branch commit `7985e0ce`). DB change = **NONE**.
- **Atlas = `relation_evidence`** (132 rows; public-read; `atlas_findings()`; server-only write).
- **Ledger = `research_objects`** (121 rows; server-only; R1 `owner_person_id` + `privacy_scope`).
- **Engine stores stay** (`els_records`, `bidim`/`gematria_words`, `fn_name_multi`). **Link = `source`/`source_ref` string convention** (`els_record:<id>`), no FK/column/table. `nodes`/`edges` = canonical graph. `PUBLISHED ≠ CANONICAL ≠ privacy`.
- **§19-old** ("finding = research_object OR research_contribution") = **`SUPERSEDED` by γ** (recorded in the decision only).
- **§19 → γ Master State rewrite = `OPEN`** (separate Master WRITE gate; not performed).

---

## 5. Master State governance (P1 sync) — `LIVE` (main `ae8272c2`)
- Added to `main`: **§15** MULTILINGUAL (`APPROVED`) · **§16** R1 owner/privacy (`APPLIED`) · **§17** ELS corpus 304,805 + corpus_id (`APPLIED`) · **§18** SECURITY sweep (`APPLIED`) + Change Log **#23–#28**.
- **§19 EXCLUDED** from the sync (superseded by γ; its rewrite is the OPEN gate above).
- **Finding Identity in §17 = `FROZEN`** in the doc text (its stated referent §19 is itself superseded by γ; the doc-level unfreeze rides on the §19→γ rewrite).

---

## 6. Raziel substrate — `LIVE` but `UNWIRED`
- **Live DB (migrations `20260809`, applied):** `fn_raziel_route`, `agent_identity`, `ti_demand_signals`, `fn_raziel_research_intel`, `fn_raziel_research_intel_scoped`; plus R1, `resolve_person`/identity_edges (67,552), `fn_raziel_context`.
- **`fn_raziel_turn` = STUB** (reads neither research_objects nor metatron) → `OPEN`.
- **`session_state` table = ABSENT** → `OPEN`.
- **L1–L14 read-model contract = `DESIGN` complete.**
- **`writer-os` = `SUPERSEDED`** (its `ai-analyze` is byte-identical to `main`).
- **`raziel-upgrade`** = deployed-but-unwired DB substrate; **repo-tracking-on-`main` = `UNKNOWN`** (provenance gap, not a blocker).

---

## 7. Person-Identity contract (OD-F10a) — `APPROVED DECISION` (design only)
- Record: `docs/planning/family_identity_contract.md`. `person-ref` namespace `person:<owner>:{self|p:<ref>}`, shared across Family/Life/Hints; RO.id stays the research-object id; lenses address by person-ref.
- **F-1a′** `fn_upsert_self_profile` (self → private `research_objects`, `source_ref='person:<owner>:self'`) = **IMPLEMENTED + LIVE**.
- **F-1b** (family members + parent_of) = **NOT AUTHORIZED / `BLOCKED`** on OD-F9a (person-ref minting), OD-F9b (parent_of home), OD-F8 (`nodes_public_read USING(true)` projection privacy).

---

## 8. OPEN gates (consolidated — each needs its own human gate)
1. **ELS Step 3 client** → merge `claude/els-step3-identity` (`7045f7b3`) to `main` + deploy + live-verify.
2. **ELS Step 4** (dedup / UNIQUE) — LOCKED until (1) is verified.
3. **Tanakh `corpus_id`** — define or decide to leave Tanakh identity incomplete (no invention).
4. **`fn_els_search` live object** — restore `search_path=public` + `security definer` (lost 18.8).
5. **§19 → γ Master State rewrite** — replace §19-old with the γ two-layer model.
6. **Raziel wiring** — `fn_raziel_turn` (STUB), `session_state` (absent), L1–L14 activation.
7. **raziel-upgrade repo provenance** — resolve the `UNKNOWN` main-tracking status.
8. **Person F-1b** — blocked on OD-F9a/F9b/F8.
9. **Corpus regression file fix on `main`** — the in-place neutralization is on `main` (`f5834f44`); confirm no other branch reintroduces the polluted corpus (els-unified-merge deletion path not merged).

---

## 9. Explicit non-actions (this session's guardrails)
- No merge of `claude/els-step3-identity` to `main`. No deploy. No `db push` / `db reset`. No archive.
- No Tanakh corpus_id invented. No client-side normalization. No γ/Atlas/Ledger schema change.
- No ELS Step 4 / UNIQUE / dedup started.
- No downstream ELS surfaces (KU-3D / Navigator / ELS-Matrix) built.

_Assembled from this session's reconciliation. Update path: edit here + record a `work_log` row; canonical state changes go to `SOD1820_MASTER_STATE.md` on `main` via their own gate._
