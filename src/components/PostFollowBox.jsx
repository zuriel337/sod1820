import React, { useEffect, useState } from "react";
import WatchButton from "./WatchButton.jsx";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { resolveAuthor } from "../lib/authors.js";
import NavigationIcon2029 from "./experience2029/NavigationIcon2029.jsx";
import { fetchPostFollowTargets2029, postFollowCandidates2029 } from "../lib/research/postsCatalog2029Projection.js";
import "./postFollow2029.css";

// An opt-in composition of the same WatchButton, without its own preferences,
// toggle, identity or channel logic. Legacy defaults below are preserved.
function PostFollow2029({ post, scope, source }) {
  const key = JSON.stringify(postFollowCandidates2029({ post, scope }));
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState({ key: "", items: [], error: false });
  useEffect(() => {
    let live = true;
    setView({ key: "", items: [], error: false });
    fetchPostFollowTargets2029({ post, scope }).then(items => {
      if (live) setView({ key, items, error: false });
    }).catch(() => { if (live) setView({ key, items: [], error: true }); });
    return () => { live = false; };
  }, [key, attempt]); // candidates capture exact public source/scope; no account data is read here.
  if (key === "[]") return null;
  const current = view.key === key;
  const items = current ? view.items : [];
  return <section className="sod29-post-follow" aria-label="מעקב אחרי סדרה ותחום" data-follow-source={source}>
    <h2><NavigationIcon2029 name="add" size={22} /> להישאר בקשר</h2>
    <p>בוחרים אחרי מה לעקוב. מעקב אינו מפעיל מייל או התראות דפדפן.</p>
    {import.meta.env?.VITE_INTEGRATED_PREVIEW ? <p role="note" data-follow-preview="read-only">זהו פריוויו לקריאה בלבד. שמירת מעקב ואימות חשבון אינם פעילים כאן; כשל בקריאת המצב אינו אומר שאין מעקבים.</p> : null}
    {!current ? <p role="status">בודק אילו יעדי מעקב זמינים…</p> : null}
    {items.map(item => <div key={item.topic} className="sod29-post-follow-target" data-follow-target={item.topic} data-follow-readiness={item.state}>
      <h3><NavigationIcon2029 name={item.icon} size={20} /><span>{item.kind}: {item.label}</span></h3>
      {item.state === "ready" ? <WatchButton variant="2029" topic={item.topic} source={source} noPush
        label={`מעקב אחרי ${item.label}`} followLabel={`עוקב אחרי ${item.label}`}
        explainer={`עדכון באתר כשמתפרסם פוסט חדש ${item.entityType === "author" ? "מאת " : "ב"}${item.label}. ערוצים נוספים נבחרים בנפרד.`} />
        : <p>{item.state === "unsupported" ? item.entityType === "series" ? "עדכוני הסדרה עדיין אינם פעילים. אפשר להמשיך לעיין בסדרה." : "יעד המעקב הזה עדיין אינו פעיל."
          : "לא ניתן לאמת כרגע את יעד המעקב הזה."}</p>}
    </div>)}
    {current && (view.error || items.some(item => item.state === "unavailable")) ? <div role="status"><p>בדיקת חלק מיעדי המעקב לא הושלמה.</p><button type="button" className="sod29-watch-btn sod29-watch-btn-secondary" onClick={() => setAttempt(value => value + 1)}>בדיקה נוספת של יעדי המעקב</button></div> : null}
  </section>;
}

// 🔔 דשבורד-מעקב בתחתית פוסט — subscription_funnel_law v11: הפוסט הוא **שער**, לא יעד.
// «דשבורד קטן»: צ'קבוקס (וי) לכל קטגוריה של הפוסט + שורת-כתב — מסמנים וי על מה שרוצים
// לעקוב, **בלי פוש**. שתי קטגוריות → שני צ'קבוקסים (בקשת צוריאל). הכל דרך ה-WatchButton
// הקנוני היחיד והמנוע הקנוני (cat:<שם> / author:<שם>). אין post:<id>, אין fan-out לפוסט.
// paletteMode=postMode כדי שיתאים לצבע-הפוסט (נעול-כהה מול מצב-אתר בהיר).
export default function PostFollowBox({ categories = [], author = "", postMode = null, variant = null, post = null, scope = null, source = "post_footer_2029" }) {
  const auto = usePalette();
  const P = postMode ? (PALETTES[postMode] || auto) : auto;
  const cats = [...new Set((categories || []).filter(Boolean))];
  const by = resolveAuthor(author);
  const hasWriter = by.name && by.name !== "המערכת";
  if (variant === "2029") return <PostFollow2029 post={post} scope={scope} source={source} />;
  if (!cats.length && !hasWriter) return null;

  return (
    <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${P.border}`, direction: "rtl" }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, marginBottom: 3, textAlign: "center" }}>
        🔔 עקוב — וההתראה תחכה לך באתר (בפעמון), לא במייל
      </div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginBottom: 14, textAlign: "center" }}>
        סמן וי על מה שמעניין אותך.
      </div>
      <div style={{ maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {cats.map((cat) => (
          <WatchButton key={`cat:${cat}`} topic={`cat:${cat}`} source="post_footer" checkbox noPush
            paletteMode={postMode} icon="📁" label={cat} explainer="" />
        ))}
        {hasWriter && (
          <WatchButton key={`author:${by.name}`} topic={`author:${by.name}`} source="post_footer" checkbox noPush
            paletteMode={postMode} icon="✍️" label={`מאת ${by.name}`} explainer="" />
        )}
      </div>
    </div>
  );
}
