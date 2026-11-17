// src/components/gematria2029/CubeScene3D2029.jsx
// S4 — shape family 3 of the lab: the cube (קובייה) with a word repeated on its faces (1020: «טוב» ten times on each of six faces). The SAME engine as
// StructureScene3D2029 / IcosaScene3D2029: same lazy 3D chunk graph, same Royal materials/environment/lights, same explode + camera drivers, same Hebrew
// glyph meshes with the readable text fallback, same quality tiers and looks. It adds NO semantics (Spatial v3 appendix §14.5: 3D is a derived display state):
//  - the cube has the six faces of a cube by definition (lib/spatial/cubeLayout3D.js); the spec arrives only when the model declares a cube AND one of its own
//    operations is carried by it (spatialRenderModel.cubeStructureSpec + drawableSpec);
//  - the word, its value, the repetitions per face, the quantities and the result arrive as props from the already-evaluated path (nothing is computed here);
//  - the 180 letters of 1020 are drawn as ONE instanced mesh per distinct letter per face (18 draw calls), never one mesh per letter;
//  - selecting a face is display state only: it never changes the path, the value or the verification status;
//  - INSIDE (the inner exploration, `inside`): the same scene seen from within — the camera stands in the hollow, the wall behind it is left open (the doorway), the inner
//    side of every face carries the same word turned to be read from inside, and an inner lantern lights it. It adds no part, count or meaning; the person's face
//    choice is controlled by the page (`selectedFace` / `onFaceChange`) so it can be restored exactly.
// ROUTE-SCOPED: reachable only through the lazy import in SpatialConvergenceStage2029.jsx after the explicit "תלת־ממד" action.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Color, ExtrudeGeometry, Matrix4, Quaternion, Shape, Vector3 } from "three";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { glyphWordMode } from "../../lib/spatial/structureLayout3D.js";
import { CUBE_3D, CUBE_INSIDE, cubeConnectorPoints, cubeFocusPose, cubeInsidePose, cubeOverviewPose, cubeSolid, cubeWordLayout, facePlacement, oppositeFaceIndex, plinthPlacement } from "../../lib/spatial/cubeLayout3D.js";
import { ROYAL_LAB_DIRECTIONS } from "../../lib/spatial/royalLabDirections.js";
import { pathEquationText, pathTagText } from "../../lib/spatial/pathSemantics.js";
import { Controls, FALLBACK_COLORS, RoyalEnvironment, noRaycast, resolveTokenColors, useBadgeTexture, useRoyalMaterials } from "./MistaterScene3D2029.jsx";
import { Apex, PathConnector } from "./ConvergenceScene3D2029.jsx";
import { ExplodeDriver, GLYPH_DEPTH, GpuStats, LabRig, PartTag, RoyalLights, glyphKey, useGlyphMap, useInView, useInstances, useRounded, useWordTexture } from "./StructureScene3D2029.jsx";

const FACE_DEPTH = CUBE_3D.faceDepth;
const PLATE_SHARE = 0.992; // a hair under the cube's edge, so two plates never share a coplanar surface at a seam
const FRAME_SHARE = 0.05;  // the gold border's width, as a share of the face side
const GLYPH_Z = FACE_DEPTH / 2 - GLYPH_DEPTH / 2 + 0.2; // the letters rise out of the plate, as in the other families
const off = (path) => !path || path.status !== "verified";

// The gold border of a face: ONE square ring geometry shared by the six faces.
function useFrameGeometry(side) {
  const geometry = useMemo(() => {
    const half = side / 2, inner = half - side * FRAME_SHARE, shape = new Shape();
    shape.moveTo(-half, -half); shape.lineTo(half, -half); shape.lineTo(half, half); shape.lineTo(-half, half); shape.closePath();
    const hole = new Shape();
    hole.moveTo(-inner, -inner); hole.lineTo(-inner, inner); hole.lineTo(inner, inner); hole.lineTo(inner, -inner); hole.closePath();
    shape.holes.push(hole);
    const g = new ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -1.3);
    return g;
  }, [side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function faceQuaternion(face) {
  const { x, y, z } = face.frame;
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...x), new Vector3(...y), new Vector3(...z)));
}

// One instanced mesh = every copy of ONE letter on this face (all the repetitions of the word): `offsets` are that letter's x inside a word, `cells` the words.
function LetterInstances({ geometry, offsets, cells, material, cast }) {
  const count = offsets.length * cells.length;
  const ref = useInstances(count, (dummy, i) => { const cell = cells[Math.floor(i / offsets.length)]; dummy.position.set(cell.x + offsets[i % offsets.length], cell.y, GLYPH_Z + GLYPH_DEPTH / 2); }, [offsets, cells]);
  // the glyph geometry is shared and owned elsewhere (dispose={null}); this mesh's own instance buffer is released when it goes away (the inside view mounts and unmounts it)
  useEffect(() => () => { ref.current?.dispose?.(); }, [ref]);
  return <instancedMesh ref={ref} args={[geometry, undefined, count]} material={material} castShadow={cast} dispose={null} raycast={noRaycast} />;
}

