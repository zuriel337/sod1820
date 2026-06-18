import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { getSearchFeed, adminAddWord } from "../lib/supabase.js";
import { getQualityDiscoveries } from "../lib/engine.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useSubscribed } from "./SubscribeGate.jsx";

// טאב מלא — כל החיפושים (דרגות לפי משתמש) + תגליות איכותיות + כפתור אדמין "➕ למאגר".
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", green: "#2f8f5b" };

// מיפוי שיטות → עמודות מאגר (לחישוב הערכים מהמנוע לפני הוספה)
const KEYMAP = { "רגיל": "ragil", "מסתתר": "misratar", "מילוי": "miluy", "קדמי": "kadmi", "גדול": "gadol", "סידורי": "siduri", "אתבש": "atbash", "אלבם": "albam", "ריבוע": "ribua", "ריבוע גדול": "ribua_gadol", "הכפלה": "hakpala", "הכפלה גדולה": "hakpala_gadol", "מילוי דמילוי": "miluy_demiluy" };
function computeVals(term) {
  const v = {};
  [...METHODS, ...DEPTH_METHODS].forEach(m => { const col = KEYMAP[m.key]; if (col) { try { v[col] = m.fn(term); } catch { /* ignore */ } } });
  return v;
}

export default function SearchesTab() {
  const { user, profile } = useAuth();
  const subscribed = useSubscribed();
  const isAdmin = profile?.role === "admin";
  const tier = isAdmin ? "admin" : subscribed ? "sub" : user ? "user" : "anon";
  const [rows, setRows] = useState([]);
  const [disc, setDisc] = useState([]);
  const [added, setAdded] = useState({}); // term → 'added'|'exists'|'busy'|'error'

  useEffect(() => {
    let live = true;
    getSearchFeed(tier).then(r => { if (live) setRows(r); }).catch(() => {});
    getQualityDiscoveries(6).then(d => { if (live) setDisc(d); }).catch(() => {});
    return () => { live = false; };
  }, [tier]);

  async function add(term) {
    if (added[term] === "busy" || added[term] === "added") return;
    setAdded(a => ({ ...a, [term]: "busy" }));
    const res = await adminAddWord(term, computeVals(term));
    setAdded(a => ({ ...a, [term]: res }));
  }
  const addLabel = s => s === "added" ? "✓ נוסף" : s === "exists" ? "כבר במאגר" : s === "busy" ? "…" : s === "error" || s === "denied" ? "שגיאה" : "➕ למאגר";

  return (
    <div style={{ direction: "rtl" }}>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, marginBottom: 16 }}>
        כל מה שנחקר באתר — חי. {isAdmin ? "כאדמין אתה רואה הכל ויכול להוסיף מילים למאגר הראשי." : tier === "anon" ? "הירשמו כדי לראות עוד." : "מנויים רואים יותר היסטוריה."}
      </p>

      {disc.length > 0 && (
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px", marginBottom: 18 }}>
          <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 11 }}>✨ נחקר ונמצא מעניין</div>
          <div style={{ display: "grid", gap: 9 }}>
            {disc.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <Link to={`/number/${encodeURIComponent(d.term)}`} style={{ textDecoration: "none", color: L.ink, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700 }}>{d.term}</Link>
                <span style={{ color: L.gold, fontFamily: "'Courier New', monospace", fontSize: 14.5, fontWeight: 800 }}>= {d.value}</span>
                <span style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5 }}>· {d.reason}</span>
                {isAdmin && <button onClick={() => add(d.term)} style={adminBtn(added[d.term])}>{addLabel(added[d.term])}</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px" }}>
        <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 11 }}>🕒 כל החיפושים האחרונים</div>
        {rows.length === 0 ? (
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>טוען…</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 12px" }}>
                <Link to={`/number/${encodeURIComponent(r.term)}`} style={{ textDecoration: "none", color: L.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{r.term}</Link>
                {r.value != null && <span style={{ background: "#fbf3da", color: L.gold, fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{r.value}</span>}
                {r.at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>· {timeAgoHe(r.at)}</span>}
                {isAdmin && <button onClick={() => add(r.term)} style={adminBtn(added[r.term])}>{addLabel(added[r.term])}</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const adminBtn = s => ({
  cursor: s === "added" || s === "busy" ? "default" : "pointer",
  background: s === "added" ? "#e7f6ec" : "#fbf3da",
  color: s === "added" ? "#2f8f5b" : "#7a5e12",
  border: `1px solid ${s === "added" ? "#bfe3cb" : "#e7dfcc"}`,
  borderRadius: 999, fontFamily: "'Heebo', sans-serif", fontSize: 12, fontWeight: 700, padding: "3px 11px",
});
