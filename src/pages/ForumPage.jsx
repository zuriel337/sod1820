import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, setForcedMode } from "../lib/themeMode.js";
import { track } from "../lib/tracking.js";
import { applySeo } from "../lib/seo.js";
import { thumb } from "../lib/img.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { resolveAuthor } from "../lib/authors.js";
import { INTENTS, intentMeta, stateMeta, STATE_META, getForumFeed } from "../lib/contributions.js";
import ResearcherLink from "../components/ResearcherLink.jsx";
import ResearcherBadge from "../components/ResearcherBadge.jsx";
import ReactionBar from "../components/ReactionBar.jsx";

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
  if (t.target_type === "els") return `/codes/${encodeURIComponent(t.target_id)}`;   // 🔠 תגובה על צופן → העמוד הקנוני
  return null;
}

const badge = (col, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: col, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{txt}</span>;

// ⭐ מובהקות — דירוג לפי מצב-המחקר (קנוני > אומת > בבדיקה > בדיון > רעיון) + אימות + 1820.
const STATE_RANK = { canonical: 5, validated: 4, investigating: 3, discussion: 2, idea: 1 };
const sigScore = (it) => (STATE_RANK[it.research_state] || 0) * 10 + (it.verified ? 5 : 0) + (it.has_1820 ? 3 : 0);

// כרטיס תרומת-מחקר — קומפקטי (רשימת-פורום): כותרת + תקציר 2-שורות, נפתח לשרשור מלא. עץ אחד.
function ContribCard({ c, P }) {
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const href = targetHref(c);                                   // 🎯 היעד (מספר/פסוק/צופן)
  const threadHref = c.contribId ? `/forum/${c.contribId}` : href;   // 💬 עמוד-השרשור (תגובה מתוך הפורום)
  const snippet = (c.body || "").replace(/\s+/g, " ").trim();
  const titleText = c.title || snippet.slice(0, 72) || "תרומת מחקר";
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        {badge(P.accentText, `${im.emoji} ${im.label}`)}
        {badge(P.accentDim, `${sm.emoji} ${sm.label}`)}
        {/* 🌳 עץ אחד: תגית-היעד (מספר/ביטוי) לא מוצגת בפיד — הקשר חי במקור ההודעה (עמוד השרשור /forum/:id «סביב …»). */}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      <Link to={threadHref} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, lineHeight: 1.4, marginBottom: 3 }}>{titleText}</div>
        {snippet && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{snippet}</div>}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 9 }}>
        {c.author_name
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ <ResearcherBadge name={c.author_name} uid={c.author_user_id} size={20} /></span>
          : <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ חבר הקהילה</span>}
        <ReactionBar id={c.contribId} reactions={c.reactions} compact />
        <Link to={threadHref} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>💬 המשך בדיון ←</Link>
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

