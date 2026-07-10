import React, { useEffect, useState } from "react";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// 📏 שער-מכסת-AI (ai_quota_law) — מאזין לאירוע הגלובלי 'sod:ai-quota' שנפלט מ-getAiAnalysis
// כשהמכסה נגמרה, ומציג הודעה מכובדת. לאורח: הזמנה להרשמה חינם (פותח את מרכז-המשתמש).
// theme-aware, מובייל-ראשון, safe-area. נעלם אוטומטית או בסגירה.
export default function AiQuotaToast() {
  const { open: openCenter } = useUserCenter();
  const [info, setInfo] = useState(null); // { tier, used, limit, message }

  useEffect(() => {
    const onQuota = (e) => setInfo(e.detail || {});
    window.addEventListener("sod:ai-quota", onQuota);
    return () => window.removeEventListener("sod:ai-quota", onQuota);
  }, []);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 12000); // נעלם לבד אחרי 12ש
    return () => clearTimeout(t);
  }, [info]);

  if (!info) return null;
  const isAnon = info.tier === "anon";

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: "calc(18px + env(safe-area-inset-bottom, 0px))", zIndex: 3500,
      width: "min(440px, calc(100vw - 24px))", boxSizing: "border-box",
      background: "var(--sod-card, #14121c)", color: "var(--sod-ink, #f3efe6)",
      border: "1px solid rgba(212,175,55,.45)", borderRadius: 16,
      boxShadow: "0 14px 44px rgba(0,0,0,.5)", padding: "16px 18px",
      fontFamily: "inherit", direction: "rtl",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{isAnon ? "✨" : "🕓"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 4, color: "#e9c760" }}>
            {isAnon ? "רוצים להמשיך עם ה-AI?" : "מכסת ה-AI היומית הסתיימה"}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.95 }}>
            {info.message || "הגעת למכסת שאלות-ה-AI היומית."}
          </div>
          {isAnon && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>ההרשמה חינמית ולוקחת פחות מדקה.</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {isAnon && (
              <button onClick={() => { setInfo(null); try { openCenter(); } catch { /* noop */ } }}
                style={{ cursor: "pointer", border: "none", borderRadius: 999, padding: "10px 20px",
                  fontWeight: 800, fontSize: 14, background: "linear-gradient(135deg,#e9c760,#c9a227)", color: "#1a1508" }}>
                הירשמו בחינם ←
              </button>
            )}
            <button onClick={() => setInfo(null)}
              style={{ cursor: "pointer", background: "transparent", color: "inherit", opacity: 0.7,
                border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "10px 16px", fontSize: 13 }}>
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
