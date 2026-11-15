import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { fetchGematriaMethodTraceRaw } from "../../lib/research/gematriaTrace.js";
import { isVerifiedMethodTrace } from "../../lib/research/gematriaTracePresentation.js";
import { bindPathsToStructure, compoundStructureSpec, describeStructurePart, deriveConvergencePaths, evaluateConvergencePaths, STRUCTURE_PART_LABEL } from "../../lib/spatialRenderModel.js";
import { buildRazielPathFocus } from "../../lib/spatial/spatialLabRaziel.js";
import SpatialMethodStage2029, { S4ErrorBoundary, S4_FALLBACK_NOTE } from "./SpatialMethodStage2029.jsx";
import { evaluateS4Capability } from "../../lib/spatial/gpuCapability.js";
import HebrewGlyph2029 from "./HebrewGlyph2029.jsx";
import { useStepPlayer } from "./useStepPlayer.js";
import { LabControls, LabPartInfo } from "./SpatialLabPanel2029.jsx";
import "../experience2029/royal2029.css";
import "./spatialMethodStage2029.css";

// Multi-path convergence (Spatial v2 contract): N independently reproducible paths  inputs + quantities + operation -> V.
// This stage owns NO model, NO calculator and NO data: the paths come from the existing spatial model card, every operand phrase value must be
// confirmed by the canonical engine trace (gematria_method_trace, same RPC/verification as the Number page), the multiplier quantities keep their
// declared provenance and are labelled as source quantities (not engine facts). Only engine-verified paths are counted; an unverified path stays
// visible and explicitly NOT counted. Interpretation is not part of this view.
const STATUS_LABEL = Object.freeze({
  verified: "אומת במנוע",
  pending: "בודק במנוע…",
  no_phrase: "אין ביטוי מאומת למספר הזה",
  unavailable: "אימות המנוע אינו זמין",
  inconsistent: "הפעולה המוצהרת אינה עקבית",
});
const PLAY_MS = 1100;

// S4 (GPU) is route-scoped: three / @react-three/fiber live only in this lazily-loaded chunk, requested after the explicit "תלת־ממד" action.
// The default S2 view never imports or mounts it; any failure falls back to S2 with a truthful note.
const ConvergenceScene3D = lazy(() => import("./ConvergenceScene3D2029.jsx"));
const StructureScene3D = lazy(() => import("./StructureScene3D2029.jsx"));

function useTraces(phrases, injected) {
  const key = phrases.join("|");
  const [traces, setTraces] = useState(() => injected || {});
  useEffect(() => {
    if (injected) { setTraces(injected); return undefined; }
    let alive = true;
    setTraces(Object.fromEntries(phrases.map((phrase) => [phrase, { state: "loading" }])));
    phrases.forEach((phrase) => {
      fetchGematriaMethodTraceRaw("רגיל", phrase)
        .then((trace) => { if (alive) setTraces((prev) => ({ ...prev, [phrase]: { state: "ready", trace } })); })
        .catch(() => { if (alive) setTraces((prev) => ({ ...prev, [phrase]: { state: "error" } })); });
    });
    return () => { alive = false; };
  }, [key, injected]);
  return traces;
}

function PathList({ paths, index, goTo, reached }) {
  return <ol className="sod29-spatial-convergence__paths">
    {paths.map((path, i) => {
      const active = i === index;
      const lit = i < reached;
      return <li key={path.id} data-status={path.status} data-lit={lit ? "true" : "false"}>
        <button type="button" data-path-index={i} tabIndex={active ? 0 : -1} aria-pressed={active} className={active ? "is-focus" : undefined}
          aria-label={`${path.phrase || "ללא ביטוי"}, ${path.operand} כפול ${path.quantity} שווה ${path.result}. ${STATUS_LABEL[path.status]}`}
          onClick={() => goTo(i)}>
          <span className="sod29-spatial-convergence__phrase">
            {path.phrase ? <b><HebrewGlyph2029 text={path.phrase} /></b> : <b className="is-missing">—</b>}
            <small><bdi dir="ltr">{path.operand}</bdi></small>
          </span>
          <span className="sod29-spatial-convergence__times" aria-hidden="true">×</span>
          <span className="sod29-spatial-convergence__quantity"><b>{path.quantity}</b></span>
          <span className="sod29-spatial-convergence__status">{STATUS_LABEL[path.status]}</span>
        </button>
      </li>;
    })}
  </ol>;
}

