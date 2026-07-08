import React, { useMemo, useRef, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { setLeadRanks } from "../lib/supabase.js";

// 📌 כלי-מנהל: סידור היררכיית הביטויים-המובילים ל-story-top בגרירה-ושחרור.
// גרירה (HTML5 native) לדסקטופ + ▲/▼ למובייל/נגישות. שמירה → lead_rank לפי הסדר. מנהל בלבד.
export default function LeadOrderEditor({ value, phrases = [], term, onSaved, fullList = false }) {
  const P = usePalette();
  const avail = useMemo(
    () => phrases.filter(p => p?.phrase && p.phrase !== term),
    [phrases, term]
  );
  const initial = useMemo(() => {
    if (fullList) return avail.map(p => p.phrase);   // 🖐️ מצב רשימה-מלאה: גוררים את *כל* המילים
    const pinned = avail.filter(p => p.lead_rank != null).sort((a, b) => a.lead_rank - b.lead_rank).map(p => p.phrase);
    return pinned.length ? pinned : avail.slice(0, 3).map(p => p.phrase);
  }, [avail, fullList]);

  const [open, setOpen] = useState(fullList);
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [q, setQ] = useState("");
  const dragFrom = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  // מועמדים להוספה — ביטויים שעדיין לא ברשימה, מסוננים לפי החיפוש
  const candidates = useMemo(() => {
    const inList = new Set(order);
    const s = q.trim();
    return avail.filter(p => !inList.has(p.phrase) && (!s || p.phrase.includes(s))).slice(0, 8);
  }, [avail, order, q]);

  function reorder(from, to) {
    if (from == null || to == null || from === to) return;
    setOrder(o => { const a = [...o]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
  }
  const move = (i, dir) => reorder(i, i + dir);
  const removeAt = i => setOrder(o => o.filter((_, j) => j !== i));
  const add = ph => { setOrder(o => [...o, ph]); setQ(""); };

  async function save(list) {
    setBusy(true); setFlash("");
    const r = await setLeadRanks(value, list);
    setBusy(false);
    if (r?.error === "forbidden") { setFlash("נדרשת הרשאת מנהל"); return; }
    if (r?.error) { setFlash("שגיאה בשמירה"); return; }
    setFlash("נשמר ✓"); setTimeout(() => setFlash(""), 1800);
    onSaved?.();
  }
  const reset = () => { setOrder([]); save([]); };

  const chip = { display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "7px 12px", borderRadius: 10, fontFamily: F.body, fontSize: 14, fontWeight: 600 };

  return (
    <div style={{ maxWidth: 560, margin: "14px auto 0", textAlign: "right", background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", cursor: "pointer", background: "none", border: "none", padding: "11px 14px", display: "flex", alignItems: "center", gap: 8, color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>
        <span>{fullList ? "🖐️ סדר את הרשימה בגרירה (מנהל)" : "📌 סדר מובילים (מנהל)"}</span>
        <span style={{ color: P.accentDim, fontWeight: 600 }}>· {order.length}</span>
        <span style={{ flex: 1 }} />
        <span>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div style={{ padding: "4px 14px 14px" }}>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
            {fullList
              ? "גררו כל מילה למעלה/למטה (או ▲/▼). הסדר נשמר ומופיע בכל המערכת — ה-3 העליונים מובילים ב-story-top."
              : "גררו לסדר (או ▲/▼ במובייל). ה-3 העליונים מובילים ב-story-top. ✕ מסיר (חוזר לאוטומטי)."}
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {order.map((ph, i) => (
              <div key={ph}
                draggable
                onDragStart={() => { dragFrom.current = i; }}
                onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
                onDrop={() => { reorder(dragFrom.current, i); dragFrom.current = null; setOverIdx(null); }}
                onDragEnd={() => { dragFrom.current = null; setOverIdx(null); }}
                style={{ ...chip, justifyContent: "flex-start", cursor: "grab", background: overIdx === i ? P.glow : P.card, border: `1px solid ${i < 3 ? P.accent : P.border}`, color: P.ink }}>
                <span style={{ color: P.accentDim, cursor: "grab", fontSize: 15 }} title="גרירה">⠿</span>
                <span style={{ color: i < 3 ? P.accentText : P.accentDim, fontFamily: F.mono, fontWeight: 800, minWidth: 16 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{ph}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} title="למעלה" style={{ cursor: i === 0 ? "default" : "pointer", background: "none", border: "none", color: i === 0 ? P.border : P.accentDim, fontSize: 15, padding: "0 3px" }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === order.length - 1} title="למטה" style={{ cursor: i === order.length - 1 ? "default" : "pointer", background: "none", border: "none", color: i === order.length - 1 ? P.border : P.accentDim, fontSize: 15, padding: "0 3px" }}>▼</button>
                {!fullList && <button onClick={() => removeAt(i)} title="הסר" style={{ cursor: "pointer", background: "none", border: "none", color: "#e0857a", fontSize: 15, padding: "0 4px" }}>✕</button>}
              </div>
            ))}
            {order.length === 0 && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, padding: "6px 0" }}>אין נעיצות — הכל אוטומטי לפי חוזק.</div>}
          </div>

          {/* הוספת ביטוי — רק במצב מובילים (במצב רשימה-מלאה כל המילים כבר שם) */}
          {!fullList && (
            <div style={{ marginTop: 11 }}>
              <input value={q} onChange={e => setQ(e.target.value)} dir="rtl" placeholder="הוסיפו ביטוי…"
                style={{ width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, color: P.ink, padding: "10px 13px", fontSize: 16, outline: "none", fontFamily: F.body }} />
              {candidates.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {candidates.map(p => (
                    <button key={p.phrase} onClick={() => add(p.phrase)} style={{ cursor: "pointer", ...chip, minHeight: 34, background: P.card, border: `1px solid ${P.border}`, color: P.accentText }}>
                      + {p.phrase}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* פעולות */}
          <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", marginTop: 13 }}>
            <button onClick={() => save(order)} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "10px 20px" }}>
              {busy ? "שומר…" : "💾 שמור סדר"}
            </button>
            <button onClick={reset} disabled={busy} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "9px 16px" }}>
              ↺ אפס לאוטומטי
            </button>
            {flash && <span style={{ color: flash.includes("✓") ? P.accent : "#e0857a", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{flash}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
