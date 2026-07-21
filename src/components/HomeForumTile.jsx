import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getForumFeed, forumItemMeta } from "../lib/contributions.js";
import { stripHtml } from "../lib/format.js";

// 💬 «מהפורום» — 3 הפריטים האחרונים בפורום (→ /forum), + המקום הקנוני שמפנה לכתוב חידוש.
// מציג 3 (לא 1) כדי לא לחפוף לכרטיס «מה חדש» שמצביע על הפריט האחרון בלבד. מקור-אמת: getForumFeed(3) + forumItemMeta.
export default function HomeForumTile() {
  const P = usePalette();
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    getForumFeed({ limit: 3 }).then(f => { if (alive) setItems(Array.isArray(f) ? f.slice(0, 3) : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div style={{
      marginTop: 12, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "12px 15px",
      maxWidth: "100%", overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* כותרת + כתיבת-חידוש */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: items.length ? 9 : 0 }}>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>🌐 מהפורום</span>
        <Link to="/forum" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>כל הפורום ←</Link>
        <Link to="/beit-midrash" style={{
          marginInlineStart: "auto", whiteSpace: "nowrap", textDecoration: "none", background: P.accentBtn, color: P.onAccent,
          fontFamily: F.heading, fontWeight: 800, fontSize: 12, borderRadius: 999, padding: "7px 14px",
        }}>✍️ שתפו חידוש ←</Link>
      </div>

      {/* 3 הפריטים האחרונים */}
      {items.length ? (
        <div style={{ display: "grid", gap: 2, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {items.map((it, i) => {
            const m = forumItemMeta(it);
            const text = stripHtml(m.text || "").slice(0, 70) || m.label;
            return (
              <Link key={it.id || i} to={m.href} style={{
                display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "7px 2px",
                borderTop: i ? `1px solid ${P.border}` : "none", minWidth: 0, overflow: "hidden",
              }}>
                <span style={{ flexShrink: 0, fontSize: 13 }}>{m.em}</span>
                <span style={{ flex: 1, minWidth: 0, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {text} <span style={{ color: P.accentDim }}>· ✍️ {m.who}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13 }}>הצטרפו למחקר הקהילתי — היו הראשונים לשתף חידוש.</span>
      )}
    </div>
  );
}
