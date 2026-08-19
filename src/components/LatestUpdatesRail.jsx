import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { adminSetPostHomeHidden, adminSetCipherHomeHidden, setImageCuration } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { thumb, galThumb } from "../lib/img.js";
import { streamDate, domNum } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";
import { RealityLogo } from "./SectionLogos.jsx";   // 🎗 יורש מהסמל המקורי של זרם המציאות (🌊). היכל הגילוי = 🏛️ (כמו בנאב).
import { postHasVideo } from "./VideoBadge.jsx";
import { postHasStrongHint } from "./StrongHintBadge.jsx";
import HomeHeader from "./HomeHeader.jsx";           // 👑 מיתוג «עדכונים אחרונים» הקנוני — זהה בבית/צד/מובייל

// 📜 «עדכונים אחרונים» — 8 עדכונים אחרונים ממוזגים, כל אחד עם לוגו + מילה קטנה שמסבירה מה זה:
//   פוסט · זרם המציאות (🌊) · היכל הגילוי (לוגו הגילוי — התכנסות מבית המדרש).
//   מציג «עודכן לפני X» ותג «AI» היכן שרלוונטי. תמונת זרם-מציאות → גלילה ל-#reality-home (מפנה, לא משכפל).
//   ⛔ קשרי-שפות (cross-language) לא מוצגים כאן — מקומם הקנוני הוא דף «קשרי-שפות» (/languages).

const aiRe = /מאומת על ידי ai|רזיאל|בינה מלאכות|\bai\b/i;
// 📌 פוסט «נעוץ» = tree_priority גבוה (מוצמד ידנית ע"י אדמין). מוצג ראשון + תג «נעוץ».
const isPinnedPost = (p) => !!p && (p.tree_priority ?? 0) >= 50;

