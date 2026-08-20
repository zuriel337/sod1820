# 🧭 SOD1820 — MASTER ROADMAP (operational navigation)

> **What this is.** The single **operational navigation source** for SOD1820. It records where every significant workstream stands and **where work continues next (`ACTIVE_NOW`)**. It is a navigation document, **not** a source of truth and **not** a database: the engine discovers & organizes, the Roadmap navigates, the (future) Command Center *displays* (a Lens over this file), `work_log` keeps provenance, **Zuriel decides**. Nothing becomes canonical just because an agent did it.
>
> **Authority order:** live DB + `main` + `SOD1820_MASTER_STATE.md` (canonical state) > this Roadmap (navigation) > memory. This Roadmap **indexes** the canonical state; it never replaces it and never holds a parallel truth.
>
> **Workstream status vocabulary (the only allowed states — NO-DISAPPEARING-WORK):**
> `DONE` · `ACTIVE_NOW` · `PARALLEL_READY` · `OPEN` · `BLOCKED` · `FROZEN` · `DESIGN` · `SUPERSEDED` · `UNKNOWN`.
> Sub-qualifiers used descriptively: `LIVE` (in prod / live DB), `BUILT` (code/DDL exists, not deployed), `APPROVED` (Zuriel-gated decision).

---

## 👤 ACTOR / OWNERSHIP
- **ZURIEL** — Human-Gate · canonical decisions · WRITE/merge/deploy approval. The only actor who makes something canonical.
- **CLAUDE** — builder · deep audit · implementation (executes only within an explicit gate).
- **GPT** — research · strategy · cross-verification (parallel actor; proposes, does not make canonical).
- Coordination between agents runs **through `work_log` only** (`inter_agent_coordination_law`); Zuriel does not relay.

---

## ⚖️ GOVERNING LAWS (operative at all times)

### BUILDING / LOCKED LAW — `VISIBLE ≠ ENABLED`
A new feature enters **BUILDING / LOCKED** before it is ready. While BUILDING: it may be **visible** ("in construction"), but it is **not ENABLED**, **not PUBLISHED**, **not marked DONE**, and **not usable** by ordinary users until the **release gate / Human-Gate** closes. The user may *see* that something is being built without receiving an unfinished feature. UI must label it clearly (`בבנייה` / `BUILDING` / `LOCKED` / `בקרוב`).

### SESSION RECONCILIATION LAW
After **each significant step** (not every message): **verify → reconcile → update Roadmap → checkpoint.** Reconciliation asks: what actually changed · what was verified · what enters DONE · what stays OPEN · what became BLOCKED · did `ACTIVE_NOW` move · was a Human-Gate created · is there provenance/commit/migration · did an OPEN item close · what is the exact NEXT_ACTION. **Never mark DONE on intent or declaration alone. Never invent provenance.**

### NO-DISAPPEARING-WORK LAW
Every significant item must sit in exactly one state from the vocabulary above. A closed branch does not delete work — it gets **provenance**. A replaced feature becomes **SUPERSEDED + reference** to the new decision. If it is unknown what happened → **UNKNOWN**, never invented.

### DECISION LOGIC
Classify every material claim: `FACT` · `INFERENCE` · `RECOMMENDATION` · `DECISION` · `OPEN QUESTION`. Only a **DECISION approved by ZURIEL** becomes canon, and every canonical decision carries provenance (who / when / what / what it replaced).

### ACTIVE-NOW SAFETY
Exactly **one** `ACTIVE_NOW` at any moment. If several things can proceed in parallel, one is `ACTIVE_NOW`, the rest are `PARALLEL_READY`. If there is not enough information to choose, set `ACTIVE_NOW = UNKNOWN` and demand reconciliation — **do not guess**, and do not skip to a downstream feature just because it is more interesting when a higher-priority dependency is open.

---

## 🔵 ACTIVE_NOW (exactly one)

> **ACTIVE_NOW = `WS-ELS-IDENTITY` · ELS Finding Identity — Step 3 completion (deploy + live-verify).**
>
> **Why here (not preference):** Steps 1–3 are built; the Step 3 **client** (`7045f7b3`) is the only piece between Finding Identity and being LIVE end-to-end. Step 4 and all downstream ELS surfaces are BLOCKED on it. Dependency order + the pending Zuriel deploy-gate place the active position here.
>
> **NEXT_ACTION (single):** Zuriel gate → merge `claude/els-step3-identity` (`7045f7b3`) into `main` → deploy → live-verify that new Torah saves populate `start_index` (and `corpus_id`/`term_norm`), then reconcile Step 4 out of LOCKED.

