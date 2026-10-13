# ELS F3/F4 privacy repair

Bounded continuation of coordinator receipt `165cfc12-a4bd-4e90-8d90-e6717455d079`
and audits `a83b0b77` / `fa9234fc`. Base: integrated PR #1020 at
`34133a4e1c55e3f05a525decd4f18ce110ab423b`, preserving ELS #965 `b8925353`
and the complete design package `6494eb8a`. Operational claim: `69cc756a`.

## Changes

- F3 successor migration `20261010231453`: public deduplication selects only
  public or explicitly submitted (`self_published`) records. Own/admin/foreign
  unsubmitted private drafts remain untouched. Submitted pending records still
  reuse their identity. Private upserts, function signature, ACLs, RLS and
  canonical publication replay gates remain unchanged; no data repair.
- F4: Classic resolves opened/native-saved context and explicit edit targets
  before public image upload. Missing/inaccessible/unknown targets fail closed.
  Non-public contexts never upload card/grid images. Failed private updates do
  not become public/anonymous copies. A changed axis under private context
  remains private. Switching from private context to a different edit target
  is rejected so private metadata cannot be copied into a public record.
- Preserve permitted public heuristic derivative saves by members/guests and
  existing owner/admin update checks. Recheck account/axis after asynchronous
  metadata reads. Classic private draft success now says it was not submitted
  for publication.

The canonical template/generated HTML have only the same one-line draft-status
message change. Search, verification, corpus, matrix colors, palette, controls,
dock and library design are otherwise unchanged.

## Verification and review

`test/els-public-save-private-isolation.sql` covers S1/S2, full private-row
snapshots, admin own drafts, NULL/default public inputs and historical NULL
submission provenance, permitted pending/public reuse, publication replay,
member/anonymous reads and foreign ownership. The existing SQL privacy suite
continues to run. Both migrations and both suites are wired into the existing
executable PostgreSQL CI test; migration/SQL changes also trigger that gate.

Browser tests exercise the actual Native and Classic engine/host path with
isolated Auth/RPC/Storage adapters. Cases include own private update, native
save followed by Classic with no route record, unknown/foreign targets, failed
read/update, account change during a read, private-to-public target confusion,
changed-axis private save, permitted public upload/update and member/guest
pending variants. The final dialog action is dispatched directly, consistent
with this fixture's other actions; this is not a physical pointer/clickability
certification for Classic overlays.

Before/after evidence: S1 fails on the prior SQL definition; the F4 target test
records **two public uploads** on the prior host and **zero** with this repair.
Focused repaired browser tests pass. Final exact-commit full-suite/build/review
receipts accompany the delivery artifact and operational AFTER.

An independent GPT read-only challenge found public-derivative compatibility
and private-context-to-other-target risks; both were fixed and covered by
regressions. This does not impersonate or replace the requested existing Claude
review. Its final-SHA disposition must be recorded separately.

## Release state and remaining boundaries

Branch-only delivery for PR #1020. **No merge, deployment, live migration,
live product-data write or permission expansion is authorized.** Do not push a
branch if that would auto-deploy. The portable bundle may be imported into the
existing integration branch when its owner is ready; apply nothing live here.

F3 remains present in the live database until a separately authorized release
applies the successor migration. Existing public objects/URLs are not removed
or made private by this forward-only fix. No authenticated live save has been
performed. SQL storage/persistence tests are isolated, and browser RPC/Storage
calls are test adapters; their results are not a cloud-save certification.

Final acceptance still requires the existing Claude review of the delivered
exact SHA, covering repaired F1/F2/completeness and F3/F4 using previous evidence.
Other PR #1020 dependencies (Frame/World return reconciliation, broader modal/
naming review and M3 provenance) are unchanged. Library statistics, explicit
update/copy product controls and advanced ELS work remain outside this repair.
