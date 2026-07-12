// 🔬 ממצאים — שכבת-המעבדה של לולאת-האימות (relation_evidence). המנוע מגלה, צוריאל מאשר/דוחה.
// "ממצא" (לא "עדות") — מינוח שקבע צוריאל. כולל המלצות-כיוון לפי שיטה (אתבש/מסתתר/מילוי/אלבם/קדמי).
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getRelationEvidenceStats, discoverRelationCandidates, listRelationEvidence, setRelationEvidence, getMethodSemantics } from "../lib/supabase.js";

const METHOD_FILTERS = [null, "אתבש", "אלבם", "מסתתר", "מילוי", "קדמי"];
const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800, fontFamily: F.heading });

export default function FindingsTab() {
  const [stats, setStats] = useState([]);
  const [sem, setSem] = useState({});
  const [method, setMethod] = useState(null);
  const [cands, setCands] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [st, cd, cf, sm] = await Promise.all([
      getRelationEvidenceStats(),
      discoverRelationCandidates(method, 40),
      listRelationEvidence("confirmed", 30),
      getMethodSemantics(),
    ]);
    setStats(st); setCands(cd.filter(c => !c.already_logged)); setConfirmed(cf); setSem(sm);
    setLoading(false);
  }, [method]);
  useEffect(() => { load(); }, [load]);

  const relLabel = (m) => sem[m] ? `${sem[m].emoji} ${sem[m].label_he}` : m;

  const decide = async (c, status) => {
    const key = `${c.method}|${c.a_phrase}|${c.b_phrase}`;
    setBusyKey(key); setMsg("");
    try {
      await setRelationEvidence(c.method, c.a_phrase, c.b_phrase, c.value, status);
      setCands(cs => cs.filter(x => `${x.method}|${x.a_phrase}|${x.b_phrase}` !== key));
      if (status === "confirmed") setConfirmed(cf => [{ ...c, status }, ...cf]);
      const [st] = await Promise.all([getRelationEvidenceStats()]);
      setStats(st);
    } catch (e) { setMsg("שגיאה: " + (e.message || e).toString().slice(0, 120)); }
    setBusyKey(null);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* גוף-הראיות פר-יחס */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 17, fontWeight: 800 }}>🔬 ממצאים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>המנוע מגלה — אתה מאשר. כל אישור מגדיל את גוף-הראיות של היחס.</div>
          <button onClick={load} disabled={loading} style={{ marginInlineStart: "auto", cursor: "pointer", background: "transparent", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 8, padding: "5px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5 }}>↻ רענן</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {stats.length ? stats.map((s, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px" }}>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>
                {(Object.values(sem).find(x => x.relation_type === s.relation_type)?.emoji) || "•"} {Object.values(sem).find(x => x.relation_type === s.relation_type)?.label_he || s.relation_type}
              </div>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 3 }}>
                <b style={{ color: "#4caf7d" }}>{s.confirmed}</b> מאומתים · {s.candidates} בהמתנה
              </div>
            </div>
          )) : <div style={{ color: C.muted, fontSize: 13 }}>עדיין אין ממצאים רשומים — אשר את הראשונים למטה.</div>}
        </div>
      </div>

      {/* מועמדים לאישור + המלצות-כיוון לפי שיטה */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>מועמדים שהמנוע מצא</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginInlineStart: "auto" }}>
            {METHOD_FILTERS.map((m, i) => (
              <button key={i} onClick={() => setMethod(m)}
                style={{ cursor: "pointer", background: method === m ? "rgba(212,175,55,0.14)" : "transparent", border: `1px solid ${method === m ? C.borderGold : C.border}`, color: method === m ? C.goldBright : C.muted, borderRadius: 999, padding: "4px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12 }}>
                {m ? relLabel(m) : "הכל"}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div style={{ color: C.muted }}>סורק…</div> : !cands.length ? (
          <div style={{ color: C.muted, fontSize: 13 }}>אין מועמדים חדשים בשיטה הזו כרגע — המנוע ימשיך לסרוק ככל שהציר יגדל.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {cands.map((c, i) => {
              const key = `${c.method}|${c.a_phrase}|${c.b_phrase}`;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 13px" }}>
                  <span style={pill("#8a8f98")}>{relLabel(c.method)}</span>
                  <Link to={`/number/${encodeURIComponent(c.a_phrase)}`} style={{ textDecoration: "none", color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>{c.a_phrase}</Link>
                  <span style={{ color: C.muted }}>↔</span>
                  <Link to={`/number/${encodeURIComponent(c.b_phrase)}`} style={{ textDecoration: "none", color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>{c.b_phrase}</Link>
                  <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>({c.method} = {c.value})</span>
                  <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                    <button onClick={() => decide(c, "confirmed")} disabled={busyKey === key}
                      style={{ cursor: "pointer", background: "#4caf7d", border: "none", color: "#0d0d0f", borderRadius: 8, padding: "5px 14px", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>✓ אשר</button>
                    <button onClick={() => decide(c, "rejected")} disabled={busyKey === key}
                      style={{ cursor: "pointer", background: "transparent", border: "1px solid #e0645a", color: "#e0645a", borderRadius: 8, padding: "5px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12 }}>✗ דחה</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {msg && <div style={{ color: "#e0645a", fontSize: 12.5, marginTop: 8 }}>{msg}</div>}
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>שני הצדדים בעלי-משקל (מוביל/עולם/גרף) · הערכים מאומתים במנוע · אישור = ממצא בשכבת-הידע.</div>
      </div>

      {/* ממצאים מאושרים — מה שהמשתמש יראה בשכבת-הידע */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>✓ ממצאים מאושרים ({confirmed.length})</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {confirmed.map((c, i) => (
            <span key={i} title={c.note || ""} style={{ background: "rgba(76,175,125,0.10)", border: "1px solid rgba(76,175,125,0.5)", borderRadius: 10, padding: "5px 12px", color: C.goldLight, fontFamily: F.body, fontSize: 13 }}>
              {relLabel(c.method).split(" ")[0]} <b>{c.a_phrase}</b> ↔ <b>{c.b_phrase}</b>
            </span>
          ))}
          {!confirmed.length && <span style={{ color: C.muted, fontSize: 13 }}>עדיין אין.</span>}
        </div>
      </div>
    </div>
  );
}
