import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { updatePassword } from "../../lib/auth.js";
import { AUTH_MESSAGES, RECOVERABLE_BY_REFRESH, classifyAuthError } from "../../lib/authDiagnostics.js";
import { clearPasswordRecovery } from "../../lib/passwordRecovery.js";
import { refreshAppRuntime } from "../../lib/authRecovery.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import "../../pages/auth2029.css";

export const NEW_PASSWORD_MIN_LENGTH = 8;
export const NEW_PASSWORD_MAX_BYTES = 72;
const bytesOf = value => new TextEncoder().encode(value).length;

// "בחירת סיסמה חדשה": shown only for the session that a password-recovery link created. The password is applied by Auth to the
// account of that session (the same user_id the person already has, whether the account began with Google or with a code).
export default function NewPassword2029({ returnTo = "/2029" }) {
  const { user, profile } = useAuth();
  const fieldId = useId();
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [kind, setKind] = useState(""), [done, setDone] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (Array.from(password).length < NEW_PASSWORD_MIN_LENGTH) { setKind("weak_password"); setError(AUTH_MESSAGES.weak_password); return; }
    if (bytesOf(password) > NEW_PASSWORD_MAX_BYTES) { setKind("weak_password"); setError("הסיסמה ארוכה מדי. עד 72 בתים (בערך 70 תווים באנגלית)."); return; }
    if (password !== confirm) { setKind(""); setError("שתי הסיסמאות אינן זהות. הקלידו שוב."); return; }
    setBusy(true); setError(""); setKind("");
    try {
      await updatePassword(password);
      clearPasswordRecovery();
      if (mounted.current) { setDone(true); setPassword(""); setConfirm(""); }
    } catch (failure) {
      if (!mounted.current) return;
      const failureKind = classifyAuthError(failure);
      setKind(failureKind);
      setError(["weak_password", "same_password", "session_missing", "blocked_by_worker", "stale_worker", "network", "server_error", "storage_unavailable"].includes(failureKind)
        ? AUTH_MESSAGES[failureKind] : "לא הצלחנו לשמור את הסיסמה. נסו שוב, או בקשו קישור חדש.");
    } finally { if (mounted.current) setBusy(false); }
  }
  if (done) return <section className="sod29-auth-card" data-auth-state="password-saved" role="status" aria-labelledby={`${fieldId}-title`}>
    <h2 id={`${fieldId}-title`}>הסיסמה נשמרה</h2>
    <p>מעכשיו אפשר להיכנס עם הסיסמה, עם קוד למייל או עם Google. זה אותו חשבון, עם אותו אזור אישי ואותה היסטוריה.</p>
    <Link className="sod29-auth-primary" to={writerPersonalHref("research")}>לאזור האישי שלי ←</Link>
    <Link className="sod29-auth-secondary" to={returnTo}>להמשך הגלישה</Link>
  </section>;
  return <section className="sod29-auth-card" data-auth-state="password-recovery" aria-labelledby={`${fieldId}-title`}>
    <span className="sod29-auth-eyebrow">הקישור אומת</span>
    <h2 id={`${fieldId}-title`}>בחירת סיסמה חדשה</h2>
    <p>{profile?.display_name || profile?.username ? <>שלום, {profile.display_name || profile.username}. </> : null}בחרו סיסמה לחשבון{user?.email ? <> <b dir="ltr">{user.email}</b></> : null}. הכניסה עם Google תמשיך לעבוד כמו קודם.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${fieldId}-new`}>סיסמה חדשה</label>
      <input id={`${fieldId}-new`} name="new-password" type={show ? "text" : "password"} autoComplete="new-password" dir="ltr" minLength={NEW_PASSWORD_MIN_LENGTH} value={password} disabled={busy} required autoFocus onChange={e => { setPassword(e.target.value); setError(""); }} />
      <label htmlFor={`${fieldId}-confirm`}>אימות הסיסמה</label>
      <input id={`${fieldId}-confirm`} name="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" dir="ltr" value={confirm} disabled={busy} required onChange={e => { setConfirm(e.target.value); setError(""); }} />
      <button type="button" className="sod29-auth-link" aria-pressed={show} disabled={busy} onClick={() => setShow(value => !value)}>{show ? "הסתרת הסיסמה" : "הצגת הסיסמה"}</button>
      <small className="sod29-auth-method-note">לפחות {NEW_PASSWORD_MIN_LENGTH} תווים.</small>
      {error ? <p className="sod29-auth-error" role="alert">{error}</p> : null}
      {RECOVERABLE_BY_REFRESH.has(kind) ? <button type="button" className="sod29-auth-secondary" disabled={busy} data-auth-action="refresh-runtime" onClick={() => refreshAppRuntime()}>רענון האתר</button> : null}
      {kind === "session_missing" ? <Link className="sod29-auth-secondary" data-auth-action="request-new-link" to={"/login?reset=1&returnTo=" + encodeURIComponent(returnTo)}>בקשת קישור חדש</Link> : null}
      {kind && kind !== "unknown" ? <small className="sod29-auth-method-note" dir="ltr" data-auth-diagnostic={kind}>{kind}</small> : null}
      <button className="sod29-auth-primary" type="submit" disabled={busy}>{busy ? "רגע, שומרים…" : "שמירת הסיסמה ←"}</button>
    </form>
  </section>;
}
