// src/components/spatial/NumberEntityGoldenScene.jsx
// Number/Entity Spatial Golden Scene — Slice 1 (Spatial 3D Slice 0 contract in practice).
// Research Reality (live Supabase data) -> Semantic Scene Compiler (pure) -> Spatial Projection
// (this file) -> Research Experience. No auth logic here — the page wrapper owns the admin gate.
//
// ONE SYSTEM LAW: no second Reality Graph, no spatial database, no canonical x/y/z. Everything
// rendered here is PROJECTION STATE, recomputed from live data on every mount/focus/lens change,
// never written back anywhere.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { fetchNumberEntityLiveData } from "../../lib/spatial/numberEntityLiveData.js";
import { compileNumberEntityScene, TRUTH_TIERS, LENSES } from "../../lib/spatial/semanticSceneCompiler.js";
// Same proven font path as the 10K Hebrew closure (work_log 2bc1a5cd): the repo's own existing
// TTF, referenced directly via Vite's ?url import — no duplicated asset, no external font resolver.
import HEEBO_800_TTF_URL from "../../../api/_assets/heebo-800.ttf?url";

const GOLDEN_NUMBER = 358;

const TIER_COLOR = {
  [TRUTH_TIERS.FACT]: "#6fb6c9",            // quiet cyan — engine-computed
  [TRUTH_TIERS.FINDING]: "#c9b98a",          // warm neutral — curated/editorial
  [TRUTH_TIERS.SOURCE_SUPPORTED]: "#7fbf8f", // muted green — Human-Gate/source-backed
  [TRUTH_TIERS.CANDIDATE]: "#c98a6f",        // muted amber — candidate/unverified, dashed
};
const TIER_LABEL_HE = {
  [TRUTH_TIERS.FACT]: "עובדה — מנוע",
  [TRUTH_TIERS.FINDING]: "ממצא — עריכה",
  [TRUTH_TIERS.SOURCE_SUPPORTED]: "מאומת-מקור",
  [TRUTH_TIERS.CANDIDATE]: "מועמד — לא מאומת",
};
const BG = "#07080c";
const INK = "#e9e6df";
const INK_DIM = "#8b8f96";
const ACCENT = "#5b8fd9"; // single quiet accent hue — not gold/purple

function SceneNode({ node, isSubject, isFocused, onSelect }) {
  const scale = isSubject ? 0.62 : isFocused ? 0.4 : 0.26;
  const color = isSubject ? "#f4f1e8" : TIER_COLOR[node.truthTier] || INK_DIM;
  const [hover, setHover] = useState(false);
  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[scale * (hover ? 1.15 : 1), 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSubject ? 0.55 : isFocused ? 0.4 : hover ? 0.3 : 0.12}
          roughness={0.45}
          metalness={0.25}
        />
      </mesh>
      <Text
        position={[0, scale + 0.34, 0]}
        fontSize={isSubject ? 0.42 : 0.24}
        font={HEEBO_800_TTF_URL}
        color={isSubject ? "#f4f1e8" : INK}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#000"
        maxWidth={3}
      >
        {node.label}
      </Text>
    </group>
  );
}

function RelationLine({ from, to, dimmed }) {
  const points = useMemo(() => [
    new THREE.Vector3(from.x, from.y, from.z),
    new THREE.Vector3(to.x, to.y, to.z),
  ], [from, to]);
  return <Line points={points} color={dimmed ? "#2a2d33" : "#3d4552"} lineWidth={dimmed ? 0.6 : 1} transparent opacity={dimmed ? 0.35 : 0.6} />;
}

// Camera recomposes toward the focused node instead of teleporting — "the research focus changed,"
// not "you left the page." Simple critically-damped lerp, no cinematic-camera engine.
function CameraRig({ targetPos }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(0, 3.2, 11));
  useEffect(() => {
    desired.current.set(targetPos.x * 0.4, targetPos.y + 3.6, targetPos.z * 0.4 + 12);
  }, [targetPos]);
  useFrame((_, delta) => {
    camera.position.lerp(desired.current, 1 - Math.pow(0.001, delta));
    camera.lookAt(targetPos.x * 0.3, targetPos.y * 0.6, targetPos.z * 0.3);
  });
  return null;
}

function PerfCollector({ statsRef }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const last = useRef(performance.now());
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 500) {
      const rawTriangles = gl.info.render.triangles;
      statsRef.current = {
        drawCalls: gl.info.render.calls,
        // drei's <Line> primitives report Infinity into renderer.info's triangle counter (a known
        // three.js/drei quirk for non-indexed line geometry, not a real count) — guard the display
        // rather than show a nonsensical number.
        triangles: Number.isFinite(rawTriangles) ? rawTriangles : null,
        fps: Math.round((frames.current * 1000) / (now - last.current)),
      };
      if (typeof window !== "undefined") window.__goldenSceneStats = statsRef.current;
      frames.current = 0;
      last.current = now;
    }
  });
  return null;
}

function nodeById(nodes, id) { return nodes.find((n) => n.id === id) || null; }

