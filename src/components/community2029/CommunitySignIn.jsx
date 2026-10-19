import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, signInWithGoogle, signInWithPassword, signUpWithPassword, verifyEmailOtp } from "../../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z" /></svg>;
}

export default function CommunitySignIn() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const closeDialog = () => {
    if (busy) return;
    setOpen(false);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setStep("password");
  };

  const openDialog = (mode = "login") => {
    setAuthMode(mode);
    setStep("password");
    setError("");
    setNotice("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open || user) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog?.querySelectorAll('button:not([disabled]),input:not([disabled])') || []);
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previous?.focus?.(); };
  }, [open, user]);

  const changeStep = (next) => {
    setAuthMode("login");
    setStep(next);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
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
    try { await signInWithPassword(email, password); setPassword(""); setOpen(false); }
    catch { setError("האימייל או הסיסמה אינם נכונים."); }
    finally { setBusy(false); }
  };

  const signupPassword = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    if (!displayName.trim()) { setError("יש להזין שם שיופיע בקהילה."); return; }
    if (!EMAIL_PATTERN.test(email.trim())) { setError("יש להזין כתובת מייל תקינה."); return; }
    if (password.length < 8) { setError("הסיסמה צריכה להכיל לפחות 8 תווים."); return; }
    if (password !== confirmPassword) { setError("הסיסמאות אינן תואמות."); return; }
    setBusy(true);
    try {
      const result = await signUpWithPassword(email, password, { displayName });
      setPassword(""); setConfirmPassword("");
      if (result?.session) setOpen(false);
      else setNotice("שלחנו למייל קישור לאישור החשבון. לאחר האישור תוכלו להתחבר.");
    } catch { setError("לא הצלחנו להשלים את ההרשמה כרגע. בדקו את הפרטים ונסו שוב."); }
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

  const dialog = open ? createPortal(<div className="sod29-community-auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
    <section ref={dialogRef} className="sod29-community-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="community-auth-title" dir="rtl">
      <button type="button" className="sod29-community-auth-close" aria-label="סגירת חלון ההתחברות" disabled={busy} onClick={closeDialog}>×</button>
      <header><h2 id="community-auth-title">התחברות או הרשמה</h2><p>בחרו בדרך הנוחה לכם והמשיכו להשתתף בקהילה.</p></header>
      <button type="button" className="sod29-community-secondary sod29-community-google" disabled={busy} onClick={loginGoogle}><GoogleMark /> המשך עם Google</button>
      <div className="sod29-community-sign-in-divider" aria-hidden="true"><span>או</span></div>
      {step === "password" ? <>
        <div className="sod29-community-auth-tabs" role="tablist" aria-label="בחירת התחברות או הרשמה">
          <button type="button" role="tab" aria-selected={authMode === "login"} disabled={busy} onClick={() => { setAuthMode("login"); setError(""); setNotice(""); }}>התחברות</button>
          <button type="button" role="tab" aria-selected={authMode === "signup"} disabled={busy} onClick={() => { setAuthMode("signup"); setError(""); setNotice(""); }}>הרשמה</button>
        </div>
        {authMode === "login" ? <form className="sod29-community-auth-form" onSubmit={loginPassword}>
          <label htmlFor="community-sign-in-email"><span>אימייל</span><input id="community-sign-in-email" type="email" inputMode="email" autoComplete="username" dir="ltr" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@gmail.com" /></label>
          <label htmlFor="community-sign-in-password"><span>סיסמה</span><input id="community-sign-in-password" type="password" autoComplete="current-password" dir="ltr" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="••••••••" /></label>
          <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מתחבר…" : "התחברות"}</button>
        </form> : <form className="sod29-community-auth-form sod29-community-auth-form--signup" onSubmit={signupPassword}>
          <label htmlFor="community-sign-up-name"><span>השם שיופיע בקהילה</span><input id="community-sign-up-name" type="text" autoComplete="name" required maxLength={80} value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(""); }} placeholder="השם שלכם" /></label>
          <label htmlFor="community-sign-up-email"><span>אימייל</span><input id="community-sign-up-email" type="email" inputMode="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@gmail.com" /></label>
          <label htmlFor="community-sign-up-password"><span>סיסמה</span><input id="community-sign-up-password" type="password" autoComplete="new-password" dir="ltr" required minLength={8} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="לפחות 8 תווים" /></label>
          <label htmlFor="community-sign-up-confirm"><span>אימות סיסמה</span><input id="community-sign-up-confirm" type="password" autoComplete="new-password" dir="ltr" required minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} placeholder="הקלידו שוב" /></label>
          <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "נרשם…" : "יצירת חשבון"}</button>
        </form>}
        <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("email")}>כניסה או הרשמה עם קוד למייל</button>
      </> : step === "email" ? <form className="sod29-community-auth-form sod29-community-auth-form--otp" onSubmit={sendCode}>
        <label htmlFor="community-sign-in-email"><span>אימייל</span><input id="community-sign-in-email" type="email" inputMode="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@gmail.com" /></label>
        <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "שולח קוד…" : "שליחת קוד"}</button>
        <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("password")}>חזרה לאימייל וסיסמה</button>
      </form> : <form className="sod29-community-auth-form sod29-community-auth-form--otp" onSubmit={confirmCode}>
        <label htmlFor="community-sign-in-code"><span>הקוד שנשלח ל־<b dir="ltr">{email.trim()}</b></span><input id="community-sign-in-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required minLength={6} maxLength={EMAIL_OTP_MAX_LENGTH} value={code} onChange={(event) => { setCode(sanitizeEmailOtp(event.target.value)); setError(""); }} placeholder="קוד כניסה" /></label>
        <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מאמת…" : "התחברות"}</button>
        <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => changeStep("email")}>שינוי כתובת המייל</button>
      </form>}
      {notice ? <p className="sod29-community-sign-in-notice" role="status">{notice}</p> : null}
      {error ? <p className="sod29-community-sign-in-error" role="alert">{error}</p> : null}
    </section>
  </div>, document.body) : null;

  return <section className="sod29-community-sign-in sod29-community-sign-in--compact" aria-label="התחברות לקהילה">
    <div><h2>רוצים להשתתף?</h2><p>התחברו כדי להגיב, לעשות לייק ולשמור את הפעילות בחשבון שלכם.</p></div>
    <button ref={triggerRef} id="community-sign-in-trigger" type="button" className="sod29-community-primary" onClick={() => openDialog("login")}>התחברות / הרשמה</button>
    {dialog}
  </section>;
}

