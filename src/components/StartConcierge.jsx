import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getAiAnalysis } from "../lib/supabase.js";
import { track } from "../lib/tracking.js";

// 🧭 מלווה-כניסה (concierge) — היברידי: 3 נתיבים מהירים (טאפ, בלי AI) + שדה-חופשי
//    שמפעיל סוכן-ניתוב (kind="guide", Haiku, זול). המטרה: לנתב מהר, לא לשוחח.
//    רכיב קנוני יחיד — משמש גם ב-/start וגם ב-/welcome. פולט tracking (section='concierge')
//    → אנחנו לומדים *מה* מבקשים המבקרים ו*לאן* הם בוחרים ללכת.
const QUICK = [
  { e: "👀", label: "חדש כאן — מה זה בכלל?", sub: "נכנסתי בפעם הראשונה", to: "/סוד-1820" },
  { e: "🔎", label: "יש לי מספר או שם לבדוק", sub: "רוצה לחשב עכשיו", to: "/number" },
  { e: "🔬", label: "רוצה להעמיק ולחקור", sub: "כל הכלים במקום אחד", to: "/research" },
];

// הסוכן (Haiku) לעיתים עוטף את ה-JSON ב-```json … ``` או מוסיף טקסט — פרסר עמיד:
// מסיר עטיפת-קוד, מחלץ מ-{ הראשון ל-} האחרון, ומאמת שיש picks.
function parseGuide(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const o = JSON.parse(t);
    if (o && Array.isArray(o.picks) && o.picks.length) {
      return { message: String(o.message || "").slice(0, 200), picks: o.picks.filter(p => p && p.to).slice(0, 3) };
    }
  } catch { /* ignore */ }
  return null;
}

export default function StartConcierge({ source = "start" }) {
  const P = usePalette();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);   // {message, picks}
  const [failed, setFailed] = useState(false);

  const goQuick = (item) => { try { track("concierge", item.to, "quick", { source }); } catch { /* noop */ } nav(item.to); };
  const goPick = (p) => { try { track("concierge", p.to, "pick", { source }); } catch { /* noop */ } nav(p.to); };

  const ask = async (e) => {
    e?.preventDefault?.();
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true); setFailed(false); setRes(null);
    try { track("concierge", null, "ask", { source, q: text.slice(0, 120) }); } catch { /* noop */ }
    const out = await getAiAnalysis({ kind: "guide", subject: text, fast: true });
    const parsed = parseGuide(out);
    if (parsed) setRes(parsed); else setFailed(true);
    setBusy(false);
  };

  const quickBtn = {
    display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", textAlign: "start",
    background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "13px 15px",
    cursor: "pointer", fontFamily: F.body, transition: "border-color .15s, transform .15s", width: "100%",
  };
  const pickBtn = {
    background: P.accentBtn, color: P.onAccent || "#1a0e00", border: "none", borderRadius: 999,
    padding: "9px 17px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, cursor: "pointer",
    textDecoration: "none", display: "inline-flex", alignItems: "center",
  };

  return (
    <div style={{
      background: P.cardGrad || P.card, border: `1px solid ${P.borderStrong || P.border}`,
      borderRadius: 18, padding: "20px 18px", marginBottom: 26, boxShadow: `0 8px 26px ${P.glow || "rgba(0,0,0,0.12)"}`,
    }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 4 }}>🧭</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>לא בטוחים מאיפה להתחיל?</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.6, marginTop: 3 }}>
          בחרו נתיב מהיר — או פשוט ספרו לי במילים שלכם, ואכוון אתכם למקום הנכון.
        </div>
      </div>

      {/* 3 נתיבים מהירים — טאפ אחד, בלי המתנה */}
      <div style={{ display: "grid", gap: 9, gridTemplateColumns: "1fr", marginBottom: 15 }}>
        {QUICK.map(item => (
          <button key={item.to} onClick={() => goQuick(item)} style={quickBtn}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; }}>
            <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>{item.e} {item.label}</span>
            <span style={{ color: P.accentDim, fontSize: 12.5 }}>{item.sub} ←</span>
          </button>
        ))}
      </div>

      {/* מפריד «או» */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 12px" }}>
        <span style={{ flex: 1, height: 1, background: P.border }} />
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>או כתבו לי</span>
        <span style={{ flex: 1, height: 1, background: P.border }} />
      </div>

      {/* שדה חופשי → סוכן-ניתוב */}
      <form onSubmit={ask} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} disabled={busy}
          placeholder="לדוגמה: «רוצה לבדוק את השם שלי» או «מה זה 1820?»" aria-label="ספרו מה מביא אתכם"
          style={{ flex: 1, minWidth: 200, boxSizing: "border-box", background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 12, padding: "12px 14px", color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" }} />
        <button type="submit" disabled={busy || !q.trim()} style={{
          ...pickBtn, opacity: (busy || !q.trim()) ? 0.55 : 1, cursor: (busy || !q.trim()) ? "default" : "pointer",
        }}>{busy ? "רגע…" : "כוונו אותי ←"}</button>
      </form>

      {/* תשובת הסוכן — הודעה חמה + כפתורי-יעד */}
      {res && (
        <div style={{ marginTop: 14, background: P.glow || "rgba(212,175,55,0.08)", border: `1px solid ${P.border}`, borderRadius: 14, padding: "13px 15px" }}>
          {res.message && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, marginBottom: 11 }}>{res.message}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {res.picks.map((p, i) => (
              <button key={i} onClick={() => goPick(p)} style={pickBtn}>{p.label || "פתחו ←"}</button>
            ))}
          </div>
        </div>
      )}

      {/* נפילה בחן — אם הסוכן לא זמין, מנתבים לנתיבים המהירים */}
      {failed && (
        <div style={{ marginTop: 12, color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, textAlign: "center" }}>
          לא הצלחתי לנתב כרגע — בחרו אחד מהנתיבים המהירים למעלה, או <button onClick={() => nav("/number")} style={{ background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontWeight: 800, cursor: "pointer", padding: 0, fontSize: 13.5 }}>היכנסו למנוע החיפוש ←</button>
        </div>
      )}
    </div>
  );
}
