import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { track } from "../lib/tracking.js";
import { applySeo } from "../lib/seo.js";
import { INTENTS, intentMeta, stateMeta, getForumContributions } from "../lib/contributions.js";

// 🌐 הפורום — העדשה הגלובלית על כל תרומות-המחקר של הקהילה (research_contribution_law).
// לא «פורום» של פטפוט — פורום מחקר: חידושים, השערות, מקורות, שאלות — מכל האתר, במקום אחד.
function timeAgo(ts) {
  try {
    const s = (Date.now() - new Date(ts)) / 1000;
    if (s < 3600) return `לפני ${Math.max(1, Math.floor(s / 60))} דק׳`;
    if (s < 86400) return `לפני ${Math.floor(s / 3600)} שע׳`;
    if (s < 604800) return `לפני ${Math.floor(s / 86400)} ימים`;
    return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch { return ""; }
}

function targetHref(t) {
  if (!t?.target_id) return null;
  if (t.target_type === "number" || t.target_type === "phrase") return `/number/${encodeURIComponent(t.target_id)}#comments`;
  return null;
}

function Card({ c, P }) {
  const [open, setOpen] = useState(false);
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const href = targetHref(c);
  const long = (c.body || "").length > 420;
  const badge = (col, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: col, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{txt}</span>;
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        {badge(P.accentText, `${im.emoji} ${im.label}`)}
        {badge(P.accentDim, `${sm.emoji} ${sm.label}`)}
        {c.target_id && <Link to={href || "#"} style={{ textDecoration: "none" }}>{badge(P.accent, `${c.target_type === "number" ? "🔢" : "🔖"} ${c.target_id}`)}</Link>}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.created_at)}</span>
      </div>
      {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 5 }}>{c.title}</div>}
      {c.body && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
          {open || !long ? c.body : c.body.slice(0, 420) + "…"}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ נכתב על ידי <b style={{ color: P.accentText }}>{c.author_name || "חבר הקהילה"}</b></span>
        {long && <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: 0 }}>{open ? "▴ הסתר" : "▾ קרא עוד"}</button>}
        {href && <Link to={href} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>המשך בדיון ←</Link>}
      </div>
    </div>
  );
}

export default function ForumPage() {
  const P = usePalette();
  const [items, setItems] = useState(null);
  const [intent, setIntent] = useState(null);

  useEffect(() => { track("forum"); applySeo({ title: "פורום המחקר הקהילתי · סוד 1820", description: "כל חידושי, השערות ומקורות הקהילה במקום אחד — פורום המחקר של סוד 1820.", path: "/forum" }); }, []);
  useEffect(() => { setItems(null); getForumContributions({ intent }).then(setItems).catch(() => setItems([])); }, [intent]);

  const chip = (on) => ({ cursor: "pointer", borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
    border: `1px solid ${on ? P.borderStrong : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent", color: on ? P.accentText : P.accentDim });

  return (
    <div dir="rtl" style={{ maxWidth: 780, margin: "0 auto", padding: "26px 16px 90px", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>מחקר קהילתי · פורום</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, margin: "0 0 8px" }}>🌐 פורום המחקר</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
          כל חידושי, השערות, מקורות ושאלות הקהילה — מכל האתר, במקום אחד. לחיצה על תרומה מובילה לדיון המלא בהקשר שלה.
        </p>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 18 }}>
        <button onClick={() => setIntent(null)} style={chip(!intent)}>הכל</button>
        {INTENTS.filter(i => i.key !== "תגובה").map(i => (
          <button key={i.key} onClick={() => setIntent(i.key)} style={chip(intent === i.key)}>{i.emoji} {i.label}</button>
        ))}
      </div>

      {items === null ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 40 }}>טוען…</div>
      ) : !items.length ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "50px 20px", lineHeight: 1.8 }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.7 }}>🌱</div>
          עדיין אין תרומות בקטגוריה הזו — היו הראשונים לתרום מדף מספר או מבית המדרש.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 13 }}>
          {items.map(c => <Card key={c.id} c={c} P={P} />)}
        </div>
      )}
    </div>
  );
}
