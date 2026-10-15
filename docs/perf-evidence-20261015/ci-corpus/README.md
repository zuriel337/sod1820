# PR1111: current public-body admission (revision 3)

Current revision `public-body-admission-v3` contains 172 navigation contracts
and 171 performance/browser contracts. All previous 161 navigation response
objects remain unchanged. The complete public Post5116 body is now checked by
exact source identity and content SHA under explicit user approval, with
negative truncation/change/padding/identity tests. Speed thresholds and seven
samples are unchanged.

Current evidence and exact remaining input requirements are in
[`admission-v3/README.md`](admission-v3/README.md). Source-index SHA256:
`a5e119cc6a2afc238933974bade80e045c3329dcdb64a46dd90e5d7228fc7981`.
35 focused tests, source/A3/measurement suites, 16 image cases, catalog content
parity, and the independent seven-plus-seven Post-only comparison pass.
All three full entrypoints were invoked and remain FAIL on explicitly identified
retainable source gaps. Full performance measurements have **not** completed.
This is a new offline experiment with no historical/live parity claim.

The receipts below are historical v2/v1 results and hashes, superseded by v3.
Their old blocker descriptions do not assert the current source-review state.

# Historical revision 2: public-card continuation

The user approved the exact seven-field public-card proposal. The same branch
continues from `8ce0ecc9bf1733b75ecf96ff749a7a15d05178e7`; PR1111 still targets
the measurement branch at `8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`.

Current frozen revision `public-card-approval-v2` contains 161 navigation
contracts and 160 performance/browser contracts. All previous 155 navigation
responses are byte-for-byte unchanged. Six contracts were added: the approved
four/three profile sets, an exact-count gallery request, two approved public
contributions, 48 reviewed public Post metadata rows and a proven zero-row anon
research-object request. Equivalent gallery payloads preserve their full bytes
while the headerless runner retains the newly known exact count.

| Current file | SHA256 |
| --- | --- |
| performance.json.gz / browser.json.gz | `bd79ce9742c4931965b59d866114f60a479a2c49b70f56a6456058b9020d544e` |
| navigation.json.gz | `9f8f9e4f06b751e917bc98ef994c69fecfcb018de980b01b84760a0af537a9a7` |
| source-index.json | `0caa609cef9fc535d51ec83cd47a3ea1091109443977959acf617ac66af249fb` |
| source/public-profile-cards.json | `b3ed1c3e730bec298ac6c5dfa38d97af8acf6ab6b1cab030b08609135c04cc7c` |

Current evidence, source/privacy receipts, results and exact blockers are in
[`card-approval-v2/README.md`](card-approval-v2/README.md). The profile gap below
is now resolved within that narrow DTO approval. Full three-gate acceptance
remains FAIL at the unchanged body preflight, with zero eligible matched samples.
Home contribution attribution and the private-inclusive World group source also
remain unresolved; missing responses are never filled with empty substitutes.

The following is the historical v1 receipt at `8ce0ecc9`, preserved with its
original hashes/results. It does not describe the current fixture revision.

## Historical v1: incomplete acceptance

Continuation of `gpt/perf-ci-isolation-20261015@5e83540b28ddce1489ff299d66cc9688df4368cf`.
The PR target remains `gpt/perf-cold-measurement-20261015@8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`.
The central review was read at handoff branch `f63268a36243eecb249a945ae46812d1a201c66c`.

**This is a new offline experiment, not recovery of PR1110's missing historical
snapshot, live-data parity, product/surface acceptance, or a performance win.**
The retained package is publishable under the reviewed public projections; it is
explicitly incomplete for full gate acceptance. All three complete gate commands
return **FAIL at the unchanged semantic input preflight**. No seven-sample
before/after comparison, extension scenario, full navigation interaction suite,
or World/Entry suite is represented as executed or accepted.

## Retained input and signatures

`test/fixtures/ci-2029/` now contains the three frozen inputs, manifest, source
index and coverage report. Each input has 155 request contracts. Navigation keeps
`prefer`, `range`, and `accept-profile`. The other runners' headerless conversion
rejects differing payloads; count-only metadata differences are recorded and the
canonical exact total is retained. Raw legacy request-key hints were not treated
as raw wire URLs or decoded twice. Ambiguous hints were not promoted over fresh
observed contracts. No old fixture response bodies were copied.

| File | SHA256 |
| --- | --- |
| performance.json.gz | `b567f59df3349683c8e4a22cc425be8dfa2f592667bf9442ef6c1b55212870e6` |
| navigation.json.gz | `265bdbc1ae14a43f932e87427b2e5806d6ab2b9d5e224a7982b4de07c47bbd8f` |
| browser.json.gz | `b567f59df3349683c8e4a22cc425be8dfa2f592667bf9442ef6c1b55212870e6` |
| source-index.json | `d90904c76d01c020d9202b7fe35b2e841205e9b0a67f70ad1d24df89856610f2` |

