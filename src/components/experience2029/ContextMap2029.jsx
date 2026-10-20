import React, { useEffect, useMemo, useState } from "react";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import { buildContextMap, TIER_LABEL, BASIS_LABEL, PENDING_LABEL } from "../../lib/research/contextMapProjection2029.js";
import "./contextMap2029.css";

// Radial slots for up to five neighbours, clockwise from the top. Pure geometry for the
// wide layout; the narrow layout is a stacked list and ignores these coordinates.
const RING = { direct: 1, secondary: 1.1, far: 1.2 };
const RX = 37, RY = 34;
const slot = (index, count, tier) => {
  const start = count > 1 ? -90 - 180 / count : -90;
  const angle = (start + (360 / Math.max(count, 1)) * index) * (Math.PI / 180);
  const scale = RING[tier] || RING.direct;
  return { x: 50 + RX * scale * Math.cos(angle), y: 50 + RY * scale * Math.sin(angle) };
};

/**
 * Presentation of one already-projected map. It owns no data, graph, ranking or navigation:
 * the host supplies `map` (contextMapProjection2029) and the three actions.
 */
export function ContextMap2029({ map, selectedId = null, onSelect, onRefocus, onOpen, audience = "public" }) {
  const selected = map?.neighbours?.find((item) => item.id === selectedId) || null;
  if (!map?.focus) return null;
  if (!map.neighbours.length) {
    return <p className="sod29-ctxmap-empty" role="status" data-context-map-empty={map.empty}>
      {map.empty === "no_approved"
        ? "עדיין אין קשר מאושר להצגה סביב המוקד הזה."
        : "אין עדיין קשרים מתאימים סביב המוקד הזה."}
    </p>;
  }
  return <div className="sod29-ctxmap" data-context-map data-audience={audience}>
    <div className="sod29-ctxmap-stage">
      <svg className="sod29-ctxmap-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {map.neighbours.map((item, index) => {
          const { x, y } = slot(index, map.neighbours.length, item.tier);
          return <line key={item.id} x1="50" y1="50" x2={x} y2={y} data-basis={item.basis} data-tier={item.tier}
            className={`sod29-ctxmap-line${item.id === selectedId ? " is-selected" : ""}`} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="sod29-ctxmap-focus" data-context-map-focus>
        <small>המוקד</small>
        <strong dir="auto">{map.focus.label}</strong>
      </div>
      <ul className="sod29-ctxmap-nodes" aria-label="קשרים סביב המוקד">
        {map.neighbours.map((item, index) => {
          const { x, y } = slot(index, map.neighbours.length, item.tier);
          return <li key={item.id} style={{ "--cm-x": `${x}%`, "--cm-y": `${y}%` }}>
            <button type="button" className="sod29-ctxmap-node" aria-pressed={item.id === selectedId}
              data-tier={item.tier} data-basis={item.basis} data-pending={item.pending || undefined}
              onClick={() => onSelect?.(item.id === selectedId ? null : item.id)}>
              <span className="sod29-ctxmap-node-label" dir="auto">{item.label}</span>
              <span className="sod29-ctxmap-node-meta">
                <span>{item.tierLabel}</span>
                <span className="sod29-ctxmap-chip" data-basis={item.basis}>{item.basisLabel}</span>
                {item.calculation && item.basis !== "verified_calculation" ? <span className="sod29-ctxmap-chip" data-calculation="verified">{BASIS_LABEL.verified_calculation}</span> : null}
              </span>
            </button>
          </li>;
        })}
      </ul>
    </div>
    <ul className="sod29-ctxmap-legend" aria-label="מקרא">
      <li data-basis="verified_calculation">{BASIS_LABEL.verified_calculation}</li>
      <li data-basis="documented_source">{BASIS_LABEL.documented_source}</li>
      <li data-basis="mention">{BASIS_LABEL.mention}</li>
      <li data-basis="suggested">{audience === "admin" ? PENDING_LABEL : BASIS_LABEL.suggested}</li>
    </ul>
    {selected ? <ContextualInspector2029 className="sod29-ctxmap-why" ariaLabel="למה זה קשור?" contextId={`context-map:${selected.id}`}
      kicker={`${selected.tierLabel} · ${selected.basisLabel}`} title={selected.label} subtitle="למה זה קשור?"
      actions={<>
        <button type="button" className="sod29-action" onClick={() => onRefocus?.(selected)}>מקד כאן</button>
        {selected.href ? <button type="button" className="sod29-action primary" onClick={() => onOpen?.(selected)}>פתח</button> : null}
      </>}>
      <p>{selected.why}</p>
      {selected.calculation ? <p className="sod29-ctxmap-calc" data-calculation="verified">
        חישוב מאומת במנוע: <b dir="ltr">{selected.calculation.value}</b> · {selected.calculation.methodLabel}
        {selected.calculation.extra.map((entry) => <span key={entry.methodLabel}> · <b dir="ltr">{entry.value}</b> {entry.methodLabel}</span>)}
      </p> : null}
      {selected.pending ? <p className="sod29-ctxmap-pending" role="note">{PENDING_LABEL}: מוצג למנהל בלבד ואינו קשר מאושר.</p> : null}
    </ContextualInspector2029> : <p className="sod29-ctxmap-hint">בחרו נקודה כדי לראות למה היא קשורה.</p>}
  </div>;
}

