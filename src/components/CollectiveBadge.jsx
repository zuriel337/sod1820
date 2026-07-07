import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCollectiveCount } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// 🔎 אות קהילתי (Collective Discovery) — הספירה הציבורית כ**שער כניסה**:
// גילוי → סקרנות → רצון להשתתף → הרשמה. גלוי לכולם (הוכחה חברתית = hook).
// אנונימי → CTA-הצטרפות טבעי · מחובר → תחושת השתייכות.
// שכבת-קהילה בלבד (research_items) — לא נכתב ל-nodes/edges (הגרף נשאר קשרים מאושרים בלבד).
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
  const count = n.toLocaleString("he");
  const verb = n === 1 ? "חוקר אחד חוקר" : `${count} חוקרים חוקרים`;
  return (
    <div style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 440,
      background: "var(--card,rgba(196,154,46,.10))", border: "1px solid var(--line,rgba(196,154,46,.35))",
      borderRadius: 14, padding: "10px 14px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--acc,#c79a2e)" }}>🔎 {verb} {label}</div>
      {user ? (
        <div style={{ fontSize: 12, color: "var(--ink,inherit)", opacity: 0.85, marginTop: 4, lineHeight: 1.65 }}>
          אתה חלק מהקהילה שחוקרת את זה · האוסף שלך בונה את המפה האישית שלך.
        </div>
      ) : (
        <Link to="/login" style={{ display: "block", marginTop: 5, fontSize: 12.5, fontWeight: 700,
          color: "var(--acc,#b8901f)", textDecoration: "none" }}>
          גם אתה רוצה להיכלל בגילוי הזה? שמור את הגילוי שלך והצטרף לחוקרים ←
        </Link>
      )}
    </div>
  );
}
