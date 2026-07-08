import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { seenCutoff } from "../lib/crossesNew.js";
import HomeHeader from "./HomeHeader.jsx";

// 📜 «עדכונים אחרונים» — פיד מאוחד אחד (נהר + טאבים), עץ אחד:
//   פוסטים (צוריאל) · בית המדרש (התכנסויות) · ערוצים (אור הגאולה + סוד החשמל).
// זרם המציאות לא כאן — יש לו כבר עדשה משלו בעמוד הבית (הרדאר + סקשן «🌊 זרם המציאות»).
// ערוצים = משבצת אחת שמתחלפת (broadcast_channels_law: אפס-כפילות, לא מציף); כניסה לטאב = כתבה כתבה.
// מהירות התחלפות 5ש' (בקשת צוריאל — לא מהר מדי, לא לאט). מכבד prefers-reduced-motion.

const CH = {
  "or-geula":       { name: "אור הגאולה", em: "✨" },
  "sod-hachashmal": { name: "סוד החשמל", em: "⚡" },
};

const TABS = [
  { key: "all",      em: "🗞", label: "הכל" },
  { key: "post",     em: "📝", label: "פוסטים" },
  { key: "midrash",  em: "📖", label: "בית המדרש" },
  { key: "channels", em: "📡", label: "ערוצים" },
];

