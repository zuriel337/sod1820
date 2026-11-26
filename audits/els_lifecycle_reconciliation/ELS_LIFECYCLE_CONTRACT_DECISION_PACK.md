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

## ADDENDUM 2026-11-26 — private always guarantees privacy (ZURIEL recommendation; proposal, not applied)

Status: recommendation by ZURIEL, with the exact SQL and tests prepared on branch `claude/biblical-cipher-audit-zspg77`; **not applied to the database and not yet Human-Gate approved.**

FACT (read-only, live 26.11.2026): the pack's section C (`self_published=true` exposes a row publicly "under the existing legacy behavior") is implemented by the RLS policy `public_read_self_published_els USING (self_published = true)`, which does **not** look at `visibility`. One private draft (`אליהו`, `status=draft, visibility=private, self_published=true`) is readable by an anonymous reader. The 116 public ciphers are `status=published AND visibility=public` (103 of them also carry the flag); no row is `hidden`+flag, so no existing public cipher depends on the flag alone.

Amended rules (they refine A–C, nothing else changes):
1. `visibility='private'` is readable only by its owner and administrators. No flag overrides it.
2. `self_published` stays the owner's public-file projection flag, readable only together with `visibility='public'`.
3. "Show in the public file" (`self_publish_matrix`, the existing action; no second publication mechanism) is an explicit publication: it passes the same canonical replay gate as a public save, moves the access state (`visibility → public`), turns a `draft` into `pending` (awaiting moderation) and never sets `published`. Withdrawal returns an owner-published record to `private`/`draft`.
4. An approved public cipher (`published` + `public`) keeps its library access when the owner clears the flag.
5. Nothing here is a canonical finding, a `decision_ledger` entry or a Human-Gate decision (section D–E unchanged).
6. Withheld (`hidden`) and archived records are not republished by their owner.

Prepared, not applied: `supabase/proposed/els-private-guarantee-20261126/{apply,rollback,optional-data-fix-one-row}.sql`. Tests: `test/els-private-guarantee.test.mjs` (static contract + isolated PostgreSQL proof via `scripts/run-els-private-guarantee-sql-test.sh`). Any database change needs a separate exact approval.
