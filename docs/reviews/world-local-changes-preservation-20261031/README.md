# World local changes — preservation only, 31.10.2026

Status: **BACKUP_UNACCEPTED_NOT_INTEGRATED**. This branch is an off-environment
backup, not a proposal to merge, a tested release or an adopted World design.

The single preservation commit has the exact original base as its only parent:
`ff23ae685dcae824c4cdb45830fc1578820bcf1d`.
Its eight tracked code/test files preserve the original dirty bytes at their
original paths. The task-only untracked browser JSON is copied under `evidence/`.
`manifest.json` records both base/snapshot Git blob IDs, SHA-256, modes, paths,
source index/status fingerprints and the authorized coordination BEFORE.
`changes.patch` is a full-index binary-capable patch for exactly the eight files.
No environment, credentials, node_modules or unrelated work folder is added.

## Identification and recovery

Remote: `https://github.com/zuriel337/sod1820.git`
Branch: `gpt/2029-world-local-changes-preservation-20261031`

Use a fresh isolated clone. Fetch this branch and compare its full SHA with the
final ZURIEL handoff / work_log AFTER. Its only parent must be the base above.
Then run, from the clone, without touching the original workspace:

```bash
python3 docs/reviews/world-local-changes-preservation-20261031/verify.py
```

The verifier checks the manifest, both base/snapshot byte hashes and file modes,
the exact changed-path allowlist, the patch hash and an independent base+patch
reconstruction in a temporary directory. It does not execute the product.
The backup commit itself restores all eight files directly. Alternatively, start
a **new** isolated checkout at the exact base, run `git apply --check` on
`changes.patch`, and apply the patch there; compare all eight SHA-256 hashes with
the manifest. The separate browser JSON is restored by its source/stored mapping.
Do not apply this patch to the unified base or reset an existing writer's tree.

## What the unaccepted changes do

- Five World components reduce internal/debug copy, raw source/edge identifiers
  and JSON trace displays. The multi-value shelf is simplified/reordered.
- `zviMultiValueWorldProjection.js` adds public approved/canonical filtering and
  conditionally exposes missing-target values for a canonical promoted record.
  This is a runtime behavior change, not just copy editing.
- Two test files change a source assertion and add assertions against public
  internal identifiers. The historical JSON has 13 cases and no listed errors,
  but no source SHA or run identity; it is not acceptance of this snapshot.

Before any future integration, compare against the latest World/unified files,
retain provenance in appropriate details, check visibility/engine/target rules,
test negative fixtures and exact return, and resolve the current writer scope.
No full product tests/build/browser are claimed by this preservation operation.
The secret/scope scan and its limits are in `secret-scope-review.json`.
