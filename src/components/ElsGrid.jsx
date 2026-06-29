import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { elsNormalize, elsSearch, elsClusters, buildSkipSet, TORAH_BOOKS } from "../features/els/Els.jsx";
import { computeEntity } from "../lib/research/coreEngine.js";

// 🔡 מסך הדילוגים — בהיר, מתאים לסביבה. רוכב על מנוע ה-ELS הקיים (לא מחשב מחדש).
// מונח אחד → עמודה אנכית · כמה מונחים → קרבה במטריצה אחת · «כולל קרובים» → סבילות-שגיאה.
// רשימת-תוצאות עם מיקום (ספר+אות) + לחיצה ממקדת · מסך-מלא. יושר: מציאה=עובדה, משמעות=חקירה.
const TERM_COLORS = ["#b07d12", "#a01f2e", "#6b3fa0", "#1f7a4d", "#c5631a"];
const PATTERNS = [["range", "טווח רציף"], ["fib", "פיבונאצ׳י"], ["prime", "ראשוניים"], ["pow2", "חזקות 2"]];
const DIRS = [["both", "↔ שני הכיוונים"], ["fwd", "→ קדימה"], ["back", "← אחורה"]];

export default function ElsGrid({ seed }) {
  const [letters, setLetters] = useState("");
  const [err, setErr] = useState(false);
  const [raw, setRaw] = useState(seed || "ישראל");
  const [book, setBook] = useState("all");
  const [skipMax, setSkipMax] = useState(1000);
  const [pattern, setPattern] = useState("range");
  const [dir, setDir] = useState("both");
  const [fuzzy, setFuzzy] = useState(false);
  const [hitIdx, setHitIdx] = useState(0);
  const [clusterIdx, setClusterIdx] = useState(0);
  const [full, setFull] = useState(false);
  const [q, setQ] = useState({ raw: seed || "ישראל", book: "all", skipMax: 1000, pattern: "range", dir: "both", fuzzy: false });

  // זריעה ממסע-החיפוש: מונח חדש ב-URL → טוען ומריץ אוטומטית
  useEffect(() => { if (seed) { setRaw(seed); setHitIdx(0); setClusterIdx(0); setQ(p => ({ ...p, raw: seed })); } }, [seed]);

  useEffect(() => {
    let ok = true;
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); c.length > 1000 ? setLetters(c) : setErr(true); })
      .catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, []);

  // ESC סוגר מסך-מלא
  useEffect(() => {
    if (!full) return;
    const h = e => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [full]);

  const terms = useMemo(() => q.raw.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2), [q.raw]);
  const isCluster = terms.length >= 2;

  const res = useMemo(() => {
    if (!letters || !terms.length) return null;
    const bk = TORAH_BOOKS.find(b => b.key === q.book) || TORAH_BOOKS[0];
    const mm = q.fuzzy ? 1 : 0;
    const opts = { winFrom: bk.from, winTo: Math.min(letters.length, bk.to), skips: buildSkipSet(q.pattern, 2, q.skipMax) };
    if (isCluster) return { mode: "cluster", ...elsClusters(letters, terms, 2, Math.max(3, q.skipMax), q.dir, mm, opts) };
    return { mode: "single", ...elsSearch(letters, terms[0], 2, Math.max(3, q.skipMax), q.dir, mm, opts) };
  }, [letters, q, terms, isCluster]);

  const search = () => { setHitIdx(0); setClusterIdx(0); setQ({ raw, book, skipMax: Math.max(2, parseInt(skipMax) || 100), pattern, dir, fuzzy }); };

  const locOf = useCallback(idx => {
    const b = TORAH_BOOKS.slice(1).find(b => idx >= b.from && idx < b.to);
    if (!b) return { label: "—", off: idx, pct: 0 };
    return { label: b.label, off: idx - b.from, pct: Math.round(((idx - b.from) / (b.to - b.from)) * 100) };
  }, []);

  // העוגן הפעיל לפי המצב (single→hitIdx · cluster→clusterIdx)
  const anchorHit = useMemo(() => {
    if (!res) return null;
    if (res.mode === "single") return (res.hits || [])[Math.min(hitIdx, (res.hits?.length || 1) - 1)] || null;
    const cl = (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)];
    return cl ? cl.picks[0].hit : null;
  }, [res, hitIdx, clusterIdx]);

  // ---- מטריצה ----
  const grid = useMemo(() => {
    if (!res || !anchorHit) return null;
    const colorMap = new Map();
    if (res.mode === "single") anchorHit.positions.forEach(p => colorMap.set(p, 0));
    else {
      const cl = (res.clusters || [])[Math.min(clusterIdx, res.clusters.length - 1)];
      cl.picks.forEach((pk, i) => pk.hit.positions.forEach(p => colorMap.set(p, i)));
    }
    const W = Math.abs(anchorHit.skip), L = anchorHit.positions.length;
    const termRow = Math.floor(anchorHit.start / W), termCol = anchorHit.start % W;
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
  }, [res, anchorHit, clusterIdx, letters]);

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const ctl = { fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, border: `1px solid ${C.line}`, background: C.bg, color: C.ink2 };

  // ---- רשימת התוצאות (עובדה: כמה · איפה) ----
  const ResultsList = () => {
    if (!res) return null;
    if (res.mode === "single") {
      const hits = res.hits || []; if (!hits.length) return null;
      return (
        <div className="els-list">
          <div className="els-list-h">📋 {hits.length}{res.capped ? "+" : ""} מופעים{q.fuzzy ? " (כולל קרובים)" : ""} — לחצו למיקוד</div>
          <div className="els-list-body">
            {hits.slice(0, 80).map((h, i) => {
              const l = locOf(h.start);
              return (
                <button key={i} className={"els-row" + (i === Math.min(hitIdx, hits.length - 1) ? " on" : "")} onClick={() => setHitIdx(i)}>
                  <span className="els-rk">{i + 1}</span>
                  <span className="els-rc">דילוג <b>{Math.abs(h.skip).toLocaleString("he")}</b></span>
                  <span className="els-rc">{h.dir > 0 ? "→" : "←"}</span>
                  <span className="els-rc">{l.label}</span>
                  <span className="els-rc muted">אות {l.off.toLocaleString("he")} · {l.pct}%</span>
                  {h.mismatches > 0 && <span className="els-rc warn">~קרוב</span>}
                </button>
              );
            })}
            {hits.length > 80 && <div className="els-more">…ועוד {hits.length - 80} מופעים. צמצמו דילוג למיקוד.</div>}
          </div>
        </div>
      );
    }
    const cls = res.clusters || []; if (!cls.length) return null;
    return (
      <div className="els-list">
        <div className="els-list-h">📋 {cls.length} אשכולות קרובים — לחצו למיקוד</div>
        <div className="els-list-body">
          {cls.map((cl, i) => {
            const l = locOf(cl.picks[0].hit.start);
            return (
              <button key={i} className={"els-row" + (i === Math.min(clusterIdx, cls.length - 1) ? " on" : "")} onClick={() => setClusterIdx(i)}>
                <span className="els-rk">{i + 1}</span>
                <span className="els-rc">טווח <b>{cl.span.toLocaleString("he")}</b></span>
                <span className="els-rc">{l.label}</span>
                <span className="els-rc muted">{cl.picks.map(p => p.term).join(" · ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- ציור המטריצה (משותף: רגיל + מסך-מלא) ----
  const Matrix = ({ big }) => {
    if (!grid) return null;
    const sz = big ? 38 : 30, h = big ? 42 : 34, fs = big ? 25 : 20;
    return (
      <div style={{ overflow: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-grid", gap: 3 }}>
          {grid.rows.map((row, r) => (
            <div key={r} dir="rtl" style={{ display: "flex", gap: 3 }}>
              {row.map((cell, c) => {
                const col = cell.ci >= 0 ? TERM_COLORS[cell.ci % TERM_COLORS.length] : null;
                return <div key={c} style={{ width: sz, height: h, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Frank Ruhl Libre', serif", fontSize: fs, fontWeight: col ? 800 : 500, borderRadius: 6,
                  color: col ? "#fff" : C.ink2, background: col || "var(--bg)", border: `1px solid ${col || C.line}` }}>{cell.ch}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const cluster0 = res?.mode === "cluster" ? (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)] : null;

  return (
    <div>
      <style>{ELS_CSS}</style>
      <div className="rw-h1">🔡 דילוגי אותיות</div>
      <div className="rw-sub">מונח אחד → עמודה אנכית. כמה מונחים (משפחה, מופרדים בפסיק) → המערכת מוצאת אותם ב<b>קרבה</b> במטריצה אחת. «כולל קרובים» מאתר גם התאמות עם אות אחת שונה. <b>משמעות = חקירה, לא הוכחה.</b></div>

      <div className="rw-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...ctl, flex: "1 1 220px", textAlign: "center", fontSize: 17 }} dir="rtl" value={raw}
            onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="שם · או כמה שמות בפסיק: דוד, בת שבע, שלמה" aria-label="מונחים לחיפוש" />
          <button onClick={search} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "10px 22px", fontFamily: "inherit" }}>🔍 חפש</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <select style={{ ...ctl, cursor: "pointer" }} value={book} onChange={e => setBook(e.target.value)}>{TORAH_BOOKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
          <select style={{ ...ctl, cursor: "pointer" }} value={pattern} onChange={e => setPattern(e.target.value)}>{PATTERNS.map(([k, l]) => <option key={k} value={k}>דילוג: {l}</option>)}</select>
          <select style={{ ...ctl, cursor: "pointer" }} value={dir} onChange={e => setDir(e.target.value)}>{DIRS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, display: "flex", alignItems: "center" }}>דילוג עד
            <input style={{ ...ctl, width: 90, marginInlineStart: 6 }} type="number" min="2" value={skipMax} onChange={e => setSkipMax(e.target.value)} /></label>
          <label className="els-chk" style={{ color: C.ink2 }}>
            <input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /> כולל קרובים (±אות)
          </label>
        </div>
      </div>

      {!letters && !err && <div className="rw-card rw-muted" style={{ marginTop: 12 }}>טוען את אותיות התורה…</div>}
      {err && <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>שגיאה בטעינת הטקסט.</div>}

      {/* ===== עובדות ===== */}
      {res?.mode === "single" && (res.hits?.length ? (() => {
        const hit = anchorHit; const l = locOf(hit.start); const gem = computeEntity(terms[0]).primary;
        return <div className="rw-card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={chip}>דילוג <b style={{ color: C.acc }}>{Math.abs(hit.skip).toLocaleString("he")}</b></span>
          <span style={chip}>{hit.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
          <span style={chip}>📍 {l.label} · אות {l.off.toLocaleString("he")}</span>
          <span style={chip}>מופעים <b style={{ color: C.acc }}>{res.hits.length}{res.capped ? "+" : ""}</b></span>
          {hit.mismatches > 0 && <span style={{ ...chip, color: "#b4453a", borderColor: "#e0b4b0" }}>~ התאמה קרובה</span>}
          <span style={chip}>גימטריה <Link to={`/number/${gem}?from=els`} style={{ color: C.acc, textDecoration: "none", fontWeight: 800 }}>{gem.toLocaleString("he")}</Link></span>
          <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
        </div>;
      })() : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>«{elsNormalize(terms[0] || "")}» לא נמצא כדילוג עד {q.skipMax}. נסו דילוג גדול יותר{!q.fuzzy ? ", או סמנו «כולל קרובים»" : ""}.</div>)}

      {res?.mode === "cluster" && (res.missing?.length
        ? <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>לא נמצאו כדילוג: {res.missing.join(" · ")}. הגדילו את הדילוג{!q.fuzzy ? " או סמנו «כולל קרובים»" : ""}.</div>
        : cluster0
          ? <div className="rw-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>✦ אשכול — כל המונחים בטווח <b style={{ color: C.acc }}>{cluster0.span.toLocaleString("he")}</b> אותיות · 📍 {locOf(cluster0.picks[0].hit.start).label}</span>
                <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cluster0.picks.map((pk, i) => <span key={i} style={{ ...chip, borderColor: TERM_COLORS[i], color: TERM_COLORS[i] }}>{pk.term} · דילוג {Math.abs(pk.hit.skip).toLocaleString("he")}</span>)}
              </div>
              <div className="rw-sub" style={{ marginTop: 6 }}>«קרבה» = מרחק קטן בין המונחים בטקסט. עובדה מדידה — לא הוכחה (אפשר למצוא קרבות בכל טקסט גדול).</div>
            </div>
          : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>המונחים נמצאו, אך לא באשכול קרוב. הגדילו את הדילוג.</div>)}

      {/* ===== המטריצה + רשימה ===== */}
      {grid && <div className="rw-card" style={{ marginTop: 12 }}><Matrix big={false} /></div>}
      {grid && <div className="rw-sub" style={{ marginTop: 8, textAlign: "center" }}>הרשת ברוחב הדילוג ({grid.W}) — {isCluster ? "כל מונח בצבע משלו" : "המונח עומד בעמודה האנכית"}.</div>}

      {res && <div className="rw-card" style={{ marginTop: 12 }}><ResultsList /></div>}

      {/* ===== מסך מלא ===== */}
      {full && grid && (
        <div className="els-full" onClick={e => e.target === e.currentTarget && setFull(false)}>
          <div className="els-full-bar">
            <span style={{ fontWeight: 800 }}>🔡 {terms.join(" · ")}</span>
            <span className="rw-sub">רוחב {grid.W} · {res.mode === "single" ? `${res.hits.length} מופעים` : `${res.clusters.length} אשכולות`}</span>
            <button className="els-x" onClick={() => setFull(false)}>✕ סגור (Esc)</button>
          </div>
          <div className="els-full-body">
            <div className="els-full-grid"><Matrix big /></div>
            <div className="els-full-side"><ResultsList /></div>
          </div>
        </div>
      )}
    </div>
  );
}

const ELS_CSS = `
.els-chk{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;cursor:pointer}
.els-list-h{font-weight:800;font-size:13px;color:var(--ink2);margin-bottom:8px}
.els-list-body{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow:auto}
.els-row{display:flex;align-items:center;gap:9px;width:100%;text-align:start;background:var(--bg);border:1px solid var(--line);
  border-radius:9px;padding:7px 11px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--ink2);transition:.1s}
.els-row:hover{border-color:var(--acc);background:var(--accS)}
.els-row.on{border-color:var(--acc);background:var(--accS);box-shadow:inset 3px 0 0 var(--acc)}
.els-rk{min-width:22px;height:22px;border-radius:6px;background:var(--accS);color:var(--acc);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:12px}
.els-rc b{color:var(--acc)}
.els-rc.muted{color:var(--ink3);margin-inline-start:auto}
.els-rc.warn{color:#b4453a;font-weight:800}
.els-more{font-size:12px;color:var(--ink3);padding:6px 2px}
.els-full{position:fixed;inset:0;z-index:120;background:rgba(20,16,8,.55);backdrop-filter:blur(3px);display:flex;flex-direction:column;padding:14px}
.els-full-bar{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 16px;color:var(--ink)}
.els-x{margin-inline-start:auto;border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:9px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit}
.els-x:hover{border-color:var(--acc);color:var(--acc)}
.els-full-body{flex:1;min-height:0;display:flex;gap:12px;margin-top:12px}
.els-full-grid{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;overflow:auto;display:flex;align-items:flex-start;justify-content:center}
.els-full-side{flex:0 0 320px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;overflow:auto}
@media (max-width:820px){.els-full-body{flex-direction:column}.els-full-side{flex:0 0 auto;max-height:38vh}}
`;
