import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { requestEmailOtp, signInWithGoogle, signInWithPassword, verifyEmailOtp } from "../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../lib/emailOtp.js";
import { safeOAuthReturnPath } from "../lib/oauthReturn.js";
import { writerPersonalHref } from "../lib/userCenter/writerPersonal2029.js";
import { applySeo } from "../lib/seo.js";
import { use2029Palette } from "../lib/palette.js";
import "./auth2029.css";

// A native view of the existing Auth owner. No extra client, provider or role.
export default function Auth2029Page() {
  const { user, profile, loading, signOut } = useAuth();
  const palette = use2029Palette();
  const location = useLocation(), navigate = useNavigate();
  const target = safeOAuthReturnPath(new URLSearchParams(location.search).get("returnTo") || "/2029");
  const returnTo = target === "/" ? "/2029" : target;
  const preview = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
  const googleAvailable = !preview && !window.location.hostname.endsWith(".vercel.app");
  const [step, setStep] = useState("email"), [email, setEmail] = useState("");
  const [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const attempt = useRef(0), mounted = useRef(true), principal = useRef(user?.id || null);
  principal.current = user?.id || null;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; attempt.current++; }; }, []);
  useEffect(() => { applySeo({ title: "כניסה לחשבון", description: "כניסה לחשבון הקיים, לקהילה ולאזור האישי.", path: "/login", noindex: true }); }, []);
  useEffect(() => { setPassword(""); setCode(""); setError(""); }, [user?.id]);
  const nextLabel = returnTo.startsWith("/community/chat") ? "להמשך לקהילה" : "להמשך הגלישה";
  function changeStep(next) { if (busy) return; attempt.current++; setStep(next); setPassword(""); setCode(""); setError(""); }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const address = email.trim(), action = step;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { setError("הזינו כתובת מייל תקינה."); return; }
    if (action === "code" && !isValidEmailOtp(code)) { setError("הזינו את הקוד המלא מהמייל, 6–10 ספרות."); return; }
    if (action === "password" && !password) { setError("הזינו את הסיסמה שלכם."); return; }
    const requestId = ++attempt.current;
    const current = () => mounted.current && requestId === attempt.current;
    setBusy(true); setError("");
    try {
      if (action === "email") {
        await requestEmailOtp(address, { shouldCreateUser: !preview });
        if (current() && !principal.current) { setEmail(address); setStep("code"); }
      } else {
        const result = action === "password" ? await signInWithPassword(address, password) : await verifyEmailOtp(address, code);
        if (current() && result?.user?.id && (!principal.current || principal.current === result.user.id)) {
          setPassword(""); setCode(""); navigate(returnTo, { replace: true });
        }
      }
    } catch {
      if (current() && !principal.current) setError(action === "email" ? "לא הצלחנו לשלוח קוד. בדקו את כתובת המייל ונסו שוב." : action === "code" ? "הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש." : "המייל או הסיסמה אינם נכונים. אפשר להיכנס גם עם קוד למייל.");
    } finally { if (current()) setBusy(false); }
  }
  async function google() {
    if (busy) return;
    const requestId = ++attempt.current; setBusy(true); setError("");
    try { const result = await signInWithGoogle({ returnTo }); if (result?.error) throw result.error; }
    catch { if (mounted.current && requestId === attempt.current) { setError("לא הצלחנו לפתוח את הכניסה. אפשר להיכנס עם קוד למייל או סיסמה."); setBusy(false); } }
  }
  async function switchAccount() {
    attempt.current++; setBusy(true); setError("");
    try {
      await signOut();
      if (mounted.current) { setEmail(""); setPassword(""); setCode(""); setStep("email"); }
    } catch { if (mounted.current) setError("לא הצלחנו לצאת מהחשבון. נסו שוב."); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <Sod2029Shell surface="community" title="כניסה לחשבון" introVariant="none" status="חשבון" symbol="◎">
    <main className="sod29-auth" data-experience-surface="auth-2029" dir="rtl" style={{ "--auth29-danger": palette.dangerText }}>
      <header className="sod29-auth-intro">
        <span className="sod29-auth-eyebrow">המקום שלכם בקהילה</span>
        <h1>טוב לראות אתכם כאן</h1>
        <p>השיחות, ההודעות והאזור האישי שלכם — באותו חשבון.</p>
        <Link className="sod29-auth-return" to={returnTo}>חזרה לגלישה ←</Link>
      </header>
      <section className="sod29-auth-card" aria-labelledby="auth2029-title">
        {loading ? <p role="status">בודקים את החיבור לחשבון…</p> : user ? <>
          <span className="sod29-auth-eyebrow">החשבון מחובר</span>
          <h2 id="auth2029-title">שלום, {profile?.display_name || profile?.username || "חבר הקהילה"}</h2>
          <p>אפשר להמשיך מהמקום שבו עצרתם.</p>
          <Link className="sod29-auth-primary" to={returnTo}>{nextLabel} ←</Link>
          <Link className="sod29-auth-secondary" to={writerPersonalHref("public-page")}>האזור האישי שלי</Link>
          <button className="sod29-auth-link" type="button" disabled={busy} onClick={switchAccount}>כניסה עם חשבון אחר</button>
        </> : <>
          <h2 id="auth2029-title">{step === "code" ? "הקוד בדרך אליכם" : step === "password" ? "כניסה עם סיסמה" : "כניסה לחשבון"}</h2>
          <p>{step === "code" ? <>הזינו את הקוד שנשלח אל <b dir="ltr">{email}</b>.</> : step === "password" ? "השתמשו במייל ובסיסמה של החשבון שלכם." : "נשלח לכם קוד כניסה למייל, בלי צורך לזכור סיסמה."}</p>
          <form onSubmit={submit} aria-busy={busy}>
            {step !== "code" ? <><label htmlFor="auth2029-email">כתובת מייל</label><input id="auth2029-email" name="email" type="email" autoComplete="username" dir="ltr" placeholder="you@example.com" value={email} disabled={busy} required onChange={e => { setEmail(e.target.value); setError(""); }} /></> : null}
            {step === "password" ? <><label htmlFor="auth2029-password">סיסמה</label><input id="auth2029-password" name="password" type="password" autoComplete="current-password" dir="ltr" value={password} disabled={busy} required onChange={e => { setPassword(e.target.value); setError(""); }} /></> : null}
            {step === "code" ? <><label htmlFor="auth2029-code">קוד כניסה מהמייל</label><input id="auth2029-code" name="code" className="sod29-auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_OTP_MAX_LENGTH} dir="ltr" value={code} disabled={busy} autoFocus required onChange={e => { setCode(sanitizeEmailOtp(e.target.value)); setError(""); }} /></> : null}
            {error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
            <button className="sod29-auth-primary" type="submit" disabled={busy}>{busy ? "רגע, מתחברים…" : step === "email" ? "שלחו לי קוד כניסה" : "כניסה לחשבון ←"}</button>
          </form>
          <div className="sod29-auth-alternatives">
            <button className="sod29-auth-link" type="button" disabled={busy} onClick={() => changeStep(step === "email" ? "password" : "email")}>{step === "email" ? "כניסה עם סיסמה" : step === "code" ? "שינוי כתובת או בקשת קוד חדש" : "כניסה עם קוד למייל"}</button>
            {googleAvailable && step === "email" ? <button className="sod29-auth-secondary" type="button" disabled={busy} onClick={google}>המשך עם Google</button> : null}
          </div>
        </>}
        {user && error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
      </section>
      <footer className="sod29-auth-footer">החשבון שלכם נשאר פרטי. פרופיל ציבורי מוצג רק בהתאם לבחירות שלכם.</footer>
    </main>
  </Sod2029Shell>;
}
