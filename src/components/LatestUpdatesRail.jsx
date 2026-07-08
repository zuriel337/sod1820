import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { effDate, domNum } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";
import { RealityLogo } from "./SectionLogos.jsx";   // 🎗 יורש מהסמל המקורי של זרם המציאות (🌊). היכל הגילוי = 🏛️ (כמו בנאב).

// 📜 «עדכונים אחרונים» — 8 עדכונים אחרונים ממוזגים, כל אחד עם לוגו + מילה קטנה שמסבירה מה זה:
//   פוסט · זרם המציאות (🌊) · היכל הגילוי (לוגו הגילוי — התכנסות מבית המדרש).
//   מציג «עודכן לפני X» ותג «AI» היכן שרלוונטי. תמונת זרם-מציאות → גלילה ל-#reality-home (מפנה, לא משכפל).
//   ⛔ קשרי-שפות (cross-language) לא מוצגים כאן — מקומם הקנוני הוא דף «קשרי-שפות» (/languages).

const aiRe = /מאומת על ידי ai|רזיאל|בינה מלאכות|\bai\b/i;

export default function LatestUpdatesRail({ posts = [], convergences = [], hints = [] }) {
  const P = usePalette();
  const light = P.mode === "light";
  const cGilui = light ? "#6d3bd4" : "#b79bff";
  const cReality = light ? "#0e9b8e" : "#4fd6c9";
  const cPost = light ? "#c76a1f" : "#e8c15a";

  const items = useMemo(() => {
    const out = [];
    (posts || []).forEach(p => out.push({ type: "post", when: Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)), data: p }));
    (convergences || []).forEach(c => out.push({ type: "conv", when: +new Date(c.created_at || 0), data: c }));
    (hints || []).filter(h => h.image_url).forEach(h => out.push({ type: "reality", when: effDate(h) || +new Date(h.created_at || h.occurred_at || 0), data: h }));
    return out.sort((a, b) => b.when - a.when).slice(0, 12);
  }, [posts, convergences, hints]);

  // גלילה לסקשן היעד בעמוד הבית (מפנה, לא מנווט החוצה)
  const scrollTo = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

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
      return (
        <Link key={"p" + (d.id || d.slug)} to={`/${d.slug}`} className="lur-card" style={{ "--acc": cPost }}>
          <div className="lur-media">{d.image_url ? <span className="lur-img" style={{ backgroundImage: `url(${thumb(d.image_url, 200)})` }} /> : <span className="lur-em">📜</span>}</div>
          <div className="lur-body"><Tag acc={cPost} logo={<span className="lur-lem">📄</span>}>פוסט</Tag>
            <h3 className="lur-title">{stripHtml(d.title || "")}</h3><Meta when={it.when} ai={ai} /></div>
        </Link>
      );
    }
    if (it.type === "reality") {
      const v = domNum(d);
      return (
        <button key={"r" + d.id} type="button" onClick={() => scrollTo("reality-home")} className="lur-card" style={{ "--acc": cReality }}>
          <div className="lur-media"><span className="lur-img" style={{ backgroundImage: `url(${thumb(d.image_url, 200)})` }} />{v != null && <span className="lur-onimg">{v}</span>}</div>
          <div className="lur-body"><Tag acc={cReality} logo={<RealityLogo s={13} />}>זרם המציאות</Tag>
            <h3 className="lur-title">{cleanName(d.name) || (v != null ? `מספר ${v}` : "רמז חדש")}</h3>
            <div className="lur-meta"><span>עודכן {timeAgoHe(it.when)}</span><span className="lur-more" style={{ color: cReality }}>↓ בזרם למטה</span></div></div>
        </button>
      );
    }
    // conv → היכל הגילוי · בית המדרש · התכנסות. סמל 🏛️ (זהה ל«היכל הגילוי» בנאב/למעלה).
    // לחיצה גוללת לסקשן «עץ ההתכנסויות» בבית (מפנה, לא מנווט; לא לסקשן הצפנים).
    const num = (d.highlight_numbers || [])[0];
    return (
      <button key={"v" + (d.slug || d.id || d.title)} type="button" onClick={() => scrollTo("convergences-home")} className="lur-card" style={{ "--acc": cGilui }}>
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
        .lur-title{font-family:${F.regal};font-size:14px;line-height:1.4;font-weight:700;color:${P.ink};margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .lur-meta{margin-top:auto;display:flex;align-items:center;gap:8px;font-size:10.5px;color:${P.muted};font-family:${F.heading};flex-wrap:wrap}
        .lur-ai{color:#3ea6ff;font-weight:800;background:rgba(62,166,255,.13);border:1px solid rgba(62,166,255,.4);border-radius:999px;padding:1px 7px}
        .lur-more{font-weight:800}
        @media(max-width:640px){.lur-media{width:74px;flex-basis:74px}}
      `}</style>
      <div className="lur-grid">{items.map(card)}</div>
      <div style={{ textAlign: "center", marginTop: 16, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        <Link to="/broadcasts" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>📡 מרכז השידורים →</Link>
      </div>
    </>
  );
}