Sources were acquired outside CI on 2026-10-15: explicit read-only anon SQL
projections of public content, outputs of audited canonical SQL/math functions,
and exact bytes from reviewed public Storage objects/native renditions and IBM
Plex font assets. This is SQL-derived replay data, not a raw HTTP recording.
The source index fingerprints every retained response body and records source
type, version, date, privacy projection, coverage limits and controlled data.

- All 2,637 canonical Number rows are retained for 98, 1237, 596, 1118, 358, 878,
  1326, 631, 1820, 776, 314 and 122. Each source call was `fn_number_lookup(value)`
  without a reduced row limit; row counts equal canonical `total_count`.
- Thirteen reference expressions retain actual `fn_method_value` results and
  complete parity-verified `gematria_method_trace` steps. Convergence ratings,
  zero-scale outputs and 80 video cards came from their canonical functions.
  No mathematical result, trace, rating, permission or count was invented.
- The source catalog has all 205 approved Topic rows. Required replay pages are
  derived by the real PostgreSQL SELECT/filter/order/offset semantics in PGlite,
  keeping complete requested rows and exact counts. The 2/8/24 contract and full
  23-row continuation are preserved. All consumed source findings are retained.
- Public World source acquisition includes 26 root nodes, nine branch edges and
  ten branch endpoint nodes. Internal metadata is excluded by a presentation
  allowlist. Public node/profile/source identifiers are distinct from accounts.
- There are 37 valid original/rendition images, four font binaries and one CSS
  response. Images were verified with Pillow without UTF8 conversion or resizing.
  The reading original is 213,687 bytes, 1586×992; its native rendition is 53,538
  bytes, 768×480. No image weight was reduced to satisfy a gate.
- The Home scenario uses 21 actual public, non-draft source cards in source
  order. The unfiltered source listing included draft 5113. Its metadata is not
  republished; the explicitly curated public scenario preserves 21 cards and
  full original fields. It is not unfiltered live-list parity.
- HEAD counts come from exact public SQL counts (12,584 / 2 / 0 / 0 at the frozen
  source boundaries), with HEAD's empty wire body and count/range semantics.
  Actual empty SELECT results remain empty results with provenance. None are
  replacements for unavailable required responses.

## Privacy and source admission

The user's approval covers technical public `wp_id` and verified intended-for-
display authorship. It excludes account IDs, contact details, private dossiers,
internal payloads and drafts. It does not approve Posts/Topics screens, names,
content conversion, `/post` migration, product release or deployment.

Full retained Posts 5112/5116 have canonical `authors IS NULL`, independently
checked before packaging. No whole authors object was exported. Two hundred
source Topic rows have independently admitted public display bylines; five
unverified byline properties are omitted, preserving approved content/row volume.
No account-valued `created_by` is exported. The privacy projection excludes
account/contact columns, dossier objects, operational engine/verification run
identifiers and unreviewed internal metadata. No private raw payload source is
committed. `corpus-privacy.cjs` runs before packaging and in snapshot preflight.
Its exact public-byline allowlists are recorded in the manifest. Twelve privacy
checks pass, including ten negative cases for accounts, nested private fields,
whole authors objects, unknown bylines, dossiers, contacts and credentials.
Canonical mathematical step `token` values remain intact.

The only controlled synthetic replay scenario is a fresh anonymous visitor in
isolated local storage. The complete unmodified canonical guest preference SQL
function runs in local PGlite. An independent nonempty saved-row control, fresh
visitor NULL, invalid identity and authenticated-caller rejection verify it.
No live visitor preferences are read. Known telemetry executes against the
explicit isolated effect substitute; it never becomes live persistence evidence.

`source-read-audit.json` fingerprints 89 inspected SQL/plpgsql definitions and
the dynamic method-dispatch review. Public bucket metadata was checked. The
Storage public-object/image path was traced through bucket/object SELECTs and
object-store reads/rendering; eight inspected upstream files match pinned commit
`ac6b3e57a0ed33c846192d4480bd492433f32569`. The managed service's deployed binary
was not separately attested; this receipt is an upstream source review, not a
deployed-byte identity claim. No public website navigation, AI, unreviewed RPC,
live capture/fallback, or product DB write was used.

## Executed results

| Component | Local result |
| --- | --- |
| Full hard-source script, including A3 isolated storage, existing egress/UDP cases, PR1110 measurement and build/source suites | PASS; outer audit 0 bytes |
| All 16 mobile image cases on the final frozen input | PASS, Docker network=none; audit 0 bytes |
| Catalog content/count/order/continuation and 2→24 comparison | PASS; both 24-row fingerprints `14f687daab2c86b01ba9011cb9e8c6cc1fd785b16764dda31d020c7103642888` |
| Corpus publication privacy | 12/12 PASS; ten negative cases |
| Byte-identical retained-package reproduction | PASS for all six package files |
| Performance full gate entrypoint | FAIL at unchanged primary-body preflight |
| Navigation full gate entrypoint | FAIL at unchanged primary-body preflight; catalog sub-contract PASS |
| Browser full gate entrypoint | FAIL at missing complete authored Bennett source |

