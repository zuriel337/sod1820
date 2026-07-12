// 🧪 משוב-בטא לניתוח AI (ai_style_learning_law) — שורה צנועה אחת מתחת לניתוח.
// "המערכת מסכמת נתונים, צוריאל מעצב את הסגנון": ההצבעה נצברת ל-ai_analysis_log ומופיעה
// בדו"ח הסגנונות באדמין. משוב = סגנון והגשה בלבד — לעולם לא עובדות.
// דו-צבעיות (dual_theme_every_element_law): צבעים דרך props/ירושה, עובד בהיר+כהה.
import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { sendAiSignal } from "../lib/supabase.js";

export default function AiFeedback({ dim = "rgba(140,140,150,0.85)", accent = "#4c9f6f" }) {
  const [log, setLog] = useState(null);
  const [voted, setVoted] = useState(false);
  useEffect(() => {
    // הניתוח האחרון שנרשם (getAiAnalysis משדר sod:ai-logged אחרי כל ניתוח מוצלח)
    const cur = window.__sodAiLog;
    if (cur && Date.now() - cur.at < 60 * 1000) attach(cur);
    const on = (e) => attach({ id: e.detail?.id, at: Date.now() });
    window.addEventListener("sod:ai-logged", on);
    return () => window.removeEventListener("sod:ai-logged", on);
    function attach(l) {
      if (!l?.id) return;
      setLog(l);
      try { setVoted(!!localStorage.getItem(`sod_ai_fb_${l.id}`)); } catch { setVoted(false); }
    }
  }, []);
  if (!log) return null;
  const vote = (sig) => {
    if (voted) return;
    sendAiSignal(log.id, sig);
    try { localStorage.setItem(`sod_ai_fb_${log.id}`, sig); } catch { /* noop */ }
    setVoted(true);
  };
  const btn = { cursor: "pointer", background: "transparent", border: `1px solid ${dim}`, borderRadius: 999, padding: "3px 11px", fontSize: 13, lineHeight: 1.4, color: "inherit" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 9, fontFamily: F.body, fontSize: 11.5, color: dim }}>
      {voted
        ? <span style={{ color: accent }}>תודה! המשוב עוזר למחקר להשתכלל 🌱</span>
        : <>
            <span>🧪 מחקר מתפתח — האם זה פתח לך כיוון?</span>
            <button onClick={() => vote("up")} style={btn} aria-label="עזר לי">👍</button>
            <button onClick={() => vote("down")} style={btn} aria-label="פחות">👎</button>
          </>}
    </div>
  );
}
