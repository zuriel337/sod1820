import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { categoryIcon } from "../lib/categoryIcons.js";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { thumb } from "../lib/img.js";
import { stripHtml, formatDateHe, youtubeId, youtubeUrl } from "../lib/format.js";
import { resolveAuthor } from "../lib/authors.js";
import { genAvatar } from "../lib/avatar.js";
import { INTENTS, intentMeta, stateMeta, STATE_META, getForumFeed, pinContribution, getReplyCounts, getConvergenceSlugs, editContribution, removeContribution } from "../lib/contributions.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ResearcherBadge from "./ResearcherBadge.jsx";
import ReactionBar from "./ReactionBar.jsx";
import SubmitChidush from "./SubmitChidush.jsx";
import AdminModerate from "./AdminModerate.jsx";
import Discourse from "./Discourse.jsx";
import ChallengeCard, { ChallengeCreate } from "./ChallengeCard.jsx";
import { getChallengesByContribs, CHALLENGE_STATUS } from "../lib/challenges.js";
import { seenCutoff, markSeenKey, withinFresh } from "../lib/crossesNew.js";

// 👍 לייקים בפורום — מוסתרים כעת (החלטת צוריאל: מעט כניסות, מתמקדים בתגובה/DM/מעקב+התראות).
//    כבוי = אין 👍/בוסט בשורה ובכרטיס; הכל נשאר בקוד וב-DB, החזרה = SHOW_FORUM_LIKES=true בלבד.
const SHOW_FORUM_LIKES = false;

// 🆕 מפתח «נראה» לפורום (whats_new_law, פר-משתמש) — תג «חדש» רק על מה שעלה מאז הביקור האחרון.
const FORUM_SEEN_KEY = "forum_feed";
// פריט «חדש» = עלה אחרי הביקור האחרון *וגם* בתוך חלון-הטריות (48ש') — לא מהבהב לנצח.
const isFreshNew = (it, cutoff) => !!(it && it.ts && it.ts > cutoff && withinFresh(it.ts));

// 🌐 <ForumFeed> — גוף-הפורום המשותף (עץ אחד): הסינונים + כרטיסי-הזרם, בלי כותרת/SEO/כפיית-מראה.
// מרונדר בשני שערים זהים: דף /forum (ForumPage — עם ההירו סביבו) וטאב «פורום» במרכז השידורים.
// כך רואים בדיוק את אותו הדבר בשני המקומות — אותם כרטיסים, סינונים, תגובות, שרשורים והצמדה.
function timeAgo(ts) {
  try {
    const s = (Date.now() - new Date(ts)) / 1000;
    if (s < 3600) return `לפני ${Math.max(1, Math.floor(s / 60))} דק׳`;
    if (s < 86400) return `לפני ${Math.floor(s / 3600)} שע׳`;
    if (s < 604800) return `לפני ${Math.floor(s / 86400)} ימים`;
    if (s < 2592000) return `לפני ${Math.max(1, Math.floor(s / 604800))} שבועות`;
    if (s < 31536000) return `לפני ${Math.max(1, Math.floor(s / 2592000))} חודשים`;
    return `לפני ${Math.floor(s / 31536000)} שנים`;
  } catch { return ""; }
}

