# Raziel account persistence and map action — bounded repair

Actor: GPT. Recipient: ZURIEL. Branch: `gpt/raziel-account-sync-map-20261030`.
Base: `bfbd40236c6c45dae81d51dd496457be0acf5450`, verified against remote before
branching. No import/cherry-pick from experiments or central branches.

## Coordination / BEFORE

Read AGENTS, the owner index, Research Studio baseline, active Raziel companion
and AI contracts, and relevant 2029 design typography/chrome requirements.
Live `work_log_current` checked read-only on 2026-10-30. The elections Preview
guard BEFORE has a later AFTER releasing that exact scope; general elections
continuation remains excluded. The EXP-24 experiment scope is not touched.
This file is a passive receipt to ZURIEL, not a claimed write to work_log.
Only the read-only Supabase connector was used; no authorized journal writer
was available and no dispatch to another agent was sent.

## Root cause and before/after

The disposable Preview worker denied POST to both existing private Research
RPCs: `research_state_snapshot_v1` and `research_state_apply_ops_v1`.
VM tests reproduce 403/no forwarding on the base. The account center already
consumed the correct shared saved-session collection; a missing list was not
proof of missing account records. No private conversation data was inspected.

The named repair branch admits only those two existing private sync endpoints
with original bearer credentials, bounded request shapes, batch ID/revision,
and unchanged server validation. Live function definitions were read: both
reject a principal different from auth.uid(); the writer retains CAS and batch
receipts. No SQL, RLS, grants, Provider, storage or transport changes.

The Preview worker additionally screens out public anon tokens and a mismatched
expected principal using role/sub claims. This decode is not authentication and
never replaces the existing server's signature/expiry/ownership checks.

The RPC is the existing **whole private Research sync**, not a conversation-only
API. Its ordered batches include context/history and user research operations;
filtering or acknowledging only part of a batch would corrupt sync. This cut
does not invent such a partial ACK. Arbitrary table writes, profile/family writes,
signup and unrelated endpoints remain blocked by the worker. The worker is a
Preview guard, not an authorization boundary; the existing server remains owner.

Save acknowledgement previously used a stale `synced` value from before enqueue.
Now success explicitly means local save; the reactive existing sync status alone
reports cloud acknowledgement. Errors, local-storage failures, conflicts and
loading have distinct truthful labels. The saved panel opens even when empty,
and retry invokes the existing ResearchProvider method. No automatic chat save.

## What “פתח מפת מחקר” does

It is the existing `landscape` answer, via the same session submit and ai-analyze,
not navigation to a graphical matrix/world map. The offer now explains this,
the extra AI request, and explicit save. Opening the offer sends nothing; the
confirmation sends one request. The same named Preview admits authenticated
normal Raziel research submits; no alternate AI/planner/function is enabled.

The valid-Bundle gate is unchanged. A Fable result alone is not a number Result
Bundle. Restoring saved text deliberately does not forge live Bundle provenance;
the offer explains the missing material instead of launching an ungrounded call.
No model is invoked by opening a page, account center, saved chat or offer.

## Verification and limits

- 75 focused tests: guard before/after, malformed/wrong-origin/unauthenticated
  requests, unchanged server errors, same submit, explicit save, serialization,
  one-shot gate and ordered Research sync (identity changes, conflicts, ACKs).
- 36 ELS context/saved result/consumer and shared Raziel center/frame tests pass.
- 76 focused matrix-reading engine/action/operation/transport/session/recovery/
  saved-result/projection/presentation/activity checks pass.
- Full native ELS browser suite: 48/48, no skips (372 seconds), including Classic
  privacy, exact skip/no-hit, connected cross results and pinch/three presets.
- Real built browser: 320 Day, 390 Parchment, 1440 Night. Fake authenticated
  account save fails, remains local, retry ACKs; a fresh browser loads the same
  thread through the real providers and account center; another fixture account
  sees none. Two answers remain in one thread, no autosave, no AI on restore.
  Map offer sends zero requests, explicit run exactly one. Restored text without
  fresh Bundle cannot run map. No overflow; 44px controls. Screenshot inspected.
- Full responsive built chat: 320/390/768/1440 × 3 presets, mixed English/Hebrew,
  canonical typography, keyboard/reduced-motion checks pass.
- Isolation, System Frame, auth guard, built lazy/bundle graph and Legacy
  Production lock pass. Eager gzip 415605 bytes (43137 under the guard baseline).
- Standard Legacy and 2029 builds pass with real installed dependencies (no
  stubs). The named integrated Preview build also passes; diff check is clean.

All browser identity/network/model responses above are fixtures. They prove the
code path, not live account authentication or new model quality. No live model
or product-DB mutation was performed by this verification. The eventual Preview
uses the real backend when the signed-in user explicitly sends/saves, and existing
Research context sync also resumes. It is not a separately isolated backend.

Unsaved chats are temporary by contract. Local-only data on an old Preview
origin does not magically migrate to a new origin. Do not clear old storage.
No guarantee of restoring unsaved/old-origin history is made here.

The experiment ledger and ELS algorithms/prompts/dictionaries remain untouched.
No main/Production/Edge deploy, feature flag change or new paid experiment.

## Handoff / AFTER

Branch-only code is implemented and tested. Protected 2029 Preview is the only
release target; no production aliases may change. Existing Legacy production
aliases were checked read-only and still point to
`dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA` (known drift from the old AGENTS pin; no attempt
to roll back). Live main was fetched at `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`
for reconciliation only, not used as a replacement base.
Coordination recheck at 13:13 UTC found the new Revelation method-card scope
excludes shared Frame/Providers/ELS, and EXP-24 is released. Neither was imported.
Pending human check: sign in to the Preview with the existing account, explicitly
save a conversation, wait for the synced label, reload and reopen from My Account.
No passwords or tokens are requested in this handoff. Account/model test doubles
must not be presented as that live acceptance step.

## Protected Preview receipt

- Runtime commit: `08b070ab053b03497e7b4b2a496770a93148c11f`.
- Deployment: `dpl_6rXEcFtrcWnDZKtvFXPmF4E3saJN`, READY, target `staging`
  (Vercel Preview), project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`.
- Host: `sod1820-3vfk90nt3-sod1820-s-projects.vercel.app`.
  A seven-day share link was issued to ZURIEL; its access token is not committed.
- Hosted `/code`: HTTP 200, exact runtime SHA/branch/transport identity checked,
  320/390/1440 no horizontal page/chat overflow, no page errors, zero AI calls.
  The empty saved panel opens for guests and truthfully reports local-only state.
- All three canonical production aliases checked after deployment: unchanged
  Legacy `dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`. No Edge function deployed.
- This receipt-only follow-up does not change the deployed application code.
