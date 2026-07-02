import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { timeAgoHe } from "../lib/format.js";
import { getRecentCommunityWords, getGematriaWordsCount } from "../lib/supabase.js";

// ✦ מילים חדשות שנוספו למאגר — הביטויים האחרונים (עם הערך והזמן) + סך המילים במאגר לפי האמת.
// מקור אחד (gematria_words לפי created_at) — מוצג בבית המדרש (מתחת למחשבון) ובדף הבית.
// props: light (override פלטה) · max · title.
export default function CommunityWordsBox({ light, max = 4, title = "✦ מילים חדשות שנוספו למאגר" }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);   // סך המילים במאגר — count אמיתי מה-DB

  useEffect(() => {
    let live = true;
    getRecentCommunityWords(max).then(r => { if (live) setRows(r || []); }).catch(() => {});
    getGematriaWordsCount().then(c => { if (live) setTotal(c || 0); }).catch(() => {});
    return () => { live = false; };
  }, [max]);

  if (!rows.length) return null;

  const L = { panel: pal.card, ink: pal.ink, sub: pal.inkSoft, gold: pal.accentText, line: pal.border, chip: pal.cardSoft, badge: pal.glow, dim: pal.accentDim };

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "13px 16px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, flexWrap: "wrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#25d366", boxShadow: "0 0 7px #25d366", flex: "0 0 auto" }} />
        <span style={{ color: L.gold, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, flex: "1 1 auto", minWidth: 0, lineHeight: 1.4 }}>{title}</span>
        {/* הספירה בשורת-משנה משלה כשצר (מובייל) — לא נדחסת לצד הכותרת */}
        <span style={{ marginInlineStart: "auto", color: L.dim, fontFamily: F.heading, fontSize: 11.5, whiteSpace: "nowrap", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "3px 11px" }}>
          {total > 0 ? `סך הכל ${total.toLocaleString("he")} מילים במאגר` : `${rows.length} אחרונות`}
        </span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, i) => (
          <Link key={i} to={`/number/${encodeURIComponent(r.phrase)}`} title={`${r.phrase} = ${r.ragil}`}
            style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 11, padding: "8px 11px" }}>
            <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.phrase}</span>
            <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", flex: "0 0 auto" }}>{r.ragil}</span>
            {r.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap", flex: "0 0 auto" }}>{timeAgoHe(r.created_at)}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
