import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTopicCards, getGalleryImagesByIds } from "../lib/supabase.js";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";

// 🧬 ה-DNA המזוקק של המספר — רק התוכן המאוצר (כרטיסי התכנסות + התמונות שלהם).
// כל כרטיס מציג את התמונות *שלו* בסליידר אופקי (גלילה/החלקה + חצים), לא ערימה אחת.
// תמה-מודע: ברירת מחדל = הפלטה הגלובלית (מתחלף עם המתג); prop `light` = override.
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// סליידר אופקי לתמונות של התכנסות אחת — גלילה חלקה, snap, וחצים בתחתית.
function ImageSlider({ images, T }) {
  const ref = useRef(null);
  const scroll = dir => {
    const el = ref.current; if (!el) return;
    // RTL: גלילה "קדימה" (חץ ‹) = שמאלה = scrollLeft שלילי בדפדפנים מודרניים.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div>
      <div ref={ref} style={{
        display: "flex", gap: 7, overflowX: "auto", scrollSnapType: "x mandatory",
        paddingBottom: 4, scrollbarWidth: "thin", WebkitOverflowScrolling: "touch",
      }}>
        {images.map(im => (
          <a key={im.id} href={im.image_url} target="_blank" rel="noopener noreferrer" title={(im.ocr_numbers || []).join(" · ")}
            style={{
              flex: "0 0 auto", width: 132, height: 132, scrollSnapAlign: "start",
              borderRadius: 9, overflow: "hidden", border: `1px solid ${T.border}`,
              background: `center/cover no-repeat url(${im.image_url})`, display: "block",
            }} />
        ))}
      </div>
      {images.length > 2 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
          <button onClick={() => scroll(1)} aria-label="הקודם" style={sliderBtn(T)}>›</button>
          <button onClick={() => scroll(-1)} aria-label="הבא" style={sliderBtn(T)}>‹</button>
        </div>
      )}
    </div>
  );
}
const sliderBtn = T => ({
  cursor: "pointer", border: `1px solid ${T.borderGold}`, background: "transparent", color: T.goldBright,
  width: 38, height: 30, borderRadius: 8, fontSize: 18, fontWeight: 800, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
});

export default function NumberDNA({ value, light }) {
  const [cards, setCards] = useState([]);
  const [imgMap, setImgMap] = useState({}); // id → image
  const nav = useNavigate();
  const globalP = usePalette();
  const P = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const T = { goldDim: P.accentDim, goldBright: P.accentText, gold: P.accent, muted: P.inkSoft, border: P.border, borderGold: P.borderStrong };
  const cardBg = P.cardGrad;

  useEffect(() => {
    if (!value || value < 10) { setCards([]); setImgMap({}); return; }
    let live = true;
    getTopicCards({ approvedOnly: true }).then(async all => {
      const mine = (all || []).filter(c => (c.numbers || []).includes(value));
      if (!live) return;
      setCards(mine);
      const ids = [...new Set(mine.flatMap(c => c.image_ids || []))].slice(0, 80);
      if (ids.length) {
        try { const im = await getGalleryImagesByIds(ids); if (live) setImgMap(Object.fromEntries((im || []).map(x => [x.id, x]))); }
        catch { /* ignore */ }
      } else setImgMap({});
    }).catch(() => {});
    return () => { live = false; };
  }, [value]);

  if (!cards.length) return null;

  return (
    <div className="nd" style={{ padding: "13px 15px", borderTop: `1px solid ${T.border}` }}>
      <div className="nd-title" style={{ color: T.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
        🧬 {cards.length} צירי התכנסות · {value} <span style={{ color: T.muted, letterSpacing: 0, textTransform: "none" }}>— המהות המזוקקת</span>
      </div>

      {/* כל כרטיס התכנסות + הסליידר שלו */}
      <div style={{ display: "grid", gap: 12 }}>
        {cards.map(c => {
          const cimgs = (c.image_ids || []).map(id => imgMap[id]).filter(Boolean);
          return (
            <div key={c.id} style={{ background: cardBg, border: `1px solid ${T.borderGold}`, borderRadius: 11, padding: "10px 12px" }}>
              <button onClick={() => nav(`/topic/${encodeURIComponent(c.slug)}`)}
                style={{ cursor: "pointer", textAlign: "right", background: "transparent", border: "none", padding: 0, width: "100%", display: "flex", alignItems: "center", gap: 9, marginBottom: cimgs.length ? 9 : 0 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="nd-card-title" style={{ display: "block", color: T.goldBright, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{c.title}</span>
                  {c.subtitle && <span className="nd-card-sub" style={{ display: "block", color: T.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subtitle}</span>}
                </span>
                <span style={{ color: T.gold, fontSize: 10, letterSpacing: 1, flexShrink: 0 }}>{stars(c.quality)}</span>
                <span style={{ color: T.goldBright, flexShrink: 0 }}>→</span>
              </button>
              {cimgs.length > 0 && <ImageSlider images={cimgs} T={T} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
