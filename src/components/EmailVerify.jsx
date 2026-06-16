import React, { useState } from "react";
import { C, F } from "../theme.js";
import { requestEmailOtp, verifyEmailOtp } from "../lib/auth.js";
import { subscribeEmail } from "../lib/supabase.js";
import { broadcastJoin } from "../lib/joinEvents.js";

/**
 * אימות מייל בשני שלבים (Supabase Auth OTP) — רכיב קבוע וניתן-להצבה.
 * שלב 1: אימייל → נשלח קוד. שלב 2: הזנת הקוד → המשתמש מאומת (session).
 * onVerified() נקרא כשהאימות הצליח. source = מקור ההרשמה לרשימת התפוצה.
 */

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight,
  fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none",
};
const btnStyle = (busy) => ({
  padding: "12px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
  fontFamily: F.heading, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
});

export default function EmailVerify({ source = "site", onVerified, cta = "שלחו לי קוד" }) {
  const [step, setStep] = useState("email"); // email | code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function sendCode(e) {
    e?.preventDefault?.();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr("נא להזין כתובת אימייל תקינה");
      return;
    }
    setBusy(true);
    try {
      await requestEmailOtp(email);
      subscribeEmail({ email, source }).catch(() => {}); // גם לרשימת התפוצה
      setStep("code");
    } catch {
      setErr("לא הצלחנו לשלוח קוד כרגע — נסו שוב בעוד רגע");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(e) {
    e?.preventDefault?.();
    setErr("");
    if (!/^\d{4,8}$/.test(code.trim())) {
      setErr("הקוד הוא 6 ספרות שקיבלתם במייל");
      return;
    }
    setBusy(true);
    try {
      await verifyEmailOtp(email, code);
      broadcastJoin();   // חגיגת הצטרפות חיה לכל המבקרים
      onVerified?.();
    } catch {
      setErr("הקוד שגוי או שפג תוקפו — אפשר לשלוח קוד חדש");
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={checkCode} style={{ direction: "rtl", maxWidth: 360, margin: "0 auto" }}>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, marginBottom: 12, lineHeight: 1.7 }}>
          שלחנו קוד אל <span style={{ color: C.goldLight }} dir="ltr">{email}</span>. הזינו אותו כאן:
        </div>
        <input
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="● ● ● ● ● ●" dir="ltr" inputMode="numeric" autoFocus
          style={{ ...inputStyle, letterSpacing: 6, fontSize: 22, fontWeight: 700 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={busy} style={btnStyle(busy)}>{busy ? "מאמת…" : "אמתו וכנסו"}</button>
          <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(""); }}
            style={{ padding: "12px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontFamily: F.heading, fontSize: 13, cursor: "pointer" }}>
            ← מייל אחר
          </button>
        </div>
        {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12, textAlign: "center" }}>{err}</div>}
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} style={{ direction: "rtl", display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="האימייל שלכם" dir="ltr" style={{ ...inputStyle, flex: "1 1 220px", minWidth: 200, width: "auto" }} />
      <button type="submit" disabled={busy} style={btnStyle(busy)}>{busy ? "שולח…" : cta}</button>
      {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 8, width: "100%", textAlign: "center" }}>{err}</div>}
    </form>
  );
}
