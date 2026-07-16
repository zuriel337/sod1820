import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getForumFeed, intentMeta } from "../lib/contributions.js";
import { resolveAuthor } from "../lib/authors.js";
import { stripHtml } from "../lib/format.js";

// 📋 עדכונים אחרונים מהפורום — רכיב קנוני קטן (עדשה על getForumFeed, החדשים למעלה).
// מצביע: פוסט → /<slug> · תרומה → /forum. לא משכפל תוכן. ניתן להצבה בכל מקום (צ'אט, סייד-רייל…).
function ago(ts) {
  try {
    const s = (Date.now() - new Date(ts)) / 1000;
    if (s < 3600) return `לפני ${Math.max(1, Math.floor(s / 60))} דק׳`;
    if (s < 86400) return `לפני ${Math.floor(s / 3600)} שע׳`;
    if (s < 604800) return `לפני ${Math.floor(s / 86400)} ימים`;
    return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch { return ""; }
}

export default function ForumUpdatesBox({ limit = 6, style }) {
  const P = usePalette();
  const [items, setItems] = useState(null);
  useEffect(() => { getForumFeed({ limit }).then(setItems).catch(() => setItems([])); }, [limit]);

  if (items && !items.length) return null;

  return (
    <div dir="rtl" style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 15px", ...style }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📋 עדכונים אחרונים מהפורום</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginBottom: 11 }}>חידושי הקהילה ומאמרי הכתבים — החדשים למעלה</div>

      {items === null ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13, padding: "6px 0" }}>טוען…</div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {items.map((it, i) => {
            const isPost = it.kind === "post";
            const to = isPost ? `/${it.slug}` : "/forum";
            const title = stripHtml(it.title || it.body || "תרומת מחקר");
            const who = isPost ? resolveAuthor(it.author_name).name : (it.author_name || "חבר הקהילה");
            const em = isPost ? "📜" : (intentMeta(it.intent).emoji || "💡");
            const last = i === items.length - 1;
            return (
              <Link key={it.id} to={to} style={{ textDecoration: "none", display: "block", borderBottom: last ? "none" : `1px dashed ${P.border}`, paddingBottom: last ? 0 : 9 }}>
                <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, fontWeight: 700, lineHeight: 1.55, marginBottom: 3 }}>
                  {em} {title.length > 66 ? title.slice(0, 66) + "…" : title}
                </div>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>{who} · {ago(it.ts)}</div>
              </Link>
            );
          })}
        </div>
      )}

      <Link to="/forum" style={{ display: "inline-block", marginTop: 11, color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>לכל הפורום ←</Link>
    </div>
  );
}
