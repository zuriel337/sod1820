// src/components/gematria2029/MistaterScene3D2029.jsx
// S4 — GPU 3D projection of the SAME precompiled scene.v1 that the S2 DOM/SVG stage consumes (work_log ca95608e).
// ROUTE-SCOPED: this module (and three / @react-three/fiber) is reachable ONLY through the dynamic import in
// SpatialMethodStage2029.jsx after an explicit "תלת־ממד" action. It adds NO semantics:
//  - hierarchy → nested <group> local TRS transforms; letters → real box meshes with depth;
//  - connectors → tubes along resolveSceneConnectorCurve() (socket-derived, renderer-neutral control points);
//  - every displayed number is resolved through resolveSceneTraceValue(scene, identityRef) — no arithmetic here;
//  - glyph/value planes are a TRANSITIONAL deterministic canvas texture (projection-only). Canonical identity stays
//    node.identityRef (letter codepoint). M3: when node.asset_ref resolves against the Hebrew glyph manifest the letter is the
//    manifest's path-only SVG vector (same lineage as Blender); otherwise the canvas text below remains the truthful fallback.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Color, CubicBezierCurve3, DoubleSide, ExtrudeGeometry, SRGBColorSpace, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { glyphPlacement, resolveGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { resolveSceneConnectorCurve, resolveSceneTraceValue } from "../../lib/spatial/semanticSceneCompiler.js";

const FALLBACK_COLORS = Object.freeze({ ink: "#e8ecf4", hero: "#f4f1e8", accent: "#d4af37", panel: "#1b2233", line: "#4a5570" });

// Design Contract tokens → colors, resolved through a probe element so var() fallbacks/currentColor resolve to rgb().
function resolveTokenColors(host) {
  const out = { ...FALLBACK_COLORS };
  if (!host || typeof getComputedStyle !== "function") return out;
  const probe = document.createElement("i");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  host.appendChild(probe);
  try {
    const tokens = { ink: "--sms-ink", hero: "--sms-hero", accent: "--sms-accent", panel: "--sms-panel-soft", line: "--sms-line-strong" };
    for (const [key, token] of Object.entries(tokens)) {
      probe.style.color = "";
      probe.style.color = `var(${token})`;
      if (!probe.style.color) continue; // token undefined in this subtree → keep the Design Contract fallback
      const resolved = getComputedStyle(probe).color;
      if (resolved && /^rgb/.test(resolved) && resolved !== "rgba(0, 0, 0, 0)") out[key] = resolved;
    }
  } finally { host.removeChild(probe); }
  return out;
}

function useTextTexture(lines, { width = 128, height = 160, fonts = [] } = {}) {
  const key = JSON.stringify(lines);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx.fillStyle = line.color;
      ctx.font = `${line.weight || 600} ${line.size}px ${fonts[i] || "serif"}`;
      ctx.fillText(line.text, width / 2, line.y);
    });
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// Lazy raw SVG assets (path-only, canonical lineage). A missing/failed/mismatched asset resolves to null => fallback.
const GLYPH_SVG_LOADERS = import.meta.glob("../../lib/spatial/hebrewGlyph/v1/*.svg", { query: "?raw", import: "default" });

async function buildGlyphGeometry(glyph, bounds) {
  const load = GLYPH_SVG_LOADERS[`../../lib/spatial/hebrewGlyph/v1/${glyph.vector_asset_ref.split("/").pop()}`];
  if (!load) return null;
  const data = new SVGLoader().parse(await load());
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  if (!shapes.length) return null;
  const geo = new ExtrudeGeometry(shapes, { depth: bounds.depth, bevelEnabled: false, curveSegments: 8 });
  const pl = glyphPlacement(bounds, glyph); // same placement formula as the Blender importer (hebrew_glyph_lineage.py)
  geo.scale(pl.scale, -pl.scale, 1);
  geo.translate(-(pl.advance / 2) * pl.scale, pl.baseline * pl.scale + pl.baselineLocalY, -bounds.depth / 2);
  return geo;
}

function useGlyphGeometry(assetRef, bounds) {
  const glyph = useMemo(() => resolveGlyphAssetRef(assetRef), [assetRef]);
  const [geometry, setGeometry] = useState(null);
  useEffect(() => {
    let live = true, made = null;
    setGeometry(null);
    if (!glyph) return undefined;
    buildGlyphGeometry(glyph, bounds).then((g) => { made = g; if (live) setGeometry(g); else g?.dispose(); }).catch(() => { if (live) setGeometry(null); });
    return () => { live = false; made?.dispose(); };
  }, [glyph, bounds.width, bounds.height, bounds.depth]); // eslint-disable-line react-hooks/exhaustive-deps
  return geometry;
}

