import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";

// ELS Lab — Native Matrix Renderer v1
// IMPORTANT: React renders בלבד. It never searches/calculates ELS.
// Canonical truth arrives from TzofenEmbed -> elsState().matrix (PR #178 contract).

const MODES = [
  { id: "discover", icon: "🔭", title: "גילוי" },
  { id: "investigate", icon: "🧬", title: "חקירה" },
  { id: "judge", icon: "⚖️", title: "שיפוט" },
];

const SEARCH_LABEL = {
  regular: "חיפוש רגיל",
  "cross-simple": "הצלבה פשוטה",
  "cross-free": "התכנסות חופשית",
  bridge: "גשר דו־מונחי",
  cross: "הצלבה",
};

const n = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString("he-IL") : "—";
const dir = (v) => v === "back" ? "אחורה ↑" : "קדימה ↓";

export default function ElsWorkAreaPage() {
  const P = usePalette();
  const [engineState, setEngineState] = useState(null);
  const [mode, setMode] = useState("discover");
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState("");
  const [runNonce, setRunNonce] = useState(0);
  const [seen, setSeen] = useState(0);
  const [showEngine, setShowEngine] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [cellSize, setCellSize] = useState(30);
  const [focusMarks, setFocusMarks] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [matrixRtl, setMatrixRtl] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [firstRunHint, setFirstRunHint] = useState(false);

  useEffect(() => {
    applySeo({
      title: "ELS Research Studio · סוד 1820",
      description: "סביבת המחקר החדשה של הצופן התנ״כי מעל מנוע ה-ELS הקנוני",
      path: "/lab/els",
    });
  }, []);

  useEffect(() => {
    if (!waiting) return undefined;
    const t = window.setTimeout(() => setFirstRunHint(true), 1800);
    return () => window.clearTimeout(t);
  }, [waiting, runNonce]);

  const onState = useCallback((next) => {
    setEngineState(next);
    setSeen((x) => x + 1);
    setWaiting(false);
    setFirstRunHint(false);
  }, []);

  const runSearch = (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    if (q.length < 2) return;
    setEngineState(null);
    setSelectedCell(null);
    setSeed(q);
    setWaiting(true);
    setFirstRunHint(false);
    setRunNonce((x) => x + 1);
  };

  const s = engineState;
  const ok = s?.status === "ok";
  const axis = s?.axis || {};
  const occ = s?.occurrence || {};
  const geo = s?.geometry || {};
  const prov = s?.provenance || {};
  const findings = Array.isArray(s?.findings) ? s.findings : [];
  const matrix = s?.matrix || null;

  const positions = useMemo(() => {
    if (!ok || !Number.isFinite(axis.start) || !Number.isFinite(axis.skip) || !Number.isFinite(s?.length)) return [];
    const sign = axis.direction === "back" ? -1 : 1;
    return Array.from({ length: s.length }, (_, i) => axis.start + sign * axis.skip * i);
  }, [ok, axis.start, axis.skip, axis.direction, s?.length]);

  const axisSet = useMemo(() => new Set(positions), [positions]);
  const marks = useMemo(() => {
    const map = new Map();
    if (Array.isArray(matrix?.marks)) matrix.marks.forEach((mark) => map.set(Number(mark.i), mark));
    return map;
  }, [matrix]);

  const markedCount = matrix?.marks?.length || 0;
  const matrixVersion = matrix?.v || 1;
  const lenses = Array.isArray(matrix?.lenses) ? matrix.lenses : [];

  const card = { background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 18, boxSizing: "border-box" };
  const soft = { background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 13 };
  const title = { color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 13 };
  const muted = { color: P.inkSoft, fontFamily: F.body };

  const Fact = ({ label, value, mono = false }) => (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${P.border}`, minWidth: 0 }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 850 }}>{label}</div>
      <div style={{ color: P.ink, fontFamily: mono ? "ui-monospace,monospace" : F.body, fontSize: 13.5, fontWeight: 730, marginTop: 2, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
    </div>
  );

  const Next = ({ children }) => (
    <div style={{ ...soft, padding: "10px 12px", color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}>
      <b style={{ color: P.accentDim }}>השלב הבא · </b>{children}
    </div>
  );

  const resetView = () => {
    setCellSize(30);
    setFocusMarks(false);
    setShowGrid(false);
    setMatrixRtl(true);
    setSelectedCell(null);
  };

  const MatrixStage = () => {
    if (!ok) {
      return <div style={{ minHeight: 420, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{waiting ? "⌛" : "✦"}</div>
          <div style={{ ...title, fontSize: 18 }}>{waiting ? "המנוע מחשב מאחורי הקלעים" : "הבמה מוכנה"}</div>
          <div style={{ ...muted, fontSize: 13.5, marginTop: 7, lineHeight: 1.7 }}>הקלד מונח למעלה. המטריצה כאן נבנית רק מה-Snapshot של המנוע הקנוני.</div>
          {firstRunHint && <button type="button" onClick={() => setShowEngine(true)} style={{ marginTop: 14, minHeight: 44, borderRadius: 999, padding: "0 16px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.accentText, fontFamily: F.heading, fontWeight: 850, cursor: "pointer" }}>כניסה ראשונה? פתח הדרכה חד־פעמית</button>}
        </div>
      </div>;
    }

    if (!matrix?.rows?.length) {
      return <div style={{ minHeight: 420, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div><div style={{ ...title, fontSize: 17 }}>ה-Finding הגיע, אבל Matrix Snapshot חסר</div><div style={{ ...muted, marginTop: 7 }}>ה-UI לא ימציא אותיות. נדרש state.matrix מהמנוע.</div></div>
      </div>;
    }

    const r0 = Number(matrix.r0 ?? geo.r0 ?? 0);
    const c0 = Number(matrix.c0 ?? geo.c0 ?? 0);
    const S = Number(matrix.S ?? geo.S ?? 0);

    return <div className="els-native-stage" style={{ overflow: "auto", padding: 18, background: P.cardSoft }}>
      <div style={{ width: "max-content", minWidth: "100%", direction: "ltr", fontFamily: F.regal }}>
        {matrix.rows.map((row, ri) => {
          const cells = Array.from(row).map((letter, ci) => ({ letter, ci }));
          if (matrixRtl) cells.reverse();
          return <div key={ri} style={{ display: "flex", justifyContent: "center", lineHeight: 1 }}>
            {cells.map(({ letter, ci }) => {
              const idx = (r0 + ri) * S + (c0 + ci);
              const mark = marks.get(idx);
              const isAxis = axisSet.has(idx) || mark?.type === "main";
              const isStart = Boolean(mark?.start);
              const dim = focusMarks && !mark && !isAxis;
              const active = selectedCell?.idx === idx;
              const background = isAxis ? P.accentBtn : mark?.color || "transparent";
              return <button
                key={idx}
                type="button"
                title={`index ${idx}`}
                onClick={() => setSelectedCell({ idx, letter, row: r0 + ri, col: c0 + ci, mark: mark || null })}
                style={{
                  width: cellSize, height: cellSize + 3, flex: `0 0 ${cellSize}px`, padding: 0,
                  display: "inline-grid", placeItems: "center", borderRadius: showGrid ? 3 : 6,
                  border: isStart ? `2px solid ${P.accentText}` : active ? `1px solid ${P.accentText}` : showGrid ? `1px solid ${P.border}` : "1px solid transparent",
                  outline: isStart ? `1px solid ${P.cardSoft}` : "none",
                  background, color: isAxis ? P.onAccent : P.ink,
                  fontFamily: F.regal, fontWeight: isAxis || mark ? 900 : 500,
                  fontSize: Math.max(15, Math.round(cellSize * 0.68)), opacity: dim ? 0.18 : 1,
                  cursor: "pointer", transition: "opacity .14s ease, transform .14s ease, border-color .14s ease",
                }}
              >{letter}</button>;
            })}
          </div>;
        })}
      </div>
    </div>;
  };

  const lensChip = (icon, label, active = false, note = "בקרוב") => (
    <span style={{
      minHeight: 40, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 13px", borderRadius: 999,
      border: `1px solid ${active ? "transparent" : P.border}`,
      background: active ? P.accentBtn : P.cardSoft, color: active ? P.onAccent : P.inkSoft,
      fontFamily: F.heading, fontSize: 12, fontWeight: 850, opacity: active ? 1 : 0.72,
    }}><span>{icon}</span>{label}{!active && <small style={{ fontSize: 9, opacity: .7 }}>· {note}</small>}</span>
  );

  return (
    <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1660, margin: "0 auto", padding: "14px 12px 90px" }}>
      <style>{`
        .els-native-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:14px;align-items:start}
        .els-native-inspector{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}
        .els-native-modes{display:flex;gap:8px;flex-wrap:wrap}
        .els-native-stage button:hover{transform:scale(1.1);z-index:2}
        .els-native-toolbar button{font-size:12px;font-weight:850}
        @media(max-width:980px){.els-native-layout{grid-template-columns:1fr}.els-native-inspector{position:static;max-height:none}.els-native-stage{max-height:66vh}}
        @media(max-width:560px){.els-search-form{grid-template-columns:1fr!important}.els-native-modes button{flex:1 1 auto}.els-native-toolbar{gap:6px!important}.els-native-toolbar button{flex:1 1 auto}}
      `}</style>

      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1 }}>SOD1820 · ELS LAB · MATRIX v{matrixVersion}</div>
          <h1 style={{ margin: "2px 0 0", color: P.accentText, fontFamily: F.regal, fontSize: "clamp(27px,4vw,43px)", lineHeight: 1.05 }}>הצופן התנ״כי · Research Studio</h1>
        </div>
        <span style={{ ...soft, padding: "7px 11px", color: seen ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 850 }}>{seen ? `● engine live · ${seen}` : "○ engine bridge"}</span>
        <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Advanced Engine ←</Link>
      </header>

      <form className="els-search-form" onSubmit={runSearch} style={{ ...card, padding: 11, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, marginBottom: 10 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="מה לחפש בתורה?" aria-label="מונח לחיפוש ELS" style={{ minHeight: 54, borderRadius: 13, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, padding: "0 16px", fontFamily: F.body, fontSize: 18, outline: "none" }} />
        <button type="submit" disabled={query.trim().length < 2 || waiting} style={{ minHeight: 54, minWidth: 130, borderRadius: 13, border: 0, background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 900, cursor: query.trim().length >= 2 && !waiting ? "pointer" : "default", opacity: query.trim().length >= 2 && !waiting ? 1 : .55 }}>{waiting ? "מחפש…" : "חפש ✦"}</button>
      </form>

      <div className="els-native-modes" style={{ marginBottom: 10 }}>
        {MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} type="button" style={{ minHeight: 46, padding: "0 19px", borderRadius: 999, border: `1px solid ${mode === m.id ? "transparent" : P.border}`, background: mode === m.id ? P.accentBtn : P.cardSoft, color: mode === m.id ? P.onAccent : P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 850, cursor: "pointer" }}>{m.icon} {m.title}</button>)}
        <button onClick={() => setShowEngine((v) => !v)} type="button" style={{ marginInlineStart: "auto", minHeight: 46, padding: "0 15px", borderRadius: 999, border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft, fontFamily: F.heading, fontSize: 12, cursor: "pointer" }}>{showEngine ? "הסתר מנוע" : "Debug / onboarding"}</button>
      </div>

      <div aria-hidden={!showEngine} style={showEngine ? { ...card, padding: 8, marginBottom: 10 } : { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0.001, pointerEvents: "none", insetInlineStart: -10000 }}>
        <TzofenEmbed key={`${seed}-${runNonce}`} seed={seed || undefined} onState={onState} />
      </div>

      <div className="els-native-layout">
        <main style={{ minWidth: 0 }}>
          <section style={{ ...card, overflow: "hidden", minHeight: 520 }}>
            <div style={{ padding: "13px 14px", borderBottom: `1px solid ${P.border}`, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div><div style={{ ...title, fontSize: 14 }}>מטריצת המחקר · Native Renderer</div><div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>RTL קנוני לתצוגה · האותיות והסימונים מגיעים ישירות מ־Matrix Snapshot</div></div>
                {ok && <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 12 }}>{n((occ.index ?? 0) + 1)} / {n(occ.count)} · S={n(geo.S)}</span>}
              </div>
              <div className="els-native-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setMatrixRtl((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: matrixRtl ? P.accentBtn : "transparent", color: matrixRtl ? P.onAccent : P.ink, cursor: "pointer", fontFamily: F.heading }}>↔ {matrixRtl ? "RTL" : "LTR"}</button>
                <button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink, cursor: "pointer", fontFamily: F.heading }}>◎ מיקוד</button>
                <button type="button" onClick={() => setShowGrid((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: showGrid ? P.accentBtn : "transparent", color: showGrid ? P.onAccent : P.ink, cursor: "pointer", fontFamily: F.heading }}>▦ רשת</button>
                <button type="button" onClick={() => setCellSize((v) => Math.max(18, v - 3))} style={{ minWidth: 42, minHeight: 42, borderRadius: 12, border: `1px solid ${P.border}`, background: "transparent", color: P.ink, cursor: "pointer" }}>−</button>
                <span style={{ minWidth: 54, textAlign: "center", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 900 }}>{cellSize}px</span>
                <button type="button" onClick={() => setCellSize((v) => Math.min(46, v + 3))} style={{ minWidth: 42, minHeight: 42, borderRadius: 12, border: `1px solid ${P.border}`, background: "transparent", color: P.ink, cursor: "pointer" }}>＋</button>
                <button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft, cursor: "pointer", fontFamily: F.heading }}>↺ איפוס</button>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                {lensChip("▦", "2D", true)}
                {lensChip("🧱", "שכבות")}
                {lensChip("🌌", "3D")}
                {lensChip("📜", "פסוק")}
                {lensChip("🔥", "חום")}
              </div>
            </div>
            {s?.status === "empty" ? <div style={{ minHeight: 420, display: "grid", placeItems: "center", ...muted }}>לא נמצא דילוג למונח «{s.termRaw || seed}».</div> : <MatrixStage />}
            {ok && matrix?.rows?.length > 0 && <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 13, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ ...muted, fontSize: 11 }}>● ציר ראשי</span>
              <span style={{ ...muted, fontSize: 11 }}>◉ מסגרת = start</span>
              <span style={{ ...muted, fontSize: 11 }}>✦ {markedCount} תאים מסומנים</span>
              <span style={{ ...muted, fontSize: 11 }}>כיוון: {matrixRtl ? "RTL" : "LTR"}</span>
              <span style={{ ...muted, fontSize: 11 }}>lenses: {lenses.length ? lenses.join(" · ") : "cells · marks"}</span>
            </div>}
          </section>

          {mode === "discover" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>🔭 גילוי</div>
            <div style={{ ...muted, fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>החיפוש נשאר במנוע הקנוני; ה-Lab רק מציג את התוצאה מחדש. FORMS, Split/Join וכלי עומק עדיין לא חוברו ל-Surface הזה.</div>
            {findings.length > 0 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>{findings.map((f, i) => <span key={`${f.t}-${i}`} style={{ ...soft, padding: "6px 9px", color: P.ink, fontFamily: F.body, fontSize: 12 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />{f.t}</span>)}</div>}
          </section>}

          {mode === "investigate" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>🧬 Finding Workspace</div>
            {!ok ? <div style={{ ...muted, marginTop: 8, fontSize: 13 }}>בחר Finding באמצעות חיפוש.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginTop: 10 }}>
              <div style={{ ...soft, padding: 11 }}><div style={title}>זהות</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>{s.term} · {dir(axis.direction)} · {n(axis.skip)}</div></div>
              <div style={{ ...soft, padding: 11 }}><div style={title}>חלון</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>rows {n(geo.r0)}–{n(geo.r1)} · cw {n(geo.cw)}</div></div>
              <div style={{ ...soft, padding: 11 }}><div style={title}>Provenance</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>{prov.cipherSlug || prov.author || "ממצא חיפוש נוכחי"}</div></div>
            </div>}
            <div style={{ marginTop: 9 }}><Next>Lens ראשון בהמשך: פסוק/context on-demand על אותו Matrix Model; אחריו Crosses ו-Number DNA.</Next></div>
          </section>}

          {mode === "judge" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>⚖️ Evidence Pack</div>
            <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
              <div style={{ ...soft, padding: 10, color: P.ink, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentText }}>FACT · </b>{ok ? `«${s.termRaw || s.term}» נמצא בדילוג ${n(axis.skip)}, ${dir(axis.direction)}, start ${n(axis.start)}.` : "אין Finding פעיל."}</div>
              <div style={{ ...soft, padding: 10, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>RAZIEL · </b>עדיין לא מחובר; אין המלצה מומצאת.</div>
              <div style={{ ...soft, padding: 10, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>HUMAN-GATE · </b>decision_ledger יחובר ב-Vertical Slice; Canonical נשאר צוריאל בלבד.</div>
            </div>
          </section>}
        </main>

        <aside className="els-native-inspector" style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div><div style={title}>Research Inspector</div><div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>{ok ? "Finding חי מהמנוע" : s?.status === "empty" ? "אין ממצא" : "ממתין לחיפוש"}</div></div>
            <span style={{ ...soft, padding: "4px 7px", color: ok ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900 }}>{s?.status || "idle"}</span>
          </div>

          {selectedCell && <div style={{ ...soft, padding: 10, marginTop: 10 }}>
            <div style={title}>תא נבחר · {selectedCell.letter}</div>
            <div style={{ ...muted, fontSize: 11.5, marginTop: 4 }}>index {n(selectedCell.idx)} · row {n(selectedCell.row)} · col {n(selectedCell.col)}</div>
            {selectedCell.mark && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11.5, marginTop: 5 }}>{selectedCell.mark.type === "main" ? "ציר ראשי" : "ממצא מצטלב"}{selectedCell.mark.start ? " · START" : ""}</div>}
          </div>}

          {ok && <div style={{ marginTop: 10 }}>
            <Fact label="מונח" value={`«${s.termRaw || s.term}»`} />
            <Fact label="מצב חיפוש" value={SEARCH_LABEL[s.search?.mode] || s.search?.mode || "—"} />
            <Fact label="דילוג / כיוון" value={`${n(axis.skip)} · ${dir(axis.direction)}`} />
            <Fact label="start / hitId" value={`${n(axis.start)} · ${axis.hitId || "—"}`} mono />
            <Fact label="מופע" value={`${n((occ.index ?? 0) + 1)} / ${n(occ.count)}${occ.capped ? "+" : ""}`} />
            <Fact label="מיקומי אותיות" value={positions.length ? positions.map(n).join(" · ") : "—"} mono />
            <Fact label="Matrix contract" value={`v${matrixVersion} · ${matrix?.rows?.length || 0} rows · ${markedCount} marks`} />
            <Fact label="תצוגה" value={`${matrixRtl ? "RTL" : "LTR"} · ${cellSize}px · ${showGrid ? "grid" : "clean"}`} />
            <Fact label="ממצאים נוספים" value={findings.length ? findings.map((f) => f.t).join(" · ") : "אין"} />
            <Fact label="צופן / מחבר" value={[prov.cipherSlug, prov.author].filter(Boolean).join(" · ") || "—"} />
          </div>}
          {!ok && <div style={{ ...muted, fontSize: 13, lineHeight: 1.75, marginTop: 14 }}>ה-Inspector יתמלא רק מעובדות שהמנוע משדר.</div>}
          <button type="button" onClick={() => setRawOpen((v) => !v)} style={{ width: "100%", minHeight: 40, marginTop: 11, borderRadius: 11, border: `1px solid ${P.border}`, background: "transparent", color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{rawOpen ? "הסתר state" : "State גולמי"}</button>
          {rawOpen && <pre style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 280, overflow: "auto", margin: "7px 0 0", padding: 9, borderRadius: 11, background: P.cardSoft, color: P.inkSoft, fontSize: 10 }}>{JSON.stringify(s, null, 2)}</pre>}
        </aside>
      </div>
    </div>
  );
}