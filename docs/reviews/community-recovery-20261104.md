# Community recovery — 4 November 2026

Actor GPT; task `COMMUNITY_RECENT_RESTORE_20261104`; handoff to ZURIEL.

## Live restoration

The user explicitly resumed the deferred old-chat import. The canonical source is
OpenWeb conversation `sp_OVtajBTj_POST$ID$GOES$HERE`, still active and writable at
source. An alternative legacy `chat_messages` table has zero rows; the old site
routes `/chat` and `/דף-צאט-ראשי` point to `/community/chat`.

Fresh ordinary guest source reads reconstructed 77 rows in 25 recent root trees.
The selected public closure contains all 24 IDs of the previous deferred proposal
and two newer messages. The existing canonical batch imported 26 rows: 8 roots
and 18 replies, latest source timestamp `2026-11-04T07:36:24Z`. A reply whose
ancestor was deleted remains excluded. This is a bounded recent restoration,
not a claim of complete historical backfill.

The canonical pure planner produced 26 inserts and 18 parent links. Live import
verified exact text/media representation, timestamps, reactions, approval state,
origin and parent lineage. Replay inserted zero rows and skipped all 26. Full
before/after notification and outbox row digests were identical, including any
subtransaction effects. The first attempt failed before import because the
outbox has `done_key`, not `id`; the complete transaction rolled back. The
successful guard sorts complete row representations and makes no xmin assumption.
No triggers, roles, permissions, Auth identities or source messages were changed.
One source-native private contributor was created; no email claims or account
ownership were inferred. Temporary source payloads remain outside the repository.

Actual live browser checks at widths 390 and 1440 passed restored root and reply,
loaded-message search, empty-search recovery, pagination to 80 roots, exact thread
links and horizontal overflow. Both runs had zero page exceptions.

## Latest functional Community branch recovered

Branch `gpt/2029-community1187-unified-20261101`, source
`dbbe91de46d21a37110664dc732473de6d9cc6ca`, deployment
`dpl_J7AVTx7ozbkFmMEuauGUG9p14bwM`:
<https://sod1820-9fvnfmezu-sod1820-s-projects.vercel.app/community/chat>.

Its existing compact composer, attachments, replies, reactions and owned actions
are integrated into the later source. Comparison with live source
`1bc8260adaa889d7903aaa33ef43510df09817f2` shows the later public-reading gate
suppresses ordinary-user participation. The implementation was not lost.
Actual hosted guest browser inspection confirmed the editor renders and accepts
draft text; publication requires sign-in. No test message was sent. This does
not establish successful authenticated publication in either deployment.

The original OpenWeb widget was also inspected in an isolated document using its
real source: its editor exists and the conversation's source `read_only` is
false. That is distinct from native Community publishing and does not establish
successful submission from the production site.

## Prepared copy cleanup

The isolated branch starts from current candidate head
`6a5e86df811c0a559171622f708bfdbe00b03b5c`; current main remains
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

The local change removes the requested public-reading disclaimer, the generic
footer prose and the inactive old-chat placeholder. Restored messages continue
through the existing feed. Public reading no longer attempts a reply-count RPC
that its transport deliberately rejects; counts remain unknown until the
context-checked replies page supplies them. Ordinary builds retain that RPC.
No publication, upload, reaction, account or platform gate was opened.

Validation: 34 focused Community/planner/refresh tests passed; the ordinary
public-reading build passed its Legacy lock and One Tree checks and compiled
successfully. The initial sparse checkout omitted the CI workflow required by
One Tree; adding the existing `.github` files resolved that environment error.
No test or gate was weakened. This code cleanup has not been deployed.

Remaining: user-requested authenticated publishing is currently blocked by the
published reading profile; real authenticated submit acceptance is unperformed.
Restoring that existing capability requires a scoped integration and release,
not a rollback to an entire historical branch. No main push, merge or website
deployment occurred in this task. Scope is released after the passive report.

## Subsequent explicit working-page restoration

