import React, { useEffect, useState } from "react";
import { getSavedMatrices } from "../lib/elsMatrices.js";

// 🖼️ גלריית-המטריצות השמורות של הצופן — נפתחת מהכפתור התחתון בדף הצופן.
// «כמו גלריה/סרט» — כרטיסי-מטריצה מאושרים (של המערכת + מאושרי-קהילה), עם שיתוף.
// עיצוב כהה עצמאי (עובד מעל הכלי הכהה). מקור: els_records (published).

async function shareMatrix(m) {
  const url = `${window.location.origin}/code?m=${m.id}`;
  const text = `🔠 מטריצת דילוג: «${m.title || m.search_term}»${m.skip_distance ? ` · דילוג ${m.skip_distance}` : ""} — סוד 1820`;
  try {
    if (navigator.share) { await navigator.share({ title: "מטריצת דילוג · סוד 1820", text, url }); return; }
  } catch { /* fallthrough to copy */ }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); alert("הקישור הועתק ✓"); } catch { /* noop */ }
}

export default function SavedMatricesGallery({ open, onClose }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!open) return;
    setItems(null);
    getSavedMatrices().then(setItems).catch(() => setItems([]));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  const list = items || [];

  return (
    <div onClick={onClose} dir="rtl" style={{
      position: "fixed", inset: 0, zIndex: 4100, background: "rgba(6,4,1,0.86)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column", padding: "0", fontFamily: "'Heebo',sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: "100%", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid rgba(212,175,55,0.25)" }}>
          <span style={{ color: "#f0d879", fontSize: 20, fontWeight: 800 }}>🖼️ מטריצות שמורות</span>
          <span style={{ color: "#9a8f6a", fontSize: 13 }}>{list.length ? `${list.length} מטריצות` : ""}</span>
          <button onClick={onClose} style={{ marginInlineStart: "auto", background: "none", border: "none", color: "#cdbf9f", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          {items === null ? (
            <div style={{ color: "#cdbf9f", textAlign: "center", padding: 40 }}>טוען…</div>
          ) : !list.length ? (
            <div style={{ color: "#cdbf9f", textAlign: "center", padding: "60px 24px", lineHeight: 1.9 }}>
              <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.7 }}>🌱</div>
              עדיין אין מטריצות שמורות בגלריה.<br />
              <span style={{ color: "#9a8f6a", fontSize: 14 }}>כאן יופיעו מטריצות-דילוג שנשמרו ואושרו — של המערכת ושל חוקרי הקהילה.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {list.map(m => (
                <div key={m.id} style={{ background: "rgba(20,14,4,0.7)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.title || m.search_term} style={{ width: "100%", aspectRatio: "1.3", objectFit: "cover", background: "#0a0700" }} loading="lazy" />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1.3", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#160f03,#0a0700)", color: "#e6cf86", fontSize: 22, fontWeight: 800, textAlign: "center", padding: 12 }}>
                      🔠 {m.search_term}
                    </div>
                  )}
                  <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <div style={{ color: "#f0d879", fontSize: 15, fontWeight: 700 }}>{m.title || m.search_term}</div>
                    <div style={{ color: "#9a8f6a", fontSize: 12 }}>
                      {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
                    </div>
                    {m.description && <div style={{ color: "#cdbf9f", fontSize: 12.5, lineHeight: 1.6 }}>{String(m.description).slice(0, 120)}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 6 }}>
                      {m.author_name && <span style={{ color: "#8a8270", fontSize: 11 }}>✍️ {m.author_name}</span>}
                      <button onClick={() => shareMatrix(m)} style={{ marginInlineStart: "auto", cursor: "pointer", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#1a0e00", border: "none", borderRadius: 999, fontWeight: 800, fontSize: 12, padding: "5px 14px" }}>🔗 שתף</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
