import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { getPostBySlug } from "../lib/supabase.js";
import { crossesCutoff } from "../lib/crossesNew.js";
import VerifiedBadge from "./VerifiedBadge.jsx";

/**
 * חוק מערכת: insight_card_law (עודכן — עץ אחד)
 * מבנה חידוש = קצר ונפתח. כברירת מחדל מציג כותרת + סמל; לחיצה פותחת.
 * אם החידוש מקושר לפוסט (source_ref) — הכרטיס נפתח *במקום* ומציג את תוכן הפוסט
 * המלא (נטען חי מהפוסט, מקור אחד — לא עותק) + קישור «לפוסט המלא».
 */

// "חדש" = נוצר מאז הביקור האחרון של המשתמש (per-user) — לא חלון גלובלי קבוע.
// כך משתמש ותיק לא רואה הבהוב קבוע; אין חדש → אין הבהוב.

// slug של פוסט פנימי מקושר (מתוך source_ref)
function postSlug(insight) {
  const ref = insight?.source_ref;
  if (!ref || typeof ref !== "string") return null;
  const v = ref.trim();
  if (/^https?:\/\//.test(v)) return null;               // קישור חיצוני — לא פוסט פנימי
  if (insight.source_type && insight.source_type !== "post" && /^\d+$/.test(v)) return null;
  if (/\s/.test(v) || v.length > 200 || !v) return null;
  return v.replace(/^\/+/, "");
}
// קישור חיצוני (אם source_ref הוא URL מלא)
function extHref(insight) {
  const v = (insight?.source_ref || "").trim();
  return /^https?:\/\//.test(v) ? v : null;
}
// תוכן הפוסט לתצוגה אינליין — מסירים את מרקר הגלריה (מוצג מלא רק בעמוד הפוסט)
function cleanContent(html) {
  return String(html || "").replace(/<div data-sod-gallery(?:-id)?="\d+"><\/div>/g, "");
}

export default function InsightCard({ insight, badgeVariant = "ai" }) {
  const [open, setOpen] = useState(false);
  const [post, setPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const slug = postSlug(insight);
  const ext = extHref(insight);
  const numbers = insight.related_numbers || [];
  const phrases = insight.related_phrases || [];
  const isNew = !!(insight.created_at && insight.created_at > crossesCutoff());

  function toggle() {
    const next = !open; setOpen(next);
    if (next && slug && !post && !loadingPost) {
      setLoadingPost(true);
      getPostBySlug(slug).then(p => setPost(p)).catch(() => {}).finally(() => setLoadingPost(false));
    }
  }

  const head = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <style>{`@keyframes ic-newpulse{0%,100%{opacity:1;box-shadow:0 0 0 rgba(224,85,106,.0)}50%{opacity:.85;box-shadow:0 0 12px rgba(224,85,106,.7)}}
        .ic-postbody{color:${C.goldDim};font-family:${F.body};font-size:15px;line-height:1.9}
        .ic-postbody img{max-width:100%;height:auto;border-radius:8px;margin:8px 0}
        .ic-postbody h1,.ic-postbody h2,.ic-postbody h3,.ic-postbody h4,.ic-postbody h5{color:${C.goldLight};font-family:${F.heading}}
        .ic-postbody a{color:${C.goldBright}}`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {isNew && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", letterSpacing: 0.5, animation: "ic-newpulse 1.8s ease-in-out infinite" }}>🆕 חדש</span>
          )}
          <VerifiedBadge variant={badgeVariant} size={15} />
          {badgeVariant === "ai" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3ea6ff", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>
              🤖 נוצר ע״י AI
            </span>
          )}
          {insight.created_at && (
            <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>
              · {timeAgoHe(insight.created_at)}
            </span>
          )}
          {!!numbers.length && (
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
              {numbers.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>
        <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>
          {insight.title}
        </div>
      </div>
      <span style={{ color: C.gold, fontSize: 18, flex: "0 0 auto", marginTop: 2 }}>
        {ext ? "↗" : (open ? "▴" : "▾")}
      </span>
    </div>
  );

  const cardStyle = {
    textAlign: "right", width: "100%",
    background: C.surface2, border: `1px solid ${C.border}`,
    borderInlineStart: `3px solid ${badgeVariant === "ai" ? "#3ea6ff" : C.gold}`,
    borderRadius: 12, padding: "16px 18px",
  };

  // קישור חיצוני → פתיחה בלשונית חדשה (נדיר)
  if (ext) {
    return <a href={ext} target="_blank" rel="noreferrer" style={{ ...cardStyle, display: "block", textDecoration: "none", cursor: "pointer" }}>{head}</a>;
  }

  return (
    <div style={cardStyle}>
      <div onClick={toggle} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        style={{ cursor: "pointer" }}>
        {head}
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {slug ? (
            loadingPost ? (
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, padding: "8px 0" }}>טוען את הפוסט…</div>
            ) : post ? (
              <>
                <div className="ic-postbody" dangerouslySetInnerHTML={{ __html: cleanContent(post.content) }} />
                <div style={{ marginTop: 14 }}>
                  <Link to={`/${slug}`} style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                    לפוסט המלא →
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14 }}>
                <Link to={`/${slug}`} style={{ color: C.goldBright }}>פתח את הפוסט →</Link>
              </div>
            )
          ) : (
            <>
              {insight.body && (
                <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 10px" }}>{insight.body}</p>
              )}
              {insight.proof && (
                <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, margin: "0 0 10px" }}>
                  <strong style={{ color: C.gold }}>הוכחה: </strong>{insight.proof}
                </p>
              )}
              {!!phrases.length && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {phrases.map((p, i) => (
                    <span key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.goldLight, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 10px" }}>{p}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
