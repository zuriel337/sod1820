import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";

// ELS Lab — one canonical engine, many renderers.
// React NEVER searches/calculates ELS. It only projects elsState().matrix.
const MODES = [
  { id: "discover", icon: "🔭", title: "גילוי" },
  { id: "investigate", icon: "🧬", title: "חקירה" },
  { id: "judge", icon: "⚖️", title: "שיפוט" },
];
const VIEW_MODES = [
  { id: "2d", icon: "▦", title: "2D" },
  { id: "layers", icon: "🧱", title: "שכבות" },
  { id: "3d", icon: "🌌", title: "3D" },
];
const SEARCH_LABEL = {
  regular: "חיפוש רגיל", "cross-simple": "הצלבה פשוטה",
  "cross-free": "התכנסות חופשית", bridge: "גשר דו־מונחי", cross: "הצלבה",
};
const n = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString("he-IL") : "—";
const dir = (v) => v === "back" ? "אחורה ↑" : "קדימה ↓";

export default function ElsWorkAreaPage() {
  const P = usePalette();
  const [engineState, setEngineState] = useState(null);
  const [mode, setMode] = useState("discover");
  const [viewMode, setViewMode] = useState("2d");
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
  const [tiltX, setTiltX] = useState(54);
  const [tiltZ, setTiltZ] = useState(-7);
  const [depth, setDepth] = useState(24);
  // 🖱️ 3D Interaction v2 — camera/explode/isolate state only. Renderer-only: never touches
  //    engine/search/ranking/DB. z is still derived purely from existing marks+axisSet (depth×explode).
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [sceneScale, setSceneScale] = useState(1);
  const [explode, setExplode] = useState(1);
  const [panMode, setPanMode] = useState(false);
  // 🔍 isolate: visual-only dimming keyed by an existing mark's color/type — NEVER a canonical
  //    FindingID. Two marks can legitimately share a color (colorSets() reuses the palette), so this
  //    is explicitly a "dim everything that isn't this exact color" toggle, not identity resolution.
  const [isolateKey, setIsolateKey] = useState(null);
  // 📜 Verse/Context Lens — on-demand בלבד, מעל חוזה request-lens/lens הקיים בכלי. verseOn = הפעלה
  //    ידנית של המשתמש; verseLens = תשובת-הכלי האחרונה. הפעלה/כיבוי אינם נוגעים ב-Finding/search כלל —
  //    זו קריאה נוספת בלבד סביב עמדות שכבר בתוצאת-החיפוש הנוכחית (occ()/st.words בכלי).
  const [verseOn, setVerseOn] = useState(false);
  const [verseLens, setVerseLens] = useState(null);

  useEffect(() => {
    applySeo({ title: "ELS Research Studio · סוד 1820", description: "סביבת המחקר החדשה של הצופן התנ״כי", path: "/lab/els" });
  }, []);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = window.setTimeout(() => setFirstRunHint(true), 1800);
    return () => window.clearTimeout(t);
  }, [waiting, runNonce]);

  // 🖱️ 3D Interaction v2 — pointer-drag rotate/pan + wheel/pinch zoom. Pure host-UI camera state;
  //    never dispatches a search, never touches seed/runNonce, never reloads the engine iframe.
  //    Mirrors the same drag-threshold pattern already used by the canonical engine's own
  //    enable3D()/enablePan() (tools/els/els-code.template.html) — same interaction language, no
  //    new geometry primitive invented.
  //    ⚠️ Listeners are attached at `document` level, scoped by `.closest(".els-native-stage")` on
  //    the event target — NOT via `stageRef`/`addEventListener` on the stage element directly.
  //    MatrixStage is redefined as a new inline component on every render of this page (pre-existing
  //    in PR #179, not something this slice restructures), so its DOM node is torn down and rebuilt
  //    on every state change that re-renders the parent — an element-scoped listener silently goes
  //    stale after the FIRST such re-render. document-level listeners are immune to that churn.
  useEffect(() => {
    let down = false, px = 0, py = 0, pinchD0 = 0, pinchS0 = 1, pinching = false;
    const dist2 = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStage = (e) => e.target?.closest?.(".els-native-stage");
    const start = (x, y) => { down = true; px = x; py = y; };
    const move = (x, y) => {
      if (!down) return;
      const dx = x - px, dy = y - py; px = x; py = y;
      if (panMode) { setPanX((v) => v + dx); setPanY((v) => v + dy); }
      else if (viewMode === "3d") {
        setTiltZ((v) => Math.max(-24, Math.min(24, v + dx * 0.3)));
        setTiltX((v) => Math.max(18, Math.min(72, v - dy * 0.3)));
      }
    };
    const end = () => { down = false; };
    const onMouseDown = (e) => { if (e.button !== 0 || (!panMode && viewMode !== "3d") || !onStage(e)) return; start(e.clientX, e.clientY); };
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onMouseUp = () => end();
    const onTouchStart = (e) => {
      if (!onStage(e)) return;
      if (e.touches.length === 2) { pinching = true; pinchD0 = dist2(e.touches); pinchS0 = sceneScale; return; }
      if (e.touches.length === 1 && (panMode || viewMode === "3d")) { const t = e.touches[0]; start(t.clientX, t.clientY); }
    };
    const onTouchMove = (e) => {
      if (pinching && e.touches.length === 2) {
        e.preventDefault();
        const z = Math.max(0.5, Math.min(2.5, pinchS0 * (dist2(e.touches) / pinchD0)));
        setSceneScale(z);
        return;
      }
      if (down && e.touches.length === 1) { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY); }
    };
    const onTouchEnd = (e) => { if (e.touches.length < 2) pinching = false; if (e.touches.length === 0) end(); };
    const onWheel = (e) => { if (!onStage(e)) return; e.preventDefault(); setSceneScale((v) => Math.max(0.5, Math.min(2.5, v - e.deltaY * 0.001))); };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("wheel", onWheel);
    };
  }, [panMode, viewMode, sceneScale]);

  const onState = useCallback((next) => {
    setEngineState(next); setSeen((x) => x + 1); setWaiting(false); setFirstRunHint(false);
  }, []);
  const runSearch = (e) => {
    e?.preventDefault?.(); const q = query.trim(); if (q.length < 2) return;
    setEngineState(null); setSelectedCell(null); setSeed(q); setWaiting(true); setFirstRunHint(false); setRunNonce((x) => x + 1);
  };

  const s = engineState;
  const ok = s?.status === "ok";
  const axis = s?.axis || {}, occ = s?.occurrence || {}, geo = s?.geometry || {}, prov = s?.provenance || {};
  const findings = Array.isArray(s?.findings) ? s.findings : [];
  const matrix = s?.matrix || null;
  const positions = useMemo(() => {
    if (!ok || !Number.isFinite(axis.start) || !Number.isFinite(axis.skip) || !Number.isFinite(s?.length)) return [];
    const sign = axis.direction === "back" ? -1 : 1;
    return Array.from({ length: s.length }, (_, i) => axis.start + sign * axis.skip * i);
  }, [ok, axis.start, axis.skip, axis.direction, s?.length]);
  const axisSet = useMemo(() => new Set(positions), [positions]);
  const marks = useMemo(() => {
    const map = new Map(); if (Array.isArray(matrix?.marks)) matrix.marks.forEach((m) => map.set(Number(m.i), m)); return map;
  }, [matrix]);
  const markedCount = matrix?.marks?.length || 0;
  const matrixVersion = matrix?.v || 1;
  const lenses = Array.isArray(matrix?.lenses) ? matrix.lenses : [];

  // 📜 Verse/Context Lens — target = ה-Finding הפעיל: התא הנבחר (אם הוא ממצא-מוצלב, לפי צבעו מול
  //    findings[] הקיים) אחרת ברירת-המחדל היא הציר הראשי (term ריק → occ() בכלי, hitId מ-axis הקיים).
  //    אין כאן זיהוי-ממצא חדש — רק שימוש בשדות שכבר משודרים בכל state-tick.
  const verseTarget = useMemo(() => {
    if (!ok) return null;
    const mark = selectedCell?.mark;
    if (mark?.type === "finding" && mark.color) {
      const f = findings.find((x) => x.color === mark.color);
      if (f) return { term: f.t, i: selectedCell.idx };
    }
    return { term: "", hitId: axis.hitId || undefined, i: mark?.type === "main" ? selectedCell?.idx : undefined };
  }, [ok, selectedCell, findings, axis.hitId]);
  const verseTargetSig = verseTarget ? JSON.stringify(verseTarget) : "";
  const verseTargetSigRef = useRef(verseTargetSig);
  useEffect(() => { verseTargetSigRef.current = verseTargetSig; }, [verseTargetSig]);
  const lensRequest = useMemo(
    () => (verseOn && verseTarget ? { lens: "verse-context", target: verseTarget } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verseOn, verseTargetSig]
  );
  // בכל שינוי-בקשה אמיתי (הפעלה/כיבוי/Finding אחר) מנקים את התשובה הקודמת — מונע הצגת פסוק-ישן
  // רגע לפני שהתשובה הטרייה חוזרת.
  useEffect(() => { setVerseLens(null); }, [lensRequest]);
  const onLens = useCallback((d) => {
    if (d?.lens !== "verse-context") return;
    const sig = d?.target ? JSON.stringify(d.target) : "";
    if (sig !== verseTargetSigRef.current) return;   // תשובה מאוחרת ל-target ישן — מתעלמים (race guard)
    setVerseLens(d);
  }, []);

  const card = { background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 18, boxSizing: "border-box" };
  const soft = { background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 13 };
  const title = { color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 13 };
  const muted = { color: P.inkSoft, fontFamily: F.body };
  const Fact = ({ label, value, mono = false }) => <div style={{ padding: "8px 0", borderBottom: `1px solid ${P.border}` }}>
    <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 850 }}>{label}</div>
    <div style={{ color: P.ink, fontFamily: mono ? "ui-monospace,monospace" : F.body, fontSize: 13.5, fontWeight: 730, marginTop: 2, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
  </div>;
  const Next = ({ children }) => <div style={{ ...soft, padding: "10px 12px", color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}><b style={{ color: P.accentDim }}>השלב הבא · </b>{children}</div>;

  const resetView = () => {
    setCellSize(30); setFocusMarks(false); setShowGrid(false); setMatrixRtl(true); setSelectedCell(null);
    setTiltX(54); setTiltZ(-7); setDepth(24);
    setPanX(0); setPanY(0); setSceneScale(1); setExplode(1); setPanMode(false); setIsolateKey(null);
    setVerseOn(false);
  };

  const MatrixStage = () => {
    if (!ok) return <div style={{ minHeight: 440, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}><div>
      <div style={{ fontSize: 46 }}>{waiting ? "⌛" : "✦"}</div><div style={{ ...title, fontSize: 19, marginTop: 8 }}>{waiting ? "המנוע מחשב מאחורי הקלעים" : "הבמה מוכנה"}</div>
      <div style={{ ...muted, marginTop: 7 }}>הקלד מונח. כל אות שתראה כאן מגיעה מה־Snapshot של המנוע הקנוני.</div>
      {firstRunHint && <button type="button" onClick={() => setShowEngine(true)} style={{ marginTop: 14, minHeight: 44, borderRadius: 999, padding: "0 16px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.accentText, fontFamily: F.heading, fontWeight: 850 }}>כניסה ראשונה? פתח הדרכה חד־פעמית</button>}
    </div></div>;
    if (!matrix?.rows?.length) return <div style={{ minHeight: 440, display: "grid", placeItems: "center", ...muted }}>Finding הגיע, אך Matrix Snapshot חסר.</div>;

    const r0 = Number(matrix.r0 ?? geo.r0 ?? 0), c0 = Number(matrix.c0 ?? geo.c0 ?? 0), S = Number(matrix.S ?? geo.S ?? 0);
    const isDepth = viewMode !== "2d";
    const rotatePart = viewMode === "3d" ? ` perspective(1250px) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)` : viewMode === "layers" ? " perspective(1300px) rotateX(34deg)" : "";
    const stageTransform = `translate(${panX}px, ${panY}px) scale(${sceneScale})${rotatePart}`;

    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : "28px 20px 70px", background: P.cardSoft, minHeight: 470 }}>
      <div style={{ width: "max-content", minWidth: "100%", direction: "ltr", fontFamily: F.regal, transform: stageTransform, transformOrigin: "50% 42%", transformStyle: "preserve-3d", transition: "transform .28s ease" }}>
        {matrix.rows.map((row, ri) => {
          const cells = Array.from(row).map((letter, ci) => ({ letter, ci })); if (matrixRtl) cells.reverse();
          return <div key={ri} style={{ display: "flex", justifyContent: "center", lineHeight: 1, transformStyle: "preserve-3d" }}>
            {cells.map(({ letter, ci }) => {
              const idx = (r0 + ri) * S + (c0 + ci), mark = marks.get(idx), isAxis = axisSet.has(idx) || mark?.type === "main", isStart = Boolean(mark?.start);
              const isolatedOut = Boolean(isolateKey) && mark?.type === "finding" && mark.color !== isolateKey;
              const dim = (focusMarks && !mark && !isAxis) || isolatedOut, active = selectedCell?.idx === idx;
              const z = !isDepth ? 0 : (isAxis ? depth * 1.55 : mark ? depth : 0) * explode;
              const background = isAxis ? P.accentBtn : mark?.color || "transparent";
              return <button key={idx} type="button" title={`index ${idx}`} onClick={() => setSelectedCell({ idx, letter, row: r0 + ri, col: c0 + ci, mark: mark || null })} style={{
                width: cellSize, height: cellSize + 3, flex: `0 0 ${cellSize}px`, padding: 0, display: "inline-grid", placeItems: "center",
                borderRadius: showGrid ? 3 : 6, border: isStart ? `2px solid ${P.accentText}` : active ? `1px solid ${P.accentText}` : showGrid ? `1px solid ${P.border}` : "1px solid transparent",
                outline: isStart ? `1px solid ${P.cardSoft}` : "none", background, color: isAxis ? P.onAccent : P.ink, fontFamily: F.regal,
                fontWeight: isAxis || mark ? 900 : 500, fontSize: Math.max(15, Math.round(cellSize * .68)), opacity: dim ? .16 : 1, cursor: "pointer",
                transform: z ? `translateZ(${z}px)` : "translateZ(0)", boxShadow: z ? `0 ${Math.round(z / 3)}px ${Math.round(z / 2)}px rgba(0,0,0,.28)` : "none",
                transition: "opacity .15s ease, transform .2s ease, box-shadow .2s ease", transformStyle: "preserve-3d",
              }}>{letter}</button>;
            })}
          </div>;
        })}
      </div>
    </div>;
  };

  return <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1700, margin: "0 auto", padding: "14px 12px 90px" }}>
    <style>{`.els-native-layout{display:grid;grid-template-columns:minmax(0,1fr) 375px;gap:14px;align-items:start}.els-native-inspector{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}.els-native-modes,.els-view-modes{display:flex;gap:8px;flex-wrap:wrap}.els-native-stage button:hover{filter:brightness(1.08);z-index:3}@media(max-width:980px){.els-native-layout{grid-template-columns:1fr}.els-native-inspector{position:static;max-height:none}}@media(max-width:560px){.els-search-form{grid-template-columns:1fr!important}.els-native-toolbar button{flex:1 1 auto}}`}</style>

    <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}><div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1 }}>SOD1820 · ELS LAB · MATRIX v{matrixVersion}</div>
      <h1 style={{ margin: "2px 0 0", color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,4vw,45px)", lineHeight: 1.05 }}>הצופן התנ״כי · Research Studio</h1>
    </div><span style={{ ...soft, padding: "7px 11px", color: seen ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 850 }}>{seen ? `● engine live · ${seen}` : "○ engine bridge"}</span>
    <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Advanced Engine ←</Link></header>

    <form className="els-search-form" onSubmit={runSearch} style={{ ...card, padding: 11, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, marginBottom: 10 }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="מה לחפש בתורה?" style={{ minHeight: 56, borderRadius: 13, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, padding: "0 16px", fontFamily: F.body, fontSize: 19, outline: "none" }} />
      <button type="submit" disabled={query.trim().length < 2 || waiting} style={{ minHeight: 56, minWidth: 135, borderRadius: 13, border: 0, background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 900, opacity: query.trim().length >= 2 && !waiting ? 1 : .55 }}>{waiting ? "מחפש…" : "חפש ✦"}</button>
    </form>

    <div className="els-native-modes" style={{ marginBottom: 10 }}>{MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} style={{ minHeight: 46, padding: "0 19px", borderRadius: 999, border: `1px solid ${mode === m.id ? "transparent" : P.border}`, background: mode === m.id ? P.accentBtn : P.cardSoft, color: mode === m.id ? P.onAccent : P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 850 }}>{m.icon} {m.title}</button>)}
      <button onClick={() => setShowEngine((v) => !v)} type="button" style={{ marginInlineStart: "auto", minHeight: 46, padding: "0 15px", borderRadius: 999, border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>{showEngine ? "הסתר מנוע" : "Debug / onboarding"}</button>
    </div>
    {/* 🌉 hiddenBridge=מפורש (לא הסקה מ-CSS off-screen): כשה-Debug-view סגור, זהו גשר-נסתר/פרוגרמטי —
        מעביר את הכוונה ל-TzofenEmbed עצמו (loading=eager + ?bridge=hidden) כדי שהמנוע-הנסתר-מהצג
        באמת ייטען וידלג רק על ההדרכה-החד-פעמית, בלי לעקוף tier/auth/quota. ה-CSS off-screen* נשאר
        לצורך ההסתרה-החזותית בלבד — אינו עוד מקור-האמת לכוונה. */}
    <div aria-hidden={!showEngine} style={showEngine ? { ...card, padding: 8, marginBottom: 10 } : { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: .001, pointerEvents: "none", insetInlineStart: -10000 }}><TzofenEmbed key={`${seed}-${runNonce}`} seed={seed || undefined} onState={onState} hiddenBridge={!showEngine} lensRequest={lensRequest} onLens={onLens} /></div>

    <div className="els-native-layout"><main style={{ minWidth: 0 }}><section style={{ ...card, overflow: "hidden", minHeight: 560 }}>
      <div style={{ padding: "13px 14px", borderBottom: `1px solid ${P.border}`, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ ...title, fontSize: 14 }}>מטריצת המחקר · {viewMode === "2d" ? "מישור" : viewMode === "layers" ? "שכבות עומק" : "מרחב 3D"}</div><div style={{ ...muted, fontSize: 11.5 }}>אותו Finding · אותו Snapshot · Renderer שונה בלבד</div></div>{ok && <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 12 }}>{n((occ.index ?? 0) + 1)} / {n(occ.count)} · S={n(geo.S)}</span>}</div>
        <div className="els-view-modes">{VIEW_MODES.map((v) => <button key={v.id} onClick={() => setViewMode(v.id)} type="button" style={{ minHeight: 46, padding: "0 18px", borderRadius: 13, border: `1px solid ${P.border}`, background: viewMode === v.id ? P.accentBtn : P.cardSoft, color: viewMode === v.id ? P.onAccent : P.ink, fontFamily: F.heading, fontWeight: 900, fontSize: 13 }}>{v.icon} {v.title}</button>)}
          <button type="button" onClick={() => setVerseOn((v) => !v)} style={{ minHeight: 46, padding: "0 18px", borderRadius: 13, border: `1px solid ${P.border}`, background: verseOn ? P.accentBtn : P.cardSoft, color: verseOn ? P.onAccent : P.ink, fontFamily: F.heading, fontWeight: 900, fontSize: 13 }}>📜 פסוק{verseOn ? " · פעיל" : ""}</button>
          <button type="button" disabled style={{ minHeight: 46, padding: "0 18px", borderRadius: 13, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.inkSoft, opacity: .45 }}>🔥 חום · בהמשך</button>
        </div>
        <div className="els-native-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setMatrixRtl((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: matrixRtl ? P.accentBtn : "transparent", color: matrixRtl ? P.onAccent : P.ink }}>↔ {matrixRtl ? "RTL" : "LTR"}</button>
          <button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink }}>◎ מיקוד</button>
          <button type="button" onClick={() => setShowGrid((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: showGrid ? P.accentBtn : "transparent", color: showGrid ? P.onAccent : P.ink }}>▦ רשת</button>
          <button type="button" onClick={() => setCellSize((v) => Math.max(18, v - 3))} style={{ minWidth: 42, minHeight: 42, borderRadius: 12, border: `1px solid ${P.border}`, background: "transparent", color: P.ink }}>−</button><span style={{ minWidth: 52, textAlign: "center", color: P.accentText, fontFamily: F.heading, fontWeight: 900 }}>{cellSize}px</span><button type="button" onClick={() => setCellSize((v) => Math.min(48, v + 3))} style={{ minWidth: 42, minHeight: 42, borderRadius: 12, border: `1px solid ${P.border}`, background: "transparent", color: P.ink }}>＋</button>
          <button type="button" onClick={() => setPanMode((v) => !v)} title="גרירה מזיזה את הבמה (פאן) במקום לסובב" style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: panMode ? P.accentBtn : "transparent", color: panMode ? P.onAccent : P.ink }}>✋ הזזה</button>
          {sceneScale !== 1 && <span style={{ ...muted, fontSize: 11 }}>זום {Math.round(sceneScale * 100)}%</span>}
          {viewMode !== "2d" && <><label style={{ ...muted, fontSize: 11 }}>עומק <input type="range" min="8" max="54" value={depth} onChange={(e) => setDepth(Number(e.target.value))} /></label><label style={{ ...muted, fontSize: 11 }}>התפוצצות <input type="range" min="1" max="3" step="0.25" value={explode} onChange={(e) => setExplode(Number(e.target.value))} /></label>{viewMode === "3d" && <><label style={{ ...muted, fontSize: 11 }}>X <input type="range" min="18" max="72" value={tiltX} onChange={(e) => setTiltX(Number(e.target.value))} /></label><label style={{ ...muted, fontSize: 11 }}>Z <input type="range" min="-24" max="24" value={tiltZ} onChange={(e) => setTiltZ(Number(e.target.value))} /></label></>}</>}
          {isolateKey && <button type="button" onClick={() => setIsolateKey(null)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.accentText }}>✕ נקה בידוד</button>}
          <button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>↺ איפוס</button>
        </div>
      </div>
      {s?.status === "empty" ? <div style={{ minHeight: 440, display: "grid", placeItems: "center", ...muted }}>לא נמצא דילוג למונח «{s.termRaw || seed}».</div> : <MatrixStage />}
      {ok && matrix?.rows?.length > 0 && <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 13, flexWrap: "wrap" }}><span style={{ ...muted, fontSize: 11 }}>● ציר ראשי</span><span style={{ ...muted, fontSize: 11 }}>◉ מסגרת = start</span><span style={{ ...muted, fontSize: 11 }}>✦ {markedCount} marks</span><span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>lenses: {lenses.length ? lenses.join(" · ") : "cells · marks"}</span></div>}
      {verseOn && <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.border}` }}>
        <div style={{ ...title, fontSize: 12.5, marginBottom: 7 }}>📜 הקשר־פסוק · Verse Lens</div>
        {!ok ? <div style={{ ...muted, fontSize: 12 }}>אין Finding פעיל.</div>
          : !verseLens ? <div style={{ ...muted, fontSize: 12 }}>טוען הקשר…</div>
          : !verseLens.ok ? <div style={{ ...muted, fontSize: 12 }}>אין הקשר־פסוק זמין ל־Finding הנוכחי.</div>
          : <div style={{ display: "grid", gap: 6 }}>
            <div style={{ ...muted, fontSize: 11.5 }}>{verseLens.span?.fromRef}{verseLens.span?.fromRef !== verseLens.span?.toRef ? ` → ${verseLens.span?.toRef}` : ""} · {n(verseLens.span?.count)} פס׳{verseLens.truncated ? " (מקוצר)" : ""}</div>
            <div style={{ display: "grid", gap: 5, maxHeight: 230, overflow: "auto" }}>
              {(verseLens.verses || []).map((v) => <div key={v.verseIndex} style={{ ...soft, padding: 8 }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 850 }}>{v.ref}</div>
                <div style={{ color: P.ink, fontSize: 13, marginTop: 2, lineHeight: 1.6 }}>{v.text || "…"}</div>
              </div>)}
            </div>
          </div>}
      </div>}
    </section>

    {mode === "discover" && <section style={{ ...card, padding: 14, marginTop: 12 }}><div style={title}>🔭 גילוי</div><div style={{ ...muted, fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>המנוע מחפש; ה־Lab מצייר. עכשיו אפשר לעבור בין מישור, שכבות ו־3D בלי להריץ חיפוש מחדש.</div>{findings.length > 0 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>{findings.map((f, i) => <span key={`${f.t}-${i}`} style={{ ...soft, padding: "6px 9px", color: P.ink, fontSize: 12 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />{f.t}</span>)}</div>}</section>}
    {mode === "investigate" && <section style={{ ...card, padding: 14, marginTop: 12 }}><div style={title}>🧬 Finding Workspace</div>{!ok ? <div style={{ ...muted, marginTop: 8 }}>בחר Finding באמצעות חיפוש.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginTop: 10 }}><div style={{ ...soft, padding: 11 }}><div style={title}>זהות</div><div style={{ ...muted, fontSize: 12 }}>{s.term} · {dir(axis.direction)} · {n(axis.skip)}</div></div><div style={{ ...soft, padding: 11 }}><div style={title}>חלון</div><div style={{ ...muted, fontSize: 12 }}>rows {n(geo.r0)}–{n(geo.r1)} · cw {n(geo.cw)}</div></div><div style={{ ...soft, padding: 11 }}><div style={title}>Renderer</div><div style={{ ...muted, fontSize: 12 }}>{viewMode} · depth {depth}</div></div></div>}<div style={{ marginTop: 9 }}><Next>פסוק/context on-demand יהיה שכבת־המחקר הראשונה שאינה רק renderer.</Next></div></section>}
    {mode === "judge" && <section style={{ ...card, padding: 14, marginTop: 12 }}><div style={title}>⚖️ Evidence Pack</div><div style={{ display: "grid", gap: 7, marginTop: 9 }}><div style={{ ...soft, padding: 10, color: P.ink, fontSize: 12.5 }}><b style={{ color: P.accentText }}>FACT · </b>{ok ? `«${s.termRaw || s.term}» נמצא בדילוג ${n(axis.skip)}, ${dir(axis.direction)}, start ${n(axis.start)}.` : "אין Finding פעיל."}</div><div style={{ ...soft, padding: 10, color: P.inkSoft, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>DISPLAY · </b>2D/שכבות/3D הם projections של אותה אמת בלבד.</div><div style={{ ...soft, padding: 10, color: P.inkSoft, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>HUMAN-GATE · </b>Canonical נשאר צוריאל בלבד.</div></div></section>}
    </main>

    <aside className="els-native-inspector" style={{ ...card, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={title}>Research Inspector</div><div style={{ ...muted, fontSize: 11.5 }}>{ok ? "Finding חי מהמנוע" : "ממתין לחיפוש"}</div></div><span style={{ ...soft, padding: "4px 7px", color: ok ? P.accentText : P.inkSoft, fontSize: 10.5, fontWeight: 900 }}>{s?.status || "idle"}</span></div>
      {selectedCell && <div style={{ ...soft, padding: 10, marginTop: 10 }}><div style={title}>תא נבחר · {selectedCell.letter}</div><div style={{ ...muted, fontSize: 11.5 }}>index {n(selectedCell.idx)} · row {n(selectedCell.row)} · col {n(selectedCell.col)}</div>{selectedCell.mark && <div style={{ color: P.accentText, fontSize: 11.5, marginTop: 5 }}>{selectedCell.mark.type === "main" ? "ציר ראשי" : "ממצא מצטלב"}{selectedCell.mark.start ? " · START" : ""}</div>}
        {selectedCell.mark?.type === "finding" && <div style={{ marginTop: 7 }}>
          <button type="button" onClick={() => setIsolateKey((k) => k === selectedCell.mark.color ? null : selectedCell.mark.color)} style={{ minHeight: 38, borderRadius: 10, padding: "0 11px", border: `1px solid ${P.border}`, background: isolateKey === selectedCell.mark.color ? P.accentBtn : "transparent", color: isolateKey === selectedCell.mark.color ? P.onAccent : P.accentText, fontSize: 12 }}>🔍 {isolateKey === selectedCell.mark.color ? "בטל בידוד" : "בודד ממצא זה"}</button>
          <div style={{ ...muted, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>בידוד ויזואלי לפי צבע-הממצא הקיים — לא זיהוי-ממצא קנוני. תאים באותו צבע יכולים להשתייך ליותר מ-Finding אחד.</div>
        </div>}</div>}
      {ok && <div style={{ marginTop: 10 }}><Fact label="מונח" value={`«${s.termRaw || s.term}»`} /><Fact label="מצב חיפוש" value={SEARCH_LABEL[s.search?.mode] || s.search?.mode || "—"} /><Fact label="דילוג / כיוון" value={`${n(axis.skip)} · ${dir(axis.direction)}`} /><Fact label="start / hitId" value={`${n(axis.start)} · ${axis.hitId || "—"}`} mono /><Fact label="מופע" value={`${n((occ.index ?? 0) + 1)} / ${n(occ.count)}`} /><Fact label="Matrix contract" value={`v${matrixVersion} · ${matrix?.rows?.length || 0} rows · ${markedCount} marks`} /><Fact label="Renderer" value={`${viewMode} · ${matrixRtl ? "RTL" : "LTR"}`} /><Fact label="צופן / מחבר" value={[prov.cipherSlug, prov.author].filter(Boolean).join(" · ") || "—"} /></div>}
      <button type="button" onClick={() => setRawOpen((v) => !v)} style={{ width: "100%", minHeight: 40, marginTop: 11, borderRadius: 11, border: `1px solid ${P.border}`, background: "transparent", color: P.accentText }}>{rawOpen ? "הסתר state" : "State גולמי"}</button>{rawOpen && <pre style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto", padding: 9, background: P.cardSoft, color: P.inkSoft, fontSize: 10 }}>{JSON.stringify(s, null, 2)}</pre>}
    </aside></div>
  </div>;
}
