# הגדרת התחברות (Auth) — SOD1820

מצב נוכחי (2026-06-14): בקוד יש Google + Magic Link + OTP + סיסמה (`src/lib/auth.js`, `src/pages/AuthPage.jsx`).
במסד: משתמש 1 בלבד דרך **email**, **0 דרך Google** → Google עוד לא הופעל בצד השרת.

הקוד מפנה ל-`window.location.origin` → **חובה** שהדומיין החי יהיה ב-Redirect URLs, אחרת כל ההתחברויות נשברות.

פרטי פרויקט: ref = `linswmnnkjxvweumprav` · callback = `https://linswmnnkjxvweumprav.supabase.co/auth/v1/callback`
הנחה: דומיין חי = `https://sod1820.co.il` (לעדכן אם שונה).

---

## 🔴 1. דחוף — URL Configuration (מתקן את כל ההתחברויות)
**Supabase → Authentication → URL Configuration:**
- Site URL: `https://sod1820.co.il`
- Redirect URLs:
  ```
  https://sod1820.co.il/**
  https://www.sod1820.co.il/**
  https://sod1820-git-claude-gematria-cross-met-687b38-sod1820-s-projects.vercel.app/**
  http://localhost:5173/**
  ```

## 🔵 2. הפעלת Google
**Supabase → Authentication → Providers → Google → Enable** + Client ID & Secret.
**Google Cloud Console → OAuth 2.0 Client:**
- Authorized redirect URI: `https://linswmnnkjxvweumprav.supabase.co/auth/v1/callback`
- Authorized JavaScript origins: `https://sod1820.co.il` , `https://www.sod1820.co.il`

## ✉️ 3. מיילים (OTP / Magic Link)
- SMTP מותאם לפרודקשן.
- בתבנית Magic Link לוודא `{{ .Token }}` (קוד 6 ספרות).

---

## בדיקה אחרי הגדרה
- להתחבר באתר החי דרך Google ודרך מייל.
- לאמת ב-DB: `select provider, count(*) from auth.identities group by provider;` — אמור להופיע `google`.
