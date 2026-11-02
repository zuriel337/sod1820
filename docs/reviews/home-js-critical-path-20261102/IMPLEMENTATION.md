# Home opening JavaScript — bounded implementation

Task `PUBLIC_HOME_JS_CRITICAL_PATH_20261102`; product base
`0d4ad83644a74abe5d990f7a628dd955fd0c638a`, verified local/remote. Central BEFORE
`492a01c5-65d5-4f84-8fbf-d0f65d438689`; browser evidence
`151e786a-c442-4e66-966d-6f973188ccd4`. The existing product branch is retained.

## Evidence before changes

The prior ~580→579 KB measurement summed JavaScript requests **started** before
useful primary DOM, including preparation for a different page. It was not the
static Home dependency closure, completed download bytes or CPU duration.

The exact-base instrumented mobile diagnostic found primary Posts complete at
3.829s while Home still awaited its static dependencies: numberTierSignals chunk
4.216s and shared Shell 4.335s. Shell DOM appeared4.826s; useful primary DOM5.216s.
This diagnostic had profiling overhead and is not a matched latency sample.
Font-load waits were about6ms, not the explanation for the entire opening delay.
Post preparation began4.457s as a separate asynchronous dependency wave. A sampled
profile included substantial idle/network time, so CPU duration cannot be equated
with total elapsed time. The original historical stuck entry remains unproven.

## Changes

1. App's existing non-reading visit effect imports its existing visit owner only
   inside the admitted branch. The public-reading release no longer downloads the
   traffic/calendar module merely to skip the operation.
2. Home summary/World projection code follows its existing approach admission.
   The calendar and World helpers are not prerequisites for the primary Home code.
   Unmount/abort during the import cannot start the delayed read.
3. The four-topic Explorer read starts in its existing effect, after primary Home
   can mount. River's entity-hub adapter loads in its existing approach-mounted
   effect. Both static pins had to be removed; the canonical readers are unchanged.
4. The contextual rail stays mounted. Its post-only admin projector code loads
   only for a resolved admin on a Post. The original inner checks and RLS readers
   stay in place; guest/context navigation do not import this optional layer.

The first Post's existing preparation remains enabled before a click. No content,
CSS/animation, series identity, route, return state, shared feed, API allowlist,
feature flag, model or product data changes. No new cache or feature registry.

## Verification state at source checkpoint

- 24 focused tests pass, including two new behavioral cases for optional code
  admission, identity loss, unmount before module arrival, source failure and retry.
- Full Legacy+2029 build passes; built isolation, canonical wiring, Home pulse,
  Legacy lock and `git diff --check` pass.
- The first run of the new test fixtures accidentally stubbed their entrypoint;
  both assertions failed. Fixture routing was corrected to keep the real component;
  no product assertion or threshold was relaxed. Logs are retained separately.
- Same-configuration local builds are captured by `capture-preview-graph.mjs`.
  Measurements must use final `writeBundle` output, not intermediate
  `generateBundle` data before Vite finalizes chunks. Early diagnostic captures
  are excluded. Hosted bytes/timings remain the browser evidence owner's result.
- Exact protected candidate browser comparison and final regression/transition
  acceptance are pending at this checkpoint. No speed improvement is accepted
  merely from an import or byte count.

## Separate transition gates

Existing exact-base A3/Isolation/G4 evidence is retained. The protected hosted
Production-artifact review has its own bounded proposal and implementation lane;
Production activation remains dormant. Real dated DB/media recovery still requires
secure backup access and an explicitly approved isolated destination. Neither a
synthetic A3 restore nor a site deployment rollback proves actual data recovery.
