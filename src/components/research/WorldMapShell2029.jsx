import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorldGraphCanvas2029, { fitView } from "./WorldGraphCanvas2029.jsx";
import WorldMiniMap2029 from "./WorldMiniMap2029.jsx";
import WorldSourceInspector2029 from "./WorldSourceInspector2029.jsx";
import { buildWorldMapViewModel, describeWorldMapNode } from "../../lib/research/worldMapViewModel2029.js";
import { publicContextLabel } from "../experience2029/razielSessionSeam2029.js";
import "./worldMapShell2029.css";

const SHEET_QUERY = "(max-width: 900px)";
const EMPTY_LABELS = Object.freeze({});
const HUMAN_FALLBACKS = Object.freeze({ source: "מקור מחקר", occurrence: "הופעה במקור", finding: "ממצא מחקר", tree: "יעד מתועד" });

function humanNodeLabel(node, labels) {
  const raw = node.kind === "finding" && Object.prototype.hasOwnProperty.call(labels, node.ref)
    ? labels[node.ref] : node.kind === "finding" ? "" : node.label;
  const text = typeof raw === "string" ? raw.trim() : "";
  // IDs and locators remain in the model, but are not presentation titles.
  if (!text || text === node.ref || /^(?:uf1|node|channel_updates|world-material|edge|fixture|governance):/i.test(text)
    || /^(?:topic|post|source|finding|occurrence|tree|candidate|relation|related|mentions|unknown)$/i.test(text)) {
    return HUMAN_FALLBACKS[node.kind] || "פריט";
  }
  return publicContextLabel(text, 120) || HUMAN_FALLBACKS[node.kind] || "פריט";
}

