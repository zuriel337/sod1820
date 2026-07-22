import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { SUPABASE_URL, SUPABASE_ANON } from "../lib/supabase.js";

// 🤝 /join — דף ההצטרפות המסודר. שלושה שערים במקום אחד: הרשמה במייל · קבוצת וואטסאפ ·
// הזמנת חברים תמורת קרדיטים (referrals + credit_ledger הקיימים). מחליף את הקישור הסתמי ל-/community.
const WHATSAPP_URL = "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";
const REWARDS = [
  ["👥", "חבר שהזמנת נרשם", "+100"],
  ["🔗", "כל שיתוף", "+5"],
  ["🟢", "חיבור וואטסאפ", "+100"],
  ["☀️", "כניסה יומית", "+5"],
];

export default function JoinPage() {
  const P = usePalette();
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const ref = sp.get("ref") || "";
  const [email, setEmail] = useState("");
  const [st, setSt] = useState("idle"); // idle | sending | new | exists | invalid | error
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track("join");
    applySeo({ title: "הצטרפו אל סוד 1820 — הרשמה, וואטסאפ וקרדיטים", description: "הצטרפו לקהילת סוד 1820: קבלו רמזים וצפנים במייל, הצטרפו לקבוצת הוואטסאפ, והזמינו חברים כדי לצבור קרדיטים לחיפוש בצופן.", path: "/join" });
  }, []);

  // 🔗 קישור-הפניה אישי (למחוברים) — כל נרשם דרכו מזוכה לך.
  const myRefLink = useMemo(() => user ? `https://sod1820.co.il/join?ref=${user.id}` : "", [user]);
  const waShare = useMemo(() => {
    const link = myRefLink || "https://sod1820.co.il/join";
    const txt = `גיליתי אתר שמפענח את הקוד שמאחורי המציאות — גימטריה, צפנים ורמזים בתורה 🤯 הצטרף 👇 ${link}`;
    return `https://wa.me/?text=${encodeURIComponent(txt)}`;
  }, [myRefLink]);

  async function submit(e) {
    e?.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) { setSt("invalid"); return; }
    setSt("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-signup?format=json`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ email: v, source: "join", ref, back: "/join" }),
      });
      const d = await res.json().catch(() => ({ ok: false, status: "error" }));
      setSt(d.status === "new" ? "new" : d.status === "exists" ? "exists" : d.status === "invalid" ? "invalid" : d.ok ? "new" : "error");
    } catch { setSt("error"); }
  }

  async function copyRef() {
    try { await navigator.clipboard?.writeText(myRefLink); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
  }

  const card = { background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 18, padding: "22px 20px", boxShadow: "0 10px 34px rgba(0,0,0,0.14)" };
  const label = { color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, marginBottom: 8 };
  const primaryBtn = { cursor: "pointer", border: "none", background: P.accentBtn, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontSize: 15.5, fontWeight: 800, borderRadius: 999, padding: "13px 26px" };

  return (
    <div dir="rtl" style={{ maxWidth: 620, margin: "0 auto", padding: "28px 16px 90px", position: "relative", zIndex: 1 }}>
      {/* HERO */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 6 }}>👑</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5.5vw,40px)", fontWeight: 800, margin: "0 0 10px" }}>הצטרפו אל סוד 1820</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16, lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
          הבית של רמזי הגאולה בשפת המספרים. קבלו את הרמזים והצפנים החזקים ביותר — ותהיו חלק מהקהילה שמפענחת את הקוד שמאחורי המציאות.
        </p>
        {ref && <div style={{ marginTop: 10, color: P.accentDim, fontFamily: F.heading, fontSize: 12.5 }}>✨ הוזמנת על ידי חבר — ברוך הבא!</div>}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {/* 1 — הרשמה במייל */}
        <div style={card}>
          <div style={label}>✉️ הרשמה במייל</div>
          {st === "new" ? (
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "6px 0" }}>🎉 נרשמתם! הרמז הבא בדרך אליכם.</div>
          ) : st === "exists" ? (
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "6px 0" }}>🎓 אתם כבר איתנו — נתראה בגיליון הבא.</div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); if (st === "invalid" || st === "error") setSt("idle"); }}
                placeholder="האימייל שלך" dir="ltr"
                style={{ flex: 1, minWidth: 200, background: P.card, border: `1px solid ${st === "invalid" ? (P.danger || "#c0392b") : P.border}`, borderRadius: 12, padding: "13px 15px", color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none", boxSizing: "border-box" }} />
              <button type="submit" disabled={st === "sending"} style={{ ...primaryBtn, opacity: st === "sending" ? 0.6 : 1 }}>{st === "sending" ? "שולח…" : "הרשמה ←"}</button>
            </form>
          )}
          {st === "invalid" && <div style={{ color: P.danger || "#c0392b", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>כתובת המייל לא נראית תקינה — נסו שוב.</div>}
          {st === "error" && <div style={{ color: P.danger || "#c0392b", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>משהו השתבש — נסו שוב בעוד רגע.</div>}
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, marginTop: 9 }}>חינם. אפשר להסיר בכל רגע — לינק הסרה בכל מייל.</div>
        </div>

        {/* 2 — וואטסאפ */}
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.04))", border: "1px solid rgba(37,211,102,0.4)" }}>
          <div style={label}>💬 קבוצת הוואטסאפ</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, marginBottom: 14 }}>
            הצטרפו לקבוצת הגימטריה בוואטסאפ — רמזים חמים, דיונים, וחברי קהילה מכל הארץ.
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#25D366", color: "#083b1a", fontFamily: F.heading, fontSize: 15.5, fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "13px 28px" }}>
            💬 הצטרפו לקבוצה ←
          </a>
        </div>

        {/* 3 — הזמן חברים, קבל קרדיטים */}
        <div style={{ ...card, border: `1px solid ${P.borderStrong}` }}>
          <div style={label}>🎁 הזמינו חברים · צברו קרדיטים</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.75, marginBottom: 14 }}>
            כל חבר שמצטרף דרך הקישור שלכם מזכה אתכם ב<b style={{ color: P.accentText }}>קרדיטים</b> — שנפדים ל<b style={{ color: P.accentText }}>חיפושים בצופן התנ״כי</b> ולכלים מתקדמים.
          </div>

          <div style={{ display: "grid", gap: 7, marginBottom: 16 }}>
            {REWARDS.map(([em, k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: "9px 13px" }}>
                <span style={{ fontSize: 18 }}>{em}</span>
                <span style={{ flex: 1, color: P.ink, fontFamily: F.body, fontSize: 14 }}>{k}</span>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>{v}</span>
              </div>
            ))}
          </div>

          {user ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200, background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: "11px 13px", color: P.inkSoft, fontFamily: F.body, fontSize: 13, direction: "ltr", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myRefLink}</div>
                <button onClick={copyRef} style={{ ...primaryBtn, padding: "11px 20px", fontSize: 14 }}>{copied ? "✓ הועתק" : "📋 העתק"}</button>
              </div>
              <a href={waShare} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: "#25D366", color: "#083b1a", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "11px 24px" }}>
                📤 שתפו בוואטסאפ וזכו
              </a>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link to="/login" style={{ ...primaryBtn, textDecoration: "none", display: "inline-block", padding: "12px 24px", fontSize: 14.5 }}>התחברו לקישור אישי ←</Link>
              <a href={waShare} target="_blank" rel="noopener noreferrer" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>או שתפו את האתר עכשיו</a>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <Link to="/start" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>חדשים כאן? כל המדריך → כאן מתחילים ←</Link>
      </div>
    </div>
  );
}
