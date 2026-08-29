# M1 Truth Contract — Implementation Pass

Status: **branch-only code; DB changes are LIVE on `linswmnnkjxvweumprav`.** Not merged. Not deployed.
Human Gate required before merge/deploy (`deploy_on_request`).

- Evidence pass (read-only, contract design): `work_log` `b259901a-98ec-4cd1-a1c1-9c35a0ed8dde`
- This pass: BEFORE `4a59e0ff-6478-45b0-b4cf-4d5b2cf53990` · AFTER see `work_log_current`
- Canonical law: `select description from nodes where rule_id='truth_axes_foundation_law';`
  and `select body from project_codex where slug='truth_axes_foundation_v1';`

## Human-Gate decisions implemented

| | Decision | Implemented as |
|---|---|---|
| HG-1 | Option D / Hybrid — four orthogonal axes, no universal lifecycle enum, no `lifecycle_state` | `truth_axes_foundation_law` (nodes rule, weight 5) + `project_codex/truth_axes_foundation_v1` |
| HG-2 | `approved` != `canonical`, two distinct Governance states | CHECK on `research_objects.status`; `approve` and `canonicalize` split in `admin_research_review` |
| HG-3 | Engine verification MANDATORY-DECLARED, not mandatory-match; never fabricate `match` | verification declared into `research_objects.engine_detail` at canonicalization; `match` removed from both projection adapters |
| HG-4 | PR #226 HOLD + AMEND | reconciled into this branch with two fabrications removed; #226 itself left open and untouched |
| HG-5 | Real provenance, no fabricated actor | `set_relation_evidence` no longer hardcodes `source='zuriel'` |

## The four axes

`EPISTEMIC TYPE` != `VERIFICATION` != `GOVERNANCE` != `PUBLICATION/ACCESS`, plus a **separate,
non-semantic** `DOMAIN/OPERATIONAL STATUS` axis (queues, jobs, document lifecycles) which is
legitimately domain-owned and must never be normalized into the others.

The model was already ratified three times (Universal Finding Contract §5, Research DNA v1 §2,
Master State §11.34) and owned by nobody; its only enumerated vocabulary lived in client JS.
This pass gives it an owner and enforces it **at exactly two points** — the `->canonical` /
`->published` transitions, and the projection boundary.

## DB changes (LIVE)

`supabase/migrations/20260829134800_m1_truth_axes_foundation_law.sql`
`supabase/migrations/20260829135500_m1_governance_vocabulary_kind_decouple_and_provenance.sql`

1. **Foundation law** — one `nodes` rule + one `project_codex` row. No new table, no new column.
2. **`research_objects.status` CHECK** `{candidate, approved, canonical, rejected}` — added
   **validated**; all 577 live rows already conformed, so **zero rows changed, no backfill**.
3. **`decision_ledger.status` CHECK** `{confirmed, rejected, applied, executed}` — added
   **`NOT VALID`** on purpose. Exactly one historical row
   (`caf9fa14-5d4a-4261-b446-3e743e7cde27`, `status='wave4_gap_detector_and_fill_complete'`, a
   pipeline progress note written into a governance column on 2026-08-07) is **preserved, not
   rewritten and not adjudicated** (`everything_additive_law`). New writes are enforced.
4. **`admin_research_review` v2** — the D-1 defect is closed. The old body branched
   `if kind in ('fact','relation') then canonical else approved`, so a caller-supplied noun at
   intake decided how far one human approval promoted a row.
   - `approve` → `approved` for **every** kind. No projection, no publication.
   - `canonicalize` → `approved` → `canonical`, an explicit separate Human-Gate act.
   - `reject` → from `candidate` **or** `approved`.
   - Graph projection **moved** from approve to canonicalize, predicate unchanged
     (`kind in ('fact','relation') AND privacy_scope='public_candidate'`). `kind` now decides only
     *whether a projection happens*, never *how far governance advances*.
   - Verification is declared into `engine_detail`; when no claim-vs-engine test is on record the
     honest `not_tested` is written and the legacy `engine_verified` boolean is preserved beside it
     as a snapshot instead of being translated into a claim.
   - Governance provenance (`approved_by`/`canonicalized_by` + timestamps) recorded in `meta`.
   - **Extends the one existing Human-Gate RPC.** No second canonicalization engine was created.
