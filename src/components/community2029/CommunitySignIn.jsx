import React, { useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, verifyEmailOtp } from "../../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";

export default function CommunitySignIn({ compact = false }) {
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const joinButton = useRef(null);
  const compactClass = compact ? " sod29-community-sign-in--compact" : "";
  const close = () => { setExpanded(false); requestAnimationFrame(() => joinButton.current?.focus()); };

  const sendCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("יש להזין כתובת מייל תקינה."); return; }
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

  if (loading) return <div className={`sod29-community-sign-in${compactClass}`} role="status">בודק התחברות…</div>;
  if (user) return <section className={`sod29-community-sign-in sod29-community-signed-in${compactClass}`} aria-label="חשבון הקהילה">
    <div><strong>מחובר/ת כ־{profile?.display_name || profile?.username || user.email}</strong>{!compact ? <span>התגובות והלייקים שלך יופיעו בחשבון הזה.</span> : null}</div>
    <button type="button" className="sod29-community-secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await signOut(); setStep("email"); } catch { setError("ההתנתקות נכשלה. נסו שוב."); } finally { setBusy(false); } }}>החלפת חשבון</button>
    {error ? <p role="alert">{error}</p> : null}
  </section>;

  if (compact && !expanded) return <section className={`sod29-community-sign-in${compactClass} sod29-community-sign-in--collapsed`} aria-label="התחברות לקהילה">
    <button ref={joinButton} type="button" className="sod29-community-secondary" aria-expanded="false" aria-controls="community-sign-in-form" onClick={() => setExpanded(true)}>הצטרפו לשיחה</button>
  </section>;

  return <section className={`sod29-community-sign-in${compactClass}`} aria-label="התחברות לקהילה" onKeyDown={event => { if (compact && event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <div className="sod29-community-sign-in-heading"><div><h2>כניסה לקהילה</h2><p>{compact ? "קוד הכניסה יישלח לכתובת המייל שלכם." : "התחברו כאן עם המייל של החשבון שלכם כדי להגיב ולתת לייקים בשם שלכם."}</p></div>
      {compact ? <button type="button" className="sod29-community-secondary" onClick={close} aria-expanded="true" aria-controls="community-sign-in-form">סגירת טופס ההתחברות</button> : null}</div>
    {step === "email" ? <form id="community-sign-in-form" onSubmit={sendCode}>
      <label htmlFor="community-sign-in-email">כתובת מייל</label>
      <input id="community-sign-in-email" type="email" inputMode="email" autoComplete="email" dir="ltr" autoFocus={compact} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" />
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "שולח קוד…" : "שלחו לי קוד כניסה"}</button>
    </form> : <form id="community-sign-in-form" onSubmit={confirmCode}>
      <label htmlFor="community-sign-in-code">הקוד שנשלח ל־<b dir="ltr">{email.trim()}</b></label>
      <input id="community-sign-in-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required minLength={6} maxLength={EMAIL_OTP_MAX_LENGTH} value={code} onChange={(event) => setCode(sanitizeEmailOtp(event.target.value))} placeholder="קוד כניסה" />
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מאמת…" : "כניסה לקהילה"}</button>
      <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => { setStep("email"); setCode(""); setError(""); }}>שינוי כתובת המייל</button>
    </form>}
    {error ? <p className="sod29-community-sign-in-error" role="alert">{error}</p> : null}
  </section>;
}

