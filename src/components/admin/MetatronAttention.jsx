// ⚖️ מטטרון — בקרה והתראות + תיבת המלצות (Attention-only slice)
// HUMAN GATE DESK v1 adds one entry button only. The existing attention/recommendation
// pipeline remains intact and source-native; /research-viewer is the unified Experience surface.
import React, { useState, useEffect, useRef } from "react";
import { F } from "../../theme.js";
import { getCommandCenter, reviewRecommendation, runMetatronRecommend } from "../../lib/visits.js";

const C = {
  goldLight: "var(--adm-goldLight)", goldBright: "var(--adm-goldBright)", goldDim: "var(--adm-goldDim)",
  surface2: "var(--adm-surface2)", border: "var(--adm-border)", muted: "var(--adm-muted)", crimsonLight: "var(--adm-crimsonLight)",
};
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", minWidth: 0, maxWidth: "100%" };
function segBtn(active) { return { cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: "none", background: active ? "rgba(212,175,55,0.22)" : "transparent", color: active ? C.goldBright : C.muted }; }
function Loading() { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען…</div>; }
function Empty({ children }) { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>{children}</div>; }

const typeBadge = (t) => ({ create_entity: ["#e0a86a", "יצירת ישות"], create_card: ["#c9a24a", "כרטיס-נושא"], write_article: ["#7fb2ff", "כתיבת פוסט"], check_convergence: ["#9bd39b", "בדיקת התכנסות"], create_journey: ["#c9a24a", "מסע מחקר"] }[t] || ["#888", t]);

