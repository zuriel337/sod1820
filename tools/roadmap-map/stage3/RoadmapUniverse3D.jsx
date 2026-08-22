// Stage 3→4 — Bird's-Eye 3D Prototype + Semantic Zoom Navigation.
//
// Pipeline (hard rule, never broken here):
//   SOD1820_MASTER_ROADMAP.md -> roadmapParser.parseRoadmap() -> view model -> this scene
//
// This file NEVER parses markdown, never runs a regex against Roadmap text,
// and never invents a status/edge/world/gate-relationship that isn't already
// sitting in the view model. If something needed here isn't in the view
// model, that is a signal to extend roadmapParser.js (Stage 1) + its tests,
// not to patch it here.
//
// Reuse, not reinvention: the Fibonacci-sphere node layout and the
// Line-based edge rendering are the same technique already live in
// src/components/ConvergenceGalaxy.jsx and src/features/numbertree/
// NumberGraph.jsx — re-implemented locally (no import from src/, to keep
// this side-project fully decoupled from the live app).
//
// group_hint clustering is DISPLAY-ONLY. It is not, and must never become,
// a canonical world/ontology — see GROUP_DISCLAIMER, shown on every cluster
// label and in the cluster panel. Stage 4 does not resolve the "Worlds"
// question; it only tests whether these derived clusters are even useful
// as a navigation aid.
//
// Stage 4 adds: a three-level zoom state machine (universe / cluster /
// workstream) with a breadcrumb, Home/Back/Focus actions, incoming/outgoing
// dependency lists, sibling-workstream navigation without returning to the
// bird's-eye view every time, a full Zoom-3 operational inspector (all 11
// Roadmap card fields, read-only — this stays a Viewer, never an editor),
// and a "you are here / next / later" itinerary framing of the SAME
// explicit return_point_chain array already produced by the parser (using
// its existing order, not a new interpretation).

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
  const clusterCenterById = {};
  groupIds.forEach((g, gi) => {
    const center = clusterCenters[gi] || [0, 0, 0];
    clusterCenterById[g] = center;
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
  return { nodes, groupIds, clusterCenterById };
}

// Pure derivation over the parser's own dependency_edges — no invention.
function edgesTouching(vm, wsId) {
  return {
    outgoing: vm.dependency_edges.filter((e) => e.from === wsId),
    incoming: vm.dependency_edges.filter((e) => e.to === wsId),
  };
}
function edgesTouchingGroup(vm, layout, groupId) {
  const memberIds = new Set(layout.nodes.filter((n) => n.group === groupId).map((n) => n.ws.id));
  const internal = [], inbound = [], outbound = [];
  vm.dependency_edges.forEach((e) => {
    const fromIn = memberIds.has(e.from), toIn = memberIds.has(e.to);
    if (fromIn && toIn) internal.push(e);
    else if (fromIn) outbound.push(e);
    else if (toIn) inbound.push(e);
  });
  return { internal, inbound, outbound };
}

function WorkstreamNode({ node, isActiveNow, isSelected, isHovered, opacity, onClick, onHover }) {
  const meshRef = useRef();
  const status = classifyWorkstream(node.ws);
  const hasWarning = node.ws.parse_warnings.length > 0;
  const color = isActiveNow ? ACTIVE_NOW_COLOR : status.color;
  const radius = isActiveNow ? 0.62 : 0.4;
  const dimmed = opacity < 0.6;

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
          <meshBasicMaterial color="#e0563a" transparent opacity={Math.min(0.85, opacity + 0.15)} />
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
          opacity={opacity}
        />
      </mesh>
      {(isHovered || isSelected || isActiveNow) && !dimmed && (
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

function GroupLabel({ groupId, center, onClick, dimmed }) {
  return (
    <Html position={center} center distanceFactor={22} style={{ pointerEvents: "auto" }}>
      <div
        onClick={(e) => { e.stopPropagation(); onClick(groupId); }}
        style={{ textAlign: "center", cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
      >
        <div style={{ color: "#d4af37", fontFamily: "monospace", fontWeight: 700, fontSize: 13, textShadow: "0 0 8px #000" }}>{groupId}</div>
        <div style={{ color: "#9a9285", fontFamily: "monospace", fontSize: 8.5, textShadow: "0 0 6px #000" }}>{GROUP_DISCLAIMER}</div>
      </div>
    </Html>
  );
}

function EdgeLine({ a, b, opacity }) {
  return <Line points={[a, b]} color="#5b7fd6" lineWidth={1} transparent opacity={opacity} />;
}

function CameraRig({ focusPos, desiredDistance }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    targetVec.current.set(...(focusPos || [0, 0, 0]));
  }, [focusPos]);

  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(targetVec.current, 0.08);
    const dir = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    const desired = new THREE.Vector3().copy(controlsRef.current.target).add(dir.multiplyScalar(desiredDistance));
    camera.position.lerp(desired, 0.06);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={40}
      autoRotate={!focusPos}
      autoRotateSpeed={0.35}
    />
  );
}

function nodeOpacity(zoomLevel, node, selectedGroup, selectedWsId) {
  if (zoomLevel === "universe") return 1;
  if (zoomLevel === "cluster") return node.group === selectedGroup ? 1 : 0.15;
  // zoomLevel === "workstream"
  if (node.ws.id === selectedWsId) return 1;
  if (node.group === selectedGroup) return 0.45;
  return 0.12;
}
function edgeOpacity(zoomLevel, e, selectedGroup, selectedWsId, layout) {
  if (zoomLevel === "universe") return 0.45;
  const groupOf = (id) => { const n = layout.nodes.find((x) => x.ws.id === id); return n ? n.group : null; };
  if (zoomLevel === "cluster") {
    const touches = groupOf(e.from) === selectedGroup || groupOf(e.to) === selectedGroup;
    return touches ? 0.65 : 0.06;
  }
  // workstream
  if (e.from === selectedWsId || e.to === selectedWsId) return 0.85;
  if (groupOf(e.from) === selectedGroup && groupOf(e.to) === selectedGroup) return 0.18;
  return 0.04;
}

function Scene({ vm, layout, activeNowId, zoomLevel, selectedGroup, selectedWsId, hoveredId, onSelectWorkstream, onSelectCluster, onHover, focusPos, desiredDistance }) {
  const nodesById = useMemo(() => Object.fromEntries(layout.nodes.map((n) => [n.ws.id, n])), [layout]);
  const clusterLabelCenters = useMemo(() => {
    const out = {};
    layout.groupIds.forEach((g) => {
      const members = layout.nodes.filter((n) => n.group === g);
      const cx = members.reduce((s, n) => s + n.pos[0], 0) / members.length;
      const cy = members.reduce((s, n) => s + n.pos[1], 0) / members.length;
      const cz = members.reduce((s, n) => s + n.pos[2], 0) / members.length;
      out[g] = [cx, cy + 1.6, cz];
    });
    return out;
  }, [layout]);

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
        return <EdgeLine key={i} a={from.pos} b={to.pos} opacity={edgeOpacity(zoomLevel, e, selectedGroup, selectedWsId, layout)} />;
      })}

      {zoomLevel !== "workstream" && layout.groupIds.map((g) => (
        <GroupLabel
          key={g}
          groupId={g}
          center={clusterLabelCenters[g]}
          onClick={onSelectCluster}
          dimmed={zoomLevel !== "universe" && g !== selectedGroup}
        />
      ))}

      {layout.nodes.map((n) => (
        <WorkstreamNode
          key={n.ws.id}
          node={n}
          isActiveNow={n.ws.id === activeNowId}
          isSelected={n.ws.id === selectedWsId}
          isHovered={n.ws.id === hoveredId}
          opacity={nodeOpacity(zoomLevel, n, selectedGroup, selectedWsId)}
          onClick={onSelectWorkstream}
          onHover={onHover}
        />
      ))}

      <CameraRig focusPos={focusPos} desiredDistance={desiredDistance} />
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

// Cosmetic-only inline markdown rendering (bold **x** / code-span) —
// extracts no new facts, changes no data.
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

function EdgeChip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "#20263a", color: "#9db4f0", border: "1px solid #3a4468", borderRadius: 999, padding: "2px 9px", fontFamily: "monospace", fontSize: 10.5, cursor: "pointer", margin: "2px 3px 2px 0" }}
    >
      {label}
    </button>
  );
}