// 🎥 וידאו אחסון-עצמי בגוף-התרומה — מנגן ישירות בפורום (כמו קליפ יוטיוב, אבל mp4 שלנו).
//    מזהים רק URL של Storage ציבורי שמסתיים ב-.mp4; הפוסטר = ה-.jpg/.png שבאותו גוף (אם יש).
const SELF_MP4_RE = /(https?:\/\/[^\s"'<>]+\/storage\/v1\/object\/public\/[^\s"'<>]+\.mp4)/i;
const POSTER_RE = /(https?:\/\/[^\s"'<>]+\/storage\/v1\/object\/public\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/i;
function selfMp4(body) { const m = String(body || "").match(SELF_MP4_RE); return m ? m[1] : null; }
function selfPoster(body) { const m = String(body || "").match(POSTER_RE); return m ? m[1] : null; }
// מנקה מהתקציר את שורות-המדיה (וידאו/פוסטר/מקור) שכבר מיוצגות ע"י הנגן/הקישורים.
function stripMediaLines(body) {
  return String(body || "")
    .split("\n")
    .filter((ln) => !/(🎥|🖼|🔗)\s*\S/.test(ln) && !SELF_MP4_RE.test(ln) && !POSTER_RE.test(ln))
    .join("\n");
}

function targetHref(t) {
  if (!t?.target_id) return null;
  if (t.target_type === "number" || t.target_type === "phrase") return `/number/${encodeURIComponent(t.target_id)}#comments`;
  if (t.target_type === "els") return `/codes/${encodeURIComponent(t.target_id)}`;
  return null;
}

const badge = (col, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: col, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{txt}</span>;

const STATE_RANK = { canonical: 5, validated: 4, investigating: 3, discussion: 2, idea: 1 };
const sigScore = (it) => (STATE_RANK[it.research_state] || 0) * 10 + (it.verified ? 5 : 0) + (it.has_1820 ? 3 : 0);

// 🔥 «הכי מדובר» — ניקוד-מעורבות: תגובות + לייקי-משתמשים + בוסטי-אדמין (סך אמיתי כמו בתצוגה).
const reactionsSum = (r) => {
  if (!r || typeof r !== "object") return 0;
  let n = 0; for (const v of Object.values(r)) n += Array.isArray(v) ? v.length : 0; return n;
};
const boostsSum = (b) => {
  if (!b || typeof b !== "object") return 0;
  let n = 0; for (const v of Object.values(b)) n += Number(v) || 0; return n;
};
const engagementScore = (it) => (it.replyCount || 0) + reactionsSum(it.reactions) + boostsSum(it.reaction_boosts);

function ContribCard({ c, P, isAdmin, onChanged, defaultOpen = false }) {
  const { user } = useAuth();
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const href = targetHref(c);
  const threadHref = c.contribId ? `/forum/${c.contribId}` : href;
  const ytId = youtubeId(c.body || "");                         // 🎬 קליפ מוטמע — כרטיס-וידאו
  const mp4 = ytId ? null : selfMp4(c.body || "");              // 🎥 וידאו אחסון-עצמי — מנגן ישירות בפורום
  const poster = mp4 ? selfPoster(c.body || "") : null;
  let snippetSrc = ytId ? (c.body || "").replace(youtubeUrl(c.body || "") || "", "") : (c.body || "");
  if (mp4) snippetSrc = stripMediaLines(snippetSrc);            // מנקים שורות-מדיה כשמוצג נגן
  const snippet = snippetSrc.replace(/\s+/g, " ").trim();
  const titleText = c.title || snippet.slice(0, 72) || "תרומת מחקר";
  const [pinBusy, setPinBusy] = useState(false);
  // ✏️ עריכה — המחבר את שלו · אדמין את של כולם (נאכף בשרת)
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const canEdit = isAdmin || (user && c.author_user_id === user.id);
  async function saveEdit() { const t = editBody.trim(); if (!t) return; setEditBusy(true); try { await editContribution(c.contribId, t); setEditing(false); onChanged && onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setEditBusy(false); } }
  async function removeItem() { if (!window.confirm("למחוק את הפריט?")) return; setEditBusy(true); try { await removeContribution(c.contribId); onChanged && onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setEditBusy(false); } }
  // 💬 שורה-אחת שנפתחת לתגובות inline (עץ אחד: אותו <Discourse> של עמוד-השרשור, לא מנווט).
  const [open, setOpen] = useState(defaultOpen);
  const dTarget = (c.target_type && c.target_id) ? { type: c.target_type, id: c.target_id } : { type: "forum", id: c.contribId };
  async function togglePin(e) {
    e.preventDefault(); e.stopPropagation();
    if (pinBusy || !c.contribId) return;
    setPinBusy(true);
    try { await pinContribution(c.contribId, !c.pinned); onChanged && onChanged(); }
    catch (err) { alert("שגיאה בהצמדה: " + (err.message || err)); }
    finally { setPinBusy(false); }
  }
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${c.chosen ? "#d4af37" : c.pinned ? P.accentText : P.border}`, borderRadius: 14, padding: "13px 16px", boxShadow: c.pinned ? `0 0 0 1px ${P.accentText} inset` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        {c.pinned && badge(P.accentText, "📌 מוצמד")}
        {/* 🏆 «מהנבחרות» — גימטריה שהערך שלה קיים במאגר ההתכנסויות האצור (convergence_values_present) */}
        {c.chosen && <span title="גימטריה מאומתת שהערך שלה שמור במאגר ההתכנסויות של האתר"
          style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>🏆 מהנבחרות</span>}
        {(ytId || mp4) && badge(P.accentText, "🎬 סרטון")}
        {badge(P.accentText, `${im.emoji} ${im.label}`)}
        {badge(P.accentDim, `${sm.emoji} ${sm.label}`)}
        {/* 🔗 תגית-קשרים חכמה — נדלקת רק כשיש ולו קשר אחד (edge בגרף מ«מצאתי קשר») */}
        {c.linkCount > 0 && badge(P.accent, `🔗 ${c.linkCount} ${c.linkCount === 1 ? "קשר" : "קשרים"}`)}
        {/* 💬 עדות-חיים — כל כרטיס עם תגובות מציג «יש תגובה» (מובחרת בזהב) */}
        {c.replyCount > 0 && (
          <span title="יש תגובות בשרשור" style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>💬 {c.replyCount === 1 ? "תגובה מובחרת" : `${c.replyCount} תגובות`}</span>
        )}
        {/* ✦ סמל-כתב: ההודעה הזו הולידה התכנסות (canonical) */}
        {c.convergenceSlug && (
          <Link to={`/topic/${c.convergenceSlug}`} onClick={e => e.stopPropagation()} title="נוצרה מכאן התכנסות" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>✦ יצר התכנסות ←</Link>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      </div>
      {/* כותרת = כפתור-פתיחה (שורה אחת → תגובות inline). deep-link לעמוד-מלא נשאר בשורת-הפעולות. */}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ display: "block", width: "100%", textAlign: "start", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, lineHeight: 1.4, marginBottom: 3 }}>{titleText}</div>
        {ytId && (
          <div style={{ position: "relative", width: "100%", maxWidth: 340, aspectRatio: "16/9", borderRadius: 11, overflow: "hidden", border: `1px solid ${P.border}`, background: "#000", margin: "8px 0" }}>
            <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt={titleText} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.5))" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: "50%", background: "rgba(212,175,55,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(212,175,55,0.6)" }}>
              <span style={{ color: "#1a1400", fontSize: 18, marginInlineStart: 3 }}>▶</span>
            </div>
          </div>
        )}
        {snippet && !editing && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: open ? 20 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{snippet}</div>}
      </button>
      {/* 🎥 נגן וידאו אחסון-עצמי — מחוץ לכפתור-הפתיחה כדי שפקדי-הנגן לא יקפלו/יפתחו את הכרטיס */}
      {mp4 && (
        <video controls playsInline preload="none" poster={poster || undefined}
          style={{ width: "100%", maxWidth: 320, maxHeight: "72vh", borderRadius: 12, border: `1px solid ${P.border}`, background: "#000", margin: "9px 0", display: "block" }}>
          <source src={mp4} type="video/mp4" />
        </video>
      )}
      {/* ✏️ עריכה inline של גוף-התרומה */}
      {editing && (
        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} autoFocus
            style={{ width: "100%", boxSizing: "border-box", minHeight: 90, resize: "vertical", background: P.card, border: `1px solid ${P.accentText}`, borderRadius: 9, padding: "10px 12px", color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, outline: "none" }} />
          <div style={{ display: "flex", gap: 7 }}>
            <button disabled={editBusy || !editBody.trim()} onClick={saveEdit} style={{ cursor: "pointer", background: P.accentBtn, border: "none", color: P.onAccent || "#1a0e00", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "6px 15px", opacity: editBody.trim() ? 1 : 0.5 }}>💾 שמור</button>
            <button onClick={() => setEditing(false)} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "6px 13px" }}>ביטול</button>
          </div>
        </div>
      )}
      {/* 🧩 אתגר מחקר — כרטיס אם קיים; אחרת «הפוך לאתגר» לאדמין/מחבר (חי בתוך הזרם) */}
      {c.challenge ? (
        <ChallengeCard challenge={c.challenge} elsPhrase={c.target_type === "phrase" ? c.target_id : null} onChanged={onChanged} />
      ) : (isAdmin || (user && c.author_user_id === user.id)) ? (
        <div style={{ marginTop: 8 }}><ChallengeCreate contributionId={c.contribId} defaultTitle={titleText} onCreated={onChanged} /></div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 9 }}>
        {c.author_name
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ <ResearcherBadge name={c.author_name} display={c.author_display} uid={c.author_user_id} size={20} />{c.trustedAuthor && <TrustedTick P={P} withText />}</span>
          : <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ חבר הקהילה</span>}
        {SHOW_FORUM_LIKES && <ReactionBar id={c.contribId} reactions={c.reactions} boosts={c.reaction_boosts} />}
        {canEdit && !editing && (
          <button onClick={() => { setEditBody(c.body || ""); setEditing(true); }} title="ערוך"
            style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 11px" }}>✏️ ערוך</button>
        )}
        {canEdit && !editing && (
          <button onClick={removeItem} disabled={editBusy} title="מחק"
            style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 11px" }}>🗑 מחק</button>
        )}
        {isAdmin && (
          <button onClick={togglePin} disabled={pinBusy} title={c.pinned ? "בטל הצמדה" : "הצמד לראש הפורום"}
            style={{ cursor: pinBusy ? "wait" : "pointer", background: "none", border: `1px solid ${c.pinned ? P.accentText : P.border}`, borderRadius: 999, color: c.pinned ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 11px" }}>
            {c.pinned ? "📌 בטל הצמדה" : "📌 הצמד"}
          </button>
        )}
        {/* 💬 פתיחת/סגירת תגובות inline + deep-link לעמוד המלא */}
        <button onClick={() => setOpen(o => !o)}
          style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>
          {open ? "▴ סגור תגובות" : "💬 תגובות"}
        </button>
        <Link to={threadHref} title="פתח בעמוד מלא" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>↗ עמוד</Link>
      </div>
      {/* 💬 תגובות inline — אותו רכיב Discourse הקנוני, במצב «תגובות בלבד»: הכרטיס כבר מוצג כאן
          למעלה, ולכן Discourse מציג רק את התגובות + מלחין-תגובה (בלי לשכפל את הכרטיס). */}
      {open && (
        <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px dashed ${P.border}` }}>
          <Discourse target={dTarget} focusId={c.contribId} origin="forum" repliesOnly onActivity={onChanged} />
        </div>
      )}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${P.border}` }}>
          <AdminModerate kind="contribution" id={c.contribId} onDone={onChanged} />
        </div>
      )}
    </div>
  );
}

function PostCard({ c, P }) {
  const a = resolveAuthor(c.author_name);
  const to = `/${c.slug}`;
  const preview = stripHtml(c.excerpt);
  const cat = Array.isArray(c.categories) && c.categories.length ? c.categories[0] : null;
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {badge(P.accentText, "📜 מאמר")}
        {cat && <Link to={`/category/${encodeURIComponent(cat)}`} style={{ textDecoration: "none" }}>{badge(P.accent, `${categoryIcon(cat) || "🏷️"} ${cat}`)}</Link>}
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
        <img src={a.avatar && a.avatar !== "/logo.png" ? a.avatar : genAvatar(a.name)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: `1px solid ${P.border}` }} />
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, lineHeight: 1.3 }}>
          <b style={{ color: P.accentText }}>{a.name}</b>{a.role ? <span style={{ display: "block", fontSize: 10.5, color: P.accentDim, fontWeight: 400 }}>{a.role}</span> : null}
        </span>
        <Link to={to} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>📖 קרא את הפוסט המלא ←</Link>
      </div>
    </div>
  );
}

function InsightCard({ c, P, isAdmin, onChanged }) {
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
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${P.border}` }}>
          <AdminModerate kind="insight" id={c.insightId} onDone={onChanged} />
        </div>
      )}
    </div>
  );
}