function useSheetMode() {
  const [sheet, setSheet] = useState(() => typeof matchMedia === "function" && matchMedia(SHEET_QUERY).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const query = matchMedia(SHEET_QUERY);
    const update = () => setSheet(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return sheet;
}

/**
 * UI shell for the World map. Data arrives only as props: an already-approved
 * v1 projection, optional layers / candidates / exact entry points, and an
 * injected `openRelations` (see worldGraphRelationOpener2029). The shell has
 * no reader of its own and never loads the whole tree.
 */
export default function WorldMapShell2029({
  projection, window: windowSpec, layersByNode = {}, relationTargets = [], candidates = [], openRelations = null, fixtureNotice = null,
  humanReadable = false, findingLabelsByRef = EMPTY_LABELS,
}) {
  const sheetMode = useSheetMode();
  const [relationStates, setRelationStates] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const headingRef = useRef(null);
  const returnFocus = useRef(null);
  const fitted = useRef(false);
  const requests = useRef(new Map());

  const model = useMemo(() => {
    const raw = buildWorldMapViewModel({ projection, relationStates, window: windowSpec });
    if (!humanReadable) return raw;
    const labels = findingLabelsByRef && typeof findingLabelsByRef === "object" ? findingLabelsByRef : EMPTY_LABELS;
    return { ...raw, nodes: raw.nodes.map((node) => ({ ...node, label: humanNodeLabel(node, labels) })) };
  }, [projection, relationStates, windowSpec, humanReadable, findingLabelsByRef]);
  const detail = useMemo(() => describeWorldMapNode(model, projection, selectedId), [model, projection, selectedId]);
  const relationStatus = useMemo(() => Object.fromEntries(Object.entries(relationStates).map(([ref, state]) => [ref, state.status])), [relationStates]);

  // Fit once when the first real size arrives; later changes are the visitor's.
  useEffect(() => {
    if (!size || fitted.current) return;
    fitted.current = true;
    setView(fitView(model.extent, size));
  }, [size, model.extent]);

  const handleSize = useCallback((next) => setSize((prev) => (prev && prev.width === next.width && prev.height === next.height ? prev : next)), []);

  const select = useCallback((id) => {
    setSelectedId(id);
    if (sheetMode) {
      returnFocus.current = document.activeElement;
      setExpanded(false);
    }
  }, [sheetMode]);

  useEffect(() => {
    if (sheetMode && detail) headingRef.current?.focus();
  }, [sheetMode, selectedId, Boolean(detail)]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    setSelectedId(null);
    setExpanded(false);
    const node = returnFocus.current;
    returnFocus.current = null;
    if (node?.isConnected) node.focus();
  }, []);

  useEffect(() => {
    if (!detail) return undefined;
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detail, close]);

  const navigate = useCallback(({ cx, cy }) => {
    if (!size) return;
    setView((current) => ({ ...current, x: size.width / 2 - cx * current.k, y: size.height / 2 - cy * current.k }));
  }, [size]);

  const target = detail?.kind === "finding" ? relationTargets.find((row) => row.findingRef === detail.ref) || null : null;
  const open = useCallback(() => {
    if (!target || !openRelations || requests.current.has(target.findingRef)) return;
    const ref = target.findingRef;
    requests.current.set(ref, true);
    setRelationStates((prev) => ({ ...prev, [ref]: { status: "loading", relations: [], anchorNodeId: target.nodeId } }));
    Promise.resolve().then(() => openRelations(target)).then((result) => {
      setRelationStates((prev) => ({ ...prev, [ref]: { status: result.status, relations: result.relations || [], anchorNodeId: result.anchorNodeId || target.nodeId } }));
    }).catch(() => {
      setRelationStates((prev) => ({ ...prev, [ref]: { status: "failed", relations: [], anchorNodeId: target.nodeId } }));
    }).finally(() => requests.current.delete(ref));
  }, [target, openRelations]);

  const stats = model.stats;
  const treeNote = model.coverage.treeRelations ? null : "קשרי עץ לא נטענו — לא ידוע אם קיימים קשרים; אין זה אומר שאין.";
  const totalCopy = stats.sourcesTotal == null ? "אין נתון על מספר המקורות" : `${stats.sourcesShown} מתוך ${stats.sourcesTotal} מקורות בחלון`;

  return <section className="wm29" dir="rtl" aria-label="מפת עולם" data-sheet-mode={sheetMode || undefined} data-selected={selectedId ? "true" : undefined}>
    <header className="wm29-head">
      <h2>מפת עולם</h2>
      <p>מקור ← הופעה ← ממצא ← קשר עץ. כל שכבה נפרדת, וקשר עץ מצויר רק עם אסמכתא מתועדת.</p>
      {fixtureNotice ? <p className="wm29-fixture-notice" role="note">{fixtureNotice}</p> : null}
      <p className="wm29-window" role="status">{totalCopy}{stats.occurrencesHidden || stats.findingsHidden ? ` · ${stats.occurrencesHidden} הופעות ו־${stats.findingsHidden} ממצאים מחוץ לחלון` : ""}</p>
    </header>
    <div className="wm29-grid">
      <div className="wm29-area-mini">
        <WorldMiniMap2029 model={model} view={view} size={size} onNavigate={navigate} open={miniOpen} onToggle={() => setMiniOpen((v) => !v)} />
      </div>
      <div className="wm29-area-canvas">
        <WorldGraphCanvas2029 model={model} view={view} onViewChange={setView} onSize={handleSize} selectedId={selectedId}
          onSelect={select} relationStatus={relationStatus} treeLayerNote={treeNote} humanReadable={humanReadable} />
      </div>
      <div className="wm29-area-inspector">
        <WorldSourceInspector2029 detail={detail} layers={detail ? layersByNode[detail.id] : null}
          relation={target ? relationStates[target.findingRef] : null} relationTarget={openRelations ? target : null}
          onOpenRelations={open} relationsDisabled={!openRelations}
          candidates={detail?.kind === "finding" ? candidates.filter((row) => row.findingRef === detail.ref) : []}
          onClose={close} asSheet={sheetMode} expanded={expanded} onToggleExpanded={() => setExpanded((v) => !v)}
          headingRef={headingRef} humanReadable={humanReadable} />
      </div>
    </div>
  </section>;
}