export default function NumberEntityGoldenScene() {
  const [liveData, setLiveData] = useState(null);
  const [error, setError] = useState(null);
  const [lens, setLens] = useState("overview");
  const [focusId, setFocusId] = useState(null);
  const [focusStack, setFocusStack] = useState([]);
  const [webglOk, setWebglOk] = useState(true);
  const statsRef = useRef({});
  const timingsRef = useRef({ fetchStart: performance.now(), fetchedAt: null, compileMs: null, lastFocusMs: null });

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setWebglOk(false);
    } catch { setWebglOk(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNumberEntityLiveData(GOLDEN_NUMBER).then((data) => {
      if (cancelled) return;
      timingsRef.current.fetchedAt = performance.now();
      setLiveData(data);
    }).catch((e) => setError(String(e?.message || e)));
    return () => { cancelled = true; };
  }, []);

  const scene = useMemo(() => {
    if (!liveData) return null;
    const t0 = performance.now();
    const compiled = compileNumberEntityScene(liveData, { lens, focusId });
    timingsRef.current.compileMs = performance.now() - t0;
    if (typeof window !== "undefined") window.__goldenSceneTimings = { ...timingsRef.current };
    return compiled;
  }, [liveData, lens, focusId]);

  const selectNode = useCallback((id) => {
    const t0 = performance.now();
    setFocusStack((s) => (focusId ? [...s, focusId] : s));
    setFocusId(id);
    requestAnimationFrame(() => {
      timingsRef.current.lastFocusMs = performance.now() - t0;
      if (typeof window !== "undefined") window.__goldenSceneTimings = { ...timingsRef.current };
    });
  }, [focusId]);

  const goBack = useCallback(() => {
    setFocusStack((s) => {
      if (!s.length) { setFocusId(null); return s; }
      const next = [...s];
      const prev = next.pop();
      setFocusId(prev);
      return next;
    });
  }, []);

  useEffect(() => {
    window.__goldenSceneApi = {
      selectNode, goBack, setLens,
      getScene: () => scene,
      getStats: () => statsRef.current,
      getTimings: () => timingsRef.current,
    };
    return () => { delete window.__goldenSceneApi; };
  }, [selectNode, goBack, scene]);

  const focusedNode = scene ? (nodeById(scene.sceneNodes, scene.focusId) || nodeById(scene.sceneNodes, scene.subjectId)) : null;
  const focusedPos = focusedNode ? focusedNode.position : { x: 0, y: 0, z: 0 };

  if (error) {
    return <div style={{ padding: 24, color: "#e08080", background: BG, minHeight: "100vh" }}>שגיאת טעינת נתונים חיים: {error}</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, direction: "rtl" }}>
      <div style={{ flex: 1, position: "relative" }}>
        {!liveData ? (
          <div style={{ color: INK_DIM, padding: 24 }}>טוען נתונים חיים ל-{GOLDEN_NUMBER}…</div>
        ) : webglOk ? (
          <Canvas camera={{ position: [0, 4.2, 15], fov: 45 }}>
            <color attach="background" args={[BG]} />
            <fog attach="fog" args={[BG, 8, 22]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[6, 8, 6]} intensity={0.7} />
            <pointLight position={[-6, -2, -6]} intensity={0.25} color={ACCENT} />
            <PerfCollector statsRef={statsRef} />
            <CameraRig targetPos={focusedPos} />
            {scene.sceneRelations.map((r) => {
              const from = nodeById(scene.sceneNodes, r.from);
              const to = nodeById(scene.sceneNodes, r.to);
              if (!from || !to) return null;
              return <RelationLine key={r.id} from={from.position} to={to.position} dimmed={scene.focusId !== scene.subjectId && r.to !== scene.focusId && r.from !== scene.focusId} />;
            })}
            {scene.sceneNodes.map((n) => (
              <SceneNode
                key={n.id}
                node={n}
                isSubject={n.id === scene.subjectId}
                isFocused={n.id === scene.focusId}
                onSelect={selectNode}
              />
            ))}
          </Canvas>
        ) : (
          <MobileFallbackList scene={scene} onSelect={selectNode} />
        )}
      </div>

      <ResearchPanel
        liveData={liveData}
        scene={scene}
        lens={lens}
        setLens={setLens}
        focusedNode={focusedNode}
        onBack={goBack}
        canGoBack={focusStack.length > 0 || (scene && scene.focusId !== scene.subjectId)}
        statsRef={statsRef}
      />
    </div>
  );
}

function MobileFallbackList({ scene, onSelect }) {
  if (!scene) return null;
  return (
    <div style={{ padding: 16, overflowY: "auto", height: "100%", color: INK }}>
      <p style={{ color: INK_DIM, fontSize: 12 }}>תצוגת-רשימה (WebGL לא זמין) — אותו תוכן מחקרי, ללא תלות ברינדור.</p>
      {scene.sceneNodes.map((n) => (
        <button key={n.id} onClick={() => onSelect(n.id)} style={{
          display: "block", width: "100%", textAlign: "right", background: "#12141a", border: `1px solid ${TIER_COLOR[n.truthTier] || "#333"}`,
          borderRadius: 8, padding: 10, marginBottom: 6, color: INK, cursor: "pointer",
        }}>
          <b>{n.label}</b> <span style={{ color: INK_DIM, fontSize: 11 }}>· {TIER_LABEL_HE[n.truthTier] || ""}</span>
        </button>
      ))}
    </div>
  );
}

