# WatchButton: saved-follow identity resume and uncertain-state recovery

Task: `WATCH_BUTTON_STATE_RECOVERY_20261025`.
BEFORE: `87da3848-d993-4be1-bf1d-c03a13bd1ea7`.
Branch: `gpt/follow-center-preview-boundary-20261025` (draft PR #1159).
This slice's base: `29d95fd6a0ce311e915f0ce6a5656ed3c632ac9e`.
Central remains `1baf950477e6357dc1f89d87d47db15fd457fb23`.

## Problem and resulting behavior

The released 2029 variant tied identity continuation to `justFollowed`. A returning guest's
successful saved-preference read sets `following=true` but does not represent a new follow action,
so the identity action disappeared. The same flag survived an unconfirmed unfollow, causing the
new view to display “המעקב אושר” beside an error and an unknown disabled control.

The canonical controller now supplies two separate truth predicates to the existing view:

- A known saved follow can offer an unsigned-in visitor the existing identity continuation,
  without any new Follow request or a false new-action success message.
- A newly confirmed follow can show its success message only while the saved state is known,
  following, settled and free of read/operation errors.

An unacknowledged mutation clears the obsolete `justFollowed`/open-identity state. A read masks
known state while pending; old saved values cannot enable a toggle during recovery. The automatic
read after an uncertain operation preserves its error notice. The 2029 explicit retry clears that
notice only after an authoritative read succeeds. It creates no mutation and no fresh-success
claim. If the read confirms the follow still exists, identity continuation becomes available;
if it confirms removal, the control stays unfollowed.

`WatchControl2029` consumes those explicit predicates through the same DOM branches. The source
view's copy, layout, CSS, semantic colors, icons and typography are unchanged. The existing
Follow engine, Auth provider, instance I/O boundary and account/topic/adapter result guards remain.
Legacy variants keep their presentation; their reads also correctly mask pending recovery and
unconfirmed mutations no longer retain a stale completion flag. No separate follow/identity engine.

## Regression evidence

The new real-component fixture uses the actual `WatchButton` and Auth provider with per-instance
synthetic I/O. Every external request is aborted and fails the test; identity is a non-sending
fixture callback. On the unchanged base, four of six cases fail for product-state reasons, with
zero page errors or external requests. Both existing late-result scope checks pass on the base.

All six pass after the correction:

1. Returning saved guest resumes identity without toggling or opening a real OTP sender.
2. Confirmed follow → unacknowledged unfollow → failed read → held explicit recovery; no stale
   confirmation or identity continuation appears while unresolved.
3. The automatic read confirms the old follow; explicit retry recovers identity without claiming
   a new successful mutation or issuing another toggle.
4. The server applied removal despite a missing acknowledgment; retry preserves that unfollowed
   state and does not manufacture a follow or identity action.
5. A late mutation response after a topic change cannot confirm or populate the new scope.
6. A late mutation response after replacing the I/O adapter cannot settle the new adapter's state.

The existing normal/mini/checkbox/gate browser regression also passes its four variants with
unknown-state gating, missing-ack error and confirmed retry. All HTTP mutation replies are fixtures.
Eight focused Node entrypoints pass (variant, treatment, palette, contrast, inbox, consent,
center model and follow identity). Legacy/default 2029 and flag-enabled 2029 builds pass.
The existing 43-case center matrix also passes with zero page errors/unexpected writes.
Production lock, cheap route hardening, World surface, public-language, Legacy containment and
diff checks pass. The matrix's global 14px checks are not full desktop typography acceptance.

Evidence: `/workspace/artifacts/watch-button-state-recovery-20261025/`.
Run the new test with Vite and `WATCH_STATE_PORT`, optionally `WATCH_STATE_OUT` for evidence.
No generated fixture HTML or evidence is committed under `work/`.

## Remaining visual and integration gates

The previous review's two behavior findings are addressed. Its desktop supporting-sentence
14px finding remains: Design V2 §§5.1/5.3 requires at least 15px for those sentences on desktop
and existing semantic type tokens. Typography, reduced border emphasis and final visual balance
remain Claude's presentation scope. This technical slice makes no palette or design change.
Claude must recheck ownership and use the exact new candidate head before that bounded pass.
Real `EmailVerify` presentation and representative writer/community/personal consumers still
need their scoped visual acceptance; tests must keep all OTP and channel writes intercepted.

The update-center remains a synthetic Preview. ZURIEL's visual acceptance precedes real-data
center wiring. Existing strict inbox helpers, known-vs-empty handling, confirmed IDs and canonical
Auth/account-scope guards remain the prepared technical seams. Person binding, complete public
metrics, private progress and the separate 573-row investigation are not completed by this fix.

No central/main merge, Production, DB/RLS, real follow/message/OTP/channel/consent write,
publication, identity merge, rank or billing change. No Claude agent is activated or dispatched.
Final SHA, exact protected Preview and released five-file scope are in PR #1159 and the AFTER.
