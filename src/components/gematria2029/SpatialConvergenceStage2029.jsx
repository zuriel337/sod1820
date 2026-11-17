import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import { fetchGematriaMethodTraceRaw } from "../../lib/research/gematriaTrace.js";
import { isVerifiedMethodTrace } from "../../lib/research/gematriaTracePresentation.js";
import { bindPathsToStructure, structureSpecFor, drawableSpec, isSingleSolid, describeStructurePart, deriveConvergencePaths, evaluateConvergencePaths, STRUCTURE_PART_LABEL } from "../../lib/spatialRenderModel.js";
import { buildRazielPathFocus } from "../../lib/spatial/spatialLabRaziel.js";
import SpatialMethodStage2029, { S4ErrorBoundary, S4_FALLBACK_NOTE } from "./SpatialMethodStage2029.jsx";
import { evaluateS4Capability } from "../../lib/spatial/gpuCapability.js";
import HebrewGlyph2029 from "./HebrewGlyph2029.jsx";
import { useStepPlayer } from "./useStepPlayer.js";
import { LabControls, LabPartInfo } from "./SpatialLabPanel2029.jsx";
import { DirectionSwitcher, DiscoveryPanel, LabMoreMenu, LabPrimaryBar, MuseumPanel, ResearchPanel } from "./SpatialLabDirections2029.jsx";
import { buildLabRows } from "../../lib/spatial/labRows.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { CLOSED_CUBE_JOURNEY, bookReaderAvailable, buildCubeDoorways, cubeJourneyHref, cubeJourneyRequested, cubeReturnTarget, readCubeJourney } from "../../lib/spatial/cubeJourney.js";
import CubeJourneyPanel2029 from "./CubeJourneyPanel2029.jsx";
import { NUMERIC_OPERATION_REGISTRY } from "../../lib/research/numericArithmeticOperations.js";
import { pathAriaLabel, pathEquationText, pathPresentation, semanticSummary } from "../../lib/spatial/pathSemantics.js";
import { ROYAL_LAB_DIRECTIONS, pickLabQuality, resolveRoyalLabDirection } from "../../lib/spatial/royalLabDirections.js";
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
  unsupported: "הנוסחה אינה נתמכת — מוצגת בלי אימות",
});
const PLAY_MS = 1100;

// S4 (GPU) is route-scoped: three / @react-three/fiber live only in this lazily-loaded chunk, requested after the explicit "תלת־ממד" action.
// The default S2 view never imports or mounts it; any failure falls back to S2 with a truthful note.
const ConvergenceScene3D = lazy(() => import("./ConvergenceScene3D2029.jsx"));
const StructureScene3D = lazy(() => import("./StructureScene3D2029.jsx"));
const IcosaScene3D = lazy(() => import("./IcosaScene3D2029.jsx"));
const CubeScene3D = lazy(() => import("./CubeScene3D2029.jsx"));

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
      // the row is drawn from the typed operation: the sign is the registry's symbol for the path's operation_key, the terms keep their roles
      // a commutative operation of more than two terms (1020: 6 × 10 × טוב) puts its EXPRESSION first — the finding leads, as in the two-term rows — and the shape/quantity terms follow;
      // a non-commutative operation keeps the declared order. A word that lands among the rest is drawn as a word (never as a number in the numeric face).
      const { ordered, lead: declaredLead, operatorSymbol, operationKey } = pathPresentation(path);
      const heroIndex = NUMERIC_OPERATION_REGISTRY.get(operationKey)?.commutative ? ordered.findIndex((t) => t.role === "expression") : -1;
      const lead = heroIndex > 0 ? ordered[heroIndex] : declaredLead;
      const rest = ordered.filter((t) => t !== lead);
      return <li key={path.id} data-status={path.status} data-lit={lit ? "true" : "false"} data-operation={path.operationKey || ""}>
        <button type="button" data-path-index={i} tabIndex={active ? 0 : -1} aria-pressed={active} className={active ? "is-focus" : undefined}
          aria-label={path.formulaStatus === "unsupported" ? `${path.expression}. ${STATUS_LABEL[path.status]}` : pathAriaLabel(path, STATUS_LABEL[path.status])}
          onClick={() => goTo(i)}>
          <span className="sod29-spatial-convergence__phrase">
            {lead?.role === "expression" ? <b><HebrewGlyph2029 text={lead.text} /></b> : <b className="is-missing">—</b>}
            <small><bdi dir="ltr">{lead ? (lead.role === "expression" ? lead.value : lead.text) : path.expression}</bdi></small>
          </span>
          <span className="sod29-spatial-convergence__times" aria-hidden="true">{operatorSymbol || ""}</span>
          <span className="sod29-spatial-convergence__quantity"><b>{rest.every((t) => t.role !== "expression")
            ? <bdi dir="ltr">{rest.map((t) => t.text).join(` ${operatorSymbol} `)}</bdi>
            : rest.map((t, k) => <React.Fragment key={k}>{k ? ` ${operatorSymbol} ` : ""}{t.role === "expression" ? <HebrewGlyph2029 text={t.text} /> : t.text}</React.Fragment>)}</b></span>
          <span className="sod29-spatial-convergence__status">{STATUS_LABEL[path.status]}</span>
        </button>
      </li>;
    })}
  </ol>;
}

