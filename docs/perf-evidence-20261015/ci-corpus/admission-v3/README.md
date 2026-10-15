# PR1111: full public-body admission, revision 3

Continuation of `gpt/perf-ci-isolation-20261015@abafdb6c8cbd67e7adaedb3648f7c5d8ac191a30`.
PR1111 remains a draft targeting the measurement branch at
`8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`. Review date: 2026-10-16,
Asia/Jerusalem. This is a new offline experiment, not historical measurement
recovery, live acceptance, or approval of Posts/Topics product surfaces.

## Frozen public input

Revision `public-body-admission-v3` retains all 161 previous navigation response
objects unchanged and adds eleven exact contracts: eight actual canonical
`convergence_meter(integer)` outputs needed by the immutable navigation baseline,
16 public Post metadata rows, three actual verified/public gematria-word rows,
and the requested 32-row prefix of the already retained complete public 48-row
Post listing. The 48-row source itself remains unchanged. There are now 172
navigation contracts and 171 performance/browser contracts.

| File | SHA256 |
| --- | --- |
| performance.json.gz / browser.json.gz | `33c9469ac6a667f25fa57670fd9fadd650a087705dbd196691090e807e9098e9` |
| navigation.json.gz | `b4fc08cd1046f97f52372c570df6d3ed43118a1151a19cb939ca68b22f02efc1` |
| source-index.json | `a5e119cc6a2afc238933974bade80e045c3329dcdb64a46dd90e5d7228fc7981` |

The new canonical convergence arguments are 1156, 1359, 2212, 5844, 596, 776,
888 and 974. The live function definition matched the previously audited
read-only definition MD5 `8bcd7efbb13fdfdc385b301103077a39`; its reviewed dependencies
were unchanged. Acquisition was bounded anon READ ONLY SQL outside CI. Public
Post/word predicates and exact field projections were checked before retaining
their actual output. No AI, public-site navigation, write, or live fallback ran.

All 2,637 Number rows, thirteen canonical math/trace references, catalog rows,
relationships, full retained Post bodies/excerpts, header/count semantics,
37 original/rendition image binaries, fonts and CSS remain intact. No record,
text, link, count or image weight was reduced. `source-preservation.json` binds
every addition and proves the previous responses unchanged. The package is
reproducible from Git without source access: the eighteen privacy/package tests
include byte-identical regeneration of all six files from the retained navigation
input and source index. `manifest.json` remains `INCOMPLETE_NOT_ACCEPTED`.

## Explicit full-body decision

Only the reviewed public Post 5116, slug `seventh-to-tenth-sefirot-2027`, now
uses exact source identity and complete content SHA256
`75e899e0f8cbfb224d3dfa990a81fd7f61443bcc5401125f69dca359e0346d40`
instead of the 800-character heuristic. The complete original HTML is unchanged
(1,778 characters; 760 after the existing HTML-removal expression). The user
explicitly approved this decision. It is applied even if modified input exceeds
800 characters. Negative tests reject truncation, same-length modification,
padding and a different source identity; another Golden source retains its
existing body assertion. All speed budgets, sample sizes and measurement
definitions are unchanged.

## Executed local results

The full gate commands were invoked sequentially inside the same Docker
`network=none` container, with only loopback, no default route, dropped
capabilities, inherited native/Node guards and browser request protection. The
wrapper clears inherited proxy variables and uses the same npm offline settings
as `run.mjs`. An earlier wrapper omitted these settings: the native guard caught
an inherited-proxy attempt, and that failed run was not accepted. The wrapper
was corrected without changing a guard or application code.

| Check on the frozen v3 input | Result |
| --- | --- |
| Full source/build entrypoint, A3 interaction→stored trace→spans and save failures, egress/UDP cases, PR1110 measurement tests | PASS; outer audit empty |
| Actual-package full-body + privacy/repack focused tests | 35/35 PASS (17 snapshot, 18 privacy/repack); outer audit empty |
| All 16 mobile image cases | PASS, as the first part of the full performance command |
| Catalog 2→24 content/order/count continuation | PASS, identical fingerprint `14f687daab2c86b01ba9011cb9e8c6cc1fd785b16764dda31d020c7103642888` |
| Full performance entrypoint | FAIL after input preflight/build/images; unmapped Home/World inputs blocked and audited |
| Full navigation entrypoint | FAIL after input preflight/build/source checks; unmapped group-source RPC blocked and audited |
| Full browser entrypoint | FAIL before application startup: retainable authored Bennett source absent |
| Independent Post route only, both actual builds | Seven samples each, PASS with the same HEAD tool and frozen `33c9469…` input; audits empty |
| Unchanged replay regression validator on that Post-only pair | PASS; this covers only the measured Post route |

