import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates, getCipherFindings } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";
import { effDate, domNum } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";

// 📜 «עדכונים אחרונים» — פיד מאוחד בסדר עדיפות (עץ אחד):
//   ① היכל הגילוי (התכנסויות מבית המדרש + צפנים מהצופן)  ② כי לה' המלוכה (רמזי זרם המציאות)
//   ③ כתבים  ④ ערוצים (סוד החשמל 2:1, «תריס נופל»)  ⑤ תפילות ותכנים — למטה.
// חתימת מערכת = «כי לה' המלוכה». כל טאב = כל האחרונים של אותו סוג.
// רמז זרם-המציאות = תמונה → לחיצה גוללת לסקשן «🌊 זרם המציאות» (#reality-home) — מפנה, לא משכפל.

const GILUI_LOGO_PATHS = (
  <>
    <circle cx="16" cy="16" r="15" fill="#e8c15a" stroke="#7a5c12" />
    <g stroke="#4a3608" strokeWidth="1.7" strokeLinecap="round" fill="none">
      <path d="M9.5 23.5V15a6.5 6.5 0 0 1 13 0v8.5" />
      <path d="M7.5 23.5h17" />
      <path d="M16 4.8v2.6M11.6 6l1 2.1M20.4 6l-1 2.1" />
    </g>
    <circle cx="16" cy="15.2" r="1.7" fill="#4a3608" />
  </>
);
const GiluiLogo = ({ s = 18 }) => (
  <svg viewBox="0 0 32 32" width={s} height={s} style={{ display: "block", flex: "0 0 auto" }} aria-hidden>{GILUI_LOGO_PATHS}</svg>
);

const CH = {
  "sod-hachashmal": { name: "סוד החשמל", em: "⚡" },
  "or-geula": { name: "אור הגאולה", em: "✨" },
};
// כותבים בשם (כתבים). מערכת/ערוץ = לא כתב → נחתם «כי לה' המלוכה».
const WRITER_ROLES = { "ציון סיבוני": "כתב מיוחד", "יניב לוי": "כתב", 'הרב ווינטרוב זצ"ל': "דברי תורה" };
const SYSTEM_AUTHORS = new Set(["", "המערכת", "מערכת כי לה׳ המלוכה", "מערכת כי לה' המלוכה", "מזכה הרבים", "סוד החשמל"]);
const isWriter = a => { a = (a || "").trim(); return !!a && !SYSTEM_AUTHORS.has(a); };
const isGem = p => (p.categories || []).includes("רמזים חזקים");
const SIGN = "כי לה' המלוכה";

