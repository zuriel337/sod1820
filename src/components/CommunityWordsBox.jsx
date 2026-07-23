import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { timeAgoHe } from "../lib/format.js";
import { getRecentCommunityWords, getGematriaWordsCount } from "../lib/supabase.js";

// ✦ מילים חדשות שנוספו למאגר — הביטויים האחרונים (עם הערך, שם הכותב/המקור והזמן) + סך המילים במאגר.
// מקור אחד (gematria_words לפי created_at) — מוצג בבית המדרש (מתחת למחשבון) ובדף הבית.
// props: light (override פלטה) · max · title.

// שם הכותב/מביא הגימטריה (vip_source) — העיקר. בנפילה: תווית-מקור טכנית ידידותית (source).
function attribution(r) {
  const author = (r.vip_source || "").trim();
  if (author) return { label: author, kind: "author" };   // «מאת: <שם>»
  const s = (r.source || "").trim();
  if (!s) return null;
  let src;
  if (/^וואטסאפ/.test(s)) src = s;                                     // "וואטסאפ הגילוי היומי"
  else if (s.startsWith("auto:")) src = s.slice(5).replace(/\s*wp\d+\s*$/i, "").trim() || "תיעוד אירועים";
  else if (/^גלריי?ת/.test(s)) src = "גלריית סוד1820";
  else src = ({
    excel_import: "מאגר היסוד",
    sod1820: "סוד1820",
    admin_curated: "נבחר ע״י המערכת",
    community: "מהקהילה",
    manual: "הזנה ידנית",
  })[s] || s;
  return { label: src, kind: "source" };
}
export default function CommunityWordsBox({ light, max = 4, moreMax = 24, expandable = true, title = "✦ מילים חדשות שנוספו למאגר" }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);   // סך המילים במאגר — count אמיתי מה-DB
  const [showAll, setShowAll] = useState(false);   // 🔽 «ראה מילים קודמות» — פותח את הרשימה
  const limit = showAll ? moreMax : max;

  useEffect(() => {
    let live = true;
    getRecentCommunityWords(limit).then(r => { if (live) setRows(r || []); }).catch(() => {});
    getGematriaWordsCount().then(c => { if (live) setTotal(c || 0); }).catch(() => {});
    return () => { live = false; };
  }, [limit]);

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
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14.5, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.phrase}</span>
              {(() => { const a = attribution(r); return a && (
                <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.kind === "author" ? "מאת: " : "מקור: "}{a.label}
                </span>
              ); })()}
            </span>
            <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", flex: "0 0 auto" }}>{r.ragil}</span>
            {r.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap", flex: "0 0 auto" }}>{timeAgoHe(r.created_at)}</span>}
          </Link>
        ))}
      </div>
      {/* 🔽 «ראה מילים קודמות» — פותח את הרשימה (max→moreMax) · «הצג פחות» מקפל בחזרה */}
      {expandable && total > max && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          style={{ width: "100%", marginTop: 9, background: "transparent", border: `1px solid ${L.line}`, borderRadius: 11,
            padding: "9px 12px", color: L.gold, fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {showAll ? "הצג פחות ↑" : "ראה מילים קודמות ↓"}
        </button>
      )}
    </div>
  );
}
