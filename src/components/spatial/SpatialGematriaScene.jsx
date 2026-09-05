// src/components/spatial/SpatialGematriaScene.jsx
// Spatial Gematria Golden Slice (Slice 2) — dev/admin only. Renders compileGematriaScene() output.
// No truth lives here: every number/letter/text on screen traces back through
// gematriaOperationModel.js (the live engine) or gematriaLiveData.js (live Supabase reads).

import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { GOLDEN_METHOD_KEYS, buildMethodOperation } from "../../lib/spatial/gematriaOperationModel.js";
import { fetchGematriaSubjectData, fetchGematriaContextForValue } from "../../lib/spatial/gematriaLiveData.js";
import { compileGematriaScene, TRUTH_TIERS, GEMATRIA_LENSES } from "../../lib/spatial/semanticSceneCompiler.js";

// Same repo-owned font path the Hebrew 10K Font Closure proved sufficient (work_log 2bc1a5cd) and
// the Number/Entity Golden Scene reused (work_log 8b5b5b41) — one asset, bundled via Vite ?url, no
// duplicate embed, no external dependency.
import HEEBO_800_TTF_URL from "../../../api/_assets/heebo-800.ttf?url";

const GOLDEN_SUBJECT_WORD = "משיח";

const TIER_COLOR = {
  [TRUTH_TIERS.FACT]: "#5ecbe0",
  [TRUTH_TIERS.FINDING]: "#e8dcb6",
  [TRUTH_TIERS.SOURCE_SUPPORTED]: "#8fd67a",
  [TRUTH_TIERS.CANDIDATE]: "#e0a94a",
  [TRUTH_TIERS.ENGINE_MISMATCH]: "#e05a5a",
};
const TIER_LABEL_HE = {
  [TRUTH_TIERS.FACT]: "עובדה — פלט מנוע",
  [TRUTH_TIERS.FINDING]: "ממצא — סינתזה ערוכה",
  [TRUTH_TIERS.SOURCE_SUPPORTED]: "מאומת ע\"י צוריאל · Human-Gate",
  [TRUTH_TIERS.CANDIDATE]: "מועמד — לא-מוכרע",
  [TRUTH_TIERS.ENGINE_MISMATCH]: "טענה לא-משוחזרת ע\"י המנוע",
};

function SceneNode({ node, focused, onSelect }) {
  const ref = useRef();
  const isSubject = node.kind === "subject";
  const isResult = node.kind === "result";
  const color = isSubject ? "#f6e9c4" : isResult ? "#ffd27a" : (TIER_COLOR[node.truthTier] || "#999");
  const radius = isSubject ? 0.55 : isResult ? 0.36 : focused ? 0.3 : 0.22;
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + (focused ? 0.12 : 0.04) * Math.sin(clock.elapsedTime * 1.6 + node.position.x);
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={focused ? 1.4 : 0.7} roughness={0.3} metalness={0.5} />
      </mesh>
      <Text
        font={HEEBO_800_TTF_URL}
        fontSize={isSubject ? 0.32 : 0.2}
        color="#f3eee1"
        anchorX="center"
        anchorY="bottom"
        position={[0, radius + 0.18, 0]}
        outlineWidth={0.008}
        outlineColor="#0a0812"
      >
        {node.label}
      </Text>
    </group>
  );
}

function RelationLine({ from, to, active }) {
  if (!from || !to) return null;
  const pts = [[from.x, from.y, from.z], [to.x, to.y, to.z]];
  return <Line points={pts} color={active ? "#ffd27a" : "#5a5468"} lineWidth={active ? 1.6 : 0.8} transparent opacity={active ? 0.9 : 0.35} />;
}

function CameraRig({ targetPos }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(0, 4.2, 15));
  useFrame(() => {
    desired.current.lerp(new THREE.Vector3(targetPos.x * 0.35, targetPos.y + 3.4, targetPos.z * 0.35 + 11), 0.06);
    camera.position.lerp(desired.current, 0.08);
    camera.lookAt(targetPos.x * 0.3, targetPos.y, targetPos.z * 0.3);
  });
  return null;
}

