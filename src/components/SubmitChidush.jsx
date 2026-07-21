import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// ✍️ <SubmitChidush> — «דף ריק לכתוב חידוש» הקנוני (canonical_ui_components_law).
// מקור-אמת יחיד לשליחת חידוש בכל האתר: בית המדרש · הפורום · ההיכל — כולם מרנדרים את הרכיב הזה,
// כך שהמתכונת זהה בכל מקום (בקשת צוריאל: «אותו מתכונת של שליחת חידושים… בכל מקום דף ריק לכתוב חידוש»).
//
// מכוון: משטח «נייר» בהיר עצמאי (בלי תלות בפלטת-העמוד) → נראה זהה בבית-המדרש הבהיר, בפורום הכהה ובהיכל.
// התנהגות: השורה הראשונה = הכותרת · המייל מהחשבון המחובר · רשום-בלבד · שליחה → chiddush_submissions.
const L = {
  panel: "#ffffff", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc",
};

export default function SubmitChidush({ compact = false, onDone } = {}) {
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [st, setSt] = useState("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const n = profile?.display_name || profile?.username || "";
    if (n) setName(prev => prev || n);
  }, [profile]);

  async function submit() {
    const t = text.trim();
    if (!t) { setErr("הדף עדיין ריק — כתבו את החידוש ואז שלחו"); return; }
    setSt("sending"); setErr("");
    try {
      const { error } = await supabase.from("chiddush_submissions").insert({
        title: (t.split("\n")[0] || "חידוש").slice(0, 120),
        body: t,
        author_name: name.trim() || null,
        author_email: user?.email || null,
      });
      if (error) throw error;
      setSt("done");
      onDone && onDone();
    } catch { setSt("error"); setErr("אירעה שגיאה — נסו שוב בעוד רגע"); }
  }

  // 🔒 הרשמה לפני שליחה — זהה בכל מקום
  if (!user) return (
    <div style={{ textAlign: "center", padding: "36px 22px", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 16, maxWidth: 540, margin: "0 auto" }}>
      <div style={{ fontSize: 42, marginBottom: 8 }}>✍️</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 21, fontWeight: 700, marginBottom: 8 }}>כדי לשלוח חידוש — הצטרפו תחילה</div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 400, margin: "0 auto 16px" }}>
        השליחה פתוחה לחוקרים רשומים (אימות מייל פשוט) — כך נשמור על שמכם לצד החידוש ונמנע ספאם.
      </p>
      <Link to="/login" style={{ display: "inline-block", background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "11px 26px", borderRadius: 999, textDecoration: "none" }}>הירשמו / התחברו ←</Link>
    </div>
  );

  if (st === "done") return (
    <div style={{ textAlign: "center", padding: "40px 20px", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 16, maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontSize: 46, marginBottom: 8 }}>✨</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>תודה! החידוש נשלח לבדיקה</div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 420, margin: "0 auto" }}>
        החידוש ייבדק, ואם יאושר — יתפרסם במדור «חידושי הקהילה» <b style={{ color: L.goldDeep }}>עם שמכם</b>, ותקבלו הודעה עם קישור ישיר לצפייה בו.
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* דף-הנייר — משטח כתיבה חלק אחד, בלי מסגרות פנימיות */}
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
        placeholder={"כתבו כאן את החידוש שלכם — חופשי לגמרי.\nהשורה הראשונה תהיה הכותרת."}
        style={{ width: "100%", boxSizing: "border-box", minHeight: compact ? "30vh" : "46vh", resize: "vertical",
          background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, outline: "none",
          color: L.ink, fontFamily: F.body, fontSize: 16.5, lineHeight: 2, padding: "26px 28px",
          boxShadow: "0 10px 34px -18px rgba(0,0,0,.25)" }} />
      {/* שורת-הסיום: שם + שלח — ותו לא */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="✍️ השם שלכם (יופיע ליד החידוש)"
          style={{ flex: 1, minWidth: 180, background: L.panel, border: "none", borderBottom: `1.5px solid ${L.line}`,
            outline: "none", color: L.ink, fontFamily: F.body, fontSize: 14.5, padding: "8px 4px", borderRadius: 4 }} />
        <button onClick={submit} disabled={st === "sending"} style={{ cursor: st === "sending" ? "wait" : "pointer",
          background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00", border: "none", borderRadius: 999,
          fontFamily: F.heading, fontWeight: 800, fontSize: 15.5, padding: "12px 34px", boxShadow: "0 4px 16px rgba(154,120,24,0.3)" }}>
          {st === "sending" ? "שולח…" : "✦ שלח"}
        </button>
      </div>
      {err && <div style={{ color: "#b03030", fontFamily: F.body, fontSize: 13.5, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
