# Supabase e-mail templates for sign-up and password recovery (proposal, not applied)

Status: **proposal only**. Nothing here was applied to Supabase. Changing an e-mail template is a project setting
(Authentication → Emails → Templates) and needs ZURIEL's explicit approval, like every Auth setting (CLAUDE.md §0.4).

## Why

Read from real mails received on 11.11.2026 (project `linswmnnkjxvweumprav`, sender `no-reply@sod1820.co.il`):

| Mail | Template | Today |
| --- | --- | --- |
| New account, first request | **Confirm signup** | English, **link only** (`{{ .ConfirmationURL }}`), no code |
| Existing account, code request | **Magic Link** | Hebrew, code only (`{{ .Token }}`, 8 digits) |
| Password recovery | **Reset Password** | English, link only |

The sign-in card tells the person "if the mail has a code, enter it here; if it has a link, click it", so a new account that
chooses to type a code has nothing to type. The site already accepts the sign-up code: `verifyEmailOtp` tries type `email`
and, for an unconfirmed account, type `signup` with the same code, and the service worker admits both types. Only the template
is missing the code. The link keeps working exactly as before (PKCE, same browser).

## Confirm signup (exact text)

Subject (Authentication → Emails → Templates → *Confirm signup* → Subject heading):

```
אישור הרשמה וקוד כניסה — סוד 1820
```

Message body (HTML):

```html
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;text-align:center;padding:24px;">
  <h2 style="color:#1b1420;">ברוכים הבאים לסוד 1820</h2>
  <p style="font-size:16px;color:#444;">כדי לאשר את הכתובת ולסיים את ההרשמה, בחרו דרך אחת:</p>
  <p style="font-size:16px;color:#444;margin:20px 0 6px;"><b>1. הזינו את הקוד באתר:</b></p>
  <p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:12px 0 24px;color:#b8860b;">{{ .Token }}</p>
  <p style="font-size:16px;color:#444;margin:20px 0 6px;"><b>2. או לחצו על הקישור</b> (באותו דפדפן ובאותו מכשיר שבהם נרשמתם):</p>
  <p style="margin:12px 0 24px;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;">אישור כתובת המייל</a></p>
  <p style="color:#999;font-size:13px;">הקוד והקישור תקפים פעם אחת, ורק האחרון שנשלח תקף.<br>אם לא נרשמתם לסוד 1820 — אפשר להתעלם מהמייל.</p>
</div>
```

Rules for the edit:
- Keep **both** `{{ .Token }}` and `{{ .ConfirmationURL }}`. Do not replace the link with a hand-built URL: Auth builds it with the PKCE
  token and the `redirect_to` of `https://sod1820.co.il/auth/callback`.
- The code length is the project's OTP length (8 digits today); the page accepts 6–10.
- Code and link are two forms of the same single-use confirmation: using either consumes it.

## Check after the edit (needs a mailbox; ~2 minutes)

1. On the sign-in card enter a **new** address → "שלחו לי קוד כניסה".
2. The mail shows an 8-digit code and a button. Enter the code on the site → signed in, new account confirmed.
3. Repeat with another new address and click the button in the same browser → returns to `/auth/callback`, signed in.
4. An existing account still receives the Hebrew Magic Link mail with a code (unchanged template).

## Optional: Reset Password (Hebrew, link only)

Not required for the feature (recovery is link-only by design: the link carries the PKCE exchange). To match the other mails:

Subject: `בחירת סיסמה חדשה — סוד 1820`

```html
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;text-align:center;padding:24px;">
  <h2 style="color:#1b1420;">בחירת סיסמה חדשה</h2>
  <p style="font-size:16px;color:#444;">ביקשתם לבחור סיסמה לחשבון שלכם בסוד 1820. הקישור חד־פעמי; פתחו אותו באותו דפדפן ובאותו מכשיר שבהם ביקשתם אותו.</p>
  <p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;">בחירת סיסמה</a></p>
  <p style="color:#999;font-size:13px;">זה עובד גם אם נרשמתם עם Google ועדיין אין לכם סיסמה: החשבון נשאר אותו חשבון.<br>אם לא ביקשתם — אפשר להתעלם מהמייל.</p>
</div>
```
