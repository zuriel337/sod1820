import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// 🌱 «הקהילה בשלב ההקמה» — מחליף תגובות-פתוחות בפוסטים כל עוד הקהילה נבנית (החלטת צוריאל).
// במקום תיבה ריקה («אף אחד לא פה») → הזמנה איכותית: הוסף חידוש למחקר בבית המדרש.
// מד אמיתי (ספירת תרומות מאושרות) — לא אחוז-דמה (research_workspace_law: «מספרים ביושר»).
export default function CommunityForming({ to = "/beit-midrash" }) {
  const P = usePalette();
  const [count, setCount] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.from("research_contributions").select("id", { count: "exact", head: true })
      .is("parent_id", null).eq("status", "approved")
      .then(({ count }) => { if (live) setCount(count ?? 0); })
      .catch(() => { /* אם חסום — פשוט לא מציגים מספר */ });
    return () => { live = false; };
  }, []);

  const dark = P.mode !== "light";
  return (
    <div style={{
      marginTop: 48, maxWidth: 640, marginInline: "auto", textAlign: "center",
      border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "24px 22px 26px",
      background: `linear-gradient(160deg, ${dark ? "rgba(212,175,55,.07)" : "rgba(212,175,55,.12)"}, ${P.card})`,
    }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🌱</div>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 21, fontWeight: 800, marginBottom: 9 }}>
        הקהילה בשלב ההקמה
      </div>
      <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, maxWidth: 490, margin: "0 auto" }}>
        דיון פתוח בין החוקרים ייפתח כשנגיע להיקף פעילות מתאים. בינתיים — יש לך <b style={{ color: P.ink }}>חידוש או רמז</b>?
        הוסף אותו למחקר, וייבדק וישתלב.
      </p>
      {count != null && count > 0 && (
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, margin: "13px 0 2px" }}>
          🌿 <b style={{ color: P.accentText }}>{count}</b> חידושים כבר נאספו במחקר
        </div>
      )}
      <Link to={to} style={{
        display: "inline-block", marginTop: 14, textDecoration: "none",
        background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontWeight: 800, fontSize: 15,
        borderRadius: 999, padding: "11px 28px", boxShadow: `0 6px 20px ${P.glow}`,
      }}>
        ✍️ כתוב חידוש בבית המדרש ←
      </Link>
    </div>
  );
}