`local-gates.json`, raw gate logs/audits, the image/cat receipts, the Post-only raw
measurements and validator output are retained here. Native Node was 24.19.0,
Playwright 1.56.1 and Chromium 141.0.7390.37; CI uses the existing Node pin. The
performance base is exact `8965f1b6`; the navigation base is exact `0825b326`.
Both sides were built with the current tool and the same respective frozen input.
The product head is unchanged from `abafdb6c`; this round changes tests, fixtures
and evidence only. There is no direct comparison to a historical input.

**Full performance measurement has not completed.** There is no accepted matched
seven-sample Home/World/full-navigation result, full extension acceptance, or
World/Entry browser acceptance. Earlier independent diagnostic attempts at the
head catalog/failure/retry/return and delayed failed extensions also failed on
the absent source inputs; they are not passing coverage. No failure is converted
to green, skipped, or replaced with an empty response.

## Exact remaining retainable inputs

All paths below are under the existing public Supabase origin's `/rest/v1/`.
Request shapes are diagnostic evidence; a GET, anon key or read-only function
does not grant public retention rights.

1. `GET posts?select=*&slug=in.(bennett-melach-631-78)&limit=1`:
   the exact authored Golden Post 5113 is tagged draft. Explicit local-only body
   inspection was completed. The actual `markBennettStory` implementation passed
   the saved Bennett/631 focus check against retained canonical math references;
   unavailable math service calls throw rather than invent an answer. This is a
   body-level diagnostic, not the complete browser input/acceptance. No draft
   body or private receipt was copied to Git, Docker or public CI artifacts.
   Needed: an explicitly retainable complete Golden Post input, either public or
   in an existing approved restricted fixture mechanism. Local-only permission
   does not provide that input. Earlier source-index wording “not read/exported”
   describes public corpus acquisition; the later local-only inspection is not
   a public admission.
2. `GET research_contributions?select=id,author_user_id,author_contributor_id,author_name,created_at&status=eq.approved&created_at=gte.TS&order=created_at.desc&limit=1000`,
   with the existing exact-count/public-profile negotiation. The permitted two
   display names were inspected locally, without reading account/contact fields.
   Neither contributor attribution was verified as intended public display by
   the admitted public profile/Post/Topic checks. Needed: a retainable public,
   account-free identity/display projection preserving the real unique counts,
   ordering and timestamps. Existing public text with a similar name does not
   verify the identity behind this separate request.
3. `GET research_contributions?select=id,author_name,title,gematria_claim,created_at&target_type=eq.number&target_id=eq.787&status=eq.approved&order=created_at.desc&limit=12`:
   public byline admission failed. No source content was exported. Needed: a
   verified public attribution and complete approved contribution fields/claims,
   not a fabricated or empty Number 787 response.
4. `GET posts?select=id,title,slug,link,modified,date,author,ai_addition,space,home_hidden&space=eq.core&home_hidden=eq.false&ai_addition=not.is.null&ai_addition=ilike.%787%&order=modified.desc.nullslast&limit=12`:
   the containing Post metadata is public, but `ai_addition` mixes contributed
   content with system/internal sections. A narrow content-fragment read was
   rejected by automatic approval review before execution: metadata/name approval
   does not authorize exporting content blocks, and regex filtering does not
   establish public admission. No content was returned and no alternate access
   was attempted. Needed: a separately approved retainable public contributor-
   finding projection with exact expression/value/attribution and source evidence.
5. `POST rpc/world_group_source_arrivals_v2`, arguments
   `{"p_before":null,"p_limit":24}`: the read-only definition includes private
   source material. The newly authorized aggregate-only inspection completed
   locally, without message bodies; those private aggregates were not added to
   the public package. Needed: approved retainable complete source-card bodies
   and provenance for this exact scenario or an existing approved fixture.
   Aggregate permission cannot supply those bodies. The request remains absent
   and attempted replay use fails the independent audit even when UI code catches
   its request error.

The three full entrypoints and independent tests have now exhausted the useful
execution possible with these admitted inputs. The remaining source gaps are
specific data-admission blockers, not missing historical filenames. No product
fix, trace-finish change, assertion weakening, UDP rework, new storage service,
permission change, merge, deployment or product database/content/flag write is
part of this round.

## Remote verification and coordination

All nineteen workflow definitions were rechecked unchanged. Only the isolated
2029 workflow matches this PR; all three jobs check out the event's exact head
SHA. Definitions come from the PR synthetic merge with the unchanged measurement
target; base archives do not execute base CI scripts. Networked installation has
lifecycle hooks disabled; repository execution uses the offline namespace.
`gpt/*` deployments remain disabled. See `trigger-review.json`.

The new exact-SHA remote run and its three final job results will be recorded in
the PR description after synchronization; this committed local receipt does not
claim a future CI outcome. No old workflow run is rerun or dispatched. Passive
BEFORE: `deb2c61c-f3bc-4f59-aefe-a952601b41b4`, task
`GPT_PR1111_INPUT_ADMISSION_20261016`; dispatch NULL. AFTER/release is written
after remote verification.
