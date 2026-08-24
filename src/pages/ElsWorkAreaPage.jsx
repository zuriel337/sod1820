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
const LAYER_TYPES = [
  { id: "verse", icon: "📜", title: "פסוק", available: true },
  { id: "heat", icon: "🔥", title: "חום", available: false },
];
const SCOPE_TYPES = [
  { id: "torah", icon: "📖", title: "תורה", sub: "5 חומשים · מהיר" },
  { id: "tanakh", icon: "📜", title: "כל התנ״ך", sub: "24 ספרים" },
];
const VERSE_PLANE_PALETTE = ["#5b8def", "#e0a541", "#4fb894", "#c96fb0", "#8b7fe0", "#d97a5c"];
const verseColor = (vi) => VERSE_PLANE_PALETTE[((vi % VERSE_PLANE_PALETTE.length) + VERSE_PLANE_PALETTE.length) % VERSE_PLANE_PALETTE.length];
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
  const [scope, setScope] = useState("torah");
  const queryRef = useRef(null);
  const engineBoxRef = useRef(null);
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
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [sceneScale, setSceneScale] = useState(1);
  const [explode, setExplode] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [isolateKey, setIsolateKey] = useState(null);
  const [activeLayers, setActiveLayers] = useState(() => new Set());
  const toggleLayer = useCallback((id) => {
    setActiveLayers((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);
  const verseOn = activeLayers.has("verse");
  const [verseLens, setVerseLens] = useState(null);
  const [activeVerseIndex, setActiveVerseIndex] = useState(null);

  useEffect(() => {
    applySeo({ title: "ELS Research Studio · סוד 1820", description: "סביבת המחקר החדשה של הצופן התנ״כי", path: "/lab/els" });
  }, []);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = window.setTimeout(() => setFirstRunHint(true), 1800);
    return () => window.clearTimeout(t);
  }, [waiting, runNonce]);

  // Native-speed search bridge: the canonical iframe stays mounted for every search in the same
  // corpus. We drive its EXISTING q/go/scope controls instead of reloading the 2.2MB engine.
  // Scope changes intentionally remount the hidden engine once; ordinary typing/search never does.
  useEffect(() => {
    if (!runNonce || !seed) return undefined;
    let cancelled = false;
    let tries = 0;
    let timer = null;
    const schedule = (ms = 25) => { timer = window.setTimeout(kick, ms); };
    const kick = () => {
      if (cancelled) return;
      const iframe = engineBoxRef.current?.querySelector('iframe[title="הצופן התנ״כי — דילוגי אותיות (ELS)"]');
      let doc = null;
      try { doc = iframe?.contentDocument || null; } catch { doc = null; }
      const innerQ = doc?.getElementById("q");
      const innerGo = doc?.getElementById("go");
      const scopeBtn = doc?.querySelector(`.scopebtn[data-scope="${scope}"]`);
      if (!innerQ || !innerGo || !scopeBtn) {
        if (++tries < 120) schedule(25);
        else setWaiting(false);
        return;
      }
      // TzofenEmbed posts the real tier on iframe load. Give that message a short window before
      // deciding that Tanakh is genuinely locked; never bypass the engine's own tanakhLocked().
      if (scope === "tanakh" && scopeBtn.classList.contains("locked") && tries < 16) {
        tries += 1; schedule(25); return;
      }
      if (!scopeBtn.classList.contains("on")) scopeBtn.click();
      if (!scopeBtn.classList.contains("on")) {
        // Existing click handler emitted the canonical registration gate; do NOT silently fall back
        // to a Torah search while the user explicitly selected Tanakh.
        setWaiting(false);
        return;
      }
      innerQ.value = seed;
      innerQ.dispatchEvent(new Event("input", { bubbles: true }));
      innerGo.click();
    };
    kick();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [runNonce, seed, scope]);

  // 3D interaction — pure renderer state, never search truth.
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
        setSceneScale(Math.max(0.5, Math.min(2.5, pinchS0 * (dist2(e.touches) / pinchD0))));
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
    e?.preventDefault?.();
    const q = queryRef.current?.value?.trim() || "";
    if (q.length < 2 || waiting) return;
    setEngineState(null); setSelectedCell(null); setSeed(q); setWaiting(true); setFirstRunHint(false); setRunNonce((x) => x + 1);
  };
  const selectScope = (next) => {
    if (next === scope) return;
    setScope(next);
    setEngineState(null);
    setSelectedCell(null);
    setVerseLens(null);
    setActiveVerseIndex(null);
    setWaiting(false);
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
  useEffect(() => { setVerseLens(null); setActiveVerseIndex(null); }, [lensRequest]);
  const onLens = useCallback((d) => {
    if (d?.lens !== "verse-context") return;
    const sig = d?.target ? JSON.stringify(d.target) : "";
    if (sig !== verseTargetSigRef.current) return;
    setVerseLens(d);
  }, []);
  const verseRanges = useMemo(
    () => (verseOn && verseLens?.ok && Array.isArray(verseLens.verses) ? verseLens.verses : []),
    [verseOn, verseLens]
  );
  const verseForIdx = useCallback((idx) => verseRanges.find((v) => idx >= v.from && idx <= v.to) || null, [verseRanges]);

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
    setActiveLayers(new Set()); setActiveVerseIndex(null);
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
    const rowsMeta = matrix.rows.map((row, ri) => {
      const cells = Array.from(row).map((letter, ci) => ({ letter, ci, idx: (r0 + ri) * S + (c0 + ci) }));
      if (matrixRtl) cells.reverse();
      return { ri, cells };
    });
    const showVersePlane = verseOn && isDepth && verseLens?.ok;

    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : "28px 20px 70px", background: P.cardSoft, minHeight: 470 }}>
      <div style={{ position: "relative", width: "max-content", minWidth: "100%", direction: "ltr", fontFamily: F.regal, transform: stageTransform, transformOrigin: "50% 42%", transformStyle: "preserve-3d", transition: "transform .28s ease" }}>
        {showVersePlane && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", transform: `translateZ(${-Math.max(18, Math.round(depth * 1.15 * explode))}px)`, transformStyle: "preserve-3d" }}>
          {rowsMeta.map(({ ri, cells }) => <div key={"vp-" + ri} style={{ display: "flex", justifyContent: "center", lineHeight: 1 }}>
            {cells.map(({ idx }) => {
              const vi = verseForIdx(idx);
              const on = Boolean(vi), isActive = on && activeVerseIndex != null && vi.verseIndex === activeVerseIndex;
              return <div key={"vp-" + idx} style={{ width: cellSize, height: cellSize + 3, flex: `0 0 ${cellSize}px`, borderRadius: showGrid ? 3 : 6, background: on ? verseColor(vi.verseIndex) : "transparent", opacity: !on ? 0 : isActive ? .8 : .32, transition: "opacity .2s ease" }} />;
            })}
          </div>)}
        </div>}
        {rowsMeta.map(({ ri, cells }) => <div key={ri} style={{ display: "flex", justifyContent: "center", lineHeight: 1, transformStyle: "preserve-3d" }}>
          {cells.map(({ letter, ci, idx }) => {
            const mark = marks.get(idx), isAxis = axisSet.has(idx) || mark?.type === "main", isStart = Boolean(mark?.start);
            const isolatedOut = Boolean(isolateKey) && mark?.type === "finding" && mark.color !== isolateKey;
            const dim = (focusMarks && !mark && !isAxis) || isolatedOut, active = selectedCell?.idx === idx;
            const z = !isDepth ? 0 : (isAxis ? depth * 1.55 : mark ? depth : 0) * explode;
            const background = isAxis ? P.accentBtn : mark?.color || "transparent";
            const vi = verseOn && !isDepth ? verseForIdx(idx) : null;
            const verseShadow = [];
            if (vi && vi.from === idx) verseShadow.push(`inset 0 2px 0 0 ${verseColor(vi.verseIndex)}`);
            if (vi && activeVerseIndex != null && vi.verseIndex === activeVerseIndex) verseShadow.push(`inset 0 0 0 2px ${P.accentText}`);
            const depthShadow = z ? `0 ${Math.round(z / 3)}px ${Math.round(z / 2)}px rgba(0,0,0,.28)` : "";
            const boxShadow = [depthShadow, ...verseShadow].filter(Boolean).join(", ") || "none";
            return <button key={idx} type="button" title={`index ${idx}`} onClick={() => {
              setSelectedCell({ idx, letter, row: r0 + ri, col: c0 + ci, mark: mark || null });
              if (verseOn) { const owner = verseForIdx(idx); setActiveVerseIndex(owner ? owner.verseIndex : null); }
            }} style={{ width: cellSize, height: cellSize + 3, flex: `0 0 ${cellSize}px`, padding: 0, display: "inline-grid", placeItems: "center", borderRadius: showGrid ? 3 : 6, border: isStart ? `2px solid ${P.accentText}` : active ? `1px solid ${P.accentText}` : showGrid ? `1px solid ${P.border}` : "1px solid transparent", outline: isStart ? `1px solid ${P.cardSoft}` : "none", background, color: isAxis ? P.onAccent : P.ink, fontFamily: F.regal, fontWeight: isAxis || mark ? 900 : 500, fontSize: Math.max(15, Math.round(cellSize * .68)), opacity: dim ? .16 : 1, cursor: "pointer", transform: z ? `translateZ(${z}px)` : "translateZ(0)", boxShadow, transition: "opacity .15s ease, transform .2s ease, box-shadow .2s ease", transformStyle: "preserve-3d" }}>{letter}</button>;
          })}
        </div>)}
      </div>
    </div>;
  };

  return <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1700, margin: "0 auto", padding: "14px 12px 90px" }}>
    <style>{`.els-native-layout{display:grid;grid-template-columns:minmax(0,1fr) 375px;gap:14px;align-items:start}.els-native-inspector{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}.els-native-modes,.els-view-modes,.els-scope-switch{display:flex;gap:8px;flex-wrap:wrap}.els-native-stage button:hover{filter:brightness(1.08);z-index:3}.els-fast-input{contain:layout style}@media(max-width:980px){.els-native-layout{grid-template-columns:1fr}.els-native-inspector{position:static;max-height:none}}@media(max-width:720px){.els-search-form{grid-template-columns:1fr!important}.els-scope-switch{grid-column:1/-1}.els-native-toolbar button{flex:1 1 auto}}`}</style>

    <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}><div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1 }}>SOD1820 · ELS LAB · MATRIX v{matrixVersion}</div>
      <h1 style={{ margin: "2px 0 0", color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,4vw,45px)", lineHeight: 1.05 }}>הצופן התנ״כי · Research Studio</h1>
    </div><span style={{ ...soft, padding: "7px 11px", color: seen ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 850 }}>{seen ? `● engine live · ${seen}` : "○ engine bridge"}</span>
    <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Advanced Engine ←</Link></header>

    <form className="els-search-form" onSubmit={runSearch} style={{ ...card, padding: 11, display: "grid", gridTemplateColumns: "minmax(230px,1fr) auto auto", gap: 9, marginBottom: 10, alignItems: "stretch" }}>
      <input ref={queryRef} className="els-fast-input" defaultValue="" minLength={2} autoComplete="off" spellCheck={false} placeholder={scope === "tanakh" ? "מה לחפש בכל התנ״ך?" : "מה לחפש בתורה?"} style={{ minHeight: 58, borderRadius: 13, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, padding: "0 16px", fontFamily: F.body, fontSize: 20, outline: "none" }} />
      <div className="els-scope-switch" role="group" aria-label="היקף חיפוש" style={{ ...soft, padding: 4, display: "flex", gap: 4, flexWrap: "nowrap" }}>
        {SCOPE_TYPES.map((sc) => <button key={sc.id} type="button" aria-pressed={scope === sc.id} onClick={() => selectScope(sc.id)} style={{ minHeight: 50, minWidth: sc.id === "tanakh" ? 126 : 100, borderRadius: 10, padding: "5px 11px", border: 0, background: scope === sc.id ? P.accentBtn : "transparent", color: scope === sc.id ? P.onAccent : P.ink, cursor: "pointer", fontFamily: F.heading, fontWeight: 900, lineHeight: 1.2 }}><span style={{ display: "block", fontSize: 13 }}>{sc.icon} {sc.title}</span><small style={{ display: "block", marginTop: 3, opacity: .72, fontSize: 9.5 }}>{sc.sub}</small></button>)}
      </div>
      <button type="submit" disabled={waiting} style={{ minHeight: 58, minWidth: 135, borderRadius: 13, border: 0, background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 900, opacity: waiting ? .55 : 1 }}>{waiting ? "מחפש…" : scope === "tanakh" ? "חפש בתנ״ך ✦" : "חפש בתורה ✦"}</button>
    </form>

    <div className="els-native-modes" style={{ marginBottom: 10 }}>{MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} style={{ minHeight: 46, padding: "0 19px", borderRadius: 999, border: `1px solid ${mode === m.id ? "transparent" : P.border}`, background: mode === m.id ? P.accentBtn : P.cardSoft, color: mode === m.id ? P.onAccent : P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 850 }}>{m.icon} {m.title}</button>)}
      <button onClick={() => setShowEngine((v) => !v)} type="button" style={{ marginInlineStart: "auto", minHeight: 46, padding: "0 15px", borderRadius: 999, border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>{showEngine ? "הסתר מנוע" : "Debug / onboarding"}</button>
    </div>

    {/* The engine stays mounted across searches in the same scope. Changing Torah↔Tanakh is the
        only deliberate remount so no previous-scope state leaks into the next corpus. */}
    <div ref={engineBoxRef} aria-hidden={!showEngine} style={showEngine ? { ...card, padding: 8, marginBottom: 10 } : { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: .001, pointerEvents: "none", insetInlineStart: -10000 }}><TzofenEmbed key={`scope-${scope}`} onState={onState} hiddenBridge={!showEngine} lensRequest={lensRequest} onLens={onLens} /></div>

    <div className="els-native-layout"><main style={{ minWidth: 0 }}><section style={{ ...card, overflow: "hidden", minHeight: 560 }}>
      <div style={{ padding: "13px 14px", borderBottom: `1px solid ${P.border}`, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ ...title, fontSize: 14 }}>מטריצת המחקר · {viewMode === "2d" ? "מישור" : viewMode === "layers" ? "שכבות עומק" : "מרחב 3D"}</div><div style={{ ...muted, fontSize: 11.5 }}>אותו Finding · אותו Snapshot · Renderer שונה בלבד</div></div>{ok && <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 12 }}>{scope === "tanakh" ? "📜 תנ״ך" : "📖 תורה"} · {n((occ.index ?? 0) + 1)} / {n(occ.count)} · S={n(geo.S)}</span>}</div>
        <div className="els-view-modes">{VIEW_MODES.map((v) => <button key={v.id} onClick={() => setViewMode(v.id)} type="button" style={{ minHeight: 46, padding: "0 18px", borderRadius: 13, border: `1px solid ${P.border}`, background: viewMode === v.id ? P.accentBtn : P.cardSoft, color: viewMode === v.id ? P.onAccent : P.ink, fontFamily: F.heading, fontWeight: 900, fontSize: 13 }}>{v.icon} {v.title}</button>)}
          {LAYER_TYPES.map((lt) => { const on = activeLayers.has(lt.id); return <button key={lt.id} type="button" disabled={!lt.available} onClick={() => lt.available && toggleLayer(lt.id)} style={{ minHeight: 46, padding: "0 18px", borderRadius: 13, border: `1px solid ${P.border}`, background: on ? P.accentBtn : P.cardSoft, color: on ? P.onAccent : lt.available ? P.ink : P.inkSoft, fontFamily: F.heading, fontWeight: 900, fontSize: 13, opacity: lt.available ? 1 : .45 }}>{lt.icon} {lt.title}{on ? " · פעיל" : !lt.available ? " · בהמשך" : ""}</button>; })}
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
      {ok && matrix?.rows?.length > 0 && <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 13, flexWrap: "wrap" }}><span style={{ ...muted, fontSize: 11 }}>● ציר ראשי</span><span style={{ ...muted, fontSize: 11 }}>◉ מסגרת = start</span><span style={{ ...muted, fontSize: 11 }}>✦ {markedCount} marks</span><span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>lenses: {lenses.length ? lenses.join(" · ") : "cells · marks"}</span>{verseOn && <span style={{ ...muted, fontSize: 11 }}>📜 Verse layer: {viewMode === "2d" ? "גבולות עדינים על התאים" : "מישור־context מתחת ל-Finding"}</span>}</div>}
      {verseOn && <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.border}` }}>
        <div style={{ ...title, fontSize: 12.5, marginBottom: 7 }}>📜 הקשר־פסוק · Verse Lens</div>
        {!ok ? <div style={{ ...muted, fontSize: 12 }}>אין Finding פעיל.</div>
          : !verseLens ? <div style={{ ...muted, fontSize: 12 }}>טוען הקשר…</div>
          : !verseLens.ok ? <div style={{ ...muted, fontSize: 12 }}>אין הקשר־פסוק זמין ל־Finding הנוכחי.</div>
          : <div style={{ display: "grid", gap: 6 }}>
            <div style={{ ...muted, fontSize: 11.5 }}>{verseLens.span?.fromRef}{verseLens.span?.fromRef !== verseLens.span?.toRef ? ` → ${verseLens.span?.toRef}` : ""} · {n(verseLens.span?.count)} פס׳{verseLens.truncated ? " (מקוצר)" : ""} · <span style={{ color: P.accentDim }}>לחיצה על פסוק מדגישה אותו במטריצה</span></div>
            <div style={{ display: "grid", gap: 5, maxHeight: 230, overflow: "auto" }}>
              {(verseLens.verses || []).map((v) => { const on = activeVerseIndex === v.verseIndex; return <div key={v.verseIndex} role="button" tabIndex={0} onClick={() => setActiveVerseIndex((cur) => cur === v.verseIndex ? null : v.verseIndex)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveVerseIndex((cur) => cur === v.verseIndex ? null : v.verseIndex); } }} style={{ ...soft, padding: 8, cursor: "pointer", outline: on ? `2px solid ${verseColor(v.verseIndex)}` : "none", background: on ? P.cardGrad : P.cardSoft }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 850 }}>{v.ref}</div>
                <div style={{ color: P.ink, fontSize: 13, marginTop: 2, lineHeight: 1.6 }}>{v.text || "…"}</div>
              </div>; })}
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
        {selectedCell.mark?.type === "finding" && <div style={{ marginTop: 7 }}><button type="button" onClick={() => setIsolateKey((k) => k === selectedCell.mark.color ? null : selectedCell.mark.color)} style={{ minHeight: 38, borderRadius: 10, padding: "0 11px", border: `1px solid ${P.border}`, background: isolateKey === selectedCell.mark.color ? P.accentBtn : "transparent", color: isolateKey === selectedCell.mark.color ? P.onAccent : P.accentText, fontSize: 12 }}>🔍 {isolateKey === selectedCell.mark.color ? "בטל בידוד" : "בודד ממצא זה"}</button><div style={{ ...muted, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>בידוד ויזואלי לפי צבע-הממצא הקיים — לא זיהוי-ממצא קנוני. תאים באותו צבע יכולים להשתייך ליותר מ-Finding אחד.</div></div>}</div>}
      {ok && <div style={{ marginTop: 10 }}><Fact label="מונח" value={`«${s.termRaw || s.term}»`} /><Fact label="היקף" value={s.scope === "tanakh" ? "כל התנ״ך · 24 ספרים" : "תורה · 5 חומשים"} /><Fact label="מצב חיפוש" value={SEARCH_LABEL[s.search?.mode] || s.search?.mode || "—"} /><Fact label="דילוג / כיוון" value={`${n(axis.skip)} · ${dir(axis.direction)}`} /><Fact label="start / hitId" value={`${n(axis.start)} · ${axis.hitId || "—"}`} mono /><Fact label="מופע" value={`${n((occ.index ?? 0) + 1)} / ${n(occ.count)}`} /><Fact label="Matrix contract" value={`v${matrixVersion} · ${matrix?.rows?.length || 0} rows · ${markedCount} marks`} /><Fact label="Renderer" value={`${viewMode} · ${matrixRtl ? "RTL" : "LTR"}`} /><Fact label="צופן / מחבר" value={[prov.cipherSlug, prov.author].filter(Boolean).join(" · ") || "—"} /></div>}
      <button type="button" onClick={() => setRawOpen((v) => !v)} style={{ width: "100%", minHeight: 40, marginTop: 11, borderRadius: 11, border: `1px solid ${P.border}`, background: "transparent", color: P.accentText }}>{rawOpen ? "הסתר state" : "State גולמי"}</button>{rawOpen && <pre style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto", padding: 9, background: P.cardSoft, color: P.inkSoft, fontSize: 10 }}>{JSON.stringify(s, null, 2)}</pre>}
    </aside></div>
  </div>;
}