5. **`set_relation_evidence` v2** — the literal `source => 'zuriel'` is gone.

## Code changes

- `src/lib/research/universalFinding.js` — removes all four live fabrications
  (`stage -> "finding"` on missing input **and** on invalid input, `status -> "active"`,
  `createdBy -> "SYSTEM"`, and the second `findingStage -> "finding"`). Invalid `stage` or
  `verification_state` now **throws** instead of being silently laundered. Adopts `verification{}`
  and `access{}` from PR #226 so the envelope can represent all four axes.
  Presentation-safe defaults are kept.
- `src/lib/research/canonicalGematria.js` — reconciled from PR #226.
- `src/components/research/FindingSurface.jsx` — reconciled from PR #226; shows all four axes and
  renders unknown as unknown.
- `src/lib/research/useUniversalWorkspace.js` — `researchCanonicalGematria` from PR #226.
- `src/lib/supabase.js` — `setRelationEvidence` gains an optional evidence-`source` argument.
- `src/components/WarRoomTab.jsx` — the approve outcome label now states `approved ≠ canonical`.

## PR #226 reconciliation (HG-4)

**Preserved:** the `verification`/`access` envelope fields, the canonical Gematria adapter
(`gematria_api` only, never local `calcGem`), the `useUniversalWorkspace` integration, and
`FindingSurface`.

**Amended before adoption — both were semantic fabrication:**

1. `verification_state: "match"` was hardcoded in **three** places (the gematria adapter and both
   ELS adapters). In the gematria adapter `claimed_value` was set to the engine's *own* value, so
   the "match" was self-confirming — nothing was claimed, so nothing matched. HG-3 forbids
   fabricating `match`. Replaced with `not_tested`, with the engine's real output still fully
   recorded in `engine_method_tested`/`engine_result`. Capability kept, false claim dropped.
2. `stage: "finding"` and `status: "active"` were declared by the gematria adapter, and
   `FindingSurface` defaulted both `stage` and `verification_state`. A projection adapter does not
   own the epistemic type or governance state of what it transports.

**Not adopted:** `public/research-studio-finding-preview.html` (a visual fixture with no semantic
role) and `docs/research-studio-canonical-extension-v0.md` (superseded by this document).

**PR #226 itself was not touched** — not merged, not amended in place, no push to its branch. Its
base is also stale (`e8461b31`; `main` is now `e5f21efc`). Recommendation for ZURIEL: close it
unmerged as superseded-in-part, since its useful content now lives here with provenance recorded.

## Known remaining gaps (reported, not designed around)

1. **`relation_evidence` has no actor column.** `source` is unambiguously *evidence-source*
   semantics (`engine_scan`, `els_record:<uuid>`, `ai_judge:*`, `cross_method:*`, `cipher_scan:*`,
   `vip`) and was therefore **not** overloaded with `auth.uid()`. Adding an actor column is blocked
   by a real access consequence: `anon` **and** `authenticated` hold **table-level** `SELECT`
   (`relacl` `anon=rDxtm`), so a new column becomes world-readable the moment it exists, and
   `src/lib/supabase.js` reads the table with `.select('*')`, so switching to column-level grants
   would break the live Findings tab. Needs a Human-Gate decision about that read surface.
2. **`decision_ledger.status` constraint is `NOT VALID`** until ZURIEL adjudicates the single
   historical row above.
3. **No UI path to `canonicalize` yet.** The RPC exists and is Human-Gate-guarded, but `WarRoomTab`
   lists only `status='candidate'` rows. Deliberately not built here — section I forbids UI
   redesign in this pass.

## Explicitly untouched

M2 / the 77 ELS `self_published` rows · ELS publication behaviour · Experience Governance ·
P3 admin cleanup · unrelated migration drift · UI redesign · `main` · production.