ZURIEL subsequently requested the latest working weekly page on the published
site, with the restored messages, then explicitly requested the old chat in an
open box below it without the added restrictions. New bounded BEFORE records:
`a2ca2bc0-f1c6-4cbe-815c-76611a70a264` and
`9762f156-82aa-41cc-a93f-eb08efcfb35c`.

Integration is based on current published candidate branch head
`163fcd6cbbd81786d5725753a24062d9be4e1ecd`; no historical whole-site rollback.
The existing native composer, attachments, reactions and owned-message actions
are restored only in the public-production artifact. Existing historical
read-only/mock previews and general research/model gates remain unchanged.
The transport reuses the accepted weekly operation contracts, verifies each
principal through canonical Auth, binds media uploads to that principal and
checks reply/reaction targets using anonymous public message context. Existing
RPCs remain the final authority for authorship, moderation and ownership.
The original OpenWeb widget loads immediately below the native feed, using the
same source identity and canonical loader/SSO. Its actual API and existing SSO
are admitted; no provider permissions or moderation settings are changed.

Validation before release: 63 focused tests pass, including guest/expired/forged
identity denials, ordinary-member publication, exact public reply/reaction
context, preserved model denial and original SDK/SSO admission. The build passes
the unchanged Legacy and One Tree gates. Four built-client browser cases at
390/1440 for guest/member passed: real service worker, native text input,
ordinary-member text+image publication through controlled endpoints, no upload
before explicit submit, reload showing the accepted message, guest sign-in
requirement, and old chat initially open. There were no page exceptions or
horizontal overflow. This uses synthetic Auth/API data and sends no real post.
Genuine account publication is not represented as tested.
The old widget's outer height cap/nested scrolling was removed so its original
conversation is fully open in the existing bordered box, as requested. The
additional 21 public-artifact regression tests pass with the existing deploy
and Legacy guards unchanged. Incremental production publication is expressly
authorized by the subsequent user request; the previous branch-only report
above is historical, not a restriction inferred against that new instruction.

The first incremental release `bde0a822` / `dpl_9mWvyeuELvNzctiVCd5ouEAG3BNU`
served correctly on all three canonical hosts and restored native writing.
Live inspection then identified the exact remaining old-widget failure: the
existing document CSP prevented its `api-2-0.spot.im/device-load` request, before
the SDK could initialize. The correction admits the original provider's HTTPS
and WebSocket hosts plus its normal form actions, retaining object/frame/base
restrictions and unrelated API/model restrictions. The worker likewise permits
the provider's SDK service hosts, including its initialization event stream;
lookalike foreign hosts remain denied. All 22 focused transport tests pass.
This follows the user's explicit request for the original box without the
site-added restrictions; provider authentication/moderation remains original.

## Repeatable likes, including guests

ZURIEL explicitly requested unrestricted repeated likes without registration.
The existing reaction RPC now has an exact opt-in Community-only thumbs-up
mode. It increments `reactions.community_likes` atomically under the same
approved-ancestry locks; imported `likes`, existing identity arrays and default
toggle/admin-boost behavior remain unchanged. Target/root visibility, cycles,
hidden threads, deleted targets and non-Community sources still fail closed.
No new grants, Auth identities or role changes were introduced. The worker
checks anonymous public message context before forwarding the exact guest-like
contract; other guest writes remain denied. The native Community button uses
the additive count and permits repeated presses without an account.

The CLI-created migration was applied by the canonical migration tool and
renamed to its observed database version `20261104123515`. Original function
hash `6803e0ce21cac8c2c386f8330b74bec1`; deployed function hash
`ca68c32b18b94480301073fba9869be2`; original grants retained. Its guard rejects
an unexpectedly changed canonical function. The committed disposable-container
test reuses the full prior visibility/toggle fixture, checks 100 sequential
guest likes, exact baseline preservation and negative scope cases, then 20
concurrent requests: final 120, zero lost increments. Two built-client browser
cases at 390/1440 confirm guest repeated likes, failed-request rollback,
reload persistence and preserved historical likes/dislikes. There are zero
page exceptions and no real test publication. Security advisors were read
before and after the function change; unrelated findings were not changed.
