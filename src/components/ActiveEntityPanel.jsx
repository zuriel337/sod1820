import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { on, emit, EVENTS } from "../lib/research/eventBus.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";

// 🎯 הישות הפעילה — הפאנל ההקשרי בצד ימין של ההיכל (research_workspace_law: «הפאנלים מאזינים ל-Bus»).
// כל כלי משדר ENTITY_FOCUS על מה שבמוקד → כאן מוצג הפירוק, חי. שני מצבים:
//   • מילה  → כל שיטות הגימטריה (17+).
//   • מספר  → «מגדל בקרה»: תעודת-זהות (שורש·תכונות·מד) + ניווט-מקטעים (קפיצה בדף) + פעולות.
const ALL = [...METHODS, ...DEPTH_METHODS];

const digitRoot = n => { let x = Math.abs(Math.trunc(Number(n))) || 0; while (x >= 10) x = String(x).split("").reduce((a, d) => a + (+d), 0); return x; };
const factorize = n => { n = Math.abs(Math.trunc(Number(n))); if (n < 2) return []; const f = []; let d = 2, m = n; while (d * d <= m) { while (m % d === 0) { f.push(d); m /= d; } d++; } if (m > 1) f.push(m); return f; };
const triK = n => { if (n < 1) return 0; const k = Math.floor((Math.sqrt(8 * n + 1) - 1) / 2); return k * (k + 1) / 2 === n ? k : 0; };

function NumberTower({ ent }) {
  const v = Number(ent.value) || 0;
  const facts = factorize(v);
  const prime = facts.length === 1 && v >= 2;
  const sq = Number.isInteger(Math.sqrt(v)) && v > 0 ? Math.sqrt(v) : 0;
  const tri = triK(v);
  const chips = [];
  if (prime) chips.push("ראשוני");
  if (tri) chips.push(`משולש · T${tri}`);
  if (sq) chips.push(`ריבוע · ${sq}²`);
  const factStr = facts.length > 1 ? facts.join(" × ") : (prime ? "ראשוני" : "—");
  const meter = typeof ent.meter === "number" ? Math.max(0, Math.min(100, Math.round(ent.meter))) : null;
  const c = ent.counts || {};
  const nav = [
    { id: "words", e: "🌳", l: "מילים שוות", n: c.words },
    { id: "dna", e: "💎", l: "מד ההתכנסות", n: c.topics },
    { id: "galleries", e: "🖼", l: "תמונות", n: c.galleries },
    { id: "posts", e: "📖", l: "פוסטים", n: c.posts },
    { id: "roots", e: "🌱", l: "שורשי המספר", n: null },
  ];
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span>🎯 המספר הפעיל</span></div>
      <div className="rw-pb">
        {/* תעודת-זהות */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "var(--ink,#1b1d22)", fontFamily: "ui-monospace,monospace" }}>{v.toLocaleString("he")}</div>
        </div>
        <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
          <div style={row}><span style={rowL}>שורש הספרות</span><b>{digitRoot(v)}</b></div>
          <div style={row}><span style={rowL}>פירוק לגורמים</span><b style={{ fontFamily: "ui-monospace,monospace", fontSize: 12 }}>{factStr}</b></div>
          {chips.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
              {chips.map(ch => <span key={ch} style={chip}>{ch}</span>)}
            </div>
          )}
        </div>
        {/* מד ההתכנסות */}
        {meter != null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--ink2,#5b6472)", marginBottom: 4 }}>
              <span>מד ההתכנסות</span><b style={{ color: "var(--acc,#2f6df6)" }}>{meter}</b>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: "var(--chip,#eef1f6)", overflow: "hidden" }}>
              <div style={{ width: `${meter}%`, height: "100%", background: "linear-gradient(90deg,#2f6df6,#7aa5ff)" }} />
            </div>
          </div>
        )}
        {/* ניווט-מקטעים — קופץ בדף הארוך */}
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink3,#8a94a6)", letterSpacing: 0.5, margin: "2px 0 6px" }}>קפיצה למקטע</div>
        <div style={{ display: "grid", gap: 5 }}>
          {nav.map(s => (
            <button key={s.id} onClick={() => emit(EVENTS.ENTITY_SECTION, s.id)} style={navBtn} title={`עבור אל «${s.l}»`}>
              <span>{s.e} {s.l}</span>
              {s.n != null && <span style={{ color: "var(--acc,#2f6df6)", fontWeight: 800, fontFamily: "ui-monospace,monospace" }}>{s.n}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WordMethods({ ent }) {
  const rows = ALL.map(m => ({ label: m.he || m.label || m.key, value: m.fn(ent.word) })).filter(r => Number.isFinite(r.value));
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span>🎯 הישות הפעילה</span></div>
      <div className="rw-pb">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink,#1b1d22)", lineHeight: 1.3 }} dir="rtl">{ent.title}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--acc,#2f6df6)", marginTop: 2 }}>ערך רגיל: {ent.value}</div>
        </div>
        {rows.length > 0 && (
          <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 4, marginBottom: 10 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ ...row, background: "var(--chip,#f2f4f8)" }}>
                <span style={rowL}>{r.label}</span>
                <b style={{ fontFamily: "ui-monospace,monospace" }}>{r.value}</b>
              </div>
            ))}
          </div>
        )}
        <Link to={`/number/${encodeURIComponent(ent.value)}`} className="rw-tchip on" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "9px" }}>
          🔢 דף המספר {ent.value} ←
        </Link>
      </div>
    </div>
  );
}

const row = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "5px 8px", borderRadius: 8, color: "var(--ink,#1b1d22)" };
const rowL = { color: "var(--ink2,#5b6472)", fontWeight: 700 };
const chip = { fontSize: 11, fontWeight: 800, color: "var(--acc,#2f6df6)", background: "var(--accS,#eef3ff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 999, padding: "2px 9px" };
const navBtn = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%", cursor: "pointer", textAlign: "start", background: "var(--card,#fff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontWeight: 700, color: "var(--ink,#1b1d22)", fontFamily: "inherit" };

export default function ActiveEntityPanel() {
  const [ent, setEnt] = useState(null);
  useEffect(() => {
    const offF = on(EVENTS.ENTITY_FOCUS, e => e && setEnt(e));
    const offB = on(EVENTS.ENTITY_BLUR, () => setEnt(null));
    return () => { offF(); offB(); };
  }, []);

  if (!ent) return null;
  const isNum = ent.kind === "number" || (!ent.word && /^\d+$/.test(String(ent.value)));
  const hasWord = ent.word && /[א-ת]/.test(ent.word);
  return isNum && !hasWord ? <NumberTower ent={ent} /> : <WordMethods ent={ent} />;
}