function CipherCard({ c, P }) {
  const to = `/codes/${encodeURIComponent(c.slug || "")}`;
  const scopeTxt = c.scope === "tanakh" ? "כל התנ״ך" : "התורה";
  const desc = (c.description || "").trim();
  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {badge(P.accentText, "🆕 צופן חדש מגולש")}
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
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ נמצא על ידי <b style={{ color: P.accentText }}>{c.author_name || "גולש"}</b>{c.ts ? ` · 🕐 ${timeAgo(c.ts)}` : ""}</span>
        <Link to={to} style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>🔍 לצופן ולמחקר ←</Link>
      </div>
    </div>
  );
}

// 💬 סגנון-צ'אט — שורה אחת לכל פריט. לחיצה פותחת את הכרטיס המלא (defaultOpen).
function oneLine(s, n = 88) {
  const t = stripHtml(String(s || "")).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

// 🔠 שורת-צופן: לא מילת-החיפוש (הזהה בכל השורות) אלא **המילים שבמטריצה** (ההצלבה = הגילוי).
//    המקור הקריא = description (עם רווחים); מסירים ממנו את מילת-החיפוש שבהתחלה. בלי «הצלבה», בלי דילוג.
function cipherWords(desc, term) {
  if (!desc) return "";
  let s = String(desc).trim();
  const t = String(term || "").replace(/[^א-ת]/g, "");
  if (t) {
    // (א) מופרד-פסיק «ד. טראמפ, …»  ·  (ב) עטוף-מרכאות «״ד. טראמפ״ …»
    let m = s.match(/^([^,،·]{1,22})[,،·]\s*/) || s.match(/^\s*[«"״]([^»"״]{1,22})[»"״]\s*/);
    if (m && m[1].replace(/[^א-ת]/g, "") === t) s = s.slice(m[0].length).trim();
  }
  return s || String(desc);
}

// 🌟 סימון «כתב מהימן» — צ'ק זהב. withText → תג עם מילים (בכרטיס המלא); בלי → נקודה קטנה (בשורה).
function TrustedTick({ P, withText = false }) {
  return (
    <span title="כתב מהימן — מהכתבים האיכותיים של האתר"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3,
        background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00",
        borderRadius: 999, padding: withText ? "1px 8px" : 0,
        width: withText ? "auto" : 15, height: withText ? "auto" : 15, minWidth: 15,
        fontFamily: F.heading, fontSize: withText ? 11 : 10, fontWeight: 900, flex: "0 0 auto" }}>
      ✓{withText ? " כתב מהימן" : ""}
    </span>
  );
}