const HUD_PANEL_STYLE = {
  background: "rgba(10,7,20,0.94)", border: "1px solid #5b7fd6", borderRadius: 14,
  color: "#e8e6df", fontFamily: "monospace", fontSize: 12,
};

export default function RoadmapUniverse3D() {
  const vm = useMemo(() => parseRoadmap(roadmapMd), []);
  const coverage = useMemo(() => summarizeCoverage(vm), [vm]);
  const layout = useMemo(() => buildLayout(vm), [vm]);

  // zoomLevel: "universe" | "cluster" | "workstream"
  const [zoomLevel, setZoomLevel] = useState("universe");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedWsId, setSelectedWsId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [canRender3D] = useState(() => webglAvailable() && window.innerWidth >= 480);

  const activeNowId = vm.active_now.workstream_id;
  const gate4 = vm.open_human_gates.find((g) => g.number === 4);
  const returnChain = (gate4 && gate4.return_point_chain) || null;

  const goHome = () => { setZoomLevel("universe"); setSelectedGroup(null); setSelectedWsId(null); };
  const goToCluster = (groupId) => { setZoomLevel("cluster"); setSelectedGroup(groupId); setSelectedWsId(null); };
  const goToWorkstream = (wsId) => {
    const node = layout.nodes.find((n) => n.ws.id === wsId);
    setZoomLevel("workstream");
    setSelectedGroup(node ? node.group : null);
    setSelectedWsId(wsId);
  };
  const goBack = () => {
    if (zoomLevel === "workstream") { setZoomLevel("cluster"); setSelectedWsId(null); }
    else if (zoomLevel === "cluster") goHome();
  };

  const selectedWs = selectedWsId ? vm.workstreams.find((w) => w.id === selectedWsId) : null;
  const selectedNode = selectedWsId ? layout.nodes.find((n) => n.ws.id === selectedWsId) : null;
  const clusterMembers = selectedGroup ? layout.nodes.filter((n) => n.group === selectedGroup) : [];

  const focusPos = zoomLevel === "workstream" && selectedNode
    ? selectedNode.pos
    : zoomLevel === "cluster" && layout.clusterCenterById[selectedGroup]
    ? layout.clusterCenterById[selectedGroup]
    : [0, 0, 0];
  const desiredDistance = zoomLevel === "workstream" ? 5 : zoomLevel === "cluster" ? 9.5 : 22;

  if (!canRender3D) {
    return (
      <div style={{ padding: 16, fontFamily: "-apple-system, Arial, sans-serif" }}>
        <div style={{ background: "#fbf6e6", border: "1px dashed #b8860b", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
          ⚠️ WebGL לא-זמין או viewport קטן-מדי לפרוטוטייפ תלת-ממדי. נופל-בחזרה ל-Diagnostic 2D (Stage 2) — אין מסך-שבור.
        </div>
        <iframe src="../diagnostic.html" title="Roadmap Diagnostic 2D fallback" style={{ width: "100%", height: "85vh", border: "1px solid #dfe3e8", borderRadius: 8 }} />
      </div>
    );
  }

  const outgoingIncoming = selectedWsId ? edgesTouching(vm, selectedWsId) : null;
  const groupEdges = selectedGroup && zoomLevel === "cluster" ? edgesTouchingGroup(vm, layout, selectedGroup) : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "radial-gradient(circle at 50% 40%, #0d0a1a, #05030a)" }}>
      {/* Header + Breadcrumb */}
      <div style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 3, color: "#e8e6df", fontFamily: "monospace", fontSize: 12, maxWidth: 360 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#ffe9a8" }}>🗺️ Roadmap Universe — Stage 4 (navigation)</div>
        <div style={{ opacity: 0.75, marginTop: 2 }}>
          v{vm.meta.version_label} · {vm.meta.canonical_status} · {coverage.workstreams} workstreams · {coverage.dependency_edges} edges · {coverage.total_warnings} warning(s)
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <span onClick={goHome} style={{ cursor: "pointer", color: zoomLevel === "universe" ? "#ffe9a8" : "#9db4f0", fontWeight: zoomLevel === "universe" ? 700 : 500 }}>🌌 Universe</span>
          {selectedGroup && <><span style={{ opacity: 0.5 }}>→</span>
            <span onClick={() => goToCluster(selectedGroup)} style={{ cursor: "pointer", color: zoomLevel === "cluster" ? "#ffe9a8" : "#9db4f0", fontWeight: zoomLevel === "cluster" ? 700 : 500 }}>🧩 {selectedGroup}</span></>}
          {selectedWsId && <><span style={{ opacity: 0.5 }}>→</span>
            <span style={{ color: "#ffe9a8", fontWeight: 700 }}>📦 {selectedWsId}</span></>}
        </div>
        {zoomLevel !== "universe" && (
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button onClick={goBack} style={{ background: "#1e1a2e", color: "#e8e6df", border: "1px solid #3a4468", borderRadius: 999, padding: "3px 10px", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>◀ Back</button>
            <button onClick={goHome} style={{ background: "#1e1a2e", color: "#e8e6df", border: "1px solid #3a4468", borderRadius: 999, padding: "3px 10px", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>🏠 Home</button>
          </div>
        )}
      </div>

      {/* Return Path itinerary — "here / next / later" over the SAME explicit chain, in its existing order. No invented nodes for non-workstream steps. */}
      {returnChain && (
        <div style={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 3, ...HUD_PANEL_STYLE, padding: "8px 12px", maxWidth: 330 }}>
          <div style={{ color: "#9db4f0", fontSize: 10.5, marginBottom: 4 }}>↩️ Return Path (Gate #4.return_point_chain)</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            <div>🔵 <b>כאן:</b> {returnChain[0]}</div>
            {returnChain[1] && <div style={{ opacity: 0.85 }}>⏭ <b>הבא:</b> {returnChain[1]}</div>}
            {returnChain.length > 2 && <div style={{ opacity: 0.6 }}>… {returnChain.slice(2).join(" → ")}</div>}
          </div>
        </div>
      )}

      {/* Human Gates HUD */}
      <div style={{ position: "absolute", bottom: 12, insetInlineStart: 12, zIndex: 3, ...HUD_PANEL_STYLE, border: "1px solid #333", padding: "8px 12px", maxHeight: 200, overflowY: "auto", width: 260 }}>
        <div style={{ marginBottom: 4, fontWeight: 700, fontSize: 10.5 }}>🚪 Open Human-Gates</div>
        {vm.open_human_gates.map((g) => (
          <div key={g.number} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 10.5, color: "#c9c7c0", padding: "1px 0" }}>
            <span>#{g.number}</span>
            <span style={statusPillStyle(g.status)}>{g.status}</span>
          </div>
        ))}
      </div>

      <Canvas camera={{ position: [0, 4, 22], fov: 55 }} onPointerMissed={() => { if (zoomLevel === "workstream") goBack(); }}>
        <Suspense fallback={null}>
          <Scene
            vm={vm}
            layout={layout}
            activeNowId={activeNowId}
            zoomLevel={zoomLevel}
            selectedGroup={selectedGroup}
            selectedWsId={selectedWsId}
            hoveredId={hoveredId}
            onSelectWorkstream={goToWorkstream}
            onSelectCluster={goToCluster}
            onHover={setHoveredId}
            focusPos={focusPos}
            desiredDistance={desiredDistance}
          />
        </Suspense>
      </Canvas>

      {/* Zoom 2 — Cluster panel */}
      {zoomLevel === "cluster" && selectedGroup && (
        <div style={{ position: "absolute", insetInlineEnd: 12, top: 150, zIndex: 4, width: "min(360px, 88vw)", ...HUD_PANEL_STYLE, padding: "14px 16px", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#ffe9a8" }}>🧩 {selectedGroup}</div>
          <div style={{ color: "#9a9285", fontSize: 9.5, marginBottom: 8 }}>{GROUP_DISCLAIMER}</div>
          <div style={{ color: "#9db4f0", fontSize: 10.5, marginBottom: 4 }}>{clusterMembers.length} workstream(s) — לחיצה פותחת Zoom 3</div>
          {clusterMembers.map((n) => {
            const status = classifyWorkstream(n.ws);
            return (
              <div key={n.ws.id} onClick={() => goToWorkstream(n.ws.id)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 6, padding: "4px 0", borderTop: "1px solid #2a2740", fontSize: 11 }}>
                <span>{n.ws.id}{n.ws.parse_warnings.length > 0 ? " ⚠" : ""}</span>
                <span style={{ color: status.color, fontWeight: 700 }}>{status.key}</span>
              </div>
            );
          })}
          {groupEdges && (groupEdges.inbound.length > 0 || groupEdges.outbound.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#9db4f0", fontSize: 10.5 }}>קשרים חוצי-cluster</div>
              {groupEdges.inbound.map((e, i) => <div key={"in" + i} style={{ fontSize: 10.5 }}>← {e.from} → {e.to}</div>)}
              {groupEdges.outbound.map((e, i) => <div key={"out" + i} style={{ fontSize: 10.5 }}>{e.from} → {e.to} →</div>)}
            </div>
          )}
        </div>
      )}

      {/* Zoom 3 — Operational Inspector (all 11 Roadmap card fields, read-only viewer) */}
      {zoomLevel === "workstream" && selectedWs && (
        <div style={{ position: "absolute", insetInlineEnd: 12, top: 150, zIndex: 4, width: "min(380px, 88vw)", ...HUD_PANEL_STYLE, padding: "14px 16px", maxHeight: "76vh", overflowY: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#ffe9a8", marginBottom: 2 }}>{selectedWs.id}</div>
          <div style={{ marginBottom: 8, opacity: 0.85 }}>{mdParts(selectedWs.title)}</div>

          <Field label="WHERE_WE_ARE" value={selectedWs.fields.WHERE_WE_ARE?.raw} />
          <Field label="STATE" value={selectedWs.fields.STATE?.raw} />
          <Field label="WHAT_IS_DONE" value={selectedWs.fields.WHAT_IS_DONE?.raw} />
          <Field label="WHAT_IS_OPEN" value={selectedWs.fields.WHAT_IS_OPEN?.raw} />
          <Field label="WHAT_IS_BLOCKED" value={selectedWs.fields.WHAT_IS_BLOCKED?.raw} />
          <Field label="DEPENDENCIES" value={selectedWs.fields.DEPENDENCIES?.raw} />
          <Field label="HUMAN_GATE" value={selectedWs.fields.HUMAN_GATE?.raw} />
          <Field label="NEXT_ACTION" value={selectedWs.fields.NEXT_ACTION?.raw} />
          <Field label="PROVENANCE" value={selectedWs.fields.PROVENANCE?.raw} />
          <Field label="CANONICAL_HOME" value={selectedWs.fields.CANONICAL_HOME?.raw} />
          <Field label="LAST_VERIFIED" value={selectedWs.fields.LAST_VERIFIED?.raw} />

          {selectedWs.gate_mentions.length > 0 && (
            <Field label="Gate mentions (not governance)" value={selectedWs.gate_mentions.map((n) => `#${n}`).join(", ")} />
          )}

          {outgoingIncoming && (outgoingIncoming.outgoing.length > 0 || outgoingIncoming.incoming.length > 0) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#9db4f0", fontSize: 10.5, marginBottom: 3 }}>Dependencies (navigate directly)</div>
              {outgoingIncoming.outgoing.map((e, i) => (
                <EdgeChip key={"o" + i} label={"→ " + e.to} onClick={() => goToWorkstream(e.to)} />
              ))}
              {outgoingIncoming.incoming.map((e, i) => (
                <EdgeChip key={"i" + i} label={e.from + " →"} onClick={() => goToWorkstream(e.from)} />
              ))}
            </div>
          )}

          {clusterMembers.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#9db4f0", fontSize: 10.5, marginBottom: 3 }}>שכנים ב-{selectedGroup} (בלי לחזור ל-Universe)</div>
              {clusterMembers.filter((n) => n.ws.id !== selectedWsId).map((n) => (
                <EdgeChip key={n.ws.id} label={n.ws.id} onClick={() => goToWorkstream(n.ws.id)} />
              ))}
            </div>
          )}

          {selectedWs.parse_warnings.length > 0 && (
            <div style={{ marginTop: 8, border: "1px solid #e0563a", borderRadius: 6, padding: "6px 8px", background: "rgba(224,86,58,0.12)" }}>
              <div style={{ color: "#e0563a", fontWeight: 700, fontSize: 11 }}>⚠ Parse Warnings</div>
              {selectedWs.parse_warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10.5, marginTop: 2 }}>{w.code}: {typeof w.detail === "string" ? w.detail : JSON.stringify(w.detail)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
