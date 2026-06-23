import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getGalleryUpdates } from "../lib/supabase.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";

// ===== פיד «עדכוני גלריה» (/gallery-updates) =====
// עדשה על gallery_images (source='update') — תצלומי-עדכון טריים שלא ייבלעו בארכיון.
// «חדש» = נוסף מאז הביקור האחרון (per-user, חוק whats_new_law). מפתח: gallery-updates.
// עץ אחד: כל תמונה מקושרת למספר שלה (/number/:value) — לא מערכת מקבילה.

const updDate = iso => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
};

export default function GalleryUpdatesPage() {
  const P = usePalette();
  const [items, setItems] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const cutoff = useMemo(() => seenCutoff("gallery-updates"), []);

  useEffect(() => {
    applySeo({ title: "עדכוני גלריה", description: "עדכוני הגלריה האחרונים — תצלומי חדשות וממצאים טריים, כל אחד מחובר למספר ולגימטריה שלו.", path: "/gallery-updates" });
    getGalleryUpdates(60).then(rows => { setItems(rows || []); markSeenKey("gallery-updates"); }).catch(() => setItems([]));
  }, []);

  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: P.pageBg, color: P.ink }}>
      <style>{`
        .gu-wrap { max-width: 760px; margin: 0 auto; padding: 40px 16px 80px; }
        .gu-card { background:${P.card}; border:1px solid ${P.border}; border-radius:16px; overflow:hidden; margin-bottom:22px; }
        .gu-card.fresh { border-color:#e0556a; box-shadow:0 0 0 1px #e0556a55; }
        .gu-img { display:block; width:100%; height:auto; cursor:zoom-in; background:${P.cardSoft}; }
        .gu-chip { text-decoration:none; font-family:${F.mono}; font-weight:800; font-size:13px; color:${P.onAccent};
          background:${P.accentBtn}; border-radius:999px; padding:3px 12px; }
        .gu-new { background:#e0556a; color:#fff; font-family:${F.heading}; font-size:11px; font-weight:800; border-radius:999px; padding:2px 10px;
          animation:gu-pulse 1.8s ease-in-out infinite; }
        @keyframes gu-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.55; } }
      `}</style>

      <div className="gu-wrap">
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,40px)", fontWeight: 800, margin: 0 }}>🆕 עדכוני גלריה</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, margin: "10px 0 0" }}>
            תצלומי החדשות והממצאים האחרונים — כל אחד מחובר למספר ולגימטריה שלו
          </p>
          <Link to="/archive" style={{ display: "inline-block", marginTop: 12, color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5 }}>
            🖼 אל כל הגלריות והמאגר →
          </Link>
        </div>

        {items === null && <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 50 }}>טוען…</div>}
        {items !== null && items.length === 0 && (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 50 }}>אין עדכונים עדיין.</div>
        )}

        {(items || []).map(im => {
          const fresh = isNewSince(im, cutoff);
          const title = cleanName(im.name);
          const nums = [...new Set([...(im.all_values || []), ...(im.primary_value != null ? [im.primary_value] : [])])];
          return (
            <article key={im.id} className={`gu-card${fresh ? " fresh" : ""}`}>
              <img src={im.image_url} alt={title || ""} className="gu-img" loading="lazy" onClick={() => setLightbox(im)} />
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: title ? 8 : 0 }}>
                  {fresh && <span className="gu-new">🆕 חדש</span>}
                  {im.occurred_at && <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>🗓️ {updDate(im.occurred_at)}</span>}
                </div>
                {title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{title}</div>}
                {im.description && (
                  <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, marginTop: 6, whiteSpace: "pre-wrap" }}>{stripHtml(im.description)}</div>
                )}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
                  {nums.slice(0, 8).map(v => (
                    <Link key={v} to={`/number/${v}`} className="gu-chip">{v} →</Link>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.95)", overflowY: "auto", padding: "32px 16px", direction: "rtl" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              <button onClick={() => setLightbox(null)} style={{ background: "none", border: "1px solid #ffffff55", color: "#fff", fontSize: 22, cursor: "pointer", borderRadius: 8, width: 42, height: 42 }}>×</button>
            </div>
            <img src={lightbox.image_url} alt={cleanName(lightbox.name) || ""} style={{ width: "100%", display: "block", borderRadius: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}
