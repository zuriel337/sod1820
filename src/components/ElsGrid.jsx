import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { elsNormalize, elsSearch, TORAH_BOOKS } from "../features/els/Els.jsx";
import { computeEntity } from "../lib/research/coreEngine.js";

// 🔡 מסך הדילוגים — רשת אותיות אחת במרכז, הכל מסביב. עדשת חקירה (לא "אמת").
// היושר: המציאה = עובדה שרואים ומאמתים (מיקום/דילוג/מופעים). משמעות = חקירה, לא הוכחה.
// רוכב על מנוע ה-ELS הקיים (elsSearch) — לא מחשב מחדש.

export default function ElsGrid() {
  const [letters, setLetters] = useState("");
  const [err, setErr] = useState(false);
  const [term, setTerm] = useState("ישראל");
  const [book, setBook] = useState("all");
  const [skipMax, setSkipMax] = useState(1000);
  const [hitIdx, setHitIdx] = useState(null);
  const [query, setQuery] = useState({ term: "ישראל", book: "all", skipMax: 1000 });

  useEffect(() => {
    let ok = true;
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); c.length > 1000 ? setLetters(c) : setErr(true); })
      .catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, []);

  const res = useMemo(() => {
    if (!letters || elsNormalize(query.term).length < 2) return null;
    const bk = TORAH_BOOKS.find(b => b.key === query.book) || TORAH_BOOKS[0];
    const winTo = Math.min(letters.length, bk.to);
    // דילוג מינימלי 2 — דילוג 1 הוא המילה הרגילה ברצף, לא "צופן" (ELS אמיתי)
    return elsSearch(letters, query.term, 2, Math.max(3, query.skipMax), "both", 0, { winFrom: bk.from, winTo });
  }, [letters, query]);

  const hits = res?.hits || [];
  // ברירת-מחדל לתצוגה: הדילוג הקצר ביותר ≥8 (מטריצה רחבה וקריאה); אחרת הקצר ביותר.
  const defaultIdx = useMemo(() => { const i = hits.findIndex(h => Math.abs(h.skip) >= 8); return i >= 0 ? i : 0; }, [hits]);
  const idx = hitIdx == null ? defaultIdx : Math.min(hitIdx, Math.max(0, hits.length - 1));
  const hit = hits[idx] || null;
  const search = () => { setHitIdx(null); setQuery({ term, book, skipMax: Math.max(2, parseInt(skipMax) || 100) }); };

  // ---- מטריצה אמיתית ברוחב=דילוג (שורות מלאות, בלי חפיפה) → המונח עומד בעמודה אנכית ----
  const grid = useMemo(() => {
    if (!hit) return null;
    const W = Math.abs(hit.skip);
    const L = hit.positions.length;
    const termRow = Math.floor(hit.start / W), termCol = hit.start % W;
    const set = new Set(hit.positions);
    const colWin = Math.min(W, 21);
    const colStart = W <= 21 ? 0 : Math.max(0, Math.min(W - colWin, termCol - Math.floor(colWin / 2)));
    const ROWS = L + 8, rowStart = termRow - 3;
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const mRow = rowStart + r;
      const cells = [];
      for (let c = 0; c < colWin; c++) {
        const mCol = colStart + c, i = mRow * W + mCol;
        cells.push(mRow >= 0 && i >= 0 && i < letters.length ? { ch: letters[i], on: set.has(i) } : { ch: "", on: false });
      }
      rows.push(cells);
    }
    return { rows, W };
  }, [hit, letters]);

  const norm = elsNormalize(query.term);
  const gem = computeEntity(query.term).primary;
  const bookOf = idx => (TORAH_BOOKS.slice(1).find(b => idx >= b.from && idx < b.to) || {}).label || "—";

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const ctl = { fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };

  return (
    <div>
      <div className="rw-h1">🔡 דילוגי אותיות</div>
      <div className="rw-sub">עדשת חקירה — המציאה היא עובדה שרואים ומאמתים (מיקום · דילוג · מופעים). <b>משמעות = חקירה, לא הוכחה</b> (אפשר למצוא רצפים בכל טקסט גדול).</div>

      {/* פקדים סביב */}
      <div className="rw-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...ctl, flex: "1 1 160px", textAlign: "center", fontSize: 18 }} dir="rtl" value={term}
            onChange={e => setTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="שם / מילה" aria-label="מונח לחיפוש" />
          <select style={{ ...ctl, cursor: "pointer" }} value={book} onChange={e => setBook(e.target.value)}>{TORAH_BOOKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2 }}>דילוג עד
            <input style={{ ...ctl, width: 90, marginInlineStart: 6 }} type="number" min="2" value={skipMax} onChange={e => setSkipMax(e.target.value)} />
          </label>
          <button onClick={search} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "10px 22px", fontFamily: "inherit" }}>🔍 חפש</button>
        </div>
      </div>

      {!letters && !err && <div className="rw-card rw-muted" style={{ marginTop: 12 }}>טוען את אותיות התורה…</div>}
      {err && <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>שגיאה בטעינת הטקסט. נסו לרענן.</div>}

      {letters && res && (
        hits.length === 0
          ? <div className="rw-card rw-muted" style={{ marginTop: 12 }}>«{norm}» לא נמצא כדילוג עד {query.skipMax} ב{TORAH_BOOKS.find(b => b.key === query.book)?.label}. נסו דילוג גדול יותר.</div>
          : <>
            {/* עובדות המציאה */}
            <div className="rw-card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="rw-chip">דילוג <b style={{ color: C.acc }}>{Math.abs(hit.skip).toLocaleString("he")}</b></span>
              <span className="rw-chip">כיוון {hit.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
              <span className="rw-chip">ספר {bookOf(hit.start)}</span>
              <span className="rw-chip">מופעים <b style={{ color: C.acc }}>{hits.length}{res.capped ? "+" : ""}</b></span>
              <span className="rw-chip">גימטריה <Link to={`/number/${gem}?from=els`} style={{ color: C.acc, textDecoration: "none", fontWeight: 800 }}>{gem.toLocaleString("he")}</Link></span>
              {hits.length > 1 && <span style={{ marginInlineStart: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => setHitIdx(Math.max(0, idx - 1))} style={{ ...ctl, cursor: "pointer", padding: "4px 12px" }}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.ink2 }}>{idx + 1}/{hits.length}{res.capped ? "+" : ""}</span>
                <button onClick={() => setHitIdx(Math.min(hits.length - 1, idx + 1))} style={{ ...ctl, cursor: "pointer", padding: "4px 12px" }}>›</button>
              </span>}
            </div>

            {/* 🔲 רשת האותיות — המסך המרכזי */}
            {grid && <div className="rw-card" style={{ marginTop: 12, overflowX: "auto", display: "flex", justifyContent: "center" }}>
              <div style={{ display: "inline-grid", gap: 3 }}>
                {grid.rows.map((row, r) => (
                  <div key={r} dir="rtl" style={{ display: "flex", gap: 3 }}>
                    {row.map((cell, c) => (
                      <div key={c} style={{
                        width: 30, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Frank Ruhl Libre', serif", fontSize: 20, fontWeight: cell.on ? 800 : 500,
                        borderRadius: 6, color: cell.on ? "#1a0e00" : C.ink2,
                        background: cell.on ? "linear-gradient(135deg,#e9c84a,#b07d12)" : "var(--bg)",
                        border: `1px solid ${cell.on ? C.acc : C.line}`,
                      }}>{cell.ch}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>}
            <div className="rw-sub" style={{ marginTop: 8, textAlign: "center" }}>הרשת מסודרת ברוחב הדילוג ({grid?.W}) — «{norm}» עומד בעמודה האנכית המודגשת.</div>
          </>
      )}
    </div>
  );
}
