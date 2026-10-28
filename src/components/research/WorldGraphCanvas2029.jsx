import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { edgePath, neighborInDirection, KIND_LABEL } from "../../lib/research/worldMapViewModel2029.js";

export const CANVAS_SCALE = Object.freeze({ min: 0.5, max: 2, step: 0.2 });
const PAN_STEP = 72;
// Initial fit never drops below this, so node text stays legible (~10px) on 320px screens.
const FIT_MIN = 0.72;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const short = (text, limit) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text);

// Window-only canvas: it draws exactly the nodes/edges handed to it. It loads
// nothing, so the rest of the tree is never pulled in by panning.
export function fitView(extent, size) {
  if (!size?.width || !size?.height || !extent?.width) return { x: 0, y: 0, k: 1 };
  const k = clamp(Math.min(size.width / extent.width, size.height / extent.height, 1), FIT_MIN, 1);
  // RTL: when the content is wider than the frame, keep the source side (right) in view.
  const x = extent.width * k <= size.width ? (size.width - extent.width * k) / 2 - extent.x * k : size.width - (extent.x + extent.width) * k;
  const y = extent.height * k <= size.height ? (size.height - extent.height * k) / 2 - extent.y * k : -extent.y * k;
  return { x, y, k };
}
export default function WorldGraphCanvas2029({
  model, view, onViewChange, onSize, selectedId, onSelect, relationStatus = {}, treeLayerNote = null,
}) {
  const frame = useRef(null);
  const svg = useRef(null);
  const drag = useRef(null);
  const nodeRefs = useRef(new Map());
  const focusId = useRef(null);
  const nodesById = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes]);
  const tabStop = nodesById.has(selectedId) ? selectedId : model.nodes[0]?.id;
  const treeEdges = model.edges.filter((edge) => edge.kind === "tree");

  useEffect(() => {
    const node = frame.current;
    if (!node) return undefined;
    const report = () => onSize?.({ width: node.clientWidth, height: node.clientHeight });
    report();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onSize]);

  const zoomAt = useCallback((factor, anchor) => {
    const size = frame.current ? { width: frame.current.clientWidth, height: frame.current.clientHeight } : { width: 0, height: 0 };
    const k = clamp(view.k * factor, CANVAS_SCALE.min, CANVAS_SCALE.max);
    const ax = anchor?.x ?? size.width / 2;
    const ay = anchor?.y ?? size.height / 2;
    onViewChange({ k, x: ax - ((ax - view.x) / view.k) * k, y: ay - ((ay - view.y) / view.k) * k });
  }, [view, onViewChange]);

  const reveal = useCallback((node) => {
    const el = frame.current;
    if (!el || !node) return;
    const left = view.x + node.x * view.k;
    const right = left + node.width * view.k;
    const top = view.y + node.y * view.k;
    const bottom = top + node.height * view.k;
    let { x, y } = view;
    if (left < 8) x += 8 - left; else if (right > el.clientWidth - 8) x -= right - (el.clientWidth - 8);
    if (top < 8) y += 8 - top; else if (bottom > el.clientHeight - 8) y -= bottom - (el.clientHeight - 8);
    if (x !== view.x || y !== view.y) onViewChange({ ...view, x, y });
  }, [view, onViewChange]);

  useEffect(() => {
    if (!focusId.current) return;
    const node = nodesById.get(focusId.current);
    nodeRefs.current.get(focusId.current)?.focus({ preventScroll: true });
    reveal(node);
    focusId.current = null;
  });

  const onNodeKey = (event, node) => {
    const direction = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[event.key];
    if (direction) {
      event.preventDefault();
      const next = neighborInDirection(model.nodes, node.id, direction);
      if (next) { focusId.current = next; onViewChange({ ...view }); }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(node.id);
    }
  };

  const onFrameKey = (event) => {
    if (event.target !== event.currentTarget) return;
    const pan = { ArrowLeft: [PAN_STEP, 0], ArrowRight: [-PAN_STEP, 0], ArrowUp: [0, PAN_STEP], ArrowDown: [0, -PAN_STEP] }[event.key];
    if (pan) { event.preventDefault(); onViewChange({ ...view, x: view.x + pan[0], y: view.y + pan[1] }); }
    else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomAt(1 + CANVAS_SCALE.step); }
    else if (event.key === "-") { event.preventDefault(); zoomAt(1 / (1 + CANVAS_SCALE.step)); }
    else if (event.key === "0") { event.preventDefault(); onViewChange(fitView(model.extent, { width: frame.current.clientWidth, height: frame.current.clientHeight })); }
  };

  const onPointerDown = (event) => {
    if (event.target.closest("[data-wm-node]") || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view, moved: false };
    svg.current?.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.pointerType === "touch" ? 0 : event.clientY - d.y;
    d.moved = d.moved || Math.abs(dx) + Math.abs(dy) > 3;
    onViewChange({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
  };
  const endDrag = (event) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const onWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const box = frame.current.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1 + CANVAS_SCALE.step : 1 / (1 + CANVAS_SCALE.step), { x: event.clientX - box.left, y: event.clientY - box.top });
  };
  useEffect(() => {
    const el = frame.current;
    if (!el) return undefined;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const label = (node) => `${KIND_LABEL[node.kind]}: ${node.label}`;
  return <div className="wm29-canvas-wrap">
    <div className="wm29-toolbar" role="toolbar" aria-label="בקרת קנבס">
      <button type="button" onClick={() => zoomAt(1 + CANVAS_SCALE.step)} aria-label="הגדלה">+</button>
      <button type="button" onClick={() => zoomAt(1 / (1 + CANVAS_SCALE.step))} aria-label="הקטנה">−</button>
      <button type="button" onClick={() => onViewChange({ ...view, x: view.x + PAN_STEP })} aria-label="הזזה ימינה">→</button>
      <button type="button" onClick={() => onViewChange({ ...view, x: view.x - PAN_STEP })} aria-label="הזזה שמאלה">←</button>
      <button type="button" onClick={() => onViewChange({ ...view, y: view.y + PAN_STEP })} aria-label="הזזה למעלה">↑</button>
      <button type="button" onClick={() => onViewChange({ ...view, y: view.y - PAN_STEP })} aria-label="הזזה למטה">↓</button>
      <button type="button" className="wm29-toolbar-fit" onClick={() => onViewChange(fitView(model.extent, { width: frame.current.clientWidth, height: frame.current.clientHeight }))}>התאמה</button>
    </div>
    <div ref={frame} className="wm29-canvas" tabIndex={0} role="group" aria-label="קנבס מפת עולם. חיצים להזזה, פלוס ומינוס לזום, אפס להתאמה"
      aria-describedby="wm29-canvas-help" onKeyDown={onFrameKey} data-wm-canvas>
      {model.nodes.length === 0
        ? <p className="wm29-canvas-empty" role="status">אין מקורות בחלון הזה{model.coverage.sources ? "" : " — רשימת המקורות אינה זמינה, ולכן אין נתון"}.</p>
        : <svg ref={svg} width="100%" height="100%" role="presentation" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={endDrag} onPointerCancel={endDrag}>
          <defs>
            <marker id="wm29-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 10 0 L 0 5 L 10 10 z" className="wm29-arrow" />
            </marker>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {model.edges.map((edge) => {
              const from = nodesById.get(edge.from);
              const to = nodesById.get(edge.to);
              if (!from || !to) return null;
              return <path key={edge.id} d={edgePath(from, to)} className={`wm29-edge wm29-edge-${edge.kind}`}
                markerEnd={edge.kind === "tree" ? "url(#wm29-arrow)" : undefined} data-edge-kind={edge.kind}>
                <title>{edge.kind === "tree" ? `${edge.label} · ${edge.edgeRef || edge.governanceRef}` : `${edge.label} (שיוך, לא קשר עץ)`}</title>
              </path>;
            })}
            {model.nodes.map((node) => {
              const state = node.kind === "finding" ? relationStatus[node.ref] : null;
              const selected = node.id === selectedId;
              return <g key={node.id} ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
                className={`wm29-node wm29-node-${node.kind}`} data-wm-node data-kind={node.kind} data-selected={selected || undefined}
                role="button" tabIndex={node.id === tabStop ? 0 : -1} aria-pressed={selected} aria-label={label(node)}
                transform={`translate(${node.x} ${node.y})`} onClick={() => onSelect(node.id)} onKeyDown={(event) => onNodeKey(event, node)}>
                <title>{label(node)}</title>
                <rect width={node.width} height={node.height} rx="12" className="wm29-node-body" />
                <rect x={node.width - 6} width="6" height={node.height} rx="3" className="wm29-node-stripe" />
                <text x={node.width - 16} y="20" textAnchor="start" direction="rtl" className="wm29-node-kind">{KIND_LABEL[node.kind]}{state && state !== "idle" ? ` · ${state === "ok" ? "נפתח" : state === "loading" ? "נפתח…" : state === "partial" ? "חלקי" : state === "failed" ? "נכשל" : ""}` : ""}</text>
                <text x={node.width - 16} y="40" textAnchor="start" direction="rtl" className="wm29-node-label">{short(node.label, 17)}</text>
              </g>;
            })}
          </g>
        </svg>}
    </div>
    <p id="wm29-canvas-help" className="wm29-sr">בחרו צומת ב־Enter. קווים מלאים הם קשרי עץ מתועדים; קווים מקווקווים הם שיוך למקור בלבד.</p>
    {treeEdges.length ? <ul className="wm29-sr" aria-label="קשרי עץ מתועדים בחלון">
      {treeEdges.map((edge) => <li key={edge.id}>{nodesById.get(edge.from)?.label} ← {nodesById.get(edge.to)?.label} · {edge.edgeRef || edge.governanceRef}</li>)}
    </ul> : null}
    {treeLayerNote ? <p className="wm29-canvas-note" role="status">{treeLayerNote}</p> : null}
  </div>;
}
