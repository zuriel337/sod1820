import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { track } from "../lib/tracking.js";
import { getOpenChallengesByDomain } from "../lib/challenges.js";

// 🆘 רצועת «אתגרי-צופן פתוחים» — מינימלית, בראש עמוד-הכלי בלבד. גבול ברור (החלטת צוריאל):
//   רצועה אחת · עד 5 אתגרים · לכל אחד כותרת קצרה + מי-פתח + «🔍 חפש עכשיו» שמזין את המשפט לכלי.
//   אין התראות · אין פופאפ · אין רעש. אין אתגרים פתוחים → הרצועה לא מופיעה כלל.
//   מדידה (visitor_events, בלי טבלה מקבילה): הצגה + לחיצה → הדוח יודע אם היא באמת מחברת חוקר לכלי.
export default function ElsChallengeStrip({ onPick }) {
  const P = usePalette();
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    getOpenChallengesByDomain("els", 5).then(d => { if (alive) setItems(d); }).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, []);

  // 📊 מדידה: הרצועה הוצגה (עם ≥1 אתגר) — פעם אחת בכל טעינה
  useEffect(() => {
    if (items && items.length) track("els_challenge", null, "strip_shown", { count: items.length });
  }, [items]);

  if (!items || !items.length) return null;

  function pick(c) {
    const phrase = c.phrase || c.title || "";
    if (!phrase) return;
    track("els_challenge", phrase.slice(0, 80), "search_click", { challenge_id: c.id, uid: user?.id || null });
    onPick?.(phrase);
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1040, margin: "0 auto", padding: "10px 14px 0" }}>
      <div style={{ background: "linear-gradient(135deg, rgba(214,74,58,0.10), rgba(212,175,55,0.06))", border: `1px solid ${P.borderStrong}`, borderRadius: 12, padding: "10px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length ? 8 : 0, flexWrap: "wrap" }}>
          <span style={{ color: "#d64a3a", fontFamily: F.heading, fontSize: 12.5, fontWeight: 900 }}>🆘 אתגרי-צופן פתוחים</span>
          <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>מחקר שמחכה לחוקר — פצחו אותו בכלי</span>
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {items.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "8px 11px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.phrase || c.title}</div>
                {c.opened_by_name && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>נפתח ע״י {c.opened_by_name}</div>}
              </div>
              <button onClick={() => pick(c)} style={{ flex: "0 0 auto", cursor: "pointer", background: P.accentBtn, border: "none", color: P.onAccent || "#1a0e00", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "7px 15px", minHeight: 38 }}>🔍 חפש עכשיו</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
