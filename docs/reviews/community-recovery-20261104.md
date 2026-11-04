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
