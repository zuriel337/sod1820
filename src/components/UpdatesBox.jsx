import React, { useState } from "react";
import { C, F, LOGO_URL } from "../theme.js";
import { subscribeEmail } from "../lib/supabase.js";
import { useSubscribed } from "./SubscribeGate.jsx";

/**
 * תיבת עדכונים כללית — רכיב קבוע וניתן-להצבה בכל מקום באתר.
 * מטרה: הרשמה חינם לעדכוני סוד 1820 (טבלת subscribers). טון: לא מטריד, אבל FOMO עדין.
 * variant="panel" — תיבה מלאה (דף/מדור) · variant="inline" — שורה קומפקטית (פוטר).
 */

const DEFAULT_TITLE = "לא נציף אתכם. פשוט לא תרצו לפספס.";
const DEFAULT_BODY =
  "החידושים, הצפנים והממצאים החדשים יוצאים קודם כל למי שרשום. הרשמה אחת — ואתם תמיד צעד לפני כולם.";

export default function UpdatesBox({
  variant = "panel",
  source = "updates",
  title = DEFAULT_TITLE,
  body = DEFAULT_BODY,
  cta = "אני בפנים →",
  style = {},
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const { markSubscribed } = useSubscribed();

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr("נא להזין כתובת אימייל תקינה");
      return;
    }
    setBusy(true);
    try {
      await subscribeEmail({ email, source });
      markSubscribed();
      setDone(true);
    } catch {
      setErr("משהו השתבש — נסו שוב בעוד רגע");
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input
      type="email" value={email} onChange={e => setEmail(e.target.value)}
      placeholder="האימייל שלכם" dir="ltr"
      onKeyDown={e => e.key === "Enter" && submit(e)}
      style={{
        flex: "1 1 220px", minWidth: 200, padding: "12px 14px", borderRadius: 10,
        background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight,
        fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none",
      }} />
  );
  const button = (
    <button type="submit" disabled={busy}
      style={{
        padding: "12px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
        background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
        fontFamily: F.heading, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
      }}>{busy ? "רושם…" : cta}</button>
  );
  const micro = (
    <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: variant === "inline" ? 8 : 14 }}>
      חינם · אימות חד-פעמי במייל · אפשר לבטל בכל רגע
    </div>
  );
  const success = (
    <div style={{ color: C.gold, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>
      ✦ אתם בפנים — תודה! נתראה בעדכון הבא.
    </div>
  );

  // ── וריאנט קומפקטי (פוטר / שורה) ──
  if (variant === "inline") {
    return (
      <div style={{ maxWidth: 1040, margin: "0 auto 28px", paddingBottom: 28, borderBottom: `1px solid ${C.border}`, direction: "rtl", ...style }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{title}</div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>{body}</div>
          </div>
          {done ? success : (
            <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                {input}
                {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12, marginTop: 6 }}>{err}</div>}
              </div>
              {button}
            </form>
          )}
        </div>
        {!done && micro}
      </div>
    );
  }

  // ── וריאנט פאנל מלא ──
  return (
    <div style={{
      direction: "rtl", textAlign: "center",
      background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
      border: `1px solid ${C.borderGold}`, borderRadius: 18,
      padding: "34px 24px", boxShadow: "0 0 50px rgba(212,175,55,0.08) inset", ...style,
    }}>
      <img src={LOGO_URL} alt="סוד 1820" width={42} height={42}
        style={{ borderRadius: "50%", objectFit: "cover", marginBottom: 12, filter: "drop-shadow(0 0 14px rgba(232,200,74,0.5))" }} />
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, lineHeight: 1.4 }}>{title}</div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 480, margin: "10px auto 22px" }}>{body}</p>
      {done ? success : (
        <>
          <form onSubmit={submit} style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
            {input}{button}
          </form>
          {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
          {micro}
        </>
      )}
    </div>
  );
}
