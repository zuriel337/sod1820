import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import {
  confirmSignupCode, requestPasswordReset, resendSignupCode, setNewPassword, signInWithConfiguredProvider, signInWithPassword,
  signUpWithPassword, verifyRecoveryCode,
} from "../../lib/auth.js";
import { useAuthMethods } from "../../lib/authMethods.js";
import {
  PASSWORD_MIN_LENGTH, RESEND_COOLDOWN_SECONDS, STAGE_TEXT, accountCreationAllowed, describeAuthFailure, isEmailAddress, normalizeEmail, passwordProblem,
} from "../../lib/accountPassword.js";
import { armNewPasswordStep, disarmNewPasswordStep, newPasswordStepArmed, setAccountFlash, takeAccountFlash } from "../../lib/accountFlowMemory.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";
import { safePreviewOAuthReturnPath } from "../../lib/oauthReturn.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { use2029Palette } from "../../lib/palette2029.js";
import "../../pages/auth2029.css";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../../lib/publicLaunch2029.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";

// Canonical shared entry. Variants change presentation, never enabled providers.
// Accounts are e-mail + password. An address is confirmed, and a password is reset, by typing a code from the e-mail: no link is ever
// required, so it works in any browser or device. Steps: signin | signup | confirm | reset | reset-code | reset-new.
const TITLES = Object.freeze({
  signin: "כניסה עם מייל וסיסמה",
  signup: "פתיחת חשבון חדש",
  confirm: "אימות כתובת המייל",
  reset: "קביעת סיסמה או איפוס",
  "reset-code": "הזינו את קוד האיפוס",
  "reset-new": "בחרו סיסמה חדשה",
});
const SENT_SIGNUP = "ביקשנו לשלוח קוד אימות לכתובת. הזינו אותו כאן כדי להשלים את הפתיחה.";
const SENT_RESET = "ביקשנו לשלוח קוד איפוס לכתובת. הזינו אותו כאן כדי לבחור סיסמה חדשה.";
const CODE_VERIFIED = "הקוד אומת. בחרו עכשיו סיסמה חדשה לחשבון.";

