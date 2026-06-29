import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { elsNormalize, elsSearch, elsClusters, buildSkipSet, TORAH_BOOKS } from "../features/els/Els.jsx";
import { computeEntity } from "../lib/research/coreEngine.js";

// 🔡 מסך הדילוגים — בהיר, מתאים לסביבה. רוכב על מנוע ה-ELS הקיים (לא מחשב מחדש).
// מצב יחיד: מונח אחד כעמודה אנכית. מצב אשכול: כמה מונחים (משפחה) בקרבה במטריצה אחת.
// יושר: המציאה=עובדה (מיקום/דילוג/מרחק). משמעות=חקירה, לא הוכחה.
const TERM_COLORS = ["#b07d12", "#a01f2e", "#6b3fa0", "#1f7a4d", "#c5631a"]; // עוגן=זהב, השאר
const PATTERNS = [["range", "טווח רציף"], ["fib", "פיבונאצ׳י"], ["prime", "ראשוניים"], ["pow2", "חזקות 2"]];
const DIRS = [["both", "↔ שני הכיוונים"], ["fwd", "→ קדימה"], ["back", "← אחורה"]];

export default function ElsGrid() {
  const [letters, setLetters] = useState("");
  const [err, setErr] = useState(false);
  const [raw, setRaw] = useState("ישראל");
  const [book, setBook] = useState("all");
  const [skipMax, setSkipMax] = useState(1000);
  const [pattern, setPattern] = useState("range");
  const [dir, setDir] = useState("both");
  const [hitIdx, setHitIdx] = useState(null);
  const [q, setQ] = useState({ raw: "ישראל", book: "all", skipMax: 1000, pattern: "range", dir: "both" });

  useEffect(() => {
    let ok = true;
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); c.length > 1000 ? setLetters(c) : setErr(true); })
      .catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, []);

  const terms = useMemo(() => q.raw.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2), [q.raw]);
  const isCluster = terms.length >= 2;

  const res = useMemo(() => {
    if (!letters || !terms.length) return null;
    const bk = TORAH_BOOKS.find(b => b.key === q.book) || TORAH_BOOKS[0];
    const opts = { winFrom: bk.from, winTo: Math.min(letters.length, bk.to), skips: buildSkipSet(q.pattern, 2, q.skipMax) };
    if (isCluster) return { mode: "cluster", ...elsClusters(letters, terms, 2, Math.max(3, q.skipMax), q.dir, 0, opts) };
    return { mode: "single", ...elsSearch(letters, terms[0], 2, Math.max(3, q.skipMax), q.dir, 0, opts) };
  }, [letters, q, terms, isCluster]);

  const search = () => { setHitIdx(null); setQ({ raw, book, skipMax: Math.max(2, parseInt(skipMax) || 100), pattern, dir }); };

  // ---- מטריצה: רוחב=דילוג העוגן → המונח הראשון עומד אנכי; מונחים אחרים מודגשים היכן שנופלים ----
  const grid = useMemo(() => {
    if (!res) return null;
    let anchor, colorMap = new Map();
    if (res.mode === "single") {
      const hits = res.hits || [];
      const idx = hitIdx == null ? Math.max(0, hits.findIndex(h => Math.abs(h.skip) >= 8)) : Math.min(hitIdx, hits.length - 1);
      anchor = hits[idx]; if (!anchor) return null;
      anchor.positions.forEach(p => colorMap.set(p, 0));
    } else {
      const cl = (res.clusters || [])[0]; if (!cl) return null;
      anchor = cl.picks[0].hit;
      cl.picks.forEach((pk, i) => pk.hit.positions.forEach(p => colorMap.set(p, i)));
    }
    const W = Math.abs(anchor.skip), L = anchor.positions.length;
    const termRow = Math.floor(anchor.start / W), termCol = anchor.start % W;
    const colWin = Math.min(W, 21), colStart = W <= 21 ? 0 : Math.max(0, Math.min(W - colWin, termCol - Math.floor(colWin / 2)));
    const ROWS = L + 10, rowStart = termRow - 4, rows = [];
    for (let r = 0; r < ROWS; r++) {
      const mRow = rowStart + r, cells = [];
      for (let c = 0; c < colWin; c++) {
        const i = mRow * W + (colStart + c);
        cells.push(mRow >= 0 && i >= 0 && i < letters.length ? { ch: letters[i], ci: colorMap.has(i) ? colorMap.get(i) : -1 } : { ch: "", ci: -1 });
      }
      rows.push(cells);
    }
    return { rows, W };
  }, [res, hitIdx, letters]);

  const bookOf = idx => (TORAH_BOOKS.slice(1).find(b => idx >= b.from && idx < b.to) || {}).label || "—";
  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const ctl = { fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };
  const cluster0 = res?.mode === "cluster" ? (res.clusters || [])[0] : null;

  return (
    <div>
      <div className="rw-h1">🔡 דילוגי אותיות</div>
      <div className="rw-sub">מונח אחד → עמודה אנכית. כמה מונחים (משפחה, מופרדים בפסיק) → המערכת מוצאת אותם ב<b>קרבה</b> במטריצה אחת. <b>משמעות = חקירה, לא הוכחה.</b></div>

      <div className="rw-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...ctl, flex: "1 1 220px", textAlign: "center", fontSize: 17 }} dir="rtl" value={raw}
            onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="שם · או כמה שמות בפסיק: דוד, בת שבע, שלמה" aria-label="מונחים לחיפוש" />
          <button onClick={search} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "10px 22px", fontFamily: "inherit" }}>🔍 חפש</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <select style={{ ...ctl, cursor: "pointer" }} value={book} onChange={e => setBook(e.target.value)}>{TORAH_BOOKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
          <select style={{ ...ctl, cursor: "pointer" }} value={pattern} onChange={e => setPattern(e.target.value)}>{PATTERNS.map(([k, l]) => <option key={k} value={k}>דילוג: {l}</option>)}</select>
          <select style={{ ...ctl, cursor: "pointer" }} value={dir} onChange={e => setDir(e.target.value)}>{DIRS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, display: "flex", alignItems: "center" }}>דילוג עד
            <input style={{ ...ctl, width: 90, marginInlineStart: 6 }} type="number" min="2" value={skipMax} onChange={e => setSkipMax(e.target.value)} /></label>
        </div>
      </div>

      {!letters && !err && <div className="rw-card rw-muted" style={{ marginTop: 12 }}>טוען את אותיות התורה…</div>}
      {err && <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>שגיאה בטעינת הטקסט.</div>}

      {/* ===== עובדות ===== */}
      {res?.mode === "single" && (res.hits?.length ? (() => {
        const hits = res.hits; const idx = hitIdx == null ? Math.max(0, hits.findIndex(h => Math.abs(h.skip) >= 8)) : Math.min(hitIdx, hits.length - 1);
        const hit = hits[idx]; const gem = computeEntity(terms[0]).primary;
        return <div className="rw-card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="rw-chip">דילוג <b style={{ color: C.acc }}>{Math.abs(hit.skip).toLocaleString("he")}</b></span>
          <span className="rw-chip">{hit.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
          <span className="rw-chip">ספר {bookOf(hit.start)}</span>
          <span className="rw-chip">מופעים <b style={{ color: C.acc }}>{hits.length}{res.capped ? "+" : ""}</b></span>
          <span className="rw-chip">גימטריה <Link to={`/number/${gem}?from=els`} style={{ color: C.acc, textDecoration: "none", fontWeight: 800 }}>{gem.toLocaleString("he")}</Link></span>
          {hits.length > 1 && <span style={{ marginInlineStart: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setHitIdx(Math.max(0, idx - 1))} style={{ ...ctl, cursor: "pointer", padding: "4px 12px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ink2 }}>{idx + 1}/{hits.length}</span>
            <button onClick={() => setHitIdx(Math.min(hits.length - 1, idx + 1))} style={{ ...ctl, cursor: "pointer", padding: "4px 12px" }}>›</button>
          </span>}
        </div>;
      })() : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>«{elsNormalize(terms[0] || "")}» לא נמצא כדילוג עד {q.skipMax}. נסו דילוג גדול יותר.</div>)}

      {res?.mode === "cluster" && (res.missing?.length
        ? <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>לא נמצאו כדילוג: {res.missing.join(" · ")}. הגדילו את הדילוג.</div>
        : cluster0
          ? <div className="rw-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>✦ אשכול הכי קרוב — כל המונחים בטווח <b style={{ color: C.acc }}>{cluster0.span.toLocaleString("he")}</b> אותיות</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cluster0.picks.map((pk, i) => <span key={i} className="rw-chip" style={{ borderColor: TERM_COLORS[i], color: TERM_COLORS[i] }}>{pk.term} · דילוג {Math.abs(pk.hit.skip).toLocaleString("he")}</span>)}
              </div>
              <div className="rw-sub" style={{ marginTop: 6 }}>«קרבה» = מרחק קטן בין המונחים בטקסט. עובדה מדידה — לא הוכחה (אפשר למצוא קרבות בכל טקסט גדול).</div>
            </div>
          : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>המונחים נמצאו, אך לא באשכול קרוב. הגדילו את הדילוג.</div>)}

      {/* ===== המטריצה ===== */}
      {grid && <div className="rw-card" style={{ marginTop: 12, overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-grid", gap: 3 }}>
          {grid.rows.map((row, r) => (
            <div key={r} dir="rtl" style={{ display: "flex", gap: 3 }}>
              {row.map((cell, c) => {
                const col = cell.ci >= 0 ? TERM_COLORS[cell.ci % TERM_COLORS.length] : null;
                return <div key={c} style={{ width: 30, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Frank Ruhl Libre', serif", fontSize: 20, fontWeight: col ? 800 : 500, borderRadius: 6,
                  color: col ? "#fff" : C.ink2, background: col || "var(--bg)", border: `1px solid ${col || C.line}` }}>{cell.ch}</div>;
              })}
            </div>
          ))}
        </div>
      </div>}
      {grid && <div className="rw-sub" style={{ marginTop: 8, textAlign: "center" }}>הרשת ברוחב הדילוג ({grid.W}) — {isCluster ? "כל מונח בצבע משלו" : "המונח עומד בעמודה האנכית"}.</div>}
    </div>
  );
}
