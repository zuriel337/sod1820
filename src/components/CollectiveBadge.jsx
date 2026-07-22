import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCollectiveCount } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// 🔎 אות קהילתי (Collective Discovery) — הספירה הציבורית כ**שער כניסה**:
// גילוי → סקרנות → רצון להשתתף → הרשמה. גלוי לכולם (הוכחה חברתית = hook).
// שכבת-קהילה מאוחדת (4a: שמירות + חידושים מאושרים, entity_collective_count) — לא נכתב ל-nodes/edges.
// ⭐ סף-התכנסות: כש-≥CONVERGENCE_MIN חוקרים שונים נפגשים באותו node — מוקרן כ«התכנסות קהילתית»
//    (אות מודגש), לא סתם ספירה. כשמעט — נשאר עדין. אות אמיתי, מרוויח את עצמו.
const CONVERGENCE_MIN = 3;

export default function CollectiveBadge({ type, refv, label = "את זה" }) {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!type || refv == null || refv === "") return;
    let alive = true;
    getCollectiveCount(type, refv).then(c => { if (alive) setN(c || 0); });
    return () => { alive = false; };
  }, [type, refv]);
  if (n < 1) return null;
  const convergence = n >= CONVERGENCE_MIN;
  const count = n.toLocaleString("he");
  const verb = n === 1 ? "אדם אחד בודק" : `${count} אנשים בודקים`;
  return (
    <div style={{
      textAlign: "center", margin: "10px auto 0", maxWidth: 460,
      background: convergence ? "var(--card,rgba(196,154,46,.16))" : "var(--card,rgba(196,154,46,.10))",
      border: `1px solid var(--line,rgba(196,154,46,${convergence ? ".6" : ".35"}))`,
      boxShadow: convergence ? "0 0 0 1px var(--line,rgba(196,154,46,.4)) inset" : "none",
      borderRadius: 14, padding: "11px 15px",
    }}>
      <div style={{ fontSize: convergence ? 14.5 : 14, fontWeight: 800, color: "var(--acc,#c79a2e)" }}>
        {convergence
          ? `🔎 התכנסות קהילתית — ${count} אנשים בודקים ${label}`
          : `🔎 ${verb} ${label}`}
      </div>
      {convergence && (
        <div style={{ fontSize: 12, color: "var(--ink,inherit)", opacity: 0.8, marginTop: 3, lineHeight: 1.6 }}>
          כשהרבה אנשים נפגשים באותה נקודה — זה סימן ששווה להתעמק בו.
        </div>
      )}
      {user ? (
        <div style={{ fontSize: 12, color: "var(--ink,inherit)", opacity: 0.85, marginTop: 4, lineHeight: 1.65 }}>
          אתה חלק מהקהילה שבודקת את זה · האוסף שלך בונה את המפה האישית שלך.
        </div>
      ) : (
        <Link to="/login" style={{ display: "block", marginTop: 5, fontSize: 12.5, fontWeight: 700,
          color: "var(--acc,#b8901f)", textDecoration: "none" }}>
          גם אתה רוצה להיכלל בגילוי הזה? שמור את הגילוי שלך והצטרף לקהילה ←
        </Link>
      )}
    </div>
  );
}
