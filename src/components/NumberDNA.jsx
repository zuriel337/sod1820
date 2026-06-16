import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTopicCards, getGalleryImagesByIds } from "../lib/supabase.js";
import { C, F } from "../theme.js";

// 🧬 ה-DNA המזוקק של המספר — רק התוכן המאוצר (כרטיסי התכנסות + התמונות שלהם),
// לא כל הפוסטים/התמונות. עיקרון: איכות לא כמות. מוכן להתרחב עם איחוד העץ.
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function NumberDNA({ value }) {
  const [cards, setCards] = useState([]);
  const [imgs, setImgs] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!value || value < 10) { setCards([]); setImgs([]); return; }
    let live = true;
    getTopicCards({ approvedOnly: true }).then(async all => {
      const mine = (all || []).filter(c => (c.numbers || []).includes(value));
      if (!live) return;
      setCards(mine);
      const ids = [...new Set(mine.flatMap(c => c.image_ids || []))].slice(0, 12);
      if (ids.length) { try { const im = await getGalleryImagesByIds(ids); if (live) setImgs(im || []); } catch { /* ignore */ } }
      else setImgs([]);
    }).catch(() => {});
    return () => { live = false; };
  }, [value]);

  if (!cards.length) return null;

  return (
    <div style={{ padding: "13px 15px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
        🧬 המהות המזוקקת · {value} <span style={{ color: C.muted, letterSpacing: 0, textTransform: "none" }}>— רק תוכן מאוצר</span>
      </div>

      {/* כרטיסי ההתכנסות */}
      <div style={{ display: "grid", gap: 7, marginBottom: imgs.length ? 12 : 0 }}>
        {cards.map(c => (
          <button key={c.id} onClick={() => nav(`/topic/${encodeURIComponent(c.slug)}`)}
            style={{ cursor: "pointer", textAlign: "right", background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(8,5,2,0.4))", border: `1px solid ${C.borderGold}`, borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", color: C.goldBright, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{c.title}</span>
              {c.subtitle && <span style={{ display: "block", color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subtitle}</span>}
            </span>
            <span style={{ color: C.gold, fontSize: 10, letterSpacing: 1, flexShrink: 0 }}>{stars(c.quality)}</span>
            <span style={{ color: C.goldBright, flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>

      {/* תמונות מאוצרות בלבד (מתוך הכרטיסים) */}
      {imgs.length > 0 && (
        <div>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 9.5, letterSpacing: 1, marginBottom: 6 }}>🖼 תמונות מדויקות ({imgs.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6 }}>
            {imgs.map(im => (
              <a key={im.id} href={im.image_url} target="_blank" rel="noopener noreferrer" title={(im.ocr_numbers || []).join(" · ")}
                style={{ display: "block", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: `center/cover no-repeat url(${im.image_url})` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
