# 🧭 SOD1820 — MASTER ROADMAP (operational navigation) · v3 DRAFT (review-only)

> **⚠️ v3 DRAFT — NOT canonical.** This is a documentary planning draft for Zuriel review. It is **not** merged to `main` and **not** yet the canonical Roadmap. Canonicalization is a separate Human-Gate.
>
> **What this is.** The single **operational navigation source** for SOD1820. The engine discovers & organizes · the **Roadmap navigates** · the (future) Command Center *displays* (a Lens over this file) · `work_log` keeps provenance · **Zuriel decides**. Nothing becomes canonical just because an agent did it.
>
> **Authority order:** live DB + `main` + `SOD1820_MASTER_STATE.md` (canonical state) > this Roadmap (navigation) > memory. This Roadmap **indexes** canonical state; it is never a parallel truth and never a database.

---

## 🕒 FRESHNESS (must never show SYNCED silently while newer work exists)
- **LAST_RECONCILED:** `2026-08-20` (this session; reconciled against `work_log` latest rows + `main` HEAD `0d247a1d`).
- **SYNC STATUS:** `SYNCED` *as of LAST_RECONCILED*.
- **STALENESS RULE:** if `newest verified work` (a `work_log` row, a `main` commit, or a live migration) is **newer than `LAST_RECONCILED`**, the Roadmap is **`STALE`** and must display so — never `SYNCED`. Detection is by comparing `LAST_RECONCILED` to the newest provenance timestamp/commit.
- **NO SILENT AUTO-UPDATE:** an agent must **not** auto-rewrite the Roadmap at session end. It must *detect* newer work, mark `STALE`, and *propose* the update through the project's WRITE/Human-Gate rules — never write canon without a gate.

---

## 👤 ACTOR / OWNERSHIP
- **ZURIEL** — Human-Gate · canonical decisions · WRITE/merge/deploy approval · the only actor who makes something canonical, LIVE, or released.
- **CLAUDE** — builder · deep audit · implementation (executes only within an explicit gate).
- **GPT** — research · strategy · cross-verification (parallel actor; proposes, never canonical).
- Inter-agent coordination runs **through `work_log` only** (`inter_agent_coordination_law`).

---

## 🧩 STATE MODEL (four orthogonal axes — never mix them)
The single most important anti-confusion rule: **PROJECT STATE ≠ VISIBILITY ≠ ACCESS ≠ RELEASE.**

| Axis | Question it answers | Values |
|---|---|---|
| **PROJECT STATE** | where does the *work* stand? | `DONE · ACTIVE_NOW · PARALLEL_READY · OPEN · BLOCKED · FROZEN · DESIGN · BUILDING · FUTURE · PARKED · SUPERSEDED · UNKNOWN` |
| **VISIBILITY** | does a user *see* the feature exists? | `PUBLIC` · `ADMIN_ONLY` · `HIDDEN` |
| **ACCESS** | can a user *use* it? | `LOCKED` · `PREVIEW(admin)` · `ENABLED` |
| **RELEASE** | is it live for *all* users? | `UNRELEASED` · `RELEASED (= LIVE)` |

**PROJECT-STATE definitions (the only allowed workstream states):**
- `DONE` — completed **and verified** (never on declaration alone). `LIVE` = DONE + RELEASE=RELEASED.
- `ACTIVE_NOW` — the single current working position (see ACTIVE-NOW SAFETY; it is a **candidate until Zuriel approves**).
- `PARALLEL_READY` — could proceed now, gated, but is not the active position.
- `OPEN` — unresolved, needs a gate; not the active position.
- `BLOCKED` — **work cannot start** because a dependency/Human-Gate is unresolved. *(Distinct from ACCESS=LOCKED.)*
- `FROZEN` — deliberately paused awaiting a **specific** decision/gate (short-term hold).
- `DESIGN` — spec/decision exists; not built.
- `BUILDING` — **exists in code/branch/preview, actively being built; NOT DONE, NOT LIVE, NOT enabled for ordinary users.** A formal state, not a text note.
- `FUTURE` — a **long-term planned program**, visible on the map, **not active, not blocked, not in development yet**, preserved so plans cannot disappear.
- `PARKED` — **intentionally shelved and preserved**, not currently active, **no active gate pending**. *(Distinct from `SUPERSEDED`: PARKED was not replaced; it may resume.)*
- `SUPERSEDED` — replaced by a newer decision; kept as historical provenance only.
- `UNKNOWN` — provenance gap; never invented.

