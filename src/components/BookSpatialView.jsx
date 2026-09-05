import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars, Sparkles, Line } from "@react-three/drei";
import { pageFromSourceRef } from "../lib/research/bookResearchProjection.js";

const KIND_TONES = {
  book: "#f6e27a",
  source: "#82d4ff",
  page: "#cab9ff",
  research: "#f3b98d",
  seed: "#8fe3aa",
};

function hash01(text) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

function positionFor(node, i, total, dimension, pageCount) {
  if (node.kind === "book") return [0, 0, 0];
  if (node.kind === "source") {
    const a = i * 2.4;
    return [Math.cos(a) * 2.3, (i - 1) * .65, Math.sin(a) * 2.3];
  }
  const page = Number(node.page || 0);
  if (dimension === "page") {
    const t = pageCount > 1 && page ? (page - 1) / (pageCount - 1) : (i + 1) / (total + 1);
    const a = t * Math.PI * 8;
    const r = 4.3 + t * 4.7;
    return [Math.cos(a) * r, (t - .5) * 8, Math.sin(a) * r];
  }
  if (dimension === "truth") {
    const band = node.engineVerified ? 2.8 : node.status === "canonical" ? 3.8 : node.status === "approved" ? 5 : 6.5;
    const a = hash01(node.id) * Math.PI * 2;
    const y = (hash01(node.id + ":y") - .5) * 5;
    return [Math.cos(a) * band, y, Math.sin(a) * band];
  }
  if (dimension === "kind") {
    const keys = ["fact","relation","procedure","calculation","finding","claim","unknown"];
    const k = String(node.researchKind || "unknown").toLowerCase();
    const idx = Math.max(0, keys.findIndex(x => k.includes(x)));
    const a0 = (idx / keys.length) * Math.PI * 2;
    const jitter = (hash01(node.id) - .5) * .9;
    const r = 5.2 + hash01(node.id + ":r") * 2.7;
    return [Math.cos(a0 + jitter) * r, (hash01(node.id + ":y") - .5) * 5, Math.sin(a0 + jitter) * r];
  }
  const a = (i / Math.max(1, total)) * Math.PI * 2 + hash01(node.id) * .35;
  const r = 4.5 + hash01(node.id + ":r") * 4.5;
  return [Math.cos(a) * r, (hash01(node.id + ":y") - .5) * 6, Math.sin(a) * r];
}

function SpatialNode({ node, position, selected, onSelect }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (ref.current && node.kind === "book") ref.current.rotation.y = clock.elapsedTime * .16;
  });
  const tone = KIND_TONES[node.kind] || "#e8dcc0";
  const size = node.kind === "book" ? 1 : node.kind === "source" ? .48 : selected ? .38 : .28;
  return (
    <group position={position}>
      <mesh ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(node); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "default"; }}>
        <sphereGeometry args={[hover ? size * 1.18 : size, 24, 24]} />
        <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={hover || selected ? 1.8 : .75} toneMapped={false} />
      </mesh>
      {(hover || selected || node.kind === "book") && (
        <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div dir="rtl" style={{
            transform: `translateY(${node.kind === "book" ? -42 : -26}px)`,
            minWidth: node.kind === "book" ? 170 : 110,
            maxWidth: 230,
            padding: "5px 8px", borderRadius: 9,
            background: "rgba(5,4,10,.84)", border: `1px solid ${tone}66`, color: "#fff",
            font: "700 11px Heebo, sans-serif", lineHeight: 1.35, textAlign: "center", whiteSpace: "normal",
          }}>{node.label}</div>
        </Html>
      )}
    </group>
  );
}

function BookScene({ nodes, edges, dimension, pageCount, selectedId, onSelect }) {
  const positions = useMemo(() => {
    const map = new Map();
    nodes.forEach((n, i) => map.set(n.id, positionFor(n, i, nodes.length, dimension, pageCount)));
    return map;
  }, [nodes, dimension, pageCount]);
  return (
    <>
      <ambientLight intensity={.65} />
      <pointLight position={[0, 2, 2]} intensity={2.2} color="#f6e27a" />
      <Stars radius={90} depth={50} count={2400} factor={3} fade speed={.6} />
      <Sparkles count={50} scale={18} size={2.6} speed={.25} color="#f6e27a" />
      {edges.map((e, i) => {
        const a = positions.get(e.from), b = positions.get(e.to);
        if (!a || !b) return null;
        return <Line key={`${e.from}:${e.to}:${i}`} points={[a,b]} color={e.tone || "#86661e"} transparent opacity={.36} lineWidth={1} />;
      })}
      {nodes.map(n => (
        <SpatialNode key={n.id} node={n} position={positions.get(n.id)} selected={selectedId === n.id} onSelect={onSelect} />
      ))}
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={.22} minDistance={6} maxDistance={28} />
    </>
  );
}

