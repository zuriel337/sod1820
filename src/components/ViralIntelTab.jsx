import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// 🔥 ויראליות — אילו שיתופים *באמת הביאו אנשים*, מי השגרירים, ועומק ההתפשטות.
// מקור: RPC viral_report() על visitor_events (share / arrival עם rid).
const dec = s => { try { return decodeURIComponent(s || ""); } catch { return s || ""; } };

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const th = { color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, textAlign: "right", padding: "9px 12px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" };
const td = { color: C.muted, fontFamily: F.body, fontSize: 13.5, padding: "9px 12px", borderBottom: `1px solid ${C.faint}` };

function Stat({ label, value, hint }) {
  return (
    <div style={{ ...box, flex: "1 1 150px", textAlign: "center" }}>
      <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 30 }}>{value}</div>
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, marginTop: 4 }}>{label}</div>
      {hint && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: 4, opacity: 0.8 }}>{hint}</div>}
    </div>
  );
}

export default function ViralIntelTab() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    if (!supabase) { setErr("אין חיבור"); return; }
    supabase.rpc("viral_report").then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(error.message); else setData(data);
    });
    return () => { alive = false; };
  }, []);

  if (err) return <div style={{ color: "#d98a92", fontFamily: F.body, padding: 20 }}>שגיאה: {err}</div>;
  if (!data) return <div style={{ color: C.muted, fontFamily: F.body, padding: 20 }}>טוען…</div>;

  const t = data.totals || {};
  const posts = data.posts || [];
  const amb = data.ambassadors || [];

  return (
    <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
        🔥 <b style={{ color: C.goldBright }}>מנוע הויראליות</b> — כל שיתוף נושא <code>rid</code>; כשמישהו נכנס דרכו נספר «הגעה».
        כך רואים אילו פוסטים <b>מדבקים</b> (מביאים אנשים), מי השגרירים, וכמה «דור שני» (הגיעו דרך שיתוף ואז שיתפו בעצמם).
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="שיתופים" value={(t.shares || 0).toLocaleString("he-IL")} hint="לחיצות שיתוף" />
        <Stat label="הגעות משיתוף" value={(t.arrivals || 0).toLocaleString("he-IL")} hint="נכנסו דרך קישור משותף" />
        <Stat label="מפיצי דור-2" value={(t.rebroadcasters || 0).toLocaleString("he-IL")} hint="הגיעו ואז שיתפו בעצמם" />
        <Stat label="מקדם ויראלי" value={t.shares ? ((t.arrivals || 0) / t.shares).toFixed(2) : "—"} hint="הגעות לכל שיתוף" />
      </div>

      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📈 הפוסטים הכי מדבקים</div>
        {posts.length === 0 ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עוד אין מספיק נתונים — יתמלא אחרי פריסה ושיתופים אמיתיים.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <thead><tr><th style={th}>פוסט</th><th style={th}>שיתופים</th><th style={th}>הגעות</th><th style={th}>יחס</th></tr></thead>
              <tbody>
                {posts.map((p, i) => {
                  const hot = p.ratio >= 1;
                  return (
                    <tr key={i}>
                      <td style={{ ...td, color: C.goldLight, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldLight, textDecoration: "none" }}>{dec(p.slug)}</a>
                      </td>
                      <td style={{ ...td, fontFamily: F.mono }}>{p.shares}</td>
                      <td style={{ ...td, fontFamily: F.mono }}>{p.arrivals}</td>
                      <td style={{ ...td, fontFamily: F.mono, color: hot ? "#7ee0a0" : C.muted, fontWeight: hot ? 800 : 400 }}>{hot ? "🔥 " : ""}{p.ratio ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>👑 השגרירים (הביאו הכי הרבה אנשים)</div>
        {amb.length === 0 ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עוד אין הגעות מיוחסות.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {amb.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "6px 14px" }}>
                <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>{a.brought}</span>
                <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>· {a.rid}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