function PerfCollector({ onStats }) {
  const { gl } = useThree();
  useFrame(() => {
    const info = gl.info;
    const rawTriangles = info.render.triangles;
    onStats({
      drawCalls: info.render.calls,
      triangles: Number.isFinite(rawTriangles) ? rawTriangles : null,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    });
  });
  return null;
}

function MobileFallbackList({ scene, onSelect }) {
  return (
    <div style={{ padding: 16, color: "#e8dcb6", fontFamily: "system-ui", direction: "rtl" }}>
      <div style={{ opacity: 0.7, fontSize: 13, marginBottom: 10 }}>תצוגת-רשימה נגישה (WebGL לא זמין) — אותה מציאות מחקרית, ללא תלות בגרפיקה.</div>
      {scene.sceneNodes.map((n) => (
        <button key={n.id} onClick={() => onSelect(n.id)} style={{ display: "block", width: "100%", textAlign: "right", background: "#1a1626", border: "1px solid #3a3450", borderRadius: 10, padding: "10px 14px", color: "#f3eee1", marginBottom: 6, cursor: "pointer" }}>
          <b>{n.label}</b> <span style={{ opacity: 0.6, fontSize: 12 }}>· {n.subtitle}</span>
        </button>
      ))}
    </div>
  );
}

function SourcePanel({ node }) {
  if (!node) return null;
  const r = node.ref || {};
  return (
    <div style={{ marginTop: 10, background: "#141020", border: "1px solid #332e46", borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6 }}>
      {r.type === "gematria_subject" && (
        <div>נושא מחקר: <b>{r.word}</b>. ערך-מנוע נוכחי: <b>{r.engineValue}</b>.{r.subjectWord ? ` שורה מאומתת ב-gematria_words (${r.subjectWord.source}), ragil=${r.subjectWord.ragil}.` : " אין שורת gematria_words תואמת."}</div>
      )}
      {r.type === "operation_step" && (
        <div>שלב במבצע <b>{r.method}</b> (primitive: {r.primitive}). {r.step.label || `${r.step.ch}${r.step.substitutedTo ? " → " + r.step.substitutedTo : r.step.expandedTo ? " → " + r.step.expandedTo : ""}`} {r.step.val != null ? `= ${r.step.val}` : ""}</div>
      )}
      {r.type === "method_result" && (
        <div>
          <div><b>{r.method}</b> — {r.sub}</div>
          <div style={{ opacity: 0.75, marginTop: 2 }}>{r.soul}</div>
          <div style={{ marginTop: 4 }}>תוצאה: <b>{r.value}</b>{r.representationText ? ` · ייצוג טקסטואלי: ${r.representationText}` : ""}</div>
        </div>
      )}
      {r.type === "convergence" && (
        <div>
          <div>{r.description}</div>
          <div style={{ opacity: 0.6, marginTop: 4 }}>מספרים בהתכנסות: {(r.metadata?.numbers || []).join(" · ")}</div>
        </div>
      )}
      {r.type === "gematria_word" && (
        <div>
          מקור: {r.source}. {r.engineVerified === false && <span style={{ color: "#e05a5a" }}>⚠ המנוע לא שיחזר את הערך הנטען — לא-מאומת, מוצג כטענה בלבד.</span>}
          {r.engineVerified === true && <span style={{ opacity: 0.7 }}>מאומת מול המנוע החי.</span>}
        </div>
      )}
      {r.type === "topic_card" && (
        <div>
          <div>{r.findings?.headline}</div>
          {r.findings?.caveat && <div style={{ marginTop: 6, color: "#e0a94a" }}>⚠ הבחנה עובדה/פרשנות: {r.findings.caveat}</div>}
          {(r.findings?.bullets || []).map((b, i) => <div key={i} style={{ opacity: 0.85, marginTop: 3 }}>• {b}</div>)}
        </div>
      )}
      {r.type === "research_object" && (
        <div>
          <div>{r.statement}</div>
          <div style={{ opacity: 0.6, marginTop: 4 }}>מקור: {r.source_ref || "לא-מצוין"} · {r.kind}</div>
        </div>
      )}
    </div>
  );
}

