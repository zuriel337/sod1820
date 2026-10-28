import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SEFER_YETZIRAH_COMMENTATORS, SEFER_YETZIRAH_DEPTHS, SEFER_YETZIRAH_LETTER_GROUPS } from "../../data/seferYetzirahWorld2029.js";

const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");
const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const DEPTH_POSITIONS = [
  [0, 3.15, 0], [0, -3.15, 0], [-2.8, 1.1, 0], [2.8, -1.1, 0],
  [0, 0, 3.25], [0, 0, -3.25], [3.25, 0, 0], [-3.25, 0, 0],
  [-1.8, -1.25, 1.9], [1.8, 1.25, -1.9],
];
const COMMENTARY_POSITIONS = SEFER_YETZIRAH_COMMENTATORS.map((_, index) => {
  const angle = (index / SEFER_YETZIRAH_COMMENTATORS.length) * Math.PI * 2;
  const radius = index % 2 === 0 ? 3.25 : 2.65;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 2) * 1.1];
});

function Edges({ points, color = "#c89d46", opacity = .28, complete = false }) {
  const positions = useMemo(() => {
    const values = [];
    if (!complete) {
      for (let i = 0; i < points.length; i += 1) values.push(...points[i], ...points[(i + 1) % points.length]);
      return new Float32Array(values);
    }
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) values.push(...points[i], ...points[j]);
    }
    return new Float32Array(values);
  }, [complete, points]);
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
  </lineSegments>;
}

function SefirotModel({ activeId, onSelect }) {
  return <group>
    {[0, 2, 4, 6, 8].map(index => <Edges key={index} points={[DEPTH_POSITIONS[index], DEPTH_POSITIONS[index + 1]]} />)}
    {SEFER_YETZIRAH_DEPTHS.map((node, index) => <mesh
      key={node.id}
      position={DEPTH_POSITIONS[index]}
      scale={activeId === node.id ? 1.38 : 1}
      onClick={event => { event.stopPropagation(); onSelect?.(node.id); }}
    >
      <sphereGeometry args={[.34, 28, 28]} />
      <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={activeId === node.id ? .7 : .18} roughness={.32} metalness={.2} />
    </mesh>)}
  </group>;
}

function letterPosition(index, radius = 3.35) {
  const angle = (index / LETTERS.length) * Math.PI * 2;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 3) * .7];
}

function letterGroup(index) {
  if ("אמש".includes(LETTERS[index])) return SEFER_YETZIRAH_LETTER_GROUPS[0];
  if ("בגדכפרת".includes(LETTERS[index])) return SEFER_YETZIRAH_LETTER_GROUPS[1];
  return SEFER_YETZIRAH_LETTER_GROUPS[2];
}

function LettersModel({ gates = false, activeId, activePair=[], onSelect }) {
  const points = useMemo(() => LETTERS.map((_, index) => letterPosition(index)), []);
  return <group>
    <Edges points={points} complete={gates} opacity={gates ? .12 : .28} color={gates ? "#e0b55c" : "#8f8ee8"} />
    {gates&&activePair.length===2&&activePair.every(letter=>LETTERS.includes(letter))&&activePair[0]!==activePair[1]&&<Edges points={activePair.map(letter=>points[LETTERS.indexOf(letter)])} color={letterGroup(LETTERS.indexOf(activePair[0])).color} opacity={.95}/>}
    {LETTERS.map((letter, index) => {
      const group = letterGroup(index);
      const selected = gates&&activePair.length===2?activePair.includes(letter):activeId === letter;
      return <mesh key={letter} position={points[index]} scale={selected ? 1.42 : 1} onClick={event => { event.stopPropagation(); onSelect?.(letter); }}>
        <sphereGeometry args={[gates ? .17 : .25, 20, 20]} />
        <meshStandardMaterial color={group.color} emissive={group.color} emissiveIntensity={selected ? .8 : .16} roughness={.3} />
      </mesh>;
    })}
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.35, .025, 8, 128]} /><meshBasicMaterial color="#d9b45f" transparent opacity={.38} /></mesh>
  </group>;
}

