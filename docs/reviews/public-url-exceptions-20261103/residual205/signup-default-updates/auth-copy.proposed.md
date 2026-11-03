# Minimal signup wording / activation requirements

Proposal only; no UI code or shared setting changed by this review. Reuse the existing AccountEntry, auth methods, local-return and transport policies. No redesign, extra checkbox, new prompt store or recovery feature.

Before enabled new-account actions (Google/Facebook and new-account email OTP), show:

> בהרשמה לחשבון חדש תקבלו גם עדכוני אתר במייל לאחר אימות הכתובת. אפשר להסיר בכל מייל. הסרה קודמת נשמרת. כניסה לחשבון קיים אינה משנה את ההרשמה לעדכונים.

Shorter if the layout already separates signup from existing login:

> חשבון חדש כולל עדכוני אתר במייל לאחר אימות הכתובת. אפשר להסיר בכל מייל; הסרה קודמת נשמרת.

While waiting for OTP, do not claim mail-list signup succeeded:

> הזינו את הקוד שנשלח למייל כדי להשלים את הכניסה או ההרשמה. חשבון חדש מצורף לעדכוני האתר רק לאחר האימות.

The signed-in existing-account sentence may remain truthful but distinguish ordinary login:

> החשבון מחובר. כניסה לחשבון קיים אינה מפעילה מודל, חיוב או שינוי בהרשמה לדיוור.

Do not display “explicit opt-in”, “checkbox consent”, “opening-only updates”, “all channels”, “welcome email sent” or “subscription restored”. A previous suppression is intentionally retained. Home remains a subscription UI without a removal button; this does not remove the signed unsubscribe route or links in actual mail.

## Exact existing client hold points (root-owned work)

- `src/components/auth2029/AccountEntry2029.jsx`: current existing-only heading, description and disabled social actions; configured methods remain server-derived. Enable only after revised shared policy is accepted, keep exact return/mounted-attempt/principal checks. Put notice before signup actions.
- `src/pages/Auth2029Page.jsx`: update existing-only wording once the server and callback gates actually pass; keep noindex and safe return.
- `src/lib/auth.js::requestEmailOtp`: currently forces `shouldCreateUser=false` for public-reading and omits acquisition. Once approved, restore only intended new-account creation; preserve metadata-free public-reading calls. A new signup does not authorize existing AuthContext marketing/credit/referral effects.
- `src/lib/oauthReturn.js::providerOAuthRequest`: only remove the explicit consent-pending hold after approval/readback, not trusted-origin or exact callback validation. Google/Facebook can create an account, so existing-login-only cannot safely distinguish them on the client.
- Existing public-reading auth worker emission is `accountAccess:'existing'`. Only choose the already-tested full-account auth policy after the new trigger and notice are ready; preserve endpoint/origin validation and all private/admin boundaries. No new toggle system.
- Legacy's currently enabled Auth entry (`src/pages/AuthPage.jsx`) uses the same project and must carry the same new-account notice if the new server rule is applied. Its existing password path is still login, not enrollment. There is no trustworthy client metadata escape hatch to leave Legacy auto-general while changing 2029 only.

Google/Facebook exact `/auth/callback` must exist in Supabase's Redirect URLs for the candidate origin and final Production origin as applicable. Existing provider-enabled settings do not prove those exact URLs. Keep current Site URL and entries; never fallback to Production from an unaccepted Preview. Real provider acceptance requires the owner's browser/account; synthetic fixture tests are not proof of OAuth return or mail delivery.

Password signup rows are covered by the server fixture, but a new password-signup or reset/recovery UI is not introduced here. Existing email OTP is the already-built new-account alternative once permitted. No live Auth user, OTP or newsletter was sent for this proposal.
