# Protected artifact: verified platform configuration replacement

Source examined remotely: `25709d70b9c9945078e88ae14fd1363ba2e211b3` on
`gpt/2029-doc37-unified-alignment-20261102`. This is a build-admission correction
under BEFORE `fa893a43-c29a-4710-92d9-0116a8dbdd2c`; it does not change the Home
application, the Legacy root configuration, shared settings, or Production admission.

## Evidence and failed attempts

| Deployment | Observation | Meaning |
|---|---|---|
| `dpl_8rFaFLXvWuZhHaNvuXhT6AxX8AWk` | `public_reading_protected_review_identity_rejected` before the application build | Hosted acceptance failed; no successful artifact claimed. |
| `dpl_9g3nwQZQE1GWqtixe4wE1NZJ1tPq` | Six whitelisted nonsecret platform fields matched Preview, project, deployment ID and unique hostname | Missing platform environment was not the cause. |
| `dpl_Dzu2U3UtSyowMEuLt5sqwsiNjAjN` | Branch, platform SHA and Git HEAD matched; only ` M ../vercel.json` appeared | The raw tracked worktree was dirty. |
| `dpl_Cm69FAJ3owMiDaDu2uCVkeRT4s3f` | Root configuration replaced by a serialized selected nested configuration | Not just formatting of the Legacy configuration. The long diff line was truncated, so this alone did not prove complete equality. |
| `dpl_AZRzVJqwT8TRQFmy56W2rq3pQCXb` | Sole unstaged root config and `equal true` against `git show HEAD:public-reading-deploy/vercel.json` | Complete JSON equality verified, including array order. This diagnostic deliberately exited 1; it was not a deployment acceptance run. |

The decisive comparison used `node:util.isDeepStrictEqual` on both complete parsed
JSON values, not a prefix, a selected key list, or the mutable nested worktree file.
Its sanitized receipt is [validation/platform-config-diagnostic.json](validation/platform-config-diagnostic.json).
It establishes the exact cause of these artifact-build rejections, not a cause for
the older Home cold-entry incident. It did not check file modes or hosted routing.

## Narrow implementation

Only three source/test paths change: `public-reading-deploy/review-admission.js`,
`scripts/build-public-reading-production.mjs`, and
`test/public-reading-protected-review.test.mjs`.

The explicit protected-review builder may attest to exactly this replacement when
all existing project, branch, target, deployment, host and SHA predicates still pass:

1. The requested source pin equals actual Git HEAD and the platform's commit SHA.
2. NUL-delimited Git porcelain contains exactly one unstaged `vercel.json` entry.
   No staged, second-file, nested-config, deleted, renamed or type-change entry passes.
3. Git's raw diff, with external diff helpers and text conversion disabled, contains
   only that path and keeps regular mode `100644` on both sides. Executable or symlink
   changes fail, including chmod changes that porcelain would also display as ` M`.
4. The complete root JSON equals the nested configuration read from the pinned Git
   object. Object key ordering and whitespace may differ; every key, value and array
   position must match. Invalid or non-object configurations fail.
5. The generated runtime receipt retains the exact deployment identity. Production,
   canonical/foreign hosts, other SHAs, other deployments, missing identity and
   environment-only activation remain rejected.

Nothing resets, copies over, ignores or changes the root file. No environment value
is altered. The default dormant build remains dormant; this exception exists only
for explicit protected Preview review. The generic dirty-source identity check
continues to reject dirty input.

The artifact reports **raw `sourceDirty:true`** for the observed hosted worktree,
separately reports `applicationSourceDirty:false` only after this precise exception
is verified, and records the materialization kind, paths, modes, raw Git diff and
SHA-256 hashes of both configuration byte streams. It does not call the full Git
worktree clean and does not embed configuration contents or secrets in the receipt.

## Validation and rollback

After the main performance window was explicitly released, the reviewed source was
committed as `93564ec0a14c462879730e27071c1c38af9ac6f5` and validated locally:

| Check on exact93564ec0 | Result |
|---|---|
| Default dormant application build | PASS; Vite reported1.62s; existing chunk-size warning retained |
| Protected-review, artifact, release, SEO, old-URL and World-OG tests | 59 PASS;0 failed, skipped or cancelled |
| Existing Chromium/actual SW lifecycle test | 1 PASS;0 failed, skipped or cancelled |
| Full-change `git diff --check` | PASS after normalizing blank context lines in the stored proposal patch |
| Three changed source/test paths, added-line secret pattern check |0 matches; bounded patterns, not an exhaustive secret proof |
| Legacy root config, App.jsx, Legacy lock, existing Legacy SW and artifact SW transport | Unchanged by this delta |

The local default artifact correctly records `sourceDirty:false`,
`applicationSourceDirty:false`, `platformConfigMaterialization:null`,
`protectedReview:null` and `productionReady:false`: this was a clean, ordinary
local build. It is not the future hosted artifact receipt. Actual hosted receipt
must report `sourceDirty:true` when Vercel replaces root configuration, alongside
the separate attestation; no hosted success is inferred from the fixture tests.

Commands:

```sh
node scripts/build-public-reading-production.mjs
node --test test/public-reading-protected-review.test.mjs test/public-reading-production-artifact.test.mjs test/public-reading-release-2029.test.mjs test/public-launch-seo-gates.test.mjs test/public-post-reading-boundary.test.mjs test/world-finding-share-og-2029.test.mjs
node --test test/public-reading-production-artifact.browser.mjs
git diff --check 42e26cbb5c58a3c48ec3742b6b0dc543b0157e3b
```

The receipt and full focused test outputs are preserved in
`validation/materialization-artifact-receipt.json`,
`validation/materialization-unit-and-regression.log` and
`validation/materialization-local-worker-browser.log`. Test/build durations are
not measurements of Home load time. The proposal patch is stored without context
lines; `git apply --check --reverse --unidiff-zero` verifies it against this source.

The focused tests cover full-value changes, redirect order/destination, added keys,
changed cache headers, malformed JSON, extra/staged/nested files, mode/type changes,
wrong pins and Production. The SW check uses loopback fixtures with outbound denial;
it does not submit live service requests or restore data. Synthetic platform values
were used only in isolated tests, never the actual build. Root next deploys the
new exact integrated SHA only as a protected Preview and checks the actual emitted
receipt, private access boundary, canonical/noindex behavior, routes and SW. If any
predicate still fails, retain that failure rather than relaxing the gate.

Rollback is a normal reversal of this isolated three-file change and another
protected review attempt if useful. The ordinary product Preview remains usable.
No canonical domain, Legacy deployment, database, private backup or shared setting
is changed by this patch or its rollback. Actual DB/media restore remains a separate
gate; the accepted A3 run is not a backup restore.
