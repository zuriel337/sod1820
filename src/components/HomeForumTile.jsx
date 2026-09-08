import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getForumFeed, forumItemMeta } from "../lib/contributions.js";
import { stripHtml } from "../lib/format.js";
import { track } from "../lib/tracking.js";
import { useFeatureState } from "./MaintenanceLock.jsx";
import FeatureClosedNotice from "./FeatureClosedNotice.jsx";

// 📊 מדידת «כניסה לפורום מעמוד-הבית» — כל קישור-פורום בכרטיס פולט event אחיד (home_cta_click).
const trackForumFromHome = (where) => { try { track("forum", "home", "home_cta_click", { where }); } catch { /* noop */ } };

// 💬 «מהפורום» — מקור-אמת: getForumFeed + מצב-יכולת קנוני מ-site_flags.
// כשהפורום סגור לצופה: אפס fetch, ובמקום להיעלם מוצג סטטוס «סגור · בבנייה».
export default function HomeForumTile() {
  const P = usePalette();
  const forum = useFeatureState("lock_forum");
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (forum.loading || forum.blocked) return;
    let alive = true;
    getForumFeed({ limit: 3 }).then(f => { if (alive) setItems(Array.isArray(f) ? f.slice(0, 3) : []); }).catch(() => {});
    return () => { alive = false; };
  }, [forum.loading, forum.blocked]);

  if (forum.loading) return null;
  if (forum.blocked) return <FeatureClosedNotice state={forum} title="פורום המחקר" to="/forum" compact />;

  return (
    <div style={{
      marginTop: 12, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "12px 15px",
      maxWidth: "100%", overflow: "hidden", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: items.length ? 9 : 0 }}>
        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>🌐 מהפורום</span>
        <Link to="/forum" onClick={() => trackForumFromHome("all")} style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>כל הפורום ←</Link>
        <Link to="/forum?write=1" onClick={() => trackForumFromHome("write")} style={{
          marginInlineStart: "auto", whiteSpace: "nowrap", textDecoration: "none", background: P.accentBtn, color: P.onAccent,
          fontFamily: F.heading, fontWeight: 800, fontSize: 12, borderRadius: 999, padding: "7px 14px",
        }}>✍️ שתפו חידוש ←</Link>
      </div>

      {items.length ? (
        <div style={{ display: "grid", gap: 2, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {items.map((it, i) => {
            const m = forumItemMeta(it);
            const text = stripHtml(m.text || "").slice(0, 70) || m.label;
            return (
              <Link key={it.id || i} to={m.href} onClick={() => trackForumFromHome("item")} style={{
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