*(The Roadmap-format upgrade that produced this document is now `DONE`; the Command Center UI is `DESIGN`/future and gated to "after the map is verified" — neither is ACTIVE_NOW.)*

## 🟢 PARALLEL_READY (independently gated; not the active position)
- **`WS-ELS-REGRESSION-FN`** — restore `search_path=public` + `security definer` on the **live** `fn_els_search` object (lost in the 18.8 rewrite). Independent DB gate.
- **`WS-MASTERSTATE` §17/γ update** — bring §17 (Finding-Identity no longer FROZEN) + γ two-layer into `SOD1820_MASTER_STATE.md`. Master WRITE gate.
- **`WS-ELS-FSS`** — merge/deploy decision for ELS Full-Search-Space / reverse-direction (Item 1 `fb9c23ea` vs els-work-area D4).
- **`WS-LEDGER-REVIEW`** — proceed `admin_research_review` from DESIGN to planning.

---

## 🗂️ WORKSTREAM REGISTRY

### WS-CC — Master Roadmap governance + Command Center
- **WHERE_WE_ARE:** Roadmap upgraded to this navigation format; Command Center UI not started.
- **WHAT_IS_DONE:** Roadmap created (`b3a19102`) + published to main (`0d247a1d`); this format upgrade.
- **WHAT_IS_OPEN:** Command Center view (Lens over this file).
- **WHAT_IS_BLOCKED:** Command Center UI — gated to "after map verified" (§10).
- **HUMAN_GATE:** ZURIEL — approve Command Center build when map is verified.
- **NEXT_ACTION:** none until ACTIVE_NOW advances; then verify map → gate CC-1 (read-only Lens).
- **DEPENDENCIES:** reads this Roadmap only; no new store.
- **CANONICAL_HOME:** `SOD1820_MASTER_ROADMAP.md` (main).
- **PROVENANCE:** `b3a19102` (create) · `0d247a1d` (main) · this doc (upgrade).
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` (roadmap governance) · Command Center = `DESIGN`.

### WS-ELS-CORPUS — Canonical ELS corpus (§17)
- **WHERE_WE_ARE:** Torah corpus canonical & live; Tanakh corpus identity undefined.
- **WHAT_IS_DONE:** `torah_stream` = 304,805 (Koren, `md5 0066c243…`); source of truth `tools/els/data/tk-letters.txt` (1,204,583 letters); `corpus_id 0b022e8eef6f9c16`; `fn_els_search` 0-based, `coverage 'partial'`.
- **WHAT_IS_OPEN:** Tanakh `corpus_id` (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** none (settled).
- **NEXT_ACTION:** none.
- **DEPENDENCIES:** protected by `WS-ELS-REGRESSION`.
- **CANONICAL_HOME:** Master State §17 (main) + live DB.
- **PROVENANCE:** §17 sync `ae8272c2`; corpus SWAP 18.8.
- **LAST_VERIFIED:** 2026-08-20 (live md5 + file hash re-checked this session).
- **STATE:** `DONE` / `LIVE`.

### WS-ELS-REGRESSION — Corpus regression neutralization
- **WHERE_WE_ARE:** In-place neutralization (Option A) live on main.
- **WHAT_IS_DONE:** `main f5834f44` — removed `TRUNCATE+INSERT` from `20260726_…_els_real.sql`, synced file `fn_els_search` to 0-based envelope, SUPERSEDED header.
- **WHAT_IS_OPEN:** live-object attributes (see `WS-ELS-REGRESSION-FN`).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** closed (Option A approved).
- **NEXT_ACTION:** confirm no other branch reintroduces the polluted corpus (els-unified-merge deletion path NOT merged).
- **DEPENDENCIES:** protects `WS-ELS-CORPUS`.
- **CANONICAL_HOME:** `supabase/migrations/20260726_name_protocol_wave2_1_els_real.sql` (main).
- **PROVENANCE:** `f5834f44` (main) · source `f946ed51` (els2-b45k5h).
- **LAST_VERIFIED:** 2026-08-20 (no executable regression on main).
- **STATE:** `DONE` / `LIVE`.
  - **Sub-item `WS-ELS-REGRESSION-FN`:** restore `search_path`+`security definer` on live `fn_els_search`. **STATE:** `PARALLEL_READY` / `OPEN`. HUMAN_GATE: ZURIEL.

### WS-ELS-IDENTITY — ELS Finding Identity `{corpus_id, term_norm, dir, skip, start}` — **NOT FROZEN**
- **WHERE_WE_ARE:** Steps 1–3 complete; Step 3 client built, not deployed; Step 4 locked.
- **WHAT_IS_DONE:** Step 1 nullable cols (LIVE) · Step 2 13-arg `save_els_matrix` (LIVE) · R1 verification (start 0-based, `positions[0]===start`, Torah space matches) · Step 3 **DB** server-derive helpers `fn_els_corpus_id`/`fn_els_term_norm`, INSERT-only identity, `save_els_matrix_anon` 11-arg (LIVE, migration `20260820023525`) · Step 3 **client** built (`7045f7b3`). Regression suite PASS (legacy NULL / Torah full / Tanakh NULL-corpus / anon identical).
- **WHAT_IS_OPEN:** deploy the Step 3 client; Tanakh identity (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** **Step 4 (dedup / UNIQUE) = LOCKED** until Step 3 deployed + verified.
- **HUMAN_GATE:** ZURIEL — merge + deploy Step 3 client; later, gate Step 4.
- **NEXT_ACTION:** merge `claude/els-step3-identity` → main → deploy → verify `start_index` populates on new Torah saves.
- **DEPENDENCIES:** `WS-ELS-CORPUS` (LIVE) · Tanakh completeness waits on `WS-TANAKH`.
- **CANONICAL_HOME:** live DB functions + Master State §17 (needs update, see `WS-MASTERSTATE`).
- **PROVENANCE:** migrations `…step1…`, `…step2…`, `…step3_server_derive` (`20260820023525`); client `7045f7b3`.
- **LAST_VERIFIED:** 2026-08-20 (signatures + rolled-back regression suite this session).
- **STATE:** `ACTIVE_NOW` (Steps 1–3 `DONE`/`LIVE`; Step 3 deploy pending; Step 4 `BLOCKED`).
  - **Sub-item `WS-TANAKH` — Tanakh `corpus_id`:** `0b022e8eef6f9c16` is the Torah identity; Tanakh identity is an explicit §17 open condition. **No invented Tanakh corpus_id.** **STATE:** `OPEN`. HUMAN_GATE: ZURIEL.

### WS-ELS-FSS — ELS Full Search Space / reverse-direction
- **WHERE_WE_ARE:** Direction decided; awaiting merge/deploy gate.
- **WHAT_IS_DONE:** full-search-space read-only analysis (els_records 1743/1743 verified, 19.8); Item 1 write+verify (reverse direction isolated); decision: els-work-area **D4** preferred over ELS-2 **Item 1**.
- **WHAT_IS_OPEN:** which artifact merges; merge/deploy.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — merge/deploy decision.
- **NEXT_ACTION:** Zuriel picks D4 vs Item 1 path → gate merge.
- **DEPENDENCIES:** shares corpus + identity with `WS-ELS-IDENTITY`.
- **CANONICAL_HOME:** branch artifacts (`claude/els-work-area`, ELS-2); not on main.
- **PROVENANCE:** Item 1 commit `fb9c23ea`; work_log 19.8 rows.
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `PARALLEL_READY` / `OPEN`.

### WS-GAMMA — γ two-layer research identity (Atlas / Ledger)
- **WHERE_WE_ARE:** Decision approved + documented; zero DB change.
- **WHAT_IS_DONE:** `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`). Atlas=`relation_evidence` (public-read) · Ledger=`research_objects` (server-only, R1) · engine stores keep own · link = `source`/`source_ref` string convention · `nodes`/`edges` canonical.
- **WHAT_IS_OPEN:** §19-old → γ Master State rewrite.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — §19→γ Master rewrite (separate gate).
- **NEXT_ACTION:** fold γ into Master State, mark §19-old SUPERSEDED there.
- **DEPENDENCIES:** feeds `WS-LEDGER-REVIEW`, `WS-MASTERSTATE`.
- **CANONICAL_HOME:** decision record (branch) → Master State (pending).
- **PROVENANCE:** `7985e0ce`.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` (decision) · §19→γ rewrite = `OPEN`. §19-old = `SUPERSEDED` by γ.