export default function AccountEntry2029({ returnHref = "/2029", inline = false, variant = "default" }) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const palette = use2029Palette();
  const navigate = useNavigate();
  const target = safePreviewOAuthReturnPath(returnHref);
  const returnTo = target;
  const preview = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
  // The same gate covers sign-up and password reset: both need the full-account transport that a read-only preview does not admit.
  const canCreate = accountCreationAllowed({ publicReading: PUBLIC_READING_RELEASE, preview, functionalPreview: import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW });
  const methods = useAuthMethods((!PUBLIC_LAUNCH_READ_ONLY_PREVIEW || PUBLIC_READING_RELEASE) && !loading && !user);
  const fieldId = useId();
  // The frame around this page re-mounts when a user appears (a recovery code opens a session), so the new-password step is remembered outside the
  // component: see accountFlowMemory.js.
  const [step, setStep] = useState(() => (newPasswordStepArmed() ? "reset-new" : "signin")), [email, setEmail] = useState("");
  const [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(""), [error, setError] = useState(() => takeAccountFlash()), [notice, setNotice] = useState(() => (newPasswordStepArmed() ? CODE_VERIFIED : ""));
  const [cooldown, setCooldown] = useState(0), [elapsed, setElapsed] = useState(0);
  const attempt = useRef(0), mounted = useRef(true), running = useRef(false), principal = useRef(user?.id || null);
  principal.current = user?.id || null;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; attempt.current++; }; }, []);
  // A different principal clears the typed secrets and any error. Compared against the previous id (not "first run"), so it is also safe
  // under a double-invoked effect and never wipes the one-shot message a re-mounted entry was handed.
  const lastUserId = useRef(user?.id || null);
  useEffect(() => {
    if (lastUserId.current === (user?.id || null)) return;
    lastUserId.current = user?.id || null;
    setPassword(""); setShowPassword(false); setCode(""); setError("");
  }, [user?.id]);
  // The set-password step needs the session that the recovery code opened. If it is gone (expired, signed out elsewhere), restart honestly.
  useEffect(() => {
    if (step !== "reset-new" || loading || user || busy) return;
    disarmNewPasswordStep(); setStep("reset"); setNotice(""); setError("פג תוקף האימות. התחילו מחדש וקבלו קוד חדש.");
  }, [step, loading, user, busy]);
  // Seconds before another e-mail may be requested for the same address (the server also enforces its own limit).
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  // Live elapsed seconds for the running operation: the real stage and the real time, never an invented percentage.
  useEffect(() => {
    if (!busy) { setElapsed(0); return undefined; }
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(timer);
  }, [busy]);
  const resetting = step === "reset-new";
  const nextLabel = returnTo.startsWith("/community/chat") ? "להמשך לקהילה" : "להמשך הגלישה";
  function clearSecrets() { setPassword(""); setShowPassword(false); setCode(""); }
  function changeStep(next) { if (busy) return; attempt.current++; setStep(next); clearSecrets(); setError(""); setNotice(""); }
  async function run(stage, task) {
    // `running` closes the gap before `busy` re-renders: a fast double click must not send the request twice.
    if (busy || running.current) return;
    running.current = true;
    const requestId = ++attempt.current;
    const current = () => mounted.current && requestId === attempt.current;
    setBusy(stage); setError(""); setNotice("");
    try { await task(current); }
    catch (failure) {
      if (!current()) return;
      // A failure to send, a rate limit or a network error never advances the flow and is never worded as a success.
      const problem = describeAuthFailure(failure, stage);
      if (problem.kind === "session" && stage === "reset-new") {
        // The recovery session is gone: leave it, and explain on the clean sign-in that replaces this screen.
        setAccountFlash(problem.message); await leaveAccount(); return;
      }
      setError(problem.message);
      if (problem.next) { disarmNewPasswordStep(); setStep(problem.next); clearSecrets(); }
    } finally { running.current = false; if (current()) setBusy(""); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const address = normalizeEmail(email), action = step;
    if (action !== "reset-new" && !isEmailAddress(address)) { setError("הזינו כתובת מייל תקינה."); return; }
    if ((action === "confirm" || action === "reset-code") && !isValidEmailOtp(code)) { setError("הזינו את הקוד המלא מהמייל, 6–10 ספרות."); return; }
    if (action === "signin" && !password) { setError("הזינו את הסיסמה שלכם."); return; }
    if (action === "signup" || action === "reset-new") {
      const problem = passwordProblem(password);
      if (problem) { setError(problem); return; }
    }
    if (action === "signup" && !canCreate) { setError("פתיחת חשבון חדש אינה זמינה בגרסה הזאת."); return; }
    await run(action, async current => {
      if (action === "signin") {
        const result = await signInWithPassword(address, password);
        if (current() && result?.user?.id && (!principal.current || principal.current === result.user.id)) {
          clearSecrets(); if (!inline) navigate(returnTo, { replace: true });
        }
      } else if (action === "signup") {
        const created = await signUpWithPassword(address, password);
        if (!current()) return;
        clearSecrets(); setEmail(address);
        if (created?.session?.user?.id) { if (!inline) navigate(returnTo, { replace: true }); return; }
        setStep("confirm"); setCooldown(RESEND_COOLDOWN_SECONDS); setNotice(SENT_SIGNUP);
      } else if (action === "confirm") {
        const result = await confirmSignupCode(address, code);
        if (!current()) return;
        if (!result?.session?.user?.id) throw new Error("confirmation_returned_no_session");
        clearSecrets(); if (!inline) navigate(returnTo, { replace: true });
      } else if (action === "reset") {
        await requestPasswordReset(address);
        if (!current()) return;
        clearSecrets(); setEmail(address); setStep("reset-code"); setCooldown(RESEND_COOLDOWN_SECONDS); setNotice(SENT_RESET);
      } else if (action === "reset-code") {
        // Armed BEFORE the request: the session this opens re-mounts the frame, and the new instance must come back on this step.
        armNewPasswordStep();
        try {
          const result = await verifyRecoveryCode(address, code);
          if (!result?.session?.user?.id) throw new Error("recovery_returned_no_session");
          if (!current()) return;
          setCode(""); setStep("reset-new"); setNotice(CODE_VERIFIED);
        } catch (failure) { disarmNewPasswordStep(); throw failure; }
      } else if (action === "reset-new") {
        await setNewPassword(password);
        disarmNewPasswordStep();
        if (!current()) return;
        clearSecrets(); setStep("signin");
        if (inline) setNotice("הסיסמה נקבעה. מעכשיו אפשר להיכנס עם מייל וסיסמה."); else navigate(returnTo, { replace: true });
      }
    });
  }
  async function resend(kind) {
    const address = normalizeEmail(email);
    if (busy || cooldown > 0 || !isEmailAddress(address)) return;
    await run(kind === "reset" ? "reset" : "resend", async current => {
      if (kind === "reset") await requestPasswordReset(address); else await resendSignupCode(address);
      if (!current()) return;
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("ביקשנו לשלוח קוד חדש לכתובת. אם הגיעו כמה קודים, השתמשו בחדש ביותר.");
    });
  }
  function haveCode() {
    const address = normalizeEmail(email);
    if (!isEmailAddress(address)) { setError("הזינו קודם את כתובת המייל שאליה נשלח הקוד."); return; }
    setEmail(address); setStep("confirm"); setError(""); setNotice("");
  }
  async function federated(provider) {
    if (busy || !methods.oauth.some(method => method.id === provider && method.available)) return;
    const requestId = ++attempt.current; setBusy("signin"); setError("");
    try { const result = await signInWithConfiguredProvider(provider, { returnTo }); if (result?.error) throw result.error; }
    catch { if (mounted.current && requestId === attempt.current) { setError("לא הצלחנו לפתוח את הכניסה. אפשר להיכנס עם מייל וסיסמה."); setBusy(""); } }
  }
  // Leaving the account (switching, or abandoning the reset after the recovery code opened a session) only ends this device's session.
  async function leaveAccount() {
    const requestId = ++attempt.current; setBusy("signout"); setError(""); setNotice("");
    try {
      await signOut({ scope: "local" });
      disarmNewPasswordStep();
      if (mounted.current && requestId === attempt.current) { setEmail(""); clearSecrets(); setStep("signin"); }
    } catch { if (mounted.current && requestId === attempt.current) setError("לא הצלחנו לצאת מהחשבון. נסו שוב."); }
    finally { if (mounted.current && requestId === attempt.current) setBusy(""); }
  }
  if (PUBLIC_LAUNCH_READ_ONLY_PREVIEW && !PUBLIC_READING_RELEASE) return <section className="sod29-auth-card sod29-account-entry" data-auth-state="acceptance-pending"><h2>החשבון ייפתח בהמשך</h2><p>כרגע אפשר לקרוא ולגלות את התוכן הציבורי. כניסה ופעולות אישיות עדיין אינן זמינות בגרסה זו.</p><Link to={target}>חזרה לגלישה ←</Link></section>;
  const showSignedIn = !resetting && !loading && user;
  const showLoading = !resetting && loading;
  const showForm = resetting || (methods.state === "ready" && methods.email);
  const pickingPassword = step === "signup" || step === "reset-new";
  return <section className="sod29-auth-card sod29-account-entry" data-auth-state={showLoading ? "loading" : showSignedIn ? "signed-in" : "guest"} data-auth-step={showSignedIn ? undefined : step} style={{ "--auth29-danger": palette.dangerText }} aria-labelledby={`${fieldId}-title`}>
        {showLoading ? <p role="status">בודקים את החיבור לחשבון…</p> : showSignedIn ? <>
          {!inline ? <span className="sod29-auth-eyebrow">החשבון מחובר</span> : null}
          <h2 id={`${fieldId}-title`}>שלום, {profile?.display_name || profile?.username || "חבר הקהילה"}</h2>
          {variant === "account" ? <small dir="ltr">{user.email || ""}</small> : null}
          {PUBLIC_READING_RELEASE ? <p>החשבון מחובר. השמורים, הפנקס והפרופיל שלכם נמצאים באזור האישי. כניסה לחשבון קיים אינה מפעילה מודל, חיוב או שינוי בהרשמה לדיוור.</p> : !inline ? <p>אפשר להמשיך מהמקום שבו עצרתם.</p> : null}
          {!inline ? <Link className="sod29-auth-primary" to={returnTo}>{nextLabel} ←</Link> : null}
          {!inline ? <Link className="sod29-auth-secondary" to={writerPersonalHref("research")}>האזור האישי שלי</Link> : null}
          <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} onClick={leaveAccount}>{variant === "account" ? "התנתקות" : "כניסה עם חשבון אחר"}</button>
        </> : <>
          <h2 id={`${fieldId}-title`}>{TITLES[step]}</h2>
          <p>{step === "signin" ? "השתמשו במייל ובסיסמה של החשבון שלכם."
            : step === "signup" ? "פותחים חשבון עם מייל וסיסמה. נשלח למייל קוד אימות קצר, ואין צורך ללחוץ על קישור."
            : step === "confirm" ? <>בדקו את תיבת המייל של <b dir="ltr">{email}</b>. אם נשלח אליכם קוד אימות, הזינו אותו כאן. אם לא הגיע קוד אפשר לבקש חדש, ואם כבר יש לכם חשבון — היכנסו, או אפסו את הסיסמה.</>
            : step === "reset" ? "נשלח קוד למייל, ובעזרתו תבחרו סיסמה חדשה. זה מתאים גם למי שנכנס עד היום בלי סיסמה."
            : step === "reset-code" ? <>בדקו את תיבת המייל של <b dir="ltr">{email}</b>. אם יש חשבון עם הכתובת הזאת, נשלח אליה קוד לאיפוס. הזינו אותו כאן.</>
            : "הקוד אומת. בחרו סיסמה חדשה לחשבון."}</p>
          {step === "signup" ? <aside className="sod29-auth-method-note" data-signup-updates-policy="explicit-consent-only"><strong>עדכוני האתר</strong><p>פתיחת חשבון אינה מצרפת אתכם לרשימת הדיוור. אפשר להירשם לעדכוני האתר בנפרד, רק בהסכמה מפורשת.</p></aside> : null}
          {notice ? <p className="sod29-auth-notice" role="status">{notice}</p> : null}
          {!resetting && methods.state === "loading" ? <p role="status">טוענים אפשרויות כניסה…</p> : !resetting && methods.state === "unavailable" ? <div role="alert"><p>לא הצלחנו לטעון את אפשרויות הכניסה.</p><button type="button" className="sod29-auth-secondary" onClick={methods.retry}>נסו שוב</button></div> : null}
          {showForm ? <form onSubmit={submit} aria-busy={Boolean(busy)}>
            {step === "signin" || step === "signup" || step === "reset" ? <><label htmlFor={`${fieldId}-email`}>כתובת מייל</label><input id={`${fieldId}-email`} name="email" type="email" autoComplete="username" dir="ltr" placeholder="you@example.com" value={email} disabled={Boolean(busy)} required onChange={e => { setEmail(e.target.value); setError(""); }} /></> : null}
            {step === "signin" || pickingPassword ? <><label htmlFor={`${fieldId}-password`}>{step === "reset-new" ? "סיסמה חדשה" : "סיסמה"}</label><input id={`${fieldId}-password`} name="password" type={showPassword ? "text" : "password"} autoComplete={step === "signin" ? "current-password" : "new-password"} dir="ltr" value={password} disabled={Boolean(busy)} required aria-describedby={pickingPassword ? `${fieldId}-password-hint` : undefined} onChange={e => { setPassword(e.target.value); setError(""); }} />
              {pickingPassword ? <small id={`${fieldId}-password-hint`} className="sod29-auth-hint">לפחות {PASSWORD_MIN_LENGTH} תווים. כדאי סיסמה ארוכה וייחודית.</small> : null}
              <button type="button" className="sod29-auth-link" aria-pressed={showPassword} disabled={Boolean(busy)} onClick={() => setShowPassword(value => !value)}>{showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}</button></> : null}
            {step === "confirm" || step === "reset-code" ? <><label htmlFor={`${fieldId}-code`}>{step === "confirm" ? "קוד אימות מהמייל" : "קוד איפוס מהמייל"}</label><input id={`${fieldId}-code`} name="code" className="sod29-auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_OTP_MAX_LENGTH} dir="ltr" value={code} disabled={Boolean(busy)} autoFocus required onChange={e => { setCode(sanitizeEmailOtp(e.target.value)); setError(""); }} /></> : null}
            {error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
            {busy ? <p className="sod29-auth-progress" role="status" data-auth-progress={busy}>{STAGE_TEXT[busy]}… <span dir="ltr">{elapsed}</span> שנ׳</p> : null}
            <button className="sod29-auth-primary" type="submit" disabled={Boolean(busy)}>{busy ? "רגע…"
              : step === "signin" ? "כניסה לחשבון ←" : step === "signup" ? "פתיחת חשבון ←" : step === "confirm" ? "אימות הכתובת ←"
              : step === "reset" ? "שלחו לי קוד לאיפוס" : step === "reset-code" ? "המשך ←" : "שמירת הסיסמה ←"}</button>
          </form> : null}
          {!showForm && error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
          <div className="sod29-auth-alternatives">
            {step === "signin" && canCreate && showForm ? <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="to-signup" onClick={() => changeStep("signup")}>אין לכם חשבון? פתיחת חשבון חדש</button> : null}
            {step === "signin" && canCreate && showForm ? <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="to-reset" onClick={() => changeStep("reset")}>שכחתי סיסמה, או שעוד לא קבעתי סיסמה</button> : null}
            {step === "signup" && showForm ? <>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="have-code" onClick={haveCode}>כבר קיבלתי קוד אימות</button>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="to-signin" onClick={() => changeStep("signin")}>יש לכם כבר חשבון? כניסה</button></> : null}
            {step === "confirm" ? <>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy) || cooldown > 0} data-auth-action="resend" onClick={() => resend("signup")}>{cooldown > 0 ? `אפשר לבקש קוד חדש בעוד ${cooldown} שניות` : "שליחת קוד חדש"}</button>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} onClick={() => changeStep("signup")}>שינוי כתובת</button>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="to-signin" onClick={() => changeStep("signin")}>יש לכם כבר חשבון? כניסה</button></> : null}
            {step === "reset" ? <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="to-signin" onClick={() => changeStep("signin")}>חזרה לכניסה</button> : null}
            {step === "reset-code" ? <>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy) || cooldown > 0} data-auth-action="resend" onClick={() => resend("reset")}>{cooldown > 0 ? `אפשר לבקש קוד חדש בעוד ${cooldown} שניות` : "שליחת קוד חדש"}</button>
              <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} onClick={() => changeStep("reset")}>שינוי כתובת</button></> : null}
            {step === "reset-new" ? <button className="sod29-auth-link" type="button" disabled={Boolean(busy)} data-auth-action="cancel-new-password" onClick={leaveAccount}>ביטול ויציאה</button> : null}
            {(step === "signin" || step === "signup") && !resetting ? methods.oauth.map(method => <button key={method.id} className="sod29-auth-secondary" type="button" disabled={Boolean(busy) || !method.available} aria-describedby={!method.available ? `${fieldId}-oauth-state` : undefined} onClick={() => federated(method.id)}>המשך עם {method.label}</button>) : null}
            {(step === "signin" || step === "signup") && methods.oauth.some(method => !method.available) ? <p id={`${fieldId}-oauth-state`} className="sod29-auth-method-note">{"הכניסה עם Google ו־Facebook ממתינה לאישור כתובת החזרה. אפשר להיכנס עם מייל וסיסמה."}</p> : null}
          </div>
        </>}
        {showSignedIn && error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
        {showSignedIn && notice ? <p className="sod29-auth-notice" role="status">{notice}</p> : null}
      </section>;
}
