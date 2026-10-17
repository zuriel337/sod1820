# Number owner CI isolation · 16 October 2026

Task: `GPT_NUMBER_OWNER_CI_ISOLATION_20261016`. Branch:
`gpt/number-owner-ci-isolation-20261016`. Base remote head verified as
`7c3f43f39147c71508ed394363a2f98f140a5859`, including `12905633` and the
pending isolation/trace-finish/media chain. Remote main was
`503b52ef169b6e51f967187491398d153090aa45`; the pending base deliberately
diverges from main (219 ahead / 4 behind), and was preserved without reset,
rebase or merge. Canonical central handoff: `44131909`.

BEFORE: `fd8bbeab-520d-4c95-993a-326238b95c79`, passive GPT → ZURIEL,
dispatch kind/state NULL. Live coordination v17 and the release/work-log owners
were read through the general Supabase connector, using bounded read-only
startup queries. The only relevant new active writer was Claude HomeV3,
explicitly excluding CI. Earlier CI/media ownership was released. The sole DB
writes in this task are the explicitly requested passive BEFORE/AFTER records.

## Change and process boundary

The old Number beforeEach permitted every live GET and broad `fn_`/`gematria_`
RPC prefixes. That route is removed. The spec uses `ci-isolated-test.cjs`, whose
context installs the existing frozen transport before a page is created and
checks the independent audit after context teardown. The dedicated scenario
helper retains exactly the original positive flags. All eight original test
bodies, assertions, timeouts and thresholds are byte-identical to the base;
their combined SHA256 is
`86f6991f1493395da0eee5a4f30f1b542436966df589a68da722685e7948b749`.

| Process / dependency | Boundary before application code |
| --- | --- |
| checkout and dependency setup | Exact PR head; npm lifecycle hooks disabled. Pinned Playwright 1.56.1 installed outside the application dependency tree. Only this setup phase uses the network. |
| four original Node test files and their imported projection/SDK/numeric helpers | `offline.sh` → network namespace → `run.mjs` → inherited native guard and Node preload. |
| isolation regression children: Node, curl, UDP/native probes, Chromium | Same OS boundary; nested independent runners assert expected violations even when their child exits zero. Only explicitly registered local test servers work. |
| both Vite builds, config imports and bundler descendants | Same offline/native/Node boundary. No app build runs in networked setup. |
| Number input preflight | Existing structural/hash/manifest/privacy helpers; Number-specific minimum coverage; source-index bytes hashed too. Missing/corrupt input stops before preview. No World/Entry Bennett-body requirement is imported into this suite. |
| preview process and readiness curl | Existing `preview.mjs` / `serve.mjs`, explicitly bound and registered at 127.0.0.1:4173, plus deterministic cleanup. The existing served-loader handling supports blocked service workers. |
| Playwright controller, browser, workers, early scripts and teardown | Existing launch policy and storage/transport guards, service workers blocked, WebSockets/beacons audited, unknown GET/RPC rejected. No live capture or fallback. |
| depth and flag scenario routes | Original delayed edges, synthetic 503 and open flags remain explicit test substitutes. `route.fallback()` reaches the frozen boundary after the delay; it cannot escape to a live service. |

Existing telemetry substitutes, anonymous protected-read denials and public
storage image/layout substitutes remain unchanged. This is layout/behavior
acceptance, not original-media fidelity. No shared isolation mechanism or other
workflow was changed. Product, Home, Number UI/drawer, media readers, engines,
design, flags, permissions, main and integration were not edited.

Changed files:

- `.github/workflows/number-2029-owner-gate.yml`
- `tests/number-2029-owner.spec.cjs`
- `tests/number-owner-scenario.cjs`
- `scripts/ci-isolation/number-owner.sh`
- `scripts/ci-isolation/number-owner-snapshot.cjs`
- `test/ci-isolation/number-owner.test.mjs`
- `test/ci-isolation/number-owner-probe.mjs`
- this directory's `README.md`, `verification.json`, `missing-input.json`

## Verification and limits

The source entrypoint runs the original 43 Node cases, existing config/egress/
connected-UDP/snapshot regressions plus nine Number-specific cases (60 total
isolation cases), and both builds. The new cases verify unchanged product test
bodies, workflow boundary wiring, separate Number coverage, corpus/source-index
tampering, failure before preview, and the actual Number beforeEach with
unauthorized GET, unknown prefix-RPC, write, and permitted frozen replay controls.

Local verification uses Docker `--network none` (loopback only, no route), Node
24.21.0 matching `.nvmrc`, Playwright 1.56.1 / Chromium 141 build 1194, the existing
native/Node guards, and independent `strace`. See `verification.json` for the
sanitized result. Raw logs, traces and all temporary inputs stay in local work
storage. Intentional negative children must return failure with zero forbidden
target hits even after swallowing the error; allowed controls still succeed.
Chromium's packetless UDP route probes are distinguished from transmitted data.

An exploratory run with system Chromium 155 passed 59/60 isolation cases; its
existing teardown probe did not observe its trigger. The pinned Chromium 141 run
passes that unchanged probe. The supported result uses the pinned browser; no
shared test/assertion was weakened. A preliminary shell run was invalidated by an
in-flight edit and is not an accepted entrypoint result; the final immutable
commit is rerun after committing.

