import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getGalleriesByWpIds } from "../lib/supabase.js";

// 🖼 רצועת «פתח את הגלריה המלאה» — בפוסט ישן שמטמיע גלריות Hugeit.
// עץ אחד / «להפנות, לעולם לא להעתיק»: התמונות המוטמעות נשארות בגוף הפוסט כפי שהן,
// וזו רק עדשה שמפנה לאותה גלריה ב-Reality Archive, איפה שהיא עריכה + חיפוש + מספרים.
// המקור: מזהי ה-Hugeit שבתוך התוכן (huge_it_gallery_like_cont_<galleryId><postWpId>),
// וגם המרקר החדש data-sod-gallery-id="<wpGalleryId>". מציגים רק גלריות שנמצאות באמת.

// חילוץ wp_gallery_id-ים מתוך תוכן הפוסט. ה-Hugeit מקודד <galleryId><postWpId> —
// מסירים את סיומת ה-wp_id של הפוסט כדי לקבל את ה-wp_gallery_id הנקי.
function extractGalleryIds(content, wpId) {
  const out = new Set();
  const str = String(content || "");
  const suffix = String(wpId || "");
  // מרקר חי (אם הומר): data-sod-gallery-id="102"
  for (const m of str.matchAll(/data-sod-gallery-id="(\d+)"/g)) out.add(Number(m[1]));
  // Hugeit: huge_it_gallery_like_cont_10235096 → 102 (כשמסירים את 35096)
  for (const m of str.matchAll(/huge_it_gallery_[a-z_]*_(\d+)/g)) {
    const full = m[1];
    if (suffix && full.endsWith(suffix) && full.length > suffix.length) {
      const gid = Number(full.slice(0, full.length - suffix.length));
      if (gid > 0) out.add(gid);
    }
  }
  return [...out];
}

export default function PostGalleryLinks({ content, wpId }) {
  const P = usePalette();
  const [gals, setGals] = useState([]);

  useEffect(() => {
    const ids = extractGalleryIds(content, wpId);
    if (!ids.length) { setGals([]); return; }
    let alive = true;
    getGalleriesByWpIds(ids)
      .then(rows => {
        if (!alive) return;
        // סדר לפי wp_gallery_id יורד (החדשה קודם), כמו בארכיון
        const sorted = (rows || []).slice().sort((a, b) => (b.wp_gallery_id || 0) - (a.wp_gallery_id || 0));
        setGals(sorted);
      })
      .catch(() => alive && setGals([]));
    return () => { alive = false; };
  }, [content, wpId]);

  if (!gals.length) return null;

  return (
    <div style={{
      maxWidth: 640, margin: "30px auto 6px", padding: "16px 18px",
      border: `1px solid ${P.borderStrong}`, borderRadius: 14,
      background: P.cardSoft, direction: "rtl",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🖼️</span>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>
          {gals.length > 1 ? "הגלריות בפוסט זה — לחקירה מלאה" : "הגלריה בפוסט זה — לחקירה מלאה"}
        </span>
      </div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
        התמונות כאן הן עותק קבוע בתוך הפוסט. למי שרוצה להעמיק — אותה גלריה פתוחה אצלנו לחיפוש לפי מספר,
        סינון, סדר וכל ההקשרים.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {gals.map(g => (
          <Link
            key={g.id || g.wp_gallery_id}
            to={`/archive?tab=galleries&gal=${g.wp_gallery_id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
              border: `1px solid ${P.borderStrong}`, background: P.card, color: P.accentText,
              borderRadius: 999, padding: "8px 15px", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5,
            }}
          >
            {g.anchor_number != null && (
              <span style={{ fontFamily: F.mono, fontWeight: 800, color: P.onAccent, background: P.accentBtn, borderRadius: 999, padding: "1px 9px", fontSize: 12.5 }}>
                {g.anchor_number}
              </span>
            )}
            <span>{g.name || "גלריה"}</span>
            {g.img_count ? <span style={{ color: P.accentDim, fontSize: 12 }}>· {g.img_count} תמונות</span> : null}
            <span style={{ color: P.accentDim }}>»</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
