import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { on, emit, EVENTS } from "../lib/research/eventBus.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { getContributions, intentMeta } from "../lib/contributions.js";
import { getGematriaByValue, getGematriaCountByValue, getConvergenceForValue, proposeCommunityWord } from "../lib/supabase.js";

// 🌳 מילים שוות — מרכז-המחקר המתקדם של הערך, בטור הימני (מסך-מלא): כל הביטויים השווים,
// מד-נדירות, סינון חוצה-שיטות (רגיל/מסתתר/קדמי), «עוד», התכנסות רשומה, והצעת ביטוי חדש.
// לחיצה על ביטוי → ממקדת אותו (ENTITY_FOCUS) לראות את כל שיטותיו. מקור קנוני: getGematriaByValue.
const METHOD_TABS = [{ key: "ragil", label: "רגיל" }, { key: "misratar", label: "מסתתר" }, { key: "kadmi", label: "קדמי" }];
const methodHe = k => (METHOD_TABS.find(t => t.key === k) || {}).label || k;
function rarity(count) {
  if (count == null || count <= 0) return null;
  if (count <= 2) return { txt: "💎 נדיר מאוד", color: "#b8901f" };
  if (count <= 6) return { txt: "נדיר", color: "var(--acc,#2f6df6)" };
  if (count <= 15) return { txt: "בינוני", color: "var(--ink2,#5b6472)" };
  return { txt: "שכיח", color: "var(--ink3,#8a94a6)" };
}

