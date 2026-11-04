import React, { useRef } from "react";
import { KIND_LABEL, WORLD_MAP_LAYERS } from "../../lib/research/worldMapViewModel2029.js";

const STEP = 72;

// Compact overview of the nodes the canvas already holds. It is a navigation
// aid only: it never loads, counts or implies anything outside that window.
export default function WorldMiniMap2029({ model, view, size, onNavigate, open, onToggle }) {
  const svg = useRef(null);
  const { x: ox, y: oy, width, height } = model.extent;
  const viewport = size?.width && view?.k
    ? { x: -view.x / view.k, y: -view.y / view.k, width: size.width / view.k, height: size.height / view.k }
    : null;
  const counts = Object.fromEntries(WORLD_MAP_LAYERS.map((kind) => [kind, model.nodes.filter((node) => node.kind === kind).length]));

  const centerOn = (event) => {
    const box = svg.current.getBoundingClientRect();
    const scale = Math.max(width / box.width, height / box.height);
    const cx = ox + (event.clientX - box.left) * scale - (box.width * scale - width) / 2;
    const cy = oy + (event.clientY - box.top) * scale - (box.height * scale - height) / 2;
    onNavigate({ cx, cy });
  };
  const onKey = (event) => {
    const move = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[event.key];
    if (!move || !viewport) return;
    event.preventDefault();
    onNavigate({ cx: viewport.x + viewport.width / 2 + move[0], cy: viewport.y + viewport.height / 2 + move[1] });
  };

  return <section className="wm29-mini" data-open={open} aria-label="מיני־מפה">
    <button type="button" className="wm29-mini-toggle" aria-expanded={open} aria-controls="wm29-mini-body" onClick={onToggle}>
      <span>מיני־מפה</span><span aria-hidden="true">{open ? "▴" : "▾"}</span>
    </button>
    <div id="wm29-mini-body" className="wm29-mini-body">
      {model.nodes.length ? <svg ref={svg} className="wm29-mini-svg" viewBox={`${ox} ${oy} ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        tabIndex={0} role="application" aria-roledescription="מיני־מפה לניווט" aria-label="מיני־מפה. חיצים מזיזים את התצוגה"
        onClick={centerOn} onKeyDown={onKey}>
        {model.edges.map((edge) => {
          const from = model.nodes.find((node) => node.id === edge.from);
          const to = model.nodes.find((node) => node.id === edge.to);
          return from && to ? <line key={edge.id} className={`wm29-mini-edge wm29-mini-edge-${edge.kind}`}
            x1={from.x} y1={from.y + from.height / 2} x2={to.x + to.width} y2={to.y + to.height / 2} /> : null;
        })}
        {model.nodes.map((node) => <rect key={node.id} className={`wm29-mini-node wm29-node-${node.kind}`} x={node.x} y={node.y}
          width={node.width} height={node.height} rx="10" />)}
        {viewport ? <rect className="wm29-mini-viewport" data-wm-viewport x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} /> : null}
      </svg> : <p className="wm29-mini-empty">אין צמתים בחלון.</p>}
      <dl className="wm29-mini-legend" aria-label="שכבות בחלון">
        {WORLD_MAP_LAYERS.map((kind) => <div key={kind}>
          <dt><i className={`wm29-swatch wm29-node-${kind}`} aria-hidden="true" />{KIND_LABEL[kind]}</dt>
          <dd>{counts[kind]}</dd>
        </div>)}
      </dl>
      <p className="wm29-mini-note">מציג רק את החלון שנטען, לא את כל העץ.</p>
      <p className="wm29-mini-note wm29-mini-key"><span className="wm29-key-tree" aria-hidden="true" /> קשר עץ מתועד · <span className="wm29-key-prov" aria-hidden="true" /> שיוך למקור</p>
    </div>
  </section>;
}
