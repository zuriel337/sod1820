// 🗺️ מפת־העל התלת־ממדית — עדשת-ניווט סמנטי מעל SOD1820_MASTER_ROADMAP.md.
// הועבר ל-src/ מ-tools/roadmap-map/stage3/ (Stage 1-4 + תיקון Hebrew-first) כדי
// לקבל בית קבוע בתוך «🎛️ חדר המפקדה» ← RoadmapCommandCenter.jsx, לפי החלטת
// צוריאל. זהו הרחבה של העדשה הקיימת (RoadmapCommandCenter), לא ארטיפקט חדש —
// אינה נוגעת בהכרעת CC-1-target (Gate #9: WarRoomTab מול RoadmapCommandCenter).
//
// Pipeline (חוק־ברזל, לא נשבר כאן):
//   SOD1820_MASTER_ROADMAP.md -> roadmapParser.parseRoadmap() -> view model -> הסצנה הזו
//
// קובץ זה לעולם לא מפרסר markdown, לא מריץ regex על טקסט-המפה, ולעולם לא
// ממציא סטטוס/קשר/עולם/יחס-שער שלא כבר קיים במודל. אם חסר כאן משהו —
// זה סימן להרחיב את src/lib/roadmapParser.js (+ הבדיקות שלו), לא לעקוף כאן.
//
// group_hint = קיבוץ-תצוגה בלבד. לעולם לא הופך לחלוקת-עולמות קנונית — מוצג
// בעברית «קיבוץ תצוגה משוער — אינו חלוקה קנונית», עם ה-id הטכני כשורה משנית.
//
// עברית-כברירת־מחדל: כל תווית/סטטוס/ניווט/הסבר בעברית; מזהים טכניים
// (WS-ids, SHA, שמות-פונקציה/טבלה, טקסט-שרשרת-החזרה המצוטט כלשונו מהמפה)
// נשארים provenance משני קטן. מילון-הסטטוס הוא הדו-לשוני הקנוני שכבר קיים
// במפה עצמה — לא הומצא תרגום חדש. כותרות מסלולי-עבודה לא מתורגמות ידנית —
// ws.title (כבר עברית ברוב הכרטיסים) הוא התווית הראשית, ws.id משני-טכני-קטן.

