import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F, LOGO_URL, GEM, calcGem } from "../theme.js";
import { subscribeEmail } from "../lib/supabase.js";
import { useSubscribed } from "./SubscribeGate.jsx";

/**
 * דו״ח כניסה אישי להיכל — כלי פנימי (לא "מתנה"/מבצע).
 * הגולש מזין שם + אימייל → נכנס למעגל (תלמידי ההיכל) → מקבל דו״ח גימטריה אישי
 * ("מפת התדר האישי"). מסגור של מערכת/עומק/סטטוס, לא שיווק.
 */

const digitRoot = n => { while (n > 9) n = String(n).split("").reduce((s, d) => s + +d, 0); return n; };

export default function PersonalGematriaGift({ source = "gift-gematria", style = {} }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);
  const { markSubscribed } = useSubscribed();

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    const nm = name.trim();
    if (nm.length < 2 || !/[א-ת]/.test(nm)) { setErr("נא להזין שם בעברית"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין אימייל תקין"); return; }
    setBusy(true);
    try {
      await subscribeEmail({ email: email.trim(), name: nm, source });
      markSubscribed();
      setReport({ name: nm, val: calcGem(nm) });
    } catch { setErr("משהו השתבש — נסו שוב בעוד רגע"); }
    finally { setBusy(false); }
  }

  const panel = {
    direction: "rtl", textAlign: "center",
    background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
    border: `1px solid ${C.borderGold}`, borderRadius: 18,
    padding: "30px 24px", boxShadow: "0 0 50px rgba(212,175,55,0.08) inset",
    maxWidth: 540, margin: "0 auto", ...style,
  };

  // ── מצב דוח (אחרי הרשמה) ──
  if (report) {
    const letters = [...report.name].filter(c => GEM[c]);
    return (
      <div style={panel}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
          📜 דו״ח הכניסה האישי שלך
        </div>
        <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{report.name}</div>
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 56, fontWeight: 800, lineHeight: 1, textShadow: "0 0 30px rgba(212,175,55,0.4)" }}>
          {report.val}
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, margin: "6px 0 16px" }}>
          התדר האישי שלך (גימטריית השם) · שורש {digitRoot(report.val)}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 18 }}>
          {letters.map((c, i) => (
            <span key={i} style={{
              border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 9px",
              fontFamily: F.mono, fontSize: 12, color: C.goldLight, background: "rgba(8,5,2,0.5)",
            }}>{c} <span style={{ color: C.muted }}>{GEM[c]}</span></span>
          ))}
        </div>

        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 430, margin: "0 auto 20px" }}>
          כל אות בשמך נושאת ערך — והסכום מספר סיפור. זו רק ההתחלה: בהיכל תגלו מה מתחבר למספר שלכם, ואיך הוא נפגש עם רמזי הגאולה.
        </p>

        <Link to={`/number/${encodeURIComponent(report.name)}`} style={{
          display: "inline-block", padding: "12px 26px", borderRadius: 10, textDecoration: "none",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          fontFamily: F.heading, fontSize: 15, fontWeight: 800,
        }}>
          לדוח המלא ולכל המילים בערך {report.val} →
        </Link>

        <div style={{ color: C.gold, fontFamily: F.regal, fontSize: 14, fontWeight: 700, marginTop: 18 }}>
          ✦ נכנסתם למעגל ההיכל — ברוכים הבאים לתלמידי ההיכל 🙏
        </div>
      </div>
    );
  }

  // ── מצב טופס (לפני הרשמה) ──
  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box",
    background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight,
    fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none",
  };
  return (
    <div style={panel}>
      <img src={LOGO_URL} alt="סוד 1820" width={42} height={42}
        style={{ borderRadius: "50%", objectFit: "cover", marginBottom: 10, filter: "drop-shadow(0 0 14px rgba(232,200,74,0.5))" }} />
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(19px,3vw,24px)", fontWeight: 700, lineHeight: 1.35 }}>
        📜 דו״ח כניסה אישי להיכל
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.85, maxWidth: 460, margin: "8px auto 20px" }}>
        כחלק מהכניסה למעגל ההיכל, כל חבר מקבל <b style={{ color: C.goldLight }}>דו״ח גימטריה אישי</b> — כלי להבנת השם והתדר האישי בתוך המערכת.
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 360, margin: "0 auto" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלכם (בעברית)" style={inputStyle} />
        <input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלכם" style={inputStyle}
          onKeyDown={e => e.key === "Enter" && submit(e)} />
        <button type="submit" disabled={busy} style={{
          padding: "13px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          fontFamily: F.heading, fontSize: 15, fontWeight: 800,
        }}>{busy ? "מפיק…" : "הפיקו את דו״ח הכניסה שלי"}</button>
      </form>
      {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 10 }}>{err}</div>}
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, letterSpacing: 0.3, marginTop: 12, opacity: 0.7 }}>
        הכניסה מצרפת אתכם למעגל ההיכל ולעדכוני המערכת
      </div>
    </div>
  );
}