**Anti-contradiction guarantees:**
- `BUILDING` (project) ≠ `LOCKED` (access) ≠ `HIDDEN` (visibility) ≠ `LIVE` (release). A feature can simultaneously be PROJECT=`BUILDING`, VISIBILITY=`PUBLIC` (🏗️ badge), ACCESS=`LOCKED`, RELEASE=`UNRELEASED`.
- `FUTURE` (planned, not started) ≠ `PARKED` (shelved, preserved) ≠ `SUPERSEDED` (replaced) ≠ `FROZEN` (awaiting a specific gate).
- `BLOCKED` (work can't start) ≠ `LOCKED` (a built feature not enabled). Example: ELS Step 4 is **BLOCKED** (dependency on Step 3), not LOCKED.
- `LIVE` is **only** RELEASE=RELEASED (enabled for all users), never inferred from a branch/commit/preview.

---

## ⚖️ GOVERNING LAWS (operative at all times)

### 1. BUILDING / FEATURE VISIBILITY LAW — `VISIBLE ≠ ENABLED`
**Goal:** every new feature under construction is **visible** on the system map and in the (future) Command Center, but **not active for ordinary users until Zuriel approves it as ready.**
- `BUILDING` is a **formal PROJECT STATE**, not a text comment.
- A `BUILDING` feature may exist in code/branch/preview, but it is **not DONE, not LIVE, not open to ordinary users**. `VISIBLE ≠ ENABLED`.
- An ordinary user may **see** `🏗️ בבנייה` but gets **no access** to the unfinished functionality.
- Admin/Zuriel may view/test `BUILDING` features per permission (ACCESS=`PREVIEW`).
- **`BUILDING → LIVE` is a Zuriel Human-Gate.** Never infer `BUILDING` or `LIVE` automatically from the mere existence of a branch, commit, or prototype.
- **On-site rendering** when PROJECT=`BUILDING` and VISIBILITY=`PUBLIC`: `🏗️ בבנייה — משהו חדש נבנה כאן. הפיצ'ר עדיין אינו זמין.` Never present an unfinished feature as an active product.
- **Feature State Model:** separate `PROJECT STATE` / `VISIBILITY` / `ACCESS` / `RELEASE` (above) — never conflate.
- **Control Plane note:** the future Feature-Control mechanism is the Command Center's control plane, **not** the project's single source of truth. The Roadmap describes *work state*; the future Feature-Visibility mechanism governs *product behavior*. **Do not build that mechanism now** (see `WS-FEATURE-CONTROL`).

### 2. SESSION RECONCILIATION LAW
After **each significant step** (not every message): **verify → reconcile → update Roadmap → checkpoint.** Ask: what actually changed · what was verified · what enters DONE · what stays OPEN · what became BLOCKED · did ACTIVE_NOW move · was a Human-Gate created · is there provenance/commit/migration · did an OPEN item close · what is the exact NEXT_ACTION. **Never mark DONE on intent. Never invent provenance.** At session end: **do not assume the map was updated** — detect `LAST_RECONCILED < newest verified work` → mark `STALE`, and **propose** the update via a gate; no auto-write.

### 3. NO-DISAPPEARING-WORK LAW
Every significant item sits in exactly one PROJECT STATE. **`BUILDING`, `FUTURE`, and `PARKED` never disappear from the universe.** A closed branch keeps **provenance**. A replaced feature → `SUPERSEDED` + reference. Unknown history → `UNKNOWN`, never invented. **No work is hidden merely because it is not active now.**

### 4. DECISION LOGIC
Classify every material claim: `FACT · INFERENCE · RECOMMENDATION · DECISION · OPEN QUESTION`. Only a **DECISION approved by ZURIEL** becomes canon, and each carries provenance (who / when / what / what it replaced). See **DECISIONS LOG**.

### 5. ACTIVE-NOW SAFETY
Exactly **one** `ACTIVE_NOW`. **`ACTIVE_NOW` is a CANDIDATE (recommendation) until Zuriel explicitly approves the actual next action** — it must **not** become a decision merely because Claude inferred it from dependency order. If information is insufficient → `ACTIVE_NOW = UNKNOWN` and demand reconciliation. Do not skip to a downstream feature because it is more interesting while a higher-priority dependency is open.

---

## 🌌 FULL-UNIVERSE VIEW — NOW / NEXT / FUTURE / PARKED
*(nothing hidden; every lane preserved)*

- **NOW** → `WS-ELS-IDENTITY` — Step 3 completion *(ACTIVE_NOW candidate, pending Zuriel approval)*.
- **NEXT** (PARALLEL_READY) → `fn_els_search` secdef restore · Master State §17/γ update · ELS Full-Search-Space merge · admin_research_review planning.
- **FUTURE** → Command Center + Feature Control · Meta Growth OS layers · Platform 6-tiers + Sod Credits + Academy · UGC/Collective-Discovery · Multilingual rollout *(see FUTURE REGISTRY — marked INCOMPLETE)*.
- **PARKED** → Payments/subscriptions (Hyp) *(see PARKED REGISTRY)*.
- **SUPERSEDED** (historical provenance, retained) → writer-os · ELS Option-B deletion branch · §19-old.

---

## 🔵 ACTIVE_NOW — **CANDIDATE (pending Zuriel approval)**
> **Zuriel-approved working position: `NOT YET APPROVED` (candidate below).**
>
> **YOU ARE HERE (candidate):** `WS-ELS-IDENTITY` — ELS Finding Identity Step 3 completion (deploy + live-verify).
> **WHY THIS IS NEXT (inference, not a decision):** Steps 1–3 are built; the Step 3 client (`7045f7b3`) is the only piece between Finding Identity and being LIVE end-to-end; Step 4 + downstream are BLOCKED on it. *This is Claude's dependency inference — it becomes the active action only on your approval.*
> **NEXT_ACTION (single, on approval):** merge `claude/els-step3-identity` (`7045f7b3`) → `main` → deploy → live-verify `start_index` populates on new Torah saves → unblock Step 4.
> **WHAT CHANGED SINCE LAST SESSION:** corpus regression neutralized on main (`f5834f44`); Finding Identity Step 3 DB LIVE (`20260820023525`) + client built (`7045f7b3`); Roadmap created→main (`0d247a1d`) and upgraded to v2/v3.

## 🟢 PARALLEL_READY (gated; not the active position)
- **`WS-ELS-REGRESSION-FN`** — restore `search_path=public` + `security definer` on live `fn_els_search`.
- **`WS-MASTERSTATE` §17/γ update** — Finding-Identity un-freeze + γ two-layer into Master State.
- **`WS-ELS-FSS`** — merge/deploy decision (Item 1 `fb9c23ea` vs els-work-area D4).
- **`WS-LEDGER-REVIEW`** — admin_research_review DESIGN → planning.

## ⛔ DO NOT BUILD YET (explicit — barred by dependency/Human-Gate)
| Item | Barred because |
|---|---|
| **ELS Step 4** (dedup / UNIQUE index) | BLOCKED on Step 3 deploy + live-verify |
| **KU-3D / Navigator / ELS-Matrix (as product)** | BLOCKED until Finding Identity is LIVE end-to-end |
| **Command Center UI** | gated to "after the map is verified & canonical" (§10 of the law) |
| **WS-FEATURE-CONTROL mechanism** | design-only; build is a separate future Human-Gate |
| **Person F-1b** (family members) | BLOCKED on OD-F9a / OD-F9b / OD-F8 |
| **Raziel wiring** (`fn_raziel_turn`, `session_state`, L1–L14) | OPEN; needs a build gate |
| **Tanakh identity completion** | OPEN; no invented Tanakh corpus_id |

---

## 🗂️ WORKSTREAM REGISTRY

### WS-CC — Master Roadmap governance + Command Center
- **WHERE_WE_ARE:** Roadmap at v3 draft (this doc); Command Center UI not started.
- **WHAT_IS_DONE:** Roadmap created (`b3a19102`) + on main (`0d247a1d`); v2 upgrade (`8a45ddb2`); v3 draft.
- **WHAT_IS_OPEN:** v3 canonicalization; Command Center Lens.
- **WHAT_IS_BLOCKED:** Command Center UI — gated to "after map verified".
- **HUMAN_GATE:** ZURIEL — approve v3 → canonical; later gate CC build.
- **NEXT_ACTION:** review v3 → gate canonicalize → (later) CC-1 read-only Lens.
- **DEPENDENCIES:** reads this Roadmap only; no new store.
- **CANONICAL_HOME:** `SOD1820_MASTER_ROADMAP.md` (main).
- **PROVENANCE:** `b3a19102` · `0d247a1d` · `8a45ddb2` · v3 draft (this session).
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** roadmap governance `ACTIVE(meta)`/`DONE`-per-version · Command Center = `DESIGN`.

### WS-ELS-CORPUS — Canonical ELS corpus (§17)
- **WHERE_WE_ARE:** Torah corpus canonical & live; Tanakh identity undefined.
- **WHAT_IS_DONE:** `torah_stream`=304,805 (Koren, `md5 0066c243…`); source `tk-letters.txt` (1,204,583 letters); `corpus_id 0b022e8eef6f9c16`; `fn_els_search` 0-based, `coverage 'partial'`.
- **WHAT_IS_OPEN:** Tanakh `corpus_id` (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** none (settled).
- **NEXT_ACTION:** none.
- **DEPENDENCIES:** protected by `WS-ELS-REGRESSION`.
- **CANONICAL_HOME:** Master State §17 + live DB.
- **PROVENANCE:** §17 sync `ae8272c2`; corpus SWAP 18.8.
- **LAST_VERIFIED:** 2026-08-20 (md5 + file hash re-checked).
- **STATE:** `DONE` / `LIVE`.

### WS-ELS-REGRESSION — Corpus regression neutralization
- **WHERE_WE_ARE:** In-place neutralization (Option A) live on main.
- **WHAT_IS_DONE:** `main f5834f44` — removed `TRUNCATE+INSERT`, synced file `fn_els_search` to 0-based envelope, SUPERSEDED header.
- **WHAT_IS_OPEN:** live-object attributes (sub-item below).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** closed (Option A approved).
- **NEXT_ACTION:** confirm no branch reintroduces the polluted corpus.
- **DEPENDENCIES:** protects `WS-ELS-CORPUS`.
- **CANONICAL_HOME:** `supabase/migrations/20260726_…_els_real.sql` (main).
- **PROVENANCE:** `f5834f44` · source `f946ed51`.
- **LAST_VERIFIED:** 2026-08-20 (no executable regression on main).
- **STATE:** `DONE` / `LIVE`.
  - **`WS-ELS-REGRESSION-FN`:** restore `search_path`+`security definer` on live `fn_els_search`. **STATE:** `PARALLEL_READY`/`OPEN`. HUMAN_GATE: ZURIEL.

### WS-ELS-IDENTITY — ELS Finding Identity `{corpus_id, term_norm, dir, skip, start}` — **NOT FROZEN**
- **WHERE_WE_ARE:** Steps 1–3 complete; Step 3 client built, not deployed; Step 4 blocked.
- **WHAT_IS_DONE:** Step 1 nullable cols (LIVE) · Step 2 13-arg `save_els_matrix` (LIVE) · R1 (start 0-based, `positions[0]===start`, Torah space matches) · Step 3 DB helpers + INSERT-only identity + `save_els_matrix_anon` 11-arg (LIVE, `20260820023525`) · Step 3 client (`7045f7b3`). Regression suite PASS.
- **WHAT_IS_OPEN:** deploy Step 3 client; Tanakh identity (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** **Step 4 (dedup/UNIQUE) = BLOCKED** on Step 3 deploy+verify.
- **HUMAN_GATE:** ZURIEL — merge+deploy Step 3; later gate Step 4.
- **NEXT_ACTION:** merge `claude/els-step3-identity` → main → deploy → verify `start_index`.
- **DEPENDENCIES:** `WS-ELS-CORPUS` (LIVE); Tanakh completeness on `WS-TANAKH`.
- **CANONICAL_HOME:** live DB functions + Master State §17 (needs update).
- **PROVENANCE:** step1/step2/step3 migrations (`20260820023525`); client `7045f7b3`.
- **LAST_VERIFIED:** 2026-08-20 (signatures + rolled-back regression suite).
- **STATE:** `ACTIVE_NOW` *(candidate)*; Steps 1–3 `DONE`/`LIVE`; Step 4 `BLOCKED`.
  - **`WS-TANAKH` — Tanakh `corpus_id`:** Torah id `0b022e8eef6f9c16`; Tanakh id is an explicit §17 open condition. **No invention.** **STATE:** `OPEN`.

### WS-ELS-FSS — ELS Full Search Space / reverse-direction
- **WHERE_WE_ARE:** Direction decided; awaiting merge/deploy gate.
- **WHAT_IS_DONE:** full-search-space read-only analysis (els_records 1743/1743, 19.8); Item 1 write+verify; decision: els-work-area **D4** preferred over ELS-2 **Item 1**.
- **WHAT_IS_OPEN:** which artifact merges; merge/deploy.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — merge/deploy decision.
- **NEXT_ACTION:** Zuriel picks D4 vs Item 1 → gate merge.
- **DEPENDENCIES:** shares corpus+identity with `WS-ELS-IDENTITY`.
- **CANONICAL_HOME:** branch artifacts (`claude/els-work-area`, ELS-2).
- **PROVENANCE:** Item 1 `fb9c23ea`; work_log 19.8.
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `PARALLEL_READY`/`OPEN`.

### WS-GAMMA — γ two-layer research identity (Atlas / Ledger)
- **WHERE_WE_ARE:** Decision approved + documented; zero DB change.
- **WHAT_IS_DONE:** `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`). Atlas=`relation_evidence` · Ledger=`research_objects` · engine stores own · link via `source_ref` string · `nodes`/`edges` canonical.
- **WHAT_IS_OPEN:** §19-old → γ Master State rewrite.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — §19→γ Master rewrite.
- **NEXT_ACTION:** fold γ into Master State, mark §19-old SUPERSEDED there.
- **DEPENDENCIES:** feeds `WS-LEDGER-REVIEW`, `WS-MASTERSTATE`.
- **CANONICAL_HOME:** decision record → Master State (pending).
- **PROVENANCE:** `7985e0ce`.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` (decision) · §19→γ rewrite `OPEN` · §19-old `SUPERSEDED`.

### WS-SEC — Security hardening (RLS / privacy guards)
- **WHERE_WE_ARE:** Multiple concrete leaks closed on live DB (19.8).
- **WHAT_IS_DONE:** `engraved_facts` P1 (#8) · `metatron_context` P2/P3/P4 (#9) · `numbers_worked`/`metatron_context` P2 identity-scoping (#10B) · `metatron_plan` REVOKE-from-public · `number_dossier_json` privacy guard (LATENT-A). Each WRITE verified.
- **WHAT_IS_OPEN:** confirm enumeration in Master State §18.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** closed per item.
- **NEXT_ACTION:** enumerate in §18 at next Master WRITE.
- **DEPENDENCIES:** `research_objects` (Ledger), metatron.
- **CANONICAL_HOME:** live DB policies + Master State §18.
- **PROVENANCE:** work_log 19.8 rows.
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `DONE`/`LIVE` (per item).

### WS-LEDGER-REVIEW — admin_research_review / Ledger planning
- **WHERE_WE_ARE:** Read-only smoke-test passed; planning not started.
- **WHAT_IS_DONE:** `admin_research_review` over `research_objects` (fact+relation) smoke-test, full rollback, PASS (19.8).
- **WHAT_IS_OPEN:** provenance on `node.metadata`; `decision_ledger` writes; multi-member paths via `relates`/`engine_detail`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — approve move to planning.
- **NEXT_ACTION:** gate → design provenance/decision_ledger plan (no code).
- **DEPENDENCIES:** `WS-GAMMA`.
- **CANONICAL_HOME:** `research_objects`/`relation_evidence` + future decision record.
- **PROVENANCE:** work_log 19.8 smoke-test.
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `DESIGN`/`OPEN`.

### WS-RAZIEL — Raziel substrate + L1–L14
- **WHERE_WE_ARE:** DB substrate deployed but unwired; read-model contract designed.
- **WHAT_IS_DONE:** `fn_raziel_route`, `agent_identity`, `ti_demand_signals`, `fn_raziel_research_intel[_scoped]` live (migrations 20260809); R1, `resolve_person`/identity_edges (67,552), `fn_raziel_context`.
- **WHAT_IS_OPEN:** wire it: `fn_raziel_turn` STUB; `session_state` absent; L1–L14 activation.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — approve wiring build.
- **NEXT_ACTION:** on gate, design the wiring.
- **DEPENDENCIES:** Ledger, metatron.
- **CANONICAL_HOME:** live DB + Master State (Raziel §).
- **PROVENANCE:** migrations 20260809; `writer-os`=SUPERSEDED; `raziel-upgrade` main-tracking `UNKNOWN`.
- **LAST_VERIFIED:** 2026-08 (substrate earlier; not re-run).
- **STATE:** substrate `LIVE`-unwired · wiring `OPEN` · L1–L14 `DESIGN` · repo-tracking `UNKNOWN`.

### WS-MASTERSTATE — Master State governance / sync
- **WHERE_WE_ARE:** P1 sync live on main; §17 stale re Finding Identity.
- **WHAT_IS_DONE:** `ae8272c2` — §15/§16/§17/§18 + Change Log #23–#28. §19 excluded.
- **WHAT_IS_OPEN:** §17 (`FROZEN → IN_PROGRESS`, Steps 1–3 LIVE, `f5834f44`); fold γ; enumerate `WS-SEC`; note Roadmap `0d247a1d`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — Master WRITE gate.
- **NEXT_ACTION:** on gate, apply §17/γ/security updates surgically.
- **DEPENDENCIES:** `WS-GAMMA`, `WS-ELS-IDENTITY`, `WS-SEC`.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` (main).
- **PROVENANCE:** `ae8272c2`.
- **LAST_VERIFIED:** 2026-08-20 (§17 still says FROZEN).
- **STATE:** sync `DONE`/`LIVE` · §17/γ update `PARALLEL_READY`/`OPEN`.

### WS-PERSON — Person-Identity (OD-F10a)
- **WHERE_WE_ARE:** Contract approved (design); self-ledger live; family blocked.
- **WHAT_IS_DONE:** contract `docs/planning/family_identity_contract.md`; **F-1a′** `fn_upsert_self_profile` LIVE.
- **WHAT_IS_OPEN:** F-1b (family members + parent_of).
- **WHAT_IS_BLOCKED:** F-1b — OD-F9a / OD-F9b / OD-F8.
- **HUMAN_GATE:** ZURIEL — OD-F9a/F9b/F8 before F-1b.
- **NEXT_ACTION:** none until those decisions.
- **DEPENDENCIES:** `nodes_public_read` (OD-F8), Ledger.
- **CANONICAL_HOME:** contract doc + `research_objects` (self rows).
- **PROVENANCE:** F-1a′ live function; contract record.
- **LAST_VERIFIED:** 2026-08 (F-1a′ earlier).
- **STATE:** contract `APPROVED`/`DESIGN` · F-1a′ `DONE`/`LIVE` · F-1b `BLOCKED`.

### WS-KU3D — GPT Knowledge Universe 3D preview
- **WHERE_WE_ARE:** Visual preview built by GPT on a branch; not deployed.
- **WHAT_IS_DONE:** 3D Knowledge Universe visual preview (actor=GPT), branch/preview only.
- **WHAT_IS_OPEN:** scope; data source (must read the one graph, not a parallel store); release gate.
- **WHAT_IS_BLOCKED:** product-enable — BUILDING/LOCKED: must not go LIVE; downstream stays blocked until Finding Identity LIVE.
- **HUMAN_GATE:** ZURIEL — any deploy / user-enablement.
- **NEXT_ACTION:** keep as visible BUILDING preview; cross-verify vs `unified_graph_law`.
- **DEPENDENCIES:** `WS-ELS-IDENTITY`; the one graph (`nodes`/`edges`).
- **CANONICAL_HOME:** GPT branch/preview.
- **PROVENANCE:** work_log 19.8 "3D Knowledge Universe visual preview (actor=GPT)".
- **LAST_VERIFIED:** 2026-08-19 (GPT-reported; not CLAUDE-verified).
- **STATE:** PROJECT=`BUILDING` · VISIBILITY(planned)=`PUBLIC 🏗️` · ACCESS=`PREVIEW(admin)` · RELEASE=`UNRELEASED`.

### WS-FEATURE-CONTROL — Command Center Feature Visibility (control plane) — **NEW**
- **WHERE_WE_ARE:** Law designed (this doc); mechanism not built.
- **WHAT_IS_DONE:** BUILDING/FEATURE-VISIBILITY LAW + Feature State Model defined in this Roadmap.
- **WHAT_IS_OPEN:** the control-plane itself — a future Command Center area where Zuriel sets, per feature: PROJECT STATE (`LIVE/BUILDING/LOCKED/FUTURE/PARKED/HIDDEN`), whether it appears on the map, whether ordinary users see it, whether they can use it, whether admin can preview.
- **WHAT_IS_BLOCKED:** build — until Roadmap v3 is canonical **and** Command Center architecture exists; sequence is: Roadmap v3 → Human-Gate → canonicalize, then **separately** Feature-Control design → schema/impl plan → Human-Gate → build.
- **HUMAN_GATE:** ZURIEL — design gate, then build gate (two separate gates).
- **NEXT_ACTION:** none now — **do not build the control mechanism**; the map will say exactly where it plugs in.
- **DEPENDENCIES:** Roadmap v3 (canonical) + Command Center architecture.
- **CANONICAL_HOME:** Command Center / Roadmap governance.
- **PROVENANCE:** this v3 draft (law text supplied by Zuriel, 2026-08-20). No implementation exists.
- **LAST_VERIFIED:** 2026-08-20 (law recorded; no code).
- **STATE:** `FUTURE` (implementation) · `DESIGN` (law/spec). **Not a source of truth; a future product-behavior control plane.**

---

## 🔮 FUTURE REGISTRY — **INCOMPLETE** (provenance-known only; no invented projects)
> Marked `INCOMPLETE`: this captures future programs already present in project provenance (`CLAUDE.md` laws) or supplied by Zuriel. It is **not exhaustive**; add per Zuriel. No names invented.

| Future program | State | Provenance |
|---|---|---|
| Command Center + `WS-FEATURE-CONTROL` | `FUTURE`/`DESIGN` | this Roadmap + Zuriel (2026-08-20) |
| Meta Growth OS (24 layers; 5–9, 12–24 not done) | `FUTURE` | `CLAUDE.md` Meta Growth OS table |
| Platform 6-tiers + Sod Credits + Academy | `FUTURE` | `CLAUDE.md` `platform_tiers_law` |
| UGC / `community_hints` / Collective Discovery / Research Score | `FUTURE`/`DESIGN` | `CLAUDE.md` `identity_architecture_law` |
| Multilingual rollout (he·en·ar·es·fr·ru·pt·de) | `FUTURE` (§15 APPROVED) | `CLAUDE.md` `content_translation_law` |
| ELS `els_records` research-store phase ב׳ | `FUTURE` | `CLAUDE.md` ELS map / `work_log` |

## 🅿️ PARKED REGISTRY (intentionally shelved, preserved; ≠ SUPERSEDED)
| Parked item | Why parked (not replaced) | Provenance |
|---|---|---|
| Payments / subscriptions (Hyp Pay, HK) | intentionally paused; interim **credits system** active instead; may resume | `CLAUDE.md` payments section («מנויי-תשלום בהקפאה») |

---

## 🧾 DECISIONS LOG (consolidated — Zuriel-approved, with provenance)
| Decision | Who / When | What | Supersedes | Provenance |
|---|---|---|---|---|
| Corpus canonical (§17) | ZURIEL · 18–19.8 | Torah 304,805, `corpus_id 0b022e8eef6f9c16`, 0-based | polluted 306,269 corpus | Master State §17 (`ae8272c2`) |
| Corpus regression fix = Option A | ZURIEL · 2026-08-20 | in-place neutralization on main | Option B deletion branch | `f5834f44` |
| γ two-layer (Atlas/Ledger) | ZURIEL · 2026-08-20 | two intentional layers + string link | §19-old finding model | `7985e0ce` |
| ELS Finding Identity Steps 1–3 | ZURIEL · 2026-08-20 | server-derived identity, INSERT-only, legacy untouched | Finding-Identity FROZEN state | migrations …step1/2/3 (`20260820023525`), client `7045f7b3` |
| Master Roadmap = active work map | ZURIEL · 2026-08-20 | canonical navigation doc | — | `0d247a1d`, work_log `790b54c0` |
| BUILDING / Feature-Visibility Law + v3 format | ZURIEL · 2026-08-20 | this law + state model | v2 format | v3 draft (this doc) |

---

## 🚪 OPEN HUMAN-GATES (each needs ZURIEL)
1. **Roadmap v3 → canonical** (merge to main).
2. **ELS Step 3 merge + deploy + live-verify.**
3. **ELS Step 4** (BLOCKED until #2).
4. **Tanakh `corpus_id`** (no invention).
5. **`fn_els_search`** secdef/search_path restore.
6. **§19→γ + §17 un-freeze + security enumeration** in Master State.
7. **ELS Full-Search-Space** merge (D4 vs Item 1).
8. **admin_research_review** → planning.
9. **Command Center UI** build (after map canonical).
10. **WS-FEATURE-CONTROL** design gate, then build gate.
11. **Person F-1b** (OD-F9a/F9b/F8).
12. **Raziel wiring.**

## 🌿 BRANCH ROUTING
| Branch | Role | Head / key commits | State |
|---|---|---|---|
| `main` | production (Vercel) | `ae8272c2` → `f5834f44` → `0d247a1d` | `LIVE` |
| `claude/raziel-capabilities-audit-h5k9ww` | dev branch (audits, γ `7985e0ce`, roadmap v2/v3) | behind main | dev only |
| `claude/els-step3-identity` | ELS Step 3 client | **`7045f7b3`** | `BUILT` · NOT merged/deployed |
| `claude/els-work-area` / ELS-2 | Full-Search-Space | `fb9c23ea` | `OPEN` (D4 preferred) |
| `claude/els2-b45k5h` | in-place neutralization source | `f946ed51` | `SUPERSEDED` |
| `claude/els-unified-merge` | deletion neutralization (Option B) | `542c7147` | `SUPERSEDED` |
| GPT 3D-preview branch | Knowledge Universe preview | (GPT) | `BUILDING` (preview) |

## 🧬 DEPENDENCY SPINE
```
Corpus (WS-ELS-CORPUS, LIVE) ── protected by ── WS-ELS-REGRESSION (LIVE, f5834f44)
   ├── WS-TANAKH corpus_id ............................ OPEN
   └── WS-ELS-IDENTITY  «ACTIVE_NOW candidate»
          Steps 1–3 DONE/LIVE (Step3 client BUILT, deploy pending)
          Step 4 BLOCKED → KU-3D/Navigator/ELS-Matrix BLOCKED
WS-GAMMA (DONE) ── §19→γ rewrite OPEN ── WS-LEDGER-REVIEW (DESIGN)
WS-SEC (DONE/LIVE) ── §18 enumeration OPEN
WS-RAZIEL (LIVE-unwired) ── wiring OPEN ── L1–L14 DESIGN
WS-PERSON: F-1a′ DONE/LIVE ── F-1b BLOCKED
WS-KU3D (BUILDING preview) ── enable BLOCKED on identity LIVE
WS-CC (roadmap) ── Command Center UI DESIGN ── WS-FEATURE-CONTROL FUTURE/DESIGN
FUTURE REGISTRY (INCOMPLETE) · PARKED REGISTRY · SUPERSEDED (provenance)
```

---

## 📌 SESSION CHECKPOINT (handoff-ready)
```
LAST_RECONCILED: 2026-08-20   SYNC: SYNCED (as of reconcile)

WHERE ARE WE:   ELS Finding Identity ~ complete; Step 3 client built, awaiting deploy.
WHAT WAS DONE:  corpus fix f5834f44 · Step3 DB 20260820023525 · Step3 client 7045f7b3 ·
                γ 7985e0ce · roadmap→main 0d247a1d · roadmap v2 8a45ddb2 · v3 draft.
WHAT CHANGED:   Finding Identity moved FROZEN→IN_PROGRESS (Steps 1–3 LIVE); Roadmap v2→v3
                (added FUTURE/PARKED/BUILDING states, freshness, Feature-Visibility law).
WHAT IS ACTIVE: WS-ELS-IDENTITY Step 3 deploy — CANDIDATE, pending Zuriel approval.
WHAT IS NEXT:   merge claude/els-step3-identity (7045f7b3) → main → deploy → verify → unblock Step4.
WHAT IS BLOCKED: Step 4 · KU-3D product · Person F-1b · (Command Center/Feature-Control build).
WHAT IS FUTURE: Command Center+Feature-Control · Meta Growth OS · Platform tiers+Credits+Academy ·
                UGC · Multilingual · ELS phase ב׳  (FUTURE REGISTRY = INCOMPLETE).
WHAT MUST NOT BE BUILT: Step 4 · KU-3D product · Command Center UI · Feature-Control mechanism ·
                F-1b · Raziel wiring · Tanakh identity  (see DO NOT BUILD YET).
DECISIONS:      see DECISIONS LOG (corpus/OptionA/γ/Steps1-3/roadmap/feature-law) + provenance.
PROVENANCE:     main 0d247a1d · Step3 client 7045f7b3 · γ 7985e0ce · Step3 DB 20260820023525.
ROADMAP:        canonical on main = 0d247a1d (v1) · v3 DRAFT on dev (review-only, not merged).
```

---

**PRIMARY PRINCIPLE:** the engine discovers & organizes · the **Roadmap navigates** · the Command Center *displays* · `work_log` keeps provenance · **Zuriel decides** · nothing becomes canonical, LIVE, or released merely because an agent did it.

_v3 DRAFT — review-only. Canonicalization (merge to main) + building the Feature-Control mechanism are separate Human-Gates. First close the map as the meta-map; then it tells us exactly where the BUILDING mechanism plugs in._
