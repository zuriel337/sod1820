import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { applySeo } from "../lib/seo.js";
import { getTopicCardBySlug, getGalleryImagesByIds, getTopicCards } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";

// ===== חדר הגלקסיות (/galaxy) — ניסיון: חדר 2D עשיר עם תמונות וטקסט קריא =====
// מעבר ימינה/שמאלה בין "תחנות" (פתיח + תמונה לכל אחת), מספרים לחיצים → /number,
// ודלתות לגלקסיות שכנות. אמין (DOM אמיתי) — בלי ריבועים שחורים.
const EXP_SLUG = "meron"; // גלקסיית הניסיון

const decodeHtml = (s) => { try { const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value; } catch { return s || ""; } };
const txt = (s) => decodeHtml(stripHtml(s || ""));

const ROOM_BG = "#06040e";
const GOLD = "#f6e27a", GOLD_DIM = "#caa84a", INK = "#ede4d3", SUB = "#bdb6c9";

function NumChip({ n, onPick }) {
  return (
    <button onClick={() => onPick(n)} style={{
      cursor: "pointer", fontFamily: "'Courier New',monospace", fontWeight: 800, fontSize: 14,
      color: "#1a0e00", background: "linear-gradient(135deg,#e9c84a,#9a7818)", border: "none",
      borderRadius: 999, padding: "5px 14px", boxShadow: "0 2px 10px rgba(212,175,55,.35)",
    }} title={`פתח את דף המספר ${n}`}>{n}</button>
  );
}