import React, { useMemo, useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { parseRoadmap, summarizeCoverage } from "../../lib/roadmapParser.js";
import roadmapMd from "../../../SOD1820_MASTER_ROADMAP.md?raw";

const FONT_HE = "'Segoe UI', Arial, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', Consolas, monospace";

const CLUSTER_DISCLAIMER_HE = "קיבוץ תצוגה משוער — אינו חלוקה קנונית";

// ---------- מילון-סטטוס דו-לשוני קנוני (מהמפה עצמה, לא תרגום חדש) ----------
const HE_STATUS_TAG = {
  "LIVE": "🚀 פעיל",
  "DB-LIVE": "🚀 פעיל (במסד-הנתונים)",
  "BUILDING": "🏗️ בבנייה",
  "PREVIEW": "👁️ תצוגה מקדימה",
  "PREVIEW-VERIFIED": "👁️ תצוגה מקדימה · ✅ אומת",
  "OPEN-HUMAN-GATE": "🚪 ממתין להחלטה",
  "OPEN": "🚪 ממתין להחלטה",
  "PARKED": "⏸️ מושהה",
  "DESIGN": "📐 תכנון",
  "BLOCKED": "🚧 חסום",
  "VERIFIED": "✅ אומת",
  "DONE": "✔️ הושלם",
  "ACTIVE_NOW": "🔵 עכשיו",
  "SUPERSEDED": "🗄️ הוחלף",
  "FUTURE": "🔮 בעתיד",
  "UNKNOWN": "❔ לא ידוע",
  "OUTSIDE": "🚪 מחוץ לתחום",
  "PARALLEL_READY": "🟡 מוכן במקביל",
  "INTAKE-CRITICAL": "🔴 קריטי לשכבת הקליטה",
};
function heTags(tags) {
  if (!tags || tags.length === 0) return "❔ לא ידוע";
  return tags.map((t) => HE_STATUS_TAG[t] || t).join(" · ");
}
function gateStatusHe(status) {
  if (status === "CLOSED") return "🟢 סגור";
  if (status === "OPEN_INTAKE_CRITICAL") return "🚪 קריטי לשכבת הקליטה";
  if (status === "OPEN") return "🚪 פתוח";
  return "❔ לא ידוע";
}

// ---------- פיזור-כדורי Fibonacci (אותה טכניקה כמו ConvergenceGalaxy.jsx) ----------
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

// ---------- מיפוי סטטוס → צבע (עדיפות-רינדור מעל תגיות קיימות, לא טקסונומיה חדשה) ----------
const STATUS_PRIORITY = [
  { test: (tags) => tags.includes("OPEN-HUMAN-GATE") && tags.includes("INTAKE-CRITICAL"), key: "INTAKE_CRITICAL", color: "#e0563a" },
  { test: (tags) => tags.includes("OPEN-HUMAN-GATE") || tags.includes("OPEN"), key: "OPEN", color: "#c79a2e" },
  { test: (tags) => tags.includes("BUILDING") || tags.includes("PREVIEW-VERIFIED") || tags.includes("PREVIEW"), key: "BUILDING", color: "#3ea6ff" },
  { test: (tags) => tags.includes("LIVE") || tags.includes("DB-LIVE") || tags.includes("VERIFIED") || tags.includes("DONE"), key: "LIVE", color: "#4caf7d" },
  { test: (tags) => tags.includes("PARKED") || tags.includes("SUPERSEDED") || tags.includes("FUTURE"), key: "PARKED", color: "#8a8a95" },
];
const UNKNOWN_STATUS = { key: "UNKNOWN", color: "#5b6472" };
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

// גזירה טהורה מעל dependency_edges של הפרסר עצמו — בלי המצאה.
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
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActiveNow ? 1.6 : isSelected ? 1.1 : 0.55}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* יעד-לחיצה מוגדל, שקוף-כמעט-לגמרי — הכדור החזותי (radius~0.4) קטן מדי
          למגע-אצבע/עכבר-לא-מדויק (זוהתה תקלה: "תלת מימד לא לחיץ"). לא נוגע
          במראה, רק מרחיב את שטח-הפגיעה של ה-raycast. */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(node.ws.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(node.ws.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[Math.max(radius * 2.4, 0.85), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(isHovered || isSelected || isActiveNow) && !dimmed && (
        <Html center distanceFactor={16} style={{ pointerEvents: "none" }}>
          <div dir="rtl" style={{
            color: isActiveNow ? "#ffe9a8" : "#f3f2ee",
            fontFamily: FONT_HE, fontSize: 12, fontWeight: 700,
            whiteSpace: "nowrap", textShadow: "0 0 8px #000, 0 0 3px #000",
            transform: "translateY(-2.4em)", textAlign: "center",
          }}>
            {isActiveNow ? "🔵 עכשיו · " : ""}
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5 }}>{node.ws.id}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// תווית-אשכול בתוך הסצנה נשארת קצרה (חזרה על ההסבר המלא ב-18 אשכולות חופפת
// שכנים במבט-על) — ההסבר העברי המלא יושב פעם אחת בהודעת-הכותרת. "תחום" עברי
// ראשי, group_hint הטכני משני-קטן מתחתיו.
function GroupLabel({ groupId, center, onClick, dimmed }) {
  return (
    <Html position={center} center distanceFactor={22} style={{ pointerEvents: "auto" }}>
      <div
        dir="rtl"
        onClick={(e) => { e.stopPropagation(); onClick(groupId); }}
        style={{ textAlign: "center", cursor: "pointer", opacity: dimmed ? 0.25 : 1, padding: 14, minWidth: 44, minHeight: 44, display: "flex", flexDirection: "column", justifyContent: "center", touchAction: "manipulation" }}
      >
        <div style={{ color: "#d4af37", fontFamily: FONT_HE, fontWeight: 700, fontSize: 13, textShadow: "0 0 8px #000" }}>🧩 תחום</div>
        <div style={{ color: "#9a9285", fontFamily: FONT_MONO, fontSize: 10, textShadow: "0 0 6px #000", marginTop: 1 }}>{groupId}</div>
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
        if (!from || !to) return null; // אף פעם לא מציירים קשר שלא ניתן לפתור לצומת אמיתי
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
  return { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg, fontFamily: FONT_HE };
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

// רינדור-markdown inline קוסמטי-בלבד (bold **x** / code-span) — לא חולץ
// עובדה חדשה, לא משנה נתון.
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
    else parts.push(<code key={key++} style={{ fontFamily: FONT_MONO }}>{m[2].slice(1, -1)}</code>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < str.length) parts.push(str.slice(lastIndex));
  return parts;
}

// label = שם-שדה עברי קנוני. value = טקסט-גלם מהמפה (עברית/אנגלית/טכני
// מעורב) — מוצג כמות שהוא, לעולם לא מתורגם-מחדש.
function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ color: "#9db4f0", fontSize: 11, fontFamily: FONT_HE, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, fontFamily: FONT_HE }}>{mdParts(value)}</div>
    </div>
  );
}

