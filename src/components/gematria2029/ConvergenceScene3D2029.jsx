// src/components/gematria2029/ConvergenceScene3D2029.jsx
// S4 — GPU 3D projection of the SAME already-evaluated convergence paths that the S2 stage (SpatialConvergenceStage2029) draws.
// ROUTE-SCOPED: reachable ONLY through the dynamic import in SpatialConvergenceStage2029.jsx after an explicit "תלת־ממד" action
// (three / @react-three/fiber never enter the default bundle). It adds NO semantics (Spatial v3 appendix §14.5: 3D is a derived display state):
//  - every displayed value (phrase, operand, quantity, result, status) arrives from evaluateConvergencePaths; nothing is computed here;
//  - placement comes from the pure lib/spatial/convergenceLayout3D.js; letters are the same path-only Hebrew glyph SVG assets as M3;
//  - an unverified path stays visible but dimmed and is not part of the verified count (the status label is carried in the sr-only list).
// Shared 3D helpers (token colors, text texture, glyph geometry, controls) come from MistaterScene3D2029 — one S4 toolkit, not a second one.
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { BackSide, Color, CubicBezierCurve3, DoubleSide, Vector3 } from "three";
import { buildGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { CONVERGENCE_3D, fitCameraDistance, layoutConvergence3D, layoutPhraseLetters } from "../../lib/spatial/convergenceLayout3D.js";
import { Controls, FALLBACK_COLORS, resolveTokenColors, useGlyphGeometry, useTextTexture } from "./MistaterScene3D2029.jsx";

const dimmed = (path) => path.status !== "verified";

// Re-fits the camera distance whenever the canvas box changes (aspect-aware); the elevated look from the layout is kept.
function FitCamera({ extent, target }) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const distance = fitCameraDistance(extent, camera.fov, size.width / Math.max(1, size.height));
    camera.position.set(target.x, target.y + 80, target.z + distance);
    camera.lookAt(target.x, target.y, target.z);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, extent, target, invalidate]);
  return null;
}

function PathLetter({ char, x, size, color, opacity }) {
  const ref = useMemo(() => buildGlyphAssetRef(char), [char]);
  const geometry = useGlyphGeometry(ref, { ...size, depth: CONVERGENCE_3D.glyph.depth });
  if (!geometry) return null;
  return <mesh geometry={geometry} position={[x, 6, CONVERGENCE_3D.slab.depth / 2 + CONVERGENCE_3D.glyph.depth / 2]}>
    <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} side={DoubleSide} transparent={opacity < 1} opacity={opacity} />
  </mesh>;
}

function PathNode({ node, path, colors, focused, onSelect }) {
  const { slab } = node;
  const off = dimmed(path);
  const opacity = off ? 0.5 : 1;
  const { letters, size } = useMemo(() => layoutPhraseLetters(path.phrase), [path.phrase]);
  const label = useTextTexture([{ text: `${path.operand} × ${path.quantity}`, size: 40, y: 32, color: off ? colors.line : colors.accent, weight: 700 }], { width: 256, height: 64 });
  const missing = useTextTexture([{ text: "—", size: 56, y: 32, color: colors.line, weight: 700 }], { width: 128, height: 64 });
  return <group position={[node.position.x, node.position.y, node.position.z]} name={path.id} data-status={path.status}
    onClick={(event) => { event.stopPropagation(); onSelect?.(node.index); }}>
    {focused ? <mesh position={[0, 0, -2]}>
      <boxGeometry args={[slab.width + 10, slab.height + 10, slab.depth]} />
      <meshBasicMaterial color={colors.accent} side={BackSide} />
    </mesh> : null}
    <mesh>
      <boxGeometry args={[slab.width, slab.height, slab.depth]} />
      <meshStandardMaterial color={colors.panel} roughness={0.55} metalness={0.15} transparent={off} opacity={opacity} />
    </mesh>
    {letters.length
      ? letters.map((letter, i) => <PathLetter key={`${path.id}:${i}`} char={letter.char} x={letter.x} size={size} color={off ? colors.line : colors.hero} opacity={opacity} />)
      : <mesh position={[0, 6, slab.depth / 2 + 0.4]}><planeGeometry args={[60, 30]} /><meshBasicMaterial map={missing} transparent side={DoubleSide} depthWrite={false} /></mesh>}
    <mesh position={[0, -slab.height / 2 - 20, 0]}>
      <planeGeometry args={[112, 28]} />
      <meshBasicMaterial map={label} transparent side={DoubleSide} depthWrite={false} />
    </mesh>
  </group>;
}

