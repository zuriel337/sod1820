import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getEntityBundle } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";

// ===== דמו: סולמות ההתגלות (/sulamot) =====
// חלל קוסמי · סולם של ספרה (d · dd · ddd · dddd) שעולה מלמטה למעלה.
// כל קומה נחשפת רובד נוסף; הקומות שמתחת נשארות חיות. שאר הספרות עמומות ונדלקות בלחיצה.
// דף ניסיון מבודד — לא בתפריט, לא נוגע בכלום.

const rep = (d, k) => parseInt(String(d).repeat(k + 1), 10);   // d,k=0..3
const REVEAL = [4, 6, 8, 10];                                   // כמה רבדים נחשפים בכל קומה

export default function LaddersDemo() {
  const [digit, setDigit] = useState(1);
  const [rung, setRung] = useState(0);
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  const num = rep(digit, rung);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getEntityBundle({ term: String(num), value: num, isNumber: true })
      .then(b => { if (alive) { setBundle(b); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
  }, [num]);

  const reveal = REVEAL[rung];
  const show = (i) => i < reveal;
  const b = bundle || {};

  return (
    <div style={{ position: "relative", minHeight: "100vh", direction: "rtl", overflow: "hidden" }}>
      <CosmicBg />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1180, margin: "0 auto", padding: "40px 18px 90px" }}>
        {/* כותרת */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: "#9b8cff", fontFamily: F.heading, fontSize: 12, letterSpacing: 5, textTransform: "uppercase" }}>דמו · ניסיון</div>
          <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(28px,5vw,46px)", fontWeight: 700, margin: "6px 0 0", textShadow: "0 0 50px rgba(212,175,55,0.4)" }}>
            🪜 סולמות ההתגלות
          </h1>
          <div style={{ color: "#b9b2c8", fontFamily: F.body, fontSize: 15, marginTop: 8 }}>
            המסע בתוך משפחות המספרים — כל עלייה פותחת רובד חדש
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 28, alignItems: "start" }} className="lad-grid">
          {/* ── הסולם המרכזי ── */}
          <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 0, padding: "10px 0" }}>
            {[0, 1, 2, 3].map(k => {
              const active = k === rung, traveled = k < rung, future = k > rung;
              const n = rep(digit, k);
              return (
                <React.Fragment key={k}>
                  {k > 0 && <span style={{ width: 3, height: 46, background: traveled || active ? `linear-gradient(${C.goldBright}, ${C.gold})` : "rgba(120,110,160,0.25)", boxShadow: traveled || active ? `0 0 12px ${C.gold}` : "none" }} />}
                  <button onClick={() => setRung(k)} className="lad-node" style={{
                    width: active ? 118 : 92, height: active ? 118 : 92, borderRadius: "50%", cursor: "pointer",
                    border: `2px solid ${active ? C.goldBright : traveled ? C.borderGold : "rgba(120,110,160,0.4)"}`,
                    background: future ? "rgba(12,10,26,0.7)" : `radial-gradient(circle at 38% 32%, #fff6d8, ${C.gold} 55%, ${C.goldDeep})`,
                    color: future ? "#6b6488" : "#241500", fontFamily: F.mono, fontWeight: 800,
                    fontSize: active ? 34 : 24, lineHeight: 1, transition: "all .35s cubic-bezier(.2,.8,.2,1)",
                    boxShadow: active ? `0 0 50px ${C.gold}, 0 0 90px ${C.gold}66` : traveled ? `0 0 26px ${C.gold}77` : "none",
                    opacity: future ? 0.55 : 1,
                  }}>{n}</button>
                </React.Fragment>
              );
            })}
            <div style={{ color: "#8a83a0", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, marginTop: 14 }}>↑ העלייה ↑</div>
          </div>

          {/* ── שאר הספרות (עמומות, נדלקות בלחיצה) ── */}
          <div>
            <div style={{ color: "#9b8cff", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>סולמות נוספים</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
                const on = d === digit;
                return (
                  <button key={d} onClick={() => { setDigit(d); setRung(0); }} style={{
                    cursor: "pointer", padding: "12px 0", borderRadius: 12,
                    border: `1px solid ${on ? C.gold : "rgba(120,110,160,0.3)"}`,
                    background: on ? "rgba(212,175,55,0.12)" : "rgba(12,10,26,0.5)",
                    color: on ? C.goldBright : "#7a7398", fontFamily: F.mono, fontWeight: 800, fontSize: 15,
                    boxShadow: on ? `0 0 20px ${C.gold}55` : "none", transition: "all .25s",
                  }}>
                    {on ? "✦ " : "🔒 "}{d}·{d}{d}·{d}{d}{d}{d}
                  </button>
                );
              })}
            </div>
            <div style={{ color: "#6b6488", fontFamily: F.body, fontSize: 12, lineHeight: 1.7, marginTop: 14, textAlign: "center" }}>
              רק הסולם הפעיל מואר. השאר נדלקים כשנכנסים אליהם.
            </div>
          </div>
        </div>

        {/* ── תוכן הקומה (רבדים נחשפים) ── */}
        <div style={{ marginTop: 36, background: "rgba(10,8,22,0.66)", border: `1px solid ${C.borderGold}`, borderRadius: 18, padding: "26px 24px", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 40, fontWeight: 800 }}>{num}</span>
            <span style={{ color: "#b9b2c8", fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>קומה {rung + 1} מתוך 4</span>
            <span style={{ flex: 1 }} />
            <Link to={`/number/${num}`} style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, border: `1px solid ${C.borderGold}`, borderRadius: 8, padding: "7px 14px" }}>דף הישות המלא →</Link>
          </div>

          {loading ? <div style={{ color: "#8a83a0", padding: 20 }}>טוען את הרובד…</div> : (
            <div style={{ display: "grid", gap: 22 }}>
              {/* רובד 1 (קומה 1+): מילים שוות */}
              {show(1) && <Layer title="🌳 מילים שוות">
                {b.phrases?.length ? <Chips items={b.phrases.map(p => p.phrase)} /> : <Empty />}
              </Layer>}
              {/* רובד 2: פוסט מרכזי */}
              {show(2) && <Layer title="📖 פוסטים">
                {b.posts?.length ? b.posts.slice(0, rung === 0 ? 1 : 5).map(p => (
                  <Link key={p.slug} to={`/${p.slug}`} style={rowLink}>{stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}</Link>
                )) : <Empty />}
              </Layer>}
              {/* רובד 3: תמונה/גלריות */}
              {show(3) && <Layer title="🖼 גלריות">
                {b.galleries?.length ? <Thumbs items={b.galleries.slice(0, rung === 0 ? 1 : 12)} /> : <Empty />}
              </Layer>}
              {/* קומה 11+: עץ + סרטונים */}
              {show(5) && <Layer title="🔭 עץ המספרים וסרטונים">
                <Link to="/numbers" style={miniBtn}>פתח את {num} בעץ →</Link>
                <Link to="/post" style={miniBtn}>סרטונים →</Link>
              </Layer>}
              {/* קומה 111+: צפנים + תגובות */}
              {show(7) && <Layer title="🔍 צפנים ודיוני קהילה">
                <Link to="/code" style={miniBtn}>חפש {num} בדילוגי אותיות →</Link>
                {b.comments?.length ? b.comments.slice(0, 3).map(c => (
                  <div key={c.wp_id} style={{ color: "#b9b2c8", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, marginTop: 6 }}>“{stripHtml(c.content || "").slice(0, 150)}”</div>
                )) : null}
              </Layer>}
              {/* קומה 1111: הכל + מקבילים */}
              {show(9) && <Layer title="🤖 כל מה שהמערכת יודעת + עולמות מקבילים">
                {b.insights?.length ? b.insights.slice(0, 4).map(it => (
                  <div key={it.id} style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 14, marginTop: 4 }}>✦ {stripHtml(it.title || "")}</div>
                )) : null}
                <div style={{ marginTop: 8 }}>
                  {[rep(digit, 0), rep(digit, 1), rep(digit, 2), rep(digit, 3)].map(p => (
                    <Link key={p} to={`/number/${p}`} style={{ ...miniBtn, display: "inline-block" }}>{p}</Link>
                  ))}
                </div>
              </Layer>}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .lad-node:hover { transform: scale(1.06); }
        @media (max-width: 820px){ .lad-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

const rowLink = { display: "block", color: C.goldLight, textDecoration: "none", fontFamily: F.regal, fontSize: 16, fontWeight: 700, padding: "6px 0", lineHeight: 1.5 };
const miniBtn = { color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, border: `1px solid ${C.borderGold}`, borderRadius: 8, padding: "6px 12px", marginInlineEnd: 8, marginBottom: 6 };

function Layer({ title, children }) {
  return (
    <div>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Chips({ items }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{items.map((t, i) => (
    <span key={i} style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 11px", background: "rgba(8,5,2,0.4)" }}>{t}</span>
  ))}</div>;
}
function Thumbs({ items }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 }}>
    {items.map(g => <a key={g.id} href={g.image_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <img src={g.image_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>)}
  </div>;
}
const Empty = () => <span style={{ color: "#6b6488", fontFamily: F.body, fontSize: 13 }}>אין עדיין במספר הזה — ימולא כשהמערכת תגדל.</span>;

function CosmicBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 18%, #1a1340 0%, #0a0820 42%, #050410 100%)" }}>
      <div style={{ position: "absolute", inset: 0, background: [
        "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.16) 0%, transparent 45%)",
        "radial-gradient(ellipse at 20% 80%, rgba(107,63,160,0.22) 0%, transparent 50%)",
        "radial-gradient(ellipse at 85% 60%, rgba(132,88,255,0.16) 0%, transparent 48%)",
      ].join(",") }} />
      <div className="lad-stars" />
      <style>{`
        .lad-stars{ position:absolute; inset:0;
          background-image:
            radial-gradient(1px 1px at 20% 30%, #fff, transparent),
            radial-gradient(1px 1px at 70% 60%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 40% 80%, #ffe9a8, transparent),
            radial-gradient(1px 1px at 85% 25%, #fff, transparent),
            radial-gradient(1px 1px at 55% 15%, #cbbcff, transparent),
            radial-gradient(1px 1px at 10% 70%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 90% 85%, #fff, transparent),
            radial-gradient(1px 1px at 33% 50%, #fff, transparent);
          background-repeat:repeat; background-size:600px 600px; opacity:.5;
          animation: lad-twinkle 6s ease-in-out infinite; }
        @keyframes lad-twinkle{ 0%,100%{opacity:.4} 50%{opacity:.75} }
        @media (prefers-reduced-motion: reduce){ .lad-stars{ animation:none } }
      `}</style>
    </div>
  );
}
