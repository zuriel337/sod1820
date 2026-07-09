import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getStories } from "../lib/supabase.js";
import { thumb } from "../lib/img.js";

// 🔑 חלונות הגילוי — רצועת סטורי בראש דף הבית. עיגולי-זהב; הקשה → צופה.
// מקור: טבלת stories (RLS public: active=true). ריק → לא מרנדר. egress: thumb().
export default function RevelationWindows() {
  const P = usePalette();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null); // index | null

  useEffect(() => {
    let alive = true;
    getStories().then(s => { if (alive) setItems(s || []); });
    return () => { alive = false; };
  }, []);

  if (!items.length) return null;
  const active = open != null ? items[open] : null;

  return (
    <section aria-label="חלונות הגילוי" style={{ padding: "6px 12px 4px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 17 }}>🔑</span>
          <h2 style={{ margin: 0, color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>חלונות הגילוי</h2>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "4px 6px 8px", scrollbarWidth: "none",
          justifyContent: items.length < 5 ? "center" : "flex-start" }}>
          {items.map((s, i) => (
            <button key={s.id} onClick={() => setOpen(i)} title={s.title || ""}
              style={{ flex: "0 0 auto", background: "none", border: "none", cursor: "pointer", width: 80, padding: 0 }}>
              <span style={{ position: "relative", display: "block", width: 74, height: 74, borderRadius: "50%", padding: 3, margin: "0 auto",
                background: `conic-gradient(from 210deg, ${P.accent}, #f7e39c, ${P.accent})` }}>
                {s.video_url && (
                  <span aria-hidden="true" style={{ position: "absolute", bottom: 1, insetInlineEnd: 1, width: 21, height: 21,
                    borderRadius: "50%", background: "#000000b0", color: "#fff", display: "grid", placeItems: "center",
                    fontSize: 9, border: "1.5px solid #f7e39c", zIndex: 1 }}>▶</span>
                )}
                {s.image_url ? (
                  <img src={thumb(s.image_url, 200)} alt={s.title || ""} loading="lazy"
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover",
                      border: `2px solid ${P.card}`, display: "block", background: P.cardSoft }} />
                ) : (
                  <span style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center",
                    border: `2px solid ${P.card}`, background: P.cardSoft, color: P.accentText, fontSize: 24 }}>▶</span>
                )}
              </span>
              <span style={{ display: "block", marginTop: 6, color: P.inkSoft, fontFamily: F.body, fontSize: 11,
                lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.credit || s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div onClick={() => setOpen(null)} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "#05030aee", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 440, width: "100%", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 18,
              overflow: "hidden", boxShadow: "0 30px 70px -20px #000e" }}>
            <div style={{ position: "relative" }}>
              {active.video_url ? (
                <video src={active.video_url} controls playsInline preload="none"
                  poster={active.image_url ? thumb(active.image_url, 900) : undefined}
                  style={{ width: "100%", maxHeight: "72vh", display: "block", background: "#000" }} />
              ) : (
                <img src={thumb(active.image_url, 900)} alt={active.title || ""} style={{ width: "100%", display: "block" }} />
              )}
              <button onClick={() => setOpen(null)} aria-label="סגור"
                style={{ position: "absolute", top: 10, insetInlineEnd: 10, width: 34, height: 34, borderRadius: "50%",
                  border: "none", background: "#00000099", color: "#fff", fontSize: 17, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "14px 16px 16px", textAlign: "start" }}>
              {active.title && <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{active.title}</div>}
              {active.credit && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>מאת {active.credit}</div>}
              {active.link && (
                <Link to={active.link} onClick={() => setOpen(null)}
                  style={{ display: "inline-block", marginTop: 12, color: P.onAccent, background: P.accentBtn, borderRadius: 999,
                    fontFamily: F.heading, fontWeight: 800, fontSize: 13.5, padding: "9px 20px", textDecoration: "none" }}>לצפייה מלאה ←</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