export default function LatestUpdatesFeed({ posts = [], convergences = [], hotSlugs = new Set() }) {
  const P = usePalette();
  const [tab, setTab] = useState("all");
  const [chFilter, setChFilter] = useState("all");
  const [chan, setChan] = useState([]);
  const [ci, setCi] = useState(0);

  // צבעי-סוג תמה-מודעים (עובד ביום ובלילה): החותם קטן ולא דורס את הזהב הקנוני של הבית.
  const light = P.mode === "light";
  const cViolet = light ? "#6d3bd4" : "#b79bff";   // בית המדרש
  const cGold   = light ? "#a9791a" : "#f2c94c";   // אור הגאולה
  const cCyan   = light ? "#0f7fae" : "#5ec8ff";   // סוד החשמל
  const chColor = c => (c === "sod-hachashmal" ? cCyan : cGold);

  // ── טעינת שני הערוצים (עדשה על channel_updates) ──
  useEffect(() => {
    let live = true;
    Promise.all([getChannelUpdates(8, "or-geula"), getChannelUpdates(8, "sod-hachashmal")])
      .then(([og, sd]) => {
        if (!live) return;
        const tag = (arr, ch) => (arr || []).map(x => ({ ...x, ch }));
        setChan([...tag(og, "or-geula"), ...tag(sd, "sod-hachashmal")]);
      }).catch(() => {});
    return () => { live = false; };
  }, []);

  // סבב המשבצת: מתחלף פעם ערוץ פעם ערוץ (interleave). הטאב: כרונולוגי (כתבה כתבה).
  const chanRotate = useMemo(() => {
    const og = chan.filter(c => c.ch === "or-geula");
    const sd = chan.filter(c => c.ch === "sod-hachashmal");
    const out = [];
    for (let i = 0; i < Math.max(og.length, sd.length); i++) { if (og[i]) out.push(og[i]); if (sd[i]) out.push(sd[i]); }
    return out;
  }, [chan]);
  const chanChron = useMemo(() => [...chan].sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0)), [chan]);

  useEffect(() => {
    if (chanRotate.length < 2) return;
    const id = setInterval(() => { if (!document.hidden) setCi(x => x + 1); }, 5000);
    return () => clearInterval(id);
  }, [chanRotate.length]);
  const curChan = chanRotate.length ? chanRotate[ci % chanRotate.length] : null;

  // ── פיד מאוחד: פוסטים + התכנסויות, ממוזג לפי תאריך ──
  const postsCutoff = useMemo(() => +new Date(seenCutoff("home-posts")), []);
  const convCutoff = useMemo(() => +new Date(seenCutoff("home-conv")), []);
  const postItems = useMemo(() => (posts || []).map(p => ({
    kind: "post", ts: Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)), data: p,
  })), [posts]);
  const convItems = useMemo(() => (convergences || []).map(c => ({
    kind: "converge", ts: +new Date(c.created_at || 0), data: c,
  })), [convergences]);
  const merged = useMemo(() => [...postItems, ...convItems].sort((a, b) => b.ts - a.ts), [postItems, convItems]);

  // הזרם המוצג לפי הטאב הפעיל
  const streamItems = useMemo(() => {
    if (tab === "post") return postItems.slice(0, 10);
    if (tab === "midrash") return convItems.slice(0, 10);
    if (tab === "channels") return [];
    // הכל: ממוזג, ומזריקים את משבצת הערוצים שלישית (לעולם לא ראשונה)
    const list = merged.slice(0, 9).map(x => ({ ...x }));
    if (curChan) list.splice(Math.min(2, list.length), 0, { kind: "chan" });
    return list;
  }, [tab, postItems, convItems, merged, curChan]);

  const counts = {
    all: merged.length + (chanRotate.length ? 1 : 0),
    post: postItems.length,
    midrash: convItems.length,
    channels: chanChron.length,
  };

  // ── סגנון ──
  const S = {
    tabs: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "0 0 18px" },
    stream: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" },
  };
  const chip = (color, children) => (
    <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.heading,
      fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: color + "26", border: `1px solid ${color}66`, color }}>{children}</span>
  );

  // כרטיס בסיס (מדיה מימין, גוף)
  const Card = ({ to, onClick, acc, media, children }) => (
    <Link to={to} onClick={onClick} className="luf-card" style={{ "--acc": acc }}>
      <div className="luf-media">{media}</div>
      <div className="luf-body">{children}</div>
    </Link>
  );

  function postCard(p, i) {
    const fresh = Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)) > postsCutoff && i > 0;
    const hot = hotSlugs.has(p.slug);
    return (
      <Card key={"p" + (p.wp_id || p.id)} to={`/${p.slug}`} acc={cGold}
        media={p.image_url
          ? <span className="luf-img" style={{ backgroundImage: `url(${thumb(p.image_url, 240)})` }} />
          : <span className="luf-em">📝</span>}>
        {chip(cGold, <>📝 פוסט · צוריאל{fresh ? " · 🆕" : ""}{hot ? " · 🔥" : ""}</>)}
        <h3 className="luf-title">{stripHtml(p.title || "")}</h3>
        <div className="luf-meta">🕒 עודכן {timeAgoHe(p.modified || p.date)}{(p.verified || p.ai_touched) ? " · ✓ AI" : ""}</div>
      </Card>
    );
  }
  function convCard(c) {
    const num = (c.highlight_numbers || [])[0];
    const fresh = +new Date(c.created_at || 0) > convCutoff;
    return (
      <Card key={"c" + c.slug} to={`/topic/${encodeURIComponent(c.slug)}`} acc={cViolet}
        media={num != null ? <span className="luf-num" style={{ color: cViolet }}>{num}</span> : <span className="luf-em">📖</span>}>
        <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.heading,
          fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
          background: cViolet + "26", border: `1px solid ${cViolet}66`, color: cViolet }}>
          📖 בית המדרש<span style={{ width: 1, height: 11, background: cViolet + "88", margin: "0 1px" }} />🔢 התכנסות{fresh ? " · 🆕" : ""}
        </span>
        <h3 className="luf-title">{c.title}</h3>
        <div className="luf-meta" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(c.highlight_numbers || []).slice(0, 4).map(n => (
            <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 11, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "1px 8px" }}>{n}</span>
          ))}
        </div>
      </Card>
    );
  }
  // משבצת הערוצים המתחלפת (בזרם «הכל»)
  function chanSquare() {
    if (!curChan) return null;
    const c = CH[curChan.ch]; const col = chColor(curChan.ch);
    return (
      <div key="chan" className="luf-chanshell" style={{ "--acc": P.accent }} data-lbl="משבצת ערוצים · מתחלפת">
        <Link to="/broadcasts" className="luf-card luf-chan" style={{ "--acc": col }} key={"cur" + ci}>
          <div className="luf-media"><span className="luf-em">{c.em}</span></div>
          <div className="luf-body">
            <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.heading,
              fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999,
              background: "rgba(200,16,46,.16)", border: "1px solid rgba(230,90,90,.5)", color: "#e0556a" }}>
              <i className="luf-live" />{c.em} {c.name} · LIVE
            </span>
            <h3 className="luf-title">{stripHtml(curChan.text || "")}</h3>
            <div className="luf-meta" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="luf-dots">{chanRotate.map((_, k) => <i key={k} className={k === ci % chanRotate.length ? "on" : ""} style={k === ci % chanRotate.length ? { background: col } : undefined} />)}</span>
              <span>📡 ערוצים · מתחלף</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .luf-tab { cursor:pointer; display:inline-flex; align-items:center; gap:7px; border:1px solid ${P.borderStrong};
          background:${P.card}; color:${P.inkSoft}; font-family:${F.heading}; font-size:13.5px; font-weight:800;
          padding:8px 15px; border-radius:999px; min-height:42px; transition:.16s; white-space:nowrap; }
        .luf-tab:hover { border-color:${P.accent}; color:${P.ink}; transform:translateY(-1px); }
        .luf-tab[aria-selected="true"] { background:${P.accentBtn}; color:${P.onAccent}; border-color:transparent; box-shadow:0 5px 18px ${P.glow}; }
        .luf-tab .ct { font-size:11px; font-weight:800; opacity:.7; }
        .luf-card { position:relative; display:flex; flex-direction:row; background:${P.card}; border:1px solid ${P.border};
          border-radius:14px; overflow:hidden; text-decoration:none; color:inherit; transition:transform .16s, border-color .16s, box-shadow .16s;
          animation:luf-rise .3s ease both; }
        .luf-card:hover { transform:translateY(-2px); border-color:var(--acc); box-shadow:0 12px 30px rgba(0,0,0,.28); }
        .luf-card::before { content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px; background:var(--acc); }
        @keyframes luf-rise { from{opacity:0; transform:translateY(7px);} to{opacity:1; transform:none;} }
        .luf-media { position:relative; width:116px; flex:0 0 116px; display:grid; place-items:center; overflow:hidden;
          background:${P.cardGrad}; border-inline-start:1px solid ${P.border}; }
        .luf-img { position:absolute; inset:0; background-size:cover; background-position:center; }
        .luf-em { font-size:29px; }
        .luf-num { font-family:${F.mono}; font-size:30px; font-weight:800; }
        .luf-body { padding:11px 14px; display:flex; flex-direction:column; gap:7px; flex:1; min-width:0; }
        .luf-title { font-family:${F.regal}; font-size:15px; line-height:1.5; font-weight:700; color:${P.ink}; margin:0;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .luf-meta { margin-top:auto; color:${P.inkSoft}; font-family:${F.heading}; font-size:11.5px; }
        .luf-chanshell { position:relative; border:1px dashed ${P.accent}66; border-radius:17px; padding:6px; }
        .luf-chanshell::after { content:attr(data-lbl); position:absolute; top:-9px; inset-inline-end:14px; font-family:${F.heading};
          font-size:9.5px; font-weight:800; color:${P.accentText}; background:${P.pageBg}; padding:0 8px; border-radius:999px; }
        .luf-live { width:5px; height:5px; border-radius:50%; background:#e0556a; box-shadow:0 0 7px #e0556a; animation:luf-dot 1.2s infinite; }
        @keyframes luf-dot { 0%,100%{opacity:1;} 50%{opacity:.35;} }
        .luf-dots { display:inline-flex; gap:4px; }
        .luf-dots i { width:5px; height:5px; border-radius:50%; background:${P.muted}; opacity:.5; transition:.25s; }
        .luf-dots i.on { width:13px; border-radius:99px; opacity:1; }
        .luf-chan { animation:luf-swap .5s ease; }
        @keyframes luf-swap { from{opacity:.15; transform:translateX(24px);} to{opacity:1; transform:none;} }
        .luf-subtabs { display:flex; gap:7px; flex-wrap:wrap; justify-content:center; margin-bottom:12px; }
        .luf-subtab { cursor:pointer; border:1px solid ${P.borderStrong}; background:${P.cardSoft}; color:${P.inkSoft};
          font-family:${F.heading}; font-size:12.5px; font-weight:800; padding:6px 13px; border-radius:999px; min-height:36px; transition:.15s; }
        .luf-subtab:hover { border-color:${P.accent}; color:${P.ink}; }
        .luf-subtab[aria-selected="true"] { background:${P.card}; color:${P.ink}; box-shadow:inset 0 0 0 1px ${P.accent}; }
        .luf-chgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; max-width:900px; margin:0 auto; }
        @media (max-width:640px){ .luf-chgrid { grid-template-columns:1fr; } .luf-media{ width:96px; flex-basis:96px; } }
        @media (prefers-reduced-motion:reduce){ .luf-card, .luf-chan, .luf-live { animation:none !important; } }
      `}</style>

      <HomeHeader title="📜 עדכונים אחרונים" sub="הכל בזרם אחד — פוסטים · בית המדרש · ערוצים. סננו בטאב." />

      <div style={S.tabs} role="tablist" aria-label="סינון עדכונים">
        {TABS.map(t => (
          <button key={t.key} className="luf-tab" role="tab" aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}>
            <span aria-hidden>{t.em}</span>{t.label}<span className="ct">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {tab === "channels" ? (
        <div>
          <div className="luf-subtabs" role="tablist" aria-label="סינון ערוצים">
            {[{ k: "all", l: "הכל" }, { k: "or-geula", l: "✨ אור הגאולה" }, { k: "sod-hachashmal", l: "⚡ סוד החשמל" }].map(s => (
              <button key={s.k} className="luf-subtab" role="tab" aria-selected={chFilter === s.k} onClick={() => setChFilter(s.k)}>{s.l}</button>
            ))}
          </div>
          <div className="luf-chgrid">
            {chanChron.filter(it => chFilter === "all" || it.ch === chFilter).map(it => {
              const c = CH[it.ch]; const col = chColor(it.ch);
              return (
                <Link key={it.id} to="/broadcasts" className="luf-card" style={{ "--acc": col }}>
                  <div className="luf-media"><span className="luf-em">{c.em}</span></div>
                  <div className="luf-body">
                    {chip(col, <>{c.em} {c.name} · LIVE</>)}
                    <h3 className="luf-title">{stripHtml(it.text || "")}</h3>
                    <div className="luf-meta">🕒 {timeAgoHe(it.created_at)}{it.credit ? ` · מאת ${it.credit}` : ""}</div>
                  </div>
                </Link>
              );
            })}
            {!chanChron.length && <div style={{ color: P.inkSoft, fontFamily: F.body, gridColumn: "1 / -1", textAlign: "center", padding: 20 }}>העדכונים בדרך…</div>}
          </div>
        </div>
      ) : (
        <div style={S.stream}>
          {streamItems.map((it, i) => {
            if (it.kind === "chan") return chanSquare();
            if (it.kind === "post") return postCard(it.data, i);
            return convCard(it.data);
          })}
          {!streamItems.length && <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: 20 }}>אין עדכונים בקטגוריה הזו כרגע.</div>}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 18, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        <Link to="/broadcasts" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>📡 מרכז השידורים →</Link>
      </div>
    </>
  );
}
