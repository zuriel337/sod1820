// Stage 3 — Bird's-Eye 3D Prototype.
//
// Pipeline (hard rule, never broken here):
//   SOD1820_MASTER_ROADMAP.md -> roadmapParser.parseRoadmap() -> view model -> this scene
//
// This file NEVER parses markdown, never runs a regex against Roadmap text,
// and never invents a status/edge/world that isn't already sitting in the
// view model. If something needed here isn't in the view model, that is a
// signal to extend roadmapParser.js (Stage 1) + its tests, not to patch it
// here — same discipline as Stage 2's diagnostic-render.js.
//
// Reuse, not reinvention: the Fibonacci-sphere node layout and the
// Line-based edge rendering are the same technique already live in
// src/components/ConvergenceGalaxy.jsx and src/features/numbertree/
// NumberGraph.jsx — this file re-implements that exact math locally (no
// import from src/, to keep this side-project fully decoupled from the
// live app) rather than inventing a new layout algorithm.
//
// group_hint clustering is DISPLAY-ONLY. It is not, and must never become,
// a canonical world/ontology — see the on-screen disclaimer and the
// GROUP_DISCLAIMER constant below.

import React, { useMemo, useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { parseRoadmap, summarizeCoverage } from "../roadmapParser.js";
import roadmapMd from "../../../SOD1820_MASTER_ROADMAP.md?raw";

const GROUP_DISCLAIMER = "DERIVED GROUP — NOT CANONICAL WORLD";

// ---------- Fibonacci-sphere placement (same technique as ConvergenceGalaxy.jsx) ----------
function fibSphere(n, R) {
  if (n <= 0) return [];
  if (n === 1) return [[0, 0, 0]];
  const pts = [];
  const off = 2 / n;
  const inc = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * inc;
    pts.push([Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R]);
  }
  return pts;
}

// ---------- Status -> visual mapping (a RENDERING PRIORITY over EXISTING tags, not a new taxonomy) ----------
// Only reads ws.fields.STATE.known_tags, which Stage 1's parser already
// extracted from the Roadmap's own documented v5-tag vocabulary. A
// workstream can carry several tags at once (e.g. "LIVE" + "SUPERSEDED" +
// "OPEN-HUMAN-GATE"); this priority list just picks ONE primary color to
// render, in a fixed, documented order — it does not decide anything.
const STATUS_PRIORITY = [
  { test: (tags) => tags.includes("OPEN-HUMAN-GATE") && tags.includes("INTAKE-CRITICAL"), key: "INTAKE_CRITICAL", color: "#e0563a", label: "OPEN · INTAKE-CRITICAL" },
  { test: (tags) => tags.includes("OPEN-HUMAN-GATE") || tags.includes("OPEN"), key: "OPEN", color: "#c79a2e", label: "OPEN-HUMAN-GATE" },
  { test: (tags) => tags.includes("BUILDING") || tags.includes("PREVIEW-VERIFIED") || tags.includes("PREVIEW"), key: "BUILDING", color: "#3ea6ff", label: "BUILDING / PREVIEW" },
  { test: (tags) => tags.includes("LIVE") || tags.includes("DB-LIVE") || tags.includes("VERIFIED") || tags.includes("DONE"), key: "LIVE", color: "#4caf7d", label: "LIVE / VERIFIED" },
  { test: (tags) => tags.includes("PARKED") || tags.includes("SUPERSEDED") || tags.includes("FUTURE"), key: "PARKED", color: "#8a8a95", label: "PARKED / FUTURE / SUPERSEDED" },
];
const UNKNOWN_STATUS = { key: "UNKNOWN", color: "#5b6472", label: "UNKNOWN (no recognized tag)" };
const ACTIVE_NOW_COLOR = "#ffe9a8";

function classifyWorkstream(ws) {
  const tags = (ws.fields.STATE && ws.fields.STATE.known_tags) || [];
  for (const rule of STATUS_PRIORITY) {
    if (rule.test(tags)) return rule;
  }
  return UNKNOWN_STATUS;
}