function OsnModel({ activeId, onSelect }) {
  const layers = [
    { id: "world", color: "#73a9dc", rotation: [Math.PI / 2, 0, 0], radius: 3.15 },
    { id: "year", color: "#d7a84f", rotation: [0, Math.PI / 2, 0], radius: 2.55 },
    { id: "soul", color: "#76c0a7", rotation: [0, 0, Math.PI / 2], radius: 1.95 },
  ];
  return <group>
    {layers.map(layer => <mesh key={layer.id} rotation={layer.rotation} scale={activeId === layer.id ? 1.08 : 1} onClick={event => { event.stopPropagation(); onSelect?.(layer.id); }}>
      <torusGeometry args={[layer.radius, .12, 18, 128]} />
      <meshStandardMaterial color={layer.color} emissive={layer.color} emissiveIntensity={activeId === layer.id ? .65 : .22} metalness={.2} roughness={.28} />
    </mesh>)}
    <mesh position={[0, .72, 0]}><sphereGeometry args={[.32, 24, 24]} /><meshStandardMaterial color="#f4bf55" emissive="#f4bf55" emissiveIntensity={.4} /></mesh>
    <mesh><sphereGeometry args={[.32, 24, 24]} /><meshStandardMaterial color="#8f8ee8" emissive="#8f8ee8" emissiveIntensity={.4} /></mesh>
    <mesh position={[0, -.72, 0]}><sphereGeometry args={[.32, 24, 24]} /><meshStandardMaterial color="#75bca8" emissive="#75bca8" emissiveIntensity={.4} /></mesh>
  </group>;
}

function CommentariesModel({ activeId, onSelect }) {
  return <group>
    <Edges points={COMMENTARY_POSITIONS} color="#d7aa52" opacity={.32} />
    {COMMENTARY_POSITIONS.map((position, index) => <Edges key={`spoke-${SEFER_YETZIRAH_COMMENTATORS[index].id}`} points={[[0, 0, 0], position]} color={SEFER_YETZIRAH_COMMENTATORS[index].color} opacity={.22} />)}
    {SEFER_YETZIRAH_COMMENTATORS.map((commentator, index) => <mesh
      key={commentator.id}
      position={COMMENTARY_POSITIONS[index]}
      scale={activeId === commentator.id ? 1.42 : 1}
      onClick={event => { event.stopPropagation(); onSelect?.(commentator.id); }}
    >
      <sphereGeometry args={[.3, 24, 24]} />
      <meshStandardMaterial color={commentator.color} emissive={commentator.color} emissiveIntensity={activeId === commentator.id ? .76 : .2} roughness={.28} metalness={.18} />
    </mesh>)}
    <mesh><icosahedronGeometry args={[.78, 2]} /><meshPhysicalMaterial color="#f1d28b" emissive="#d8a94f" emissiveIntensity={.32} transparent opacity={.82} roughness={.23} /></mesh>
  </group>;
}

function SpatialObject({ mode, activeId, activePair, onSelect }) {
  const group = useRef(null);
  useFrame((_, delta) => {
    if (group.current && !REDUCED_MOTION) group.current.rotation.y += Math.min(delta, .04) * .08;
  });
  return <group ref={group} rotation={[.14, -.32, 0]}>
    {mode === "sefirot" ? <SefirotModel activeId={activeId} onSelect={onSelect} /> : null}
    {mode === "letters" ? <LettersModel activeId={activeId} onSelect={onSelect} /> : null}
    {mode === "gates" ? <LettersModel gates activeId={activeId} activePair={activePair} onSelect={onSelect} /> : null}
    {mode === "osn" ? <OsnModel activeId={activeId} onSelect={onSelect} /> : null}
    {mode === "commentaries" ? <CommentariesModel activeId={activeId} onSelect={onSelect} /> : null}
  </group>;
}

function SceneControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef(null);
  useFrame(() => controlsRef.current?.update());
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enablePan = false;
    controls.enableDamping = !REDUCED_MOTION;
    controls.dampingFactor = .06;
    controls.minDistance = 5.2;
    controls.maxDistance = 12;
    controls.update();
    return () => { controlsRef.current = null; controls.dispose(); };
  }, [camera, gl]);
  return null;
}

export default function SeferYetzirahScene2029({ mode = "sefirot", activeId = "", activePair=[], onSelect }) {
  return <div className="yetzirah29-canvas" data-active-pair={mode==='gates'?activePair.join(''):''} role="img" aria-label="מודל תלת־ממדי אינטראקטיבי של מבני ספר יצירה">
    <Canvas camera={{ position: [0, 1.1, 8.8], fov: 46 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#090b14"]} />
      <fog attach="fog" args={["#090b14", 9, 17]} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#f3ca73" />
      <pointLight position={[-4, -2, 3]} intensity={22} distance={12} color="#5a73d8" />
      <SpatialObject mode={mode} activeId={activeId} activePair={activePair} onSelect={onSelect} />
      <SceneControls />
    </Canvas>
  </div>;
}
