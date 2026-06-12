import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { subscribeEmail } from "../lib/supabase.js";

/**
 * חוק מערכת: subscribe_gate_law
 * רכיב קבוע וניתן-להצבה בכל מקום שצוריאל יחליט. ברירת מחדל: אחרי 2 פריטים חינמיים
 * המשך התוכן נחשף רק אחרי הרשמה (חינם) לעדכוני סוד 1820 — טבלת subscribers.
 * זה ניוזלטר חינמי, לא אזור המנויים "בני ההיכל".
 */

const LS_KEY = "sod1820_subscribed";

export function useSubscribed() {
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    try { setSubscribed(localStorage.getItem(LS_KEY) === "1"); } catch { /* */ }
  }, []);
  const markSubscribed = () => {
    try { localStorage.setItem(LS_KEY, "1"); } catch { /* */ }
    setSubscribed(true);
  };
  return { subscribed, markSubscribed };
}

export default function SubscribeGate({ lockedCount = 0, source = "site", onUnlock }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { markSubscribed } = useSubscribed();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr("נא להזין כתובת אימייל תקינה");
      return;
    }
    setBusy(true);
    try {
      await subscribeEmail({ email, source });
      markSubscribed();
      onUnlock?.();
    } catch {
      setErr("משהו השתבש — נסו שוב בעוד רגע");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      direction: "rtl", textAlign: "center",
      background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
      border: `1px solid ${C.borderGold}`, borderRadius: 16,
      padding: "32px 24px", margin: "20px 0",
      boxShadow: "0 0 40px rgba(212,175,55,0.08) inset",
    }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🔓</div>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>
        להמשך הצפייה — הצטרפו (חינם) לעדכוני סוד 1820
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 460, margin: "10px auto 22px" }}>
        {lockedCount > 0
          ? `עוד ${lockedCount} חידושים ממתינים לכם. `
          : ""}
        השאירו אימייל ותקבלו את כל החידושים החדשים ראשונים — ישירות לתיבה.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="האימייל שלכם" dir="ltr"
          style={{
            flex: "1 1 220px", minWidth: 200, padding: "12px 14px", borderRadius: 10,
            background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight,
            fontFamily: F.body, fontSize: 15, textAlign: "center",
          }} />
        <button type="submit" disabled={busy}
          style={{
            padding: "12px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
          }}>{busy ? "רושם…" : "הצטרפו וקבלו גישה"}</button>
      </form>
      {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 14 }}>
        ללא תשלום · אפשר לבטל בכל רגע · זה לא אזור המנויים «בני ההיכל»
      </div>
    </div>
  );
}