const leadEmoji = (c) =>
  c.kind === "post" ? "📜" : c.kind === "insight" ? "💡" : c.kind === "cipher" ? "🔠" : (intentMeta(c.intent).emoji || "💬");

// שורת-צ'אט קומפקטית (מצב מכווץ) — אווטאר · שם + מהימן · טקסט · מוצמד/נבחרת · 👍 לייק · 💬 תגובה · זמן.
// 🆕 לייק + תגובה לחיצים *ישירות על השורה* (בלי לפתוח) לכל הודעה אחרונה — 👍 דרך ReactionBar (variant=row),
//    💬 פותח את השרשור לתגובה. אזור-הפתיחה הוא הכפתור; הפעולות הן אחים (לא button-בתוך-button).
function ChatRow({ c, P, onOpen, cutoff }) {
  const who = c.author_display || c.author_name || "חבר הקהילה";
  const text = oneLine(c.kind === "cipher"
    ? (cipherWords(c.description, c.search_term) || c.title || c.search_term || "צופן")
    : (c.title || c.body || c.excerpt || c.description || "תרומת מחקר"));
  const isContrib = c.kind === "contribution";
  const bumped = c.bump && new Date(c.bump) > new Date(c.ts);
  const isNew = isFreshNew(c, cutoff);   // 🆕 עלה מאז הביקור האחרון (ובתוך 48ש')
  return (
    <div className="ff-chatrow"
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", minWidth: 0, minHeight: 44,
        background: c.chosen ? "rgba(212,175,55,0.06)" : "transparent",
        border: `1px solid ${c.pinned ? P.accentText : P.border}`, borderRadius: 11, padding: "9px 12px" }}>
      {/* אזור-הפתיחה (אווטאר · שם · טקסט · סמלי-סטטוס) — לחיצה פותחת את הכרטיס */}
      <button onClick={onOpen} aria-label="פתח" className="ff-openarea"
        style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0, textAlign: "start", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
        <img src={genAvatar(who)} alt="" loading="lazy"
          style={{ width: 26, height: 26, borderRadius: "50%", flex: "0 0 auto", border: `1px solid ${P.border}` }} />
        <span className="ff-who" style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "0 0 auto", maxWidth: "34%", minWidth: 0 }}>
          <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who}</span>
          {c.trustedAuthor && <TrustedTick P={P} />}
        </span>
        {isNew && <span title="חדש מאז הביקור האחרון" style={{ flex: "0 0 auto", background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 9.5, fontWeight: 900, borderRadius: 999, padding: "1px 6px", letterSpacing: .3 }}>🆕 חדש</span>}
        <span style={{ flex: 1, minWidth: 0, color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ marginInlineEnd: 4 }}>{leadEmoji(c)}</span>{text}
        </span>
        {c.pinned && <span title="מוצמד" style={{ flex: "0 0 auto", fontSize: 12 }}>📌</span>}
        {c.chosen && <span title="מהנבחרות" style={{ flex: "0 0 auto", fontSize: 12 }}>🏆</span>}
        {c.challenge && <span title={`אתגר מחקר · ${(CHALLENGE_STATUS[c.challenge.status] || CHALLENGE_STATUS.open).label}`} style={{ flex: "0 0 auto", fontSize: 12.5 }}>{c.challenge.status === "open" ? "🆘" : "🧩"}</span>}
      </button>

      {/* 🆕 פעולות-שורה — לייק + תגובה לחיצים (רק לתרומות-קהילה, שיש להן contribId) */}
      {isContrib && c.contribId && (
        <span className="ff-actions" style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
          {SHOW_FORUM_LIKES && <ReactionBar id={c.contribId} reactions={c.reactions} boosts={c.reaction_boosts} variant="row" />}
          <button onClick={onOpen} title="תגובה בשרשור" className="ff-cmt"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, borderRadius: 999, padding: "3px 10px",
              border: `1px solid ${c.replyCount > 0 ? P.accent : P.border}`, background: c.replyCount > 0 ? "rgba(212,175,55,0.12)" : "transparent",
              color: c.replyCount > 0 ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
            <span style={{ fontSize: 14 }}>💬</span>{c.replyCount > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.replyCount}</span>}
          </button>
        </span>
      )}

      {/* זמן — פעילות-אחרונה (bump) אם קפץ, אחרת זמן-היצירה */}
      {bumped ? (
        <span title="עודכן — תגובה/פעילות אחרונה" style={{ flex: "0 0 auto", color: P.accentText, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>🕒 {timeAgo(c.bump)}</span>
      ) : (
        <span style={{ flex: "0 0 auto", color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
      )}
    </div>
  );
}

// פריט-פיד: שורת-צ'אט כברירת-מחדל; בלחיצה נפתח הכרטיס המלא (עם «כווץ» לחזרה לשורה).
function FeedItem({ c, P, isAdmin, onChanged, cutoff }) {
  const [open, setOpen] = useState(false);
  if (!open) return <ChatRow c={c} P={P} onOpen={() => setOpen(true)} cutoff={cutoff} />;
  const full = c.kind === "post" ? <PostCard c={c} P={P} />
    : c.kind === "insight" ? <InsightCard c={c} P={P} isAdmin={isAdmin} onChanged={onChanged} />
    : c.kind === "cipher" ? <CipherCard c={c} P={P} />
    : <ContribCard c={c} P={P} isAdmin={isAdmin} onChanged={onChanged} defaultOpen />;
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)}
          style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "3px 11px" }}>▴ כווץ</button>
      </div>
      {full}
    </div>
  );
}