export default function LatestUpdatesRail({ posts = [], convergences = [], hints = [], researchers = [], ciphers = [], limit = null, heading = false }) {
  const P = usePalette();
  const [expanded, setExpanded] = useState(false);   // «פתח עוד» — פותח מ-limit לכל הפריטים (רק כשמועבר limit)
  const light = P.mode === "light";
  const cGilui = light ? "#6d3bd4" : "#b79bff";
  const cReality = light ? "#0e9b8e" : "#4fd6c9";
  const cPost = light ? "#c76a1f" : "#e8c15a";
  const cResearcher = light ? "#128a4f" : "#3ddc84";   // 🎗 כתב מיוחד (עדכוני-שידור) — ירוק וואטסאפ
  const cCipher = light ? "#8a6d10" : "#f0d879";        // 🔠 צופן חדש (מערכת)

  const items = useMemo(() => {
    const out = [];
    (posts || []).forEach(p => out.push({ type: "post", when: Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)), data: p }));
    (convergences || []).forEach(c => out.push({ type: "conv", when: +new Date(c.created_at || 0), data: c }));
    // 🌊 «עודכן לפני X» לרמז = מתי נוסף לזרם (stream_at→created_at), לא תאריך-האירוע (occurred_at, חצות → «לפני 12 שעות» מוטעה)
    (hints || []).filter(h => h.image_url).forEach(h => out.push({ type: "reality", when: streamDate(h), data: h }));
    (researchers || []).forEach(r => out.push({ type: "researcher", when: +new Date(r.latest_at || 0), data: r }));
    (ciphers || []).forEach(c => out.push({ type: "cipher", when: +new Date(c.created_at || 0), data: c }));
    // 📌 פוסטים נעוצים תמיד ראשונים (sticky), ואז לפי זמן-עדכון
    return out.sort((a, b) => {
      const pa = a.type === "post" && isPinnedPost(a.data) ? 1 : 0;
      const pb = b.type === "post" && isPinnedPost(b.data) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.when - a.when;
    }).slice(0, 20);
  }, [posts, convergences, hints, researchers, ciphers]);

  // 🙈 אדמין — הסתרת פריט מ«עדכונים אחרונים» (פוסט→home_hidden · רמז-זרם→curator_hidden). אופטימי + נשמר ב-DB.
  const { isAdmin } = useAuth();
  const [hidden, setHidden] = useState(() => new Set());
  const keyOf = (it) => it.type + ":" + (it.data.id ?? it.data.slug ?? it.data.code ?? it.data.title ?? "");
  const canHide = (it) => it.type === "post" || it.type === "reality" || it.type === "cipher";
  const hideItem = async (it) => {
    const k = keyOf(it);
    setHidden(s => { const n = new Set(s); n.add(k); return n; });   // אופטימי — נעלם מיד
    try {
      if (it.type === "post") await adminSetPostHomeHidden(it.data.id, true);
      else if (it.type === "reality") await setImageCuration(it.data.id, { curator_hidden: true });
      else if (it.type === "cipher") await adminSetCipherHomeHidden(it.data.id, true);
    } catch { /* נשאר מוסתר ויזואלית; ריענון יחזיר אם הכתיבה נכשלה */ }
  };
  const visible = items.filter(it => !hidden.has(keyOf(it)));
  // «פתח עוד»: כשמועבר limit — מציגים limit ראשונים עד שלוחצים. ללא limit (בית) — הכל כרגיל.
  const shownList = (limit && !expanded) ? visible.slice(0, limit) : visible;
  const hasMore = !!limit && !expanded && visible.length > limit;

  // גלילה לסקשן היעד בעמוד הבית (מפנה, לא מנווט החוצה)
  const scrollTo = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  // 🏷 תג-קטגוריה לחיץ ליד «פוסט» (לא על התמונה) — לחיצה מנווטת לעמוד-הקטגוריה. הכרטיס עצמו הוא <a>,
  //    לכן זה <span role="link"> עם navigate + עצירת-אירוע (בלי לקנן <a> בתוך <a>).
  const goCat = (cat, e) => { e.preventDefault(); e.stopPropagation(); navigate(`/category/${encodeURIComponent(cat)}`); };
  const keyGo = (cat, e) => { if (e.key === "Enter" || e.key === " ") goCat(cat, e); };
  const CatBadge = ({ cat, cls, children }) => (
    <span role="link" tabIndex={0} title={`${children} — לקטגוריה`} className={`lur-badge ${cls}`}
      onClick={(e) => goCat(cat, e)} onKeyDown={(e) => keyGo(cat, e)}>{children}</span>
  );
  // 🌊 זרם המציאות: בבית — גלילה לסקשן הזרם; מחוץ לבית (פוסט/צ'אט, אין #reality-home) — לארכיון הקנוני.
  const navigate = useNavigate();
  const goReality = () => {
    const el = typeof document !== "undefined" ? document.getElementById("reality-home") : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else navigate("/archive?tab=reality");
  };

  const Tag = ({ acc, logo, children }) => (
    <span className="lur-tag" style={{ "--acc": acc }}>{logo}{children}</span>
  );
  const Meta = ({ when, ai }) => (
    <div className="lur-meta"><span>עודכן {timeAgoHe(when)}</span>{ai && <span className="lur-ai">🔵 AI · מאומת</span>}</div>
  );

  const card = (it) => {
    const d = it.data;
    if (it.type === "post") {
      const ai = d.ai_touched || aiRe.test(d.content || "");
      const pinned = isPinnedPost(d);
      return (
        <Link key={"p" + (d.id || d.slug)} to={`/${d.slug}`} className={"lur-card" + (pinned ? " pinned" : "")} style={{ "--acc": cPost }}>
          <div className="lur-media">{d.image_url ? <span className="lur-img" style={{ backgroundImage: `url(${galThumb(d, 200)})` }} /> : <span className="lur-em">📜</span>}</div>
          <div className="lur-body">
            <div className="lur-tagrow"><Tag acc={cPost} logo={<span className="lur-lem">📄</span>}>פוסט</Tag>{postHasStrongHint(d) && <CatBadge cat="רמזים חזקים" cls="diamond">💎 רמז חזק</CatBadge>}{postHasVideo(d) && <CatBadge cat="וידאו" cls="video">🎬 וידאו</CatBadge>}{pinned && <span className="lur-pin">📌 נעוץ</span>}</div>
            <h3 className="lur-title">{stripHtml(d.title || "")}</h3><Meta when={it.when} ai={ai} /></div>
        </Link>
      );
    }
    if (it.type === "reality") {
      const v = domNum(d);
      return (
        <button key={"r" + d.id} type="button" onClick={goReality} className="lur-card" style={{ "--acc": cReality }}>
          <div className="lur-media"><span className="lur-img" style={{ backgroundImage: `url(${galThumb(d, 200)})` }} />{v != null && <span className="lur-onimg">{v}</span>}</div>
          <div className="lur-body"><Tag acc={cReality} logo={<RealityLogo s={13} />}>זרם המציאות</Tag>
            <h3 className="lur-title">{cleanName(d.name) || (v != null ? `מספר ${v}` : "רמז חדש")}</h3>
            <div className="lur-meta"><span>עודכן {timeAgoHe(it.when)}</span><span className="lur-more" style={{ color: cReality }}>🌊 לזרם המציאות</span></div></div>
        </button>
      );
    }
    if (it.type === "cipher") {
      // 🔠 צופן-מערכת חדש → העמוד הקנוני /codes/:slug
      return (
        <Link key={"cf" + (d.id || d.slug)} to={`/codes/${encodeURIComponent(d.slug || d.id)}`} className="lur-card" style={{ "--acc": cCipher }}>
          <div className="lur-media">{d.image_url ? <span className="lur-img" style={{ backgroundImage: `url(${thumb(d.image_url, 200)})` }} /> : <span className="lur-em">🔠</span>}</div>
          <div className="lur-body"><Tag acc={cCipher} logo={<span className="lur-lem">🔠</span>}>הצופן · צופן חדש</Tag>
            <h3 className="lur-title">{d.title || d.search_term}</h3>
            <div className="lur-meta"><span>עודכן {timeAgoHe(it.when)}</span><span className="lur-more" style={{ color: cCipher }}>לצופן ←</span></div></div>
        </Link>
      );
    }
    if (it.type === "researcher") {
      // 🎗 כתב מודגש (feature_media) → דף-הכתב הקנוני. עדשה על עץ אחד: התמונה האחרונה מהשידורים.
      const href = `/community/researcher/${d.code || d.slug}`;
      return (
        <Link key={"c" + (d.slug || d.code)} to={href} className="lur-card" style={{ "--acc": cResearcher }}>
          <div className="lur-media">{d.latest_image ? <span className="lur-img" style={{ backgroundImage: `url(${galThumb({ thumb_url: d.latest_thumb, image_url: d.latest_image }, 200)})` }} /> : <span className="lur-em">✍️</span>}</div>
          <div className="lur-body"><Tag acc={cResearcher} logo={<span className="lur-lem">✍️</span>}>כתב מיוחד · דף הכתב</Tag>
            <h3 className="lur-title">{d.display_name}{d.role ? ` · ${d.role}` : ""}</h3>
            <div className="lur-meta"><span>עודכן {timeAgoHe(it.when)}</span><span className="lur-more" style={{ color: cResearcher }}>לדף הכתב ←</span></div></div>
        </Link>
      );
    }
    // conv → היכל הגילוי · בית המדרש · התכנסות. סמל 🏛️ (זהה ל«היכל הגילוי» בנאב/למעלה).
    // לחיצה גוללת ל«● LIVE · חדשות בית המדרש» (#conv-home — ארבע ההתכנסויות האחרונות), לא לקונסטלציה ולא לצפנים.
    const num = (d.highlight_numbers || [])[0];
    return (
      <button key={"v" + (d.slug || d.id || d.title)} type="button" onClick={() => scrollTo("conv-home")} className="lur-card" style={{ "--acc": cGilui }}>
        <div className="lur-media">{num != null ? <span className="lur-num">{num}</span> : <span className="lur-em">🏛️</span>}</div>
        <div className="lur-body"><Tag acc={cGilui} logo={<span className="lur-lem">🏛️</span>}>היכל הגילוי · בית המדרש · התכנסות</Tag>
          <h3 className="lur-title">{d.title}</h3>
          <div className="lur-meta"><span>עודכן {timeAgoHe(it.when)}</span><span className="lur-more" style={{ color: cGilui }}>↓ בהתכנסויות</span></div></div>
      </button>
    );
  };

  if (!items.length) return <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: 24 }}>אין עדכונים כרגע — בקרוב.</div>;

  return (
    <>
      {heading && <HomeHeader title="📜 עדכונים אחרונים" />}
      <style>{`
        .lur-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px;max-width:1120px;margin:0 auto}
        .lur-card{position:relative;display:flex;flex-direction:row;width:100%;text-align:start;font:inherit;background:${P.card};border:1px solid ${P.border};
          border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}
        .lur-card:hover{transform:translateY(-2px);border-color:var(--acc);box-shadow:0 12px 26px rgba(0,0,0,${light ? ".14" : ".3"})}
        .lur-card::before{content:"";position:absolute;inset-inline-start:0;top:0;bottom:0;width:3px;background:var(--acc)}
        .lur-media{position:relative;width:88px;flex:0 0 88px;display:grid;place-items:center;overflow:hidden;background:${P.cardGrad || P.cardSoft};border-inline-start:1px solid ${P.border}}
        .lur-img{position:absolute;inset:0;background-size:cover;background-position:center}
        .lur-onimg{position:relative;z-index:1;font-family:${F.mono};font-weight:900;font-size:20px;color:#f6e27a;text-shadow:0 1px 7px rgba(0,0,0,.85)}
        .lur-num{font-family:${F.mono};font-size:26px;font-weight:800;color:var(--acc);text-shadow:0 2px 14px color-mix(in srgb,var(--acc) 45%,transparent)}
        .lur-em{font-size:26px}.lur-lem{font-size:12px}
        .lur-body{padding:9px 12px;display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
        .lur-tag{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;font-family:${F.heading};font-size:10px;font-weight:800;
          padding:2px 8px;border-radius:999px;white-space:nowrap;color:var(--acc);background:color-mix(in srgb,var(--acc) 15%,transparent);border:1px solid color-mix(in srgb,var(--acc) 45%,transparent)}
        .lur-tagrow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .lur-pin{display:inline-flex;align-items:center;gap:3px;font-family:${F.heading};font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap;
          color:${light ? "#8a6d10" : "#f0d879"};background:${light ? "rgba(212,175,55,.16)" : "rgba(212,175,55,.14)"};border:1px solid rgba(212,175,55,.5)}
        .lur-badge{display:inline-flex;align-items:center;gap:4px;font-family:${F.heading};font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap;cursor:pointer;border:1px solid transparent;transition:filter .12s,transform .12s}
        .lur-badge:hover{filter:brightness(1.06);transform:translateY(-1px)}
        .lur-badge:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
        .lur-badge.diamond{color:#2a1c00;background:linear-gradient(135deg,#f7e08a,#d4af37 55%,#b8891f);box-shadow:0 0 0 1px rgba(255,230,150,.5)}
        .lur-badge.video{color:${light ? "#5a2fb0" : "#d9c9ff"};background:color-mix(in srgb,#7c4dff ${light ? "14%" : "22%"},transparent);border-color:color-mix(in srgb,#7c4dff 45%,transparent)}
        .lur-card.pinned{border-color:rgba(212,175,55,.55);box-shadow:0 0 0 1px rgba(212,175,55,.35)}
        .lur-card.pinned::before{width:4px;background:linear-gradient(180deg,#f0d879,#c8a83a)}
        .lur-title{font-family:${F.regal};font-size:14px;line-height:1.4;font-weight:700;color:${P.ink};margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .lur-meta{margin-top:auto;display:flex;align-items:center;gap:8px;font-size:10.5px;color:${P.muted};font-family:${F.heading};flex-wrap:wrap}
        .lur-ai{color:#3ea6ff;font-weight:800;background:rgba(62,166,255,.13);border:1px solid rgba(62,166,255,.4);border-radius:999px;padding:1px 7px}
        .lur-more{font-weight:800}
        .lur-cell{position:relative}
        .lur-hide{position:absolute;top:6px;inset-inline-end:6px;z-index:4;width:27px;height:27px;border-radius:999px;border:none;cursor:pointer;
          background:rgba(0,0,0,.55);color:#fff;font-size:13px;line-height:1;display:grid;place-items:center;opacity:.9;backdrop-filter:blur(2px)}
        .lur-hide:hover{opacity:1;background:#c8102e;transform:scale(1.06)}
        @media(max-width:640px){.lur-media{width:74px;flex-basis:74px}}
      `}</style>
      <div className="lur-grid">{shownList.map(it => (
        <div key={keyOf(it)} className="lur-cell">
          {card(it)}
          {isAdmin && canHide(it) && (
            <button type="button" className="lur-hide" title="הסתר מ«עדכונים אחרונים» (אדמין)"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); hideItem(it); }}>🙈</button>
          )}
        </div>
      ))}</div>
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button type="button" onClick={() => setExpanded(true)}
            style={{ background: "none", border: `1px solid ${P.borderStrong || P.border}`, borderRadius: 999, cursor: "pointer",
              color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 13, padding: "8px 20px" }}>
            פתח עוד ({visible.length - limit}) ↓
          </button>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 16, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        <Link to="/broadcasts" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>📡 מרכז השידורים →</Link>
      </div>
    </>
  );
}
