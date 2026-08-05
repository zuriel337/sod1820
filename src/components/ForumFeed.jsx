import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { thumb } from "../lib/img.js";
import { stripHtml, formatDateHe, youtubeId, youtubeUrl } from "../lib/format.js";
import { resolveAuthor } from "../lib/authors.js";
import { genAvatar } from "../lib/avatar.js";
import { INTENTS, intentMeta, stateMeta, STATE_META, getForumFeed, pinContribution, getReplyCounts, getConvergenceSlugs } from "../lib/contributions.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ResearcherBadge from "./ResearcherBadge.jsx";
import ReactionBar from "./ReactionBar.jsx";
import SubmitChidush from "./SubmitChidush.jsx";
import AdminModerate from "./AdminModerate.jsx";
import Discourse from "./Discourse.jsx";

// 🌐 <ForumFeed> — גוף-הפורום המשותף (עץ אחד): הסינונים + כרטיסי-הזרם, בלי כותרת/SEO/כפיית-מראה.
// מרונדר בשני שערים זהים: דף /forum (ForumPage — עם ההירו סביבו) וטאב «פורום» במרכז השידורים.
// כך רואים בדיוק את אותו הדבר בשני המקומות — אותם כרטיסים, סינונים, תגובות, שרשורים והצמדה.
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
  if (t.target_type === "els") return `/codes/${encodeURIComponent(t.target_id)}`;
  return null;
}

const badge = (col, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: col, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{txt}</span>;

const STATE_RANK = { canonical: 5, validated: 4, investigating: 3, discussion: 2, idea: 1 };
const sigScore = (it) => (STATE_RANK[it.research_state] || 0) * 10 + (it.verified ? 5 : 0) + (it.has_1820 ? 3 : 0);

function ContribCard({ c, P, isAdmin, onChanged, defaultOpen = false }) {
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const href = targetHref(c);
  const threadHref = c.contribId ? `/forum/${c.contribId}` : href;
  const ytId = youtubeId(c.body || "");                         // 🎬 קליפ מוטמע — כרטיס-וידאו
  const snippetSrc = ytId ? (c.body || "").replace(youtubeUrl(c.body || "") || "", "") : (c.body || "");
  const snippet = snippetSrc.replace(/\s+/g, " ").trim();
  const titleText = c.title || snippet.slice(0, 72) || "תרומת מחקר";
  const [pinBusy, setPinBusy] = useState(false);
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
        {ytId && badge(P.accentText, "🎬 סרטון")}
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
        {snippet && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: open ? 20 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{snippet}</div>}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 9 }}>
        {c.author_name
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ <ResearcherBadge name={c.author_name} display={c.author_display} uid={c.author_user_id} size={20} />{c.trustedAuthor && <TrustedTick P={P} withText />}</span>
          : <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ חבר הקהילה</span>}
        <ReactionBar id={c.contribId} reactions={c.reactions} compact />
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
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>✍️ נמצא על ידי <b style={{ color: P.accentText }}>{c.author_name || "גולש"}</b>{c.ts ? ` · 🕐 ${formatDateHe(c.ts)}` : ""}</span>
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

// 👍 סך-הריאקציות על פריט — reactions הוא { "👍": ["uid",…] }, אז סוכמים אורכי-מערכים.
function reactionTotal(r) {
  if (!r || typeof r !== "object") return 0;
  let n = 0;
  for (const v of Object.values(r)) n += Array.isArray(v) ? v.length : (Number(v) || 0);
  return n;
}

// שורת-צ'אט קומפקטית (מצב מכווץ) — אווטאר · שם + מהימן · טקסט · מוצמד/נבחרת · 💬 תגובות · 👍 · זמן.
// 💬 מונה-התגובות גלוי בכל שורה (גם 0) → הפורום נקרא כרשימת-שרשורים אמיתית, רואים מיד היכן יש דיון.
function ChatRow({ c, P, onOpen }) {
  const who = c.author_display || c.author_name || "חבר הקהילה";
  const text = oneLine(c.title || c.body || c.excerpt || c.description || "תרומת מחקר");
  const isContrib = c.kind === "contribution";
  const rTotal = reactionTotal(c.reactions);
  return (
    <button onClick={onOpen} aria-label="פתח" className="ff-chatrow"
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", minWidth: 0, minHeight: 44, textAlign: "start", cursor: "pointer",
        background: c.chosen ? "rgba(212,175,55,0.06)" : "transparent",
        border: `1px solid ${c.pinned ? P.accentText : P.border}`, borderRadius: 11, padding: "9px 12px" }}>
      <img src={genAvatar(who)} alt="" loading="lazy"
        style={{ width: 26, height: 26, borderRadius: "50%", flex: "0 0 auto", border: `1px solid ${P.border}` }} />
      <span className="ff-who" style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "0 0 auto", maxWidth: "38%", minWidth: 0 }}>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who}</span>
        {c.trustedAuthor && <TrustedTick P={P} />}
      </span>
      <span style={{ flex: 1, minWidth: 0, color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ marginInlineEnd: 4 }}>{leadEmoji(c)}</span>{text}
      </span>
      {c.pinned && <span title="מוצמד" style={{ flex: "0 0 auto", fontSize: 12 }}>📌</span>}
      {c.chosen && <span title="מהנבחרות" style={{ flex: "0 0 auto", fontSize: 12 }}>🏆</span>}
      {/* 💬 מונה-תגובות — בשרשור פעיל (>0) בזהב, אחרת עמום ומזמין */}
      {isContrib && (
        <span className="ff-count" title={c.replyCount > 0 ? `${c.replyCount} תגובות בשרשור` : "אין תגובות עדיין — היו הראשונים"}
          style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 3, minWidth: 30, justifyContent: "flex-end",
            color: c.replyCount > 0 ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          💬 {c.replyCount || 0}
        </span>
      )}
      {/* 👍 סך-ריאקציות — רק כשיש, סימן-חיים קליל */}
      {rTotal > 0 && (
        <span className="ff-count" title={`${rTotal} ריאקציות`}
          style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 2, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          👍 {rTotal}
        </span>
      )}
      <span style={{ flex: "0 0 auto", color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.ts)}</span>
    </button>
  );
}

// פריט-פיד: שורת-צ'אט כברירת-מחדל; בלחיצה נפתח הכרטיס המלא (עם «כווץ» לחזרה לשורה).
function FeedItem({ c, P, isAdmin, onChanged }) {
  const [open, setOpen] = useState(false);
  if (!open) return <ChatRow c={c} P={P} onOpen={() => setOpen(true)} />;
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
      const [counts, convSlugs] = await Promise.all([getReplyCounts(ids), getConvergenceSlugs(ids)]);
      setAllItems((feed || []).map(it => ({ ...it, replyCount: counts[it.contribId] || 0, convergenceSlug: convSlugs[it.contribId] || null })));
    }).catch(() => setAllItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

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
          .ff-root .ff-chatrow { gap: 8px; padding: 10px 11px; }
          .ff-root .ff-who { max-width: 44%; }
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
          {items.map(c => <FeedItem key={c.id} c={c} P={P} isAdmin={isAdmin} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}
