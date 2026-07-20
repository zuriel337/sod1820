import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { getForumFeed, forumItemMeta } from "../lib/contributions.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";

// 🌐 «פעולה אחרונה מהפורום» — רצועה גלובלית דקה בראש הפוטר, על כל דף.
// מקור-אמת יחיד: getForumFeed(limit:1). התצוגה דרך forumItemMeta הקנוני (contributions.js),
// ולכן היא ⭐ עמידה-לעתיד: כל סוג-פריט חדש שהפורום יקבל — «ערוץ», «רעיון», או כל דבר —
// יוצג כאן אוטומטית עם ברירת-מחדל, בלי שינוי ברכיב הזה ובלי «Invalid Date».
export default function ForumLastStrip() {
  const cc = chromeColors(useThemeMode());
  const { pathname } = useLocation();
  const [it, setIt] = useState(null);
  useEffect(() => {
    let alive = true;
    getForumFeed({ limit: 1 }).then(f => { if (alive) setIt((f && f[0]) || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // מוסתר בעמוד הפורום עצמו (כפילות) ובצ'אט (טיקר משלו)
  if (!it || pathname.startsWith("/forum") || pathname.startsWith("/community/chat")) return null;

  const m = forumItemMeta(it);
  const when = timeAgoHe(m.when);
  const text = stripHtml(m.text).slice(0, 80) || m.label;
  return (
    <Link to={m.href} aria-label="הפעולה האחרונה בפורום"
      style={{
        display: "flex", alignItems: "center", gap: 9, maxWidth: 1040, margin: "0 auto 20px",
        padding: "9px 15px", borderRadius: 999, textDecoration: "none", direction: "rtl", flexWrap: "wrap",
        background: cc.social, border: `1px solid ${cc.footBorder}`,
      }}>
      <span style={{ color: cc.goldBright, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" }}>🌐 מהפורום</span>
      <span style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{m.em} {m.label}</span>
      <span style={{ color: cc.muted, opacity: 0.55 }}>·</span>
      <span style={{ color: cc.goldDim, fontFamily: F.body, fontSize: 12.5, flex: 1, minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
      <span style={{ color: cc.muted, fontFamily: F.heading, fontSize: 11, whiteSpace: "nowrap" }}>✍️ {m.who}{when ? ` · ${when}` : ""}</span>
      <span style={{ color: cc.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>←</span>
    </Link>
  );
}
