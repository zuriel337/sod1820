# Final-preparation auth/mail review (read only)

Base: `957e4a6a7148f20cadd921303d8c9a86a8b6a7b5`. No repository edits, shared writes, sends, signup or OAuth starts. Evidence and exact paths: `/tmp/finalprep-auth-mail-review.json`.

Existing-account login/basic operations remain **ACCEPTED_USER_REPORTED on 7360**, in both accounts. Do not reopen them or attribute them to b21.

| Item | Actual current condition | Minimum next action |
|---|---|---|
| Existing password/OTP login | Already available and user accepted. OTP forcibly uses `create_user:false`. | No shared change. OTP is the password-free access alternative, not password replacement. |
| A — Google/Facebook/new account | Providers are enabled, but current public-reading code/worker intentionally blocks these. Live `handle_new_user` still implicitly adds every new email account to mailing. | Approve/apply only the exact consent-trigger SQL; then activate prepared client/worker paths with isolated tests. Keep no acquisition metadata, role, credit or marketing side effects. |
| B — Home site updates | Live schema lacks `site_updates_consented_at`; current OPTIONS only advertises `opening-parts-v1`. | Approve/apply site-updates-purpose SQL + existing newsletter-signup Edge sources (`verify_jwt=false`). No send or historical consent widening. |
| C — Campaign sending | Not needed merely to collect approved site-updates consent. Existing send/backfill/reengage/track consumers already exclude this new cohort. | Keep optional until an explicit site-updates campaign is requested. Then deploy reviewed send-newsletter change (`verify_jwt=true`). |
| D — Signed unsubscribe | v9 still reports success despite SDK error, exception or zero matches; offline proof source matches current code/runtime. | Prepare targeted error/persistence acknowledgement correction and isolated tests, then exact shared Edge approval. Preserve existing signed links and GET/POST continuity. Home stays signup-only. |
| Password reset | No existing Legacy or 2029 reset route/API wiring. b21 does not implement it. | Exclude from this no-expansion round; correct stale grouped blocker wording. Existing OTP remains the supported login alternative. |

## Fresh evidence

- Read-only DB connection verified; trigger MD5 `8cbc40e56e8d8ce9869f70e09535a7e5` equals b21's exact-source guard. It still inserts subscribers and newsletter signup events.
- Auth settings GET: Google/Facebook/email enabled; signup server enabled; email confirmation required. No auth flow started.
- Edge versions/hash receipts match: signup19, send16, unsubscribe9, welcome-backfill8, reengage3, nl-track3. Purpose SQL and Edge proposal sources have no changes since b21.
- The existing five-sender guard deployment on 2 November is valid evidence; do not re-propose or redeploy it wholesale.
- b21 already has seven isolated trigger checks and twelve purpose SQL checks. No tests were rerun in this audit.

## Client-only work root can prepare now

1. Prepare bounded OAuth/signup activation delta in `AccountEntry2029`, `auth.js`, `oauthReturn.js` and public-reading worker. The generic full-account Auth transport is already implemented/tested; preserve old preview defaults. Activation depends on A being applied, not on B/C.
2. Keep `PUBLIC_READING_RELEASE` login side effects passive. New public-reading signup must continue omitting acquisition/visitor metadata.
3. Reuse existing PKCE callback/storage/return implementation. Test exact-origin return, cancellation, account switch, denial and worker upgrade in isolation.
4. Prepare D's precise Edge correction and failure/idempotency tests. Do not remove signed unsubscribe because Home has no unsubscribe button.

## Dashboard and real-owner acceptance

Public settings do not expose the redirect allowlist. Verify only the chosen protected origin plus `/auth/callback` in Supabase Auth URL configuration, and the canonical `https://sod1820.co.il/auth/callback` for the eventual public artifact. Preserve Site URL/other entries; no wildcard. Build-time `VITE_AUTH_VERIFIED_PREVIEW_ORIGINS` must match that exact approved preview origin. Provider consoles keep the same Supabase callback; current evidence does not justify changing keys, scopes or provider settings.

After A/B/D application: owner checks Google and Facebook return/cancel/switch, a newly created owned account with no implicit newsletter row, explicit Home consent and signed opt-out. Existing-account acceptance is retained; these are narrower new acceptances. No credentials or signed links belong in the report.

**B limitation:** differently purposed or opted-out existing emails return `verification-required`; there is currently no verification-completion action. b21 alone therefore does not support upgrading every existing owner address. Do not treat basic account acceptance as newsletter consent acceptance. Any exact verified-owner extension must remain in the existing endpoint and be separately reviewed, without automatic reactivation.

Recommended approval packet: **A + B + precise D**. Separate **C** until campaign sending; exclude new password reset. The reason to apply is the current functional/privacy defect, not an old WAIT label. No website cutover is included.