// The readable fallback when a 3D letter cannot load: the same word as one shared text texture, one instanced plane per face — never an invisible face.
function TextCells({ layout, texture, dim }) {
  const { cells, box, letters } = layout;
  const height = Math.min(box.height, box.width / Math.max(2, letters.length * 0.62));
  const ref = useInstances(cells.length, (dummy, i) => dummy.position.set(cells[i].x, cells[i].y, 0), [cells]);
  return <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} position={[0, 0, FACE_DEPTH / 2 + 0.7]} raycast={noRaycast}>
    <planeGeometry args={[box.width, height]} />
    <meshBasicMaterial map={texture} transparent opacity={dim ? 0.55 : 1} depthWrite={false} />
  </instancedMesh>;
}

function FaceWords({ layout, glyphs, material, texture, dim, cast }) {
  const keys = useMemo(() => layout.letters.map((l) => glyphKey(l.char, layout.letterSize)), [layout]);
  const mode = glyphWordMode(keys, glyphs.map, glyphs.status);
  const byLetter = useMemo(() => {
    const groups = new Map();
    layout.letters.forEach((l, i) => { if (!groups.has(keys[i])) groups.set(keys[i], []); groups.get(keys[i]).push(l.x); });
    return [...groups];
  }, [layout, keys]);
  if (mode === "pending") return null;
  if (mode === "text") return <TextCells layout={layout} texture={texture} dim={dim} />;
  return <>{byLetter.map(([key, offsets]) => <LetterInstances key={key} geometry={glyphs.map.get(key)} offsets={offsets} cells={layout.cells} material={material} cast={cast} />)}</>;
}

// The camera of the inside view needs a wide lens; the outside keeps the lab's lens. Display only.
function InsideLens({ inside }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.fov = inside ? CUBE_INSIDE.fovDeg : CUBE_3D.fovDeg;
    camera.updateProjectionMatrix();
    invalidate();
  }, [inside, camera, invalidate]);
  return null;
}

function FaceMesh({ face, plate, frame, layout, glyphs, texture, mats, stateKey, dim, rig, explode, register, pick, hover, visible = true, inside = false }) {
  const quaternion = useMemo(() => faceQuaternion(face), [face]);
  const p = facePlacement(face, explode);
  // the open wall (the doorway) is neither drawn nor pickable: a hidden group gets no handlers
  const handlers = visible ? { onClick: pick, ...hover } : {};
  const trim = mats.trim[stateKey];
  return <group ref={register(`face:${face.index}`)} position={[p.x, p.y, p.z]} quaternion={quaternion} name={`face:${face.index}`} visible={visible} {...handlers}>
    <mesh geometry={plate} material={mats.body[stateKey]} castShadow={rig.shadows && !inside} receiveShadow={rig.shadows && !inside} />
    {rig.bezel ? <mesh geometry={frame} position={[0, 0, FACE_DEPTH / 2]} material={mats.trim[stateKey === "off" ? "off" : "base"]} castShadow={rig.shadows} raycast={noRaycast} /> : null}
    {rig.bezel && inside ? <mesh geometry={frame} position={[0, 0, -FACE_DEPTH / 2]} material={mats.trim[stateKey === "off" ? "off" : "base"]} raycast={noRaycast} /> : null}
    <FaceWords layout={layout} glyphs={glyphs} material={trim} texture={texture} dim={dim} cast={rig.shadows && !inside} />
    {inside ? <group rotation={[0, Math.PI, 0]}><FaceWords layout={layout} glyphs={glyphs} material={trim} texture={texture} dim={dim} cast={false} /></group> : null}
  </group>;
}

