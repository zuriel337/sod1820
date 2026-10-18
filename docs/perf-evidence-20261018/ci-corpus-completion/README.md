# 2029 isolated CI corpus: bounded public completion

Date: 2026-10-18 UTC. Baseline and product head:
`gpt/perf-unified-candidate-20261018@8f78c0c7ced835849a816a815abf05a7247ceead`.
This branch changes fixtures and evidence only. It does not change product code,
database objects, RLS, flags, deployments, Production, Legacy or `work_log`.

## Coordination and base

The exact remote baseline was reverified before publication. PR #1110 remains an
open draft at `8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`; PR #1111 remains an
open draft at `778400b60b7eb6ea230a3ab123c149c7ad8e8e72`. Both heads are
ancestors of the baseline, so neither was merged again. The live coordination
rule and v17 reporting overlay, current ownership rows and open PR scopes were
read before work. No active writer owned `test/fixtures/ci-2029/**` or this
evidence directory.

## What was admitted

Revision `public-current-route-admission-v4` contains 195 navigation responses
and 192 performance/browser responses. Compared with revision 3, it adds 23
exact request contracts, refreshes two existing public bodies as matched
empty/count header pairs, and removes none. `corpus-delta.json` binds every key,
status, byte count and SHA256.

The additions came from bounded reads against canonical project
`linswmnnkjxvweumprav`, checked as `anon` before retention:

- published Post 5112: the Home card projection and the exact Topic full-Post
  projection. `home_hidden=false`, no draft tag, `author=null`, `authors=null`,
  and no contact string;
- approved `topic_cards_public` rows for `india-axis` and its three linked Topic
  cards. The retained `created_by=ai` value is already in the explicitly reviewed
  public attribution allowlist;
- active public graph nodes and edges for the `india-axis` convergence node;
  edge metadata is empty and identifiers are graph/content identifiers, not
  account identifiers;
- 14 gallery rows with `published=1`, `min_tier=0` and no curator-hidden row,
  plus current header/count semantics. Their URLs point only to the public media
  bucket;
- public deterministic math/config results: `convergence_meter(424)`,
  `gematria_api('הציר ההודי')` and nine active gematria-method definitions;
- exact public empty results where the canonical endpoint really returned an
  empty array; no empty response was invented;
- four exact `401/42501` responses for current `research_objects` reads. These
  preserve current public failure behavior and retain no research row or body.

No credential is stored in the package. Public REST acquisition used the
browser-public anon credential only after read-only publication checks. The
existing image bodies came only from public Storage URLs.

## Privacy decision

The actual 195-response navigation package passes the repository privacy
review. It contains no `author_user_id`, account UUID, contact string, private
dossier, auth/session material, service-role credential, hidden/draft Post or
unpublished gallery row. The user's prior approval for public Post attribution
and public Topic attribution was applied narrowly; it was not generalized to
other tables.

One otherwise public Topic dependency was excluded. Its seven active Number
nodes include `metadata.created_by=agent:claude`, which is not in the reviewed
creator allowlist. The response was not redacted or substituted; the exact
request remains an explicit blocker.

## Images and request signatures

All 37 retained image responses decode from their original bytes: 34 JPEG and
3 PNG, all with unique body hashes. Pillow `verify()` and a complete pixel load
passed for every response. `image-validation.json` records the path, media type,
format, dimensions, bytes and SHA256 for every image. The inventory's
`utf8ReplacementBodies=37` describes what would happen if binary bytes were
misread as UTF-8; it is not image corruption. The independent decoder found
zero invalid bodies.

Navigation retains 195 complete `prefer` / `range` / `accept-profile`
signatures. Performance/browser collapse only byte-identical header variants;
there are 192 responses and no ambiguous collision. The six package files
reproduce byte for byte from the retained navigation input and source index.

## Current built-route result

The candidate was built locally and exercised under the repository's native
network boundary. Each diagnostic browser context rejects unknown requests and
uses only the frozen snapshot; a missing request receives a diagnostic 503 and
is still recorded, so an application catch cannot hide the gap.

| Startup route | Navigation misses | Headerless misses | Result |
| --- | ---: | ---: | --- |
| `/number/376` | 0 | 0 | startup dependency closure proven |
| `/post/seventh-to-tenth-sefirot-2027` | 0 | 0 | startup dependency closure proven |
| `/` | 4 | 4 | blocked |
| `/world` | 1 | 1 | blocked |
| `/topic/india-axis` | 1 | 1 | blocked |

This is dependency closure for one startup visit, not matched speed acceptance,
interaction coverage or live parity. The Number owner interaction preflight also
requires six older, still-absent contracts: Number identities 0/376/1237/1820,
`fn_number_lookup(376)`, and the canonical `fn_method_profile` result for
`שלום`. It therefore stops before its browser comparison.

## Exact remaining blockers

| Surface/gate | Exact unresolved input | Why it is not retained |
| --- | --- | --- |
| Home | public Post query containing `ai_addition` for 787 | the field mixes contributor/system content and has no independent public-body approval |
| Home | approved Number 787 contribution fields and byline | contribution content and attribution were not independently admitted |
| Home | weekly contribution identity/count query | it requests `author_user_id`; no account-free projection exists |
| Home | `world_group_source_arrivals_v2({p_before:null,p_limit:8})` | the result includes private source bodies; aggregate-only review does not authorize them |
| World | `world_group_source_arrivals_v2({p_before:null,p_limit:24})` | same private-body boundary |
| Topic | seven active Number-node rows | one row carries the unreviewed `metadata.created_by=agent:claude` attribution |
| Browser | full Bennett Post 5113 and focus | the exact authored Post remains tagged draft |
| Number owner interaction | six canonical Number/profile request contracts | absent from the reviewed package; no empty or invented result was used |

The full Home/World/Topic/navigation/performance comparisons and the complete
Browser suite cannot run until those inputs have an approved public projection
or an existing approved restricted fixture mechanism. The correct current state
remains `INCOMPLETE_NOT_ACCEPTED`.

## Verification

- `snapshot-sha.mjs navigation`: PASS,
  `8e7e799cb64fda1446af70912a3dc00f8009c604b7014f954f080253f898d3e9`.
- `snapshot-sha.mjs performance`: PASS,
  `7a75c1033b38eb09cb8c46dd578bccf62b89b1a7fb6e91bf58540d5b76e28365`.
- Browser semantic preflight: expected FAIL on only `complete authored Bennett
  body and verified focus`.
- Snapshot/privacy/repack tests: 35/35 PASS, including byte-identical
  regeneration of all six package files.
- Image decode: 37/37 PASS.
- Configuration and UDP/write traps: 17/17 PASS.
- The full source command reached and passed source tests, A3 in-memory
  interaction→trace→five spans, 11 persistence-failure cases, product builds,
  built-graph and bundle checks. It later failed 1/17 egress controls:
  `browser teardown` did not make the outer runner fail. A separate retry
  reproduced 16/17 PASS and the same single failure. This is not hidden or
  relabeled as a source-gate PASS.
- No hosted CI, PR, deployment, live fallback, database/RLS/flag change or
  `work_log` write was performed.

`route-missing-navigation.json`, `route-missing-performance.json`,
`number-browser-preflight.txt`, `hard-source.txt.gz`, `egress-retry.txt`,
`focused-isolation.txt`, `image-validation.json`, `snapshot-inventory.json` and
`checks.json` preserve the exact receipts.