function buildLayout(vm) {
  const groups = {};
  vm.workstreams.forEach((ws) => {
    const g = ws.group_hint || "(none)";
    (groups[g] = groups[g] || []).push(ws);
  });
  const groupIds = Object.keys(groups).sort();
  const clusterCenters = fibSphere(groupIds.length, 9);
  const nodes = [];
  groupIds.forEach((g, gi) => {
    const center = clusterCenters[gi] || [0, 0, 0];
    const members = groups[g];
    const local = fibSphere(members.length, members.length > 1 ? 2.1 : 0);
    members.forEach((ws, mi) => {
      const p = local[mi] || [0, 0, 0];
      nodes.push({
        ws,
        group: g,
        pos: [center[0] + p[0], center[1] + p[1], center[2] + p[2]],
      });
    });
  });
  return { nodes, groupIds };
}

function WorkstreamNode({ node, isActiveNow, isSelected, isHovered, isDimmed, onClick, onHover }) {
  const meshRef = useRef();
  const status = classifyWorkstream(node.ws);
  const hasWarning = node.ws.parse_warnings.length > 0;
  const color = isActiveNow ? ACTIVE_NOW_COLOR : status.color;
  const radius = isActiveNow ? 0.62 : 0.4;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = isActiveNow ? 0.22 : isSelected ? 0.14 : 0.05;
    const seed = node.pos[0] + node.pos[2];
    meshRef.current.scale.setScalar(1 + pulse * Math.sin(clock.elapsedTime * 1.8 + seed));
  });

  return (
    <group position={node.pos}>
      {hasWarning && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.22, 0.035, 8, 32]} />
          <meshBasicMaterial color="#e0563a" transparent opacity={isDimmed ? 0.25 : 0.85} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(node.ws.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(node.ws.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActiveNow ? 1.6 : isSelected ? 1.1 : 0.55}
          transparent
          opacity={isDimmed ? 0.25 : 1}
        />
      </mesh>
      {(isHovered || isSelected || isActiveNow) && !isDimmed && (
        <Html center distanceFactor={16} style={{ pointerEvents: "none" }}>
          <div style={{
            color: isActiveNow ? "#ffe9a8" : "#f3f2ee",
            fontFamily: "monospace", fontSize: 11.5, fontWeight: 700,
            whiteSpace: "nowrap", textShadow: "0 0 8px #000, 0 0 3px #000",
            transform: "translateY(-2.4em)", textAlign: "center",
          }}>
            {isActiveNow ? "🔵 ACTIVE_NOW · " : ""}{node.ws.id}
          </div>
        </Html>
      )}
    </group>
  );
}

function GroupLabel({ groupId, center }) {
  return (
    <Html position={center} center distanceFactor={22} style={{ pointerEvents: "none" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#d4af37", fontFamily: "monospace", fontWeight: 700, fontSize: 13, textShadow: "0 0 8px #000" }}>{groupId}</div>
        <div style={{ color: "#9a9285", fontFamily: "monospace", fontSize: 8.5, textShadow: "0 0 6px #000" }}>{GROUP_DISCLAIMER}</div>
      </div>
    </Html>
  );
}

function EdgeLine({ a, b }) {
  return <Line points={[a, b]} color="#5b7fd6" lineWidth={1} transparent opacity={0.45} />;
}

function CameraRig({ focusPos, resetSignal }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    targetVec.current.set(...(focusPos || [0, 0, 0]));
  }, [focusPos, resetSignal]);

  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(targetVec.current, 0.08);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={4}
      maxDistance={40}
      autoRotate={!focusPos}
      autoRotateSpeed={0.35}
    />
  );
}

function Scene({ vm, layout, activeNowId, selectedId, hoveredId, onSelect, onHover, focusPos, resetSignal }) {
  const nodesById = useMemo(() => Object.fromEntries(layout.nodes.map((n) => [n.ws.id, n])), [layout]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <pointLight position={[12, 12, 12]} intensity={1.2} color="#fff1cc" />
      <pointLight position={[-12, -8, -10]} intensity={0.7} color="#5b7fd6" />
      <Stars radius={80} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />

      {vm.dependency_edges.map((e, i) => {
        const from = nodesById[e.from];
        const to = nodesById[e.to];
        if (!from || !to) return null; // never draw an edge we can't resolve to a real node
        return <EdgeLine key={i} a={from.pos} b={to.pos} />;
      })}

      {layout.groupIds.map((g) => {
        const members = layout.nodes.filter((n) => n.group === g);
        const cx = members.reduce((s, n) => s + n.pos[0], 0) / members.length;
        const cy = members.reduce((s, n) => s + n.pos[1], 0) / members.length;
        const cz = members.reduce((s, n) => s + n.pos[2], 0) / members.length;
        return <GroupLabel key={g} groupId={g} center={[cx, cy + 1.6, cz]} />;
      })}

      {layout.nodes.map((n) => (
        <WorkstreamNode
          key={n.ws.id}
          node={n}
          isActiveNow={n.ws.id === activeNowId}
          isSelected={n.ws.id === selectedId}
          isHovered={n.ws.id === hoveredId}
          isDimmed={selectedId != null && n.ws.id !== selectedId}
          onClick={onSelect}
          onHover={onHover}
        />
      ))}

      <CameraRig focusPos={focusPos} resetSignal={resetSignal} />
    </>
  );
}