function makeSpatialState(book, rows, seeds) {
  const bookId = book?.identity_key || book?.id || "book";
  const nodes = [{ id: bookId, kind: "book", label: book?.label || "ספר" }];
  const edges = [];
  const tiers = book?.metadata?.identity_tiers || {};
  const witness = tiers.witness;
  const digital = tiers.digital_object;
  if (witness) {
    const id = `${bookId}:witness`;
    nodes.push({ id, kind: "source", label: `${witness.provider || "Witness"} ${witness.native_id || ""}`.trim() });
    edges.push({ from: bookId, to: id, tone: "#82d4ff" });
  }
  if (digital) {
    const id = `${bookId}:digital`;
    nodes.push({ id, kind: "source", label: "Digital Object · PDF" });
    edges.push({ from: `${bookId}:witness`, to: id, tone: "#82d4ff" });
  }
  const pageNodes = new Map();
  const ensurePage = p => {
    if (!p || pageNodes.has(p)) return pageNodes.get(p);
    const id = `${bookId}:p${p}`;
    const node = { id, kind: "page", page: p, label: `עמוד ${p}` };
    pageNodes.set(p, node); nodes.push(node);
    edges.push({ from: bookId, to: id, tone: "#6d5b8d" });
    return node;
  };
  (Array.isArray(rows) ? rows : []).slice(0, 140).forEach(row => {
    const p = pageFromSourceRef(row.source_ref);
    const pageNode = ensurePage(p);
    const id = `ro:${row.id}`;
    nodes.push({
      id, kind: "research", page: p, label: row.statement || row.kind || "ממצא",
      researchKind: row.kind, status: row.status, engineVerified: row.engine_verified === true,
      sourceRef: row.source_ref, row,
    });
    edges.push({ from: pageNode?.id || bookId, to: id, tone: row.engine_verified ? "#5cc778" : "#a67946" });
  });
  (Array.isArray(seeds) ? seeds : []).forEach((seed, i) => {
    const p = Number(seed.page || 0) || null;
    const pageNode = ensurePage(p);
    const id = `${bookId}:seed:${seed.key || i}`;
    nodes.push({ id, kind: "seed", page: p, label: seed.label, researchKind: seed.family || "seed", status: seed.status || "documented" });
    edges.push({ from: pageNode?.id || bookId, to: id, tone: "#5f9972" });
  });
  return { nodes, edges };
}

export default function BookSpatialView({ book, researchRows = [], seeds = [] }) {
  const [dimension, setDimension] = useState("page");
  const [selected, setSelected] = useState(null);
  const state = useMemo(() => makeSpatialState(book, researchRows, seeds), [book, researchRows, seeds]);
  const pageCount = Number(book?.metadata?.page_count || 0) || 1;
  return (
    <div style={{ border: "1px solid rgba(212,175,55,.22)", borderRadius: 18, overflow: "hidden", background: "#05040a" }}>
      <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 12, borderBottom: "1px solid rgba(212,175,55,.18)" }}>
        <b style={{ color: "#f6e27a" }}>ממד מרחבי</b>
        {[['page','סדר עמודים'],['kind','משפחת מחקר'],['truth','מצב אמת'],['free','מרחב חופשי']].map(([k,l]) => (
          <button key={k} onClick={() => setDimension(k)} style={{ cursor: "pointer", borderRadius: 999, border: `1px solid ${dimension===k ? '#d4af37' : 'rgba(255,255,255,.14)'}`, background: dimension===k ? 'rgba(212,175,55,.14)' : 'rgba(255,255,255,.04)', color: dimension===k ? '#f6e27a' : '#c9c2b7', padding: '6px 10px', fontFamily: 'Heebo, sans-serif' }}>{l}</button>
        ))}
        <span style={{ marginInlineStart: "auto", color: "#8f8897", fontSize: 11 }}>המיקום הוא Projection בלבד · אין x/y/z קנוני</span>
      </div>
      <div style={{ height: "min(72vh,760px)", minHeight: 460 }}>
        <Canvas camera={{ position: [0, 2, 13], fov: 55 }} onPointerMissed={() => setSelected(null)}>
          <BookScene nodes={state.nodes} edges={state.edges} dimension={dimension} pageCount={pageCount} selectedId={selected?.id} onSelect={setSelected} />
        </Canvas>
      </div>
      {selected && (
        <div dir="rtl" style={{ padding: 14, borderTop: "1px solid rgba(212,175,55,.18)", color: "#ddd5c8", lineHeight: 1.65 }}>
          <div style={{ fontWeight: 900, color: KIND_TONES[selected.kind] || '#f6e27a' }}>{selected.label}</div>
          <div style={{ fontSize: 12, color: "#9e96a5" }}>
            {selected.page ? `עמוד ${selected.page} · ` : ""}{selected.researchKind ? `${selected.researchKind} · ` : ""}{selected.status || selected.kind}
            {selected.engineVerified ? " · ENGINE VERIFIED" : ""}
          </div>
          {selected.sourceRef && <div style={{ marginTop: 5, fontFamily: "monospace", fontSize: 11, direction: "ltr", textAlign: "left", color: "#a99d84" }}>{selected.sourceRef}</div>}
        </div>
      )}
    </div>
  );
}
