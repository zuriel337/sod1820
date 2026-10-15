# World reentry — 15 October 2026

Role/task: `GPT_PERF_WORLD_REENTRY_20261015`. Personal branch:
`gpt/perf-world-reentry-20261015`. Base:
`5c147e4a2db97ac035227f7c6d15787849f61f6e`, verified against the remote candidate
ref through GitHub and fetched before work. Read current-main AGENTS/CLAUDE/Owner
Index at `503b52ef169b6e51f967187491398d153090aa45`, live coordination law v17,
plan `11b44e87-e2bf-4928-aa55-10410b2ed475`, and the exact consolidation handoff.
BEFORE: `3a24ec55-bc64-4c90-b58c-b5d29e045666`, passive TO=ZURIEL, no dispatch.

## Import/mount decision: retain current implementation

The current split **does delay the first World→Topic interaction in this replay**.
This is a new measurement of the exact candidate, independent of the old +19.4%
result. The simple unsplit rollback is **not adopted**: it moves code to initial
World loading and fails the existing enforced bundle gate. No import/mount
product change is delivered by this experiment. No budget or test was relaxed.
The tested rollback is preserved as `unsplit-experiment.patch`, not applied code.

Seven matched pairs, order `AB BA AB BA AB BA AB`, sequential on one browser.
A = exact candidate; B = the same tree with only the two suspect `5de85cfe`
World import/mount boundaries removed. No Home, App, reader, switch, CSS,
global scroll, data, permission, or deployment changes. Source patch, built
manifest hashes, and exact graph sizes are in `provenance.json`.

| Metric | A: split | B: unsplit | B−A paired bootstrap 95% interval |
|---|---:|---:|---:|
| First actual World→Topic click to content | 1570 ms | 1341 ms | −285 to −143 ms |
| Browser Back→World | 589 ms | 616 ms | −55 to +66 ms |
| Forward→Topic | 933 ms | 905 ms | −83 to +46 ms |
| Cold World content ready | 4951 ms | 5012 ms | −218 to +195 ms |
| Cold World LCP | 4960 ms | 5024 ms | −168 to +192 ms |
| Cold CLS, median | 0.03695 | 0.03695 | — |
| Initial JS encoded bytes | 453,514 | 477,325 | +23,811 bytes, every pair |
| World static graph beyond entry, gzip-9 | 259.8 KiB / 37 chunks | 284.7 KiB / 40 chunks | existing limit: 265 KiB / 37 |

B's first click is 14.58% faster; equivalently A is 17.07% slower than B.
Cold readiness/LCP, Back and Forward differences are inconclusive. This does
not prove hosted/production/phone performance or a generally faster site.
The unsplit arm fails the unmodified bundle suite (4/5); A passes 5/5. A targeted
alternative or an owner-approved graph-budget decision remains open centrally;
this lane does not weaken a shared guard or invent another prefetch experiment.

`navigation-summary.json` and `raw/navigation-ab.json.gz` preserve all 14 samples.
The analyzer asserts identical per-pair request/response multisets (including
duplicates/status/body hashes), exact target and ordered content at every step,
trusted clicks, zero fixture misses, zero page errors and zero **unexplained**
read failures. Every full World→Topic→Back→Forward sequence issues 159 API reads,
including 8 identical, explained denials.

## Conditions and existing access limitation

Chromium 151.0.7922.173, Playwright 1.56.1, Node 24.19.0; production Vite builds,
390×844/DPR2/touch/he-IL/Asia-Jerusalem/dark/reduced motion, CPU×4, 1.6Mbps download,
96,000 B/s upload, 150ms RTT, Brotli static assets. New cold browser context per
arm; subsequent click/Back/Forward warm in the same document. API replay has
fixed 150ms delay; other external assets fixed 400ms. No database speed claim.
Guest visitor ID is fixed equally; no authenticated identity was simulated.
Telemetry, auth endpoints and non-allowlisted writes are fulfilled locally and
never sent. Explicit allowlist contains read RPCs only.

One bounded live public capture covered these exact journeys and was frozen
before measurements. Snapshot SHA256:
`db00234ac96c9d9a4e82c03afb9b5197831dacb45e1c9738868c8af5f6d8871a`.
Response bodies remain in the uncommitted local snapshot. Published samples
replace DOM text, source IDs, dynamic topic paths and complete request signatures
with SHA256 values; their manifest carries only hashes/status/count/size. Exact
ordered-content and request equality still verifies on those hashes. No live
content, API request URLs/bodies, private data or credentials are committed.
An initial automatic approval rejection of unredacted measurement artifacts was
resolved by this minimization; both unpublished commits were checked so those
artifacts are absent from the branch history being pushed. The original captures
remain local, and no approval rejection is bypassed through another transport.