function statusPillStyle(status) {
  const map = {
    CLOSED: { bg: "#e4f6ee", fg: "#2f9e6b" },
    OPEN_INTAKE_CRITICAL: { bg: "#fbe6e6", fg: "#d64545" },
    OPEN: { bg: "#fbf1dd", fg: "#c79a2e" },
  };
  const c = map[status] || { bg: "#eeecec", fg: "#6a655e" };
  return { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg };
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

export default function RoadmapUniverse3D() {
  const vm = useMemo(() => parseRoadmap(roadmapMd), []);
  const coverage = useMemo(() => summarizeCoverage(vm), [vm]);
  const layout = useMemo(() => buildLayout(vm), [vm]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [canRender3D] = useState(() => webglAvailable() && window.innerWidth >= 480);

  const activeNowId = vm.active_now.workstream_id;
  const selected = selectedId ? vm.workstreams.find((w) => w.id === selectedId) : null;
  const selectedNode = selectedId ? layout.nodes.find((n) => n.ws.id === selectedId) : null;
  const gate4 = vm.open_human_gates.find((g) => g.number === 4);

  if (!canRender3D) {
    return (
      <div style={{ padding: 16, fontFamily: "-apple-system, Arial, sans-serif" }}>
        <div style={{ background: "#fbf6e6", border: "1px dashed #b8860b", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
          ⚠️ WebGL לא-זמין או viewport קטן-מדי לפרוטוטייפ תלת-ממדי (Stage 3). נופל-בחזרה ל-Diagnostic 2D (Stage 2) — אין מסך-שבור.
        </div>
        <iframe src="../diagnostic.html" title="Roadmap Diagnostic 2D fallback" style={{ width: "100%", height: "85vh", border: "1px solid #dfe3e8", borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "radial-gradient(circle at 50% 40%, #0d0a1a, #05030a)" }}>
      {/* Header HUD */}
      <div style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 3, color: "#e8e6df", fontFamily: "monospace", fontSize: 12, maxWidth: 320 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#ffe9a8" }}>🗺️ Roadmap Universe — Stage 3 prototype</div>
        <div style={{ opacity: 0.75, marginTop: 2 }}>
          v{vm.meta.version_label} · {vm.meta.canonical_status} · {coverage.workstreams} workstreams · {coverage.dependency_edges} edges · {coverage.total_warnings} warning(s)
        </div>
      </div>

      {/* Return Point HUD (no invented nodes for non-workstream steps) */}
      {gate4 && gate4.return_point_chain && (
        <div style={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 3, background: "rgba(10,7,20,0.85)", border: "1px solid #5b7fd6", borderRadius: 10, padding: "8px 12px", maxWidth: 340 }}>
          <div style={{ color: "#9db4f0", fontFamily: "monospace", fontSize: 10.5, marginBottom: 4 }}>↩️ Return Point (Gate #4.return_point_chain)</div>
          <div style={{ color: "#e8e6df", fontFamily: "monospace", fontSize: 11.5 }}>
            {gate4.return_point_chain.join(" → ")}
          </div>
        </div>
      )}

      {/* Human Gates HUD (gates are not workstream nodes — shown as a list, not invented spatial objects) */}
      <div style={{ position: "absolute", bottom: 12, insetInlineStart: 12, zIndex: 3, background: "rgba(10,7,20,0.85)", border: "1px solid #333", borderRadius: 10, padding: "8px 12px", maxHeight: 200, overflowY: "auto", width: 260 }}>
        <div style={{ color: "#e8e6df", fontFamily: "monospace", fontSize: 10.5, marginBottom: 4, fontWeight: 700 }}>🚪 Open Human-Gates</div>
        {vm.open_human_gates.map((g) => (
          <div key={g.number} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 10.5, fontFamily: "monospace", color: "#c9c7c0", padding: "1px 0" }}>
            <span>#{g.number}</span>
            <span style={statusPillStyle(g.status)}>{g.status}</span>
          </div>
        ))}
      </div>

      {/* Back/Home */}
      <button
        onClick={() => { setSelectedId(null); setResetSignal((s) => s + 1); }}
        style={{ position: "absolute", bottom: 12, insetInlineEnd: 12, zIndex: 3, background: "#1e1a2e", color: "#ffe9a8", border: "1px solid #5b7fd6", borderRadius: 999, padding: "8px 16px", fontFamily: "monospace", fontSize: 12, cursor: "pointer" }}
      >
        🏠 חזרה למבט-הציפור
      </button>

      <Canvas camera={{ position: [0, 4, 22], fov: 55 }} onPointerMissed={() => setSelectedId(null)}>
        <Suspense fallback={null}>
          <Scene
            vm={vm}
            layout={layout}
            activeNowId={activeNowId}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            focusPos={selectedNode ? selectedNode.pos : null}
            resetSignal={resetSignal}
          />
        </Suspense>
      </Canvas>

      {/* Inspector panel */}
      {selected && (
        <div style={{
          position: "absolute", insetInlineEnd: 12, top: 96, zIndex: 4, width: "min(360px, 88vw)",
          background: "rgba(10,7,20,0.94)", border: "1px solid #5b7fd6", borderRadius: 14, padding: "14px 16px",
          color: "#e8e6df", fontFamily: "monospace", fontSize: 12, maxHeight: "70vh", overflowY: "auto",
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#ffe9a8", marginBottom: 4 }}>{selected.id}</div>
          <div style={{ marginBottom: 8, opacity: 0.85 }}>{selected.title}</div>
          <Field label="STATE" value={selected.fields.STATE?.raw} />
          <Field label="WHERE_WE_ARE" value={selected.fields.WHERE_WE_ARE?.raw} />
          <Field label="NEXT_ACTION" value={selected.fields.NEXT_ACTION?.raw} />
          <Field label="HUMAN_GATE" value={selected.fields.HUMAN_GATE?.raw} />
          <Field label="DEPENDENCIES" value={selected.fields.DEPENDENCIES?.raw} />
          {selected.gate_mentions.length > 0 && (
            <Field label="Gate mentions (not governance)" value={selected.gate_mentions.map((n) => `#${n}`).join(", ")} />
          )}
          {selected.parse_warnings.length > 0 && (
            <div style={{ marginTop: 8, border: "1px solid #e0563a", borderRadius: 6, padding: "6px 8px", background: "rgba(224,86,58,0.12)" }}>
              <div style={{ color: "#e0563a", fontWeight: 700, fontSize: 11 }}>⚠ Parse Warnings</div>
              {selected.parse_warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10.5, marginTop: 2 }}>{w.code}: {typeof w.detail === "string" ? w.detail : JSON.stringify(w.detail)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Cosmetic-only inline markdown rendering (bold **x** / code-span), same as
// Stage 2's mdText — extracts no new facts, changes no data.
function mdParts(str) {
  const backtick = String.fromCharCode(96);
  const re = new RegExp("(\\*\\*[^*]+\\*\\*)|(" + backtick + "[^" + backtick + "]+" + backtick + ")", "g");
  const parts = [];
  let lastIndex = 0;
  let m;
  let key = 0;
  while ((m = re.exec(str))) {
    if (m.index > lastIndex) parts.push(str.slice(lastIndex, m.index));
    if (m[1]) parts.push(<b key={key++}>{m[1].slice(2, -2)}</b>);
    else parts.push(<code key={key++}>{m[2].slice(1, -1)}</code>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < str.length) parts.push(str.slice(lastIndex));
  return parts;
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ color: "#9db4f0", fontSize: 10.5 }}>{label}</div>
      <div style={{ fontSize: 11, lineHeight: 1.4 }}>{mdParts(value)}</div>
    </div>
  );
}
