import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, signInWithConfiguredProvider, signInWithPassword, verifyEmailOtp } from "../../lib/auth.js";
import { useAuthMethods } from "../../lib/authMethods.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";
import { safePreviewOAuthReturnPath } from "../../lib/oauthReturn.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { use2029Palette } from "../../lib/palette2029.js";
import "../../pages/auth2029.css";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../../lib/publicLaunch2029.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";

// Canonical shared entry. Variants change presentation, never enabled providers.
export default function AccountEntry2029({ returnHref = "/2029", inline = false, variant = "default" }) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const palette = use2029Palette();
  const navigate = useNavigate();
  const target = safePreviewOAuthReturnPath(returnHref);
  const returnTo = target;
  const preview = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
  const methods = useAuthMethods((!PUBLIC_LAUNCH_READ_ONLY_PREVIEW || PUBLIC_READING_RELEASE) && !loading && !user);
  const fieldId = useId();
  const [step, setStep] = useState("email"), [email, setEmail] = useState("");
  const [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const attempt = useRef(0), mounted = useRef(true), principal = useRef(user?.id || null);
  principal.current = user?.id || null;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; attempt.current++; }; }, []);
  useEffect(() => { setPassword(""); setShowPassword(false); setCode(""); setError(""); }, [user?.id]);
  const nextLabel = returnTo.startsWith("/community/chat") ? "להמשך לקהילה" : "להמשך הגלישה";
  function changeStep(next) { if (busy) return; attempt.current++; setStep(next); setPassword(""); setShowPassword(false); setCode(""); setError(""); }
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
        await requestEmailOtp(address, { shouldCreateUser: PUBLIC_READING_RELEASE || !preview || import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true" });
        if (current() && !principal.current) { setEmail(address); setStep("code"); }
      } else {
        const result = action === "password" ? await signInWithPassword(address, password) : await verifyEmailOtp(address, code);
        if (current() && result?.user?.id && (!principal.current || principal.current === result.user.id)) {
          setPassword(""); setCode(""); if (!inline) navigate(returnTo, { replace: true });
        }
      }
    } catch (failure) {
      // A 5xx from the code request (for example "Error sending confirmation email") does not prove that no mail left: the code may
      // still arrive. Never strand the person on the email step with nowhere to type it.
      if (action === "email" && Number(failure?.status) >= 500 && current() && !principal.current) {
        setEmail(address); setStep("code");
        setError("לא הצלחנו לאשר את שליחת הקוד, אבל ייתכן שהמייל בדרך. אם קיבלתם קוד, הזינו אותו כאן. אחרת אפשר לבקש קוד חדש.");
        return;
      }
      if (current() && !principal.current) setError(action === "email" ? "לא הצלחנו לשלוח קוד. בדקו את כתובת המייל ונסו שוב." : action === "code" ? "הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש." : "המייל או הסיסמה אינם נכונים. אפשר להיכנס גם עם קוד למייל.");
    } finally { if (current()) setBusy(false); }
  }
  async function federated(provider) {
    if (busy || !methods.oauth.some(method => method.id === provider && method.available)) return;
    const requestId = ++attempt.current; setBusy(true); setError("");
    try { const result = await signInWithConfiguredProvider(provider, { returnTo }); if (result?.error) throw result.error; }
    catch { if (mounted.current && requestId === attempt.current) { setError("לא הצלחנו לפתוח את הכניסה. אפשר להיכנס עם קוד למייל או סיסמה."); setBusy(false); } }
  }
  async function switchAccount() {
    attempt.current++; setBusy(true); setError("");
    try {
      await signOut({ scope: "local" });
      if (mounted.current) { setEmail(""); setPassword(""); setCode(""); setStep("email"); }
    } catch { if (mounted.current) setError("לא הצלחנו לצאת מהחשבון. נסו שוב."); }
    finally { if (mounted.current) setBusy(false); }
  }
  if (PUBLIC_LAUNCH_READ_ONLY_PREVIEW && !PUBLIC_READING_RELEASE) return <section className="sod29-auth-card sod29-account-entry" data-auth-state="acceptance-pending"><h2>החשבון ייפתח בהמשך</h2><p>כרגע אפשר לקרוא ולגלות את התוכן הציבורי. כניסה ופעולות אישיות עדיין אינן זמינות בגרסה זו.</p><Link to={target}>חזרה לגלישה ←</Link></section>;
  return <section className="sod29-auth-card sod29-account-entry" data-auth-state={loading ? "loading" : user ? "signed-in" : "guest"} style={{ "--auth29-danger": palette.dangerText }} aria-labelledby={`${fieldId}-title`}>
        {loading ? <p role="status">בודקים את החיבור לחשבון…</p> : user ? <>
          {!inline ? <span className="sod29-auth-eyebrow">החשבון מחובר</span> : null}
          <h2 id={`${fieldId}-title`}>שלום, {profile?.display_name || profile?.username || "חבר הקהילה"}</h2>
          {variant === "account" ? <small dir="ltr">{user.email || ""}</small> : null}
          {PUBLIC_READING_RELEASE ? <p>החשבון מחובר. השמורים, הפנקס והפרופיל שלכם נמצאים באזור האישי. כניסה לחשבון קיים אינה מפעילה מודל, חיוב או שינוי בהרשמה לדיוור.</p> : !inline ? <p>אפשר להמשיך מהמקום שבו עצרתם.</p> : null}
          {!inline ? <Link className="sod29-auth-primary" to={returnTo}>{nextLabel} ←</Link> : null}
          {!inline ? <Link className="sod29-auth-secondary" to={writerPersonalHref("research")}>האזור האישי שלי</Link> : null}
          <button className="sod29-auth-link" type="button" disabled={busy} onClick={switchAccount}>{variant === "account" ? "התנתקות" : "כניסה עם חשבון אחר"}</button>
        </> : <>
          <h2 id={`${fieldId}-title`}>{step === "code" ? "הקוד בדרך אליכם" : step === "password" ? "כניסה עם סיסמה" : "כניסה והרשמה"}</h2>
          <p>{step === "code" ? <>הזינו את הקוד שנשלח אל <b dir="ltr">{email}</b>.</> : step === "password" ? "השתמשו במייל ובסיסמה של החשבון שלכם." : "בחרו כיצד להיכנס לחשבון שלכם."}</p>
          {PUBLIC_READING_RELEASE ? <aside className="sod29-auth-method-note" data-signup-updates-policy="existing-site-default"><strong>הרשמה ועדכוני האתר</strong><p>בהרשמה לחשבון חדש תקבלו גם עדכוני אתר במייל. אפשר להסיר בכל מייל. הסרה קודמת נשמרת. כניסה לחשבון קיים אינה משנה את ההרשמה לעדכונים.</p></aside> : null}
          {methods.state === "loading" ? <p role="status">טוענים אפשרויות כניסה…</p> : methods.state === "unavailable" ? <div role="alert"><p>לא הצלחנו לטעון את אפשרויות הכניסה.</p><button type="button" className="sod29-auth-secondary" onClick={methods.retry}>נסו שוב</button></div> : null}
          {methods.state === "ready" && methods.email ? <form onSubmit={submit} aria-busy={busy}>
            {step !== "code" ? <><label htmlFor={`${fieldId}-email`}>כתובת מייל</label><input id={`${fieldId}-email`} name="email" type="email" autoComplete="username" dir="ltr" placeholder="you@example.com" value={email} disabled={busy} required onChange={e => { setEmail(e.target.value); setError(""); }} /></> : null}
            {step === "password" ? <><label htmlFor={`${fieldId}-password`}>סיסמה</label><input id={`${fieldId}-password`} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" dir="ltr" value={password} disabled={busy} required onChange={e => { setPassword(e.target.value); setError(""); }} /><button type="button" className="sod29-auth-link" aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)}>{showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}</button></> : null}
            {step === "code" ? <><label htmlFor={`${fieldId}-code`}>קוד כניסה מהמייל</label><input id={`${fieldId}-code`} name="code" className="sod29-auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_OTP_MAX_LENGTH} dir="ltr" value={code} disabled={busy} autoFocus required onChange={e => { setCode(sanitizeEmailOtp(e.target.value)); setError(""); }} /></> : null}
            {error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
            <button className="sod29-auth-primary" type="submit" disabled={busy}>{busy ? "רגע, מתחברים…" : step === "email" ? "שלחו לי קוד כניסה" : "כניסה לחשבון ←"}</button>
          </form> : null}
          <div className="sod29-auth-alternatives">
            {methods.state === "ready" && methods.email && step === "email" ? <button className="sod29-auth-link" type="button" disabled={busy} data-auth-action="have-code"
              onClick={() => { const address = email.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { setError("הזינו קודם את כתובת המייל שאליה נשלח הקוד."); return; } setEmail(address); setStep("code"); setError(""); }}>כבר קיבלתי קוד</button> : null}
            {methods.state === "ready" && methods.email ? <button className="sod29-auth-link" type="button" disabled={busy} onClick={() => changeStep(step === "email" ? "password" : "email")}>{step === "email" ? "כניסה עם סיסמה" : step === "code" ? "שינוי כתובת או בקשת קוד חדש" : "כניסה עם קוד למייל"}</button> : null}
            {methods.oauth.map(method => <button key={method.id} className="sod29-auth-secondary" type="button" disabled={busy || !method.available} aria-describedby={!method.available ? `${fieldId}-oauth-state` : undefined} onClick={() => federated(method.id)}>המשך עם {method.label}</button>)}
            {methods.oauth.some(method => !method.available) ? <p id={`${fieldId}-oauth-state`} className="sod29-auth-method-note">{"הכניסה עם Google ו־Facebook ממתינה לאישור כתובת החזרה. אפשר להיכנס עם מייל וסיסמה או קוד למייל."}</p> : null}
          </div>
        </>}
        {user && error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
      </section>;
}
