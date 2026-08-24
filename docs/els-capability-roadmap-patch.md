# ELS Capability Unification — exact Master Roadmap patch

Target: `SOD1820_MASTER_ROADMAP.md`.

This file is an implementation note for a **single targeted roadmap reconciliation**. It does not replace the Master Roadmap and must not be treated as SSOT by itself.

## A. Header/freshness drift correction

PR #187 was merged to `main` on 2026-08-24 (`b074eb56c6035afc92ebf335093df481dca3ef42`). Therefore the Roadmap's existing “v5.2 candidate / PR #187 not yet merged” language is stale provenance text. On the next Roadmap write, retitle v5.2 as canonical-on-main and update the Research Studio reconciliation intro/freshness block accordingly. This is status reconciliation only, not a new product decision.

## B. Replace/expand build-order Step 3

Current short form:

> **ELS Lens integration** — ELS exact identity, Journey, Findings, Matrix, Verse, 2D/Layered/3D; the ELS is the first Lens, not owner of the Workspace.

Canonical expanded form:

> **ELS Lens integration — unified Work Area + 85-capability register.** One canonical ELS engine/state feeds `Discovery → Investigation → Judgment` and the three renderers `2D / Layered / 3D`. The recovered `docs/els-capability-audit.md` (historical “78-capability gate”) is the detailed capability inventory: 98 raw rows → 13 duplicates → **85 unique capabilities** (A26 · B20 · C5 · D6 · E10 · F8 · G10). The Work Area is the interaction/rendering shell; the 85-register is the acceptance inventory that fills it. 2D/Layers/3D never own separate truth. Every capability must receive an explicit disposition with provenance (`LIVE/ABSORBED · PARTIAL · BUILDING · PARKED · SUPERSEDED · NEVER`); no capability disappears because UI changes. Historical audit statuses from 18.8 are provenance only and must be reverified against current main/live state before being treated as current. Explicit user scope remains `📖 תורה` / `📜 כל התנ״ך` through one engine; execution strategy may differ for performance. Full unification contract: `docs/els-capability-workarea-unification.md`.

## C. Expand build-order Step 9

Current generic Legacy Capability Reconciliation should explicitly state:

> **Legacy Capability Reconciliation consumes the ELS 85-register.** For ELS, reconciliation is not an undefined legacy inventory: the authoritative detailed provenance input is `docs/els-capability-audit.md`. Each of its 85 rows maps to one Research flow stage (`Discovery/Investigation/Judgment`) and one presentation home (`2D/Layered/3D/non-visual-system`), then gets a live disposition. Absorb missing/high-value capabilities into the existing Work Area via the generic action/layer architecture; do not raw-merge an old UI and do not create separate apps/engines.

## D. Reconcile `WS-ELS-CAPABILITY-AUDIT`

The existing Workstream currently reduces the audit to “4 open questions”. Reframe it as:

- **WHERE_WE_ARE:** the 85-capability register has been recovered/restored as provenance and is now formally unified with `WS-ELS-WORKAREA`; the four historical questions remain open only where they are still decision-changing.
- **WHAT_IS_DONE:** 85 unique capabilities reconstructed and classified; register restored to repo; Work Area unification contract approved by ZURIEL 24.8.2026.
- **WHAT_IS_OPEN:** live status reconciliation of the 85 rows against current main/DB/production; only genuinely unresolved Human-Gates survive. Historical gaps already superseded (e.g. no-Worker, missing Work Area primitives) must not be reopened.
- **NEXT_ACTION:** reconcile the 85 rows against current live state, then absorb high-value missing capabilities through the existing Work Area.
- **DEPENDENCIES:** `WS-ELS-WORKAREA` + canonical engine/state contracts.
- **CANONICAL_HOME:** `docs/els-capability-audit.md` (detailed register) + `docs/els-capability-workarea-unification.md` (unification contract) + Master Roadmap (navigation).
- **STATE:** `BUILDING` / reconciliation in ELS Lens; not a separate product/workstream competing with Work Area.

## E. ELS Lens acceptance / next action

Roadmap navigation should make the following sequencing explicit:

1. preserve/ship the verified fast-input + Torah/Tanakh scope slice only through explicit release gate;
2. reconcile all 85 capabilities against current live state;
3. absorb high-value missing capabilities into the one Work Area (2D/Layered/3D/layers/actions);
4. close ELS Lens acceptance when every register row has an explicit disposition and the core UX is coherent/fast;
5. then continue Research Studio Step 4: Number/Gematria Adapter + NumberHub.

This does **not** erase the broader Research Studio build order. It defines what “ELS Lens integration” means completely enough that the 85-capability plan cannot disappear again.