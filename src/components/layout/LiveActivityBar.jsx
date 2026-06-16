import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { getTopicCards } from "../../lib/supabase.js";
import { topicTag } from "../../lib/topicCards.js";

// שורת "חדשות בית המדרש" העליונה — מזרימה את ציר ההתכנסות החדש (כרטיסים מאושרים),
// מתעדכן אוטומטית בכל פעם שמאשרים/מעדכנים כרטיס. נופל לברכות אם אין עדיין כרטיסים.
const FALLBACK = [
  "🛠️ האתר בהקמה — ייתכנו עדיין תקלות",
  "ברוכים הבאים לעולם החדש",
  "המסע כבר החל — ובכל יום מתווספים עולמות, כלים ותגליות",
  "✨ עדכונים נוספים וחדשים בקרוב",
];

export default function LiveActivityBar() {
  const [items, setItems] = useState(null); // [{text, to}] | null
  const [count, setCount] = useState(0);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cards => {
      if (!live) return;
      const sorted = (cards || []).slice().sort((a, b) =>
        new Date(b.approved_at || b.created_at) - new Date(a.approved_at || a.created_at));
      setCount(sorted.length);
      const its = sorted.map(c => {
        const tag = topicTag(c);
        const prefix = tag ? `${tag.icon} ${tag.label}` : "✨ התגלות חדשה";
        const nums = (c.highlight_numbers || []).length ? " · " + c.highlight_numbers.join(" · ") : "";
        return { to: `/topic/${encodeURIComponent(c.slug)}`, text: `${prefix}: ${c.title}${nums}` };
      });
      setItems(its);
    }).catch(() => setItems([]));
    return () => { live = false; };
  }, []);

  const list = items && items.length ? items : FALLBACK.map(text => ({ text, to: null }));

  useEffect(() => {
    setIdx(0);
    if (list.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = list[idx % list.length];

  return (
    <div style={{ direction: "rtl", background: "rgba(10,7,2,0.9)", borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "7px 18px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
        <Link to="/beit-midrash" style={{
          display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
          fontSize: 11, fontWeight: 800, letterSpacing: 1, color: C.goldBright,
          fontFamily: F.heading, border: `1px solid ${C.borderGold}`, borderRadius: 5,
          padding: "2px 8px", whiteSpace: "nowrap", background: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4))",
        }}>📚 חדשות בית המדרש{count ? ` · ${count} גילויים` : ""}</Link>
        {cur.to ? (
          <Link key={idx} to={cur.to} style={{
            color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 500, textDecoration: "none",
            animation: "activity-fade 5s ease-in-out", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{cur.text}</Link>
        ) : (
          <span key={idx} style={{
            color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 500,
            animation: "activity-fade 5s ease-in-out", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{cur.text}</span>
        )}
      </div>
    </div>
  );
}
