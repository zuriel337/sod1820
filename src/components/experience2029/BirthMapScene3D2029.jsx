import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function ContextGuard({ onFallback }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = event => { event.preventDefault(); onFallback?.("context_lost"); };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onFallback]);
  return null;
}

function Controls({ reducedMotion }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = !reducedMotion;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 22;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.35;
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    controls.update();
    return () => { controls.removeEventListener("change", onChange); controls.dispose(); };
  }, [camera, gl, invalidate, reducedMotion]);
  return null;
}

function OrbitBand({ count, radius, color, tilt, speed, reducedMotion }) {
  const group = useRef(null);
  useFrame((_, delta) => {
    if (!reducedMotion && group.current) group.current.rotation.z += delta * speed;
  });
  return <group ref={group} rotation={[tilt, tilt * 0.42, 0]}>
    <mesh>
      <torusGeometry args={[radius, 0.012, 5, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.38} blending={AdditiveBlending} />
    </mesh>
    {Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
        <sphereGeometry args={[count === 3 ? 0.2 : 0.12, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>;
    })}
  </group>;
}

function StarField() {
  const positions = useMemo(() => Array.from({ length: 84 }, (_, index) => {
    const angle = index * 2.399963;
    const radius = 6.5 + ((index * 37) % 100) / 10;
    return [Math.cos(angle) * radius, ((index * 29) % 100) / 8 - 6, Math.sin(angle) * radius - 3];
  }), []);
  return <group>{positions.map((position, index) => <mesh key={index} position={position}>
    <sphereGeometry args={[index % 11 === 0 ? 0.045 : 0.022, 7, 7]} />
    <meshBasicMaterial color={index % 7 === 0 ? "#f4cf74" : "#dce7ff"} transparent opacity={0.72} />
  </mesh>)}</group>;
}

function BirthCosmos({ counts, reducedMotion }) {
  const core = useRef(null);
  useFrame(({ clock }) => {
    if (!reducedMotion && core.current) core.current.rotation.y = clock.elapsedTime * 0.12;
  });
  return <>
    <StarField />
    <group ref={core}>
      <mesh>
        <icosahedronGeometry args={[1.12, 4]} />
        <meshPhysicalMaterial color="#d6a84d" emissive="#6f4612" emissiveIntensity={0.8} roughness={0.22} metalness={0.45} clearcoat={1} />
      </mesh>
      <mesh scale={1.35}>
        <icosahedronGeometry args={[1.12, 2]} />
        <meshBasicMaterial color="#f2cd75" wireframe transparent opacity={0.16} />
      </mesh>
    </group>
    <OrbitBand count={counts.mothers} radius={2.25} color="#f0bd55" tilt={0.18} speed={0.12} reducedMotion={reducedMotion} />
    <OrbitBand count={counts.doubles} radius={3.45} color="#8fd5ff" tilt={0.72} speed={-0.07} reducedMotion={reducedMotion} />
    <OrbitBand count={counts.simples} radius={4.8} color="#b89cff" tilt={1.08} speed={0.045} reducedMotion={reducedMotion} />
  </>;
}

export default function BirthMapScene3D2029({ counts, reducedMotion = false, onFallback }) {
  return <div className="birth-map-scene-3d" data-renderer="r3f" data-experience-capability="life-journey-birth-map-3d">
    <Canvas
      frameloop={reducedMotion ? "demand" : "always"}
      dpr={[1, 1.5]}
      camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.2, 12.5] }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[2, 4, 5]} intensity={42} color="#ffd98b" />
      <pointLight position={[-5, -2, 1]} intensity={18} color="#6daeff" />
      <BirthCosmos counts={counts} reducedMotion={reducedMotion} />
      <Controls reducedMotion={reducedMotion} />
      <ContextGuard onFallback={onFallback} />
    </Canvas>
  </div>;
}