The raw catalog tool emits its legacy `captured-public-functional-parity` label;
here it compares two pagination strategies on this new SQL-derived frozen input.
It is not a fresh live capture or a comparison with historical measurements.
The initial image attempt failed on previously unmapped public broadcast/logo
requests even after the application swallowed the failure. That source was then
audited/acquired and all 16 cases passed on the final frozen package. No failure
was hidden to obtain a pass. Existing assertions and thresholds are unchanged.

Host source checks used native/Node guards and local negative traps. Browser/image
and full gate invocations used a Docker network-none container with only loopback,
all capabilities dropped, no-new-privileges, inherited native/Node guard and
browser routing/DNS/service-worker/WebSocket/beacon protection. Local Node was
24.19.0; CI uses existing `.nvmrc` 24.21.0. The navigation base `0825b326` and worktree head were built offline;
**zero eligible matched samples were measured**.

## Exact remaining input/access gaps

1. `GET /rest/v1/posts?select=*&slug=in.(seventh-to-tenth-sefirot-2027)&limit=1`:
   public Post 5116 / `wp_id=37047`, modified `2026-10-12T13:37:39.862389Z`.
   Its entire current `content` is preserved verbatim: 1,778 characters, 760
   after the existing HTML-removal expression. The unchanged preflight requires
   at least 800. This is a concrete source/contract mismatch, not a missing file.
   It needs an approved exact Golden source meeting that contract, or a separate
   explicit decision about the coverage contract. This task forbids changing
   assertions; no text was padded, spliced or replaced.
2. `GET /rest/v1/posts?select=*&slug=in.(bennett-melach-631-78)&limit=1`:
   Post 5113 has tag `טיוטה` (also Golden tags), outside approval. Its body was
   not read/exported. Entry needs its exact authored body with the saved
   `נפתלי בנט = 631` focus. Canonical 631 math/trace exists; it cannot replace
   that body. Access needed: an approved retainable published exact Golden source
   or an existing explicitly approved restricted artifact. No draft disclosure
   or fabricated short builder is proposed.
3. Two World contributor requests: the four curated slugs and the active/trusted
   non-external set. Exact DTO and admission counts are in
   `public-profile-read-proposal.md`. Automatic review rejected export because
   only 2/4 and 2/3 have explicit public visibility. The separate text approval
   question remains pending. No restricted profile, alias or dossier object is
   exported and no empty stand-in is served.

These gaps block complete seven-sample performance/navigation, extension and
World/Entry acceptance. Runtime request auditing remains mandatory after they
are resolved; the minimum preflight does not certify all deferred contracts.
The product trace-finish defect remains separate and unchanged. Live A3 service
acceptance remains NOT_RUN.

## Reproduce the retained package

No original scratch file, credential or live source is needed to read or
reproduce these retained inputs:

```sh
mkdir -p work/corpus-repack
gzip -dc test/fixtures/ci-2029/navigation.json.gz > work/corpus-repack/responses.json
node scripts/ci-isolation/package-corpus.mjs work/corpus-repack/responses.json test/fixtures/ci-2029/source-index.json work/corpus-repack/result
node --test test/ci-isolation/corpus-privacy.test.mjs
```

`repack-proof.json` records byte-identical reproduction of all six files. The
workflow stages dependencies with lifecycle hooks disabled, then tests offline.
`snapshot-sha.mjs performance|navigation|browser` correctly fails on the precise
coverage gaps above. Full gate commands and their nonzero results are preserved
in `local-gates.json` and the three logs. There is no skip/continue-on-error path.

Trigger review covers all 19 workflows: only the updated 2029 gate matches this
stacked target and change set. The PR merge tree supplies its updated definition;
all three checkouts pin the exact PR head. Dependency setup is separate, install
hooks disabled, repository execution inside loopback-only namespaces. Existing
`gpt/*` Vercel deployment disablement is unchanged. No old run was rerun.
Exact new-head remote results are recorded in PR1111's current description and
linked Actions run after the safe push; local results are not a remote PASS.

Passive BEFORE: `9ac4b378-ed6f-44c5-bec3-8b055edb044e`, task
`GPT_PR1111_OFFLINE_CORPUS_20261015`; dispatch NULL. Product source, package lock,
thresholds, UDP implementation, trace-finish, main and integration are unchanged.
No merge, deployment, new storage service, permission change or product DB change.