// the ledger of every expression of the path (a sum of two phrases has two): same shared S2 stage, one details per expression
function LedgerFor({ path }) {
  const terms = (path.terms || []).filter((t) => t.role === "expression");
  if (path.status !== "verified" || !terms.length) return null;
  return <>{terms.map((t) => <details key={t.text} className="sod29-spatial-convergence__ledger">
    <summary>איך הגענו ל־{t.value}?</summary>
    <SpatialMethodStage2029 expression={t.text} methodKey="רגיל" trace={path.traces?.[t.text] || path.trace} expectedValue={t.value} depth="S2" />
  </details>)}</>;
}

// Hands the router's navigate and location to the stage without making the stage depend on being inside a router (it is also rendered on its own in tests).
// A same-page navigation (to another card, or an exact return back to this one) arrives here as a location change.
function RouterBridge({ navigateRef, onLocation }) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { navigateRef.current = navigate; return () => { navigateRef.current = null; }; }, [navigate, navigateRef]);
  useEffect(() => { onLocation(location); }, [location.pathname, location.search, location.hash]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function SpatialConvergenceStage2029({ card, traces: injectedTraces = null, depth = "S2", onRazielAction = null }) {
  const rootRef = useRef(null);
  const derived = useMemo(() => deriveConvergencePaths({ value: card?.value, operations: card?.operations, gematria: card?.gematria, quantities: card?.quantities, assignments: card?.assignments }), [card]);
  const phrases = useMemo(() => [...new Set(derived.flatMap((path) => path.expressions || []))], [derived]);
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
  // one entry point for every shape family the lab draws (compound pentagon, icosahedron, cube); null = no 3D structure for this model. A single solid is
  // drawn only when one of the model's own operations is carried by it (drawableSpec): a cube-shaped model whose operations never use its faces is not a cube.
  const spec = useMemo(() => drawableSpec(structureSpecFor({ shapeIdentity: card?.structure?.shapeIdentity, regions: card?.structure?.regions, structuralProperties: card?.quantities, gematria: card?.gematria,
    cubeFaceWord: card?.structure?.cubeFaceWord, assignments: card?.assignments, cubeLayout: card?.cubeLayout }), derived), [card, derived]);
  const scenePaths = useMemo(() => bindPathsToStructure(paths, spec).map((path) => ({ ...path, label: STATUS_LABEL[path.status], partLabel: STRUCTURE_PART_LABEL[path.part] })), [paths, spec]);
  // Royal V2 experiment: ONE engine / model / dataset, several presentation directions (A Museum · B Discovery · C Lab · V1 = previous look).
  // The initial direction may be chosen with ?lab=museum|discovery|lab|v1 (or a/b/c) so the directions can be compared by link; it is a display choice only.
  const [directionId, setDirectionId] = useState(() => resolveRoyalLabDirection(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("lab")).id);
  const direction = ROYAL_LAB_DIRECTIONS[directionId];
  // ?glyphs=text previews the readable text fallback used when a 3D letter cannot load (diagnostics; display only)
  const glyphs3D = useMemo(() => (typeof window === "undefined" ? true : new URLSearchParams(window.location.search).get("glyphs") !== "text"), []);
  const quality = useMemo(() => pickLabQuality({ width: typeof window === "undefined" ? 1024 : window.innerWidth, cores: typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency, saveData: typeof navigator !== "undefined" && Boolean(navigator.connection?.saveData) }), []);
  // the museum's gentle camera drift needs continuous frames: only on the rich tier (never on phones / data-saver), and the person can switch it off
  const freshLab = (dir, resetToken = 0) => ({ view: "overview", explode: false, spin: Boolean(dir.look.drift) && quality === "rich", layers: {}, resetToken });
  const [sceneView, setSceneView] = useState(spec ? "structure" : "paths");
  const [lab, setLab] = useState(() => freshLab(ROYAL_LAB_DIRECTIONS[directionId]));
  const [discover, setDiscover] = useState(-1);
  useEffect(() => { setSceneView(spec ? "structure" : "paths"); setLab(freshLab(direction)); setDiscover(-1); }, [card?.slug, Boolean(spec)]);
  const resetLab = () => { setLab((prev) => freshLab(direction, prev.resetToken + 1)); setDiscover(-1); player.reset(); };
  const changeDirection = (id) => { const next = ROYAL_LAB_DIRECTIONS[id]; setDirectionId(id); setLab((prev) => freshLab(next, prev.resetToken + 1)); setDiscover(-1); setSceneView(spec ? "structure" : "paths"); };
  const askRaziel = () => {
    const selected = scenePaths[Math.min(index, last)];
    const focus = buildRazielPathFocus({ card, path: selected, partInfo: spec ? describeStructurePart(selected, spec) : null, statusLabel: STATUS_LABEL[selected?.status] });
    if (focus) onRazielAction?.("explain_spatial_path", focus);
  };

  const rows = useMemo(() => buildLabRows({ paths: scenePaths, spec, locators: card?.source?.locators || [], statusLabels: STATUS_LABEL }), [scenePaths, spec, card]);

  // ---- the inner exploration of a cube (1020): the state is the page's URL (cube=in&face=…&door=…&dir=…), so a reload, the browser's Back and the frame's existing
  // "exact return" restore the same face and doorway. Only the card named by the hash owns it. Nothing is stored; the book reader is only linked.
  const isCube = spec?.family === "cube";
  const research = useResearch();
  const inRouter = useInRouterContext();
  const navigateRef = useRef(null);
  const ownsUrl = () => typeof window !== "undefined" && window.location.hash === `#spatial-${card?.slug}`;
  const [journey, setJourney] = useState(() => (isCube && ownsUrl() ? readCubeJourney(window.location.search) : CLOSED_CUBE_JOURNEY));
  const restored = useRef(journey.inside);
  const writeUrl = useCallback((next) => {
    if (typeof window === "undefined" || !ownsUrl()) return;
    window.history.replaceState(window.history.state, "", cubeJourneyHref(window.location, next));
  }, [card?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeJourney = (patch) => { const next = { ...journey, ...patch }; setJourney(next); writeUrl(next); return next; };
  const boundPath = isCube ? scenePaths.find((p) => p.part === "cube") || null : null;
  const doorways = useMemo(() => (isCube ? buildCubeDoorways({ card, path: boundPath, dir: journey.dir, readerAvailable: bookReaderAvailable(), lab: directionId }) : []),
    [isCube, card, boundPath, journey.dir, directionId]);
  const enterCube = () => { changeJourney({ inside: true, door: null }); if (!s4) promoteS4(); };
  // leaving the inside puts focus back on the entry control — once it is on the page again (it is only drawn outside)
  const focusEntryNext = useRef(false);
  const exitCube = () => { focusEntryNext.current = true; changeJourney({ inside: false, door: null }); };
  useEffect(() => {
    if (journey.inside || !focusEntryNext.current) return undefined;
    focusEntryNext.current = false;
    const frame = requestAnimationFrame(() => rootRef.current?.querySelector("[data-cube-enter]")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [journey.inside]);
  const leaveThrough = (door, event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const state = changeJourney({ inside: true, door: door.id });
    // the frame's EXISTING exact-return (Research Context returnTo): the same page, face, doorway and direction
    research.updateResearchContext?.({ returnTo: cubeReturnTarget({ location: window.location, card, state, doorId: door.id }) });
    if (navigateRef.current) { event.preventDefault(); navigateRef.current(door.href); }
  };
  // arriving back (exact return / reload / Back): open the 3D inside when the device can, and put focus on the doorway that was left. The page may still be settling
  // (lazy chunks, the World page's own anchor scroll), so the focus is re-asserted a few times — and stops at the person's first interaction.
  const stopArrive = useRef(null);
  const arrive = (door) => {
    stopArrive.current?.();
    promoteS4();
    const targetId = door ? `cube-door-${door}` : "cube-journey";
    let stopped = false, scrolled = false;
    const attempt = () => {
      if (stopped) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      if (!scrolled) { scrolled = true; target.scrollIntoView?.({ block: "center", behavior: "auto" }); }
      if (document.activeElement !== target && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) target.focus?.({ preventScroll: true });
    };
    const timers = [0, 250, 700, 1500, 2600].map((ms) => window.setTimeout(() => requestAnimationFrame(attempt), ms));
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    const stop = () => { stopped = true; timers.forEach(clearTimeout); events.forEach((name) => window.removeEventListener(name, stop, true)); };
    events.forEach((name) => window.addEventListener(name, stop, { capture: true, passive: true, once: true }));
    stopArrive.current = stop;
  };
  const arriveRef = useRef(null); arriveRef.current = arrive;
  useEffect(() => {
    if (restored.current) { restored.current = false; arriveRef.current(journey.door); }
    return () => stopArrive.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // a navigation that stays on this page: away (another card) closes the inside; back (exact return) opens it again at the same face and doorway
  const locationKey = useRef(null);
  const onLocationRef = useRef(null);
  onLocationRef.current = (loc) => {
    const key = `${loc.pathname}${loc.search}${loc.hash}`;
    if (locationKey.current === null) { locationKey.current = key; return; } // the first report is the URL this stage mounted on
    if (locationKey.current === key) return;
    locationKey.current = key;
    if (!isCube) return;
    const want = cubeJourneyRequested(loc, card?.slug) ? readCubeJourney(loc.search) : CLOSED_CUBE_JOURNEY;
    const same = journey.inside === want.inside && journey.face === want.face && journey.door === want.door && journey.dir === want.dir;
    if (!same) setJourney(want);
    if (want.inside) arriveRef.current(want.door);
  };
  // Picking a part/path (in the scene, a medal or the table). Discovery also moves in (focus), opens the layers and starts the reveal.
  const pick = (i) => {
    goTo(i);
    if (direction.progressive) setDiscover(0);
    if (direction.autoFocus || direction.autoExplode) setLab((p) => ({ ...p, view: direction.autoFocus ? "focus" : p.view, explode: direction.autoExplode ? true : p.explode }));
  };
  // a convergence needs two paths; the one exception is a solid whose single operation IS its structure (faces × the face word [× repetitions])
  if (!card || !Number.isFinite(Number(card.value)) || paths.length < (isSingleSolid(spec) ? 1 : 2)) return null;
  const value = Number(card.value);
  const focus = paths[Math.min(index, last)];
  const pending = paths.some((path) => path.status === "pending");
  // a model that is not the compound pentagon family has no structure to direct: it keeps the previous (V1) chrome
  const dir = spec ? direction : ROYAL_LAB_DIRECTIONS.v1;
  const ledgerNode = focus.status === "verified" ? <LedgerFor path={focus} /> : null;
  const focusSummary = semanticSummary(focus);
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
  const journeyPanel = isCube && journey.inside
    ? <CubeJourneyPanel2029 card={card} spec={spec} path={boundPath} journey={journey} doorways={doorways} ledger={ledgerNode} reduced={reduced}
        onFace={(i) => changeJourney({ face: i, door: null })} onExit={exitCube} onDir={(key, door) => changeJourney({ dir: key, door: door || journey.door })} onLeave={leaveThrough} />
    : null;
  const reached = running ? index + 1 : total; // while playing, the funnel fills path by path
  return <section ref={rootRef} className="sod29-spatial-method-stage is-convergence" dir="rtl" data-experience-capability="spatial-method-stage"
    data-method-visual="multi-path-convergence" data-depth={s4 ? "S4" : depth} data-playing={running ? "true" : "false"} data-motion={reduced ? "reduced" : "allowed"}
    data-verified-paths={verifiedCount} data-total-paths={total} data-state={pending ? "loading" : "ready"} aria-label={`התכנסות למספר ${value}`}>
    <div className="sod29-spatial-method-stage__head">
      <div>
        <span>{total === 1 ? "המחשת מבנה" : "התכנסות מסלולים"} · {card.form}</span>
        <strong>{card.title}</strong>
        <small>{pending ? "בודק כל ביטוי מול המנוע הקנוני…" : total === 1 ? (verifiedCount === 1 ? `המסלול אומת במנוע ומתכנס ל־${value}.` : "המסלול טרם אומת במנוע ואינו נספר.") : `${verifiedCount} מתוך ${total} מסלולים אומתו במנוע ומתכנסים ל־${value}.`}</small>
      </div>
      <div className="sod29-spatial-method-stage__result"><small>מתכנסים אל</small><b>{value}</b></div>
    </div>
    <div className="sod29-spatial-method-stage__depth-controls">
      {s4
        ? <button type="button" data-s4-action="return" onClick={() => { setS4(false); setS4Note(null); }}>חזרה לתצוגה דו־ממדית</button>
        : <button type="button" data-s4-action="deepen" onClick={promoteS4}>תלת־ממד</button>}
      {s4Note ? <small role="status">{s4Note}</small> : null}
    </div>
    {inRouter ? <RouterBridge navigateRef={navigateRef} onLocation={(loc) => onLocationRef.current?.(loc)} /> : null}
    {isCube && !journey.inside ? <div className="r29 sod29-cube-entry">
      <button type="button" className="r29-btn" data-cube-enter onClick={enterCube}>היכנס לתוך הקובייה</button>
      <small>חקירה מבפנים: בוחרים פאה ופותחים את הדלתות שלה — אימות במנוע, דף המספר, החישוב של צבי והמקורות. זו אינה התקרבות של המצלמה.</small>
    </div> : null}
    {s4 ? <div className="r29 r29-hall sod29-spatial-lab-hall" data-royal="true" data-direction={dir.id} data-quality={quality}>
      <div className="sod29-spatial-lab__title"><b>מעבדת גימטריה מרחבית</b><span className="r29-rule" aria-hidden="true">◆</span></div>
      {spec ? <DirectionSwitcher direction={dir.id} onChange={changeDirection} /> : null}
      {isCube && journey.inside ? null : dir.chrome === "v1"
        ? <LabControls sceneView={sceneView} onSceneView={setSceneView} canStructure={Boolean(spec)} view={lab.view} onView={(view) => setLab((p) => ({ ...p, view }))}
            explode={lab.explode} onExplode={(explode) => setLab((p) => ({ ...p, explode }))} spin={lab.spin} onSpin={(spin) => setLab((p) => ({ ...p, spin }))} reduced={reduced}
            layers={lab.layers} onLayer={(part) => setLab((p) => ({ ...p, layers: { ...p.layers, [part]: p.layers[part] === false } }))}
            parts={[...new Set(scenePaths.map((p) => p.part))]} onReset={resetLab} />
        : <LabPrimaryBar sceneView={sceneView} onSceneView={setSceneView} explode={lab.explode} onExplode={(explode) => setLab((p) => ({ ...p, explode }))} canStructure={Boolean(spec)}>
            <LabMoreMenu sceneView={sceneView} view={lab.view} onView={(view) => setLab((p) => ({ ...p, view }))} spin={lab.spin} onSpin={(spin) => setLab((p) => ({ ...p, spin }))} reduced={reduced}
              layers={lab.layers} onLayer={(part) => setLab((p) => ({ ...p, layers: { ...p.layers, [part]: p.layers[part] === false } }))} parts={[...new Set(scenePaths.map((p) => p.part))]} onReset={resetLab} />
          </LabPrimaryBar>}
      <S4ErrorBoundary onFallback={fallbackToS2}>
        <Suspense fallback={<p className="sod29-spatial-method-stage__s4-loading" role="status">טוען תצוגה תלת־ממדית…</p>}>
          {sceneView === "structure" && spec?.family === "icosahedron"
            ? <IcosaScene3D spec={spec} value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={index} onSelect={pick}
                view={lab.view} explode={lab.explode} spin={lab.spin} resetToken={lab.resetToken} onFallback={fallbackToS2} look={dir.look} quality={quality} glyphs3D={glyphs3D} />
            : sceneView === "structure" && spec?.family === "cube"
            ? <CubeScene3D spec={spec} value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={index} onSelect={journey.inside ? undefined : pick}
                view={lab.view} explode={lab.explode} spin={lab.spin} resetToken={lab.resetToken} onFallback={fallbackToS2} look={dir.look} quality={quality} glyphs3D={glyphs3D}
                inside={journey.inside} selectedFace={journey.face} onFaceChange={(i) => changeJourney({ face: i, door: journey.inside ? null : journey.door })} />
            : sceneView === "structure" && spec
            ? <StructureScene3D spec={spec} value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={discover < 0 && dir.progressive ? -1 : index} onSelect={pick}
                view={lab.view} explode={lab.explode} spin={lab.spin} layers={lab.layers} resetToken={lab.resetToken} onFallback={fallbackToS2} look={dir.look} quality={quality} glyphs3D={glyphs3D} />
            : <ConvergenceScene3D value={value} paths={scenePaths} verifiedCount={verifiedCount} total={total} focusIndex={index} onSelect={goTo} onFallback={fallbackToS2} />}
        </Suspense>
      </S4ErrorBoundary>
      {isCube && journey.inside ? null : <>
      {dir.chrome === "museum" ? <MuseumPanel rows={rows} index={Math.min(index, last)} onPick={pick} value={value} onAskRaziel={onRazielAction ? askRaziel : null} /> : null}
      {dir.chrome === "discovery" ? <DiscoveryPanel rows={rows} index={Math.min(index, last)} discover={discover} onDiscover={setDiscover} onPick={pick} value={value} onAskRaziel={onRazielAction ? askRaziel : null} ledger={ledgerNode} /> : null}
      {dir.chrome === "lab" ? <ResearchPanel rows={rows} index={Math.min(index, last)} onPick={pick} value={value} onAskRaziel={onRazielAction ? askRaziel : null} ledger={ledgerNode} /> : null}
      {dir.chrome === "v1" ? <>
        <div className="sod29-spatial-convergence__funnel is-lab" style={{ "--sc-rows": paths.length }} role="group" aria-label="בחירת מסלול" onKeyDown={onKeyDown}>
          <PathList paths={paths} index={index} goTo={goTo} reached={total} />
        </div>
        {spec ? <LabPartInfo card={card} path={scenePaths[Math.min(index, last)]} spec={spec} onAskRaziel={onRazielAction ? askRaziel : null} /> : null}
      </> : null}
      </>}
    </div> : <div className="sod29-spatial-convergence__funnel" style={{ "--sc-rows": paths.length }} role="group" aria-label="מסלולי ההתכנסות" onKeyDown={onKeyDown}>
      <PathList paths={paths} index={index} goTo={goTo} reached={reached} />
      <svg className="sod29-spatial-convergence__lines" viewBox={`0 0 100 ${paths.length * 100}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {paths.map((path, i) => <path key={path.id} d={`M 0 ${i * 100 + 50} C 55 ${i * 100 + 50}, 45 ${paths.length * 50}, 100 ${paths.length * 50}`}
          vectorEffect="non-scaling-stroke" data-status={path.status} data-lit={i < reached ? "true" : "false"} />)}
      </svg>
      <div className="sod29-spatial-convergence__value" aria-hidden="true"><strong>{value}</strong><small>{verifiedCount}/{total}</small></div>
    </div>}
    {journeyPanel}
    {s4 && dir.chrome !== "v1" ? null : <div className="sod29-spatial-convergence__focus" aria-live="polite">
      <p>
        <span>{focusSummary.supported ? (focusSummary.engineParts.length ? `${focusSummary.engineParts.map((p) => p.replace("=", " = ")).join(" · ")} (מנוע)` : `${focus.operand} — ללא ביטוי מאומת`) : `${focus.expression} — נוסחה שאינה נתמכת`}</span>
        <strong><bdi dir="ltr">{pathEquationText(focus, { numeric: true })}</bdi></strong>
        <small>{focusSummary.supported
          ? `${focusSummary.parts.filter((p) => !p.engine).map((p) => `${p.role === "value" ? "הערך" : "הכמות"} ${p.text}: ${p.origin}`).join(" · ")}${focusSummary.parts.some((p) => !p.engine) ? " · " : ""}ה${focusSummary.operationLabel} הוא פעולה מתמטית מוצהרת, לא תוצאת מנוע.`
          : `${focus.unsupportedReason || "הנוסחה אינה בדקדוק הנתמך"} — לא נבדקה ולא נספרת.`}</small>
        {focus.status !== "verified" && focus.status !== "pending" ? <small className="sod29-spatial-convergence__warn">{STATUS_LABEL[focus.status]} — המסלול מוצג אך אינו נספר.</small> : null}
      </p>
      <div className="sod29-spatial-method-stage__actions">
        <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>המסלול הקודם</button>
        <button type="button" disabled={index >= last} onClick={() => goTo(index + 1)}>המסלול הבא</button>
        {reduced ? null : <button type="button" onClick={toggle}>{playing ? "עצירה" : "הפעלת ההתכנסות"}</button>}
      </div>
      {focus.status === "verified" ? <LedgerFor path={focus} /> : focus.status === "pending" ? <div className="sod29-spatial-convergence__ledger is-reserved" role="status">בודק את הביטוי מול המנוע…</div> : null}
    </div>}
    <p className="sod29-spatial-method-stage__boundary">ערכי הביטויים מגיעים מהמנוע הקנוני (gematria_method_trace). הכמויות מקורן בחומר המקור ומסומנות כך. פרשנות אינה חלק מהתצוגה.</p>
  </section>;
}

export const spatialConvergenceInternals = { deriveConvergencePaths, evaluateConvergencePaths, STATUS_LABEL };