function ResearchPanel({ liveData, scene, lens, setLens, focusedNode, onBack, canGoBack, statsRef }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 600); return () => clearInterval(id); }, []);
  const s = statsRef.current || {};

  return (
    <div style={{
      width: 380, background: "#0c0d12", color: INK, padding: 16, overflowY: "auto",
      fontFamily: "system-ui, sans-serif", fontSize: 13, borderInlineStart: "1px solid #1c1e24",
    }}>
      <h2 style={{ fontSize: 16, marginBottom: 2 }}>עולם מחקר מרחבי — מספר {GOLDEN_NUMBER}</h2>
      <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 11.5 }}>Number/Entity Golden Scene · dev/admin only · נתונים חיים בלבד</p>

      <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.values(LENSES).map((l) => (
          <button key={l.key} onClick={() => setLens(l.key)} style={{
            background: lens === l.key ? ACCENT : "#171922", color: lens === l.key ? "#fff" : INK_DIM,
            border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 12, cursor: "pointer",
          }}>{l.label}</button>
        ))}
        {canGoBack && <button onClick={onBack} style={{ background: "#171922", color: INK, border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>← חזרה</button>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: INK_DIM, marginBottom: 4 }}>מקרא — שכבת אמת (נגזר מהשדות החיים, לא מומצא)</div>
        {Object.entries(TIER_LABEL_HE).map(([tier, label]) => (
          <div key={tier} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 2 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: TIER_COLOR[tier], display: "inline-block" }} />
            {label}
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13.5, marginBottom: 4 }}>נבחר כעת</h3>
      {focusedNode ? (
        <div style={{ background: "#12141a", borderRadius: 8, padding: 10, marginBottom: 10, border: `1px solid ${TIER_COLOR[focusedNode.truthTier] || "#333"}` }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{focusedNode.label}</div>
          {focusedNode.subtitle && <div style={{ color: INK_DIM, fontSize: 12, marginTop: 2 }}>{focusedNode.subtitle}</div>}
          <div style={{ fontSize: 11, marginTop: 6, color: TIER_COLOR[focusedNode.truthTier] }}>{TIER_LABEL_HE[focusedNode.truthTier]}</div>
          <SourcePanel node={focusedNode} />
        </div>
      ) : <p style={{ opacity: 0.6 }}>—</p>}

      <h3 style={{ fontSize: 13.5, marginBottom: 4 }}>קשרים גלויים ({lens === "overview" ? "סקירה" : lens === "methods" ? "שיטות" : "קשרים"})</h3>
      <div style={{ marginBottom: 12 }}>
        {scene?.sceneRelations?.slice(0, 8).map((r) => (
          <div key={r.id} style={{ fontSize: 11.5, color: INK_DIM, marginBottom: 4, cursor: "pointer" }}
            onClick={() => window.__goldenSceneApi?.selectNode(r.to)}>
            → {nodeById(scene.sceneNodes, r.to)?.label}: {r.explanation}
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13.5 }}>ביצועים (אמיתי, מ-renderer.info)</h3>
      <pre style={{ fontSize: 11, background: "#12141a", padding: 8, borderRadius: 6 }}>
{`drawCalls: ${s.drawCalls ?? "…"}
triangles: ${s.triangles ?? "…"}
fps:       ${s.fps ?? "…"}
nodes:     ${scene?.sceneNodes?.length ?? "…"}`}
      </pre>
    </div>
  );
}

function SourcePanel({ node }) {
  const ref = node.ref;
  if (!ref) return null;
  if (ref.type === "gematria_word") {
    return <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>מקור: {ref.source || "—"}</div>;
  }
  if (ref.type === "convergence") {
    return <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>{ref.description}</div>;
  }
  if (ref.type === "topic_card") {
    const f = ref.findings || {};
    return (
      <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>
        {f.headline && <div style={{ marginBottom: 4 }}>{f.headline}</div>}
        {(f.bullets || []).slice(0, 4).map((b, i) => <div key={i}>• {b}</div>)}
        {f.caveat && <div style={{ marginTop: 6, color: TIER_COLOR[TRUTH_TIERS.CANDIDATE], fontStyle: "italic" }}>⚠ {f.caveat}</div>}
        <div style={{ marginTop: 4 }}>סטטוס: {ref.status} · נוצר-ע"י: {ref.created_by}</div>
      </div>
    );
  }
  if (ref.type === "research_object") {
    return (
      <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>
        <div>{ref.statement}</div>
        <div style={{ marginTop: 4 }}>מקור: {ref.source_ref || "—"}</div>
      </div>
    );
  }
  if (ref.type === "method") {
    return <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>{(ref.phrases || []).join(" · ")}</div>;
  }
  return null;
}
