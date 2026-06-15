import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getPostByWpId, getShareCount } from "../lib/supabase.js";

// ── "תפילות פופולריות" — הפניה לתפילות החזקות באתר ──
// מוצג בראש דפי תגית שקשורים לתפילה/רפואה/ישועה (מי שמחפש תפילה — מגיע לכאן).
// כל פריט מציג כותרת, תמונה ומונה שיתופים אמיתי (post_share_counts).

const FEATURED = [
  { wpId: 29289, label: "סדר תפילה לרפואה שלמה — רבי פנחס מקוריץ", note: "תפילת רבי פנחס מקוריץ זי\"ע ותפילת חזקיהו המלך" },
  { wpId: 36173, label: "תפילה לרפואה של הינוקא — רבי שלמה יהודה", note: "פסוקי רפואה ותפילה לרפואת רבי שלמה יהודה" },
];

// מילות מפתח שמסמנות תגית "תפילתית" → להציג את התיבה.
const PRAYER_HINTS = ["תפיל", "רפוא", "ישוע", "סגול", "תהיל", "חולה", "מגפ", "מגיפ", "צרה", "דינ", "רחמ", "ברכ", "שמיר"];

export function isPrayerTag(name = "") {
  return PRAYER_HINTS.some(h => name.includes(h));
}

export default function PopularPrayersBox({ excludeWpId = null, title = "🙏 תפילות פופולריות" }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all(
      FEATURED
        .filter(f => f.wpId !== excludeWpId)
        .map(async f => {
          const [post, count] = await Promise.all([
            getPostByWpId(f.wpId).catch(() => null),
            getShareCount(f.wpId).catch(() => 0),
          ]);
          if (!post?.slug) return null;
          return { ...f, slug: post.slug, image: post.image_url || null, count: count || 0 };
        })
    ).then(rows => { if (alive) setItems(rows.filter(Boolean)); });
    return () => { alive = false; };
  }, [excludeWpId]);

  if (items.length === 0) return null;

  return (
    <div className="ppb" dir="rtl">
      <div className="ppb-head">
        <span className="ppb-title">{title}</span>
        <span className="ppb-sub">תפילות שאלפים כבר שיתפו — אולי דווקא השיתוף שלכם יביא ישועה</span>
      </div>
      <div className="ppb-grid">
        {items.map(it => (
          <Link key={it.wpId} to={`/${it.slug}`} className="ppb-card">
            <div className="ppb-thumb" style={{
              background: it.image ? `center/cover no-repeat url(${it.image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
            }}>
              {!it.image && <span className="ppb-mark">🙏</span>}
              <span className="ppb-holo" />
              {it.count >= 15 && <span className="ppb-count">✨ {it.count.toLocaleString("he-IL")} שיתופים</span>}
            </div>
            <div className="ppb-body">
              <div className="ppb-name">{it.label}</div>
              {it.note && <div className="ppb-note">{it.note}</div>}
              <div className="ppb-cta">לתפילה ולשיתוף ←</div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .ppb { max-width: 920px; margin: 0 auto 30px; padding: 18px 18px 16px;
          border: 1px solid ${C.borderGold}; border-radius: 18px;
          background: linear-gradient(150deg, rgba(212,175,55,0.1), rgba(122,19,32,0.12));
          box-shadow: 0 14px 44px rgba(0,0,0,0.45); }
        .ppb-head { text-align: center; margin-bottom: 14px; }
        .ppb-title { display: block; color: ${C.goldBright}; font-family: ${F.regal}; font-weight: 700;
          font-size: clamp(18px,3.4vw,24px); text-shadow: 0 0 30px rgba(212,175,55,0.3); }
        .ppb-sub { display: block; color: ${C.goldLight}; font-family: ${F.body}; font-size: 13.5px; margin-top: 6px; opacity: 0.9; }
        .ppb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
        .ppb-card { display: flex; flex-direction: column; text-decoration: none; overflow: hidden;
          border: 1px solid ${C.border}; border-radius: 14px;
          background: linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.5));
          transition: border-color .18s, transform .18s, box-shadow .18s; }
        .ppb-card:hover { border-color: ${C.gold}; transform: translateY(-3px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.18); }
        .ppb-thumb { position: relative; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; }
        .ppb-mark { font-size: 32px; opacity: 0.7; }
        .ppb-holo { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(5,4,0,0.85)); }
        .ppb-count { position: absolute; top: 8px; right: 8px; z-index: 2; background: rgba(212,175,55,0.94); color: #1a0e00;
          font-family: ${F.heading}; font-size: 11.5px; font-weight: 800; padding: 3px 10px; border-radius: 999px; }
        .ppb-body { padding: 13px 15px 15px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .ppb-name { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 15.5px; font-weight: 700; line-height: 1.4; }
        .ppb-note { color: ${C.muted}; font-family: ${F.body}; font-size: 12.5px; line-height: 1.6; }
        .ppb-cta { margin-top: auto; padding-top: 6px; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700; }
      `}</style>
    </div>
  );
}
