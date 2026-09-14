// G2 2029 — legacy relation_evidence projection kept READ-ONLY.
// The old set_relation_evidence writer is intentionally quiesced. Preserve historical evidence,
// stats and candidate visibility as provenance, but do not expose approve/reject actions that would
// call a frozen legacy authority. Future Human-Gate review is rebuilt over the Research OS/Truth owner.
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getRelationEvidenceStats, discoverRelationCandidates, listRelationEvidence, getMethodSemantics } from "../lib/supabase.js";

const METHOD_FILTERS = [null, "אתבש", "אלבם", "מסתתר", "מילוי", "קדמי"];
const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800, fontFamily: F.ui });

export default function FindingsTab() {
  const [stats, setStats] = useState([]);
  const [sem, setSem] = useState({});
  const [method, setMethod] = useState(null);
  const [cands, setCands] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, cd, cf, sm] = await Promise.all([
        getRelationEvidenceStats(),
        discoverRelationCandidates(method, 40),
        listRelationEvidence("confirmed", 30),
        getMethodSemantics(),
      ]);
      setStats(st || []);
      setCands((cd || []).filter(c => !c.already_logged));
      setConfirmed(cf || []);
      setSem(sm || {});
    } finally {
      setLoading(false);
    }
  }, [method]);

  useEffect(() => { load(); }, [load]);

  const relLabel = (m) => sem[m] ? `${sem[m].emoji} ${sem[m].label_he}` : m;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...box, borderColor: C.borderGold }}>
        <div style={{ color: C.goldBright, fontFamily: F.ui, fontSize: 16, fontWeight: 850, marginBottom: 6 }}>
          ⏸ שכבת הממצאים הישנה — קריאה בלבד
        </div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
          מנגנון האישור/דחייה הישן הוקפא ב־G2 כדי שלא ימשיך לכתוב ל־relation_evidence כסמכות עתידית.
          החומר הקיים והמועמדים נשמרים לעיון ול־provenance. סביבת ה־Human Gate החדשה תיבנה על Research OS ו־Truth Axes.
        </div>
      </div>

      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ color: C.goldBright, fontFamily: F.ui, fontSize: 17, fontWeight: 800 }}>🔬 ממצאים היסטוריים</div>
          <button onClick={load} disabled={loading} style={{ marginInlineStart: "auto", cursor: loading ? "wait" : "pointer", background: "transparent", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 8, padding: "5px 12px", fontFamily: F.ui, fontWeight: 700, fontSize: 12.5 }}>↻ רענן</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {stats.length ? stats.map((s, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px" }}>
              <div style={{ color: C.goldBright, fontFamily: F.ui, fontSize: 13.5, fontWeight: 800 }}>
                {(Object.values(sem).find(x => x.relation_type === s.relation_type)?.emoji) || "•"} {Object.values(sem).find(x => x.relation_type === s.relation_type)?.label_he || s.relation_type}
              </div>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 3 }}>
                <b style={{ color: "#4caf7d" }}>{s.confirmed}</b> מאומתים היסטורית · {s.candidates} מועמדים
              </div>
            </div>
          )) : <div style={{ color: C.muted, fontSize: 13 }}>אין נתוני relation_evidence להצגה.</div>}
        </div>
      </div>

      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ color: C.goldBright, fontFamily: F.ui, fontSize: 15, fontWeight: 800 }}>מועמדים — לעיון בלבד</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginInlineStart: "auto" }}>
            {METHOD_FILTERS.map((m, i) => (
              <button key={i} onClick={() => setMethod(m)}
                style={{ cursor: "pointer", background: method === m ? "rgba(212,175,55,0.14)" : "transparent", border: `1px solid ${method === m ? C.borderGold : C.border}`, color: method === m ? C.goldBright : C.muted, borderRadius: 999, padding: "4px 12px", fontFamily: F.ui, fontWeight: 700, fontSize: 12 }}>
                {m ? relLabel(m) : "הכל"}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div style={{ color: C.muted }}>טוען…</div> : !cands.length ? (
          <div style={{ color: C.muted, fontSize: 13 }}>אין מועמדים חדשים בשיטה הזו כרגע.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {cands.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 13px" }}>
                <span style={pill("#8a8f98")}>{relLabel(c.method)}</span>
                <Link to={`/number/${encodeURIComponent(c.a_phrase)}`} style={{ textDecoration: "none", color: C.goldBright, fontFamily: F.ui, fontWeight: 800, fontSize: 15 }}>{c.a_phrase}</Link>
                <span style={{ color: C.muted }}>↔</span>
                <Link to={`/number/${encodeURIComponent(c.b_phrase)}`} style={{ textDecoration: "none", color: C.goldBright, fontFamily: F.ui, fontWeight: 800, fontSize: 15 }}>{c.b_phrase}</Link>
                <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>({c.method} = {c.value})</span>
                <span style={{ marginInlineStart: "auto", color: C.muted, fontFamily: F.ui, fontSize: 11.5 }}>READ-ONLY</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.ui, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>✓ ממצאים מאושרים היסטורית ({confirmed.length})</div>
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
