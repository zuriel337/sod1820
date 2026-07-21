import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getWhatsNewCounts } from "../lib/whatsNew.js";

// 🔔 כרטיס «מה חדש מאז ביקורך» — מצביע קומפקטי (שורה אחת) לדף הבית, מעל «עדכונים אחרונים».
// חוק-ברזל (לא-עמוס): מופיע רק כשיש משהו חדש; אין חדש → לא מרונדר כלל. מקור אחד עם מרכז השידורים.
const CHIPS = [
  { key: "forum", emoji: "💬", label: "פורום", acc: "#4fd6a8" },
  { key: "activity", emoji: "✨", label: "פעילות", acc: "#e8c84a" },
  { key: "channels", emoji: "📢", label: "ערוצים", acc: "#37d67a" },
  { key: "dev", emoji: "🛠️", label: "פיתוח", acc: "#a78bfa" },
];

export default function WhatsNewCard() {
  const P = usePalette();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let live = true;
    getWhatsNewCounts().then(c => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // אין נתונים עדיין, או אין שום דבר חדש → לא מציגים כלום (אפס עומס).
  if (!counts || !counts.total) return null;
  const active = CHIPS.filter(c => counts[c.key] > 0);

  return (
    <section className="hn-wrap" style={{ padding: "16px 18px 4px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 14,
        padding: "11px 15px", boxShadow: `0 4px 18px ${P.glow}`,
      }}>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap" }}>
          🔔 מה חדש מאז ביקורך
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {active.map(c => (
            <Link key={c.key} to={`/broadcasts?tab=${c.key}`} style={{
              display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
              border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px",
              color: P.ink, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, background: P.cardSoft,
            }}>
              <span>{c.emoji} {c.label}</span>
              <span style={{ background: c.acc, color: "#14100a", borderRadius: 999, fontSize: 11.5, fontWeight: 800, padding: "0 7px", fontVariantNumeric: "tabular-nums" }}>{counts[c.key]}</span>
            </Link>
          ))}
        </div>
        <Link to="/broadcasts" style={{
          whiteSpace: "nowrap", textDecoration: "none", background: P.accentBtn, color: P.onAccent,
          fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, borderRadius: 999, padding: "7px 16px",
        }}>
          📡 מרכז השידורים ←
        </Link>
      </div>
    </section>
  );
}