Live capture exposed `401 / 42501 permission denied for table research_objects`.
Read-only canonical verification returned
`has_table_privilege('anon', …, 'select') = false` and the same for
`authenticated`. Only this exact known denial is accepted by the recorder;
its real body/status is replayed, never converted to success/empty data. This is
an existing permission limitation in the current public journey, not proof of
successful full research-data acceptance. Readers/grants are outside this task.
Initial diagnostic captures that aborted on the denial are excluded from timing.
Real member/admin sessions and hosted acceptance remain unverified.

## Reproduction

Install dependencies from the unchanged package lock and Playwright 1.56.1 in a
scratch directory. Build A from the exact base and B with only the saved patch,
using `SOD_BUILD_TARGET=2029 vite build --outDir …`. The package lock is identical
in both arms. The preinstalled dependencies lacked `@react-three/fiber`; a full
lockfile install fixed the environment without repository dependency edits.

```sh
PLAYWRIGHT_DIR=/path/to/tools node docs/perf-evidence-20261015/world-reentry/measure.mjs \
  --mode record --a /path/to/build-a --b /path/to/build-b --runs 1 \
  --flows navigation,direct,cross --fixtures /private/snapshot.json.gz --out /scratch/capture.json
PLAYWRIGHT_DIR=/path/to/tools node docs/perf-evidence-20261015/world-reentry/measure.mjs \
  --mode replay --a /path/to/build-a --b /path/to/build-b --runs 7 \
  --flows navigation --fixtures /private/snapshot.json.gz --out /scratch/navigation.json
node docs/perf-evidence-20261015/world-reentry/analyze.mjs \
  /scratch/navigation.json /scratch/summary.json
```

Browser and Node must share localhost access. Capturing again produces a new
live-data snapshot and must not be described as this exact measurement.

Before publishing capture output, run `redact.mjs` on its compressed report. The
committed verifier accepts the minimized samples and never needs response bodies.

## Hash navigation

Implemented and verified in a separate commit after the evidence-only decision
`2e65ff66f2a7590ebf888235240ce6c052569be7`.

`World2029Page` now owns the exact `#world-sources` arrival: it waits for the
existing landing read, scrolls once per router entry, and removes its listeners
on completion, cancellation or navigation. Pending wheel, touch/pointer and
scroll-key input cancels the jump. The sources hash also selects the landing
when an existing numeric research subject is retained; that subject is preserved.
No polling, extra reader, focus mutation, styling, or global restorer was added.
`WorldSourceConnections` is byte-identical to the original base.

Seven further matched A/B pairs use A=exact base and B=only this page-owned hash
fix; the import/mount experiment is not present in B. Same frozen snapshot,
identity and profile. Actual Home link → sources, Back → Home, Forward → sources,
then the real in-page anchor. Before: cross-page and Forward fail **7/7**, scrollY
0 and target top 1207px. After: both pass **7/7**, scrollY 1087 and target top
120px (the existing scroll margin). In-page navigation passes 7/7; all forty
ordered source identities match before/after at every checkpoint. Exactly one
page-owned jump per arrival; no repeated chasing of later updates.

Additional replay checks pass for direct sources hash, a retained numeric
research context, and genuine wheel / touch swipe / PageDown input with public
responses delayed an additional 1500ms. Each user-input case has **zero** late
source-anchor jumps. The numeric context is an explicitly seeded local UI test,
not an authenticated identity or permission claim. A final direct-hash smoke
also runs against the exact final full-build manifest; it matches the manifest
used by the seven browser pairs (`provenance.json`).

`anchor-summary.json`, `raw/anchor-cross-ab.json.gz` and
`raw/anchor-functional.json.gz` preserve the results. Recheck with:

```sh
node docs/perf-evidence-20261015/world-reentry/verify-anchors.mjs \
  docs/perf-evidence-20261015/world-reentry/raw/anchor-cross-ab.json.gz \
  docs/perf-evidence-20261015/world-reentry/raw/anchor-functional.json.gz /scratch/anchor-summary.json
```

No page errors, fixture misses or unexplained read failures. Cross-page request
counts range 204–206 because the visible WatchButtons share in-flight guest
preference reads according to mount timing; no timing claim is made for this
functional experiment. The known research_objects denial remains unchanged.

Final checks PASS: full Legacy+2029 build; existing scroll-restorer tests; World
surface; all five bundle checks; isolation; built graph; route legitimacy;
dedicated request/content parity and anchor verifiers. Raw check output is in
`final-gates.txt` and `final-checks.json`. The final bundle is within the existing
budget; only the archived unsplit experiment intentionally fails it.

State: implemented/tested on personal branch, not merged/deployed/live. Remaining
central blockers: import-boundary/graph-budget decision, existing public reader
denial, hosted acceptance and actual member/admin/physical phone acceptance.
No whole-site scan, shared-branch integration, deployment, product DB, switch,
reader, CSS or general scroll change was performed.
