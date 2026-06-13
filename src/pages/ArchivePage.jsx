import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getGalleriesOverview, getGalleryDetail } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";

// ===== גלריית רמזי הגאולה (/archive) — דף הגלריות הרשמי =====
// כרטיסי גלריות (כריכה+שם+עוגן+ספירה) → לחיצה פותחת גלריה בסדר כרונולוגי (ordering)
// עם המלל מתחת לכל תמונה + קישור לדף הישות של המספר.

export default function ArchivePage() {
  const [gals, setGals] = useState(null);
  const [sel, setSel] = useState(null);     // selected gallery {id,name,anchor}
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getGalleriesOverview().then(({ gals, imgs }) => {
      // תאריך תוכן לכריכה — occurred_at (אם יש), אחרת שנה/חודש מכתובת ההעלאה.
      const dateOf = im => {
        if (im.occurred_at) return Number(im.occurred_at.slice(0, 7).replace("-", ""));
        const m = (im.image_url || "").match(/\/uploads\/(\d{4})\/(\d{2})\//); return m ? Number(m[1] + m[2]) : 0;
      };
      const agg = {};
      for (const im of imgs) {
        const g = im.gallery_id, d = dateOf(im);
        if (!agg[g]) agg[g] = { count: 0, maxd: 0, cover: null };
        agg[g].count++;
        if (d >= agg[g].maxd) { agg[g].maxd = d; agg[g].cover = im.image_url; }   // כריכה = התמונה העדכנית בגלריה
      }
      // סדר הגלריות = רצף היצירה המקורי (wp_gallery_id) — הסדר הכרונולוגי הקדוש: החדשה ביותר למעלה.
      const list = gals
        .map(g => ({ id: g.id, name: g.name, anchor: g.anchor_number, seq: g.wp_gallery_id ?? -1, count: agg[g.id]?.count || 0, cover: agg[g.id]?.cover }))
        .filter(g => g.count > 0)
        .sort((a, b) => b.seq - a.seq);
      setGals(list);
    }).catch(() => setGals([]));
  }, []);

  // תאריך התמונה (לפי המידע שנכרה מהתיאור) — חודש ושנה בעברית. ריק אם אין מידע.
  const imgDate = occ => {
    if (!occ) return null;
    try { return new Date(occ).toLocaleDateString("he-IL", { year: "numeric", month: "long" }); }
    catch { return null; }
  };

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    setLoadingDetail(true);
    getGalleryDetail(sel.id).then(d => { setDetail(d); setLoadingDetail(false); }).catch(() => setLoadingDetail(false));
  }, [sel]);

  const total = useMemo(() => (gals || []).reduce((s, g) => s + g.count, 0), [gals]);

  return (
    <div style={{ direction: "rtl", maxWidth: 1280, margin: "0 auto", padding: "48px 18px 90px", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>הארכיון החי</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(28px,5vw,46px)", fontWeight: 700, margin: 0, textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
          🖼️ גלריית רמזי הגאולה
        </h1>
        {gals && (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 15, marginTop: 10 }}>
            {gals.length} גלריות · {total.toLocaleString()} תמונות · כל תמונה מחוברת למספר שלה
          </div>
        )}
      </div>

      {gals === null ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען גלריות…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
          {gals.map(g => (
            <button key={g.id} onClick={() => setSel(g)} style={{
              position: "relative", cursor: "pointer", textAlign: "right", padding: 0, overflow: "hidden",
              border: `1px solid ${C.border}`, borderRadius: 14, background: "#000", aspectRatio: "4/3",
            }} className="arch-card">
              {g.cover && <img src={g.cover} alt={g.name || ""} loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.85 }} />}
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(5,4,0,0.92))" }} />
              {g.anchor != null && (
                <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: "rgba(212,175,55,0.92)", color: "#1a0e00",
                  fontFamily: F.mono, fontSize: 13, fontWeight: 800, padding: "2px 9px", borderRadius: 999 }}>{g.anchor}</span>
              )}
              <span style={{ position: "absolute", bottom: 10, insetInline: 12, color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.35,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {g.name || `גלריה`}
                <span style={{ display: "block", color: C.goldDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700, marginTop: 3 }}>{g.count} תמונות ←</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* פירוט גלריה */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.94)", overflowY: "auto", padding: "40px 16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, margin: "0 auto", direction: "rtl" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, position: "sticky", top: 0, background: "rgba(3,2,8,0.85)", backdropFilter: "blur(8px)", padding: "6px 0" }}>
              <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, margin: 0, flex: 1 }}>
                {sel.anchor != null && <span style={{ color: C.gold, fontFamily: F.mono }}>{sel.anchor} · </span>}{sel.name}
              </h2>
              <button onClick={() => setSel(null)} style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 22, cursor: "pointer", borderRadius: 8, width: 40, height: 40, lineHeight: 1 }}>×</button>
            </div>
            {loadingDetail ? (
              <div style={{ textAlign: "center", color: C.muted, padding: 30 }}>טוען…</div>
            ) : (
              <div style={{ display: "grid", gap: 26 }}>
                {(detail || []).map(im => (
                  <div key={im.id} style={{ background: "rgba(20,15,12,0.5)", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                    {imgDate(im.occurred_at) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }}>
                        <span aria-hidden>🗓️</span>{imgDate(im.occurred_at)}
                      </div>
                    )}
                    <a href={im.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ width: "100%", display: "block" }} />
                    </a>
                    <div style={{ padding: "12px 16px" }}>
                      {im.name && <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{im.name}</div>}
                      {im.description && (
                        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{stripHtml(im.description)}</div>
                      )}
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                        {(im.all_values || []).slice(0, 8).map((v, i) => (
                          <Link key={i} to={`/number/${v}`} onClick={() => setSel(null)} style={{
                            textDecoration: "none", color: v === im.primary_value ? "#1a0e00" : C.goldLight,
                            background: v === im.primary_value ? C.gold : "rgba(8,5,2,0.5)",
                            border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px",
                            fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                          }}>{v}</Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`.arch-card:hover { border-color: ${C.gold} !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.18); }`}</style>
    </div>
  );
}
