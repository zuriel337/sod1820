# Shared EmailVerify2029: explicit presentation boundary and canonical focus

Task: `EMAIL_VERIFY_2029_BOUNDARY_20261025`.
BEFORE: `b620e93a-5d15-4353-a72b-1afdc4884673`.
Branch: `gpt/follow-center-preview-boundary-20261025` (draft PR #1159).
Base: `8655d77588582c2d2f9d36d03a40a520f02252ce`.

ZURIEL adopted the recommendation to extend the existing canonical `EmailVerify` for shared
2029 use. GPT prepares the nonvisual opt-in interface and connects the already approved native
keyboard-focus baseline. Claude remains the visual writer; this slice does not author a new
stylesheet, palette, form layout or authentication mechanism.

## Delivered technical seam

- Optional `variant="2029"` on the existing `EmailVerify`. No automatic URL/theme detection.
- Native-only root class `sod29-email-verify`, `data-variant="2029"`, `data-step` (email/code),
  and `data-state` (ready/pending/error) expose the existing component's real state.
- Native-only `data-field` (email/otp) and `data-action` (send/verify/change-email/resend)
  provide stable shared presentation selectors without depending on copied text or nested DOM.
- The native input stops supplying the Legacy inline `outline:none`, allowing the existing
  `.sod29-root.native-frame ... :focus-visible` rule to supply its canonical focus indicator.
  No new focus color/rule is invented. Default callers retain the original inline presentation.
- Only the existing WatchButton2029 identity slot opts in. Its default/Legacy slot is unchanged.

Variant selection never changes `source`, subscription intent, OTP validation, cooldown, resend,
callbacks, Auth provider, Follow state or account binding. `follow:` remains identity-only through
the existing intent helper. An explicit `subscribeToUpdates=false` also remains opted out. The
default behavior of existing surfaces declaring subscription intent is not rewritten here.

## Current caller map

| Caller | Current treatment / next scope |
| --- | --- |
| WatchButton2029 identity slot | Explicit native variant; existing card stylesheet still provides the current presentation under review |
| WatchButton default identity slot | Unchanged default; no global Legacy restyling |
| SubscribeGate → EmailVerify | Unchanged; no automatic migration. Five call sites occur in CipherPage, TzofenEmbed and BeitMidrashPage. TzofenEmbed is shared with native ELS, but its `experience2029` guard explicitly suppresses the Legacy SubscribeGate overlay; import presence does not justify adding another gate. |

The portable class/markers are the handoff point for Claude to move shared 2029 presentation into
this same component's visual owner and remove duplicated watch-card form overrides after adoption.
The new variant **does not yet provide complete standalone 2029 typography/colors**. It currently
retains existing inline presentation except the focus blocker; the remaining visual pass must
replace or supersede those Legacy values only for native consumers. It must not copy the card's
form rules into each page, add an OTP engine or silently opt in unrelated Legacy callers.

## Regression evidence

The new actual-component browser fixture loads the real native-frame focus stylesheet and uses
canonical EmailVerify directly and inside the real WatchButton. All OTP/verify replies are
synthetic and every other remote request is blocked. No mail, Auth account, consent or product
record is changed.

The unchanged base passes its default-compatibility case but fails the other 19 keyboard-focus
cases. All 20 pass after the correction:

- Watch slot and direct native instance × three presets × 320/390/1440, with visible keyboard
  focus on email and OTP inputs, including code-error recovery.
- Stable variant/field/action/state markers across email, code and client/server error states.
- Empty/short code is rejected before a verification request; a valid-length rejected code
  preserves the existing error flow and never fires a success callback.
- Resend cooldown is retained; changing email returns to the existing email step.
- Follow provenance and explicit opt-out issue no subscriber/channel calls. Any unexpected
  endpoint or method fails the test rather than reaching the network.
- Default form still has no native markers and retains its original inline outline/font values.

This is functional/focus evidence. The direct native instance is not claimed to meet the full
standalone visual specification before Claude supplies its shared presentation.

Ten focused Node entrypoints, Legacy/default 2029 and flag-enabled 2029 builds pass. The existing
18-case identity type/target/contrast audit, six Watch state cases and four default Watch variants
pass. Production lock, route hardening, World surface, public-language, Legacy containment and
diff checks pass. The existing 43-case center matrix passes with no page errors or unexpected
writes. The keyboard check also verifies a solid outline in the canonical focus-role color.
The exact SHA/Preview are recorded in the final AFTER.
Evidence is under
`/workspace/artifacts/email-verify-2029-boundary-20261025/`.

## Remaining gates and handoff

Claude should recheck ownership and open a fresh BEFORE over the final candidate HEAD. Use the
explicit native variant and stable selectors, retain canonical focus and semantic type tokens,
and consolidate the shared form treatment under the existing component. Recheck email/code/error
at all three widths/presets inside and outside the card. Preserve consent, source provenance,
Watch `confirmed`/`identityRequired`, retry/account-scope guards and the fixture boundary.

No callable Claude executor is available in this environment; no task activation or delivery is
claimed. The continuation is passive to ZURIEL in the existing journal. Full visual completion
and ZURIEL's acceptance still precede real-data Follow Center wiring. No central/main merge,
Production, DB/RLS, live OTP/message/follow/inbox/consent write, identity merge, grade or billing
work. Scope release and exact final artifact are recorded in the AFTER.
