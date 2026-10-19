import React, { useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, signInWithGoogle, signInWithPassword, verifyEmailOtp } from "../../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z" /></svg>;
}

export default function CommunitySignIn() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changeStep = (next) => {
    setStep(next);
    setCode("");
    setPassword("");
    setError("");
  };

  const loginGoogle = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const returnTo = typeof window === "undefined" ? "/community/chat" : `${window.location.pathname}${window.location.search}`;
      const result = await signInWithGoogle({ returnTo });
      if (result?.error) throw result.error;
    } catch (err) {
      setError(err?.code === "OAUTH_PREVIEW_UNVERIFIED"
        ? "התחברות עם Google אינה זמינה בפריוויו המוגן. אפשר לבדוק אותה באתר החי."
        : "לא הצלחנו לפתוח את ההתחברות עם Google. נסו שוב.");
    } finally { setBusy(false); }
  };

  const loginPassword = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!EMAIL_PATTERN.test(email.trim())) { setError("יש להזין כתובת מייל תקינה."); return; }
    if (!password) { setError("יש להזין סיסמה."); return; }
    setBusy(true);
    try { await signInWithPassword(email, password); setPassword(""); }
    catch { setError("האימייל או הסיסמה אינם נכונים."); }
    finally { setBusy(false); }
  };

  const sendCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!EMAIL_PATTERN.test(email.trim())) { setError("יש להזין כתובת מייל תקינה."); return; }
    setBusy(true);
    try { await requestEmailOtp(email); setStep("code"); }
    catch { setError("לא הצלחנו לשלוח קוד כרגע. נסו שוב."); }
    finally { setBusy(false); }
  };

  const confirmCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!isValidEmailOtp(code)) { setError("יש להזין את הקוד המלא שקיבלתם במייל."); return; }
    setBusy(true);
    try { await verifyEmailOtp(email, code); setCode(""); }
    catch { setError("הקוד שגוי או שפג תוקפו. בדקו אותו ונסו שוב."); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="sod29-community-sign-in" role="status">בודק התחברות…</div>;
  if (user) return <section className="sod29-community-sign-in sod29-community-signed-in" aria-label="חשבון הקהילה" data-community-admin={isAdmin ? "true" : undefined}>
    <div><div className="sod29-community-account-line"><strong>מחובר/ת כ־{profile?.display_name || profile?.username || user.email}</strong>{isAdmin ? <span className="sod29-community-admin-badge">מצב מנהל</span> : null}</div><span>{isAdmin ? "אפשר למחוק הודעות, להסתיר ולשחזר שרשורים ולטפל בדיווחים." : "הפעילות שלך בקהילה נשמרת בחשבון הזה."}</span></div>
    <button type="button" className="sod29-community-secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await signOut(); changeStep("password"); } catch { setError("ההתנתקות נכשלה. נסו שוב."); } finally { setBusy(false); } }}>החלפת חשבון</button>
    {error ? <p role="alert">{error}</p> : null}
  </section>;

  return <section className="sod29-community-sign-in" aria-label="התחברות לקהילה">
    <div><h2>התחברות</h2><p>התחברו כדי להשתתף בשיחה. אפשר לבחור Google, מייל וסיסמה, או קוד חד־פעמי למייל.</p></div>
    <button type="button" className="sod29-community-secondary sod29-community-google" disabled={busy} onClick={loginGoogle}><GoogleMark /> המשך עם Google</button>
    <div className="sod29-community-sign-in-divider" aria-hidden="true"><span>או</span></div>
    {step === "password" ? <>
      <form className="sod29-community-auth-form" onSubmit={loginPassword}>
        <label htmlFor="community-sign-in-email"><span>אימייל</span><input id="community-sign-in-email" type="email" inputMode="email" autoComplete="username" dir="ltr" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@gmail.com" /></label>
        <label htmlFor="community-sign-in-password"><span>סיסמה</span><input id="community-sign-in-password" type="password" autoComplete="current-password" dir="ltr" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="••••••••" /></label>
        <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מתחבר…" : "התחברות"}</button>
      </form>
      <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("email")}>אין לכם סיסמה? קבלת קוד למייל</button>
    </> : step === "email" ? <form className="sod29-community-auth-form sod29-community-auth-form--otp" onSubmit={sendCode}>
      <label htmlFor="community-sign-in-email"><span>אימייל</span><input id="community-sign-in-email" type="email" inputMode="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@gmail.com" /></label>
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "שולח קוד…" : "שליחת קוד"}</button>
      <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("password")}>כניסה עם סיסמה</button>
    </form> : <form className="sod29-community-auth-form sod29-community-auth-form--otp" onSubmit={confirmCode}>
      <label htmlFor="community-sign-in-code"><span>הקוד שנשלח ל־<b dir="ltr">{email.trim()}</b></span><input id="community-sign-in-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required minLength={6} maxLength={EMAIL_OTP_MAX_LENGTH} value={code} onChange={(event) => { setCode(sanitizeEmailOtp(event.target.value)); setError(""); }} placeholder="קוד כניסה" /></label>
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מאמת…" : "התחברות"}</button>
      <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("email")}>שינוי כתובת המייל</button>
    </form>}
    {error ? <p className="sod29-community-sign-in-error" role="alert">{error}</p> : null}
  </section>;
}

