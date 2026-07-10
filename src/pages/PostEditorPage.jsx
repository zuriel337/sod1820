import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { C, F, POST_CONTENT_CSS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { toggleTheme } from "../lib/themeMode.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getPostBySlug, adminSavePost, adminResetPostPosition, getPostRevisions, restorePostRevision, tokenSavePost, getPostAiEdit, getPostCategoriesTags, getDraftPosts, getAllAuthors } from "../lib/supabase.js";
import { supabase } from "../lib/supabase.js";

// 🔑 כניסה עם קוד-סוד (בלי התחברות) — ?key=<code>. הקוד עצמו לא נשמר בצד-הלקוח:
// כל key פותח את הטופס, אבל השמירה מאומתת בשרת (post-save token) — key שגוי → נדחה.
import { thumb } from "../lib/img.js";

// ✍️ עורך הפוסטים המתקדם (אדמין) — /editor (חדש) · /editor/:slug (עריכה). מחוץ ל-/admin/ (honeypot).
// כתיבה/עריכה עם כל השדות + עוזר-AI שעורך את התוכן (מנוע ברירת-מחדל: Gemini — ה-AI שנקנה בטוקנים, לא חשבון ה-Anthropic).
// תצוגה מקדימה חיה בקלאס הקנוני sod-post-content.clean + POST_CONTENT_CSS + data-theme. שמירה דרך RPC admin_save_post.

const slugify = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9א-ת_-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

// הזרקות סרגל-הכלים לתוך ה-textarea (כמו AdvancedPostEditor, + ריבוע גימטריה קנוני)
const GEM_BOX = '\n<div class="sod-gematria-box"><div class="gb-title">🔢 גימטריה — עובדה מאומתת במנוע</div><div class="gb-rows"><div><b>ערך</b> = ביטוי = ביטוי</div></div><div class="gb-note">הערה: הגימטריה עובדה; הרמז — פרשנות משלימה.</div></div>\n';
const SEE_ALSO = '\n<h3>ראו גם</h3>\n<ul>\n  <li><a href="/SLUG">כותרת פוסט קשור</a></li>\n</ul>\n';

// 🎨 צבעי-מילה מודעי-תמה — נשמרים כקלאס (sc-*) ולא inline, כדי שיעבדו יום+לילה (post_text_colors_law).
const WORD_COLORS = [
  { k: "gold", l: "זהב", swatch: "#e8c840" },
  { k: "red", l: "אדום", swatch: "#e0524a" },
  { k: "blue", l: "כחול", swatch: "#3ea6ff" },
  { k: "green", l: "ירוק", swatch: "#4bb972" },
  { k: "violet", l: "סגול", swatch: "#a678ff" },
  { k: "white", l: "לבן/שחור", swatch: "#dcdcdc" },
  { k: "hl", l: "הדגשה (רקע)", swatch: "rgba(212,175,55,.5)" },
];

const AI_PRESETS = [
  { l: "שיפור ניסוח וזרימה", v: "שפר את הניסוח והזרימה של הפוסט, שמור על כל העובדות והערכים, בלי לשנות את המשמעות. חלק לפסקאות קריאות." },
  { l: "הוסף מבוא מושך", v: "הוסף פסקת מבוא קצרה ומושכת בראש הפוסט, שמזמינה לקריאה, בקול האתר (עובדה לפני פרשנות)." },
  { l: "עצב לפורמט האתר", v: "עצב את התוכן לפורמט הקנוני של האתר: פסקאות ב-<p>, כותרות-משנה ב-<h2>/<h3>, פסוקים ב-blockquote class=sod-verse, ריבוע גימטריה רק אם יש שוויון אמיתי." },
  { l: "הוסף «ראו גם»", v: "הוסף בסוף בלוק «ראו גם» עם 2-3 קישורים רלוונטיים לפי הנושא (השאר placeholder אם אינך יודע את ה-slug המדויק)." },
];

// 🏷 בורר קטגוריות/תגיות אמין — מחליף את ה-datalist השביר (שלא נפתח באייפון) + Enter-בלבד.
//   • רשימה נלחצת שנפתחת בפוקוס/הקלדה (סינון חי) — הקשה מוסיפה.
//   • כפתור «הוסף» (לא רק Enter) — עובד מצוין בנייד.
//   • «הצג הכל» פותח את כל הרשימה הקיימת גם בלי להקליד.
function ChipField({ selected, options, onAdd, onRemove, placeholder, addLabel = "הוסף" }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const q = input.trim();
  const avail = (options || []).filter(o => !selected.includes(o));
  const matches = q ? avail.filter(o => o.toLowerCase().includes(q.toLowerCase())) : avail;
  const isNew = q && !options.some(o => o.toLowerCase() === q.toLowerCase()) && !selected.some(s => s.toLowerCase() === q.toLowerCase());

  const add = (v) => { const t = (v || "").trim(); if (!t) return; onAdd(t); setInput(""); setOpen(false); };

  // סגירה בלחיצה מחוץ לרכיב
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const menuOpen = open && (matches.length > 0 || isNew);

  return (
    <div className="pe-picker" ref={boxRef}>
      {selected.length > 0 && (
        <div className="pe-chips">{selected.map(c => <span key={c} className="pe-chip">{c}<button type="button" onClick={() => onRemove(c)}>×</button></span>)}</div>
      )}
      <div className="pe-row">
        <input
          className="pe-in" value={input} placeholder={placeholder}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        />
        <button type="button" className="pe-addbtn" disabled={!q} onClick={() => add(input)}>{addLabel}</button>
      </div>
      {menuOpen && (
        <div className="pe-menu">
          {isNew && <button type="button" className="pe-opt new" onMouseDown={e => e.preventDefault()} onClick={() => add(q)}>＋ צור חדש: «{q}»</button>}
          {matches.map(o => <button key={o} type="button" className="pe-opt" onMouseDown={e => e.preventDefault()} onClick={() => add(o)}>{o}</button>)}
        </div>
      )}
      {!menuOpen && !q && avail.length > 0 && (
        <button type="button" className="pe-toggle" onClick={() => setOpen(true)}>
          הצג את כל הקיימות ({avail.length}) ▾
        </button>
      )}
    </div>
  );
}

// 💡 רמזי-קטגוריה (המלצה בלבד — לעולם לא נבחר אוטומטית). מילת-מפתח בתוכן → קטגוריה מוצעת.
const CAT_KW = [
  { re: /(פרה אדומה|בית המקדש|בית המקדש השלישי|מזבח|קרבן)/, cat: "בית המקדש השלישי" },
  { re: /(פיגוע|מלחמ|טיל|רקטה|רעידת אדמה|אסון|שיטפון|התרסק|שריפ|קורה עכשיו|בזמן אמת|חדשות|תיעוד)/, cat: "תיעוד אירועים" },
  { re: /(משיח|גאול|אחרית הימים|קץ הימים|ביאת)/, cat: "גאולה ומשיח" },
];

export default function PostEditorPage() {
  const { slug: routeSlug } = useParams();
  const nav = useNavigate();
  const P = usePalette();
  const { isAdmin, verified, user, profile, loading: authLoading } = useAuth();
  // כניסה עם קוד-סוד בכתובת (?key=) — עוקף את שער ההתחברות ומשתמש בשמירה מוגנת-קוד.
  const editKey = useMemo(() => { try { return new URLSearchParams(window.location.search).get("key") || ""; } catch { return ""; } }, []);
  const hasKey = !!editKey;   // הטופס נפתח עם כל key; השמירה מאמתת בשרת
  const canEdit = hasKey || (verified && isAdmin);

  const isEdit = !!routeSlug;
  const [loading, setLoading] = useState(isEdit);
  const [postId, setPostId] = useState(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [authors, setAuthors] = useState([]);   // כמה כתבים לפוסט (authors[0] = הכתב הראשי)
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [aiTouched, setAiTouched] = useState(false);
  const [source, setSource] = useState("ai");
  const slugTouched = useRef(false);

  // 🆕 שדות-שליטה מתקדמים (post_editor_upgrade)
  const [theme, setTheme] = useState("auto");        // תמת-הפוסט: auto|light|dark
  const [keepModified, setKeepModified] = useState(false);  // «שמור מיקום» — אל תקפיץ לראש
  const [axisPin, setAxisPin] = useState(null);      // ציר ההתגלות: null=אוטו · 1=הצג · 0=הסתר
  const [treePriority, setTreePriority] = useState(null);   // מיקום ידני בציר (גבוה=למעלה)
  const [origModified, setOrigModified] = useState(null);   // modified המקורי (ל«החזר למקום»)
  const [fullscreen, setFullscreen] = useState(false);      // עורך במסך-מלא
  const [liveEdit, setLiveEdit] = useState(false);          // עריכה ישירה בתצוגה-המקדימה (WYSIWYG)
  const [colorOpen, setColorOpen] = useState(false);        // פתיחת בורר-הצבעים
  const liveRef = useRef(null);

  // 🕘 היסטוריית גרסאות
  const [revisions, setRevisions] = useState([]);
  const [revsOpen, setRevsOpen] = useState(false);
  const [previewRev, setPreviewRev] = useState(null);       // גרסה בתצוגה מקדימה
  const [revBusy, setRevBusy] = useState(false);

  const [allCats, setAllCats] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [drafts, setDrafts] = useState([]);       // רשימת הטיוטות
  const [allAuthors, setAllAuthors] = useState([]);   // כל הכתבים באתר (פוסטים+מרשם+contributors)
  const [wasDraft, setWasDraft] = useState(!isEdit); // האם הפוסט הנטען כרגע טיוטה (חדש = טיוטה כברירת-מחדל)

  const [view, setView] = useState("edit");       // edit | preview | split (עריכה תוך תצוגה מקדימה)
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState(null);
  const snapRef = useRef("");                     // תצלום «נשמר לאחרונה» — לזיהוי שינויים לא-שמורים
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // עוזר ה-AI
  const [engine, setEngine] = useState("gemini");   // ברירת-מחדל: המנוע בטוקנים
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState(null);   // { html, engine, model }
  const [aiErr, setAiErr] = useState("");

  const taRef = useRef(null);

  useEffect(() => { getPostCategoriesTags().then(({ categories: c, tags: t }) => { setAllCats(c); setAllTags(t.filter(x => x !== "טיוטה")); }).catch(() => {}); }, []);
  const reloadDrafts = useCallback(() => { getDraftPosts().then(setDrafts).catch(() => {}); }, []);
  useEffect(() => { reloadDrafts(); getAllAuthors().then(setAllAuthors).catch(() => {}); }, [reloadDrafts]);

  // 🕘 טעינת היסטוריית הגרסאות של הפוסט הנוכחי (מנהל בלבד; ריק בנתיב token)
  const reloadRevisions = useCallback(() => {
    if (hasKey || !postId) { setRevisions([]); return; }
    getPostRevisions(postId).then(setRevisions).catch(() => {});
  }, [postId, hasKey]);
  useEffect(() => { reloadRevisions(); }, [reloadRevisions]);

  useEffect(() => {
    let alive = true;
    if (!isEdit) { setLoading(false); return; }
    setLoading(true);
    getPostBySlug(routeSlug).then(p => {
      if (!alive || !p) { setLoading(false); if (!p) setErr("הפוסט לא נמצא"); return; }
      setPostId(p.id ?? null);
      setTitle(p.title || "");
      setSlug(p.slug || "");
      setExcerpt(p.excerpt || "");
      setContent(p.content || "");
      setAuthors(Array.isArray(p.authors) && p.authors.length ? p.authors : (p.author ? [p.author] : []));
      setImageUrl(p.image_url || "");
      setCategories(p.categories || []);
      setWasDraft((p.tags || []).includes("טיוטה"));
      setTags((p.tags || []).filter(t => t !== "טיוטה"));   // «טיוטה» מנוהל ע"י כפתורי שמור-טיוטה/פרסם, לא כצ'יפ
      setAiTouched(!!p.ai_touched);
      setSource(p.source || "ai");
      setTheme(p.theme === "light" || p.theme === "dark" ? p.theme : "auto");
      setAxisPin(p.axis_pin === 0 || p.axis_pin === 1 ? p.axis_pin : null);
      setTreePriority(typeof p.tree_priority === "number" ? p.tree_priority : null);
      setOrigModified(p.modified || null);
      slugTouched.current = true;
      setLoading(false);
    }).catch(() => { if (alive) { setErr("שגיאה בטעינת הפוסט"); setLoading(false); } });
    return () => { alive = false; };
  }, [routeSlug, isEdit]);

  // slug נגזר מהכותרת עד שנוגעים בו ידנית (ובפוסט חדש בלבד)
  useEffect(() => { if (!isEdit && !slugTouched.current) setSlug(slugify(title)); }, [title, isEdit]);

  // תצלום המצב הניתן-לעריכה — להשוואת «שינויים לא שמורים» ולשמירה-אוטומטית
  const snapshot = useCallback(
    () => JSON.stringify({ title, slug, excerpt, content, authors, imageUrl, categories, tags, aiTouched, theme, axisPin, treePriority }),
    [title, slug, excerpt, content, authors, imageUrl, categories, tags, aiTouched, theme, axisPin, treePriority]
  );
  const dirty = snapshot() !== snapRef.current;

  // אתחול התצלום כשהטעינה הסתיימה (פוסט קיים או חדש) — אחריו כל שינוי נחשב «לא שמור»
  useEffect(() => { if (!loading) snapRef.current = snapshot(); /* eslint-disable-next-line */ }, [loading]);

  // 💾 שמירה אוטומטית — לפוסט קיים בלבד (לא יוצרים חדשים אוטומטית), debounce 4ש', שומר במצב הנוכחי
  // (טיוטה נשארת טיוטה, פורסם נשאר פורסם). מנהל בלבד (לא בנתיב token).
  useEffect(() => {
    if (hasKey || !postId || !title.trim() || !dirty) return;
    const t = setTimeout(() => { save(wasDraft, { silent: true }); }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, content, authors, imageUrl, categories, tags, aiTouched, theme, axisPin, treePriority, keepModified, postId, wasDraft]);

  // ⚠️ אזהרת «שינויים לא שמורים» ביציאה מהדף/רענון
  useEffect(() => {
    const h = (e) => { if (dirty && snapRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // ── עריכת תוכן דרך הסרגל ──
  const applyToContent = useCallback((transform) => {
    const ta = taRef.current;
    const value = content || "";
    const s = ta ? (ta.selectionStart ?? value.length) : value.length;
    const e = ta ? (ta.selectionEnd ?? value.length) : value.length;
    const { text, selStart, selEnd } = transform(value.slice(s, e), value, s, e);
    setContent(text);
    requestAnimationFrame(() => { if (ta) { ta.focus(); try { ta.setSelectionRange(selStart, selEnd); } catch { /* noop */ } } });
  }, [content]);
  const wrap = (before, after, ph = "טקסט") => applyToContent((sel, v, s, e) => {
    const inner = sel || ph; const text = v.slice(0, s) + before + inner + after + v.slice(e);
    const selStart = s + before.length; return { text, selStart, selEnd: selStart + inner.length };
  });
  const insert = (snip) => applyToContent((sel, v, s, e) => {
    const text = v.slice(0, s) + snip + v.slice(e); const pos = s + snip.length; return { text, selStart: pos, selEnd: pos };
  });
  const addLink = () => { const url = window.prompt("כתובת הקישור (URL):", "/"); if (url) wrap(`<a href="${url}">`, "</a>", "טקסט הקישור"); };
  const addImage = () => { const url = window.prompt("כתובת התמונה (URL):", "https://"); if (url) insert(`\n<div style="text-align:center;margin:22px 0;"><img src="${url}" alt="" style="max-width:280px;width:100%;border-radius:12px;" /></div>\n`); };
  // 🔗 הפיכת גימטריה לקישור-לחיץ שפותח את מגירת המספר (post_text_colors_law):
  //   cls='sod-gemlink' = ביטוי (קו-זהב מנוקד) · cls='sod-numlink' = ערך (זהב מודגש).
  //   עובד על הבחירה הנוכחית ב-textarea; אם אין בחירה — שואל.
  const gemify = (cls) => applyToContent((sel, v, s, e) => {
    let inner = (sel && sel.trim()) || "";
    if (!inner) { inner = (window.prompt(cls === "sod-numlink" ? "הערך/המספר:" : "הביטוי:", "") || "").trim(); }
    if (!inner) return { text: v, selStart: s, selEnd: e };
    const open = `<a href="/number/${encodeURIComponent(inner)}" class="${cls}" data-gem="${inner}">`;
    const bOpen = cls === "sod-numlink" ? "<b>" : "", bClose = cls === "sod-numlink" ? "</b>" : "";
    const text = v.slice(0, s) + open + bOpen + inner + bClose + "</a>" + v.slice(e);
    const selStart = s + open.length + bOpen.length;
    return { text, selStart, selEnd: selStart + inner.length };
  });

  // 🎨 צביעת מילה/בחירה — עוטף בקלאס מודע-תמה (sc-*), לא inline. עובד יום+לילה.
  const colorWord = (k) => { setColorOpen(false); wrap(`<span class="sc-${k}">`, "</span>", "טקסט"); };
  // 📏 שורה-לחיצה שפותחת את חלונית המספר — עוטף את הבחירה ב-<div class="sod-numrow" data-gem="ערך">.
  const numRow = () => applyToContent((sel, v, s, e) => {
    const inner = (sel && sel.trim()) || (window.prompt("טקסט השורה:", "") || "").trim();
    const val = (window.prompt("איזה מספר/ביטוי השורה תפתח בחלונית?", "") || "").trim();
    if (!inner || !val) return { text: v, selStart: s, selEnd: e };
    const open = `\n<div class="sod-numrow" data-gem="${val}">`;
    const text = v.slice(0, s) + open + inner + "</div>\n" + v.slice(e);
    const selStart = s + open.length;
    return { text, selStart, selEnd: selStart + inner.length };
  });
  // 🧹 ניקוי עיצוב — מסיר תגיות HTML מהבחירה (משאיר טקסט נקי).
  const clearFmt = () => applyToContent((sel, v, s, e) => {
    if (!sel) return { text: v, selStart: s, selEnd: e };
    const stripped = sel.replace(/<[^>]+>/g, "");
    const text = v.slice(0, s) + stripped + v.slice(e);
    return { text, selStart: s, selEnd: s + stripped.length };
  });

  // ✨ הפיכה אוטומטית של כל המספרים בתוכן לקישורים-לחיצים (פותחים את מגירת המספר).
  // ממיר רק מקטעי-טקסט (לא בתוך תגיות), ומדלג על כל מה שכבר בתוך <a> — לא כופל קישורים.
  const autoLinkNumbers = () => {
    const html = content || "";
    let depthA = 0;
    const out = html.split(/(<[^>]+>)/g).map(seg => {
      if (seg.startsWith("<")) {
        if (/^<a\b/i.test(seg)) depthA++;
        else if (/^<\/a>/i.test(seg)) depthA = Math.max(0, depthA - 1);
        return seg;
      }
      if (depthA > 0) return seg;   // בתוך קישור קיים — לא נוגעים
      return seg.replace(/(^|[^\w֐-׿/])(\d{2,4})(?![\w֐-׿])/g,
        (m, pre, num) => `${pre}<a href="/number/${num}" class="sod-numlink" data-gem="${num}"><b>${num}</b></a>`);
    }).join("");
    if (out !== html) { setContent(out); setMsg("המספרים בתוכן הפכו לקישורים-לחיצים ✓"); }
    else setMsg("לא נמצאו מספרים חדשים להמרה.");
  };

  // סרגל-הכלים מחולק לקבוצות (g) — עיצוב-טקסט · מבנה · גימטריה/מספרים · הוספות.
  const tools = [
    { l: "B", t: "מודגש", on: () => wrap("<strong>", "</strong>"), bold: true, g: "טקסט" },
    { l: "I", t: "נטוי", on: () => wrap("<em>", "</em>"), italic: true, g: "טקסט" },
    { l: "U", t: "קו תחתון", on: () => wrap("<u>", "</u>"), g: "טקסט" },
    { l: "S̶", t: "קו חוצה", on: () => wrap("<s>", "</s>"), g: "טקסט" },
    { l: "🎨 צבע", t: "צבע-מילה (מודע-תמה)", on: () => setColorOpen(o => !o), g: "טקסט", active: colorOpen },
    { l: "A⁺", t: "טקסט גדול", on: () => wrap('<span style="font-size:1.3em">', "</span>", "טקסט גדול"), g: "טקסט" },
    { l: "A⁻", t: "טקסט קטן", on: () => wrap('<span style="font-size:.82em">', "</span>", "טקסט קטן"), g: "טקסט" },
    { l: "🧹 נקה", t: "הסר עיצוב מהבחירה", on: clearFmt, g: "טקסט" },
    { l: "כותרת", t: "כותרת (H2)", on: () => wrap("\n<h2>", "</h2>\n", "כותרת"), g: "מבנה" },
    { l: "כותרת קטנה", t: "כותרת משנה (H3)", on: () => wrap("\n<h3>", "</h3>\n", "כותרת משנה"), g: "מבנה" },
    { l: "❝ פסוק", t: "ציטוט/פסוק (sod-verse)", on: () => wrap('\n<blockquote class="sod-verse">', "</blockquote>\n", "«פסוק» <b>מילים מרכזיות</b>"), g: "מבנה" },
    { l: "• רשימה", t: "רשימה", on: () => insert("\n<ul>\n  <li>פריט</li>\n  <li>פריט</li>\n</ul>\n"), g: "מבנה" },
    { l: "→ ימין", t: "יישור לימין", on: () => wrap('\n<p style="text-align:right">', "</p>\n", "טקסט"), g: "מבנה" },
    { l: "⊟ מרכוז", t: "פסקה ממורכזת", on: () => wrap('\n<p style="text-align:center">', "</p>\n", "טקסט ממורכז"), g: "מבנה" },
    { l: "← שמאל", t: "יישור לשמאל", on: () => wrap('\n<p style="text-align:left" dir="ltr">', "</p>\n", "text"), g: "מבנה" },
    { l: "— קו", t: "קו מפריד", on: () => insert("\n<hr />\n"), g: "מבנה" },
    { l: "🔢 ריבוע גימטריה", t: "ריבוע גימטריה קנוני", on: () => insert(GEM_BOX), g: "גימטריה" },
    { l: "🔗 גימטריה", t: "בחר ביטוי והפוך אותו ללחיץ (פותח את מגירת המספר) — sod-gemlink", on: () => gemify("sod-gemlink"), g: "גימטריה" },
    { l: "🔢 מספר", t: "בחר ערך/מספר והפוך אותו ללחיץ (פותח את מגירת המספר) — sod-numlink", on: () => gemify("sod-numlink"), g: "גימטריה" },
    { l: "📏 שורה→חלונית", t: "הפוך שורה שלמה ללחיצה שפותחת את חלונית המספר", on: numRow, g: "גימטריה" },
    { l: "✨ מספרים→קישורים", t: "הפוך אוטומטית את כל המספרים בתוכן לקישורים-לחיצים", on: autoLinkNumbers, g: "גימטריה" },
    { l: "🔗 קישור", t: "קישור", on: addLink, g: "הוספה" },
    { l: "🖼 תמונה", t: "תמונה", on: addImage, g: "הוספה" },
    { l: "🔗 ראו גם", t: "בלוק «ראו גם»", on: () => insert(SEE_ALSO), g: "הוספה" },
  ];

  // ── עוזר ה-AI ──
  const runAi = async () => {
    const inst = instruction.trim();
    if (!inst) { setAiErr("כתוב מה ה-AI יעשה (למשל: שפר את הזרימה, הוסף מבוא, כתוב פוסט על…)."); return; }
    setAiBusy(true); setAiErr(""); setAiResult(null);
    const r = await getPostAiEdit({ content, instruction: inst, title, engine });
    setAiBusy(false);
    if (!r?.html) { setAiErr(r?.error === "not_configured" ? `מנוע ${engine} לא מוגדר (חסר מפתח).` : `לא התקבל תוכן מה-AI${r?.error ? ` (${r.error})` : ""}.`); return; }
    setAiResult(r);
  };
  const applyAi = (mode) => {
    if (!aiResult?.html) return;
    setContent(mode === "append" ? `${content}\n${aiResult.html}` : aiResult.html);
    if (!aiTouched) setAiTouched(true);   // AI נגע בתוכן → חותמת מאומת (ai_gematria_verified_stamp_law)
    setAiResult(null); setView("preview");
  };

  // ── העלאת תמונה ראשית מהמכשיר (לא רק URL) ──
  const pickPostImage = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("נא לבחור קובץ תמונה"); return; }
    if (f.size > 8 * 1024 * 1024) { setErr("התמונה גדולה מדי (מקסימום 8MB)"); return; }
    setErr(""); setMsg(""); setUploadingImg(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `posts/${(slug || "post").replace(/[^a-z0-9א-ת_-]/gi, "").slice(0, 40) || "post"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, f, { upsert: false, contentType: f.type });
      if (error) throw error;
      setImageUrl(supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl);
      setMsg("התמונה הראשית הועלתה ✓");
    } catch (e2) { setErr(e2?.message || "שגיאה בהעלאת התמונה"); }
    setUploadingImg(false);
  };

  // ── ניהול קטגוריות/תגיות ──
  const addChip = (kind, val) => {
    const v = (val || "").trim(); if (!v) return;
    if (kind === "cat") setCategories(a => a.includes(v) ? a : [...a, v]);
    else setTags(a => a.includes(v) ? a : [...a, v]);
  };
  const removeChip = (kind, val) => kind === "cat" ? setCategories(a => a.filter(x => x !== val)) : setTags(a => a.filter(x => x !== val));

  // 💡 המלצות קטגוריה (לא נבחר אוטומטית — רק מציע; צוריאל מחליט). מקורות: מפת-מילים + קטגוריות
  // קיימות ששמן מופיע בכותרת/תוכן. מסונן ממה שכבר נבחר.
  const suggestedCats = useMemo(() => {
    const hay = `${title} ${content}`;
    const low = hay.toLowerCase();
    const set = new Set();
    CAT_KW.forEach(({ re, cat }) => { if (re.test(hay) && allCats.includes(cat)) set.add(cat); });
    allCats.forEach(c => { if (c && c.length >= 3 && low.includes(c.toLowerCase())) set.add(c); });
    return [...set].filter(c => !categories.includes(c)).slice(0, 6);
  }, [title, content, allCats, categories]);

  const save = async (asDraft, opts = {}) => {
    const silent = !!opts.silent;   // silent = שמירה-אוטומטית (בלי הודעות/ניווט)
    if (!silent) { setErr(""); setMsg(""); }
    if (!title.trim()) { if (!silent) setErr("כותרת חובה."); return; }
    if (silent) setAutoSaving(true); else setSaving(true);
    // «טיוטה» = תגית-סטטוס: מוסיפים בשמירת-טיוטה, מסירים בפרסום.
    const baseTags = (tags || []).filter(t => t !== "טיוטה");
    const finalTags = asDraft ? [...baseTags, "טיוטה"] : baseTags;
    const cleanAuthors = (authors || []).map(a => String(a || "").trim()).filter(Boolean);
    const payload = {
      id: postId, title: title.trim(), slug: slug.trim() || null, content, excerpt,
      categories, tags: finalTags,
      author: cleanAuthors[0] || null,        // כתב ראשי (תאימות-לאחור)
      authors: cleanAuthors,                  // רשימת כל הכתבים
      image_url: imageUrl.trim() || null,
      source: source || "ai", ai_touched: aiTouched,
      theme,                                  // תמת-הפוסט (auto|light|dark)
      keepModified,                           // «שמור מיקום» — אל תקפיץ לראש
      axisPin,                                // ציר ההתגלות (null|0|1)
      treePriority,                           // מיקום ידני בציר
    };
    try {
      // נתיב-קוד (token): שולחים רק שדות שהם עמודות-DB אמיתיות (theme כן; keepModified/axisPin/treePriority
      //   הם דגלי-עזר של ה-RPC בלבד ואינם עמודות — לא שולחים כדי לא לשבור את פונקציית ה-Edge).
      const { keepModified: _km, axisPin: _ap, treePriority: _tp, ...tokenPayload } = payload;
      const res = hasKey ? await tokenSavePost(editKey, tokenPayload) : await adminSavePost(payload);
      if (silent) setAutoSaving(false); else setSaving(false);
      if (res?.id && !postId) setPostId(res.id);   // אחרי יצירה — נשארים על אותו פוסט
      if (res?.modified) setOrigModified(res.modified);
      setWasDraft(asDraft);
      snapRef.current = snapshot();               // סימון «נשמר» — מנקה את מצב ה-dirty
      reloadDrafts();
      setTimeout(reloadRevisions, 500);           // רענון היסטוריית הגרסאות (הטריגר שמר את המצב הקודם)
      if (silent) { setAutoSavedAt(new Date()); return; }
      const savedSlug = res?.slug || slug;
      setMsg(asDraft ? `נשמר כטיוטה ✓ (id ${res?.id})` : `פורסם ✓ (id ${res?.id})`);
      if (!asDraft && savedSlug) setTimeout(() => nav(`/${savedSlug}`), 700);
    } catch (e) {
      if (silent) { setAutoSaving(false); return; }   // שמירה-אוטומטית נכשלת בשקט
      setSaving(false);
      const m = String(e?.message || e);
      setErr(m.includes("not_admin") ? "אין הרשאת מנהל." : m.includes("empty_title") ? "כותרת חובה." : `שגיאת שמירה: ${m}`);
    }
  };

  // ↩︎ «החזר למקום» — הפוסט קפץ לראש «עדכונים אחרונים» / נכנס לציר ההתגלות בלי שרצית.
  //   מאפס modified לתאריך המקורי (חוזר לסדר הכרונולוגי) + אופציונלית מוציא מהציר.
  const returnToPlace = async (alsoRemoveFromAxis) => {
    if (!postId) { setErr("שמור קודם את הפוסט."); return; }
    setErr(""); setMsg("");
    try {
      const r = await adminResetPostPosition(postId, !!alsoRemoveFromAxis);
      if (r?.modified) setOrigModified(r.modified);
      if (alsoRemoveFromAxis) setAxisPin(0);
      setKeepModified(true);   // מכאן ואילך שמור מיקום כברירת-מחדל לפוסט הזה
      setMsg("↩︎ הפוסט הוחזר למקומו הכרונולוגי" + (alsoRemoveFromAxis ? " והוסר מציר ההתגלות" : "") + " ✓");
      reloadDrafts();
    } catch (e) { setErr(`שגיאה: ${String(e?.message || e)}`); }
  };

  // 🕘 טעינת שדות גרסה לעורך (בלי לשמור עדיין — «שחזר לעורך») + שחזור-DB מלא.
  const loadRevIntoEditor = (r) => {
    setTitle(r.title || ""); setContent(r.content || ""); setExcerpt(r.excerpt || "");
    setCategories(r.categories || []); setTags((r.tags || []).filter(t => t !== "טיוטה"));
    setImageUrl(r.image_url || ""); setTheme(r.theme === "light" || r.theme === "dark" ? r.theme : "auto");
    setAuthors(Array.isArray(r.authors) && r.authors.length ? r.authors : (r.author ? [r.author] : []));
    setPreviewRev(null);
    setMsg("↩︎ הגרסה נטענה לעורך — «פרסם»/«שמור טיוטה» כדי לקבע.");
  };
  // שחזור מלא ב-DB (הפיך — נשמר צילום «לפני שחזור»). אחרי-כן טוענים מחדש את הפוסט לעורך.
  const doRestore = async (r) => {
    if (!postId) { loadRevIntoEditor(r); return; }
    if (!window.confirm(`לשחזר את גרסת ${new Date(r.created_at).toLocaleString("he-IL")}? המצב הנוכחי יישמר כ«לפני שחזור» וניתן יהיה לחזור אליו.`)) return;
    setRevBusy(true); setErr(""); setMsg("");
    try {
      await restorePostRevision(r.id);
      const p = await getPostBySlug(slug || routeSlug);
      if (p) {
        setTitle(p.title || ""); setContent(p.content || ""); setExcerpt(p.excerpt || "");
        setCategories(p.categories || []); setWasDraft((p.tags || []).includes("טיוטה"));
        setTags((p.tags || []).filter(t => t !== "טיוטה")); setImageUrl(p.image_url || "");
        setTheme(p.theme === "light" || p.theme === "dark" ? p.theme : "auto");
        setAuthors(Array.isArray(p.authors) && p.authors.length ? p.authors : (p.author ? [p.author] : []));
        setOrigModified(p.modified || null);
        snapRef.current = snapshot();
      }
      setPreviewRev(null);
      setMsg("✓ הגרסה שוחזרה. המצב הקודם נשמר כ«לפני שחזור» בהיסטוריה.");
      reloadRevisions();
    } catch (e) { setErr(`שגיאת שחזור: ${String(e?.message || e)}`); }
    setRevBusy(false);
  };

  // ⌨️ Ctrl/Cmd+S = שמירה מהירה (במצב הנוכחי: טיוטה נשארת טיוטה, פורסם נשאר פורסם)
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); if (!saving && title.trim()) save(wasDraft); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, wasDraft, title, content, theme, axisPin, treePriority, keepModified]);

  // ✏️ עריכה חיה בתצוגה-המקדימה — מזריקים את ה-HTML פעם אחת בכניסה למצב; ההקלדה מסנכרנת חזרה
  //   ל-content בלי לרנדר-מחדש את הצומת (שומר על הסמן). data-gem/קישורים לא פעילים בזמן עריכה.
  useEffect(() => { if (liveEdit && liveRef.current) liveRef.current.innerHTML = content || ""; /* eslint-disable-next-line */ }, [liveEdit]);

  if (!hasKey && authLoading) return <div dir="rtl" style={{ padding: 40, textAlign: "center", color: C.goldDim, fontFamily: F.body }}>בודק הרשאות…</div>;
  if (!canEdit) {
    return (
      <div dir="rtl" style={{ maxWidth: 640, margin: "60px auto", padding: 24, textAlign: "center", fontFamily: F.body, color: C.goldDim }}>
        <h2 style={{ color: C.goldBright, fontFamily: F.heading }}>✍️ עורך הפוסטים</h2>
        {!verified ? (
          <>
            <p>אינך מחובר. התחבר עם חשבון המנהל (yosiviner7@gmail.com) כדי לפתוח את העורך.</p>
            <Link to="/login" style={{ display: "inline-block", marginTop: 8, background: C.gold, color: "#1a0e00", padding: "10px 24px", borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontWeight: 800 }}>התחברות ←</Link>
          </>
        ) : (
          <>
            <p>החשבון המחובר אינו מנהל.</p>
            <div style={{ margin: "12px auto", maxWidth: 420, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", textAlign: "start", fontSize: 13, color: "#ede4d3" }}>
              <div>מחובר כ: <b dir="ltr">{user?.email || "—"}</b></div>
              <div>role: <b>{profile?.role || "ללא (הפרופיל לא נטען)"}</b></div>
            </div>
            <p style={{ fontSize: 12.5 }}>אם זה לא <b dir="ltr">yosiviner7@gmail.com</b> — התנתק והתחבר עם חשבון המנהל.</p>
            <Link to="/login" style={{ display: "inline-block", marginTop: 8, background: C.gold, color: "#1a0e00", padding: "9px 22px", borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontWeight: 800 }}>למסך ההתחברות ←</Link>
          </>
        )}
        <div style={{ marginTop: 14 }}><Link to="/" style={{ color: C.gold }}>← לדף הבית</Link></div>
      </div>
    );
  }
  if (loading) return <div dir="rtl" style={{ padding: 40, textAlign: "center", color: C.goldDim, fontFamily: F.body }}>טוען…</div>;

  const eng = { gemini: { name: "Gemini", c: "#8a63f4", note: "AI בטוקנים (החשבון שלך)" }, claude: { name: "Claude", c: "#3ea6ff", note: "חשבון האתר" } };

  // 🌗 ממשק-העורך מודע-תמה (יום/לילה) — הכפתור בכותרת מחליף את מתג-האתר, וה-chrome + התצוגה
  //   מתחלפים יחד. T = טוקני-chrome נגזרים מהפלטה הפעילה (P), עם אותם מפתחות כמו C (לדריסה נקייה).
  const dk = P.mode !== "light";   // dk=כהה
  const T = {
    surface: dk ? C.surface : P.card,
    bg: dk ? C.bg : P.cardSoft,
    bgGlow: dk ? C.bgGlow : "#efe8d6",
    border: dk ? C.border : P.border,
    borderGold: dk ? C.borderGold : P.borderStrong,
    gold: dk ? C.gold : P.accent,
    goldBright: dk ? C.goldBright : P.accentText,
    goldLight: dk ? C.goldLight : P.ink,
    goldDim: dk ? C.goldDim : P.accentDim,
    ink: dk ? "#ede4d3" : P.ink,
    pageBg: dk ? "transparent" : P.pageBg,
    prevBg: dk ? "rgba(5,4,0,.4)" : "#f6f1e6",
  };
  const wordCount = (content || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={`pe${fullscreen ? " pe-fs" : ""}`} dir="rtl">
      <style>{POST_CONTENT_CSS}</style>
      <style>{`
        /* 🖥 רחב יותר בדסקטופ (בקשת צוריאל) + מסך-מלא */
        .pe { max-width: 1480px; margin: 0 auto; padding: 20px 16px 60px; font-family: ${F.body}; color:${T.ink}; }
        .pe-fs { position:fixed; inset:0; z-index:6000; max-width:none; margin:0; overflow-y:auto; background:${dk ? "#0b0803" : P.pageBg}; padding:16px 22px 60px; }
        .pe-title-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
        .pe-title-row h1 { color:${T.goldBright}; font-family:${F.heading}; font-size:22px; font-weight:800; margin:0; }
        .pe-badge { font-size:11px; letter-spacing:1px; color:${T.goldDim}; border:1px solid ${T.border}; border-radius:999px; padding:2px 10px; }
        .pe-grid { display:grid; grid-template-columns: 1.55fr 1fr; gap:18px; align-items:start; }
        .pe-fs .pe-grid { grid-template-columns: 1.8fr 1fr; }
        @media(max-width:960px){ .pe-grid{ grid-template-columns:1fr; } }
        .pe-card { background:${dk ? `linear-gradient(160deg, ${T.surface} 0%, ${T.bg} 100%)` : T.surface}; border:1px solid ${T.borderGold}; border-radius:12px; padding:16px; }
        .pe-lbl { display:block; color:${T.goldDim}; font-family:${F.heading}; font-size:10.5px; letter-spacing:2px; text-transform:uppercase; margin:14px 0 5px; }
        .pe-in { width:100%; box-sizing:border-box; background:${T.bg}; border:1px solid ${T.border}; border-radius:6px; color:${T.ink}; font-family:${F.body}; font-size:14px; padding:10px 12px; }
        .pe-in:focus{ outline:none; border-color:${T.gold}; }
        .pe-toolbar { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 8px; padding:8px; border:1px solid ${T.border}; border-radius:8px; background:${dk ? "rgba(8,5,2,.5)" : "#efe8d6"}; align-items:center; }
        .pe-grp { display:inline-block; width:1px; height:22px; background:${T.border}; margin:0 3px; }
        .pe-viewtabs { display:flex; gap:4px; }
        /* מצב מפוצל — עריכה (ימין) + תצוגה חיה (שמאל); בנייד מוערמים */
        .pe-split { display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:start; }
        .pe-split .pe-prev { margin:0; max-height:64vh; overflow-y:auto; }
        .pe-fs .pe-split .pe-prev, .pe-fs .pe-content { max-height:76vh; }
        @media (max-width:820px){ .pe-split { grid-template-columns:1fr; } }
        .pe-tool { cursor:pointer; background:${T.bgGlow}; border:1px solid ${T.border}; color:${T.goldLight}; font-family:${F.heading}; font-size:12px; padding:6px 10px; border-radius:6px; }
        .pe-tool:hover { border-color:${T.gold}; color:${T.goldBright}; }
        .pe-tool.on { background:${T.gold}; color:${dk ? "#1a0e00" : "#fff"}; font-weight:800; }
        .pe-content { width:100%; box-sizing:border-box; background:${T.bg}; border:1px solid ${T.border}; border-radius:8px; color:${T.ink}; font-family:${F.mono}; font-size:13.5px; line-height:1.7; padding:12px 14px; direction:ltr; text-align:right; resize:vertical; min-height:360px; outline:none; }
        .pe-fs .pe-content { min-height:70vh; }
        .pe-content:focus{ border-color:${T.gold}; }
        .pe-prev { border:1px dashed ${T.borderGold}; border-radius:8px; padding:18px 16px; min-height:360px; max-height:72vh; overflow-y:auto; }
        .pe-prev[contenteditable="true"] { outline:2px solid ${T.gold}; cursor:text; }
        .pe-swatches { display:flex; flex-wrap:wrap; gap:6px; width:100%; margin-top:4px; padding:8px; border:1px dashed ${T.borderGold}; border-radius:8px; background:${T.bg}; }
        .pe-sw { width:30px; height:30px; border-radius:7px; border:2px solid ${T.border}; cursor:pointer; padding:0; }
        .pe-sw:hover { border-color:${T.gold}; transform:scale(1.08); }
        .pe-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
        .pe-chip { display:inline-flex; align-items:center; gap:6px; background:${T.bgGlow}; border:1px solid ${T.border}; border-radius:999px; color:${T.goldLight}; font-size:12px; padding:3px 10px; }
        .pe-chip button { background:none; border:none; color:${T.goldDim}; cursor:pointer; font-size:14px; line-height:1; padding:0; }
        .pe-picker { position:relative; }
        .pe-row { display:flex; gap:6px; margin-top:6px; }
        .pe-addbtn { flex-shrink:0; min-width:52px; background:${T.gold}; color:${dk ? "#1a1206" : "#fff"}; border:none; border-radius:6px; font-family:${F.heading}; font-weight:700; font-size:13px; cursor:pointer; padding:0 14px; min-height:42px; }
        .pe-addbtn:disabled { opacity:.4; cursor:default; }
        .pe-menu { position:absolute; z-index:20; top:100%; inset-inline:0; margin-top:4px; max-height:240px; overflow-y:auto; background:${T.bg}; border:1px solid ${T.gold}; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,.45); -webkit-overflow-scrolling:touch; }
        .pe-opt { display:block; width:100%; text-align:right; background:none; border:none; border-bottom:1px solid ${T.border}; color:${T.ink}; font-family:${F.body}; font-size:14px; padding:11px 14px; cursor:pointer; min-height:44px; }
        .pe-opt:hover, .pe-opt:focus { background:${T.bgGlow}; color:${T.goldLight}; outline:none; }
        .pe-opt.new { color:${T.gold}; font-weight:700; }
        .pe-toggle { background:none; border:1px solid ${T.border}; border-radius:6px; color:${T.goldDim}; font-size:12px; cursor:pointer; padding:6px 12px; margin-top:6px; min-height:36px; }
        .pe-btn { cursor:pointer; border:none; border-radius:8px; font-family:${F.heading}; font-weight:800; letter-spacing:.5px; padding:11px 22px; }
        .pe-save { background:linear-gradient(135deg, ${T.gold}, ${T.goldLight}); color:${dk ? "#1a0e00" : "#3a2a00"}; font-size:14px; }
        .pe-save:disabled { opacity:.6; }
        .pe-ghost { background:none; border:1px solid ${T.borderGold}; color:${T.goldDim}; }
        /* מקטע-שליטה (segmented) — יום/לילה, ציר, מיקום */
        .pe-seg { display:flex; gap:0; border:1px solid ${T.border}; border-radius:8px; overflow:hidden; margin-top:6px; }
        .pe-seg button { flex:1; cursor:pointer; background:${T.bg}; border:none; border-inline-start:1px solid ${T.border}; color:${T.goldLight}; font-family:${F.heading}; font-size:12px; font-weight:700; padding:9px 6px; min-height:40px; }
        .pe-seg button:first-child { border-inline-start:none; }
        .pe-seg button.on { background:${T.gold}; color:${dk ? "#1a0e00" : "#fff"}; }
        .pe-ctl { border:1px solid ${T.borderGold}; border-radius:10px; padding:12px; margin-top:12px; background:${T.bg}; }
        .pe-ctl h4 { margin:0 0 2px; color:${T.goldBright}; font-family:${F.heading}; font-size:13px; }
        .pe-ctl .hint { color:${T.goldDim}; font-size:11px; line-height:1.55; margin:2px 0 0; }
        .pe-check { display:flex; align-items:flex-start; gap:8px; margin-top:10px; color:${T.goldLight}; font-size:13px; cursor:pointer; }
        .pe-ai { border:1px solid ${T.borderGold}; border-top:3px solid #8a63f4; border-radius:12px; padding:14px; background:${dk ? "rgba(20,12,32,.5)" : "#f3eefb"}; }
        .pe-ai h3 { margin:0 0 4px; color:${dk ? "#c9b6ff" : "#6a3fd0"}; font-family:${F.heading}; font-size:14px; }
        .pe-eng { display:flex; gap:8px; margin:8px 0; }
        .pe-eng button { flex:1; cursor:pointer; border-radius:8px; padding:8px; font-family:${F.heading}; font-size:12.5px; font-weight:700; background:${T.bg}; border:1px solid ${T.border}; color:${T.goldLight}; }
        .pe-preset { cursor:pointer; background:${T.bgGlow}; border:1px solid ${T.border}; color:${T.goldLight}; font-size:11.5px; padding:5px 9px; border-radius:999px; margin:0 4px 6px 0; }
        .pe-err { color:${dk ? "#e79aa2" : "#b3261e"}; font-size:12.5px; margin:8px 0 0; font-family:${F.heading}; }
        .pe-ok { color:${dk ? "#8fd6a0" : "#1a7a44"}; font-size:12.5px; margin:8px 0 0; font-family:${F.heading}; }
        .pe-actions { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; align-items:center; }
      `}</style>

      <div className="pe-title-row">
        <h1>✍️ {isEdit ? "עריכת פוסט" : "פוסט חדש"}</h1>
        <span className="pe-badge" style={wasDraft ? { color: "#e8c15a", borderColor: "#e8c15a" } : { color: "#8fd6a0", borderColor: "#8fd6a0" }}>
          {wasDraft ? "● טיוטה" : "● מפורסם"}
        </span>
        {postId != null && <span className="pe-badge">id {postId}</span>}
        <span className="pe-badge" title="ספירת מילים">📝 {wordCount} מילים</span>
        <span style={{ flex: 1 }} />
        {/* 🌗 יום/לילה לממשק העורך + לתצוגה המקדימה (מחליף את מתג-האתר) */}
        <button type="button" className="pe-badge" style={{ cursor: "pointer", background: "none" }} onClick={toggleTheme} title="החלף יום/לילה בממשק ובתצוגה">{dk ? "☀️ מצב יום" : "🌙 מצב לילה"}</button>
        <button type="button" className="pe-badge" style={{ cursor: "pointer", background: "none" }} onClick={() => setFullscreen(f => !f)} title="מסך מלא">{fullscreen ? "⤢ צא ממסך-מלא" : "⤢ מסך מלא"}</button>
        {isEdit && slug && <a href={`/${slug}`} target="_blank" rel="noreferrer" className="pe-badge" style={{ textDecoration: "none" }} title="פתח את הפוסט באתר">↗ באתר</a>}
        <a href={`/editor${editKey ? `?key=${encodeURIComponent(editKey)}` : ""}`} className="pe-badge" style={{ textDecoration: "none" }}>+ פוסט חדש</a>
        <Link to="/post" className="pe-badge" style={{ textDecoration: "none" }}>← לכל הפוסטים</Link>
      </div>

      {/* 📝 רשימת הטיוטות — פתיחה מהירה לעריכה */}
      {drafts.length > 0 && (
        <details open={!isEdit} style={{ marginBottom: 14, background: T.bg, border: `1px solid ${T.borderGold}`, borderRadius: 12, padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer", color: T.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>📝 טיוטות ({drafts.length})</summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {drafts.map(d => (
              <a key={d.id} href={`/editor/${encodeURIComponent(d.slug)}${editKey ? `?key=${encodeURIComponent(editKey)}` : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${d.slug === routeSlug ? T.gold : T.border}`, borderRadius: 10, padding: "7px 11px", textDecoration: "none", color: T.ink, fontSize: 12.5, maxWidth: 260 }}>
                {d.image_url && <img src={thumb(d.image_url, 80)} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover", flex: "0 0 30px" }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title || d.slug}</span>
              </a>
            ))}
          </div>
        </details>
      )}

      <div className="pe-grid">
        {/* ── עמודה ראשית: תוכן + AI ── */}
        <div>
          <div className="pe-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <label className="pe-lbl" style={{ margin: 0 }}>תוכן הפוסט (HTML)</label>
              {/* מצב-תצוגה: עריכה · מפוצל · תצוגה · ✏️ עריכה-חיה (WYSIWYG בתצוגה) */}
              <div className="pe-viewtabs">
                {[["edit", "✎ קוד"], ["split", "⚌ מפוצל"], ["preview", "👁 תצוגה"], ["live", "✏️ עריכה-חיה"]].map(([v, l]) => (
                  <button key={v} type="button" className={`pe-tool${view === v ? " on" : ""}`}
                    onClick={() => { setView(v); setLiveEdit(v === "live"); }}>{l}</button>
                ))}
              </div>
            </div>
            {/* סרגל-הכלים — פעיל בעריכת-קוד/מפוצל (יש textarea); מוסתר בתצוגה/עריכה-חיה */}
            {(view === "edit" || view === "split") && (
              <>
                <div className="pe-toolbar">
                  {tools.map((t, i) => (
                    <React.Fragment key={t.l}>
                      {i > 0 && tools[i - 1].g !== t.g && <span className="pe-grp" />}
                      <button type="button" title={t.t} onClick={t.on} className={`pe-tool${t.active ? " on" : ""}`}
                        style={{ fontWeight: t.bold ? 800 : undefined, fontStyle: t.italic ? "italic" : undefined }}>{t.l}</button>
                    </React.Fragment>
                  ))}
                </div>
                {/* 🎨 בורר-צבעים — נפתח מכפתור «צבע». בחר טקסט ואז לחץ על גוון (נשמר כקלאס מודע-תמה). */}
                {colorOpen && (
                  <div className="pe-swatches">
                    <span style={{ color: T.goldDim, fontSize: 11, alignSelf: "center" }}>בחר טקסט → לחץ גוון:</span>
                    {WORD_COLORS.map(c => (
                      <button key={c.k} type="button" className="pe-sw" title={c.l} onClick={() => colorWord(c.k)} style={{ background: c.swatch }} />
                    ))}
                  </div>
                )}
              </>
            )}
            <div className={view === "split" ? "pe-split" : undefined}>
              {(view === "edit" || view === "split") && (
                <textarea ref={taRef} value={content} onChange={e => setContent(e.target.value)} rows={view === "split" ? 16 : 20} className="pe-content" spellCheck={false} />
              )}
              {view === "preview" && (
                <div className="pe-prev" data-theme={P.mode} style={{ background: T.prevBg }}>
                  <div className="sod-post-content clean" dangerouslySetInnerHTML={{ __html: content || "<p>(אין תוכן)</p>" }} />
                </div>
              )}
              {view === "live" && (
                /* ✏️ עריכה-חיה: התצוגה עצמה ניתנת לעריכה (contentEditable). ההקלדה מסנכרנת ל-content.
                   ה-HTML מוזרק פעם אחת (useEffect על liveEdit) כדי לא לאבד את הסמן בכל תו. */
                <div className="pe-prev" data-theme={P.mode} style={{ background: T.prevBg }}>
                  <div ref={liveRef} className="sod-post-content clean" contentEditable suppressContentEditableWarning
                    onInput={() => setContent(liveRef.current?.innerHTML || "")} />
                </div>
              )}
            </div>
            {view === "live" && <p style={{ color: T.goldDim, fontSize: 11.5, margin: "6px 2px 0" }}>✏️ עריכה חיה: הקלד ישירות בטקסט. לעיצוב מדויק (קלאסים/גימטריה) — עבור ל«קוד».</p>}
          </div>

          {/* עוזר ה-AI */}
          <div className="pe-ai" style={{ marginTop: 16 }}>
            <h3>🤖 עוזר ה-AI — {isEdit || content ? "עריכת התוכן" : "כתיבת פוסט"}</h3>
            <div style={{ color: T.goldDim, fontSize: 12 }}>ה-AI עורך את התוכן לפי ההוראה, בקלאסים הקנוניים של האתר. עובדה נשמרת, פרשנות נפרדת.</div>
            <div className="pe-eng">
              {["gemini", "claude"].map(k => (
                <button key={k} type="button" onClick={() => setEngine(k)}
                  style={engine === k ? { borderColor: eng[k].c, color: "#fff", background: `${eng[k].c}22`, boxShadow: `inset 0 0 0 1px ${eng[k].c}` } : undefined}>
                  {eng[k].name} · <span style={{ opacity: .8, fontWeight: 400 }}>{eng[k].note}</span>
                </button>
              ))}
            </div>
            <div style={{ margin: "6px 0" }}>
              {AI_PRESETS.map(p => <button key={p.l} type="button" className="pe-preset" onClick={() => setInstruction(p.v)}>{p.l}</button>)}
            </div>
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={3} className="pe-in" style={{ fontFamily: F.body, resize: "vertical" }}
              placeholder={content ? "מה לעשות לתוכן? (למשל: שפר את הזרימה, הוסף מבוא, הוסף ריבוע גימטריה למה פעל אל = 256)" : "על מה לכתוב? (למשל: כתוב פוסט על הקשר בין 1820 לשם ה' בתורה)"} />
            <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
              <button type="button" className="pe-btn" onClick={runAi} disabled={aiBusy}
                style={{ background: `linear-gradient(135deg, ${eng[engine].c}, #b79bff)`, color: "#0a0614" }}>
                {aiBusy ? "חושב…" : `🤖 הרץ ${eng[engine].name}`}
              </button>
              {aiResult && <span style={{ color: C.goldDim, fontSize: 11.5 }}>התקבל מ-{aiResult.engine}/{aiResult.model}</span>}
            </div>
            {aiErr && <p className="pe-err">{aiErr}</p>}
            {aiResult?.html && (
              <div style={{ marginTop: 12 }}>
                <div className="pe-prev" data-theme={P.mode} style={{ background: T.prevBg, maxHeight: "40vh" }}>
                  <div className="sod-post-content clean" dangerouslySetInnerHTML={{ __html: aiResult.html }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <button type="button" className="pe-btn pe-save" onClick={() => applyAi("replace")}>✓ החלף את התוכן</button>
                  <button type="button" className="pe-btn pe-ghost" onClick={() => applyAi("append")}>➕ הוסף בסוף</button>
                  <button type="button" className="pe-btn pe-ghost" onClick={() => setAiResult(null)}>ביטול</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── עמודה צדדית: מטא-דאטה ── */}
        <div className="pe-card">
          <label className="pe-lbl">כותרת</label>
          <input className="pe-in" value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת הפוסט" />

          <label className="pe-lbl">Slug (כתובת)</label>
          <input className="pe-in" value={slug} onChange={e => { slugTouched.current = true; setSlug(e.target.value); }} placeholder="slug-לכתובת" style={{ direction: "ltr", textAlign: "right" }} />
          <div style={{ color: C.goldDim, fontSize: 11, marginTop: 3 }}>/{slug || "…"}</div>

          <label className="pe-lbl">תקציר</label>
          <textarea className="pe-in" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} style={{ resize: "vertical" }} placeholder="תקציר קצר לתצוגות" />

          <label className="pe-lbl">כתבים ({authors.length || "המערכת"}) — אפשר כמה</label>
          <ChipField
            selected={authors} options={allAuthors}
            onAdd={v => setAuthors(a => a.includes(v) ? a : [...a, v])}
            onRemove={v => setAuthors(a => a.filter(x => x !== v))}
            placeholder="חפש או הוסף כתב…" addLabel="הוסף"
          />
          <div style={{ color: C.goldDim, fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>
            {authors.length === 0 ? "ריק = הפוסט יוצג בשם «המערכת»." : (
              <>👑 <b style={{ color: C.goldLight }}>ראשי:</b> {authors[0]}{authors.length > 1 && <> · ✍️ <b style={{ color: C.goldLight }}>בהשתתפות:</b> {authors.slice(1).join(" · ")}</>}</>
            )}
          </div>

          <label className="pe-lbl" style={{ marginTop: 16 }}>תמונה ראשית</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="pe-in" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://… או העלה →" style={{ direction: "ltr", textAlign: "right" }} />
            <label className="pe-addbtn" style={{ display: "inline-flex", alignItems: "center", cursor: uploadingImg ? "wait" : "pointer" }}>
              {uploadingImg ? "…" : "📷 העלה"}
              <input type="file" accept="image/*" onChange={pickPostImage} disabled={uploadingImg} style={{ display: "none" }} />
            </label>
          </div>
          {imageUrl && <img src={thumb(imageUrl, 240)} alt="" style={{ marginTop: 8, maxWidth: "100%", borderRadius: 8, border: `1px solid ${T.border}` }} onError={e => { e.currentTarget.style.display = "none"; }} />}

          <label className="pe-lbl">קטגוריות</label>
          {suggestedCats.length > 0 && (
            <div style={{ margin: "0 0 6px" }}>
              <span style={{ color: T.goldDim, fontSize: 11 }}>💡 מוצע (המלצה — לחץ להוספה, לא נבחר אוטומטית):</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                {suggestedCats.map(c => (
                  <button key={c} type="button" onClick={() => addChip("cat", c)}
                    style={{ background: dk ? "rgba(199,154,46,.12)" : "rgba(154,120,24,.10)", border: `1px dashed ${T.gold}`, color: T.goldLight, borderRadius: 999, fontSize: 12.5, padding: "5px 12px", cursor: "pointer", minHeight: 34 }}>
                    ＋ {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChipField
            selected={categories} options={allCats}
            onAdd={v => addChip("cat", v)} onRemove={v => removeChip("cat", v)}
            placeholder="חפש או הוסף קטגוריה…"
          />

          <label className="pe-lbl" style={{ marginTop: 16 }}>תגיות</label>
          <ChipField
            selected={tags} options={allTags}
            onAdd={v => addChip("tag", v)} onRemove={v => removeChip("tag", v)}
            placeholder="חפש או הוסף תגית…"
          />

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, color: T.goldLight, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={aiTouched} onChange={e => setAiTouched(e.target.checked)} />
            חותמת «🔵 AI · מאומת» (ai_touched)
          </label>

          {/* 🌗 תמת-הפוסט — יום/לילה/אוטומטי, פר-פוסט (עצמאי ממתג-האתר) */}
          <div className="pe-ctl">
            <h4>🌗 מצב יום/לילה של הפוסט</h4>
            <div className="pe-seg">
              {[["auto", "🔄 אוטומטי"], ["light", "☀️ יום"], ["dark", "🌙 לילה"]].map(([v, l]) => (
                <button key={v} type="button" className={theme === v ? "on" : ""} onClick={() => setTheme(v)}>{l}</button>
              ))}
            </div>
            <p className="hint">«אוטומטי» = מתחלף עם מתג-האתר. «יום»/«לילה» = הפוסט תמיד באותו מצב, גם אם המבקר בחר אחרת.</p>
          </div>

          {/* 🌅 ציר ההתגלות — הכנס/הוצא + מיקום */}
          <div className="pe-ctl">
            <h4>🌅 ציר ההתגלות</h4>
            <div className="pe-seg">
              {[[null, "🔄 אוטומטי"], [1, "📍 הצג"], [0, "🚫 הסתר"]].map(([v, l]) => (
                <button key={String(v)} type="button" className={axisPin === v ? "on" : ""} onClick={() => setAxisPin(v)}>{l}</button>
              ))}
            </div>
            <p className="hint">«אוטומטי» = לפי הכלל (חותמת-AI / «רמזים חזקים»). «הצג»/«הסתר» = כפייה ידנית של הפוסט בציר.</p>
            <label className="pe-lbl" style={{ marginTop: 10 }}>מיקום בציר (גבוה=למעלה)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="range" min={-5} max={20} step={1} value={treePriority ?? 0}
                onChange={e => setTreePriority(Number(e.target.value))} style={{ flex: 1 }} />
              <span className="pe-badge" style={{ minWidth: 46, textAlign: "center" }}>{treePriority ?? "אוטו"}</span>
              {treePriority != null && <button type="button" className="pe-toggle" style={{ margin: 0 }} onClick={() => setTreePriority(null)}>איפוס</button>}
            </div>
          </div>

          {/* 🔒 שמור מיקום — אל תקפיץ לראש «עדכונים אחרונים» */}
          <div className="pe-ctl">
            <h4>🔒 שמירת מיקום בעדכונים</h4>
            <label className="pe-check">
              <input type="checkbox" checked={keepModified} onChange={e => setKeepModified(e.target.checked)} />
              <span>אל תקפיץ את הפוסט לראש «עדכונים אחרונים» בשמירה זו (שומר על תאריך-העדכון הקיים).</span>
            </label>
            {isEdit && postId && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" className="pe-toggle" style={{ margin: 0 }} onClick={() => returnToPlace(false)}>↩︎ החזר למקום הכרונולוגי</button>
                <button type="button" className="pe-toggle" style={{ margin: 0 }} onClick={() => returnToPlace(true)}>↩︎ החזר + הוצא מהציר</button>
              </div>
            )}
            <p className="hint">קפץ פוסט לראש בטעות, או נכנס לציר ההתגלות שלא לצורך? «החזר למקום» מחזיר אותו לסדר הכרונולוגי המקורי.</p>
          </div>

          {/* 🕘 היסטוריית גרסאות — צילום נשמר אוטומטית בכל עריכה מהותית */}
          {isEdit && postId && !hasKey && (
            <div className="pe-ctl">
              <button type="button" onClick={() => setRevsOpen(o => !o)}
                style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0, color: T.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>
                <span>🕘 היסטוריית גרסאות {revisions.length > 0 && <span style={{ color: T.goldDim, fontWeight: 400 }}>({revisions.length})</span>}</span>
                <span>{revsOpen ? "▲" : "▼"}</span>
              </button>
              {revsOpen && (
                <div style={{ marginTop: 10 }}>
                  {revisions.length === 0 ? (
                    <p className="hint">אין עדיין גרסאות שמורות. גרסה נשמרת אוטומטית בעריכה הבאה (צילום המצב הקודם).</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                      {revisions.map(r => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 9px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.goldLight, fontSize: 12, fontWeight: 700 }}>{new Date(r.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                            <div style={{ color: T.goldDim, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.note === "לפני שחזור" ? "↩︎ לפני שחזור" : "✎ עריכה"} · {(r.title || "").slice(0, 30) || "—"}
                            </div>
                          </div>
                          <button type="button" className="pe-toggle" style={{ margin: 0, minHeight: 30, padding: "4px 9px" }} onClick={() => setPreviewRev(r)}>👁</button>
                          <button type="button" className="pe-toggle" style={{ margin: 0, minHeight: 30, padding: "4px 9px", borderColor: T.gold, color: T.goldBright }} disabled={revBusy} onClick={() => doRestore(r)}>↩︎ שחזר</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="hint" style={{ marginTop: 8 }}>נשמרות עד 50 גרסאות אחרונות. שחזור הפיך — המצב הנוכחי נשמר כ«לפני שחזור».</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🕘 חלון תצוגה מקדימה של גרסה שמורה */}
      {previewRev && (
        <div onClick={() => setPreviewRev(null)} style={{ position: "fixed", inset: 0, zIndex: 7000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: dk ? "#0f0b05" : P.pageBg, border: `1px solid ${T.borderGold}`, borderRadius: 14, maxWidth: 820, width: "100%", maxHeight: "88vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ color: T.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800 }}>{previewRev.title || "(ללא כותרת)"}</div>
                <div style={{ color: T.goldDim, fontSize: 12 }}>🕘 גרסה מ-{new Date(previewRev.created_at).toLocaleString("he-IL")} · {previewRev.note === "לפני שחזור" ? "לפני שחזור" : "עריכה"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="pe-btn pe-save" style={{ padding: "8px 16px" }} disabled={revBusy} onClick={() => doRestore(previewRev)}>↩︎ שחזר גרסה זו</button>
                <button type="button" className="pe-btn pe-ghost" style={{ padding: "8px 16px" }} onClick={() => loadRevIntoEditor(previewRev)}>טען לעורך</button>
                <button type="button" className="pe-btn pe-ghost" style={{ padding: "8px 16px" }} onClick={() => setPreviewRev(null)}>✕ סגור</button>
              </div>
            </div>
            {previewRev.image_url && <img src={thumb(previewRev.image_url, 400)} alt="" style={{ maxWidth: 260, borderRadius: 8, marginBottom: 12 }} />}
            <div className="pe-prev" data-theme={P.mode} style={{ background: T.prevBg }}>
              <div className="sod-post-content clean" dangerouslySetInnerHTML={{ __html: previewRev.content || "<p>(אין תוכן)</p>" }} />
            </div>
          </div>
        </div>
      )}

      {err && <p className="pe-err">{err}</p>}
      {msg && <p className="pe-ok">{msg}</p>}
      {/* מצב שמירה-אוטומטית / שינויים לא-שמורים */}
      <div style={{ color: T.goldDim, fontSize: 11.5, margin: "6px 0", fontFamily: F.body, minHeight: 16 }}>
        {autoSaving ? "💾 שומר אוטומטית…"
          : !postId ? (dirty ? "● יש שינויים — «שמור טיוטה» יפעיל שמירה אוטומטית" : "")
          : dirty ? "● שינויים לא שמורים — יישמרו אוטומטית תוך כמה שניות"
          : autoSavedAt ? `✓ נשמר אוטומטית ב-${autoSavedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
          : "✓ הכל שמור"}
      </div>
      <div className="pe-actions">
        <button type="button" className="pe-btn pe-ghost" onClick={() => save(true)} disabled={saving} style={{ borderColor: "#e8c15a", color: "#e8c15a" }}>{saving ? "שומר…" : "💾 שמור טיוטה"}</button>
        <button type="button" className="pe-btn pe-save" onClick={() => save(false)} disabled={saving}>{saving ? "שומר…" : "🚀 פרסם"}</button>
        <button type="button" className="pe-btn pe-ghost" onClick={() => nav(-1)} disabled={saving}>חזרה</button>
      </div>
      {keepModified && <p style={{ color: T.goldDim, fontSize: 11.5, marginTop: 4, fontFamily: F.body }}>🔒 «שמור מיקום» פעיל — השמירה לא תקפיץ את הפוסט לראש העדכונים.</p>}
      <p style={{ color: T.goldDim, fontSize: 11.5, marginTop: 8, fontFamily: F.body }}>«שמור טיוטה» = נשמר ולא מופיע באתר (רק כאן ברשימת הטיוטות). «פרסם» = עולה לאתר ולזרם העדכונים. שמירה מהירה: Ctrl/⌘+S.</p>
    </div>
  );
}