// כרטיס צופן-גולש (els_records source='community') — מצביע לעמוד הקנוני /codes/:slug (לא העתק).
function CipherCard({ c, P }) {
  const to = `/codes/${encodeURIComponent(c.slug || "")}`;
  const scopeTxt = c.scope === "tanakh" ? "כל התנ״ך" : "התורה";
  const desc = (c.description || "").trim();
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {badge(P.accentText, "🆕 צופן חדש מגולש")}
        {/* 🌳 עץ אחד: מרחק-הדילוג לא מוצג כתגית בפיד — חי בעמוד הצופן הקנוני (/codes/:slug). */}
        {badge(P.accentDim, `📖 ${scopeTxt}`)}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      <Link to={to} style={{ textDecoration: "none", display: "flex", gap: 13, alignItems: "flex-start" }}>
        {c.image_url && (
          <img src={thumb(c.image_url, 200)} alt="" loading="lazy"
            style={{ width: 88, height: 62, objectFit: "cover", borderRadius: 10, flex: "0 0 auto", border: `1px solid ${P.border}`, background: "#0a0700" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 5, lineHeight: 1.4 }}>{c.title || c.search_term}</div>
          {desc && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>{desc.length > 240 ? desc.slice(0, 240) + "…" : desc}</div>}
        </div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 11 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ נמצא על ידי <b style={{ color: P.accentText }}>{c.author_name || "גולש"}</b>{c.ts ? ` · 🕐 ${formatDateHe(c.ts)}` : ""}</span>
        <Link to={to} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>🔍 לצופן ולמחקר ←</Link>
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
  const [state, setState] = useState(null);    // מצב-מחקר (research_state) · null=הכל
  const [sort, setSort] = useState("new");     // "new" (חדש) · "significance" (מובהקות)

  useEffect(() => { track("forum"); applySeo({ title: "פורום המחקר הקהילתי · סוד 1820", description: "כל חידושי, השערות, מקורות ומאמרי הכתבים של הקהילה במקום אחד — פורום המחקר של סוד 1820.", path: "/forum" }); }, []);
  // 🌞 הפורום נפתח במצב בהיר כברירת-מחדל (כמו בית המדרש), עם אפשרות לעבור לכהה.
  // כפיית-מצב מקומית — לא משנה את העדפת היום/לילה הגלובלית של המשתמש; משוחזר ביציאה.
  useEffect(() => { setForcedMode("light"); return () => setForcedMode(null); }, []);
  // שליפה אחת מלאה — הסינון נעשה בצד-לקוח, כך גם ידועות הכמויות לכל טאב (טאב ריק = לא-לחיץ).
  useEffect(() => { getForumFeed({ type: null, writer: null, limit: 200 }).then(setAllItems).catch(() => setAllItems([])); }, []);

  // כמויות לכל סוג — קובעות אילו טאבים לחיצים (אפס → לא-לחיץ)
  const postCount = useMemo(() => (allItems || []).filter(it => it.kind === "post").length, [allItems]);
  const insightCount = useMemo(() => (allItems || []).filter(it => it.kind === "insight").length, [allItems]);
  const cipherCount = useMemo(() => (allItems || []).filter(it => it.kind === "cipher").length, [allItems]);
  const intentCount = useMemo(() => {
    const m = {};
    (allItems || []).forEach(it => { if (it.kind === "contribution" && it.intent) m[it.intent] = (m[it.intent] || 0) + 1; });
    return m;
  }, [allItems]);

  // כמות לכל מצב-מחקר (רק לתרומות שיש להן מצב) — קובע אילו צ׳יפי-מצב מוצגים
  const stateCounts = useMemo(() => {
    const m = {};
    (allItems || []).forEach(it => { if (it.research_state) m[it.research_state] = (m[it.research_state] || 0) + 1; });
    return m;
  }, [allItems]);

  // הפריטים המוצגים — סינון (סוג → כתב/מצב) ומיון (חדש / מובהקות)
  const items = useMemo(() => {
    if (!allItems) return null;
    let out;
    if (type === "post") out = allItems.filter(it => it.kind === "post" && (!writer || it.author_name === writer));
    else if (type === "insight") out = allItems.filter(it => it.kind === "insight");
    else if (type === "cipher") out = allItems.filter(it => it.kind === "cipher");
    else if (type) out = allItems.filter(it => it.kind === "contribution" && it.intent === type);
    else out = allItems;
    if (state) out = out.filter(it => it.research_state === state);
    if (sort === "significance") out = [...out].sort((a, b) => sigScore(b) - sigScore(a) || (new Date(b.ts) - new Date(a.ts)));
    return out;
  }, [allItems, type, writer, state, sort]);

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
        <button disabled={cipherCount === 0} onClick={cipherCount === 0 ? undefined : () => pickType("cipher")}
          title={cipherCount === 0 ? "אין עדיין צפני גולשים" : undefined} style={chip(type === "cipher", cipherCount === 0)}>🔠 צפני גולשים</button>
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

      {/* שורה 1.5 — מצב-מחקר + מיון (מה שהופך אותו לפורום-מחקר, לא צ׳אט) */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginBottom: 18 }}>
        {/* שורת «מצב» מופיעה רק כשיש ≥2 מצבים עם תוכן — אחרת «הכל» ו«המצב-היחיד» זהים (כולם בכולם) ומבלבלים. */}
        {Object.keys(STATE_META).filter(k => (stateCounts[k] || 0) > 0).length >= 2 && (
          <>
            <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>מצב:</span>
            <button onClick={() => setState(null)} style={{ ...chip(!state), fontSize: 12, padding: "4px 11px" }}>הכל</button>
            {Object.keys(STATE_META).filter(k => (stateCounts[k] || 0) > 0).map(k => {
              const sm = STATE_META[k];
              return <button key={k} onClick={() => setState(state === k ? null : k)} style={{ ...chip(state === k), fontSize: 12, padding: "4px 11px" }}>{sm.emoji} {sm.label} {stateCounts[k]}</button>;
            })}
            <span style={{ width: 1, height: 15, background: P.border, margin: "0 5px" }} />
          </>
        )}
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>מיון:</span>
        <button onClick={() => setSort("new")} style={{ ...chip(sort === "new"), fontSize: 12, padding: "4px 11px" }}>🆕 חדש</button>
        <button onClick={() => setSort("significance")} style={{ ...chip(sort === "significance"), fontSize: 12, padding: "4px 11px" }}>⭐ מובהקות</button>
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
          {items.map(c => c.kind === "post" ? <PostCard key={c.id} c={c} P={P} /> : c.kind === "insight" ? <InsightCard key={c.id} c={c} P={P} /> : c.kind === "cipher" ? <CipherCard key={c.id} c={c} P={P} /> : <ContribCard key={c.id} c={c} P={P} />)}
        </div>
      )}
    </div>
  );
}
