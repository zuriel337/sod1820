# בית, סרגל וגישת מנהל — מועמד 3.11.2026

Task: `PUBLIC_LAUNCH_ADMIN_FULL_ACCESS_AUTH_20261103`.
Branch: `gpt/2029-admin-full-access-auth-20261103`.
Product base: `c8e05790fe68c8f548e22a7c02e5094ddc5b8755`, freshly verified against origin.
Claude handoff: `claude/home-updates-widget-design-7lzyzb` / `c125b47929385074ddf32a2da94b82e586ebdeca`, same base. Only its 14-file delta was imported; no old whole-file replacement.

## Implemented

- Claude's labelled, one-shot glass illustration is the Home entry. A clear “האתר בבנייה” notice and inline construction icon explain current availability. The series remain immediately below; the former lead article remains further down, with its original content/link. No product content was removed or rewritten.
- Home offers only site-update signup and privacy information. Unsubscribe wording was removed from this card. Existing signed unsubscribe/suppression remains unchanged elsewhere.
- The central Raziel orb is purple with a small “בבנייה” badge. Here has a construction badge that does not cover its label. Both are disabled for public/member viewers on every 2029 Frame surface; verified admin can open them. The compact centered dock, Now, ticker and underlying navigation context remain.
- The public-reading deployment ceiling now permits the verified administrator's existing feature actions, through the existing canonical gate. Public/member launch closures remain. Required missing flags, pending identity/policy, revoked roles and stale responses fail closed.
- Explicit admin requests are independently verified against Auth and the caller's own canonical admin identity before transport. The same-origin personal-profile adapter reuses the existing ownership/RLS handler and verifies admin on the server. No browser role claim, service role, private role cache or public write bypass is used.
- Research startup can read the admin's saved work; login/navigation do not replay pending writes. Existing explicit save/retry authorizes the existing queue. Pending journals, account isolation and exact return are preserved. Private image upload retains signed ownership intent and revalidates caller identity before each chunk/retry; actual upload was not performed.
- Login remains passive: no automatic model, credit/referral grant, marketing activation or avatar write. Existing financial activation stays denied. The server's existing cost, role, ownership and idempotency rules remain authoritative.

## Current user decision: shared changes WAIT

ZURIEL chose “להשאיר את שינויי השרת ממתינים” on the exact tested proposal at `b21ed1ff399e86e1aed4d97f8eccda0954f1ff23`.

- Password and email-code login for **existing** accounts are available in this candidate. Public-reading OTP forcibly uses `shouldCreateUser:false`; the emitted SW rejects new-account requests.
- Google/Facebook are displayed truthfully as pending. OAuth can create a new account, and the current shared Auth trigger implicitly subscribes new accounts to mailing. Therefore these flows stay inactive in this candidate until the separately proposed consent correction is approved/applied. Legacy's current social login remains untouched.
- Site-update signup probes the server only after a click. The live server currently supports `opening-parts-v1`, not `site-updates-v1`; it shows unavailable and does not silently subscribe a different purpose. No test registration/email was sent.
- The SQL and two Edge-source changes are **prepared and tested only**, not applied or deployed. Live versions read: newsletter-signup19 and send-newsletter16, unchanged. The precise proposal, rollback artifacts, Legacy implication and tests are in [shared-change-proposal](./shared-change-proposal/README.md).
- Future social login also needs the exact protected Preview callback allowlisted in Supabase Auth. No dashboard settings, Site URL, domains, shared flags or existing callback entries changed.

## Acceptance before hosting

| Evidence | Result |
| --- | --- |
| Focused identity, role, transport, denial, research, return, media, signup/source tests | 126 passed, 0 skipped |
| Publication adapter/admission + real local SW replacement/Legacy rollback simulation | 26 passed, 0 skipped |
| Actual Home/Frame controlled browser fixture | 10 cases passed; 320/390/1440, three themes, reduced/normal motion |
| Actual signup component controlled browser | 6 cases passed; cancellation/account replacement included |
| Existing media transport + research path continuity | PASS; 6 path continuity cases |
| Additive mail SQL, isolated clean/existing shapes | 12 checks passed; no live apply |
| Actual observed Auth trigger SQL, isolated synthetic accounts | 7 checks passed; no live apply |
| Full Legacy + 2029 build; dedicated publication artifact build | PASS; existing large-chunk advisory remains |
| Legacy production lock, one-tree contract, diff whitespace check | PASS |

The single initial focused-suite failure was a fixture missing the new canonical AuthContext dependency, before any test executed. The fixture now supplies explicit roles and verifies both public denial and admin admission. No production test was weakened. The initial Here badge overlap was corrected and a rectangle-overlap assertion added.

[Browser evidence](./browser-fixture.md) contains source hashes and synthetic screenshots. These are **not real-account acceptance**, a performance comparison or proof of a live model/write. No new broad optimization or full Isolation/ELS/G4 claim is made for this SHA. The exact protected deployment will be checked separately with real public data and an independent no-write guard.

## Still open

1. Real administrator login and intentional feature operations by the account owner. Controlled role tests do not prove those live operations.
2. Shared signup/newsletter proposal, held by the user; exact OAuth Preview callback and real Google/Facebook return thereafter.
3. Existing signed unsubscribe defect previously recorded in the evidence handoff remains a separate fix/acceptance item; this task did not change its server.
4. Launch transition conditions remain separate: current backup freshness and actual media-byte coverage. Historical H1 database restore was already accepted and is not reopened here.
5. Production activation remains dormant and requires the separate exact cutover decision. This candidate does not merge/push main, deploy the live website, change aliases, shared flags, DB/RLS or any Edge runtime.

Root is the sole integrator. Internal writers had nonoverlapping auth/transport, research/runtime and controlled acceptance scopes under BEFORE `aa4a757e-4dcc-467c-b902-4521b17dc4ef`.
