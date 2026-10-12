# World shared exact-return / unknown-number repair

User continuation: work_log c0622d67-b503-4801-bb87-f20c220deb15.
Actor GPT, existing task SOD2029_CHROME_NAV_REFINEMENT_V1.
Scope reconciliation ACK 075da0e1-43a2-4c7e-a810-20df0008862e explicitly releases /
supersedes old shared-file reservation d8b48306 under the user's instruction,
then claims a single bounded successor. No parallel header/rail redesign.

## Baseline and scope

Exact World head 1fa4b6976c2951b23d61fe1bf04ee5abe6997f68 recovered from the
verified draft-release bundle chain. Dependencies: remote PR1014/1015,
adf67448, b442bd66, ec02509f, c06e17ec. Main remained8e939d3b.
Independent Crown6494eb8a branch preserved, not mixed into this repair.
Working branch codex/world-return-repair-20261010.

Three product files only: SystemFrame2029 returnExact consumer,
SurfaceContextRail2029 numeric admission, existing researchContext.js normalization
and exact-return patch. Provider, Path/SQL, Number, World, ELS, source records,
canonical calculations and publication rules unchanged. No new store/history.

## Behavior

The original complete World route was replayed before fixing: source image ->
Number424 -> explicit Start -> actual shared Number arrow -> World. The source
returned but context.journey became null, reproducing the reported failure.

Return now uses a functional context update to read the current runtime at the
moment of return. Source subject/selection/lens/viewport come from returnTo;
active Research Path identity/revision/pending steps and its journey dimensions
come from live Context. This includes a Path created after departure and a
replacement/fork. Return does not rewind the latest committed/pending choice or
implicitly resume a captured Path. Explicit null or inactive Path is not
resurrected. Non-Research-Path return snapshots retain their prior semantics.
Destination-only dimensions are still replaced, returnTo still cleared.

Absent, whitespace, nonnumeric and boolean source values are not numeric0.
The same admission helper is used by the context focus/selection normalizer and
shared rail, including method-context detection. Actual0 and numeric string0
remain valid. No fake source entity or calculation is introduced.

## Verification and replay

50 focused Node tests (new exact-return/numeric cases, existing Path continuity,
source return and Research Sync runtime) passed. Frame acceptance, Path runtime,
2029 isolation and both builds passed. Pre-fix failure and first post-fix passes
at1440/390 captured under /workspace/artifacts/world-return-repair-20261010.

The existing complete World script accepts WORLD_JOURNEY_RETURN=frame to exercise
the previously broken Number arrow; default source-step route remains available.
Both exercise actual public source+canonical calculation, explicit Start, exact
source identity/viewport/reload, denied guest save and unavailable-source/retry.
Frame mode additionally exercises persisted synthetic guest Context revisions
and explicit cancellation through the real Provider and return control. These
fixtures do NOT claim cloud save, authentication or revision RPC verification.
No live writes are allowed; positive source/calculation reads stay live.

Replay on local Vite:

```
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs LOCAL_VITE=1 \
WORLD_JOURNEY_BASE=http://127.0.0.1:4187 WORLD_JOURNEY_RETURN=frame \
WORLD_JOURNEY_ARTIFACTS=/absolute/path/to/evidence \
node scripts/test-world-complete-journey.mjs
```

Final extended browser replay passed on commit
1482fe8986378b4f82a9f3de0060b7b022e581f2 at both 1440 and 390 pixels:

- Shared Frame arrow: new Path, updated Path and explicitly cancelled Path;
  exact source/viewport restored and checked after reload (six return cases).
- Existing source-step return: complete route at both widths (two cases).
- Both receipts contain no browser errors or failures. Guest save is denied;
  source-unavailable/retry is checked. Source rail has no invented "open 0".

Receipts: final-frame/receipt.json and final-source-step/receipt.json in the
delivery package. Additional actual-Provider tests passed (10), and the pinned
context rail suite passed (8). The rail suite had a stale assertion for a trace
renderer already absent in the recovered baseline; only that expectation was
updated. The final follow-up commit changes tests and this document only;
production source is identical to the browser-tested commit above.

The scoped ACK 075da0e1 is released by the final work_log AFTER. Its release
also closes the explicitly superseded d8b48306 reservation; it does not release
any other owner's claim. Current World consumer db1d56a1 may import this exact
delivery; receipt/activation is not assumed. No deployment, main merge/push or
remote product-data writes. Existing public Path reader, publication and
unrelated Source/Posts/ELS/Chrome design dependencies remain unchanged.
