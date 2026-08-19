# 👤 Person-Identity Contract — Family / Life / Hints (OD-F10a · APPROVED DECISION)
> **READ-ONLY design record. No WRITE / schema / migration / function / projection was performed to produce this.**
> Actor: CLAUDE. Approved by Zuriel as **DECISION/CONTRACT only** (19.8.2026). Implementation NOT authorized.

---

## ✅ THE DECISION (OD-F10a — locked)
**זהות אדם בעולם-הבעלים = `person-ref` לוגי יחיד.**
- **Namespace:** `person:<owner_person_id>:{self | p:<ref>}`
- **Same `person-ref` is shared across Family + Life + Hints** — one human, one ref, many lenses.
- **`person-ref` is the person's identity anchor.**
- **`research_objects.id` (RO.id) stays the research-object id** — it does **not** become the person's identity.
- **`identity-RO`** (kind=`observation`, statement=name) is the **canonical research representation** of the person.
- **Lenses address the person by `person-ref`, never by RO.id, and never mint separate identities.**

## Why (grounded in live schema — FACTS)
- Cross-lens sharing happens at **draft time** (`lifeProfile` localStorage) **before any RO.id exists** → the shared anchor must be a **client-minted logical ref**, not a server id.
- Addressing convention **already exists**: `research_candidates.(subject_type, subject_ref)` (e.g. `number:1820`). `person` extends it — no parallel mechanism. No `subject_type='person'` exists yet (new value, not new table).
- All link points already exist: `relates text[]` (ledger) → `edges` (graph, gated) · `owner_person_id` · `meta jsonb`. **No new table/column/mechanism.**
- `persons` has **no name columns** → a non-user family member has no meaningful `persons` row; identity is logical (`person-ref`), embodied by the identity-RO.

## Layer model (one person, three representations, one anchor)
| Layer | Representation | Key |
|---|---|---|
| Draft (client) | lifeProfile entry | **person-ref** (minted once, cached) |
| Ledger (server) | identity-RO (`observation`, private) | `source_ref='person:<owner>:{self\|p:<ref>}'`; RO.id = record id |
| Graph (future, gated by OD-F8) | person-node | label TBD (`ro:<id>` vs person-ref) — **deferred** |
Bridge across all layers = **person-ref**. Findings/relations/life-events reference the person **by person-ref** (via `relates`/`meta`), not by any single RO.id.

## Lens contract (lenses ≠ identities)
- **Family / Life / Hints = read-model queries** over ROs (owner + context + person-ref). A person in Family *and* Life = one person-ref, two views.
- **`member_ref` (OD-F9) is renamed → `person-ref`** — the family lens is just one consumer of the general person identity.

## Downstream wiring (design only — not built)
- **Names↔Years↔Events↔Findings:** identity-RO.statement=name → (post-projection) person-node `has_name` entity(name) `equals` number · `born_in` year · event `documents` person · finding `relates=[person-ref]`. All via existing `relates`→`edges`.
- **Control Center + Human-Gate:** person-ROs are private (server-only). A family *finding* proposed for public/canonical enters intake as a source and promotes through the **single Human-Gate (OD-1)** — no family-specific gate.
- **Raziel Personal Research Context:** `research_plans(strategy='Personal')` + `agent_user_memory` read the person's ROs by (owner, person-ref); Metatron assembles `{facts(engine) · claims(family) · provenance · open-questions}`; Raziel presents, never promotes.

## Status of the F-1 chain
- **F-1a′ (self profile → private research_objects) — IMPLEMENTED + LIVE-VERIFIED** (function `fn_upsert_self_profile`, `source_ref='person:<owner>:self'`). **Compatible with this contract** (self = the `:self` case of the namespace).
- **F-1b (family members + parent_of) — NOT AUTHORIZED.** Blocked on OD-F9a (person-ref minting) + OD-F9b (parent_of home) + OD-F8 (projection privacy).

## ⛔ NOT approved / NOT locked (explicit)
F-1b WRITE · migration · schema change · function · graph projection · final parent_of architecture · role taxonomy (no spouse/sibling freeze) · automatic cross-person dedup (requires human judgment) · timeline model · Family/Life/Hints implementation.

## Open decisions carried forward
- **OD-F9a:** person-ref minting (client UUID cached in draft) — confirm before F-1b.
- **OD-F9b:** parent_of ledger (`relates[]`, no FK) vs `parent_id` (FK); canonical home = graph `edges` post-OD-F8.
- **OD-F9c:** `meta.role` — function-enforced, open taxonomy, not DB enum.
- **OD-F8:** `nodes_public_read USING(true)` blocks any private→graph projection.
- **OD-1:** single canonical Human-Gate for promotion.
- **OD-F10b:** map person-ref ↔ `research_candidates.subject_type='person'` at promotion time.

## 🚪 Next step (after this record)
Map the connections between **Family + Life + Hints + Names + Years + Events + Findings + Raziel + Control Center** on top of this single `person-ref` anchor — **READ-ONLY, before any WRITE**. F-1b remains unstarted.
