import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, setForcedMode } from "../lib/themeMode.js";
import { track } from "../lib/tracking.js";
import { applySeo } from "../lib/seo.js";
import { thumb } from "../lib/img.js";
import { stripHtml } from "../lib/format.js";
import { resolveAuthor } from "../lib/authors.js";
import { INTENTS, intentMeta, stateMeta, getForumFeed } from "../lib/contributions.js";

// 🌐 הפורום — פיד-מחקר מאוחד (research_contribution_law + עץ אחד): תרומות-הקהילה
// יחד עם פוסטי-הכתבים בעלי-השם, ממוזגים לפי תאריך (החדשים למעלה). פוסט = כרטיס-מצביע
// לפוסט הקנוני (/<slug>), לעולם לא העתק. הזרם של צוריאל («המערכת») נשאר בדף-הבית.
function timeAgo(ts) {
  try {
    const s = (Date.now() - new Date(ts)) / 1000;
    if (s < 3600) return `לפני ${Math.max(1, Math.floor(s / 60))} דק׳`;
    if (s < 86400) return `לפני ${Math.floor(s / 3600)} שע׳`;
    if (s < 604800) return `לפני ${Math.floor(s / 86400)} ימים`;
    return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch { return ""; }
}

function targetHref(t) {
  if (!t?.target_id) return null;
  if (t.target_type === "number" || t.target_type === "phrase") return `/number/${encodeURIComponent(t.target_id)}#comments`;
  return null;
}

const badge = (col, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: col, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{txt}</span>;

// כרטיס תרומת-מחקר (research_contributions)
function ContribCard({ c, P }) {
  const [open, setOpen] = useState(false);
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const href = targetHref(c);
  const long = (c.body || "").length > 420;
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        {badge(P.accentText, `${im.emoji} ${im.label}`)}
        {badge(P.accentDim, `${sm.emoji} ${sm.label}`)}
        {c.target_id && <Link to={href || "#"} style={{ textDecoration: "none" }}>{badge(P.accent, `${c.target_type === "number" ? "🔢" : "🔖"} ${c.target_id}`)}</Link>}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 5 }}>{c.title}</div>}
      {c.body && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
          {open || !long ? c.body : c.body.slice(0, 420) + "…"}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ נכתב על ידי <b style={{ color: P.accentText }}>{c.author_name || "חבר הקהילה"}</b></span>
        {long && <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: 0 }}>{open ? "▴ הסתר" : "▾ קרא עוד"}</button>}
        {href && <Link to={href} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>המשך בדיון ←</Link>}
      </div>
    </div>
  );
}

// כרטיס פוסט-של-כתב — מצביע לפוסט הקנוני (לא העתק). אווטאר + תפקיד מ-authors.js.
function PostCard({ c, P }) {
  const a = resolveAuthor(c.author_name);
  const to = `/${c.slug}`;
  const preview = stripHtml(c.excerpt);
  const cat = Array.isArray(c.categories) && c.categories.length ? c.categories[0] : null;
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {badge(P.accentText, "📜 מאמר")}
        {cat && <Link to={`/category/${encodeURIComponent(cat)}`} style={{ textDecoration: "none" }}>{badge(P.accent, `🏷️ ${cat}`)}</Link>}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      <Link to={to} style={{ textDecoration: "none", display: "flex", gap: 13, alignItems: "flex-start" }}>
        {c.image_url && (
          <img src={thumb(c.image_url, 200)} alt="" loading="lazy"
            style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 11, flex: "0 0 auto", border: `1px solid ${P.border}` }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 5, lineHeight: 1.4 }}>{stripHtml(c.title)}</div>}
          {preview && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>{preview.length > 240 ? preview.slice(0, 240) + "…" : preview}</div>}
        </div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 11 }}>
        <img src={a.avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: `1px solid ${P.border}` }} />
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, lineHeight: 1.3 }}>
          <b style={{ color: P.accentText }}>{a.name}</b>{a.role ? <span style={{ display: "block", fontSize: 10.5, color: P.accentDim, fontWeight: 400 }}>{a.role}</span> : null}
        </span>
        <Link to={to} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>📖 קרא את הפוסט המלא ←</Link>
      </div>
    </div>
  );
}

// כרטיס חידוש בית-המדרש (insights) — מצביע לחידוש הקנוני בבית המדרש (לא העתק)
function InsightCard({ c, P }) {
  const [open, setOpen] = useState(false);
  const body = stripHtml(c.body || "");
  const long = body.length > 420;
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        {badge(P.accentText, "💡 חידוש")}
        {c.verified && badge(P.accent, "🔵 מאומת")}
        {c.has_1820 && badge(P.accent, "✦ 1820")}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 5 }}>{stripHtml(c.title)}</div>}
      {body && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
          {open || !long ? body : body.slice(0, 420) + "…"}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ <b style={{ color: P.accentText }}>{c.author_name || "בית המדרש"}</b></span>
        {long && <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: P.accent, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: 0 }}>{open ? "▴ הסתר" : "▾ קרא עוד"}</button>}
        <Link to={c.link || "/research?tool=midrash"} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>לחידוש המלא ←</Link>
      </div>
    </div>
  );
}