export default function LatestUpdatesFeed({ posts = [], convergences = [], hints = [] }) {
  const P = usePalette();
  const light = P.mode === "light";
  const cGilui = light ? "#6d3bd4" : "#b79bff";
  const cWriter = light ? "#2f6df6" : "#7fb0ff";
  const cSod = light ? "#0f7fae" : "#5ec8ff";
  const cGeula = light ? "#c76a1f" : "#f5a05a";
  const cReality = light ? "#0e9b8e" : "#4fd6c9";
  const chColor = c => (c === "sod-hachashmal" ? cSod : cGeula);

  const [tab, setTab] = useState("all");
  const [chan, setChan] = useState([]);
  const [ciphers, setCiphers] = useState([]);
  const [ci, setCi] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([getChannelUpdates(8, "or-geula"), getChannelUpdates(8, "sod-hachashmal")])
      .then(([og, sd]) => { if (!live) return; const tag = (a, c) => (a || []).map(x => ({ ...x, ch: c })); setChan([...tag(og, "or-geula"), ...tag(sd, "sod-hachashmal")]); })
      .catch(() => {});
    getCipherFindings(8).then(r => { if (live) setCiphers(r || []); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // ── גזירת מקורות ──
  const conv = useMemo(() => (convergences || []).map(c => ({
    num: (c.highlight_numbers || [])[0], t: c.title, slug: c.slug, when: c.created_at,
  })), [convergences]);

  const reality = useMemo(() => (hints || []).filter(h => h.image_url)
    .map(h => ({ v: domNum(h), t: cleanName(h.name), img: h.image_url, thumb: h.thumb_url || null, d: effDate(h), when: h.created_at || h.occurred_at }))
    .sort((a, b) => b.d - a.d).slice(0, 12), [hints]);

  const writers = useMemo(() => (posts || []).filter(p => isWriter(p.author)).slice(0, 12), [posts]);
  const sysPosts = useMemo(() => (posts || []).filter(p => !isWriter(p.author) && (p.author || "").trim() !== "סוד החשמל"), [posts]);
  const plainPosts = useMemo(() => sysPosts.filter(p => !isGem(p)).slice(0, 12), [sysPosts]);

  // ── ערוצים: רוטציה 2:1 (סוד החשמל עדיפות) + כרונולוגי לטאב ──
  const chanRotate = useMemo(() => {
    const s = chan.filter(c => c.ch === "sod-hachashmal"), g = chan.filter(c => c.ch === "or-geula"), out = [];
    let si = 0, gi = 0;
    for (let n = 0; n < 12 && (s.length || g.length); n++) {
      if (n % 3 === 2 && g.length) { out.push(g[gi % g.length]); gi++; }
      else if (s.length) { out.push(s[si % s.length]); si++; }
      else if (g.length) { out.push(g[gi % g.length]); gi++; }
    }
    return out;
  }, [chan]);
  const sodList = useMemo(() => chan.filter(c => c.ch === "sod-hachashmal"), [chan]);
  const geulaList = useMemo(() => chan.filter(c => c.ch === "or-geula"), [chan]);

  useEffect(() => {
    if (chanRotate.length < 2) return;
    const id = setInterval(() => { if (!document.hidden) setCi(x => x + 1); }, 6500);   // איטי — «תריס נופל»
    return () => clearInterval(id);
  }, [chanRotate.length]);
  const curChan = chanRotate.length ? chanRotate[ci % chanRotate.length] : null;

  const counts = {
    all: conv.length + ciphers.length + reality.length + writers.length + chan.length + plainPosts.length,
    gilui: conv.length + ciphers.length, malchut: reality.length,
    writers: writers.length, channels: chan.length,
  };
  const TABS = [
    { key: "all", em: "🗞", label: "הכל", c: P.accent, a: P.accentText },
    { key: "gilui", logo: true, label: "היכל הגילוי", c: cGilui, a: cGilui },
    { key: "malchut", em: "👑", label: SIGN, c: P.accent, a: P.accentText },
    { key: "writers", em: "✍️", label: "כתבים", c: cWriter, a: cWriter },
    { key: "channels", em: "📡", label: "ערוצים", c: cSod, a: cSod },
  ];

  // ── מחוון-החלקה (thumb) ──
  const segRef = useRef(null);
  const [thumbPos, setThumbPos] = useState({ left: 0, width: 0 });
  const measure = () => { const nav = segRef.current; if (!nav) return; const b = nav.querySelector(`[data-k="${tab}"]`); if (b) setThumbPos({ left: b.offsetLeft, width: b.offsetWidth }); };
  useLayoutEffect(measure, [tab, counts.all]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); });

  const scrollReality = () => { const el = document.getElementById("reality-home"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

  // ── כרטיסים ──
  const chip = (acc, children, live) => (
    <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.heading,
      fontSize: 10.5, fontWeight: 800, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap",
      background: live ? "rgba(200,16,46,.16)" : acc + "26", border: `1px solid ${live ? "rgba(230,90,90,.5)" : acc + "66"}`, color: live ? "#e0556a" : acc }}>
      {live && <i style={{ width: 5, height: 5, borderRadius: "50%", background: "#e0556a", boxShadow: "0 0 7px #e0556a" }} />}{children}
    </span>
  );
  const Meta = ({ acc, role, by, when, extra }) => (
    <div className="luf-meta">{role && <><span style={{ color: P.muted }}>{role}</span><span className="sep">·</span></>}
      <span className="by" style={{ color: acc }}>{by}</span><span className="sep">·</span><span>{timeAgoHe(when)}</span>{extra}</div>
  );

  const convCard = (o, i) => (
    <Link key={"cv" + (o.slug || i)} to={o.slug ? `/topic/${encodeURIComponent(o.slug)}` : "/beit-midrash"} className="luf-card" style={{ "--acc": cGilui }}>
      <div className="luf-media">{o.num != null ? <span className="luf-num">{o.num}</span> : <GiluiLogo s={26} />}</div>
      <div className="luf-body">{chip(cGilui, <><GiluiLogo s={12} /> היכל הגילוי · 🔢 התכנסות</>)}<h3 className="luf-title">{o.t}</h3><Meta acc={cGilui} by={SIGN} when={o.when} /></div>
    </Link>
  );
  const cipherCard = (o, i) => (
    <Link key={"cp" + i} to={o.num != null ? `/number/${o.num}` : "/beit-midrash"} className="luf-card" style={{ "--acc": cGilui }}>
      <div className="luf-media">{o.num != null ? <span className="luf-num">{o.num}</span> : <GiluiLogo s={26} />}</div>
      <div className="luf-body">{chip(cGilui, <><GiluiLogo s={12} /> היכל הגילוי · ✦ צופן</>)}<h3 className="luf-title">{o.t}</h3><Meta acc={cGilui} by={SIGN} when={o.when} /></div>
    </Link>
  );
  const realityCard = (o, i) => (
    <button key={"rl" + i} type="button" onClick={scrollReality} className="luf-card" style={{ "--acc": cReality }}>
      <div className="luf-media">{o.img ? <span className="luf-img" style={{ backgroundImage: `url(${galThumb({ thumb_url: o.thumb, image_url: o.img }, 220)})` }} /> : null}
        {o.v != null && <span className="luf-onimg">{o.v}</span>}<span className="luf-wave">🌊</span></div>
      <div className="luf-body">{chip(cReality, <>🌊 זרם המציאות</>)}<h3 className="luf-title">{o.t || (o.v != null ? `מספר ${o.v}` : "רמז חדש")}</h3>
        <Meta acc={cReality} by={SIGN} when={o.when} extra={<><span className="sep">·</span><span style={{ color: cReality, fontWeight: 800 }}>↓ המשך בזרם למטה</span></>} /></div>
    </button>
  );
  const writerCard = (p, i) => {
    const a = (p.author || "").trim(); const init = a.charAt(0);
    return (
      <Link key={"wr" + (p.id || i)} to={`/${p.slug}`} className="luf-card" style={{ "--acc": cWriter }}>
        <div className="luf-media">{p.image_url ? <span className="luf-img" style={{ backgroundImage: `url(${galThumb(p, 220)})` }} /> : <span className="luf-avatar" style={{ "--acc": cWriter }}>{init}</span>}</div>
        <div className="luf-body">{chip(cWriter, <>✍️ כתב</>)}<h3 className="luf-title">{stripHtml(p.title || "")}</h3><Meta acc={cWriter} role={WRITER_ROLES[a] || "כתב"} by={a} when={p.modified || p.date} /></div>
      </Link>
    );
  };
  const plainCard = (p, i) => (
    <Link key={"pl" + (p.id || i)} to={`/${p.slug}`} className="luf-card" style={{ "--acc": P.muted }}>
      <div className="luf-media">{p.image_url ? <span className="luf-img" style={{ backgroundImage: `url(${galThumb(p, 220)})` }} /> : <span className="luf-em">🕊️</span>}</div>
      <div className="luf-body">{chip(P.muted, <>🕊️ {SIGN} · תוכן</>)}<h3 className="luf-title">{stripHtml(p.title || "")}</h3><Meta acc={P.muted} by={SIGN} when={p.modified || p.date} /></div>
    </Link>
  );
  const chanCard = (o, i) => { const m = CH[o.ch]; const col = chColor(o.ch); return (
    <Link key={"ch" + (o.id || i)} to="/broadcasts" className="luf-card" style={{ "--acc": col }}>
      <div className="luf-media"><span className="luf-em">{m.em}</span></div>
      <div className="luf-body">{chip(col, <>{m.em} {m.name} · LIVE</>, true)}<h3 className="luf-title">{stripHtml(o.text || "")}</h3><Meta acc={col} by={m.name} when={o.created_at} /></div>
    </Link>
  ); };

  const Section = ({ sc, label, pri, children }) => (
    <div className="luf-sect" style={{ "--sc": sc }}>
      <div className="luf-sect-h"><span className="luf-lbl">{label}</span>{pri && <span className="luf-pri">{pri}</span>}<span className="luf-rule" /></div>
      <div className="luf-stream">{children}</div>
    </div>
  );
  const ChanSlot = () => !curChan ? null : (
    <>
      <div className="luf-chslot" key={ci}><span className="luf-edge" style={{ "--acc": P.accent }} />{chanCard(curChan, "cur")}</div>
      <div className="luf-chhint">משבצת אחת · «תריס נופל» איטי · <b style={{ color: cSod }}>עדיפות לסוד החשמל — 2:1</b></div>
    </>
  );

  const emptyMsg = <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: 18 }}>אין עדכונים בקטגוריה הזו כרגע.</div>;

  return (
    <>
      <style>{`
        .luf-seg{position:relative;display:flex;gap:2px;background:${P.cardSoft};border:1px solid ${P.borderStrong};border-radius:15px;padding:5px;margin:0 0 20px;overflow-x:auto;scrollbar-width:none}
        .luf-seg::-webkit-scrollbar{display:none}
        .luf-thumb{position:absolute;top:5px;bottom:5px;border-radius:11px;background:${P.card};border:1px solid var(--tc,${P.accent});box-shadow:0 4px 16px ${P.glow};transition:left .32s cubic-bezier(.4,1.3,.4,1),width .32s cubic-bezier(.4,1.3,.4,1),border-color .3s;z-index:0}
        .luf-tab{position:relative;z-index:1;flex:0 0 auto;cursor:pointer;background:none;border:none;color:${P.inkSoft};font-family:${F.heading};font-size:13px;font-weight:800;padding:9px 14px;border-radius:11px;min-height:44px;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;transition:color .25s}
        .luf-tab .em{font-size:15px}.luf-tab .ct{font-size:10.5px;font-weight:800;background:${P.cardSoft};border-radius:999px;padding:1px 7px;font-variant-numeric:tabular-nums}
        .luf-tab[aria-selected="true"]{color:var(--ta,${P.accentText})}
        .luf-sect{margin-bottom:16px}.luf-sect-h{display:flex;align-items:center;gap:9px;margin:0 2px 9px}
        .luf-lbl{display:inline-flex;align-items:center;gap:7px;font-family:${F.heading};font-size:12.5px;font-weight:800;color:var(--sc)}
        .luf-pri{font-size:9.5px;font-weight:800;color:${P.muted};background:${P.card};border:1px solid ${P.border};border-radius:999px;padding:2px 8px}
        .luf-rule{flex:1;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--sc) 45%,transparent),transparent)}
        .luf-stream{display:flex;flex-direction:column;gap:10px}
        .luf-card{position:relative;display:flex;flex-direction:row;width:100%;text-align:right;font:inherit;background:${P.card};border:1px solid ${P.border};border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;cursor:pointer;transition:transform .16s,border-color .16s,box-shadow .16s;animation:luf-rise .3s ease both}
        @keyframes luf-rise{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
        .luf-card:hover{transform:translateY(-2px);border-color:var(--acc);box-shadow:0 12px 28px rgba(0,0,0,.28)}
        .luf-card::before{content:"";position:absolute;inset-inline-start:0;top:0;bottom:0;width:3px;background:var(--acc)}
        .luf-media{position:relative;width:100px;flex:0 0 100px;display:grid;place-items:center;overflow:hidden;background:${P.cardGrad};border-inline-start:1px solid ${P.border}}
        .luf-img{position:absolute;inset:0;background-size:cover;background-position:center}
        .luf-onimg{position:relative;z-index:1;font-family:${F.mono};font-weight:900;font-size:22px;color:#f6e27a;text-shadow:0 1px 7px rgba(0,0,0,.85)}
        .luf-wave{position:absolute;bottom:5px;inset-inline-start:6px;font-size:13px;z-index:1}
        .luf-num{font-family:${F.mono};font-size:29px;font-weight:800;color:var(--acc);text-shadow:0 2px 16px color-mix(in srgb,var(--acc) 50%,transparent)}
        .luf-em{font-size:27px}
        .luf-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-family:${F.heading};font-weight:800;font-size:16px;color:#0c1220;background:linear-gradient(135deg,var(--acc),color-mix(in srgb,var(--acc) 60%,#fff));border:2px solid color-mix(in srgb,var(--acc) 55%,transparent)}
        .luf-body{padding:10px 13px;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
        .luf-title{font-family:${F.regal};font-size:14.5px;line-height:1.45;font-weight:700;color:${P.ink};margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .luf-meta{margin-top:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:${P.muted};flex-wrap:wrap;font-family:${F.heading}}
        .luf-meta .by{font-weight:800}.luf-meta .sep{opacity:.5}
        .luf-chslot{position:relative;overflow:hidden;border-radius:14px}
        .luf-chslot .luf-card{animation:luf-shutter .9s cubic-bezier(.3,.75,.35,1) both}
        @keyframes luf-shutter{0%{clip-path:inset(0 0 100% 0)}100%{clip-path:inset(0 0 0 0)}}
        .luf-edge{position:absolute;left:0;right:0;top:0;height:2px;z-index:3;pointer-events:none;background:linear-gradient(90deg,transparent,${P.accent},transparent);box-shadow:0 0 10px ${P.glow};animation:luf-edge .9s ease forwards}
        @keyframes luf-edge{from{top:0;opacity:.95}to{top:100%;opacity:0}}
        .luf-chhint{margin-top:7px;font-size:10.5px;color:${P.muted};text-align:center;font-family:${F.heading}}
        @media(max-width:640px){.luf-media{width:82px;flex-basis:82px}}
        @media(prefers-reduced-motion:reduce){.luf-card,.luf-chslot .luf-card,.luf-edge{animation:none!important}}
      `}</style>

      <nav className="luf-seg" ref={segRef} role="tablist" aria-label="עדשות עדכונים">
        <span className="luf-thumb" style={{ left: thumbPos.left, width: thumbPos.width, "--tc": TABS.find(t => t.key === tab)?.c }} />
        {TABS.map(t => (
          <button key={t.key} className="luf-tab" role="tab" data-k={t.key} aria-selected={tab === t.key}
            style={{ "--ta": t.a }} onClick={() => setTab(t.key)}>
            {t.logo ? <GiluiLogo s={18} /> : <span className="em" aria-hidden>{t.em}</span>}{t.label}<span className="ct">{counts[t.key]}</span>
          </button>
        ))}
      </nav>

      {tab === "all" && (
        <div>
          <Section sc={cGilui} label={<><GiluiLogo s={17} /> היכל הגילוי</>} pri="עדיפות 1">
            {[...conv.slice(0, 1).map(convCard), ...ciphers.slice(0, 1).map(cipherCard)].length ? [...conv.slice(0, 1).map(convCard), ...ciphers.slice(0, 1).map(cipherCard)] : emptyMsg}
          </Section>
          {reality.length > 0 && <Section sc={P.accent} label={<>👑 {SIGN}</>} pri="עדיפות 2">{reality.slice(0, 2).map(realityCard)}</Section>}
          {writers.length > 0 && <Section sc={cWriter} label={<>✍️ כתבים</>} pri="עדיפות 3">{writers.slice(0, 2).map(writerCard)}</Section>}
          {chanRotate.length > 0 && <Section sc={cSod} label={<>📡 ערוצים</>} pri="עדיפות 4"><ChanSlot /></Section>}
          {plainPosts.length > 0 && <Section sc={P.muted} label={<>🕊️ תפילות ותכנים</>} pri="למטה">{plainPosts.slice(0, 2).map(plainCard)}</Section>}
        </div>
      )}
      {tab === "gilui" && (
        <div>
          <Section sc={cGilui} label={<><GiluiLogo s={17} /> התכנסויות · בית המדרש</>}>{conv.length ? conv.map(convCard) : emptyMsg}</Section>
          <Section sc={cGilui} label={<><GiluiLogo s={17} /> צפנים · הצופן</>}>{ciphers.length ? ciphers.map(cipherCard) : emptyMsg}</Section>
        </div>
      )}
      {tab === "malchut" && <div className="luf-stream">{reality.length ? reality.map(realityCard) : emptyMsg}</div>}
      {tab === "writers" && <div className="luf-stream">{writers.length ? writers.map(writerCard) : emptyMsg}</div>}
      {tab === "channels" && (
        <div>
          <Section sc={cSod} label={<>⚡ סוד החשמל</>} pri="תמיד למעלה">{sodList.length ? sodList.map(chanCard) : emptyMsg}</Section>
          {geulaList.length > 0 && <Section sc={cGeula} label={<>✨ אור הגאולה</>}>{geulaList.map(chanCard)}</Section>}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        <Link to="/broadcasts" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>📡 מרכז השידורים →</Link>
      </div>
    </>
  );
}
