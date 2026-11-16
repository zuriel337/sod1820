// src/components/gematria2029/ConvergenceScene3D2029.jsx
// S4 — GPU 3D projection of the SAME already-evaluated convergence paths that the S2 stage (SpatialConvergenceStage2029) draws.
// ROUTE-SCOPED: reachable ONLY through the dynamic import in SpatialConvergenceStage2029.jsx after an explicit "תלת־ממד" action
// (three / @react-three/fiber never enter the default bundle). It adds NO semantics (Spatial v3 appendix §14.5: 3D is a derived display state):
//  - every displayed value (phrase, operand, quantity, result, status) arrives from evaluateConvergencePaths; nothing is computed here;
//  - placement comes from the pure lib/spatial/convergenceLayout3D.js; letters are the same path-only Hebrew glyph SVG assets as M3;
//  - an unverified path stays visible but dimmed and is not part of the verified count (the status label is carried in the sr-only list).
// Shared 3D helpers (token colors, text texture, glyph geometry, controls) come from MistaterScene3D2029 — one S4 toolkit, not a second one.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdditiveBlending, BackSide, Color, CubicBezierCurve3, DoubleSide, MeshPhysicalMaterial, Vector3 } from "three";
import { buildGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { CONVERGENCE_3D, fitCameraDistance, layoutConvergence3D, layoutPhraseLetters } from "../../lib/spatial/convergenceLayout3D.js";
import { Controls, FALLBACK_COLORS, RoyalEnvironment, noRaycast, resolveTokenColors, useBadgeTexture, useGlyphGeometry, useHaloTexture, useTextTexture } from "./MistaterScene3D2029.jsx";

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

// Routes are gold wire (a brighter, thicker line for the selected route); an unverified route stays a faint line and is not part of the count.
export function PathConnector({ connector, path, colors, focused }) {
  const curve = useMemo(() => new CubicBezierCurve3(...connector.points.map((p) => new Vector3(p.x, p.y, p.z))), [connector]);
  const off = dimmed(path);
  const tint = useMemo(() => new Color(off ? colors.line : colors.gold), [colors.gold, colors.line, off]);
  const material = useMemo(() => new MeshPhysicalMaterial({ color: tint, emissive: off ? new Color(colors.line).multiplyScalar(0) : tint, emissiveIntensity: off ? 0 : focused ? 0.75 : 0.28,
    metalness: 0.9, roughness: 0.3, clearcoat: 0.6, transparent: off, opacity: off ? 0.45 : 1 }), [tint, off, focused, colors.line]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh name={connector.id} material={material} raycast={noRaycast}>
    <tubeGeometry args={[curve, 40, off ? 1 : focused ? 2.8 : 1.5, 10, false]} />
  </mesh>;
}

// The ONE apex: a faceted sapphire gem in a gold ring with a soft halo. It carries the converged value and the verified count; nothing else.
export function Apex({ apex, value, verifiedCount, total, colors, labelSide = "below" }) {
  const above = labelSide === "above";
  const head = useTextTexture([{ text: String(value), size: 70, y: 42, color: colors.gold, weight: 700 }], { width: 256, height: 84 });
  const sub = useBadgeTexture(`${verifiedCount}/${total}`, { color: colors.ink, border: colors.gold, fill: new Color(colors.sapphire).multiplyScalar(0.14).getStyle(), width: 192, height: 72, size: 40 });
  const halo = useHaloTexture(colors.sapphire);
  const gem = useMemo(() => new MeshPhysicalMaterial({ color: new Color(colors.sapphire), emissive: new Color(colors.sapphire), emissiveIntensity: 0.55, metalness: 0.15, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, flatShading: true, envMapIntensity: 1.6 }), [colors.sapphire]);
  const ring = useMemo(() => new MeshPhysicalMaterial({ color: new Color(colors.gold), metalness: 1, roughness: 0.25, envMapIntensity: 1.5 }), [colors.gold]);
  useEffect(() => () => { gem.dispose(); ring.dispose(); }, [gem, ring]);
  return <group position={[apex.x, apex.y, apex.z]} name="apex">
    <sprite scale={[apex.radius * 7, apex.radius * 7, 1]} renderOrder={-1}><spriteMaterial map={halo} transparent depthWrite={false} blending={AdditiveBlending} /></sprite>
    <mesh material={gem} scale={[1, 1.4, 1]}><octahedronGeometry args={[apex.radius * 1.05, 0]} /></mesh>
    <mesh material={ring} rotation={[Math.PI / 2.3, 0, 0]}><torusGeometry args={[apex.radius * 1.75, 1.1, 10, 72]} /></mesh>
    <mesh position={[0, above ? apex.radius * 1.5 + 50 : -apex.radius - 26, 0]}><planeGeometry args={[104, 34]} /><meshBasicMaterial map={head} transparent side={DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, above ? apex.radius * 1.5 + 18 : -apex.radius - 58, 0]}><planeGeometry args={[58, 21.5]} /><meshBasicMaterial map={sub} transparent side={DoubleSide} depthWrite={false} /></mesh>
  </group>;
}

export default function ConvergenceScene3D2029({ value, paths, verifiedCount, total, focusIndex = 0, onSelect, reducedMotion = false, onFallback }) {
  const hostRef = useRef(null);
  // R3F releases the GPU context when this scene unmounts; that deliberate release must not look like a lost context (false fallback note).
  const closing = useRef(false);
  useEffect(() => { closing.current = false; return () => { closing.current = true; }; }, []);
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
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!closing.current) onFallback?.("context_lost"); }); }}
    >
      <RoyalEnvironment />
      <ambientLight intensity={0.5} />
      <directionalLight position={[120, 260, 320]} intensity={1.8} />
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