function EdgeChip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "#20263a", color: "#9db4f0", border: "1px solid #3a4468", borderRadius: 999, padding: "2px 9px", fontFamily: FONT_HE, fontSize: 11, cursor: "pointer", margin: "2px 3px 2px 0" }}
    >
      {label}
    </button>
  );
}

const HUD_PANEL_STYLE = {
  background: "rgba(10,7,20,0.94)", border: "1px solid #5b7fd6", borderRadius: 14,
  color: "#e8e6df", fontFamily: FONT_HE, fontSize: 12,
};

export default function RoadmapMap3D({ height = "82vh" }) {
  const vm = useMemo(() => parseRoadmap(roadmapMd), []);
  const coverage = useMemo(() => summarizeCoverage(vm), [vm]);
  const layout = useMemo(() => buildLayout(vm), [vm]);

  // zoomLevel: "universe" | "cluster" | "workstream"
  const [zoomLevel, setZoomLevel] = useState("universe");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedWsId, setSelectedWsId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

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

  const outgoingIncoming = selectedWsId ? edgesTouching(vm, selectedWsId) : null;
  const groupEdges = selectedGroup && zoomLevel === "cluster" ? edgesTouchingGroup(vm, layout, selectedGroup) : null;

  return (
    <div dir="rtl" style={{ position: "relative", width: "100%", height, borderRadius: 14, overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #0d0a1a, #05030a)" }}>
      {/* כותרת + פירורי-לחם */}
      <div style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 3, color: "#e8e6df", fontFamily: FONT_HE, fontSize: 13, maxWidth: 360 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#ffe9a8" }}>🗺️ מפת־העל התלת־ממדית — מרכז הניהול</div>
        <div style={{ opacity: 0.8, marginTop: 3, fontSize: 12 }}>
          גרסה {vm.meta.version_label} · {vm.meta.canonical_status === "CANONICAL" ? "קנוני" : vm.meta.canonical_status} · {coverage.workstreams} מסלולי-עבודה · {coverage.dependency_edges} קשרים · {coverage.total_warnings} אזהרות
        </div>
        <div style={{ marginTop: 5, fontSize: 10.5, color: "#9a9285", lineHeight: 1.4 }}>
          🧩 "תחומים" במפה = {CLUSTER_DISCLAIMER_HE}
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 13 }}>
          <span onClick={goHome} style={{ cursor: "pointer", color: zoomLevel === "universe" ? "#ffe9a8" : "#9db4f0", fontWeight: zoomLevel === "universe" ? 700 : 500 }}>🌌 מבט־על</span>
          {selectedGroup && <><span style={{ opacity: 0.5 }}>◀</span>
            <span onClick={() => goToCluster(selectedGroup)} style={{ cursor: "pointer", color: zoomLevel === "cluster" ? "#ffe9a8" : "#9db4f0", fontWeight: zoomLevel === "cluster" ? 700 : 500 }}>
              🧩 תחום <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>{selectedGroup}</span>
            </span></>}
          {selectedWsId && <><span style={{ opacity: 0.5 }}>◀</span>
            <span style={{ color: "#ffe9a8", fontWeight: 700 }}>📦 <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>{selectedWsId}</span></span></>}
        </div>
        {zoomLevel !== "universe" && (
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <button onClick={goBack} style={{ background: "#1e1a2e", color: "#e8e6df", border: "1px solid #3a4468", borderRadius: 999, padding: "3px 12px", fontFamily: FONT_HE, fontSize: 12, cursor: "pointer" }}>◀ חזרה</button>
            <button onClick={goHome} style={{ background: "#1e1a2e", color: "#e8e6df", border: "1px solid #3a4468", borderRadius: 999, padding: "3px 12px", fontFamily: FONT_HE, fontSize: 12, cursor: "pointer" }}>🌌 מבט־על</button>
          </div>
        )}
      </div>

      {/* נקודת החזרה — "עכשיו / הבא / בהמשך" מעל אותה שרשרת מפורשת, באותו סדר. אין nodes מומצאים לשלבים שאינם מסלולי-עבודה. */}
      {returnChain && (
        <div style={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 3, ...HUD_PANEL_STYLE, padding: "10px 14px", maxWidth: 330 }}>
          <div style={{ color: "#9db4f0", fontSize: 11.5, marginBottom: 5, fontWeight: 700 }}>↩️ נקודת החזרה</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <div>🔵 <b>עכשיו:</b> <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>{returnChain[0]}</span></div>
            {returnChain[1] && <div style={{ opacity: 0.85 }}>⏭ <b>הבא:</b> <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>{returnChain[1]}</span></div>}
            {returnChain.length > 2 && <div style={{ opacity: 0.6 }}>… <b>בהמשך:</b> <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>{returnChain.slice(2).join(" ← ")}</span></div>}
          </div>
        </div>
      )}

      {/* שערי החלטה */}
      <div style={{ position: "absolute", bottom: 12, insetInlineStart: 12, zIndex: 3, ...HUD_PANEL_STYLE, border: "1px solid #333", padding: "10px 14px", maxHeight: 210, overflowY: "auto", width: 260 }}>
        <div style={{ marginBottom: 5, fontWeight: 700, fontSize: 12 }}>🚪 שערי החלטה</div>
        {vm.open_human_gates.map((g) => (
          <div key={g.number} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11, color: "#c9c7c0", padding: "1.5px 0" }}>
            <span style={{ fontFamily: FONT_MONO }}>#{g.number}</span>
            <span style={statusPillStyle(g.status)}>{gateStatusHe(g.status)}</span>
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

      {/* רמה 2 — פאנל תחום/אשכול */}
      {zoomLevel === "cluster" && selectedGroup && (
        <div style={{ position: "absolute", insetInlineEnd: 12, top: 158, zIndex: 4, width: "min(370px, 88vw)", ...HUD_PANEL_STYLE, padding: "16px 18px", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#ffe9a8" }}>🧩 תחום עבודה</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9a9285", marginBottom: 3 }}>{selectedGroup}</div>
          <div style={{ color: "#9a9285", fontSize: 10.5, marginBottom: 10 }}>{CLUSTER_DISCLAIMER_HE}</div>
          <div style={{ color: "#9db4f0", fontSize: 11.5, marginBottom: 5, fontWeight: 700 }}>מסלולי עבודה בתחום זה ({clusterMembers.length}) — לחיצה פותחת פירוט מלא</div>
          {clusterMembers.map((n) => {
            const status = classifyWorkstream(n.ws);
            return (
              <div key={n.ws.id} onClick={() => goToWorkstream(n.ws.id)} style={{ cursor: "pointer", padding: "6px 0", borderTop: "1px solid #2a2740" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
                  <span>{mdParts(n.ws.title)}{n.ws.parse_warnings.length > 0 ? " ⚠️" : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#7a7f8f" }}>{n.ws.id}</span>
                  <span style={{ color: status.color, fontWeight: 700, fontSize: 11 }}>{heTags(n.ws.fields.STATE?.known_tags)}</span>
                </div>
              </div>
            );
          })}
          {groupEdges && (groupEdges.inbound.length > 0 || groupEdges.outbound.length > 0) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: "#9db4f0", fontSize: 11.5, fontWeight: 700 }}>קשרים חוצי־תחום</div>
              {groupEdges.inbound.map((e, i) => <div key={"in" + i} style={{ fontSize: 11, marginTop: 2, fontFamily: FONT_MONO }}>← {e.from} → {e.to}</div>)}
              {groupEdges.outbound.map((e, i) => <div key={"out" + i} style={{ fontSize: 11, marginTop: 2, fontFamily: FONT_MONO }}>{e.from} → {e.to} →</div>)}
            </div>
          )}
        </div>
      )}

      {/* רמה 3 — פירוט תפעולי מלא (Viewer בלבד — לא ניתן לעריכה) */}
      {zoomLevel === "workstream" && selectedWs && (
        <div style={{ position: "absolute", insetInlineEnd: 12, top: 158, zIndex: 4, width: "min(390px, 88vw)", ...HUD_PANEL_STYLE, padding: "16px 18px", maxHeight: "76vh", overflowY: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#ffe9a8", marginBottom: 2 }}>{mdParts(selectedWs.title)}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9a9285", marginBottom: 10 }}>{selectedWs.id}</div>

          <Field label="איפה אנחנו" value={selectedWs.fields.WHERE_WE_ARE?.raw} />
          <Field label="מצב" value={selectedWs.fields.STATE?.raw} />
          <Field label="מה הושלם" value={selectedWs.fields.WHAT_IS_DONE?.raw} />
          <Field label="מה פתוח" value={selectedWs.fields.WHAT_IS_OPEN?.raw} />
          <Field label="מה חסום" value={selectedWs.fields.WHAT_IS_BLOCKED?.raw} />
          <Field label="תלותים" value={selectedWs.fields.DEPENDENCIES?.raw} />
          <Field label="שער החלטה" value={selectedWs.fields.HUMAN_GATE?.raw} />
          <Field label="הצעד הבא" value={selectedWs.fields.NEXT_ACTION?.raw} />
          <Field label="מקור ותיעוד" value={selectedWs.fields.PROVENANCE?.raw} />
          <Field label="מקור קנוני" value={selectedWs.fields.CANONICAL_HOME?.raw} />
          <Field label="אומת לאחרונה" value={selectedWs.fields.LAST_VERIFIED?.raw} />

          {selectedWs.gate_mentions.length > 0 && (
            <Field label="אזכור שער (לא קשר ניהולי)" value={selectedWs.gate_mentions.map((n) => `#${n}`).join(", ")} />
          )}

          {outgoingIncoming && (outgoingIncoming.outgoing.length > 0 || outgoingIncoming.incoming.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#9db4f0", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>תלוי ב־ / תלוי בזה (ניווט ישיר)</div>
              {outgoingIncoming.outgoing.map((e, i) => (
                <EdgeChip key={"o" + i} label={"תלוי ב־ " + e.to} onClick={() => goToWorkstream(e.to)} />
              ))}
              {outgoingIncoming.incoming.map((e, i) => (
                <EdgeChip key={"i" + i} label={e.from + " תלוי בזה"} onClick={() => goToWorkstream(e.from)} />
              ))}
            </div>
          )}

          {clusterMembers.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#9db4f0", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>מסלולים נוספים באותו תחום (בלי לחזור למבט־על)</div>
              {clusterMembers.filter((n) => n.ws.id !== selectedWsId).map((n) => (
                <EdgeChip key={n.ws.id} label={n.ws.id} onClick={() => goToWorkstream(n.ws.id)} />
              ))}
            </div>
          )}

          {selectedWs.parse_warnings.length > 0 && (
            <div style={{ marginTop: 10, border: "1px solid #e0563a", borderRadius: 6, padding: "7px 10px", background: "rgba(224,86,58,0.12)" }}>
              <div style={{ color: "#e0563a", fontWeight: 700, fontSize: 12 }}>⚠ אזהרות</div>
              {selectedWs.parse_warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 11, marginTop: 3, fontFamily: FONT_MONO }}>{w.code}: {typeof w.detail === "string" ? w.detail : JSON.stringify(w.detail)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