// גוף-הפורום המשותף. maxWidth — רוחב הפיד (ברירת-מחדל 780, כמו דף הפורום).
export default function ForumFeed({ maxWidth = 780 } = {}) {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [allItems, setAllItems] = useState(null);
  const [type, setType] = useState(null);
  const [writer, setWriter] = useState(null);
  const [state, setState] = useState(null);
  const [sort, setSort] = useState("new");
  // 🆕 סף «נראה» פר-משתמש — נלכד פעם אחת בכניסה; תגי «חדש» מחושבים מולו, ואז מסמנים נראה (whats_new_law).
  const [newCutoff] = useState(() => seenCutoff(FORUM_SEEN_KEY));
  // ✍️ «דף ריק לכתוב חידוש» — נפתח אוטומטית בהגעה מ-/forum?write=1 (כפתור «שתפו חידוש» בדף הבית)
  const [sp] = useSearchParams();
  const wantWrite = sp.get("write") === "1";
  const [writing, setWriting] = useState(wantWrite);
  const composerRef = useRef(null);
  // כשמגיעים עם ?write=1 — פותחים וגוללים אל דף-הכתיבה (גם אם הגענו כשהדף כבר היה טעון)
  useEffect(() => {
    if (!wantWrite) return;
    setWriting(true);
    const t = setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [wantWrite]);

  // 🌳 עץ אחד: הפורום = קהילה בלבד (בלי פוסטים) — פוסטים חיים ב«פעילות האתר», אפס כפילות.
  const load = useCallback(() => {
    getForumFeed({ type: null, writer: null, limit: 200, includePosts: false }).then(async (feed) => {
      // 💬 מונה-תגובות לכל תרומה — שכל כרטיס יראה «יש תגובה» (עדות-חיים לפורום).
      const ids = (feed || []).filter(it => it.kind === "contribution" && it.contribId).map(it => it.contribId);
      const [counts, convSlugs, challenges] = await Promise.all([getReplyCounts(ids), getConvergenceSlugs(ids), getChallengesByContribs(ids)]);
      setAllItems((feed || []).map(it => ({ ...it, replyCount: counts[it.contribId] || 0, convergenceSlug: convSlugs[it.contribId] || null, challenge: challenges[it.contribId] || null })));
    }).catch(() => setAllItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  // 🆕 אחרי טעינה — מסמנים «נראה» עם החדש-ביותר, כך שבביקור הבא רק מה שעלה מעכשיו יסומן «חדש».
  //     ה-cutoff לתצוגה כבר נלכד ב-newCutoff לפני הסימון → התגים של הביקור הזה נשמרים.
  useEffect(() => {
    if (!allItems || !allItems.length) return;
    const newest = allItems.reduce((m, it) => (it.ts && it.ts > m ? it.ts : m), "");
    if (newest) markSeenKey(FORUM_SEEN_KEY, newest);
  }, [allItems]);

  const postCount = useMemo(() => (allItems || []).filter(it => it.kind === "post").length, [allItems]);
  const insightCount = useMemo(() => (allItems || []).filter(it => it.kind === "insight").length, [allItems]);
  const cipherCount = useMemo(() => (allItems || []).filter(it => it.kind === "cipher").length, [allItems]);
  const intentCount = useMemo(() => {
    const m = {};
    (allItems || []).forEach(it => { if (it.kind === "contribution" && it.intent) m[it.intent] = (m[it.intent] || 0) + 1; });
    return m;
  }, [allItems]);

  const stateCounts = useMemo(() => {
    const m = {};
    (allItems || []).forEach(it => { if (it.research_state) m[it.research_state] = (m[it.research_state] || 0) + 1; });
    return m;
  }, [allItems]);

  const items = useMemo(() => {
    if (!allItems) return null;
    let out;
    if (type === "post") out = allItems.filter(it => it.kind === "post" && (!writer || it.author_name === writer));
    else if (type === "insight") out = allItems.filter(it => it.kind === "insight");
    else if (type === "cipher") out = allItems.filter(it => it.kind === "cipher");
    else if (type) out = allItems.filter(it => it.kind === "contribution" && it.intent === type);
    else out = allItems;
    if (state) out = out.filter(it => it.research_state === state);
    if (sort === "significance") out = [...out].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.trustedAuthor ? 1 : 0) - (a.trustedAuthor ? 1 : 0) || sigScore(b) - sigScore(a) || (new Date(b.ts) - new Date(a.ts)));
    // 🔥 הכי מדובר — מוצמדים ראשונים, ואז לפי מעורבות (תגובות+לייקים+בוסטים), שובר-שוויון לפי טריות.
    else if (sort === "hot") out = [...out].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || engagementScore(b) - engagementScore(a) || (new Date(b.ts) - new Date(a.ts)));
    return out;
  }, [allItems, type, writer, state, sort]);

  const writers = useMemo(() => {
    const seen = new Map();
    (allItems || []).forEach(it => { if (it.kind === "post" && it.author_name) seen.set(it.author_name, (seen.get(it.author_name) || 0) + 1); });
    return [...seen.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  }, [allItems]);

  const chip = (on, disabled) => ({ cursor: disabled ? "default" : "pointer", borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
    border: `1px solid ${on ? P.borderStrong : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent", color: on ? P.accentText : P.accentDim, opacity: disabled ? 0.38 : 1 });
  const pickType = (t) => { setType(t); if (t !== "post") setWriter(null); };

  return (
    <div className="ff-root" style={{ maxWidth, margin: "0 auto", minWidth: 0 }}>
      {/* 📱 רספונסיביות מובייל — בלי גלילה אופקית, יעדי-מגע ≥44px, קטיעה נכונה בשורות-הצ'אט */}
      <style>{`
        .ff-root, .ff-root * { min-width: 0; }
        .ff-root { overflow-x: clip; }
        .ff-root .ff-chatrow { -webkit-tap-highlight-color: transparent; }
        .ff-root img, .ff-root video, .ff-root iframe { max-width: 100%; }
        @media (max-width: 520px) {
          .ff-root .ff-chatrow { gap: 6px; padding: 10px 11px; }
          .ff-root .ff-who { max-width: 30%; }
          .ff-root .ff-actions { gap: 4px; }
          .ff-root .ff-actions button { padding: 3px 8px; }
          .ff-root .ff-filters { gap: 6px; }
          .ff-root .ff-filters button { padding: 6px 11px; font-size: 12.5px; }
        }
      `}</style>
      {/* ✍️ דף ריק לכתוב חידוש — המתכונת הקנונית (SubmitChidush), זהה לבית-המדרש ולהיכל */}
      <div ref={composerRef} style={{ marginBottom: 16, scrollMarginTop: 76 }}>
        {writing ? (
          <div style={{ background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ color: P.ink, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>✍️ שיתוף חידוש — מדור חידושי הגולשים</span>
              <button onClick={() => setWriting(false)} style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "4px 12px" }}>✕ סגור</button>
            </div>
            <SubmitChidush compact onDone={load} />
          </div>
        ) : (
          <button onClick={() => setWriting(true)} style={{ cursor: "pointer", width: "100%", background: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06))", border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, textAlign: "right" }}>
            <span style={{ fontSize: 22 }}>✍️</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>שתפו חידוש משלכם</span>
              <span style={{ display: "block", color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 }}>מדור «חידושי הגולשים» פתוח לכל חוקר — גיליתם רמז, גימטריה או הצלבה? כתבו בחופשיות, והשורה הראשונה תהיה הכותרת.</span>
            </span>
            <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>פתחו דף ←</span>
          </button>
        )}
      </div>

      {/* שורה 1 — סוג. רובריקה ריקה (0 פריטים) לא מוצגת כלל (בקשת צוריאל) — רק «הכל» תמיד. */}
      <div className="ff-filters" style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}>
        <button onClick={() => pickType(null)} style={chip(!type, false)}>הכל</button>
        {insightCount > 0 && (
          <button onClick={() => pickType("insight")} style={chip(type === "insight", false)}>💡 חידושי בית המדרש</button>
        )}
        {cipherCount > 0 && (
          <button onClick={() => pickType("cipher")} style={chip(type === "cipher", false)}>🔠 צפני גולשים</button>
        )}
        {INTENTS.filter(i => i.key !== "תגובה" && (intentCount[i.key] || 0) > 0).map(i => (
          <button key={i.key} onClick={() => pickType(i.key)} style={chip(type === i.key, false)}>
            {i.emoji} {i.label}
          </button>
        ))}
      </div>

      {/* שורה 1.5 — מצב-מחקר + מיון */}
      <div className="ff-filters" style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginBottom: 18 }}>
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
        <button onClick={() => setSort("hot")} style={{ ...chip(sort === "hot"), fontSize: 12, padding: "4px 11px" }}>🔥 הכי מדובר</button>
        <button onClick={() => setSort("significance")} style={{ ...chip(sort === "significance"), fontSize: 12, padding: "4px 11px" }}>⭐ מובהקות</button>
      </div>

      {items === null ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 40 }}>טוען…</div>
      ) : !items.length ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "50px 20px", lineHeight: 1.8 }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.7 }}>🌱</div>
          עדיין אין פריטים בקטגוריה הזו — היו הראשונים לתרום מדף מספר או מבית המדרש.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map(c => <FeedItem key={c.id} c={c} P={P} isAdmin={isAdmin} onChanged={load} cutoff={newCutoff} />)}
        </div>
      )}
    </div>
  );
}
