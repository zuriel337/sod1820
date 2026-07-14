import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { supabase } from "../lib/supabase.js";

// 📊 דשבורד הצופן (ELS) — מי חיפש · מה · כמה · באיזה היקף.
// קורא מ-visitor_events (section='els') — אותה אנליטיקה שהכלי כותב אליה דרך track. בלי טבלה מקבילה.
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", blue: "#2f6df6", green: "#2f8f5b" };

export default function ElsStatsTab() {
  const [rows, setRows] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!supabase) { setRows([]); return; }
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const { data, error } = await supabase
        .from("visitor_events")
        .select("visitor_id, slug, event_type, meta, created_at")
        .eq("section", "els")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (live) setRows(error ? [] : (data || []));
    })();
    return () => { live = false; };
  }, [days]);

  if (rows === null) return <div style={{ color: L.sub, fontFamily: F.body, padding: 20 }}>טוען…</div>;

  const total = rows.length;
  const cross = rows.filter(r => r.event_type === "cross_search").length;
  const regular = total - cross;
  const visitors = new Set(rows.map(r => r.visitor_id)).size;
  const scope = { torah: 0, tanakh: 0 };
  const termCount = new Map();
  for (const r of rows) {
    const sc = r.meta?.scope; if (sc === "tanakh") scope.tanakh++; else scope.torah++;
    const t = (r.slug || "").trim(); if (t) termCount.set(t, (termCount.get(t) || 0) + 1);
  }
  const topTerms = [...termCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

  const Stat = ({ n, label, color }) => (
    <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 14, padding: "14px 18px", minWidth: 120, textAlign: "center" }}>
      <div style={{ color: color || L.ink, fontFamily: "'Courier New', monospace", fontSize: 28, fontWeight: 800 }}>{n.toLocaleString("he")}</div>
      <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, margin: 0, flex: 1 }}>
          📊 <b style={{ color: L.ink }}>הצופן התנ״כי</b> — מה חיפשו הגולשים בכלי הדילוגים, כמה, ובאיזה היקף.
        </p>
        <select value={days} onChange={e => setDays(+e.target.value)} style={{ fontFamily: F.body, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.card, color: L.ink }}>
          <option value={1}>24 שעות</option>
          <option value={7}>7 ימים</option>
          <option value={30}>30 יום</option>
          <option value={90}>90 יום</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat n={total} label="סה״כ חיפושים" color={L.gold} />
        <Stat n={regular} label="חיפוש רגיל" />
        <Stat n={cross} label="חיפוש מוצלב" color={L.blue} />
        <Stat n={visitors} label="גולשים ייחודיים" color={L.green} />
        <Stat n={scope.tanakh} label="בכל התנ״ך" />
        <Stat n={scope.torah} label="בתורה" />
      </div>

      <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px", marginBottom: 18 }}>
        <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 11 }}>🔝 המונחים המבוקשים</div>
        {topTerms.length === 0 ? (
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>עדיין אין חיפושים בטווח הזה.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topTerms.map(([term, n], i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 13px" }}>
                <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{term}</span>
                <span style={{ background: "#fbf3da", color: L.gold, fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px" }}>
        <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 11 }}>🕒 חיפושים אחרונים</div>
        <div style={{ display: "grid", gap: 7 }}>
          {rows.slice(0, 60).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontFamily: F.body, fontSize: 13.5 }}>
              <span style={{ color: L.ink, fontWeight: 700 }}>{r.slug || "—"}</span>
              <span style={{ color: r.event_type === "cross_search" ? L.blue : L.sub, fontSize: 12 }}>
                {r.event_type === "cross_search" ? "🔀 מוצלב" : "רגיל"}
              </span>
              {r.meta?.scope === "tanakh" && <span style={{ color: L.sub, fontSize: 12 }}>· כל התנ״ך</span>}
              {r.meta?.skip ? <span style={{ color: L.sub, fontSize: 12 }}>· דילוג {r.meta.skip}</span> : null}
              <span style={{ color: L.sub, fontSize: 11, marginInlineStart: "auto" }}>{r.created_at ? timeAgoHe(r.created_at) : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
