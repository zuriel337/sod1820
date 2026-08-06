import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getContributionsByNumber } from "../lib/contributions.js";
import { stripHtml } from "../lib/format.js";

// 🌳 «מוזכר בפורום» — תגובות-קהילה שתייגו את המספר הזה (gematria_claim.numbers), גם אם נכתבו על ישות
//    אחרת. עץ אחד: התגובה נעשית חוליה בגרף ומופיעה בדף-המספר — בדיוק כמו רמז-מציאות עם primary_value.
export default function ForumNumberMentions({ n }) {
  const P = usePalette();
  const [items, setItems] = useState(null);
  useEffect(() => { if (n) getContributionsByNumber(n).then(setItems).catch(() => setItems([])); }, [n]);
  if (!items || !items.length) return null;

  const hrefOf = (it) =>
    it.target_type === "els" ? `/codes/${encodeURIComponent(it.target_id)}`
      : it.target_id ? `/number/${encodeURIComponent(it.target_id)}#comments` : "/forum";

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800, marginBottom: 4 }}>💬 מוזכר בפורום</div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginBottom: 10 }}>תגובות-קהילה שקישרו את המספר הזה לגימטריה — מחוברות לעץ.</div>
      <div style={{ display: "grid", gap: 9 }}>
        {items.map(it => {
          const rows = Array.isArray(it.gematria_claim?.rows) ? it.gematria_claim.rows : [];
          const text = stripHtml(it.body || "").replace(/^[.\s]+$/, "").slice(0, 150)
            || (rows[0] ? `${rows[0].note || ""} = ${rows[0].value}` : "תגובת-גימטריה");
          return (
            <Link key={it.id} to={hrefOf(it)} style={{ textDecoration: "none", display: "block", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 13px" }}>
              <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6 }}>{text}</div>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 4 }}>✍️ {it.author_name || "חבר הקהילה"} · מהפורום ←</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
