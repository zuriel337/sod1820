import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { C, F, POST_CONTENT_CSS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getPostBySlug, adminSavePost, tokenSavePost, getPostAiEdit, getPostCategoriesTags, getDraftPosts, getContributorsList } from "../lib/supabase.js";

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

const AI_PRESETS = [
  { l: "שיפור ניסוח וזרימה", v: "שפר את הניסוח והזרימה של הפוסט, שמור על כל העובדות והערכים, בלי לשנות את המשמעות. חלק לפסקאות קריאות." },
  { l: "הוסף מבוא מושך", v: "הוסף פסקת מבוא קצרה ומושכת בראש הפוסט, שמזמינה לקריאה, בקול האתר (עובדה לפני פרשנות)." },
  { l: "עצב לפורמט האתר", v: "עצב את התוכן לפורמט הקנוני של האתר: פסקאות ב-<p>, כותרות-משנה ב-<h2>/<h3>, פסוקים ב-blockquote class=sod-verse, ריבוע גימטריה רק אם יש שוויון אמיתי." },
  { l: "הוסף «ראו גם»", v: "הוסף בסוף בלוק «ראו גם» עם 2-3 קישורים רלוונטיים לפי הנושא (השאר placeholder אם אינך יודע את ה-slug המדויק)." },
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
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [aiTouched, setAiTouched] = useState(false);
  const [source, setSource] = useState("ai");
  const slugTouched = useRef(false);

  const [allCats, setAllCats] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [catInput, setCatInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [drafts, setDrafts] = useState([]);       // רשימת הטיוטות
  const [contribs, setContribs] = useState([]);   // כותבים לבורר «קשר לכתב»
  const [wasDraft, setWasDraft] = useState(!isEdit); // האם הפוסט הנטען כרגע טיוטה (חדש = טיוטה כברירת-מחדל)

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
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
  useEffect(() => { reloadDrafts(); getContributorsList().then(setContribs).catch(() => {}); }, [reloadDrafts]);

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
      setAuthor(p.author || "");
      setImageUrl(p.image_url || "");
      setCategories(p.categories || []);
      setWasDraft((p.tags || []).includes("טיוטה"));
      setTags((p.tags || []).filter(t => t !== "טיוטה"));   // «טיוטה» מנוהל ע"י כפתורי שמור-טיוטה/פרסם, לא כצ'יפ
      setAiTouched(!!p.ai_touched);
      setSource(p.source || "ai");
      slugTouched.current = true;
      setLoading(false);
    }).catch(() => { if (alive) { setErr("שגיאה בטעינת הפוסט"); setLoading(false); } });
    return () => { alive = false; };
  }, [routeSlug, isEdit]);

  // slug נגזר מהכותרת עד שנוגעים בו ידנית (ובפוסט חדש בלבד)
  useEffect(() => { if (!isEdit && !slugTouched.current) setSlug(slugify(title)); }, [title, isEdit]);

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

  const tools = [
    { l: "B", t: "מודגש", on: () => wrap("<strong>", "</strong>"), bold: true },
    { l: "I", t: "נטוי", on: () => wrap("<em>", "</em>"), italic: true },
    { l: "כותרת", t: "כותרת (H2)", on: () => wrap("\n<h2>", "</h2>\n", "כותרת") },
    { l: "כותרת קטנה", t: "כותרת משנה (H3)", on: () => wrap("\n<h3>", "</h3>\n", "כותרת משנה") },
    { l: "❝ פסוק", t: "ציטוט/פסוק (sod-verse)", on: () => wrap('\n<blockquote class="sod-verse">', "</blockquote>\n", "«פסוק» <b>מילים מרכזיות</b>") },
    { l: "🔢 ריבוע גימטריה", t: "ריבוע גימטריה קנוני", on: () => insert(GEM_BOX) },
    { l: "• רשימה", t: "רשימה", on: () => insert("\n<ul>\n  <li>פריט</li>\n  <li>פריט</li>\n</ul>\n") },
    { l: "🔗 קישור", t: "קישור", on: addLink },
    { l: "🖼 תמונה", t: "תמונה", on: addImage },
    { l: "⊟ מרכוז", t: "פסקה ממורכזת", on: () => wrap('\n<p style="text-align:center">', "</p>\n", "טקסט ממורכז") },
    { l: "🔢 מספר", t: "קישור לדף המספר", on: () => { const n = window.prompt("המספר או הביטוי:", ""); if (n && n.trim()) wrap(`<a href="/number/${encodeURIComponent(n.trim())}" class="sod-numlink" data-gem="${n.trim()}"><b>`, "</b></a>", n.trim()); } },
    { l: "🔗 ראו גם", t: "בלוק «ראו גם»", on: () => insert(SEE_ALSO) },
    { l: "— קו", t: "קו מפריד", on: () => insert("\n<hr />\n") },
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
    setAiResult(null); setPreview(true);
  };

  // ── ניהול קטגוריות/תגיות ──
  const addChip = (kind, val) => {
    const v = (val || "").trim(); if (!v) return;
    if (kind === "cat") { setCategories(a => a.includes(v) ? a : [...a, v]); setCatInput(""); }
    else { setTags(a => a.includes(v) ? a : [...a, v]); setTagInput(""); }
  };
  const removeChip = (kind, val) => kind === "cat" ? setCategories(a => a.filter(x => x !== val)) : setTags(a => a.filter(x => x !== val));

  const save = async (asDraft) => {
    setErr(""); setMsg("");
    if (!title.trim()) { setErr("כותרת חובה."); return; }
    setSaving(true);
    // «טיוטה» = תגית-סטטוס: מוסיפים בשמירת-טיוטה, מסירים בפרסום.
    const baseTags = (tags || []).filter(t => t !== "טיוטה");
    const finalTags = asDraft ? [...baseTags, "טיוטה"] : baseTags;
    const payload = {
      id: postId, title: title.trim(), slug: slug.trim() || null, content, excerpt,
      categories, tags: finalTags, author: author.trim() || null, image_url: imageUrl.trim() || null,
      source: source || "ai", ai_touched: aiTouched,
    };
    try {
      const res = hasKey ? await tokenSavePost(editKey, payload) : await adminSavePost(payload);
      setSaving(false);
      if (res?.id && !postId) setPostId(res.id);   // אחרי יצירה — נשארים על אותו פוסט
      setWasDraft(asDraft);
      reloadDrafts();
      const savedSlug = res?.slug || slug;
      setMsg(asDraft ? `נשמר כטיוטה ✓ (id ${res?.id})` : `פורסם ✓ (id ${res?.id})`);
      if (!asDraft && savedSlug) setTimeout(() => nav(`/${savedSlug}`), 700);
    } catch (e) {
      setSaving(false);
      const m = String(e?.message || e);
      setErr(m.includes("not_admin") ? "אין הרשאת מנהל." : m.includes("empty_title") ? "כותרת חובה." : `שגיאת שמירה: ${m}`);
    }
  };

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

  return (
    <div className="pe" dir="rtl">
      <style>{POST_CONTENT_CSS}</style>
      <style>{`
        .pe { max-width: 1180px; margin: 0 auto; padding: 20px 16px 60px; font-family: ${F.body}; }
        .pe-title-row { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
        .pe-title-row h1 { color:${C.goldBright}; font-family:${F.heading}; font-size:22px; font-weight:800; margin:0; }
        .pe-badge { font-size:11px; letter-spacing:1px; color:${C.goldDim}; border:1px solid ${C.border}; border-radius:999px; padding:2px 10px; }
        .pe-grid { display:grid; grid-template-columns: 1.35fr 1fr; gap:18px; align-items:start; }
        @media(max-width:900px){ .pe-grid{ grid-template-columns:1fr; } }
        .pe-card { background: linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%); border:1px solid ${C.borderGold}; border-radius:12px; padding:16px; }
        .pe-lbl { display:block; color:${C.goldDim}; font-family:${F.heading}; font-size:10.5px; letter-spacing:2px; text-transform:uppercase; margin:14px 0 5px; }
        .pe-in { width:100%; box-sizing:border-box; background:${C.bg}; border:1px solid ${C.border}; border-radius:6px; color:#ede4d3; font-family:${F.body}; font-size:14px; padding:10px 12px; }
        .pe-in:focus{ outline:none; border-color:${C.gold}; }
        .pe-toolbar { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 8px; padding:8px; border:1px solid ${C.border}; border-radius:8px; background:rgba(8,5,2,.5); }
        .pe-tool { cursor:pointer; background:${C.bgGlow}; border:1px solid ${C.border}; color:${C.goldLight}; font-family:${F.heading}; font-size:12px; padding:6px 10px; border-radius:6px; }
        .pe-tool:hover { border-color:${C.gold}; color:${C.goldBright}; }
        .pe-content { width:100%; box-sizing:border-box; background:${C.bg}; border:1px solid ${C.border}; border-radius:8px; color:#ede4d3; font-family:${F.mono}; font-size:13.5px; line-height:1.7; padding:12px 14px; direction:ltr; text-align:right; resize:vertical; min-height:360px; outline:none; }
        .pe-content:focus{ border-color:${C.gold}; }
        .pe-prev { border:1px dashed ${C.borderGold}; border-radius:8px; padding:18px 16px; min-height:360px; max-height:70vh; overflow-y:auto; }
        .pe-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
        .pe-chip { display:inline-flex; align-items:center; gap:6px; background:${C.bgGlow}; border:1px solid ${C.border}; border-radius:999px; color:${C.goldLight}; font-size:12px; padding:3px 10px; }
        .pe-chip button { background:none; border:none; color:${C.goldDim}; cursor:pointer; font-size:14px; line-height:1; padding:0; }
        .pe-btn { cursor:pointer; border:none; border-radius:8px; font-family:${F.heading}; font-weight:800; letter-spacing:.5px; padding:11px 22px; }
        .pe-save { background:linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color:#1a0e00; font-size:14px; }
        .pe-save:disabled { opacity:.6; }
        .pe-ghost { background:none; border:1px solid ${C.borderGold}; color:${C.goldDim}; }
        .pe-ai { border:1px solid ${C.borderGold}; border-top:3px solid #8a63f4; border-radius:12px; padding:14px; background:rgba(20,12,32,.5); }
        .pe-ai h3 { margin:0 0 4px; color:#c9b6ff; font-family:${F.heading}; font-size:14px; }
        .pe-eng { display:flex; gap:8px; margin:8px 0; }
        .pe-eng button { flex:1; cursor:pointer; border-radius:8px; padding:8px; font-family:${F.heading}; font-size:12.5px; font-weight:700; background:${C.bg}; border:1px solid ${C.border}; color:${C.goldLight}; }
        .pe-preset { cursor:pointer; background:${C.bgGlow}; border:1px solid ${C.border}; color:${C.goldLight}; font-size:11.5px; padding:5px 9px; border-radius:999px; margin:0 4px 6px 0; }
        .pe-err { color:#e79aa2; font-size:12.5px; margin:8px 0 0; font-family:${F.heading}; }
        .pe-ok { color:#8fd6a0; font-size:12.5px; margin:8px 0 0; font-family:${F.heading}; }
        .pe-actions { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
      `}</style>

      <div className="pe-title-row">
        <h1>✍️ {isEdit ? "עריכת פוסט" : "פוסט חדש"}</h1>
        <span className="pe-badge" style={wasDraft ? { color: "#e8c15a", borderColor: "#e8c15a" } : { color: "#8fd6a0", borderColor: "#8fd6a0" }}>
          {wasDraft ? "● טיוטה" : "● מפורסם"}
        </span>
        {postId != null && <span className="pe-badge">id {postId}</span>}
        <span style={{ flex: 1 }} />
        <a href={`/editor${editKey ? `?key=${encodeURIComponent(editKey)}` : ""}`} className="pe-badge" style={{ textDecoration: "none" }}>+ פוסט חדש</a>
        <Link to="/post" className="pe-badge" style={{ textDecoration: "none" }}>← לכל הפוסטים</Link>
      </div>

      {/* 📝 רשימת הטיוטות — פתיחה מהירה לעריכה */}
      {drafts.length > 0 && (
        <details open={!isEdit} style={{ marginBottom: 14, background: "rgba(20,12,32,.4)", border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer", color: "#c9b6ff", fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>📝 טיוטות ({drafts.length})</summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {drafts.map(d => (
              <a key={d.id} href={`/editor/${encodeURIComponent(d.slug)}${editKey ? `?key=${encodeURIComponent(editKey)}` : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${d.slug === routeSlug ? C.gold : C.border}`, borderRadius: 10, padding: "7px 11px", textDecoration: "none", color: "#ede4d3", fontSize: 12.5, maxWidth: 260 }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="pe-lbl" style={{ margin: 0 }}>תוכן הפוסט (HTML)</label>
              <button type="button" className="pe-tool" onClick={() => setPreview(p => !p)} style={preview ? { background: C.gold, color: "#1a0e00", fontWeight: 800 } : undefined}>
                {preview ? "✎ עריכה" : "👁 תצוגה מקדימה"}
              </button>
            </div>
            <div className="pe-toolbar">
              {tools.map(t => (
                <button key={t.l} type="button" title={t.t} onClick={t.on} className="pe-tool"
                  style={{ fontWeight: t.bold ? 800 : undefined, fontStyle: t.italic ? "italic" : undefined }}>{t.l}</button>
              ))}
            </div>
            {preview ? (
              <div className="pe-prev" data-theme={P.mode} style={{ background: P.mode === "light" ? "#f6f1e6" : "rgba(5,4,0,.4)" }}>
                <div className="sod-post-content clean" dangerouslySetInnerHTML={{ __html: content || "<p>(אין תוכן)</p>" }} />
              </div>
            ) : (
              <textarea ref={taRef} value={content} onChange={e => setContent(e.target.value)} rows={20} className="pe-content" spellCheck={false} />
            )}
          </div>

          {/* עוזר ה-AI */}
          <div className="pe-ai" style={{ marginTop: 16 }}>
            <h3>🤖 עוזר ה-AI — {isEdit || content ? "עריכת התוכן" : "כתיבת פוסט"}</h3>
            <div style={{ color: C.goldDim, fontSize: 12 }}>ה-AI עורך את התוכן לפי ההוראה, בקלאסים הקנוניים של האתר. עובדה נשמרת, פרשנות נפרדת.</div>
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
                <div className="pe-prev" data-theme={P.mode} style={{ background: P.mode === "light" ? "#f6f1e6" : "rgba(5,4,0,.4)", maxHeight: "40vh" }}>
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

          <label className="pe-lbl">קשר לכתב (מהרשימה)</label>
          <select className="pe-in" value={contribs.some(c => c.display_name === author) ? author : ""}
            onChange={e => { if (e.target.value) setAuthor(e.target.value); }}>
            <option value="">— בחר כותב/תורם —</option>
            {contribs.map(c => <option key={c.slug} value={c.display_name}>{c.display_name}{c.locked ? " 🔒" : ""}</option>)}
          </select>

          <label className="pe-lbl">כותב (ריק = «המערכת»)</label>
          <input className="pe-in" value={author} onChange={e => setAuthor(e.target.value)} placeholder="שם הכותב" />

          <label className="pe-lbl">תמונה ראשית (URL)</label>
          <input className="pe-in" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" style={{ direction: "ltr", textAlign: "right" }} />
          {imageUrl && <img src={thumb(imageUrl, 240)} alt="" style={{ marginTop: 8, maxWidth: "100%", borderRadius: 8, border: `1px solid ${C.border}` }} onError={e => { e.currentTarget.style.display = "none"; }} />}

          <label className="pe-lbl">קטגוריות</label>
          <div className="pe-chips">{categories.map(c => <span key={c} className="pe-chip">{c}<button type="button" onClick={() => removeChip("cat", c)}>×</button></span>)}</div>
          <input className="pe-in" list="pe-cats" value={catInput} onChange={e => setCatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip("cat", catInput); } }}
            placeholder="הוסף קטגוריה (Enter)…" style={{ marginTop: 6 }} />
          <datalist id="pe-cats">{allCats.map(c => <option key={c} value={c} />)}</datalist>

          <label className="pe-lbl">תגיות</label>
          <div className="pe-chips">{tags.map(t => <span key={t} className="pe-chip">{t}<button type="button" onClick={() => removeChip("tag", t)}>×</button></span>)}</div>
          <input className="pe-in" list="pe-tags" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip("tag", tagInput); } }}
            placeholder="הוסף תגית (Enter)…" style={{ marginTop: 6 }} />
          <datalist id="pe-tags">{allTags.map(t => <option key={t} value={t} />)}</datalist>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, color: C.goldLight, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={aiTouched} onChange={e => setAiTouched(e.target.checked)} />
            חותמת «🔵 AI · מאומת» (ai_touched)
          </label>
        </div>
      </div>

      {err && <p className="pe-err">{err}</p>}
      {msg && <p className="pe-ok">{msg}</p>}
      <div className="pe-actions">
        <button type="button" className="pe-btn pe-ghost" onClick={() => save(true)} disabled={saving} style={{ borderColor: "#e8c15a", color: "#e8c15a" }}>{saving ? "שומר…" : "💾 שמור טיוטה"}</button>
        <button type="button" className="pe-btn pe-save" onClick={() => save(false)} disabled={saving}>{saving ? "שומר…" : "🚀 פרסם"}</button>
        <button type="button" className="pe-btn pe-ghost" onClick={() => nav(-1)} disabled={saving}>חזרה</button>
      </div>
      <p style={{ color: C.goldDim, fontSize: 11.5, marginTop: 8, fontFamily: F.body }}>«שמור טיוטה» = נשמר ולא מופיע באתר (רק כאן ברשימת הטיוטות). «פרסם» = עולה לאתר ולזרם העדכונים.</p>
    </div>
  );
}