export default function CubeScene3D2029({
  spec, paths, value, verifiedCount, total, focusIndex = 0, onSelect, view = "overview", explode = false, spin = false,
  resetToken = 0, reducedMotion = false, onFallback, look = ROYAL_LAB_DIRECTIONS.v1.look, quality = "rich", glyphs3D = true,
  inside = false, selectedFace = undefined, onFaceChange = null,
}) {
  const hostRef = useRef(null);
  const controlsRef = useRef(null);
  const closing = useRef(false);
  useEffect(() => { closing.current = false; return () => { closing.current = true; }; }, []);
  const groups = useRef(new Map());
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  // the face is the page's when it passes one (the inner exploration restores it exactly); otherwise the scene keeps its own
  const [faceOwn, setFaceOwn] = useState(null);
  const controlled = selectedFace !== undefined;
  const face = controlled ? selectedFace : faceOwn;
  const setFace = (index) => { if (!controlled) setFaceOwn(index); onFaceChange?.(index); };
  const [hover, setHover] = useState(null);
  const [crossing, setCrossing] = useState(false);
  const active = useInView(hostRef);
  useLayoutEffect(() => {
    const refresh = () => { setColors(resolveTokenColors(hostRef.current)); setMotionReduced(reducedMotion || prefersReducedMotion()); };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true });
    const frameNode = hostRef.current?.closest(".sod29-root");
    if (frameNode) observer.observe(frameNode, { attributes: true });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", refresh);
    return () => { observer.disconnect(); media.removeEventListener("change", refresh); document.body.style.cursor = ""; };
  }, [reducedMotion]);

  const royal = look.style === "royal";
  const rig = useMemo(() => ({ royal, bezel: Boolean(look.bezel), shadows: Boolean(look.shadows) && quality === "rich" }), [royal, look.bezel, look.shadows, quality]);
  const mats = useRoyalMaterials(colors, royal ? "royal" : "v1", quality);
  const solid = useMemo(() => cubeSolid(), []);
  const plate = useRounded(solid.size * PLATE_SHARE, solid.size * PLATE_SHARE, FACE_DEPTH, royal ? 3 : 4);
  const frame = useFrameGeometry(solid.size * PLATE_SHARE);
  const layout = useMemo(() => cubeWordLayout(spec), [spec]);
  const requests = useMemo(() => layout.letters.map((l) => ({ char: l.char, size: layout.letterSize })), [layout]);
  const glyphs = useGlyphMap(requests, glyphs3D);
  const texture = useWordTexture(spec.word, colors.gold);
  const path = paths.find((p) => p.part === "cube") || null;
  const pathIndex = path ? paths.indexOf(path) : 0;
  const dim = off(path);
  const explodeValue = explode && !inside ? 1 : 0;
  const insideTarget = face ?? CUBE_INSIDE.defaultFace;
  // while the camera crosses the wall (entering / leaving) the near wall is the open doorway; once inside, the open wall is the one opposite the face being read
  const firstInside = useRef(true);
  useEffect(() => {
    if (firstInside.current) { firstInside.current = false; return undefined; }
    if (motionReduced) { setCrossing(false); return undefined; }
    setCrossing(true);
    const timer = setTimeout(() => setCrossing(false), 950);
    return () => clearTimeout(timer);
  }, [inside, motionReduced]);
  const keyLight = useMemo(() => new Color(colors.hero).lerp(new Color(colors.gold), royal && look.rig !== "lab" ? 0.4 : 0), [colors.hero, colors.gold, royal, look.rig]);
  const pose = useMemo(() => ({ elevation: look.elevation, padding: look.padding }), [look.elevation, look.padding]);
  const poses = useMemo(() => ({ overview: cubeOverviewPose, focus: (_part, aspect, k) => cubeFocusPose(solid, face ?? 0, aspect, k),
    inside: (_part, aspect) => cubeInsidePose(solid, insideTarget, aspect) }), [solid, face, insideTarget]);
  const openWall = inside || crossing ? (crossing ? CUBE_INSIDE.entryFace : oppositeFaceIndex(solid, insideTarget)) : null;
  const register = (name) => (node) => { if (node) groups.current.set(name, node); else groups.current.delete(name); };
  const placer = (name, group, k) => {
    if (name === "plinth") { const p = plinthPlacement(k); group.position.set(p.x, p.y, p.z); return; }
    const f = solid.faces[Number(name.split(":")[1])];
    if (!f) return;
    const p = facePlacement(f, k);
    group.position.set(p.x, p.y, p.z);
  };
  const keyFor = (i) => { const sel = face === i; return dim ? (sel ? "offOn" : "off") : sel ? "on" : royal && hover === i ? "hover" : "base"; };
  const tagState = { dim, on: face !== null };
  const badge = useBadgeTexture(face === null ? `${spec.faces} פאות` : `פאה ${face + 1} מתוך ${spec.faces}`, { color: dim ? colors.line : colors.hero, border: dim ? colors.line : colors.gold,
    fill: new Color(colors.sapphire).multiplyScalar(face === null ? 0.16 : 0.34).getStyle(), width: 384, height: 96, size: 44 });
  const connector = useMemo(() => ({ id: "route:cube", points: cubeConnectorPoints() }), []);
  const fallbackPath = path || { status: "no_phrase" };
  const repeated = spec.repetitions > 1;
  const half = solid.size / 2;

  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr" role="img" data-renderer="r3f" data-scene="structure" data-family="cube"
    aria-label={`${inside ? "בתוך הקובייה — " : ""}קובייה תלת־ממדית: ${spec.faces} פאות, על כל פאה «${spec.word}»${repeated ? ` ${spec.repetitions} פעמים` : ""}`}
    data-reduced-motion={String(motionReduced)} data-view={view} data-explode={String(explode)} data-spin={String(spin)} data-selected-part="cube" data-selected-face={face === null ? "" : String(face)}
    data-inside={String(inside)} data-inside-face={inside ? String(insideTarget) : ""} data-open-wall={openWall === null ? "" : String(openWall)}
    data-parts="cube" data-face-count={spec.faces} data-repetitions={spec.repetitions} data-word-count={layout.cells.length * spec.faces} data-letter-count={layout.cells.length * layout.letters.length * spec.faces}
    data-verified-paths={verifiedCount} data-total-paths={total}
    data-look={look.style} data-rig={look.rig} data-quality={quality} data-shadows={String(rig.shadows)} data-glyph-status={glyphs.status} data-hover-part={hover === null ? "" : "cube"}>
    <Canvas
      frameloop="demand"
      dpr={quality === "rich" ? [1, 2] : [1, 1.5]}
      shadows={rig.shadows ? "percentage" : false}
      camera={{ fov: CUBE_3D.fovDeg, near: 1, far: 9000, position: [0, 200, 1000] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!closing.current) onFallback?.("context_lost"); }); }}
    >
      <RoyalEnvironment tint={royal && look.rig !== "lab" ? colors.gold : null} intensity={royal ? 0.7 : 0.85} />
      <GpuStats hostRef={hostRef} />
      <RoyalLights royal={royal} look={look} quality={quality} colors={colors} keyLight={keyLight} shadows={rig.shadows && !inside} />
      <InsideLens inside={inside} />
      {inside ? <>
        <pointLight position={[0, 0, 0]} intensity={CUBE_INSIDE.lantern} distance={CUBE_INSIDE.lanternDistance} color={colors.gold} />
        <pointLight position={[0, -40, 0]} intensity={CUBE_INSIDE.lantern * 0.35} distance={CUBE_INSIDE.lanternDistance} color={colors.sapphire} />
      </> : null}
      {solid.faces.map((f) => <FaceMesh key={f.index} face={f} plate={plate} frame={frame} layout={layout} glyphs={glyphs} texture={texture} mats={mats} stateKey={keyFor(f.index)} dim={dim} rig={rig}
        explode={explodeValue} register={register} visible={f.index !== openWall} inside={inside}
        pick={(event) => { event.stopPropagation(); setFace(f.index); onSelect?.(pathIndex); }}
        hover={{ onPointerOver: (event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; if (royal) setHover(f.index); }, onPointerOut: () => { document.body.style.cursor = ""; if (royal) setHover((now) => (now === f.index ? null : now)); } }} />)}
      {inside ? null : <>
        <group ref={register("plinth")} position={[0, CUBE_3D.plinthY, 0]}>
          <mesh material={mats.plinth} receiveShadow={rig.shadows} raycast={noRaycast}><cylinderGeometry args={[CUBE_3D.plinthRadius * 0.96, CUBE_3D.plinthRadius, 9, 56]} /></mesh>
          <mesh position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim.base} raycast={noRaycast}><torusGeometry args={[CUBE_3D.plinthRadius * 0.96, 1.4, 8, 72]} /></mesh>
          <sprite position={[0, 22, CUBE_3D.plinthRadius * 0.86]} scale={[100, 25, 1]}><spriteMaterial map={badge} transparent depthWrite={false} /></sprite>
        </group>
        <PartTag position={[half * 1.45, half + 90, half * 0.2]} text={path ? pathTagText(path) : String(spec.faces)} colors={colors} state={tagState} />
        <PathConnector connector={connector} path={fallbackPath} colors={colors} focused />
        <Apex apex={CUBE_3D.apex} value={value} verifiedCount={verifiedCount} total={total} colors={colors} labelSide="above" />
      </>}
      <ExplodeDriver target={explodeValue} reduced={motionReduced} groups={groups} onPhase={() => {}} placer={placer} />
      <Controls target={{ x: 0, y: 0, z: 0 }} reducedMotion={motionReduced} controlsRef={controlsRef} />
      <LabRig view={inside ? "inside" : view} part={`cube:${inside ? insideTarget : face ?? 0}`} explode={explodeValue} resetToken={resetToken} spin={spin && !inside} active={active} reduced={motionReduced} controlsRef={controlsRef} pose={pose} poses={poses} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="המסלול ופאות הקובייה">
      {paths.map((p) => <li key={p.id}>{pathEquationText(p, { showValues: true })} · {p.partLabel} — {p.label}</li>)}
      <li>{spec.faces} פאות, על כל פאה «{spec.word}»{repeated ? ` ${spec.repetitions} פעמים` : ""}{face === null ? "" : `; נבחרה פאה ${face + 1}`}</li>
    </ul>
  </div>;
}
