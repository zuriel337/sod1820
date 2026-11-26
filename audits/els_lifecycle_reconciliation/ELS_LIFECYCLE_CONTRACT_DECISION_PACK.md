# ELS Lifecycle Contract — Decision Pack

Status: GPT recommendation, NOT canonical until ZURIEL Human-Gate.
Actor: GPT
Date: 2026-08-23
Scope: ELS lifecycle semantics only; no schema redesign, no UI redesign, no Cross/Raziel build.

## FACT — live state

`els_records` currently carries three independent axes that must not be collapsed:

1. `status` has DB-allowed values `draft | pending | published | hidden | archived`.
2. `visibility` has DB-allowed values `public | member | premium | admin | private`.
3. `self_published` is a separate boolean owner-controlled projection flag.

Live RLS currently exposes a row publicly when either:
- `status='published' AND visibility='public'`, OR
- `self_published=true`.

`moderate_els_matrix` is admin-only and accepts only `published | pending | hidden`.
`self_publish_matrix` is owner-only and toggles `self_published` without changing moderation state.
`admin_els_to_dossier` sets `status='hidden', self_published=true`.

Therefore `published` is a legacy overloaded label; it is NOT equivalent to Gate #18 Publication/Canonical semantics.

## RECOMMENDED CONTRACT

### A. `status` = ELS moderation/workflow lifecycle only
Do not use `status` as canonical truth or general publication authority.

Compatibility semantics:
- `draft` = saved working item, not submitted/reviewed.
- `pending` = awaiting moderation/review.
- `published` = legacy label meaning **moderation-approved / library-eligible**. Keep the stored value for backward compatibility; in new contracts/code call its semantic meaning `moderation_approved`.
- `hidden` = removed/withheld from the shared ELS library; does not imply private and does not erase the finding.
- `archived` = retained historical record, not active library material.
- `variant` is NOT a lifecycle state; it remains a relation/marker (`positions.variantOf`).

### B. `visibility` = access scope only
`visibility` answers who may access a projection. It does not answer whether the finding is true, canonical, reviewed, or complete.

### C. `self_published` = owner-public projection, not canonical publication
`self_published=true` means the owner elected to expose the finding on their public/personal research surface under the existing legacy behavior.
It MUST NOT mean:
- canonical finding;
- admin approval;
- inclusion in the canonical ELS library;
- verified research truth.

This preserves existing public ciphers on researcher/person pages without retroactively changing access, consistent with the Gate #4 visibility decision.

### D. Canonical / Human-Gate remains separate
Canonical status is not encoded by `els_records.status`, `visibility`, or `self_published`.
A canonical/research decision must be recorded through the Unified Judgment Contract / `decision_ledger` and any downstream canonical projection explicitly.

### E. Decision-ledger wiring scope
When the Vertical Slice is built, the event written to `decision_ledger` must represent **the admin moderation decision** only (e.g. approve/hide), not claim that the row became canonical or globally published.
Owner `self_publish_matrix` actions are visibility/projection actions and MUST NOT be recorded as canonical Human-Gate decisions.

## NO RETROACTIVE CLEANUP NOW

Do not rewrite existing rows, rename statuses, remove public self-published ciphers, or add a new lifecycle table in this pass.
The first implementation should scope around the legacy semantics safely.

## HUMAN-GATE DECISION REQUIRED

ZURIEL to approve/reject this semantic contract before `moderate_els_matrix -> decision_ledger` wiring is implemented.

## ADDENDUM 2026-11-26 — three publication tiers (ZURIEL final product decision; proposal, not applied)

Status: product decision by ZURIEL (26.11.2026). The exact SQL and tests are prepared on branch `claude/biblical-cipher-audit-zspg77`; **not applied to the database; applying it needs a separate exact approval.** It refines A–C of this pack and replaces the earlier "private guarantee" draft. No new contract, table or approval mechanism.

FACT (read-only, live 26.11.2026): section C ("`self_published=true` exposes a row publicly under the legacy behavior") is implemented by the RLS policy `public_read_self_published_els USING (self_published = true)`, which does **not** look at `visibility`. One private draft (`אליהו`) is readable by an anonymous reader. Also, live #1492 publishes a member's public save directly to the central library; the decision below reverses that.

Three tiers:
1. **Private** (`visibility='private'`): visible to the owner and authorized parties (administrators) only. No flag overrides it; a `CHECK` forbids `private` together with `self_published`.
2. **My page** (`visibility='public'`, `self_published=true`, status stays `draft`): the researcher publishes by themself, no approval; open to everyone and to search engines (researcher page, permanent `/codes/<slug>`, sitemap, canonical, OG, JSON-LD). Passes the same replay gate (`els_publish_truth_gate_v1`) as any public save. Withdrawal returns it to private. This is not an approved research finding.
3. **Central library** (`status='published'`): only an administrator approves, through the existing `moderate_els_matrix`. The owner only requests (`request_els_library_review`: `draft`→`pending`, an item in the existing `system_suggestions` queue), and may withdraw the request. Approved ciphers keep their access if the owner clears the flag; the 116 existing public ciphers are untouched.

Strong-cipher recommendation (extends the existing ELS ranking/quality data and `system_suggestions`; no engine or contract added): a heuristic, explicitly **indicative and uncalibrated** (consistent with `elsResearchAssessment.js`): stars ≥4, score ≥60, ≥2 findings, replay gate MATCH, no sensitive-looking text. A private strong cipher is only suggested to its owner (`els_my_strong_ciphers`, owner-only), never exposed. A public page cipher may be raised for administrators as a library candidate (`detect_els_strong_ciphers`, dedupe key per record, 30-day rejection memory, no notification without severity, attribution to the original researcher preserved). Sensitive-looking text is never an automatic candidate. Recommendation is evidence, never approval; the library decision stays with ZURIEL.

Prepared, not applied: `supabase/proposed/els-publication-tiers-20261126/{apply,rollback,optional-data-fix-one-row}.sql`. Tests: `test/els-publication-tiers.test.mjs` (static contract + isolated PostgreSQL proof via `scripts/run-els-publication-tiers-sql-test.sh`). Wiring the detector into a scheduler is a separate approval.

Addendum notes (26.11.2026): rollback keeps the hardened read policy (it never reopens the leak); withdrawing, cancelling, approving or declining closes the matching open item in the existing suggestions queue; strong-cipher ranking is a **preliminary metric** (`metric: preliminary`), and consent (the owner's own page publication), not text screening, is what makes a cipher a candidate. No ChatGPT-specific approval channel exists for ciphers and none was added; approval is `moderate_els_matrix` by an authorized administrator identity. Safe release order: SQL → client + worker → verification → (separate approval) detector scheduling; never the client before the SQL.