function PathConnector({ connector, path, colors, focused }) {
  const curve = useMemo(() => new CubicBezierCurve3(...connector.points.map((p) => new Vector3(p.x, p.y, p.z))), [connector]);
  const off = dimmed(path);
  const accent = useMemo(() => new Color(off ? colors.line : colors.accent), [colors.accent, colors.line, off]);
  return <mesh name={connector.id}>
    <tubeGeometry args={[curve, 40, off ? 1.2 : focused ? 3.4 : 2, 8, false]} />
    <meshStandardMaterial color={accent} emissive={off ? "#000000" : accent} emissiveIntensity={off ? 0 : focused ? 0.6 : 0.3} roughness={0.4} transparent={off} opacity={off ? 0.45 : 1} />
  </mesh>;
}

function Apex({ apex, value, verifiedCount, total, colors }) {
  const head = useTextTexture([{ text: String(value), size: 64, y: 40, color: colors.accent, weight: 700 }], { width: 256, height: 80 });
  const sub = useTextTexture([{ text: `${verifiedCount}/${total}`, size: 40, y: 28, color: colors.ink, weight: 600 }], { width: 192, height: 56 });
  const accent = useMemo(() => new Color(colors.accent), [colors.accent]);
  return <group position={[apex.x, apex.y, apex.z]} name="apex">
    <mesh>
      <sphereGeometry args={[apex.radius, 24, 16]} />
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.35} metalness={0.2} />
    </mesh>
    <mesh position={[0, -apex.radius - 24, 0]}><planeGeometry args={[96, 30]} /><meshBasicMaterial map={head} transparent side={DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, -apex.radius - 52, 0]}><planeGeometry args={[60, 18]} /><meshBasicMaterial map={sub} transparent side={DoubleSide} depthWrite={false} /></mesh>
  </group>;
}

export default function ConvergenceScene3D2029({ value, paths, verifiedCount, total, focusIndex = 0, onSelect, reducedMotion = false, onFallback }) {
  const hostRef = useRef(null);
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  // --sms-* tokens are scoped to the stage subtree: resolve against the mounted host (same approach as the Mistater S4 scene)
  useLayoutEffect(() => {
    const refresh = () => { setColors(resolveTokenColors(hostRef.current)); setMotionReduced(reducedMotion || prefersReducedMotion()); };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true });
    const frame = hostRef.current?.closest(".sod29-root");
    if (frame) observer.observe(frame, { attributes: true });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", refresh);
    return () => { observer.disconnect(); media.removeEventListener("change", refresh); };
  }, [reducedMotion]);
  const layout = useMemo(() => layoutConvergence3D(paths), [paths]);
  const { camera } = layout;
  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr" data-renderer="r3f" data-scene="convergence"
    data-reduced-motion={String(motionReduced)} data-node-count={layout.nodes.length} data-verified-paths={verifiedCount} data-total-paths={total}>
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 1, far: 8000, position: [camera.position.x, camera.position.y, camera.position.z] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onFallback?.("context_lost"); }); }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[120, 260, 320]} intensity={1.6} />
      {layout.nodes.map((node) => <PathNode key={node.id} node={node} path={paths[node.index]} colors={colors} focused={node.index === focusIndex} onSelect={onSelect} />)}
      {layout.connectors.map((connector, i) => <PathConnector key={connector.id} connector={connector} path={paths[i]} colors={colors} focused={i === focusIndex} />)}
      <Apex apex={layout.apex} value={value} verifiedCount={verifiedCount} total={total} colors={colors} />
      <FitCamera extent={layout.extent} target={camera.target} />
      <Controls target={camera.target} reducedMotion={motionReduced} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="מסלולי ההתכנסות">
      {paths.map((path) => <li key={path.id}>{path.phrase || "ללא ביטוי"} {path.operand} × {path.quantity} = {path.result} — {path.label}</li>)}
    </ul>
  </div>;
}