function EqualPhrases({ value, activeWord }) {
  const [method, setMethod] = useState("ragil");
  const [limit, setLimit] = useState(12);
  const [list, setList] = useState(null);
  const [count, setCount] = useState(null);
  const [conv, setConv] = useState(null);
  const [proposed, setProposed] = useState(null); // null | 'sending' | ok|pending|exists|invalid|error

  useEffect(() => { setMethod("ragil"); setLimit(12); setProposed(null); }, [value]);

  useEffect(() => {
    let live = true;
    if (!value) { setList([]); setCount(0); return; }
    setList(null);
    getGematriaByValue(value, { method, limit }).then(d => { if (live) setList(d || []); }).catch(() => { if (live) setList([]); });
    getGematriaCountByValue(value, method).then(c => { if (live) setCount(c); }).catch(() => { if (live) setCount(0); });
    return () => { live = false; };
  }, [value, method, limit]);

  useEffect(() => {
    let live = true; setConv(null);
    if (value) getConvergenceForValue(value).then(c => { if (live) setConv(c); }).catch(() => { });
    return () => { live = false; };
  }, [value]);

  const rar = rarity(count);
  const inList = activeWord && (list || []).some(w => w.phrase === activeWord);
  const canPropose = method === "ragil" && activeWord && /[א-ת]/.test(activeWord) && count != null && !inList;
  const propose = async () => { setProposed("sending"); setProposed(await proposeCommunityWord(activeWord, value, "רגיל")); };

  return (
    <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--line,#e4e7ec)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink,#1b1d22)" }}>🌳 מילים שוות ל-{value}</span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {rar && <span style={{ fontSize: 10.5, fontWeight: 800, color: rar.color }}>{rar.txt}</span>}
          {count != null && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--acc,#2f6df6)", fontFamily: "ui-monospace,monospace" }}>{count}</span>}
        </span>
      </div>

      {/* #5 התכנסות רשומה */}
      {conv && conv.group_size >= 2 && (
        <Link to={`/number/${value}`} style={convTag}>✦ התכנסות מזוהה · {conv.group_size} ביטויים{conv.method && conv.method !== "ragil" ? ` (${conv.method})` : ""} →</Link>
      )}

      {/* #3 סינון חוצה-שיטות */}
      <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
        {METHOD_TABS.map(t => (
          <button key={t.key} onClick={() => { setMethod(t.key); setLimit(12); }} style={{ ...methodTab, ...(method === t.key ? methodTabOn : null) }}>{t.label}</button>
        ))}
      </div>

      {list === null ? (
        <div style={{ fontSize: 11.5, color: "var(--ink3,#8a94a6)" }}>טוען…</div>
      ) : list.length === 0 ? (
        <div style={{ fontSize: 11.5, color: "var(--ink3,#8a94a6)", lineHeight: 1.6, marginBottom: 8 }}>אין ביטוי שווה ב{methodHe(method)} במאגר.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {list.map(w => (
              <button key={w.phrase} onClick={() => emit(EVENTS.ENTITY_FOCUS, { title: w.phrase, word: w.phrase, value: w.ragil, kind: "word" })}
                title={`הצג את «${w.phrase}»`} style={eqChip}>{w.phrase}</button>
            ))}
          </div>
          {/* #2 עוד */}
          {count != null && list.length < count && (
            <button onClick={() => setLimit(l => l + 24)} style={moreBtn}>עוד {Math.min(24, count - list.length)} ↓</button>
          )}
        </>
      )}

      {/* #4 הצעת ביטוי חדש (רגיל בלבד) */}
      {canPropose && (
        (proposed === "ok" || proposed === "pending") ? (
          <div style={{ fontSize: 11.5, color: "#1f9d57", fontWeight: 800, marginTop: 8 }}>✓ «{activeWord}» נשלח לאישור</div>
        ) : proposed === "exists" ? null : (
          <button onClick={propose} disabled={proposed === "sending"} style={proposeBtn}>
            {proposed === "sending" ? "שולח…" : proposed === "invalid" || proposed === "error" ? "לא ניתן כרגע — נסו שוב" : `➕ הצע «${activeWord}» כביטוי שווה`}
          </button>
        )
      )}

      <Link to={`/number/${value}`} style={numLink}>→ דף המספר {value} — הכל</Link>
    </div>
  );
}
const eqChip = { cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--ink,#1b1d22)", background: "var(--chip,#f2f4f8)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 999, padding: "5px 11px" };
const methodTab = { flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "var(--ink2,#5b6472)", background: "var(--card,#fff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 8, padding: "6px 4px" };
const methodTabOn = { color: "#fff", background: "var(--acc,#2f6df6)", borderColor: "var(--acc,#2f6df6)" };
const convTag = { display: "block", textAlign: "center", textDecoration: "none", background: "#fbf3da", border: "1px solid #ecd9a0", borderRadius: 8, padding: "6px 8px", marginBottom: 9, fontSize: 11.5, fontWeight: 800, color: "#8a6d12", fontFamily: "inherit" };
const moreBtn = { width: "100%", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "var(--ink2,#5b6472)", background: "var(--chip,#f2f4f8)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 8, padding: "7px", marginBottom: 8 };
const proposeBtn = { width: "100%", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color: "var(--acc,#2f6df6)", background: "var(--accS,#eef3ff)", border: "1px dashed var(--acc,#2f6df6)", borderRadius: 10, padding: "9px", marginTop: 6, marginBottom: 8 };
const numLink = { display: "block", textAlign: "center", textDecoration: "none", background: "var(--accS,#eef3ff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 10, padding: "8px", fontSize: 12.5, fontWeight: 800, color: "var(--acc,#2f6df6)", fontFamily: "inherit" };

// 🔬 מחקר-קהילתי בקונסטרוקציה הימנית — משקף בפאנל את התרומות על הישות הפעילה (אותה מערכת
// research_contributions; אפס כפילות). לחיצה → קפיצה למדור «מחקר קהילתי» במרכז (Event Bus).
function CommunityMini({ targetType, targetId }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let live = true;
    if (!targetId) { setItems([]); return; }
    getContributions(targetType, String(targetId)).then(d => { if (live) setItems(d); }).catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [targetType, targetId]);

  const list = items || [];
  const n = k => list.filter(c => c.intent === k).length;
  const chips = [["💡", n("חידוש")], ["🧩", n("השערה")], ["📚", n("מקור")], ["❓", n("שאלה")], ["🔍", n("תצפית")]].filter(c => c[1] > 0);
  const total = list.length;
  return (
    <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--line,#e4e7ec)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink,#1b1d22)" }}>🔬 מחקר קהילתי</span>
        {total > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--acc,#2f6df6)", fontFamily: "ui-monospace,monospace" }}>{total}</span>}
      </div>
      {items === null ? (
        <div style={{ fontSize: 11.5, color: "var(--ink3,#8a94a6)" }}>טוען…</div>
      ) : total === 0 ? (
        <div style={{ fontSize: 11.5, color: "var(--ink3,#8a94a6)", lineHeight: 1.6, marginBottom: 8 }}>עדיין אין — היו הראשונים לתרום ✨</div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {chips.map(([e, v]) => (
            <span key={e} style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2,#5b6472)" }}>{e} {v}</span>
          ))}
        </div>
      )}
      <button onClick={() => emit(EVENTS.ENTITY_SECTION, "comments")} style={{
        display: "block", width: "100%", cursor: "pointer", textAlign: "center", textDecoration: "none",
        background: "var(--accS,#eef3ff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 10,
        padding: "8px", fontSize: 12.5, fontWeight: 800, color: "var(--acc,#2f6df6)", fontFamily: "inherit",
      }}>{total > 0 ? "→ למחקר הקהילתי" : "➕ הוסף תרומה"}</button>
    </div>
  );
}

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
        <EqualPhrases value={v} />
        <CommunityMini targetType="number" targetId={v} />
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
        <EqualPhrases value={ent.value} activeWord={ent.title || ent.word} />
        <CommunityMini targetType="phrase" targetId={ent.title || ent.word} />
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