### WS-SEC — Security hardening (RLS / privacy guards)
- **WHERE_WE_ARE:** Multiple concrete leaks closed on live DB (19.8).
- **WHAT_IS_DONE:** `engraved_facts` P1 (#8) · `metatron_context` P2/P3/P4 (#9) · `numbers_worked`/`metatron_context` P2 identity-scoping (#10B) · `metatron_plan` REVOKE-from-public (researcher_definitions leak closed) · `number_dossier_json` privacy guard (LATENT-A). Each WRITE verified.
- **WHAT_IS_OPEN:** confirm all items reflected in Master State §18 (provenance enumeration).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** closed per item (each was gated at 19.8).
- **NEXT_ACTION:** enumerate in Master State §18 during the next Master WRITE.
- **DEPENDENCIES:** touches `research_objects` (Ledger), metatron layer.
- **CANONICAL_HOME:** live DB policies + Master State §18.
- **PROVENANCE:** work_log 19.8 rows (#8/#9/#10B/metatron_plan/LATENT-A).
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `DONE` / `LIVE` (per item).

### WS-LEDGER-REVIEW — admin_research_review / Ledger planning
- **WHERE_WE_ARE:** Read-only smoke-test passed; planning not started.
- **WHAT_IS_DONE:** `admin_research_review` over `research_objects` (fact+relation) smoke-test, full rollback, PASS (19.8).
- **WHAT_IS_OPEN:** full provenance on `node.metadata`, writes to `decision_ledger`, multi-member paths via `relates`/`engine_detail`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — approve move to planning phase.
- **NEXT_ACTION:** Zuriel gate → design the provenance/decision_ledger plan (no code yet).
- **DEPENDENCIES:** `WS-GAMMA` (Ledger model).
- **CANONICAL_HOME:** `research_objects` / `relation_evidence` (live) + future decision record.
- **PROVENANCE:** work_log 19.8 smoke-test row.
- **LAST_VERIFIED:** 2026-08-19 (not re-verified this session).
- **STATE:** `DESIGN` / `OPEN`.

### WS-RAZIEL — Raziel substrate + L1–L14
- **WHERE_WE_ARE:** DB substrate deployed but unwired; read-model contract designed.
- **WHAT_IS_DONE:** `fn_raziel_route`, `agent_identity`, `ti_demand_signals`, `fn_raziel_research_intel[_scoped]` live (migrations 20260809); R1, `resolve_person`/identity_edges (67,552), `fn_raziel_context`.
- **WHAT_IS_OPEN:** wire it: `fn_raziel_turn` is a STUB (reads neither RO nor metatron); `session_state` table absent; L1–L14 activation.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — approve wiring build.
- **NEXT_ACTION:** none until ACTIVE_NOW advances; then gate the wiring design.
- **DEPENDENCIES:** Ledger (`research_objects`), metatron.
- **CANONICAL_HOME:** live DB + Master State (Raziel §).
- **PROVENANCE:** migrations 20260809; `writer-os` = SUPERSEDED (ai-analyze byte-identical to main); `raziel-upgrade` main-tracking = **UNKNOWN**.
- **LAST_VERIFIED:** 2026-08 (substrate verified earlier this session; not re-run now).
- **STATE:** substrate `LIVE`-but-unwired · wiring `OPEN` · L1–L14 `DESIGN` · repo-tracking `UNKNOWN`.

### WS-MASTERSTATE — Master State governance / sync
- **WHERE_WE_ARE:** P1 drift sync live on main; §17 now stale re Finding Identity.
- **WHAT_IS_DONE:** `ae8272c2` — §15 MULTILINGUAL (APPROVED) · §16 R1 owner/privacy (APPLIED) · §17 corpus (APPLIED) · §18 SECURITY (APPLIED) + Change Log #23–#28. §19 excluded.
- **WHAT_IS_OPEN:** update §17 (Finding Identity `FROZEN → IN_PROGRESS`; Steps 1–3 LIVE; corpus neutralization `f5834f44`); fold γ; enumerate `WS-SEC`; note Roadmap `0d247a1d`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** ZURIEL — Master WRITE gate (not this step).
- **NEXT_ACTION:** on gate, apply the §17/γ/security updates surgically.
- **DEPENDENCIES:** `WS-GAMMA`, `WS-ELS-IDENTITY`, `WS-SEC`.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` (main).
- **PROVENANCE:** `ae8272c2`.
- **LAST_VERIFIED:** 2026-08-20 (§17 text confirmed still says FROZEN).
- **STATE:** sync `DONE`/`LIVE` · §17/γ update `PARALLEL_READY`/`OPEN`.

### WS-PERSON — Person-Identity (OD-F10a)
- **WHERE_WE_ARE:** Contract approved (design); self-ledger live; family blocked.
- **WHAT_IS_DONE:** contract `docs/planning/family_identity_contract.md`; **F-1a′** `fn_upsert_self_profile` (self → private RO) IMPLEMENTED + LIVE.
- **WHAT_IS_OPEN:** F-1b (family members + parent_of).
- **WHAT_IS_BLOCKED:** F-1b — on OD-F9a (person-ref minting), OD-F9b (parent_of home), OD-F8 (projection privacy).
- **HUMAN_GATE:** ZURIEL — OD-F9a/F9b/F8 decisions before F-1b.
- **NEXT_ACTION:** none until those decisions.
- **DEPENDENCIES:** `nodes_public_read` (OD-F8), Ledger.
- **CANONICAL_HOME:** contract doc + `research_objects` (self rows).
- **PROVENANCE:** F-1a′ live function; contract record.
- **LAST_VERIFIED:** 2026-08 (F-1a′ verified earlier).
- **STATE:** contract `APPROVED`/`DESIGN` · F-1a′ `DONE`/`LIVE` · F-1b `BLOCKED`.

### WS-KU3D — GPT Knowledge Universe 3D preview
- **WHERE_WE_ARE:** Visual preview being built by GPT on a branch; not deployed.
- **WHAT_IS_DONE:** 3D Knowledge Universe visual preview (actor=GPT), branch/preview only.
- **WHAT_IS_OPEN:** scope, data source (must read the one graph, not a parallel store), release gate.
- **WHAT_IS_BLOCKED:** enabling for users — BUILDING/LOCKED: must not go LIVE, and downstream ELS surfaces (KU-3D as product) stay blocked until Finding Identity is LIVE.
- **HUMAN_GATE:** ZURIEL — approve any deploy / user-enablement.
- **NEXT_ACTION:** keep as visible BUILDING preview; no deploy; cross-verify against `unified_graph_law`.
- **DEPENDENCIES:** `WS-ELS-IDENTITY` (for real cipher data), the one graph (`nodes`/`edges`).
- **CANONICAL_HOME:** GPT branch/preview (not main).
- **PROVENANCE:** work_log 19.8 "3D Knowledge Universe visual preview (actor=GPT)".
- **LAST_VERIFIED:** 2026-08-19 (GPT-reported; not verified by CLAUDE).
- **STATE:** `IN_PROGRESS` / `BUILDING` (preview only) — `VISIBLE ≠ ENABLED`.

---

## 🚪 OPEN HUMAN-GATES (consolidated — each needs ZURIEL)
1. **ELS Step 3 merge + deploy + live-verify** (ACTIVE_NOW's next action).
2. **ELS Step 4** (dedup/UNIQUE) — LOCKED until #1 verified.
3. **Tanakh `corpus_id`** decision (no invention).
4. **`fn_els_search`** live-object `search_path` + `security definer` restore.
5. **§19 → γ Master State rewrite** + §17 Finding-Identity un-freeze + security enumeration.
6. **ELS Full-Search-Space** merge/deploy (D4 vs Item 1).
7. **admin_research_review** → planning phase.
8. **Command Center UI** build (after map verified).
9. **Person F-1b** — OD-F9a/F9b/F8.
10. **Raziel wiring** (`fn_raziel_turn`, `session_state`, L1–L14).

---

## 🌿 BRANCH ROUTING
| Branch | Role | Head / key commits | State |
|---|---|---|---|
| `main` | production (Vercel) | `ae8272c2` → `f5834f44` → `0d247a1d` (roadmap) | `LIVE` |
| `claude/raziel-capabilities-audit-h5k9ww` | designated dev branch (audits, γ record `7985e0ce`, roadmap upgrade) | behind main | dev only |
| `claude/els-step3-identity` | ELS Step 3 client half | **`7045f7b3`** | `BUILT` · **NOT merged / NOT deployed** |
| `claude/els-work-area` / ELS-2 | Full-Search-Space artifacts | `fb9c23ea` (Item 1) | `OPEN` (D4 preferred) |
| `claude/els2-b45k5h` | source of in-place neutralization | `d3a9e9d7`,`f946ed51` | `SUPERSEDED` (Option A merged to main) |
| `claude/els-unified-merge` | file-deletion neutralization | `542c7147` | `SUPERSEDED` (Option B, not chosen) |
| GPT 3D-preview branch | Knowledge Universe preview | (GPT) | `BUILDING` (preview only) |

## 🧬 DEPENDENCY SPINE
```
Canonical corpus (WS-ELS-CORPUS, LIVE) ── protected by ── WS-ELS-REGRESSION (LIVE, main f5834f44)
   ├── Tanakh corpus_id (WS-TANAKH) ................................. OPEN
   └── ELS Finding Identity (WS-ELS-IDENTITY)  «ACTIVE_NOW»
          Steps 1–3 ...... DONE/LIVE (Step 3 client BUILT, deploy pending)
          Step 4 ......... LOCKED (dedup/UNIQUE)  → then KU-3D/Navigator/ELS-Matrix (BLOCKED)
γ two-layer (WS-GAMMA, DONE) ── §19→γ Master rewrite (OPEN) ── feeds WS-LEDGER-REVIEW (DESIGN)
WS-SEC (DONE/LIVE) ── enumerate in Master State §18 (OPEN)
WS-RAZIEL (LIVE-unwired) ── wiring OPEN ── L1–L14 DESIGN
WS-PERSON: F-1a′ DONE/LIVE ── F-1b BLOCKED (OD-F9a/F9b/F8)
WS-KU3D (GPT, BUILDING preview) ── product-enable BLOCKED on Finding Identity LIVE
WS-CC (roadmap DONE) ── Command Center UI = DESIGN (Lens over this file, after map verified)
```

---

## 📌 SESSION CHECKPOINT
```
ACTIVE_NOW:  WS-ELS-IDENTITY — ELS Finding Identity Step 3 completion (deploy + live-verify).
             NEXT_ACTION: Zuriel gate → merge claude/els-step3-identity (7045f7b3) → main
             → deploy → verify start_index populates → unlock Step 4.

COMPLETED (this session, LIVE/verified):
  • Corpus regression neutralized on main ............. f5834f44
  • ELS Finding Identity Step 3 (DB server-derive) .... migration 20260820023525 (LIVE)
  • ELS Step 3 client built (branch) ................. 7045f7b3 (NOT merged/deployed)
  • γ two-layer decision record ...................... 7985e0ce
  • Master Roadmap created + published to main ....... 0d247a1d
  • Roadmap-format upgrade (this document) ........... committed to dev branch

PARALLEL_READY:  fn_els_search secdef/search_path restore · Master State §17/γ update ·
                 ELS Full-Search-Space merge · admin_research_review planning

BLOCKED:  ELS Step 4 (on Step 3 deploy) · KU-3D/Navigator/ELS-Matrix (on identity LIVE) ·
          Person F-1b (OD-F9a/F9b/F8)

HUMAN-GATES:  ELS Step 3 deploy · Step 4 · Tanakh corpus · fn_els_search restore ·
              Master State §17/γ/security update · Full-Search-Space merge ·
              Ledger planning · Command Center UI · Person F-1b · Raziel wiring

PROVENANCE:  main HEAD = 0d247a1d · Step3 client = 7045f7b3 · γ = 7985e0ce ·
             Step3 DB = migration 20260820023525
ROADMAP:  SOD1820_MASTER_ROADMAP.md (canonical copy on main = 0d247a1d; this upgrade on dev branch)
```

---

**PRIMARY PRINCIPLE:** the engine discovers & organizes · the **Roadmap navigates** · the Command Center *displays* · `work_log` keeps provenance · **Zuriel decides** · nothing becomes canonical merely because an agent did it.

_Update path: after each significant step — verify → reconcile → update here → checkpoint. Canonical state changes go to `SOD1820_MASTER_STATE.md` on `main` via their own gate. This file is navigation, never a parallel truth or a new store._