export default function SpatialConvergenceStage2029({ card, traces: injectedTraces = null, depth = "S2", onRazielAction = null }) {
  const rootRef = useRef(null);
  const derived = useMemo(() => deriveConvergencePaths({ value: card?.value, operations: card?.operations, gematria: card?.gematria, quantities: card?.quantities }), [card]);
  const phrases = useMemo(() => [...new Set(derived.map((path) => path.phrase).filter(Boolean))], [derived]);
  const traces = useTraces(phrases, injectedTraces);
  const { paths, verifiedCount, total } = useMemo(() => evaluateConvergencePaths(derived, traces, isVerifiedMethodTrace), [derived, traces]);
  const player = useStepPlayer(rootRef, paths.length, PLAY_MS);
  const { index, goTo, toggle, playing, running, reduced, last } = player;
  useEffect(() => { player.reset(); }, [card?.slug, player.reset]);
  const [s4, setS4] = useState(false);
  const [s4Note, setS4Note] = useState(null);
  useEffect(() => { setS4(false); setS4Note(null); }, [card?.slug]);
  const promoteS4 = () => {
    const cap = evaluateS4Capability();
    if (!cap.ok) { setS4Note(S4_FALLBACK_NOTE[cap.reason]); return; }
    setS4Note(null);
    setS4(true);
  };
  const fallbackToS2 = (reason) => { setS4(false); setS4Note(S4_FALLBACK_NOTE[reason] || S4_FALLBACK_NOTE.render_error); };
  // Compound structure (cube + pentagons + triangles): only models whose spatial contract declares it get the structure view.
  const spec = useMemo(() => compoundStructureSpec({ shapeIdentity: card?.structure?.shapeIdentity, regions: card?.structure?.regions, structuralProperties: card?.quantities }, { faceWord: card?.structure?.cubeFaceWord }), [card]);
  const scenePaths = useMemo(() => bindPathsToStructure(paths, spec).map((path) => ({ ...path, label: STATUS_LABEL[path.status], partLabel: STRUCTURE_PART_LABEL[path.part] })), [paths, spec]);
  const [sceneView, setSceneView] = useState(spec ? "structure" : "paths");
  const [lab, setLab] = useState({ view: "overview", explode: false, spin: false, layers: {}, resetToken: 0 });
  useEffect(() => { setSceneView(spec ? "structure" : "paths"); setLab({ view: "overview", explode: false, spin: false, layers: {}, resetToken: 0 }); }, [card?.slug, Boolean(spec)]);
  const resetLab = () => { setLab((prev) => ({ view: "overview", explode: false, spin: false, layers: {}, resetToken: prev.resetToken + 1 })); player.reset(); };
  const askRaziel = () => {
    const selected = scenePaths[Math.min(index, last)];
    const focus = buildRazielPathFocus({ card, path: selected, partInfo: spec ? describeStructurePart(selected, spec) : null, statusLabel: STATUS_LABEL[selected?.status] });
    if (focus) onRazielAction?.("explain_spatial_path", focus);
  };

  if (!card || !Number.isFinite(Number(card.value)) || paths.length < 2) return null;
  const value = Number(card.value);
  const focus = paths[Math.min(index, last)];
  const pending = paths.some((path) => path.status === "pending");
  // RTL: ArrowLeft goes to the next path (reading order right→left), ArrowRight back.
  const onKeyDown = (event) => {
    const from = Number(event.target?.closest?.("[data-path-index]")?.dataset?.pathIndex ?? index);
    const keys = { ArrowDown: from + 1, ArrowLeft: from + 1, ArrowUp: from - 1, ArrowRight: from - 1, Home: 0, End: last };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(last, keys[event.key]));
    goTo(next);
    rootRef.current?.querySelector(`[data-path-index="${next}"]`)?.focus();
  };
  const reached = running ? index + 1 : total; // while playing, the funnel fills path by path
  return <section ref={rootRef} className="sod29-spatial-method-stage is-convergence" dir="rtl" data-experience-capability="spatial-method-stage"
    data-method-visual="multi-path-convergence" data-depth={s4 ? "S4" : depth} data-playing={running ? "true" : "false"} data-motion={reduced ? "reduced" : "allowed"}
    data-verified-paths={verifiedCount} data-total-paths={total} data-state={pending ? "loading" : "ready"} aria-label={`התכנסות למספר ${value}`}>
    <div className="sod29-spatial-method-stage__head">
      <div>
        <span>התכנסות מסלולים · {card.form}</span>
        <strong>{card.title}</strong>
        <small>{pending ? "בודק כל ביטוי מול המנוע הקנוני…" : `${verifiedCount} מתוך ${total} מסלולים אומתו במנוע ומתכנסים ל־${value}.`}</small>
      </div>
      <div className="sod29-spatial-method-stage__result"><small>מתכנסים אל</small><b>{value}</b></div>
    </div>
    <div className="sod29-spatial-method-stage__depth-controls">
      {s4
        ? <button type="button" data-s4-action="return" onClick={() => { setS4(false); setS4Note(null); }}>חזרה לתצוגה דו־ממדית</button>
        : <button type="button" data-s4-action="deepen" onClick={promoteS4}>תלת־ממד</button>}
      {s4Note ? <small role="status">{s4Note}</small> : null}
    </div>
    {s4 ? <div className="r29 r29-hall sod29-spatial-lab-hall" data-royal="true">
      <div className="sod29-spatial-lab__title"><b>מעבדת גימטריה מרחבית</b><span className="r29-rule" aria-hidden="true">◆</span></div>
      <LabControls sceneView={sceneView} onSceneView={setSceneView} canStructure={Boolean(spec)} view={lab.view} onView={(view) => setLab((p) => ({ ...p, view }))}
        explode={lab.explode} onExplode={(explode) => setLab((p) => ({ ...p, explode }))} spin={lab.spin} onSpin={(spin) => setLab((p) => ({ ...p, spin }))} reduced={reduced}
        layers={lab.layers} onLayer={(part) => setLab((p) => ({ ...p, layers: { ...p.layers, [part]: p.layers[part] === false } }))}
        parts={[...new Set(scenePaths.map((p) => p.part))]} onReset={resetLab} />
      <S4ErrorBoundary onFallback={fallbackToS2}>
        <Suspense fallback={<p className="sod29-spatial-method-stage__s4-loading" role="status">טוען תצוגה תלת־ממדית…</p>}>
          {sceneView === "structure" && spec
            ? <StructureScene3D spec={spec} value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={index} onSelect={goTo}
                view={lab.view} explode={lab.explode} spin={lab.spin} layers={lab.layers} resetToken={lab.resetToken} onFallback={fallbackToS2} />
            : <ConvergenceScene3D value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={index} onSelect={goTo} onFallback={fallbackToS2} />}
        </Suspense>
      </S4ErrorBoundary>
      <div className="sod29-spatial-convergence__funnel is-lab" style={{ "--sc-rows": paths.length }} role="group" aria-label="בחירת מסלול" onKeyDown={onKeyDown}>
        <PathList paths={paths} index={index} goTo={goTo} reached={total} />
      </div>
      {spec ? <LabPartInfo card={card} path={scenePaths[Math.min(index, last)]} spec={spec} onAskRaziel={onRazielAction ? askRaziel : null} /> : null}
    </div> : <div className="sod29-spatial-convergence__funnel" style={{ "--sc-rows": paths.length }} role="group" aria-label="מסלולי ההתכנסות" onKeyDown={onKeyDown}>
      <PathList paths={paths} index={index} goTo={goTo} reached={reached} />
      <svg className="sod29-spatial-convergence__lines" viewBox={`0 0 100 ${paths.length * 100}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {paths.map((path, i) => <path key={path.id} d={`M 0 ${i * 100 + 50} C 55 ${i * 100 + 50}, 45 ${paths.length * 50}, 100 ${paths.length * 50}`}
          vectorEffect="non-scaling-stroke" data-status={path.status} data-lit={i < reached ? "true" : "false"} />)}
      </svg>
      <div className="sod29-spatial-convergence__value" aria-hidden="true"><strong>{value}</strong><small>{verifiedCount}/{total}</small></div>
    </div>}
    <div className="sod29-spatial-convergence__focus" aria-live="polite">
      <p>
        <span>{focus.phrase ? `${focus.phrase} = ${focus.operand} (מנוע)` : `${focus.operand} — ללא ביטוי מאומת`}</span>
        <strong><bdi dir="ltr">{focus.operand} × {focus.quantity} = {focus.result}</bdi></strong>
        <small>הכמות {focus.quantity}: {focus.quantityProvenance || "מוצהרת במודל"} · הכפל הוא פעולה מתמטית מוצהרת, לא תוצאת מנוע.</small>
        {focus.status !== "verified" && focus.status !== "pending" ? <small className="sod29-spatial-convergence__warn">{STATUS_LABEL[focus.status]} — המסלול מוצג אך אינו נספר.</small> : null}
      </p>
      <div className="sod29-spatial-method-stage__actions">
        <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>המסלול הקודם</button>
        <button type="button" disabled={index >= last} onClick={() => goTo(index + 1)}>המסלול הבא</button>
        {reduced ? null : <button type="button" onClick={toggle}>{playing ? "עצירה" : "הפעלת ההתכנסות"}</button>}
      </div>
      {focus.status === "verified" ? <details className="sod29-spatial-convergence__ledger">
        <summary>איך הגענו ל־{focus.operand}?</summary>
        <SpatialMethodStage2029 expression={focus.phrase} methodKey="רגיל" trace={focus.trace} expectedValue={focus.operand} depth="S2" />
      </details> : focus.status === "pending" ? <div className="sod29-spatial-convergence__ledger is-reserved" role="status">בודק את הביטוי מול המנוע…</div> : null}
    </div>
    <p className="sod29-spatial-method-stage__boundary">ערכי הביטויים מגיעים מהמנוע הקנוני (gematria_method_trace). הכמויות מקורן בחומר המקור ומסומנות כך. פרשנות אינה חלק מהתצוגה.</p>
  </section>;
}

export const spatialConvergenceInternals = { deriveConvergencePaths, evaluateConvergencePaths, STATUS_LABEL };
