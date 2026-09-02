# expression-extract — Git ↔ Live Parity Closure (2.9.2026)

## Problem

`expression-extract` (the channel-agnostic Shared Expression Extraction Edge boundary,
`docs/shared-expression-extraction-v1-contract.md`) was first deployed by manually assembling a
`files` payload for the Supabase deploy API: hand-editing `index.ts`'s import paths from the
repo-correct `../../../src/lib/...` to a sandbox-correct `./src/lib/...`, and hand-trimming
`triage.js`/`analysisFlow.js`/`gematria.js`/`theme.js` down to only the code paths reachable from
this one Edge function, to keep the manual payload small enough to assemble reliably.

That closed the immediate deploy (verified live, all 5 regression cases pass, JWT gate enforced),
but left `git ≠ deploy source ≠ live source`: the committed `supabase/functions/expression-extract/
index.ts` could not, by itself, reproduce what was actually running, and the trimmed library copies
were a second, hand-maintained fork of logic that also lives in `src/lib/*.js` for the browser
bundle — exactly the drift this closure exists to remove.

## Root cause

The Supabase Edge deploy sandbox mounts the function's entrypoint at approximately
`/tmp/user_fn_<id>_<n>/source/index.ts` — one directory level deep. `index.ts`'s real repo position
is `supabase/functions/expression-extract/index.ts`, three levels above `src/lib/`. Its authored,
correct-for-disk import `../../../src/lib/triage.js` therefore resolves, inside the deploy sandbox,
to a path outside the uploaded file set entirely (`file:///src/lib/triage.js` — three `../` from
`source/` pops past the sandbox's virtual root), which 404s at bundle time. Confirmed empirically:
uploading a file literally named `src/lib/triage.js` and having `index.ts` import it via `./src/lib/
triage.js` (not `../../../`) resolves correctly.

## Fix

`scripts/package-expression-extract.mjs` bundles `supabase/functions/expression-extract/index.ts`
with **esbuild** (`bundle: true, platform: "neutral", format: "esm"`), resolving every relative
import against the real repository file tree — `src/lib/triage.js`, `src/lib/analysisFlow.js`,
`src/lib/gematria.js`, `src/theme.js`, read **unmodified**, byte-identical to what the browser
bundle imports — and producing a single self-contained output with **zero remaining relative
imports**. There is nothing left for any deploy sandbox to resolve, at any mount depth. This is a
structural fix, not a guessed path depth: it cannot regress the next time Supabase changes its
sandbox layout, because there is no sandbox-relative path left in the artifact at all.

`index.ts`'s own committed imports are untouched — still the real, repo-correct
`../../../src/lib/...` paths. Packaging never edits source; it only reads it.

## One extraction logic, not a fork

The bundler input is the exact same four files (`src/theme.js`, `src/lib/gematria.js`,
`src/lib/analysisFlow.js`, `src/lib/triage.js`) that the website's own client bundle imports — there
is no second, hand-maintained copy anywhere. The generated manifest
(`supabase/functions/expression-extract/.build/manifest.json`, gitignored, regenerated on demand)
records the exact git blob hash of each input file and the git HEAD commit the bundle was produced
from, so any bundle can be checked against the exact committed source it claims to come from.

## Running it

```sh
npm run package:expression-extract
```

Writes:
- `supabase/functions/expression-extract/.build/index.ts` — the deploy-ready bundle.
- `supabase/functions/expression-extract/.build/manifest.json` — `{name, entrypoint_path,
  verify_jwt, generated_from: {entry, canonical_sources, bundler, git_head, source_git_blobs,
  bundle_sha256, generated_at}, files: [{name: "index.ts", content}]}`, ready to hand unmodified to
  a deploy call.

The script performs no deploy call and reads no secret. Deploying the manifest's `files` payload
(with `verify_jwt: true`) is a separate, explicit, Human-Gated step.

## Verification

`test/expression-extract-bundle-parity.test.mjs` stubs `Deno.serve`, imports the **actual packaged
bundle** (not a mirror of the source logic), and runs it against the 5 canonical regression cases
plus the method-not-allowed path and a hardcoded-secret grep — proof against the real deployable
artifact, not just against the source files independently.

## What this closure is not

Not an extraction redesign — `src/lib/triage.js`/`analysisFlow.js`/`gematria.js` are untouched.
Not new Research Core work, not Raziel wiring, not a Number Page change, not a new engine or
contract. Byte-identical deploy hashes across separate deploy runs are **not** required or claimed
(Supabase's own packaging step may add its own metadata); what is required and proven is that the
*source* feeding every deploy is the same committed, traceable, single-copy canonical code.
