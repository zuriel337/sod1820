import React, { useState, useEffect, useRef } from "react";
import { C, F } from "../theme.js";
import { requestEmailOtp, verifyEmailOtp } from "../lib/auth.js";
import { trackConversion } from "../lib/marketing.js";
import { requireVerifiedEmailSession } from "../lib/watchContinuation.js";

// subscribe_gate_law + subscription_funnel_law v18: OTP verifies identity, not newsletter consent.
// No subscribeEmail/Lead conversion here. Explicit channel opt-in stays with notification owners.
// SERVER RELEASE GATE: handle_new_user currently auto-enrolls; that separate writer MUST be
// repaired and verified before releasing this branch. A client fix alone is not end-to-end closure.
const RESEND_COOLDOWN = 30;
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box",
  background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight,
  fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none" };
const buttonStyle = busy => ({ padding: "12px 22px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 15, fontWeight: 800 });

export default function EmailVerify({ source = "site", onVerified, cta = "שלחו לי קוד" }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resendNote, setResendNote] = useState("");
  const inFlight = useRef(false);
  const verifiedData = useRef(null);
  const verificationRecorded = useRef(false);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(e) {
    e?.preventDefault();
    if (inFlight.current) return;
    const normalized = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) { setErr("נא להזין כתובת אימייל תקינה"); return; }
    inFlight.current = true; setBusy(true); setErr("");
    try {
      await requestEmailOtp(normalized);
      setSentEmail(normalized); setStep("code"); setResendIn(RESEND_COOLDOWN);
      try { trackConversion("otp_requested", { source }); } catch { /* noop */ }
    } catch { setErr("לא הצלחנו לשלוח קוד כרגע — נסו שוב בעוד רגע"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function resendCode() {
    if (inFlight.current || resendIn > 0) return;
    inFlight.current = true; setBusy(true); setErr(""); setResendNote("");
    try { await requestEmailOtp(sentEmail); setResendNote("קוד חדש נשלח ✓"); setResendIn(RESEND_COOLDOWN); }
    catch { setErr("לא הצלחנו לשלוח קוד חדש כרגע — נסו שוב בעוד רגע"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function finishVerified() {
    if (inFlight.current || !verifiedData.current) return;
    inFlight.current = true; setBusy(true); setErr("");
    try { await onVerified?.(verifiedData.current); setStep("done"); }
    catch { setErr("המייל אומת, אבל השלמת הפעולה בחשבון עדיין לא אושרה. אפשר לנסות שוב בלי לבקש קוד חדש."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function checkCode(e) {
    e?.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{4,8}$/.test(code.trim())) { setErr("נא להזין את הקוד שקיבלתם במייל"); return; }
    inFlight.current = true; setBusy(true); setErr("");
    try {
      verifiedData.current = requireVerifiedEmailSession(await verifyEmailOtp(sentEmail, code));
      setStep("verified");
      if (!verificationRecorded.current) {
        verificationRecorded.current = true;
        try { trackConversion("identity_verified", { source }); } catch { /* noop */ }
      }
    } catch { setErr("הקוד שגוי או שפג תוקפו — אפשר לשלוח קוד חדש"); }
    finally { inFlight.current = false; setBusy(false); }
    // Post-verification errors must not be presented as a bad OTP.
    if (verifiedData.current) await finishVerified();
  }

  const error = err && <div role="alert" style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12, textAlign: "center", width: "100%" }}>{err}</div>;
  if (step === "done") return <p role="status" style={{ color: C.goldLight, fontFamily: F.body }}>✓ המייל אומת. הרשמה לעדכונים היא בחירה נפרדת.</p>;
  if (step === "verified") return <div dir="rtl" style={{ textAlign: "center" }}>
    <p role="status" style={{ color: C.goldLight, fontFamily: F.body }}>✓ המייל אומת</p>
    {error}
    <button type="button" disabled={busy} onClick={finishVerified} style={buttonStyle(busy)}>{busy ? "משלים…" : "נסה להשלים שוב"}</button>
  </div>;
  if (step === "code") return <form onSubmit={checkCode} style={{ direction: "rtl", maxWidth: 360, margin: "0 auto" }}>
    <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14 }}>שלחנו קוד אל <span dir="ltr">{sentEmail}</span>. הזינו אותו כאן:</p>
    <input aria-label="קוד אימות מהמייל" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
      dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus disabled={busy} style={{ ...inputStyle, letterSpacing: 6, fontSize: 22 }} />
    <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
      <button type="submit" disabled={busy} style={buttonStyle(busy)}>{busy ? "מאמת…" : "אמתו וכנסו"}</button>
      <button type="button" disabled={busy} onClick={() => { setStep("email"); setCode(""); setErr(""); setResendNote(""); }}
        style={{ ...buttonStyle(busy), background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>מייל אחר</button>
    </div>
    <div style={{ marginTop: 14, textAlign: "center" }}>
      <button type="button" onClick={resendCode} disabled={busy || resendIn > 0}
        style={{ background: "transparent", border: "none", padding: 4, color: C.goldDim, fontFamily: F.body, cursor: "pointer" }}>
        {resendIn > 0 ? `אפשר לשלוח שוב בעוד ${resendIn}…` : "לא קיבלתם? שלחו קוד חדש"}
      </button>
      {resendNote && <div role="status" style={{ color: C.gold }}>{resendNote}</div>}
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>בדקו גם בתיקיית הספאם / קידומים</div>
    </div>{error}
  </form>;
  return <form onSubmit={sendCode} style={{ direction: "rtl", display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
    <input type="email" aria-label="כתובת אימייל לאימות" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
      placeholder="האימייל שלכם" dir="ltr" disabled={busy} style={{ ...inputStyle, flex: "1 1 220px", minWidth: 0, width: "auto" }} />
    <button type="submit" disabled={busy} style={buttonStyle(busy)}>{busy ? "שולח…" : cta}</button>{error}
  </form>;
}
