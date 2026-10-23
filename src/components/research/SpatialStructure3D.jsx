import React from "react";
import { Canvas } from "@react-three/fiber";

function StructureMesh({ shapeIdentity }) {
  const isIcosahedron = shapeIdentity === "icosahedron" || shapeIdentity === "sixty-face-star";
  const isCompound = String(shapeIdentity || "").startsWith("compound:");
  return <group rotation={[0.32, 0.56, 0]}>
    <mesh>
      {isIcosahedron ? <icosahedronGeometry args={[1.15, shapeIdentity === "sixty-face-star" ? 1 : 0]} />
        : isCompound ? <dodecahedronGeometry args={[1.12, 0]} />
          : <boxGeometry args={[1.7, 1.7, 1.7]} />}
      <meshStandardMaterial color="#b58a32" roughness={0.4} metalness={0.18} wireframe={isCompound} />
    </mesh>
    {isCompound ? <mesh scale={0.68}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#3e756b" roughness={0.5} /></mesh> : null}
  </group>;
}

export default function SpatialStructure3D({ shapeIdentity, title }) {
  return <div className="sod29-world-spatial-3d" role="img" aria-label={`המחשה תלת־ממדית סכמטית: ${title}`}>
    <Canvas frameloop="demand" camera={{ position: [0, 0, 4.2], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "low-power" }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <StructureMesh shapeIdentity={shapeIdentity} />
    </Canvas>
  </div>;
}