**Product browser acceptance: BLOCKED_INPUT, 0/8 original Number cases executed.**
The private directories are absent here. The available public 171-response corpus
and its source-index hashes verify, but Number preflight rejects seven minimum
coverage gaps listed in `missing-input.json`. This is neither PASS nor evidence
of a product bug. No private family was reacquired or exported. The central
37/48 World/Entry result does not establish any Number-owner acceptance.

Separate Number coverage:

1. Home/menu → full Number 1820 at 320/390/1440, no drawer, overflow/type sizes.
2. Actual zero, absent identity, reload, invalid route distinct from zero.
3. Number 376 + שלום/רגיל deep-link reload, fabricated crossing excluded, noindex.
4. Crossing/regular rail at 320/390/980/1440, optional real-crossing focus/return.
5. Number 1237 revisit/reload/back → Home.
6. Number 376 usable while graph depth stalls; verified crossing, one lookup.
7. Depth 503 leaves loaded core/methods usable and explicitly unavailable depth.
8. Back/forward to an in-flight Number 1820; one lookup and eventual depth ready.

**Remote CI: NOT_RUN.** No PR, workflow dispatch, merge or deployment is authorized
or performed. Branch-only publication follows a fresh review of all workflow
triggers and `vercel.json`; `gpt/*` deployments remain disabled. The final SHA
and final exact-head verification are recorded in the passive AFTER and delivery.

## Central acceptance command

Run in an isolated checkout of the delivered final SHA after dependency-only
setup equivalent to the workflow. Keep the existing restricted corpus local.
Set `PLAYWRIGHT_DIR` to the pinned 1.56.1 tools directory and `PERF_CHROME` to its
Chromium 141 executable. `RUNNER_TEMP` must be a private writable directory.

```bash
set -euo pipefail
# Independent source/build/isolation result, even when private input is absent:
SOD_CI_AUDIT_OUT="$RUNNER_TEMP/number-source.audit" \
  bash scripts/ci-isolation/offline.sh bash scripts/ci-isolation/number-owner.sh source

# Use actual existing paths from the central private manifest, not invented data:
export SOD_CI_SNAPSHOT="$NUMBER_OWNER_EXISTING_BROWSER_SNAPSHOT"
manifest="$NUMBER_OWNER_EXISTING_MANIFEST"
snapshot_sha="$(node scripts/ci-isolation/number-owner-snapshot.cjs "$SOD_CI_SNAPSHOT" "$manifest")"
export SOD_CI_SNAPSHOT_SHA256="$snapshot_sha"
SOD_CI_AUDIT_OUT="$RUNNER_TEMP/number-browser.audit" \
  bash scripts/ci-isolation/offline.sh bash scripts/ci-isolation/number-owner.sh browser "$manifest"
```

The manifest must have the existing `browser` entry contract: exact compressed
SHA256; source reference/date/SHA256/access; explicit approval for this local
location; coverage evidence reference. Source reference must resolve to an
existing local source-index file. `public-reviewed` inputs also pass the existing
public privacy allowlists. Restricted existing artifacts use
`restricted-existing-artifact` and remain local; no raw artifact upload step was
added. Snapshot encoding/request keys use the existing `frozenSnapshot` and
`fixtureKey` contract, with no navigation header-signature suffix.

Expected central handoff signatures (unverified here because files are absent):
browser `b01158bf7a650c8c6b1862fe5bc2f3a3e7fcaf8a82addeff393999a4535cafae`;
source-index `e11fc4af2ca7621060388f8bddaf261d18d0e888b436b37153735fa6e511742c`.
Validate the actual manifest/history; do not relabel newer input as those bytes.

Exact known missing inputs are the two private directories and their existing
snapshot/manifest/source-index history, plus the seven public-corpus minimum gaps
in `missing-input.json`. Number identity reads use
`nodes?select=id,type,label,description,metadata,identity_key,is_active,created_at&type=eq.number&identity_key=eq.N&limit=1`
(label fallback is conditional on a genuine missing identity). Lookup starts with
`fn_number_lookup({p_value:N,p_limit:500,p_after_bid_id:null})`; the existing
unpaged fallback must also be supplied if actually reached. Registry signatures
depend on the returned canonical method keys; שלום uses
`fn_method_profile({p_phrase:'שלום',p_depth:'value'})` and its registry query.

This minimum is deliberately not claimed exhaustive for an absent corpus.
Number graph nodes/edges, anchor profiles, method registries, media, public
surface/dossier/journey/neighbors, Home entry data and any real crossing target
must retain their actual request identities/results. At runtime any additional
missing signature fails the audit; preserve the failure, complete only approved
input locally, and rerun all eight unchanged cases. Never substitute empty data,
collect the private families again, or remove a product expectation.

Release advice: `BLOCKED_BY(central Number browser input/acceptance and explicit
integration decision)`. Own scope is released in passive AFTER to ZURIEL; no
other writer's ownership is changed.
