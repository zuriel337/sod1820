import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { C, F } from "../../theme.js";
import { stripHtml } from "../../lib/format.js";

// שורת פעילות חיה — מתחלפת בין עדכונים אחרונים מהמערכת.
export default function LiveActivityBar() {
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = [];
      try {
        const [posts, nodes, insights] = await Promise.all([
          supabase.from("posts").select("title,slug,created_at").order("created_at", { ascending: false }).limit(4),
          supabase.from("nodes").select("label,created_at").eq("type", "event").order("created_at", { ascending: false }).limit(3),
          supabase.from("insights").select("title,body,created_at").order("created_at", { ascending: false }).limit(3),
        ]);
        (posts.data || []).forEach(p => out.push({ icon: "📜", text: `פוסט: ${stripHtml(p.title || "")}`.slice(0, 90), to: p.slug ? `/${p.slug}` : "/post", ts: p.created_at }));
        (nodes.data || []).forEach(n => out.push({ icon: "🕰", text: `תחנת תדר: ${stripHtml(n.label || "")}`.slice(0, 90), to: "/timeline", ts: n.created_at }));
        (insights.data || []).forEach(i => out.push({ icon: "💡", text: `חידוש: ${stripHtml(i.title || i.body || "")}`.slice(0, 90), to: "/beit-midrash", ts: i.created_at }));
      } catch { /* בשקט — שורת קישוט בלבד */ }
      out.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));
      if (alive) setItems(out.slice(0, 8));
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [items]);

  if (!items.length) return null;
  const cur = items[idx];

  return (
    <div style={{
      direction: "rtl", background: "rgba(10,7,2,0.9)",
      borderBottom: `1px solid ${C.border}`, overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "7px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.crimsonLight,
          fontFamily: F.heading, border: `1px solid ${C.crimson}`, borderRadius: 4,
          padding: "2px 6px", whiteSpace: "nowrap",
        }}>● חי</span>
        <Link key={idx} to={cur.to} style={{
          color: C.goldDim, textDecoration: "none", fontFamily: F.royal,
          fontSize: 13, animation: "activity-fade 4.2s ease-in-out",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          <span style={{ marginInlineEnd: 6 }}>{cur.icon}</span>{cur.text}
        </Link>
      </div>
    </div>
  );
}
