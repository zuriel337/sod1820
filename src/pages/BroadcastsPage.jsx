import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { BRANDS, isVideoUrl, shareUpdate, UpdateModal } from "../components/BrandTicker.jsx";
import ReporterLink, { ReporterAvatar } from "../components/ReporterLink.jsx";

// 📡 «מרכז השידורים» — פיד מאוחד של כל הערוצים, החדשים למעלה, בטורים (≥4 בדסקטוב רחב).
// עדשה אחת על channel_updates (עץ אחד) — אותו מקור של «העדכונים החיים» בבית/בצ'אט.
const CHANNELS = ["gilui-yomi", "torat-haremez", "site-news", "sod-hachashmal", "reality-code", "or-geula"];
const isAi = u => u.source === "ai" || /רזיאל|בינה מלאכות|\bai\b/i.test(u.credit || "");

export default function BroadcastsPage() {
  const P = usePalette();
  const [params] = useSearchParams();
  const focusId = params.get("u");   // קישור ויראלי: ?u=<id>
  const [all, setAll] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lb, setLb] = useState(null);

  useEffect(() => {
    applySeo({ title: "מרכז השידורים — עדכונים חיים", description: "שידורים חיים ועדכונים מכל הערוצים — תורת הרמז, הגילוי היומי, קוד המציאות, אור הגאולה וסוד החשמל — רמזים, מסרים וסרטונים במקום אחד, לייב מקבוצות הוואטסאפ.", path: "/broadcasts" });
    track("broadcasts");
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all(CHANNELS.map(ch => getChannelUpdates(40, ch, true).then(r => (r || []).map(u => ({ ...u, ch }))).catch(() => [])))
      .then(arr => { if (!live) return; const merged = arr.flat().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); setAll(merged); })
      .catch(() => live && setAll([]));
    return () => { live = false; };
  }, []);

  const items = useMemo(() => (all || []).filter(u => filter === "all" || u.ch === filter), [all, filter]);
  const counts = useMemo(() => { const m = {}; (all || []).forEach(u => { m[u.ch] = (m[u.ch] || 0) + 1; }); return m; }, [all]);

  const dark = P.mode !== "light";
  return (
    <div style={{ direction: "rtl", maxWidth: 1320, margin: "0 auto", padding: "34px 16px 90px" }}>
      <style>{`
        .bc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:15px;align-items:start}
        .bc-card{display:flex;flex-direction:column;background:${P.card};border:1px solid ${P.border};border-top:3px solid var(--acc);
          border-radius:15px;overflow:hidden;cursor:pointer;transition:transform .12s,box-shadow .15s;text-align:start}
        .bc-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,${dark ? ".45" : ".14"})}
        .bc-media{position:relative;width:100%;aspect-ratio:16/10;background:#0a0710;overflow:hidden}
        .bc-media img,.bc-media video{width:100%;height:100%;object-fit:cover;display:block}
        .bc-media .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);color:#fff;font-size:30px;text-shadow:0 1px 8px rgba(0,0,0,.8)}
        .bc-vidph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#141018,#0a0710);color:#cbb6ff}
        .bc-vidph .play{position:static;background:none;font-size:34px}
        .bc-vidph .vlbl{font-family:${F.heading};font-size:11px;font-weight:800;opacity:.8}
        .bc-in{padding:11px 13px 12px;display:flex;flex-direction:column;gap:7px;flex:1}
        .bc-badge{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;font-family:${F.heading};font-size:10.5px;font-weight:800;color:var(--acc);background:color-mix(in srgb,var(--acc) 15%,transparent);border-radius:999px;padding:2px 9px}
        .bc-ai{color:${dark ? "#7fe0c4" : "#027a5f"};background:${dark ? "rgba(37,211,102,.13)" : "rgba(0,128,105,.09)"}}
        .bc-tx{margin:0;color:${P.ink};font-family:${F.body};font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
        .bc-meta{margin-top:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:${P.inkSoft};font-family:${F.heading};font-size:10.5px}
        .bc-share{cursor:pointer;background:none;border:1px solid var(--acc);color:var(--acc);border-radius:999px;font-family:${F.heading};font-size:10px;font-weight:800;padding:2px 10px}
        .bc-link{text-decoration:none;background:var(--acc);color:#191008;font-family:${F.heading};font-size:10px;font-weight:900;border-radius:999px;padding:3px 11px}
        .bc-chip{cursor:pointer;display:inline-flex;align-items:center;gap:5px;text-decoration:none;border-radius:999px;padding:6px 14px;
          font-family:${F.heading};font-size:12.5px;font-weight:800;min-height:34px;border:1px solid var(--acc);color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent)}
        .bc-chip.on{color:#191008;background:var(--acc)}
        @keyframes bc-focus{0%,100%{transform:none}50%{transform:scale(1.02)}}
        .bc-card.focus{box-shadow:0 0 26px var(--acc);animation:bc-focus 1.6s ease 2}
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>שידור חי</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(23px,4.4vw,34px)", fontWeight: 800, margin: "6px 0 8px", textShadow: `0 0 40px ${P.glow}` }}>
          📡 מרכז השידורים
        </h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 520, margin: "0 auto" }}>
          כל העדכונים מכל הערוצים בזרם אחד — החדשים למעלה.
          <br /><span style={{ color: "#25d366", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>💬 מגיע אוטומטית · לייב מקבוצות הוואטסאפ</span>
        </p>
      </header>

      {/* מסנן ערוצים — «הכל» ואז ערוץ-ערוץ */}
      <nav style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
        <button className={"bc-chip" + (filter === "all" ? " on" : "")} style={{ "--acc": P.accentText }} onClick={() => setFilter("all")}>📡 הכל{all ? ` · ${all.length}` : ""}</button>
        {CHANNELS.map(ch => {
          const b = BRANDS[ch]; if (!b) return null;
          return (
            <button key={ch} className={"bc-chip" + (filter === ch ? " on" : "")} style={{ "--acc": b.accent }} onClick={() => setFilter(ch)}>
              {b.logo ? <img src={b.logo} alt="" style={{ width: 16, height: 16, borderRadius: "50%", display: "block" }} /> : <span>{b.emoji}</span>}
              {b.title}{counts[ch] ? ` · ${counts[ch]}` : ""}
            </button>
          );
        })}
      </nav>

      {all === null ? (
        <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: "40px 0" }}>טוען עדכונים…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, fontStyle: "italic", padding: "40px 0" }}>אין עדכונים פעילים כרגע — בקרוב.</div>
      ) : (
        <div className="bc-grid">
          {items.map(u => {
            const b = BRANDS[u.ch] || BRANDS["reality-code"];
            const ai = isAi(u);
            const vid = u.image_url && isVideoUrl(u.image_url);
            const focused = focusId && u.id === focusId;
            const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
            return (
              <div key={u.id} className={"bc-card" + (focused ? " focus" : "")} style={{ "--acc": b.accent }}
                ref={focused ? el => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300); } : undefined}
                onClick={() => setLb(u)} title="לחצו לפתיחה במסך מלא">
                {u.image_url && (
                  <div className="bc-media">
                    {/* וידאו — לא נטען בגריד (עומס/Egress); תצוגה = שלט + הקש לפתיחה במסך מלא */}
                    {vid
                      ? <div className="bc-vidph"><span className="play">▶</span><span className="vlbl">וידאו · הקש לצפייה</span></div>
                      : <img src={thumb(u.image_url, 420)} alt="" loading="lazy" />}
                  </div>
                )}
                <div className="bc-in">
                  <span className="bc-badge">{b.emoji} {b.title}</span>
                  {ai && <span className="bc-badge bc-ai" style={{ "--acc": "#25d366" }}>🤖 רזיאל · AI</span>}
                  {showTxt && <p className="bc-tx">{u.text}</p>}
                  <div className="bc-meta">
                    <ReporterAvatar credit={u.credit} size={20} ring={b.accent} />
                    <span>{u.credit ? <>✍️ <ReporterLink credit={u.credit} style={{ color: b.accent, textDecoration: "underline", textUnderlineOffset: 2, fontWeight: 800 }}>{u.credit}</ReporterLink> · </> : ""}🕒 {timeAgoHe(u.created_at)}</span>
                    <button className="bc-share" onClick={e => { e.stopPropagation(); shareUpdate(u, b.title); }}>↗ שתפו</button>
                    {u.link_url && <Link to={u.link_url} className="bc-link" onClick={e => e.stopPropagation()}>📖 לפוסט ←</Link>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {lb && <UpdateModal u={lb} brand={BRANDS[lb.ch] || BRANDS["reality-code"]} onClose={() => setLb(null)} />}
    </div>
  );
}
