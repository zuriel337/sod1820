# SOD1820 — ELS Capability × Work Area Unification

**Status:** ZURIEL Human-Gate decision, 2026-08-24 · documentation/reconciliation only.  
**Actor:** GPT / Research Agent 2.  
**Scope:** unify two already-existing ELS plans; no new engine, graph, store, schema or truth layer.

## 1. DECISION — one ELS program, not two plans

The ELS program has one canonical engine and one Research Studio state. The two planning artifacts are complementary layers of the same program:

1. **Work Area / Research flow** — `Discovery → Investigation → Judgment`, rendered as **2D / Layered / 3D** over the same Finding/Matrix/Research State.
2. **Capability register** — the recovered `docs/els-capability-audit.md`, historically called the **"78-capability gate"**, rebuilt from 98 raw rows into **85 unique capabilities** (A26 · B20 · C5 · D6 · E10 · F8 · G10).

The Work Area is the shell and interaction model; the 85-capability register is the feature/capability inventory that fills it. Neither replaces the other.

## 2. Canonical architecture constraints

- **ONE ENGINE:** `tools/els/` remains the only ELS engine source; `public/tzofen.html` is build output.
- **ONE STATE / MANY RENDERERS:** 2D, layers and 3D visualize the same ELS Finding/Matrix state. 3D and layers never become independent truth.
- **ONE TREE:** ELS Findings/Research references join the existing Research OS / `nodes`+`edges` contracts; no parallel graph.
- **ONE HUMAN GATE:** AI/automation may find, rank and explain candidates; ZURIEL alone controls Canonical/Published decisions.
- **Rank, Don't Hide:** weak/expensive/uncertain capabilities are ranked, gated or progressively disclosed — not silently removed from the plan.
- **NO-DISAPPEARING-CAPABILITY:** every capability in the 85-register must end in an explicit disposition with provenance: `LIVE/ABSORBED`, `PARTIAL`, `BUILDING`, `PARKED`, `SUPERSEDED`, or `NEVER`. No capability may disappear merely because the UI is redesigned.

## 3. Work Area structure

### Research flow
- **Discovery** — search, candidate generation, occurrence navigation and entry context.
- **Investigation** — matrix manipulation, finding actions, proximity, statistics, comparison, verse/context and research layers.
- **Judgment** — evidence/claim/interpretation distinction, confidence/significance explanation and Human Gate actions.

### Renderers
- **2D** — fastest baseline; Focus/Fit and direct matrix work.
- **Layered** — optional research overlays on the same matrix/state. Verse is the first live layer; Cross / Heat / Number-Gematria / Evidence / Research-Depth are extension slots, not separate apps.
- **3D** — depth/explode/isolate/camera renderer of the same state; no 3D-only facts.

### Scope
The user must have an explicit choice between **📖 Torah only** and **📜 whole Tanakh**. This remains one engine. Execution strategy may differ by scope for performance, but semantics/identity stay canonical.

### Performance contract
- Typing/input must feel immediate; research/matrix state must not rerender on every keystroke.
- The canonical iframe/engine should remain warm between searches where possible.
- 2D is the fast baseline; heavy layers/3D are lazy/on-demand.
- Heavy Tanakh/convergence work may use Workers/adaptive execution without creating a second algorithmic truth.

## 4. The 85-capability register

Detailed source: `docs/els-capability-audit.md`.

Families recovered from ELS2:

| Family | Count | Role in the unified Work Area |
|---|---:|---|
| A — Matrix & display | 26 | 2D / Layered / 3D renderer controls and direct matrix interaction |
| B — Search layer | 20 | Discovery/search/scope/geometry execution |
| C — Finding actions | 5 | Investigation actions on Findings |
| D — Occurrence & proximity | 6 | Finding/axis navigation and proximity evidence |
| E — Ranking / statistics | 10 | Significance, rarity, quality and explainable ranking |
| F — Candidate generators | 8 | Discovery candidates; never auto-canonical |
| G — Save / share / research case | 10 | Workspace/Journey/provenance/share/persistence integration |
| **Total** | **85** | **one capability register for one ELS Lens** |

**Historical-status warning:** the audit's distribution (`72 LIVE · 2 BRANCH · 2 PARTIAL · 1 DEAD · 7 MISSING · 1 NEVER`) was measured on **2026-08-18**. It is provenance, not today's live status. Since then main changed materially (Work Area, State/Matrix renderers, Workers/adaptive performance, Research history bridge, etc.). Each row must be revalidated against current main/live state before its status is reused.

## 5. Absorption rule — how the two plans become one

For every capability row:

1. Identify its canonical engine/state primitive.
2. Map it to `Discovery`, `Investigation`, or `Judgment`.
3. Map its presentation to `2D`, `Layered`, `3D`, or `non-visual/system`.
4. Record current live disposition (`LIVE/ABSORBED`, `PARTIAL`, `BUILDING`, `PARKED`, `SUPERSEDED`, `NEVER`) with code/DB provenance.
5. If capability is useful but not ready, keep it visible in the register and expose later through progressive disclosure — never build another app just to host it.

The 85 rows therefore become the **acceptance inventory for ELS Lens integration and Legacy Capability Reconciliation** in the Master Roadmap.

## 6. Known historical gaps — not current facts until reverified

The recovered audit recorded GAP-1…GAP-8/9 (statistics-window mismatch, fixed width/geometry limits, frozen `ctxR`, unreachable `findAtSkips`, `els_records` provenance gaps, no Worker, missing Research Bus, dead functions, branch-only Work Area primitives). These remain valuable provenance, but **must not be repeated as current truth without live verification**. For example, the historic “no Worker” gap has already been superseded by the 2026-08-24 performance work now on main.

## 7. Build order inside ELS Lens

1. **Responsiveness + scope slice** — preserve the verified fast-input design and explicit Torah/Tanakh selector; merge/deploy only by explicit ZURIEL gate.
2. **85-row live reconciliation** — update statuses against current main/DB/production, without re-auditing settled questions or changing capability definitions.
3. **Absorb high-value missing capabilities into the existing Work Area** using the generic action/layer architecture; no extra app/engine.
4. **Close ELS Lens acceptance** when the register has explicit dispositions and the core user path is fast/coherent across 2D/Layered/3D.
5. **Then continue Master Roadmap Step 4: Number/Gematria Adapter + NumberHub.**

## 8. Provenance

- `docs/els-capability-audit.md` — ELS2 read-only audit, `claude/els2-b45k5h`, original commit `e0a2247a`, restored to this reconciliation branch byte-for-byte.
- `src/pages/ElsWorkAreaPage.jsx` — current Work Area on main: Discover/Investigate/Judge + 2D/Layered/3D + generic layer controller.
- `SOD1820_MASTER_ROADMAP.md` — Research Studio v1 build order, Step 3 ELS Lens + Step 9 Legacy Capability Reconciliation.
- `work_log` — actor=GPT `ELS_CAPABILITY_ROADMAP_UNIFICATION` before/after records.

**No product behavior is changed by this document.**