export default function ForumPage() {
  const P = usePalette();
  const mode = useThemeMode();
  const [allItems, setAllItems] = useState(null);
  const [type, setType] = useState(null);      // null=הכל · "post" · intent
  const [writer, setWriter] = useState(null);  // סינון-כתב (רק כש-type==="post")

  useEffect(() => { track("forum"); applySeo({ title: "פורום המחקר הקהילתי · סוד 1820", description: "כל חידושי, השערות, מקורות ומאמרי הכתבים של הקהילה במקום אחד — פורום המחקר של סוד 1820.", path: "/forum" }); }, []);
  // 🌞 הפורום נפתח במצב בהיר כברירת-מחדל (כמו בית המדרש), עם אפשרות לעבור לכהה.
  // כפיית-מצב מקומית — לא משנה את העדפת היום/לילה הגלובלית של המשתמש; משוחזר ביציאה.
  useEffect(() => { setForcedMode("light"); return () => setForcedMode(null); }, []);
  // שליפה אחת מלאה — הסינון נעשה בצד-לקוח, כך גם ידועות הכמויות לכל טאב (טאב ריק = לא-לחיץ).
  useEffect(() => { getForumFeed({ type: null, writer: null, limit: 200 }).then(setAllItems).catch(() => setAllItems([])); }, []);

  // כמויות לכל סוג — קובעות אילו טאבים לחיצים (אפס → לא-לחיץ)
  const postCount = useMemo(() => (allItems || []).filter(it => it.kind === "post").length, [allItems]);
  const insightCount = useMemo(() => (allItems || []).filter(it => it.kind === "insight").length, [allItems]);
  const intentCount = useMemo(() => {
    const m = {};
    (allItems || []).forEach(it => { if (it.kind === "contribution" && it.intent) m[it.intent] = (m[it.intent] || 0) + 1; });
    return m;
  }, [allItems]);

  // הפריטים המוצגים — סינון בצד-לקוח לפי הטאב הנבחר
  const items = useMemo(() => {
    if (!allItems) return null;
    if (type === "post") return allItems.filter(it => it.kind === "post" && (!writer || it.author_name === writer));
    if (type === "insight") return allItems.filter(it => it.kind === "insight");
    if (type) return allItems.filter(it => it.kind === "contribution" && it.intent === type);
    return allItems;
  }, [allItems, type, writer]);

  // רשימת-כתבים לצ׳יפים — כל הכתבים שיש להם מאמר (נגזר מהמאגר המלא)
  const writers = useMemo(() => {
    const seen = new Map();
    (allItems || []).forEach(it => { if (it.kind === "post" && it.author_name) seen.set(it.author_name, (seen.get(it.author_name) || 0) + 1); });
    return [...seen.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  }, [allItems]);

  const chip = (on, disabled) => ({ cursor: disabled ? "default" : "pointer", borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
    border: `1px solid ${on ? P.borderStrong : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent", color: on ? P.accentText : P.accentDim, opacity: disabled ? 0.38 : 1 });
  const pickType = (t) => { setType(t); if (t !== "post") setWriter(null); };

  return (
    <div dir="rtl" style={{ maxWidth: 780, margin: "0 auto", padding: "26px 16px 90px", position: "relative", zIndex: 1 }}>
      {/* 🌗 מתג מראה — בהיר/כהה, כמו בשאר האתר. אופציה גלויה גם מכאן. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={() => setForcedMode(mode === "light" ? "dark" : "light")} title="מצב יום / לילה" aria-label="החלפת מצב בהיר/כהה"
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: "transparent",
            border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 999, padding: "5px 12px",
            fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
          {mode === "light" ? "🌙 מצב כהה" : "☀️ מצב בהיר"}
        </button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>מחקר קהילתי · פורום</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, margin: "0 0 8px" }}>🌐 פורום המחקר</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
          חידושי הקהילה ומאמרי הכתבים — מכל האתר, במקום אחד, החדשים למעלה. לחיצה מובילה לפוסט או לדיון המלא.
        </p>
      </div>

      {/* שורה 1 — סוג. טאב ריק (0 פריטים) = לא-לחיץ, רק טאב עם תוכן לחיץ. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}>
        <button onClick={() => pickType(null)} style={chip(!type, false)}>הכל</button>
        <button disabled={postCount === 0} onClick={postCount === 0 ? undefined : () => pickType("post")}
          title={postCount === 0 ? "אין עדיין מאמרי כתבים" : undefined} style={chip(type === "post", postCount === 0)}>📜 מאמרי כתבים</button>
        <button disabled={insightCount === 0} onClick={insightCount === 0 ? undefined : () => pickType("insight")}
          title={insightCount === 0 ? "אין עדיין חידושים" : undefined} style={chip(type === "insight", insightCount === 0)}>💡 חידושי בית המדרש</button>
        {INTENTS.filter(i => i.key !== "תגובה").map(i => {
          const cnt = intentCount[i.key] || 0;
          return (
            <button key={i.key} disabled={cnt === 0} onClick={cnt === 0 ? undefined : () => pickType(i.key)}
              title={cnt === 0 ? "אין עדיין פריטים בקטגוריה זו" : undefined} style={chip(type === i.key, cnt === 0)}>
              {i.emoji} {i.label}
            </button>
          );
        })}
      </div>

      {/* שורה 2 — כתבים (רק במצב מאמרים) */}
      {type === "post" && writers.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 18 }}>
          <button onClick={() => setWriter(null)} style={{ ...chip(!writer), fontSize: 12 }}>כל הכתבים</button>
          {writers.map(w => (
            <button key={w.name} onClick={() => setWriter(w.name)} style={{ ...chip(writer === w.name), fontSize: 12 }}>{w.name}</button>
          ))}
        </div>
      )}

      {items === null ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 40 }}>טוען…</div>
      ) : !items.length ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "50px 20px", lineHeight: 1.8 }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.7 }}>🌱</div>
          עדיין אין פריטים בקטגוריה הזו — היו הראשונים לתרום מדף מספר או מבית המדרש.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 13 }}>
          {items.map(c => c.kind === "post" ? <PostCard key={c.id} c={c} P={P} /> : c.kind === "insight" ? <InsightCard key={c.id} c={c} P={P} /> : <ContribCard key={c.id} c={c} P={P} />)}
        </div>
      )}
    </div>
  );
}