/**
 * Lazy host: nothing is read until the reader opens it. `readers` are the existing owners
 * (node resolver, graph Findings, engine) injected by the caller; no archive and no AI.
 */
export default function ContextMapPanel({ focus, audience = "public", readers, onRefocus, onOpen, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState({ status: "idle", map: null });
  const [selectedId, setSelectedId] = useState(null);
  const key = `${focus?.type}:${focus?.id || focus?.label}:${audience}`;

  useEffect(() => { setState({ status: "idle", map: null }); setSelectedId(null); }, [key]);
  useEffect(() => {
    if (!open || state.status !== "idle" || !readers) return undefined;
    let alive = true;
    setState({ status: "loading", map: null });
    (async () => {
      const node = focus.nodeId ? { id: focus.nodeId, label: focus.label, type: focus.type } : await readers.resolveNode(focus);
      if (!node) return { focus: null, neighbours: [], empty: "no_focus" };
      const findings = await readers.readGraph(node.id);
      const labels = findings.map((f) => f?.projection?.relations?.[0]).filter((r) => r?.relationType === "equals")
        .map((r) => (r.fromNodeId === String(node.id) ? r.to : r.from)).filter((side) => side?.type === "entity").map((side) => side.label);
      const calculations = labels.length && readers.readCalculations ? await readers.readCalculations(labels, focus) : [];
      return buildContextMap({ focus: { ...node, label: node.label || focus.label }, findings, calculations, audience });
    })().then((map) => { if (alive) setState({ status: "ready", map }); })
      .catch(() => { if (alive) setState({ status: "error", map: null }); });
    return () => { alive = false; };
  }, [open, state.status, key, readers]);

  return <details className="sod29-ctxmap-panel" open={open || undefined} onToggle={(event) => setOpen(event.currentTarget.open)} data-context-map-panel>
    <summary>מפת הקשר</summary>
    {!open ? null : state.status === "loading" || state.status === "idle"
      ? <p role="status" className="sod29-ctxmap-empty">בודק קשרים קרובים…</p>
      : state.status === "error"
        ? <div role="status" className="sod29-ctxmap-empty"><p>הקשרים אינם זמינים כרגע.</p>
          <button type="button" className="sod29-action" onClick={() => setState({ status: "idle", map: null })}>נסה שוב</button></div>
        : <ContextMap2029 map={state.map} selectedId={selectedId} onSelect={setSelectedId} audience={audience}
          onRefocus={(item) => { setSelectedId(null); onRefocus?.(item); }} onOpen={onOpen} />}
  </details>;
}
