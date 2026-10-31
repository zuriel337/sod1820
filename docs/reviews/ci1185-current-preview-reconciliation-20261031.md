# PR1185 CI failures against protected Preview63e6882c

Task `CI1185_CURRENT_PREVIEW_RECONCILIATION_20261031`, GPT → ZURIEL.
BEFORE `2b3904cb-91b8-4b52-b2f4-e5aef6c35fc4`; exact base and still-selected
Preview `63e6882c3b7b4004d337927c7231728a7612d452`. Isolated worktree
`/workspace/sod1820-ci1185`, branch `gpt/2029-ci1185-acceptance-reconcile-20261031`.
Relevant latest ownership including historical closures was checked before writing.
No overlapping test/workflow writer was found. Scope excludes app/runtime/styles,
Community imports, Preview bindings, product data/RLS/Edge/flags, main and Production.

PR1185 still heads at `b056827004725ee287d34f2f64f02411081a6201` and targets
`gpt/community-server-auth-20261031`; its reported jobs checked the synthetic merge
`9445123b921429c04fc46e2ec9ccd1c6e21a08ac`. There are no pull-request Actions runs
for63e6882c. The following classifications use job logs, content comparison and
current executable tests, not ancestry or a blanket reuse of older test counts.

| Gate | Reported failure | Current outcome and action |
|---|---|---|
| [Research Sync](https://github.com/zuriel337/sod1820/actions/runs/41221020037) | ECR image pull `toomanyrequests: Data limit exceeded`, before checkout | Infrastructure. Current72 runtime/recovery/hardening checks,10 actual mounted-provider checks and36 isolated PostgreSQL17 assertions pass (18 deliberate rejections). Replace only the image service with the runner-local PostgreSQL setup already used by the ELS workflow. SQL, principals, CAS/ownership and fail-on-error stay intact. |
| [Isolation](https://github.com/zuriel337/sod1820/actions/runs/41221020020) | Obsolete `title="מה חדש בעולם"` / separate feed-chip assertion; source isolation itself passed | Adapt to approved Now entry and unread badge. Require the same feed in Attention, Companion and ribbon; forbid resurrecting the chip. Failed step30/30 and shared-feed4/4 pass; source and built isolation pass. |
| [ELS](https://github.com/zuriel337/sod1820/actions/runs/41221020018) | Old full-frame test searches global Search directly inside the tool dock | Already reconciled in63e6882c: existing test uses More → Search and More → return to tool. That exact actual-frame case passes at320/390/1440, zero skips, including stable Raziel, no engine work on panel change and registration cleanup. No ELS edit/import is needed. This is not a full ELS gate rerun. |
| [G4](https://github.com/zuriel337/sod1820/actions/runs/41221020025) | Seven failures / six passes | Same seven failures reproduced against current built runtime. Reconcile five stale approved-presentation expectations and two aged data assumptions. Final14/14 pass, zero failures/skips/flaky, including a new absent-public-Topic negative. |

## Approved behavior and preserved checks

Existing authority/evidence: [single command bar](single-command-bar-20261029.md),
[shell alignment](central-shell-approved-alignment-20261029.md),
[header/menu](central-topbar-menu-completion-20261029.md),
[public Community](community-visible-counts-20261031.md),
[retained old conversation](community-single-counter-footer-20261031.md), and the
[received handoff](unified-session-handoff-20261031.md). The actual current source
and DOM were checked against these receipts.

G4 now follows the existing personal-area label; Number navigation opens Search,
requires explicit1820 and then opens its same full page; Community is above the
retained old chat, whose exact source URL, conversation identity and one launcher
are still checked after lazy activation. Its return link uses the adopted copy.
The avatar cap46px and text minimum160px stay fixed; the card must fit its actual
account container and viewport with no text overflow, replacing an obsolete520px
dialog-width assumption. Guided ELS initially shows its real story entry with no
result; explicit Classic exposes the original query/native surface. No model is
called to satisfy a visibility assertion.

The World fixture's old fixed date aged out of the bounded activity window.
It now represents a current synthetic arrival through the same canonical RPC,
and is checked under the actual public-updates source filter. A bounded live
read of `topic_cards_public WHERE slug='888-yeshua'` returned no public row.
Positive navigation therefore uses an explicitly synthetic approved Topic; a
separate empty-projection case requires no convergence or invented888 link.
Number888 source navigation, reload, exact return, font-failure44px target and
World overflow checks remain. No live row is restored/published to make tests pass.

Closed launch gates remain tested: Number must block before engine mounting with
zero Number reads; Books/Heichal/Journey remain closed. The test egress guard now
uses an explicit bounded read-RPC list instead of any `fn_*` name. All unrelated
product/model mutations remain aborted. Test user-account positives are fixtures.

## Content comparison and validation limits

The selected Community runtime/transition/Legacy-chat/CSS blobs already match
PR1185's head; neither that branch nor its work is imported again. Sync runtime,
recovery/state and SQL are unchanged against the PR. ResearchProvider has the
already integrated15-line ELS operation observer/context addition; the actual
current mounted provider was tested. The existing ELS dock acceptance is already
stronger than the old PR version. This task changes no product runtime blob.

Current local validation:116 Node checks (72+10+30+4),36 SQL assertions, one
three-width ELS browser case and14 G4 cases pass without skips. Normal dual build
with CI's `VITE_HOME_2029_ENABLED=true`, One Tree78, source isolation, built graph/
lazy boundary, Legacy lock, workflow YAML and diff check pass. Evidence and exact
case names/log hashes are in the [bounded JSON receipt](ci1185-current-preview-reconciliation-20261031.json).

SQL ran only in the task's PostgreSQL17 container, network disabled, repository
read-only and no published host port. No canonical product write occurred.
An initial local G4 build lacked the CI Home flag and was interrupted; the correct
build reproduced the original seven failures. Intermediate test adaptations
were corrected against real DOM/source; no timeout, assertion or error was hidden.

One remote Research Sync dispatch on the final pushed fix SHA is planned to
verify the new runner bootstrap. Its exact run/SHA/result and the scope release
belong in the closing passive AFTER and user handoff, without a post-run commit
that would change the tested source identity. The old PR's status is not rewritten.
Full Isolation/ELS/G4 workflows and the five previously skipped local PostgreSQL
cases are not claimed rerun; fixture results do not prove live private roles,
model completion, backend ELS parity or field latency.

**No new Preview is required:** only tests, CI setup and this receipt change.
The existing protected63e6882c Preview retains its exact permissions and remains
selected. No merge, Production/Edge deploy, alias/domain change or main push.
