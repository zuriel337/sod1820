import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getForumFeed, forumItemMeta } from "../lib/contributions.js";
import { stripHtml } from "../lib/format.js";

// 💬 «מהפורום» — שורה אחת עם ההודעה האחרונה בפורום (→ /forum), וגם המקום הקנוני שמפנה
// לכתוב חידוש בבית המדרש (החלטת צוריאל). מקור-אמת יחיד: getForumFeed(limit:1) + forumItemMeta.
export default function HomeForumTile() {
  const P = usePalette();
  const [it, setIt] = useState(null);
  useEffect(() => {
    let alive = true;
    getForumFeed({ limit: 1 }).then(f => { if (alive) setIt((f && f[0]) || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const m = it ? forumItemMeta(it) : null;
  const text = m ? (stripHtml(m.text || "").slice(0, 64) || m.label) : "";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12,
      background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "11px 15px",
    }}>
      <Link to={m ? m.href : "/forum"} style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 200, textDecoration: "none" }}>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>🌐 מהפורום</span>
        {m
          ? <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {m.em} {text} <span style={{ color: P.accentDim }}>· ✍️ {m.who}</span>
            </span>
          : <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13 }}>הצטרפו למחקר הקהילתי</span>}
      </Link>
      <Link to="/beit-midrash" style={{
        whiteSpace: "nowrap", textDecoration: "none", background: P.accentBtn, color: P.onAccent,
        fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, borderRadius: 999, padding: "8px 16px",
      }}>
        ✍️ כתוב חידוש ←
      </Link>
    </div>
  );
}