export default function GalaxyRoom() {
  const nav = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState(null);
  const [images, setImages] = useState([]);
  const [doors, setDoors] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applySeo({ title: "חדר הגלקסיות — סוד 1820", description: "חדר הגלקסיות — מעבר בין עולמות, תמונות ורמזים.", path: "/galaxy" });
    let alive = true;
    getTopicCardBySlug(EXP_SLUG).then(async (t) => {
      if (!alive) return;
      setTopic(t);
      if (t?.image_ids?.length) { try { const im = await getGalleryImagesByIds(t.image_ids); if (alive) setImages(im || []); } catch { /* ignore */ } }
      try {
        const all = await getTopicCards({ approvedOnly: true });
        const mine = new Set((t?.highlight_numbers || []).map(Number));
        if (alive) setDoors((all || []).filter(o => o.slug !== EXP_SLUG && (o.highlight_numbers || []).some(n => mine.has(Number(n)))).slice(0, 4));
      } catch { /* ignore */ }
      if (alive) setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // תחנות: פתיח + תמונה לכל אחת
  const stations = useMemo(() => [{ type: "intro" }, ...images.map((im) => ({ type: "image", im }))], [images]);
  const total = stations.length;
  const go = useCallback((d) => setIdx((i) => (i + d + total) % total), [total]);

  useEffect(() => {
    const h = (e) => { if (e.key === "ArrowLeft") go(1); else if (e.key === "ArrowRight") go(-1); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go]);

  const pickNum = (n) => nav(`/number/${n}`);
  const cur = stations[idx] || stations[0];
  const nums = useMemo(() => [...new Set((topic?.highlight_numbers || []).map(Number).filter(Boolean))], [topic]);
  const findings = (topic?.findings && typeof topic.findings === "object" && !Array.isArray(topic.findings)) ? topic.findings : null;

  // החלקה במגע
  const touch = React.useRef(0);
  const onTS = (e) => { touch.current = e.touches[0].clientX; };
  const onTE = (e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };

  // ── חדר אדמין בלבד · בבנייה מתקדמת ──
  const Full = ({ children }) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: ROOM_BG, backgroundImage: "url(/cosmos-bg.svg)", backgroundSize: "cover", backgroundPosition: "center center", direction: "rtl", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, textAlign: "center", padding: 24 }}>{children}</div>
  );
  if (authLoading) return <Full><div style={{ color: SUB, fontFamily: "'Heebo',sans-serif" }}>טוען…</div></Full>;
  if (!isAdmin) return (
    <Full>
      <div style={{ fontSize: 50 }}>🔒</div>
      <div style={{ color: GOLD, fontFamily: "'Heebo',sans-serif", fontSize: "clamp(22px,5vw,38px)", fontWeight: 800, textShadow: "0 0 26px #000" }}>חדר הגלקסיות</div>
      <div style={{ color: INK, fontFamily: "'Heebo',sans-serif", fontSize: 17, fontWeight: 700 }}>🚧 בבנייה מתקדמת</div>
      <div style={{ color: SUB, fontFamily: "'Heebo',sans-serif", fontSize: 14, maxWidth: 430, lineHeight: 1.75 }}>החדר פתוח כרגע לניהול בלבד. בקרוב ייפתח לכולם.</div>
      <button onClick={() => nav("/היכל")} style={{ marginTop: 8, cursor: "pointer", background: "rgba(8,5,2,.72)", color: GOLD, border: "1px solid rgba(212,175,55,.42)", borderRadius: 999, padding: "10px 24px", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14, backdropFilter: "blur(4px)" }}>← חזרה להיכל השערים</button>
    </Full>
  );

  return (
    <div onTouchStart={onTS} onTouchEnd={onTE} style={{
      position: "fixed", inset: 0, zIndex: 50, background: ROOM_BG,
      backgroundImage: "url(/cosmos-bg.svg)", backgroundSize: "cover", backgroundPosition: "center center",
      direction: "rtl", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <style>{`
        @keyframes gr-in { from { opacity: 0; transform: translateY(14px) scale(.99); } to { opacity: 1; transform: none; } }
        .gr-slide { animation: gr-in .42s ease both; }
        .gr-arrow { cursor:pointer; background:rgba(8,5,2,.6); color:${GOLD}; border:1px solid rgba(212,175,55,.4);
          width:46px; height:46px; border-radius:50%; font-size:22px; display:flex; align-items:center; justify-content:center;
          backdrop-filter:blur(4px); transition:background .15s, transform .15s; flex-shrink:0; }
        .gr-arrow:hover { background:rgba(212,175,55,.25); transform:scale(1.08); }
        .gr-scroll::-webkit-scrollbar { width:7px; } .gr-scroll::-webkit-scrollbar-thumb { background:rgba(212,175,55,.4); border-radius:999px; }
      `}</style>

      {/* כותרת + חזרה */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", flexShrink: 0 }}>
        <button onClick={() => nav("/היכל")} className="gr-arrow" style={{ width: "auto", height: "auto", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontFamily: "'Heebo',sans-serif", fontWeight: 700 }}>← היכל</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ color: GOLD_DIM, fontFamily: "'Heebo',sans-serif", fontSize: 11, letterSpacing: 3 }}>🌌 חדר הגלקסיות · 🚧 בבנייה מתקדמת · אדמין</div>
          <div style={{ color: GOLD, fontFamily: "'Heebo',sans-serif", fontSize: "clamp(18px,3.4vw,28px)", fontWeight: 800, textShadow: "0 0 24px #000" }}>
            {topic ? txt(topic.title) : "טוען…"}
          </div>
        </div>
        <div style={{ minWidth: 56, textAlign: "center", color: SUB, fontFamily: "'Courier New',monospace", fontSize: 13 }}>{total ? `${idx + 1}/${total}` : ""}</div>
      </div>

      {/* גוף החדר — חץ · תחנה · חץ */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 12px 8px", minHeight: 0 }}>
        <button className="gr-arrow" onClick={() => go(1)} aria-label="הבא">‹</button>

        <div key={idx} className="gr-slide gr-scroll" style={{
          flex: 1, maxWidth: 940, height: "100%", margin: "0 auto", overflowY: "auto",
          background: "linear-gradient(160deg, rgba(16,11,26,.82), rgba(6,4,14,.72))",
          border: "1px solid rgba(212,175,55,.28)", borderRadius: 18, padding: "20px 22px",
          boxShadow: "0 20px 60px rgba(0,0,0,.55)",
        }}>
          {loading ? (
            <div style={{ color: SUB, fontFamily: "'Heebo',sans-serif", textAlign: "center", padding: 40 }}>טוען חדר…</div>
          ) : cur?.type === "intro" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topic?.subtitle && <div style={{ color: GOLD, fontFamily: "'Heebo',sans-serif", fontSize: 16, fontWeight: 700, lineHeight: 1.6 }}>{txt(topic.subtitle)}</div>}
              {nums.length > 0 && (
                <div>
                  <div style={{ color: GOLD_DIM, fontFamily: "'Heebo',sans-serif", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>המספרים של ההתכנסות — לחצו לחקור</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{nums.map((n) => <NumChip key={n} n={n} onPick={pickNum} />)}</div>
                </div>
              )}
              {findings?.bullets?.length > 0 && (
                <div>
                  <div style={{ color: GOLD_DIM, fontFamily: "'Heebo',sans-serif", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>✦ הרמזים</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    {findings.bullets.map((b, i) => (
                      <li key={i} style={{ color: INK, fontFamily: "'Heebo',sans-serif", fontSize: 14.5, lineHeight: 1.7 }}>{txt(b.t)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {findings?.caveat && (
                <div style={{ marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,.2)", color: SUB, fontFamily: "'Heebo',sans-serif", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>
                  {txt(findings.caveat)}
                </div>
              )}
              <div style={{ color: GOLD_DIM, fontFamily: "'Heebo',sans-serif", fontSize: 13, textAlign: "center", marginTop: 6 }}>‹ החליקו / חצים — לעבור בין {images.length} התמונות ›</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <img src={cur.im.image_url} alt={txt(cur.im.name)} loading="lazy"
                style={{ width: "100%", maxHeight: "46vh", objectFit: "contain", borderRadius: 12, background: "#000", border: "1px solid rgba(212,175,55,.25)" }} />
              {cur.im.name && <div style={{ color: GOLD, fontFamily: "'Heebo',sans-serif", fontSize: 15, fontWeight: 700 }}>{txt(cur.im.name)}</div>}
              {cur.im.description && <div style={{ color: INK, fontFamily: "'Heebo',sans-serif", fontSize: 15, lineHeight: 1.85 }}>{txt(cur.im.description)}</div>}
              {(cur.im.ocr_numbers || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                  <span style={{ color: GOLD_DIM, fontFamily: "'Heebo',sans-serif", fontSize: 12 }}>מספרים בתמונה:</span>
                  {[...new Set(cur.im.ocr_numbers.map(Number).filter((n) => n > 0))].slice(0, 14).map((n) => <NumChip key={n} n={n} onPick={pickNum} />)}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="gr-arrow" onClick={() => go(-1)} aria-label="הקודם">›</button>
      </div>

      {/* דלתות לגלקסיות שכנות + נקודות */}
      <div style={{ flexShrink: 0, padding: "6px 16px 16px", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {stations.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`תחנה ${i + 1}`} style={{
              width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: "none", cursor: "pointer",
              background: i === idx ? GOLD : "rgba(212,175,55,.32)", transition: "all .2s",
            }} />
          ))}
        </div>
        {doors.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {doors.map((d) => (
              <button key={d.slug} onClick={() => nav(`/galaxy/${encodeURIComponent(d.slug)}`)} style={{
                cursor: "pointer", background: "rgba(8,5,2,.7)", color: GOLD, border: "1px solid rgba(212,175,55,.42)",
                borderRadius: 999, padding: "8px 15px", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 13, backdropFilter: "blur(4px)",
              }}>🚪 {txt(d.title)}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
