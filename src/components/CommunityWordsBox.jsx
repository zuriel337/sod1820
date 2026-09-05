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
export default function CommunityWordsBox({ light, max = 4, moreMax = 24, expandable = true, title = "✦ מילים חדשות שנוספו למאגר", variant = "simple" }) {
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

  const L = { panel: pal.card, ink: pal.ink, sub: pal.inkSoft, gold: pal.accentText, line: pal.border, chip: pal.cardSoft, badge: pal.glow, dim: pal.accentDim };\n  const research = variant === "research";\n  const writerTag = r => (r.tags || []).find(t => String(t).startsWith("writer:"))?.slice(7) || null;\n  const yearTags = r => (r.tags || []).filter(t => String(t).startsWith("year:")).map(t => String(t).slice(5));\n  const methodChips = r => [["רגיל", r.ragil], ["מסתתר", r.misratar], ["גדול", r.gadol], ["מילוי", r.miluy], ["משולש", r.kadmi], ["ריבוע", r.ribua]].filter(([, v]) => Number.isFinite(Number(v)) && Number(v) > 0);

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "13px 16px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, flexWrap: "wrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#25d366", boxShadow: "0 0 7px #25d366", flex: "0 0 auto" }} />
        <span style={{ color: L.gold, fontFamily: F.regal, fontSize: research ? 17 : 15.5, fontWeight: 800, flex: "1 1 auto", minWidth: 0, lineHeight: 1.4 }}>{title}</span>
        {/* הספירה בשורת-משנה משלה כשצר (מובייל) — לא נדחסת לצד הכותרת */}
        <span style={{ marginInlineStart: "auto", color: L.dim, fontFamily: F.heading, fontSize: 11.5, whiteSpace: "nowrap", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "3px 11px" }}>
          {total > 0 ? `סך הכל ${total.toLocaleString("he")} מילים במאגר` : `${rows.length} אחרונות`}
        </span>
      </div>
      <div style={{ display: "grid", gap: research ? 10 : 8 }}>
        {rows.map((r, i) => {
          const a = attribution(r), writer = writerTag(r) || (a?.kind === "author" ? a.label : null);
          const years = yearTags(r), methods = methodChips(r);
          return (
            <Link key={i} to={`/number/${encodeURIComponent(r.phrase)}`} title={`${r.phrase} = ${r.ragil}`}
              style={{ display: "flex", alignItems: research ? "stretch" : "center", gap: 9, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: research ? 14 : 11, padding: research ? "11px 12px" : "8px 11px" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: research ? 6 : 2 }}>
                <span style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: L.ink, fontFamily: F.body, fontSize: research ? 15 : 14.5, fontWeight: 700, minWidth: 0 }}>{r.phrase}</span>
                  {research && <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 12, fontWeight: 900, borderRadius: 999, padding: "2px 9px" }}>{r.ragil}</span>}
                  {research && r.is_verified && <span style={{ color: L.gold, border: `1px solid ${L.line}`, borderRadius: 999, padding: "1px 7px", fontFamily: F.heading, fontSize: 9.5, fontWeight: 900 }}>✓ מאומת</span>}
                  {research && !r.is_published && <span style={{ color: L.sub, border: `1px solid ${L.line}`, borderRadius: 999, padding: "1px 7px", fontFamily: F.heading, fontSize: 9.5 }}>במאגר המחקר</span>}
                </span>
                {research ? <>
                  <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {methods.slice(0, 5).map(([name, value]) => <span key={name} style={{ color: L.sub, fontFamily: F.heading, fontSize: 10.5, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 999, padding: "2px 7px" }}>{name} <b style={{ color: L.gold, fontFamily: F.mono }}>{value}</b></span>)}
                  </span>
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap", color: L.sub, fontFamily: F.body, fontSize: 10.5 }}>
                    {writer && <span>✍️ {writer}</span>}
                    {!writer && a && <span>{a.kind === "author" ? "✍️ " : "◈ מקור: "}{a.label}</span>}
                    {years.map(y => <span key={y}>📅 {y}</span>)}
                    {r.source?.startsWith("post:wp_id=") && <span>📰 פוסט {r.source.slice("post:wp_id=".length)}</span>}
                    {r.source?.startsWith("gallery_image:") && <span>🖼️ גלריה</span>}
                    {r.created_at && <span>🕒 {timeAgoHe(r.created_at)}</span>}
                  </span>
                </> : a && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.kind === "author" ? "מאת: " : "מקור: "}{a.label}</span>}
              </span>
              {!research && <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", flex: "0 0 auto" }}>{r.ragil}</span>}
              {!research && r.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap", flex: "0 0 auto" }}>{timeAgoHe(r.created_at)}</span>}
              {research && <span aria-hidden style={{ alignSelf: "center", color: L.gold, fontSize: 18 }}>←</span>}
            </Link>
          );
        })}
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