export default function SpatialGematriaScene() {
  const [word] = useState(GOLDEN_SUBJECT_WORD);
  const [subjectWord, setSubjectWord] = useState(null);
  const [activeMethod, setActiveMethod] = useState("רגיל");
  const [compareMethod, setCompareMethod] = useState(null);
  const [lens, setLens] = useState("overview");
  const [context, setContext] = useState(null);
  const [compareContext, setCompareContext] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [focusStack, setFocusStack] = useState([]);
  const [stats, setStats] = useState({ drawCalls: 0, triangles: 0, geometries: 0, textures: 0 });
  const [webglOk, setWebglOk] = useState(true);
  const [timings, setTimings] = useState({});

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!ctx) setWebglOk(false);
    } catch { setWebglOk(false); }
  }, []);

  useEffect(() => { fetchGematriaSubjectData(word).then((d) => setSubjectWord(d.subjectWord)); }, [word]);

  const activeOp = useMemo(() => buildMethodOperation(activeMethod, word), [activeMethod, word]);
  const compareOp = useMemo(() => (compareMethod ? buildMethodOperation(compareMethod, word) : null), [compareMethod, word]);

  useEffect(() => {
    if (!activeOp) return;
    const t0 = performance.now();
    fetchGematriaContextForValue(activeOp.resultValue, activeOp.key).then((c) => {
      setContext(c);
      setTimings((t) => ({ ...t, contextFetchMs: +(performance.now() - t0).toFixed(1) }));
    });
  }, [activeOp?.resultValue, activeOp?.key]);

  useEffect(() => {
    if (!compareOp) { setCompareContext(null); return; }
    fetchGematriaContextForValue(compareOp.resultValue, compareOp.key).then(setCompareContext);
  }, [compareOp?.resultValue, compareOp?.key]);

  const scene = useMemo(() => {
    if (!activeOp || !context) return null;
    const t0 = performance.now();
    const s = compileGematriaScene(
      { word, subjectWord, activeOp, compareOp, context, compareContext },
      { lens, focusId }
    );
    setTimings((t) => ({ ...t, compileMs: +(performance.now() - t0).toFixed(2) }));
    return s;
  }, [word, subjectWord, activeOp, compareOp, context, compareContext, lens, focusId]);

  const selectNode = useCallback((id) => {
    setFocusStack((st) => (scene?.focusId ? [...st, scene.focusId] : st));
    setFocusId(id);
  }, [scene]);

  const back = useCallback(() => {
    setFocusStack((st) => {
      if (!st.length) return st;
      const prev = st[st.length - 1];
      setFocusId(prev);
      return st.slice(0, -1);
    });
  }, []);

  const setMethod = useCallback((key) => {
    setActiveMethod(key);
    setFocusId(null);
    setFocusStack([]);
  }, []);

  const toggleCompare = useCallback((key) => {
    if (key) { setCompareMethod(key); setLens("compare"); }
    else { setCompareMethod(null); if (lens === "compare") setLens("overview"); }
  }, [lens]);

  useEffect(() => {
    window.__gematriaSceneApi = {
      selectNode, back, setMethod, setLens, toggleCompare,
      getScene: () => scene, getStats: () => stats, getTimings: () => timings,
      getActiveOp: () => activeOp, getCompareOp: () => compareOp,
    };
    return () => { delete window.__gematriaSceneApi; };
  }, [selectNode, back, setMethod, scene, stats, timings, activeOp, compareOp]);

  if (!scene) return <div style={{ padding: 30, color: "#e8dcb6" }}>טוען מציאות מחקרית…</div>;

  const focusedNode = scene.sceneNodes.find((n) => n.id === scene.focusId);
  const targetPos = focusedNode ? focusedNode.position : { x: 0, y: 0, z: 0 };
  const nodeById = Object.fromEntries(scene.sceneNodes.map((n) => [n.id, n]));

  return (
    <div style={{ display: "flex", minHeight: "80vh", background: "#0a0812" }} dir="rtl">
      <div style={{ flex: "1 1 68%", position: "relative", minHeight: 520 }}>
        {webglOk ? (
          <Canvas camera={{ position: [0, 4.2, 15], fov: 45 }}>
            <color attach="background" args={["#0a0812"]} />
            <ambientLight intensity={0.55} />
            <pointLight position={[6, 8, 6]} intensity={1.1} />
            <Suspense fallback={null}>
              {scene.sceneRelations.map((r) => (
                <RelationLine key={r.id} from={nodeById[r.from]?.position} to={nodeById[r.to]?.position} active={r.from === scene.focusId || r.to === scene.focusId} />
              ))}
              {scene.sceneNodes.map((n) => (
                <SceneNode key={n.id} node={n} focused={n.id === scene.focusId} onSelect={selectNode} />
              ))}
              <CameraRig targetPos={targetPos} />
              <PerfCollector onStats={setStats} />
            </Suspense>
            <OrbitControls enablePan={false} maxDistance={26} minDistance={4} />
          </Canvas>
        ) : (
          <MobileFallbackList scene={scene} onSelect={selectNode} />
        )}
      </div>

      <div style={{ flex: "1 1 32%", maxWidth: 380, background: "#100c1a", borderInlineStart: "1px solid #2a2438", padding: "16px 14px", overflowY: "auto", color: "#e8dcb6", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>גימטריה מרחבית · Spatial Gematria Golden Slice</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f6e9c4" }}>{word}</div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>שיטה פעילה</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {GOLDEN_METHOD_KEYS.map((k) => (
            <button key={k} onClick={() => setMethod(k)} style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (k === activeMethod ? "#e8c357" : "#3a3450"), background: k === activeMethod ? "#e8c35722" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>
              {k}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>השוואה מול</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          <button onClick={() => toggleCompare(null)} style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (!compareMethod ? "#e8c357" : "#3a3450"), background: !compareMethod ? "#e8c35722" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>ללא</button>
          {GOLDEN_METHOD_KEYS.filter((k) => k !== activeMethod).map((k) => (
            <button key={k} onClick={() => toggleCompare(k)} style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (k === compareMethod ? "#e8c357" : "#3a3450"), background: k === compareMethod ? "#e8c35722" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>
              {k}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>עדשה</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {Object.values(GEMATRIA_LENSES).map((l) => (
            <button key={l.key} onClick={() => setLens(l.key)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (l.key === lens ? "#5ecbe0" : "#3a3450"), background: l.key === lens ? "#5ecbe022" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: "8px 10px", background: "#151020", borderRadius: 8, fontSize: 12.5 }}>
          <b>{activeOp?.label}</b>({word}) = <b style={{ color: "#ffd27a" }}>{activeOp?.resultValue}</b>
          {compareOp && <div style={{ marginTop: 4 }}><b>{compareOp.label}</b>({word}) = <b style={{ color: "#ffd27a" }}>{compareOp.resultValue}</b></div>}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>מקרא-אמת</div>
        {Object.entries(TIER_LABEL_HE).map(([tier, label]) => (
          <div key={tier} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 3 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: TIER_COLOR[tier], display: "inline-block" }} />
            {label}
          </div>
        ))}

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>נבחר</div>
        <div style={{ fontWeight: 700, marginTop: 2 }}>{focusedNode?.label}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>{focusedNode?.subtitle}</div>
        <SourcePanel node={focusedNode} />

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>קשרים מהנבחר</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          {scene.sceneRelations.filter((r) => r.from === scene.focusId).slice(0, 8).map((r) => (
            <button key={r.id} onClick={() => selectNode(r.to)} style={{ textAlign: "right", background: "#141020", border: "1px solid #2a2438", borderRadius: 8, padding: "6px 9px", color: "#e8dcb6", cursor: "pointer", fontSize: 12 }}>
              → {nodeById[r.to]?.label}: {r.explanation}
            </button>
          ))}
        </div>

        <button onClick={back} disabled={!focusStack.length} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 999, border: "1px solid #3a3450", background: "transparent", color: focusStack.length ? "#e8dcb6" : "#4a4458", cursor: focusStack.length ? "pointer" : "default", fontSize: 12.5 }}>
          ← חזרה ({focusStack.length})
        </button>

        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.5 }}>
          drawCalls={stats.drawCalls} · triangles={stats.triangles ?? "—"} · compile={timings.compileMs}ms · context-fetch={timings.contextFetchMs}ms
        </div>
      </div>
    </div>
  );
}