function LetterBody({ node, scene, colors }) {
  const { value } = resolveSceneTraceValue(scene, node.identityRef);
  const { width, height, depth } = node.bounds;
  const glyphGeometry = useGlyphGeometry(node.asset_ref, node.bounds);
  // exact codepoint comes from node identity, never from a font mesh; with an asset the plane carries the value only
  const tex = useTextTexture(glyphGeometry ? [
    { text: String(value), size: 26, y: 130, color: colors.accent, weight: 700 },
  ] : [
    { text: node.identityRef.letter, size: 78, y: 62, color: colors.hero },
    { text: String(value), size: 26, y: 130, color: colors.accent, weight: 700 },
  ]);
  return <group userData={{ glyphId: glyphGeometry ? node.asset_ref.glyph_id : null, codepoint: node.identityRef.letter }}>
    {glyphGeometry ? <mesh geometry={glyphGeometry}>
      <meshStandardMaterial color={colors.hero} roughness={0.5} metalness={0.2} side={DoubleSide} />
    </mesh> : <mesh>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={colors.panel} roughness={0.55} metalness={0.15} />
    </mesh>}
    <mesh position={[0, 0, depth / 2 + 0.4]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent side={DoubleSide} depthWrite={false} />
    </mesh>
  </group>;
}

function ResultBody({ node, scene, colors }) {
  const { value } = resolveSceneTraceValue(scene, node.identityRef);
  const tex = useTextTexture([{ text: String(value), size: 64, y: 40, color: colors.accent, weight: 700 }], { width: 256, height: 80 });
  return <mesh>
    <planeGeometry args={[96, 30]} />
    <meshBasicMaterial map={tex} transparent side={DoubleSide} depthWrite={false} />
  </mesh>;
}

function NodeTree({ scene, node, colors }) {
  const t = node.transform;
  const children = scene.nodes.filter((n) => n.parent === node.id);
  return <group
    name={node.id}
    position={[t.position.x, t.position.y, t.position.z]}
    rotation={[t.rotation.x, t.rotation.y, t.rotation.z]}
    scale={[t.scale.x, t.scale.y, t.scale.z]}
  >
    {node.kind === "letter_anchor" ? <LetterBody node={node} scene={scene} colors={colors} /> : null}
    {node.kind === "engine_result" ? <ResultBody node={node} scene={scene} colors={colors} /> : null}
    {children.map((child) => <NodeTree key={child.id} scene={scene} node={child} colors={colors} />)}
  </group>;
}

function Connector({ scene, connector, colors }) {
  const { curve, mid } = useMemo(() => {
    const { points } = resolveSceneConnectorCurve(scene, connector);
    const c = new CubicBezierCurve3(...points.map((p) => new Vector3(p.x, p.y, p.z)));
    return { curve: c, mid: c.getPoint(0.5) };
  }, [scene, connector]);
  const { difference } = resolveSceneTraceValue(scene, connector.identityRef);
  const tex = useTextTexture([{ text: String(difference), size: 44, y: 32, color: colors.accent, weight: 700 }], { width: 160, height: 64 });
  const accent = useMemo(() => new Color(colors.accent), [colors.accent]);
  return <group name={connector.id}>
    <mesh>
      <tubeGeometry args={[curve, 40, connector.style.width * 0.9, 8, false]} />
      <meshStandardMaterial color={accent} emissive={connector.style.glow ? accent : "#000000"} emissiveIntensity={connector.style.glow ? 0.35 : 0} roughness={0.4} />
    </mesh>
    <sprite position={[mid.x, mid.y + 12, mid.z]} scale={[40, 16, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  </group>;
}

function Controls({ target, reducedMotion }) {
  const { camera, gl, invalidate } = useThree();
  const controlRef = useRef(null);
  useFrame(() => { if (controlRef.current?.enableDamping) controlRef.current.update(); });
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlRef.current = controls;
    controls.target.set(target.x, target.y, target.z);
    controls.enableDamping = !reducedMotion; // reduced-motion: no inertia/auto-motion, interaction remains
    controls.autoRotate = false;
    controls.minDistance = 60;
    controls.maxDistance = 2400;
    controls.update();
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    return () => { controlRef.current = null; controls.removeEventListener("change", onChange); controls.dispose(); };
  }, [camera, gl, invalidate, target.x, target.y, target.z, reducedMotion]);
  return null;
}

export default function MistaterScene3D2029({ scene, reducedMotion = false, onFallback }) {
  const hostRef = useRef(null);
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  // tokens (--sms-*) are scoped to the stage subtree, so resolve against the host element once it is mounted
  useLayoutEffect(() => {
    const refresh = () => {
      setColors(resolveTokenColors(hostRef.current));
      setMotionReduced(reducedMotion || prefersReducedMotion());
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true });
    const frame = hostRef.current?.closest(".sod29-root");
    if (frame) observer.observe(frame, { attributes: true });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", refresh);
    return () => { observer.disconnect(); media.removeEventListener("change", refresh); };
  }, [reducedMotion]);
  const { extent } = scene;
  const center = useMemo(() => ({ x: (extent.minX + extent.maxX) / 2, y: (extent.minY + extent.maxY) / 2, z: 0 }), [extent]);
  const span = Math.max(extent.maxX - extent.minX, (extent.maxY - extent.minY) * 1.6);
  const distance = span * 0.9 + 140;
  const root = scene.nodes.find((n) => n.id === scene.subjectId);
  const letters = scene.nodes.filter((n) => n.kind === "letter_anchor");

  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr"
    data-renderer="r3f" data-reduced-motion={String(motionReduced)} data-scene-id={scene.scene_id} data-projection-signature={scene.projection_signature}
    data-node-count={scene.nodes.length} data-connector-count={scene.connectors.length}>
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 1, far: 8000, position: [center.x, center.y + span * 0.12, center.z + distance] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onFallback?.("context_lost"); });
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[center.x + 120, center.y + 220, 260]} intensity={1.6} />
      <NodeTree scene={scene} node={root} colors={colors} />
      {scene.connectors.map((connector) => <Connector key={connector.id} scene={scene} connector={connector} colors={colors} />)}
      <Controls target={center} reducedMotion={motionReduced} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="קשרי ההפרש בין אותיות סמוכות">
      {letters.map((node) => <li key={node.id}>{node.identityRef.letter} {resolveSceneTraceValue(scene, node.identityRef).value}</li>)}
      {scene.connectors.map((connector) => <li key={connector.id}>הפרש {resolveSceneTraceValue(scene, connector.identityRef).difference}</li>)}
    </ul>
  </div>;
}
