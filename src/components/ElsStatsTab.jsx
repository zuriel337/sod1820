import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { supabase } from "../lib/supabase.js";

// 📊 דשבורד הצופן (ELS) — עדשה עשירה על visitor_events דרך RPC els_analytics (אדמין-בלבד).
// מי · מה · כמה · באיזה היקף · מתי (שעות שיא) · עומק-מעורבות · מרחקי-דילוג · מיילים (למי שניתן לזהות).
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", blue: "#2f6df6", green: "#2f8f5b", purple: "#7c4dff" };

const Stat = ({ n, label, color }) => (
  <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 14, padding: "13px 16px", minWidth: 96, textAlign: "center", flex: "1 0 96px" }}>
    <div style={{ color: color || L.ink, fontFamily: "'Courier New', monospace", fontSize: 26, fontWeight: 800 }}>{(n ?? 0).toLocaleString("he")}</div>
    <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12, marginTop: 2 }}>{label}</div>
  </div>
);

// גרף-עמודות מיני (רשימת {label,n})
function Bars({ data, color = L.blue, fmt = x => x }) {
  const max = Math.max(1, ...data.map(d => d.n));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90, overflowX: "auto", paddingBottom: 2 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 26 }} title={`${fmt(d.label)}: ${d.n}`}>
          <span style={{ color: L.sub, fontFamily: "'Courier New',monospace", fontSize: 10 }}>{d.n}</span>
          <div style={{ width: 18, height: `${Math.round((d.n / max) * 62)}px`, minHeight: 3, background: color, borderRadius: "4px 4px 0 0" }} />
          <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10, whiteSpace: "nowrap" }}>{fmt(d.label)}</span>
        </div>
      ))}
    </div>
  );
}

const Panel = ({ title, children }) => (
  <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px", marginBottom: 16 }}>
    <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 11 }}>{title}</div>
    {children}
  </div>
);

export default function ElsStatsTab() {
  const [d, setD] = useState(null);
  const [days, setDays] = useState(30);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    setD(null); setErr(false);
    if (!supabase) { setErr(true); return; }
    supabase.rpc("els_analytics", { p_days: days })
      .then(({ data, error }) => { if (live) { if (error) setErr(true); else setD(data || {}); } })
      .catch(() => { if (live) setErr(true); });
    return () => { live = false; };
  }, [days]);

  const selector = (
    <select value={days} onChange={e => setDays(+e.target.value)} style={{ fontFamily: F.body, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.card, color: L.ink }}>
      <option value={1}>24 שעות</option><option value={7}>7 ימים</option><option value={30}>30 יום</option><option value={90}>90 יום</option>
    </select>
  );

  if (err) return <div style={{ color: "#b03030", fontFamily: F.body, padding: 20 }}>שגיאה בטעינת האנליטיקה.</div>;
  if (d === null) return <div style={{ color: L.sub, fontFamily: F.body, padding: 20 }}>טוען…</div>;

  const eng = d.engagement || {};
  const dailyBars = (d.daily || []).map(x => ({ label: x.d, n: x.n }));
  const hourBars = (d.by_hour || []).map(x => ({ label: x.h, n: x.n }));
  const skips = d.skips || [];
  const terms = d.top_terms || [];
  const recent = d.recent || [];

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, margin: 0, flex: 1 }}>
          📊 <b style={{ color: L.ink }}>הצופן התנ״כי</b> — מי חיפש, מה, כמה, באיזה היקף ומתי.
        </p>
        {selector}
      </div>

      {/* מדדים ראשיים */}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat n={d.total} label="סה״כ חיפושים" color={L.gold} />
        <Stat n={d.regular} label="רגיל" />
        <Stat n={d.cross} label="מוצלב" color={L.blue} />
        <Stat n={d.unique_visitors} label="גולשים ייחודיים" color={L.green} />
        <Stat n={d.returning} label="חוזרים" color={L.purple} />
        <Stat n={d.with_email} label="מזוהים (מייל)" color={L.gold} />
      </div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat n={d.scope?.torah} label="בתורה" />
        <Stat n={d.scope?.tanakh} label="בכל התנ״ך" />
        <Stat n={eng.one} label="חד-פעמיים" />
        <Stat n={eng.few} label="2–3 חיפושים" />
        <Stat n={eng.power} label="כוח (4+)" color={L.purple} />
      </div>

      {dailyBars.length > 0 && <Panel title="📈 חיפושים לאורך זמן"><Bars data={dailyBars} color={L.gold} /></Panel>}
      {hourBars.length > 0 && <Panel title="🕐 שעות שיא (לפי שעה ביום)"><Bars data={hourBars} color={L.blue} fmt={h => `${h}:00`} /></Panel>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <Panel title="🔝 המונחים המבוקשים · לחיצה = דף המספר">
          {terms.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין.</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {terms.map((t, i) => (
                <Link key={i} to={`/number/${encodeURIComponent(t.term)}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 13px", textDecoration: "none" }}>
                  <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{t.term}</span>
                  <span style={{ background: "#fbf3da", color: L.gold, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{t.n}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="↔️ מרחקי-הדילוג המבוקשים">
          {skips.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין.</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {skips.map((s, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 13px" }}>
                  <span style={{ color: L.ink, fontFamily: "'Courier New',monospace", fontSize: 13.5, fontWeight: 700 }}>דילוג {s.skip}</span>
                  <span style={{ background: "#eef3ff", color: L.blue, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{s.n}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="🕒 חיפושים אחרונים">
        <div style={{ display: "grid", gap: 7 }}>
          {recent.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין.</div> : recent.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontFamily: F.body, fontSize: 13.5 }}>
              <span style={{ color: L.ink, fontWeight: 700 }}>{r.term || "—"}</span>
              <span style={{ color: r.type === "cross_search" ? L.blue : L.sub, fontSize: 12 }}>{r.type === "cross_search" ? "🔀 מוצלב" : "רגיל"}</span>
              {r.scope === "tanakh" && <span style={{ color: L.sub, fontSize: 12 }}>· כל התנ״ך</span>}
              {r.skip && r.skip !== "0" ? <span style={{ color: L.sub, fontSize: 12 }}>· דילוג {r.skip}</span> : null}
              {r.email && <span style={{ color: L.green, fontSize: 11.5, fontFamily: "'Courier New',monospace" }} dir="ltr">✉ {r.email}</span>}
              <span style={{ color: L.sub, fontSize: 11, marginInlineStart: "auto" }}>{r.at ? timeAgoHe(r.at) : ""}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