export default function MetatronAttention() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [revErr, setRevErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const recRef = useRef(null);
  const scrollToRec = () => recRef.current && recRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

  const load = () => { setLoading(true); setErr(""); getCommandCenter().then(r => { setD(r); setLoading(false); }).catch(e => { setErr(e.message || "שגיאה"); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const nLink = (k) => "/number/" + encodeURIComponent(k || "");
  const review = async (id, status) => {
    setBusy(id); setRevErr("");
    try {
      const res = await reviewRecommendation(id, status);
      if (!res || res.id == null) throw new Error("לא נכתב לשרת (0 שורות עודכנו)");
      setD(prev => prev ? { ...prev, recommendations: (prev.recommendations || []).filter(r => r.id !== id), counters: { ...prev.counters, recommendations_pending: Math.max(0, (prev.counters?.recommendations_pending || 1) - 1) } } : prev);
    } catch (e) {
      setRevErr(`השמירה נכשלה — ההמלצה עדיין ממתינה, לא אושרה. נסה שוב. (${e?.message || "שגיאה"})`);
    }
    setBusy(null);
  };
  const runScan = async () => { setScanning(true); try { await runMetatronRecommend(); } catch { /* noop */ } load(); setScanning(false); };

  if (loading) return <div style={card}><Loading /></div>;
  if (err) return <div style={card}><div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, padding: 12 }}>שגיאה: {err}</div></div>;
  if (!d) return <div style={card}><Empty>אין נתונים.</Empty></div>;

  const ms = d.metatron_status || {};
  const al = ms.alerts || {}; const gp = ms.gaps || {};
  const rich = gp.rich_numbers_no_card || {};
  const alertDefs = [
    ["red", "🔴", "דחוף", "#e06666"], ["orange", "🟠", "לתשומת-לב", "#e0a86a"],
    ["yellow", "🟡", "מעקב", "#d8c860"], ["green", "🟢", "טופל", "#8bd98b"],
  ];
  const gapDefs = [
    ["🕳️", rich.ge10, "מספרים עשירים בלי כרטיס"],
    ["🔧", gp.methods_missing_from_engine, "שיטות חסרות מהמנוע"],
    ["🎴", gp.cards_approved_not_projected, "כרטיסים לא-מוקרנים"],
    ["✨", (ms.discoveries || {}).waiting, "תגליות בשולחן"],
    ["⚖️", (ms.decisions || {}).pending, "החלטות-ממשל"],
    ["📜", (ms.laws || {}).active, "חוקים פעילים"],
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, padding: 0, overflow: "hidden", border: "1px solid rgba(109,167,255,.35)", background: "linear-gradient(115deg,rgba(20,38,70,.88),rgba(28,18,8,.84))" }}>
        <a href="/research-viewer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", color: "inherit", textDecoration: "none" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 23, background: "rgba(109,167,255,.14)", border: "1px solid rgba(109,167,255,.32)" }}>⚖️</div>
          <div style={{ flex: 1 }}><div style={{ color: "#d9bd68", fontFamily: F.regal, fontSize: 20, fontWeight: 900 }}>פתח את שולחן צוריאל</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, marginTop: 3 }}>כל מה שממתין · מחקר · מאושר · עץ · בית המדרש · התכנסויות — במסך אחד</div></div>
          <div style={{ color: "#8db8ff", fontFamily: F.heading, fontWeight: 900 }}>פתח ←</div>
        </a>
      </div>

      {ms && (
        <div style={{ ...card, background: "rgba(30,20,8,0.35)", border: "1px solid rgba(224,168,106,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>⚖️ מטטרון — בקרה והתראות</span>
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>מה דורש אותך · למה · כמה חשוב</span>
            <span style={{ flex: 1 }} />
            <button onClick={runScan} disabled={scanning} style={{ ...segBtn(false), fontSize: 12, opacity: scanning ? 0.5 : 1 }}>{scanning ? "סורק…" : "🔄 סרוק פערים"}</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {alertDefs.map(([k, icon, lbl, col]) => {
              const on = (al[k] || 0) > 0 && k !== "green";
              return (
                <button key={k} onClick={scrollToRec} title="פתח → המלצות" style={{ cursor: "pointer", textAlign: "right", display: "flex", alignItems: "baseline", gap: 6, background: "rgba(8,5,2,0.4)", border: `1px solid ${on ? col : C.border}`, borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ color: col, fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{Number(al[k] || 0).toLocaleString()}</span>
                  <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>{icon} {lbl}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {gapDefs.map(([icon, val, lbl], i) => <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 5, padding: "4px 8px", color: C.goldDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7 }}>{icon} <b style={{ color: C.goldLight, fontFamily: F.mono }}>{Number(val || 0).toLocaleString()}</b> {lbl}</span>)}
          </div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5, marginTop: 8, lineHeight: 1.6 }}>«סרוק פערים» הופך מספרים-עשירים-בלי-כרטיס להמלצות-לאישור למטה.</div>
        </div>
      )}

      <div ref={recRef} style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🧠 תיבת המלצות מטטרון — מה מטטרון ממליץ</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, marginBottom: 12 }}>מטטרון מגלה ומציע — אתה מאשר. אישור המלצה הוא החלטת-שער; הוא לא מוצג כאילו הפעולה עצמה כבר בוצעה בעץ.</div>
        {revErr && <div style={{ background: "rgba(200,80,80,0.12)", border: "1px solid rgba(224,138,138,0.5)", color: "#e08a8a", borderRadius: 8, padding: "8px 11px", marginBottom: 10, fontFamily: F.body, fontSize: 12 }}>⚠️ {revErr}</div>}
        {(!d.recommendations || !d.recommendations.length) ? <Empty>אין המלצות ממתינות. ✅</Empty> : d.recommendations.map(r => {
          const [bc, bl] = typeBadge(r.type); const conf = Math.round((Number(r.confidence) || 0) * 100);
          return (
            <div key={r.id} style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", marginBottom: 10, opacity: busy === r.id ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}><span style={{ background: bc, color: "#0d0900", fontFamily: F.body, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{bl}</span><span style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 14, fontWeight: 700 }}>{r.target_entity}</span><span style={{ flex: 1 }} /><span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>ביטחון {conf}%</span></div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 8 }}><div style={{ height: "100%", width: conf + "%", background: "linear-gradient(90deg,#2f6df6,#7fb2ff)", borderRadius: 3 }} /></div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginBottom: 8 }}>{r.reason}</div>
              {r.evidence && Object.keys(r.evidence).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{Object.entries(r.evidence).map(([ek, ev]) => <span key={ek} style={{ background: "rgba(255,255,255,0.05)", color: C.muted, fontFamily: F.mono, fontSize: 10.5, borderRadius: 5, padding: "2px 7px" }}>{ek}: {String(ev)}</span>)}</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><button onClick={() => review(r.id, "approved")} disabled={busy === r.id} style={{ background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.5)", color: "#8bd98b", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: F.body, fontSize: 12.5, fontWeight: 700 }}>✅ אישור</button><button onClick={() => review(r.id, "rejected")} disabled={busy === r.id} style={{ background: "rgba(200,80,80,0.12)", border: "1px solid rgba(224,138,138,0.4)", color: "#e08a8a", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: F.body, fontSize: 12.5 }}>❌ דחייה</button>{/^\d+$/.test(r.target_entity || "") && <a href={nLink(r.target_entity)} target="_blank" rel="noreferrer" style={{ color: "#7fb2ff", fontFamily: F.body, fontSize: 12, textDecoration: "none" }}>🔗 לישות/לראיה ↗</a>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
