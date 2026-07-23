import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getContributorsFeed } from "../lib/contributions.js";
import { genAvatar } from "../lib/avatar.js";
import { formatDateHe } from "../lib/format.js";

// 📁 «כתבים שהתעדכנו» — זרם-עדכונים כמו הפורום/הערוצים: כל דף-כתב שמתעדכן עולה למעלה,
// עם תאריך + ספירת פריטים (🔠 צפנים · 📱 ממצאים · 📝 פוסטים). מקור אחד: contributors_feed() RPC.
// כל כרטיס מקשר לעמוד הקנוני /community/researcher/:slug (עץ אחד, לא משכפל).
export default function ContributorsUpdatesRail({ limit = 12 }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);

  useEffect(() => { let a = true; getContributorsFeed(limit).then(r => a && setRows(r || [])).catch(() => a && setRows([])); return () => { a = false; }; }, [limit]);

  if (rows === null || !rows.length) return null;

  const chip = (icon, n) => n > 0 ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{icon} {n.toLocaleString("he-IL")}</span>
  ) : null;

  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>📁 כתבים שהתעדכנו</span>
        <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}>הדפים המתעדכנים — החדש למעלה ({rows.length})</span>
        <Link to="/community/whatsapp" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none", borderBottom: `1px dotted ${P.accentDim}` }}>📱 תיבת הוואטסאפ ←</Link>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
        {rows.map(r => (
          <Link key={r.slug} to={`/community/researcher/${encodeURIComponent(r.slug)}`}
            style={{ flex: "0 0 auto", width: 210, scrollSnapAlign: "start", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "12px 14px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <img src={genAvatar(r.display_name)} alt="" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, border: `1px solid ${P.border}` }} />
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.display_name}</div>
            </div>
            <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, whiteSpace: "nowrap" }}>🕐 {formatDateHe(r.last_activity)}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
              {chip("🔠", r.ciphers)}
              {chip("📱", r.findings)}
              {chip("📝", r.posts)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
